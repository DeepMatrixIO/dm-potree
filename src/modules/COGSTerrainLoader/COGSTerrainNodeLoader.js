/**
 * 
 * Not the main class, but the central class.

 * Actual class in charge of retrieving COGS data to create both 
 * Geometry and Texture data, not 3D objects. 
 * 
 * MAke use of the GeoTIFF class or even Georaster to process the existing  request and spatial conditions.
 * 
 * Geometry is based on actual tiff elevation data and a regular mesh is created.
 * 
 * Internally, details about level, resolution and even texture are handled.
 * 
 * In case of disposed node, it allows to recreate from source again. 
 * 
 * By itself it does not contain any extension or coordinates. The node contains it
 * 
 * 
 * USAGE: 
 * loader= new *TerrainLoader.load(url .options) //general loader, in  chargwe of o
 * 
 * metadata = loader.getMetadata()
 * initialBBOX     = metadata.getBBOX()
 * scale    = metadata.getScale()
 * 
 * quadtree= new TerrainGeometry()//holder for the complete set of nodes or terrain dataset, some parameters added
 * also holds  all information to reconstruct allspaces
 * let root = TerrainGeometryNode('',initialBBOX)  An intial node set as root
 * 
 * root.level
 * root.nodeType\
 * ...
 * quadtree.root=root
 * nodeLoader= new TerrainNodeLoader.load(root,options) <-- this is the actual method loading the root and its child
 * 
 * result={geometry:quadtree}
 * 
 * //internally lads hierarchy, but quadtree unles analysed, loads all inner nodes.
 * //potree structure is content variable and not all nodes contain data, so not all nodes have children
 * //structure is computed on the dataset creation and requires something similar for quadtrees.
 * 
 * A analisys of quadtree may help to reduce nodes loading.
 * 
 * 
 * 
 * Important Methods:   
 * 	load() //receives a TerrainGeometryNode, uses loadHierarchy and ParseHierarchy
 
 *  loadHierarchy()   -> CALLS parseHierarchy() to retrieve furth er information of next level.

 *  parseHierarchy(node, options)//given a node, retrieves its inner nodes structure
 *  	An inner node is terminal node when it reaches the tiff resolution or the metadata described resolution
 *      If no known inner known structure, parses al quadrants until reaching target resolution
 
 * 
 *  
 * 
 * 
 * 
 */

export class COGSTerrainNodeLoader {

	//the constructor hold reference to the cogs resource and a function to update the bearer token,
	//as resource is 
	constructor(url, bearerTokenFunction,options) {
		this.url = url;
		this.authFunction=bearerTokenFunction;//a function which sets the proper parameters
		this.options=options;



	}

