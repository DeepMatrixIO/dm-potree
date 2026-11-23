
// import * as THREE from "../../../../libs/js/build/module.js";
import {Box3, BufferAttribute, BufferGeometry, Sphere, Vector3} from 'three';
import {PointAttribute, PointAttributes, PointAttributeTypes} from "../../../loader/PointAttributes.js";
import {updateFetchToken} from "../../../tokenUpdater.js"; //added by jguerrer
import {OctreeGeometry, OctreeGeometryNode} from "./OctreeGeometry.js";
// let loadedNodes = new Set();


/** For a given OctreeGeometryNode , it loads its content from an url with load()
 * Nodes require
 * 		root.level = 0;
		root.nodeType = 2;
		root.hierarchyByteOffset = 0n;
		root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
		root.hasChildren = false;
		root.spacing = octree.spacing;

		root.byteOffset = 0;//required
 *
 */

export class NodeLoader {

	constructor(url) {
		this.url = url;
		this.inFlightNodes = new Map();
		this.hierarchyCache = new Map();
		this.stats = {
			httpRangeRequests: 0,
			hierarchyRangeRequests: 0,
			nodesDecodedFromNetwork: 0,
			nodesCoalescedSaved: 0,
			duplicateLoadsSkipped: 0,
		};
	}

	getStatsSnapshot() {
		return { ...this.stats };
	}

	async decodeNodeBuffer(node, buffer, byteOffset, byteSize) {
		const workerFile = this.metadata.encoding === "BROTLI"
			? 'DecoderWorker_brotli.js'
			: 'DecoderWorker.js';

		// Vite module build writes workers to /example/workers while scriptPath is /dist.
		let workerPath = `${Potree.scriptPath}/workers/2.0/${workerFile}`;
		if (Potree.scriptPath.endsWith('/dist')) {
			workerPath = `${window.location.origin}/example/workers/2.0/${workerFile}`;
		}

		return new Promise((resolve) => {
			let worker = Potree.workerPool.getWorker(workerPath);

			worker.onmessage = (e) => {
				let data = e.data;
				let buffers = data.attributeBuffers;

				Potree.workerPool.returnWorker(workerPath, worker);

				let geometry = new BufferGeometry();

				for (let property in buffers) {
					let propBuffer = buffers[property].buffer;

					if (property === "position") {
						geometry.setAttribute('position', new BufferAttribute(new Float32Array(propBuffer), 3));
					} else if (property === "rgba") {
						geometry.setAttribute('rgba', new BufferAttribute(new Uint8Array(propBuffer), 4, true));
					} else if (property === "NORMAL") {
						geometry.setAttribute('normal', new BufferAttribute(new Float32Array(propBuffer), 3));
					} else if (property === "INDICES") {
						let bufferAttribute = new BufferAttribute(new Uint8Array(propBuffer), 4);
						bufferAttribute.normalized = true;
						geometry.setAttribute('indices', bufferAttribute);
					} else {
						const bufferAttribute = new BufferAttribute(new Float32Array(propBuffer), 1);

						let batchAttribute = buffers[property].attribute;
						bufferAttribute.potree = {
							offset: buffers[property].offset,
							scale: buffers[property].scale,
							preciseBuffer: buffers[property].preciseBuffer,
							range: batchAttribute.range,
						};

						geometry.setAttribute(property, bufferAttribute);
					}
				}

				node.density = data.density;
				node.geometry = geometry;
				node.loaded = true;
				node.loading = false;
				Potree.numNodesLoading = Math.max(0, Potree.numNodesLoading - 1);

				node.byteOffset = byteOffset;
				node.byteSize = byteSize;
				this.stats.nodesDecodedFromNetwork++;

				if (typeof Potree !== 'undefined' && Potree.lru) {
					Potree.lru.touch(node);
				}

				resolve(node);
			};

			let pointAttributes = node.octreeGeometry.pointAttributes;
			let scale = node.octreeGeometry.scale;

			let box = node.boundingBox;
			let min = node.octreeGeometry.offset.clone().add(box.min);
			let size = box.max.clone().sub(box.min);
			let max = min.clone().add(size);
			let numPoints = node.numPoints;

			let offset = node.octreeGeometry.loader.offset;

			let message = {
				name: node.name,
				buffer: buffer,
				pointAttributes: pointAttributes,
				scale: scale,
				min: min,
				max: max,
				size: size,
				offset: offset,
				numPoints: numPoints
			};

			worker.postMessage(message, [message.buffer]);
		});
	}

	async fetchByteRange(urlTarget, first, last) {
		let fetchOptions = {
			headers: {
				'content-type': 'multipart/byteranges',
				'Range': `bytes=${first}-${last}`,
			}
		};
		let maxRetries = 3;
		let retry = 1;
		let response = null;

		do {
			fetchOptions = updateFetchToken(fetchOptions);
			response = await fetch(urlTarget, fetchOptions);
			if (response.status >= 400) {
				retry++;
			} else {
				break;
			}
		} while (retry <= maxRetries && response.status >= 400);

		if (response.status >= 400) {
			throw new Error(`Failed to fetch range bytes=${first}-${last} from ${urlTarget}. Status: ${response.status}`);
		}

		return response.arrayBuffer();
	}

	/**
	 * Coalesces multiple unloaded octree nodes whose byte ranges in `octree.bin` are adjacent or nearby
	 * into merged HTTP Range requests, avoiding N separate round-trips and guaranteeing no duplicate loads.
	 *
	 * @param {Array<OctreeGeometryNode>} nodes
	 * @param {object} [options]
	 * @param {number} [options.maxMergeGapBytes=262144] - Max byte gap (256 KB default) between two nodes to merge into 1 HTTP Range request
	 * @param {number} [options.maxGroupBytes=4194304] - Max merged range size (4 MB default)
	 */
	async loadNodesCoalesced(nodes, options = {}) {
		if (!Array.isArray(nodes) || nodes.length === 0) {
			return [];
		}

		const maxGap = BigInt(options.maxMergeGapBytes !== undefined ? options.maxMergeGapBytes : 262144);
		const maxGroup = BigInt(options.maxGroupBytes !== undefined ? options.maxGroupBytes : 4194304);

		const pendingPromises = [];
		const coalescableNodes = [];

		for (const node of nodes) {
			if (!node) continue;
			if (node.loaded) {
				this.stats.duplicateLoadsSkipped++;
				continue;
			}
			if (this.inFlightNodes.has(node.name)) {
				this.stats.duplicateLoadsSkipped++;
				pendingPromises.push(this.inFlightNodes.get(node.name));
				continue;
			}
			// Proxy nodes (nodeType === 2) need hierarchy.bin loaded first
			if (node.nodeType === 2 || node.byteOffset === undefined || node.byteSize === undefined) {
				pendingPromises.push(this.load(node));
				continue;
			}
			if (node.byteSize === 0n) {
				node.loaded = true;
				node.loading = false;
				continue;
			}
			coalescableNodes.push(node);
		}

		if (coalescableNodes.length === 1) {
			pendingPromises.push(this.load(coalescableNodes[0]));
			return Promise.all(pendingPromises);
		}

		if (coalescableNodes.length > 1) {
			coalescableNodes.sort((a, b) => (a.byteOffset < b.byteOffset ? -1 : a.byteOffset > b.byteOffset ? 1 : 0));

			const groups = [];
			let currentGroup = null;

			for (const node of coalescableNodes) {
				const nStart = node.byteOffset;
				const nEnd = node.byteOffset + node.byteSize;

				if (
					!currentGroup ||
					(nStart - currentGroup.endOffset) > maxGap ||
					(nEnd - currentGroup.startOffset) > maxGroup
				) {
					currentGroup = {
						startOffset: nStart,
						endOffset: nEnd,
						nodes: [node],
					};
					groups.push(currentGroup);
				} else {
					if (nEnd > currentGroup.endOffset) {
						currentGroup.endOffset = nEnd;
					}
					currentGroup.nodes.push(node);
				}
			}

			const urlOctree = `${this.url}/../octree.bin`;

			for (const group of groups) {
				if (group.nodes.length === 1) {
					pendingPromises.push(this.load(group.nodes[0]));
					continue;
				}

				for (const node of group.nodes) {
					node.loading = true;
					Potree.numNodesLoading++;
				}

				const groupPromise = (async () => {
					try {
						const first = group.startOffset;
						const last = group.endOffset - 1n;
						this.stats.httpRangeRequests++;
						this.stats.nodesCoalescedSaved += (group.nodes.length - 1);

						const mergedBuffer = await this.fetchByteRange(urlOctree, first, last);
						const decodePromises = group.nodes.map(node => {
							const relStart = Number(node.byteOffset - group.startOffset);
							const relEnd = relStart + Number(node.byteSize);
							const sliceBuffer = mergedBuffer.slice(relStart, relEnd);
							return this.decodeNodeBuffer(node, sliceBuffer, node.byteOffset, node.byteSize);
						});
						return await Promise.all(decodePromises);
					} catch (err) {
						for (const node of group.nodes) {
							node.loaded = false;
							node.loading = false;
							Potree.numNodesLoading = Math.max(0, Potree.numNodesLoading - 1);
						}
						console.warn('OctreeLoader: coalesced range load failed, falling back:', err);
						return [];
					} finally {
						for (const node of group.nodes) {
							this.inFlightNodes.delete(node.name);
						}
					}
				})();

				for (const node of group.nodes) {
					this.inFlightNodes.set(node.name, groupPromise);
				}
				pendingPromises.push(groupPromise);
			}
		}

		return Promise.all(pendingPromises);
	}