	//used fro loading the root node and each children.
	//The root node is identified outside ot this method and
	async load(node) {

		//nodes have level, type, 

		if (node.loaded || node.loading) {
			return;
		}

		node.loading = true;

		// TO DO fix
		Potree.numNodesLoading++;//USED FOR THROTLING WEBWORKERS ? Better store it somewhere else

		
		try {
			//there is no external index yet, but a minimal quadtree would be helpfull to avoid empty
			//meshes being created
			if (node.nodeType === 2) {//initially not set
				await this.loadHierarchy(node);
			}

			//let {byteOffset, byteSize} = node;//not in use

			let urlCOGS = `${this.url}`;

			//let first = byteOffset;
			//let last = byteOffset + byteSize - 1n;

			/**
						let buffer;
			
						if(byteSize === 0n){
							buffer = new ArrayBuffer(0);
							console.warn(`loaded node with 0 bytes: ${node.name}`);
						}else{
							let response = await fetch(urlOctree, {
								headers: {
									'content-type': 'multipart/byteranges',
									'Range': `bytes=${first}-${last}`,
								},
							});
			
							buffer = await response.arrayBuffer();
						}
			 */

			//loading a cogs resource requires setting
			// 1) extent
			// 2) rows, cols
			// 3) data band
			// 4) Tile Size for interpolation

			// If requests are aligned with cogs tile sizes, everything goes smoothly

			//geotiff -> initialize
			//request image  (parameters)->
			//build mesh geometry 
			//apply some colour or styles



			////// setting all workers parameters
			let workerPath;
			if (this.metadata.encoding === "BROTLI") {
				workerPath = Potree.scriptPath + '/workers/2.0/DecoderWorker_brotli.js';
			} else {
				workerPath = Potree.scriptPath + '/workers/2.0/DecoderWorker.js';
			}

			let worker = Potree.workerPool.getWorker(workerPath);

			worker.onmessage = function (e) {

				let data = e.data;
				let buffers = data.attributeBuffers;

				Potree.workerPool.returnWorker(workerPath, worker);

				let geometry = new THREE.BufferGeometry();

				for (let property in buffers) {

					let buffer = buffers[property].buffer;

					if (property === "position") {
						geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					} else if (property === "rgba") {
						geometry.setAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
					} else if (property === "NORMAL") {
						//geometry.setAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
						geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					} else if (property === "INDICES") {
						let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
						bufferAttribute.normalized = true;
						geometry.setAttribute('indices', bufferAttribute);
					} else {
						const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);

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
				// indices ??

				node.density = data.density;
				node.geometry = geometry;//directly setting the geometry on the current node. 
				node.loaded = true;
				node.loading = false;
				Potree.numNodesLoading--;
			};			////  END OF ONMESSAGE

			//finally setting all elements to start processing
			let pointAttributes = node.octreeGeometry.pointAttributes;
			let scale = node.octreeGeometry.scale;

			let box = node.boundingBox;
			let min = node.octreeGeometry.offset.clone().add(box.min);
			let size = box.max.clone().sub(box.min);
			let max = min.clone().add(size);
			let numPoints = node.numPoints;

			let offset = node.octreeGeometry.loader.offset;

			//passing webworker parameters
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

			//mesagger sent

		} catch (e) {
			//cleanung up the node
			node.loaded = false;
			node.loading = false;
			Potree.numNodesLoading--;

			console.log(`failed to load ${node.name}`);
			console.log(e);
			console.log(`trying again!`);
		}
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

		for (let i = 0; i < numNodes; i++) {
			let current = nodes[i];

			let type = view.getUint8(i * bytesPerNode + 0);
			let childMask = view.getUint8(i * bytesPerNode + 1);
			let numPoints = view.getUint32(i * bytesPerNode + 2, true);
			let byteOffset = view.getBigInt64(i * bytesPerNode + 6, true);
			let byteSize = view.getBigInt64(i * bytesPerNode + 14, true);

			// if(byteSize === 0n){
			// 	// debugger;
			// }


			if (current.nodeType === 2) {
				// replace proxy with real node
				current.byteOffset = byteOffset;
				current.byteSize = byteSize;
				current.numPoints = numPoints;
			} else if (type === 2) {
				// load proxy
				current.hierarchyByteOffset = byteOffset;
				current.hierarchyByteSize = byteSize;
				current.numPoints = numPoints;
			} else {
				// load real node 
				current.byteOffset = byteOffset;
				current.byteSize = byteSize;
				current.numPoints = numPoints;
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

			for (let childIndex = 0; childIndex < 8; childIndex++) {
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

	//may be removed because the hierarchy is unknown with current implementation and COGS does not require it
	async loadHierarchy(node) {

		let { hierarchyByteOffset, hierarchyByteSize } = node;
		let hierarchyPath = `${this.url}/../hierarchy.bin`;

		let first = hierarchyByteOffset;
		let last = first + hierarchyByteSize - 1n;

		let response = await fetch(hierarchyPath, {
			headers: {
				'content-type': 'multipart/byteranges',
				'Range': `bytes=${first}-${last}`,
			},
		});



		let buffer = await response.arrayBuffer();

		this.parseHierarchy(node, buffer);

		// let promise = new Promise((resolve) => {
		// 	let generator = this.parseHierarchy(node, buffer);

		// 	let repeatUntilDone = () => {
		// 		let result = generator.next();

		// 		if(result.done){
		// 			resolve();
		// 		}else{
		// 			requestAnimationFrame(repeatUntilDone);
		// 		}
		// 	};

		// 	repeatUntilDone();
		// });

		// await promise;





	}

}