	async load(node) {

		if (node.loaded) {
			this.stats.duplicateLoadsSkipped++;
			return node;
		}
		if (this.inFlightNodes.has(node.name)) {
			this.stats.duplicateLoadsSkipped++;
			return this.inFlightNodes.get(node.name);
		}
		if (node.loading) {
			this.stats.duplicateLoadsSkipped++;
			return node;
		}

		node.loading = true;
		Potree.numNodesLoading++;

		const loadPromise = (async () => {
			try {
				if (node.nodeType === 2) {
					await this.loadHierarchy(node);
				}

				let {byteOffset, byteSize} = node;
				let urlOctree = `${this.url}/../octree.bin`;

				let first = byteOffset;
				let last = byteOffset + byteSize - 1n;

				let buffer;

				if (byteSize === 0n) {
					buffer = new ArrayBuffer(0);
					console.warn(`loaded node with 0 bytes: ${node.name}`);
				} else {
					this.stats.httpRangeRequests++;
					buffer = await this.fetchByteRange(urlOctree, first, last);
				}

				return await this.decodeNodeBuffer(node, buffer, byteOffset, byteSize);
			} catch (e) {
				node.loaded = false;
				node.loading = false;
				Potree.numNodesLoading = Math.max(0, Potree.numNodesLoading - 1);

				console.log(`OctreeLoader: failed to load ${node.name}`);
				return null;
			} finally {
				this.inFlightNodes.delete(node.name);
			}
		})();

		this.inFlightNodes.set(node.name, loadPromise);
		return loadPromise;
	}

	parseHierarchy(node, buffer) {

		let view = new DataView(buffer);
		let tStart = performance.now();

		let bytesPerNode = 22;
		let numNodes = buffer.byteLength / bytesPerNode;

		let octree = node.octreeGeometry;
		// let nodes = [node];
		let nodes = new Array(numNodes);
		nodes[0] = node;
		let nodePos = 1;

		//console.log("NodeLoader.parseHierarchy Chunk Size numNodes: " + numNodes  );

		function byteToBitMask(byte) {
			return byte.toString(2).padStart(8, '0');
		}





		for (let i = 0;i < numNodes;i++) {
			// console.log("---------------------------------------------" );
			// console.log("Processing node: " + i + " of " + numNodes);
			let current = nodes[i];

			let type = view.getUint8(i * bytesPerNode + 0);
			let childMask = view.getUint8(i * bytesPerNode + 1);
			let numPoints = view.getUint32(i * bytesPerNode + 2, true);
			let byteOffset = view.getBigInt64(i * bytesPerNode + 6, true);
			let byteSize = view.getBigInt64(i * bytesPerNode + 14, true);

			// if(byteSize === 0n){
			// 	// debugger;
			// }

			current.idx = i;

			let mask = byteToBitMask(childMask);

			//console.log(`IDX: ${i}  Name: ${current.name} Type: ${type} childMask: ${childMask} mask ${byteToBitMask(childMask)}  numPoints: ${numPoints}  byteOffset: ${byteOffset}  byteSize: ${byteSize}`);



			if (current.nodeType === 2) {
				// replace proxy with real node


				current.byteOffset = byteOffset;
				current.byteSize = byteSize;
				current.numPoints = numPoints;
				// console.log("<< << << NodeLoader.parseHierarchy Replacing Prox with real Node Data. "

				// + " node.name: " + current.name
				// + " node.idx: " + current.idx
				// + " node.childmask " + childMask
				// + " node.numPoints: " + current.numPoints
				// + " byteOffset: " + current.byteOffset
				// + " byteSize: " + current.byteSize);

			} else if (type === 2) {//proxy node,  points to a jump in hierarchy.bin rather than to octree.bin
				// load proxy
				current.hierarchyByteOffset = byteOffset;
				current.hierarchyByteSize = byteSize;
				current.numPoints = numPoints;
				// console.log(">>>>>>>> NodeLoader.parseHierarchy. Setting Proxy Node.  "
				// + " name: " + current.name
				// + " node.idx " + current.idx
				// + " type: " + type
				// + " node.childmask " + childMask
				// + " node.numPoints: " + current.numPoints
				// + " hierarchyByteOffset: " + current.hierarchyByteOffset
				// + " hierarchyByteSize: " + current.hierarchyByteSize);


			} else {//
				// load real node
				current.byteOffset = byteOffset;
				current.byteSize = byteSize;
				current.numPoints = numPoints;


				// console.log("+++ +++ NodeLoader.parseHierarchy Loading Real Node Data. "

				// + " node.name: " + current.name
				// + " node.type: " + current.type
				// + " node.idx: " + current.idx
				// + " node.childmask " + childMask//not set here
				// + " node.numPoints: " + current.numPoints
				// + " byteOffset: " + current.byteOffset
				// + " byteSize: " + current.byteSize);
			}

			if (current.byteSize === 0n) {
				// workaround for issue #1125
				// some inner nodes erroneously report >0 points even though have 0 points
				// however, they still report a byteSize of 0, so based on that we now set node.numPoints to 0
				current.numPoints = 0;
			}

			current.nodeType = type;

			if (current.nodeType === 2) {
				continue;
			}

			for (let childIndex = 0;childIndex < 8;childIndex++) {
				let childExists = ((1 << childIndex) & childMask) !== 0;

				if (!childExists) {
					continue;
				}

				let childName = current.name + childIndex;

				let childAABB = createChildAABB(current.boundingBox, childIndex);
				let child = new OctreeGeometryNode(childName, octree, childAABB);
				child.name = childName;
				child.spacing = current.spacing / 2;
				child.level = current.level + 1;

				current.children[childIndex] = child;
				child.parent = current;

				// nodes.push(child);
				nodes[nodePos] = child;
				nodePos++;
			}

			// if((i % 500) === 0){
			// 	yield;
			// }
		}

		let duration = (performance.now() - tStart);

		// if(duration > 20){
		// 	let msg = `duration: ${duration}ms, numNodes: ${numNodes}`;
		// 	console.log(msg);
		// }
	}

	/**
	 * Hierarchy is a binary file that contains the hierarchy of the octree.
	 * Each node is one of the following types:

			enum TYPE {
			NORMAL = 0,
			LEAF   = 1,
			PROXY  = 2,
		};


	Each Hierarchy node is 22 bytes long

	 * 1 byte: type (0, 1, 2)
	 * 1 byte: childMask (0-255) (8 bits, 1 for each child)
	 * 4 bytes: numPoints (0-2^32-1)
	 * 8 bytes: byteOffset (0-2^64-1)
	 * 8 bytes: byteSize (0-2^64-1)
	 *

	 * Leaf nodes have a no children, and are the ones that have a byteOffset and byteSize

	 Proxy nodes (pseudo-leaf in one chunk pointing to root of a child-chunk)

	 * Proxy nodes have a byteOffset and byteSize, but no children. They point to a jump in the hierarchy.bin file, rather than to the octree.bin file.

	*/

	async loadHierarchy(node) {

		let {hierarchyByteOffset, hierarchyByteSize} = node;
		let cacheKey = `${hierarchyByteOffset}-${hierarchyByteSize}`;
		if (this.hierarchyCache.has(cacheKey)) {
			this.stats.duplicateLoadsSkipped++;
			let cachedBuffer = await this.hierarchyCache.get(cacheKey);
			this.parseHierarchy(node, cachedBuffer);
			return;
		}

		let hierarchyPath = `${this.url}/../hierarchy.bin`;

		let first = hierarchyByteOffset;
		let last = first + hierarchyByteSize - 1n;

		this.stats.hierarchyRangeRequests++;
		let fetchPromise = this.fetchByteRange(hierarchyPath, first, last);
		this.hierarchyCache.set(cacheKey, fetchPromise);

		try {
			let buffer = await fetchPromise;
			this.parseHierarchy(node, buffer);
		} catch (err) {
			this.hierarchyCache.delete(cacheKey);
			throw err;
		}
	}

}

let tmpVec3 = new Vector3();
function createChildAABB(aabb, index) {
	let min = aabb.min.clone();
	let max = aabb.max.clone();
	let size = tmpVec3.subVectors(max, min);

	if ((index & 0b0001) > 0) {
		min.z += size.z / 2;
	} else {
		max.z -= size.z / 2;
	}

	if ((index & 0b0010) > 0) {
		min.y += size.y / 2;
	} else {
		max.y -= size.y / 2;
	}

	if ((index & 0b0100) > 0) {
		min.x += size.x / 2;
	} else {
		max.x -= size.x / 2;
	}

	return new Box3(min, max);
}

let typenameTypeattributeMap = {
	"double": PointAttributeTypes.DATA_TYPE_DOUBLE,
	"float": PointAttributeTypes.DATA_TYPE_FLOAT,
	"int8": PointAttributeTypes.DATA_TYPE_INT8,
	"uint8": PointAttributeTypes.DATA_TYPE_UINT8,
	"int16": PointAttributeTypes.DATA_TYPE_INT16,
	"uint16": PointAttributeTypes.DATA_TYPE_UINT16,
	"int32": PointAttributeTypes.DATA_TYPE_INT32,
	"uint32": PointAttributeTypes.DATA_TYPE_UINT32,
	"int64": PointAttributeTypes.DATA_TYPE_INT64,
	"uint64": PointAttributeTypes.DATA_TYPE_UINT64,
}

export class OctreeLoader {

	static parseAttributes(jsonAttributes) {

		let attributes = new PointAttributes();

		let replacements = {
			"rgb": "rgba",
		};

		for (const jsonAttribute of jsonAttributes) {
			let {name, description, size, numElements, elementSize, min, max} = jsonAttribute;

			let type = typenameTypeattributeMap[jsonAttribute.type];

			let potreeAttributeName = replacements[name] ? replacements[name] : name;

			let attribute = new PointAttribute(potreeAttributeName, type, numElements);

			if (numElements === 1) {
				attribute.range = [min[0], max[0]];
			} else {
				attribute.range = [min, max];
			}

			if (name === "gps-time") { // HACK: Guard against bad gpsTime range in metadata, see potree/potree#909
				if (attribute.range[0] === attribute.range[1]) {
					attribute.range[1] += 1;
				}
			}

			attribute.initialRange = attribute.range;

			attributes.add(attribute);
		}

		{
			// check if it has normals
			let hasNormals =
				attributes.attributes.find(a => a.name === "NormalX") !== undefined &&
				attributes.attributes.find(a => a.name === "NormalY") !== undefined &&
				attributes.attributes.find(a => a.name === "NormalZ") !== undefined;

			if (hasNormals) {
				let vector = {
					name: "NORMAL",
					attributes: ["NormalX", "NormalY", "NormalZ"],
				};
				attributes.addVector(vector);
			}
		}

		return attributes;
	}

	static async load(url) {

		let fetchOptions = updateFetchToken({headers: {}});//added by jguerrer

		let response = await fetch(url, fetchOptions);
		//		let response = await fetch(url);
		let metadata = await response.json();

		let attributes = OctreeLoader.parseAttributes(metadata.attributes);

		let loader = new NodeLoader(url);
		loader.metadata = metadata;
		loader.attributes = attributes;
		loader.scale = metadata.scale;
		loader.offset = metadata.offset;

		let octree = new OctreeGeometry();
		octree.url = url;
		octree.spacing = metadata.spacing;
		octree.scale = metadata.scale;

		// let aPosition = metadata.attributes.find(a => a.name === "position");
		// octree

		let min = new Vector3(...metadata.boundingBox.min);
		let max = new Vector3(...metadata.boundingBox.max);
		let boundingBox = new Box3(min, max);

		let offset = min.clone();
		boundingBox.min.sub(offset);
		boundingBox.max.sub(offset);

		octree.projection = metadata.projection;
		octree.boundingBox = boundingBox;
		octree.tightBoundingBox = boundingBox.clone();
		octree.boundingSphere = boundingBox.getBoundingSphere(new Sphere());
		octree.tightBoundingSphere = boundingBox.getBoundingSphere(new Sphere());
		octree.offset = offset;
		octree.pointAttributes = OctreeLoader.parseAttributes(metadata.attributes);
		octree.loader = loader;

		let root = new OctreeGeometryNode("r", octree, boundingBox);
		root.level = 0;
		root.nodeType = 2;
		root.hierarchyByteOffset = 0n;
		root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
		root.hasChildren = false;
		root.spacing = octree.spacing;
		root.byteOffset = 0;

		octree.root = root;

		loader.load(root);

		let result = {
			geometry: octree,
		};

		return result;

	}

};