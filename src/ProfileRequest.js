
import {Vector3,Matrix4,Sphere,  Box3, Line3,Plane} from 'three'
import {BinaryHeap} from "./BinaryHeap.js";
import {Points} from "./Points.js";

export class ProfileData {
	constructor (profile) {
		this.profile = profile;

		this.segments = [];
		this.boundingBox = new Box3();

		const customSegments = (Array.isArray(profile.customSegments) && profile.customSegments.length > 0)
			? profile.customSegments
			: null;
		const segCount = customSegments ? customSegments.length : Math.max(0, profile.points.length - 1);

		for (let i = 0; i < segCount; i++) {
			let start = customSegments ? customSegments[i].start : profile.points[i];
			let end = customSegments ? customSegments[i].end : profile.points[i + 1];
			let segWidth = (customSegments && customSegments[i].width) ? customSegments[i].width : profile.width;

			let startGround = new Vector3(start.x, start.y, 0);
			let endGround = new Vector3(end.x, end.y, 0);

			let center = new Vector3().addVectors(endGround, startGround).multiplyScalar(0.5);
			let length = startGround.distanceTo(endGround);
			let side = new Vector3().subVectors(endGround, startGround).normalize();
			let up = new Vector3(0, 0, 1);
			let forward = new Vector3().crossVectors(side, up).normalize();
			let N = forward;
			let cutPlane = new Plane().setFromNormalAndCoplanarPoint(N, startGround);
			let halfPlane = new Plane().setFromNormalAndCoplanarPoint(side, center);

			let segment = {
				start: start,
				end: end,
				width: segWidth,
				queryIndex: (customSegments && customSegments[i].queryIndex !== undefined) ? customSegments[i].queryIndex : i,
				cutPlane: cutPlane,
				halfPlane: halfPlane,
				length: length,
				points: new Points()
			};

			this.segments.push(segment);
		}
	}

	size () {
		let size = 0;
		for (let segment of this.segments) {
			size += segment.points.numPoints;
		}

		return size;
	}
};

export class ProfileRequest {
	constructor (pointcloud, profile, maxDepth, callback) {
		this.pointcloud = pointcloud;
		this.profile = profile;
		this.maxDepth = maxDepth || Number.MAX_VALUE;
		this.callback = callback;
		this.temporaryResult = new ProfileData(this.profile);
		this.pointsServed = 0;
		this.highestLevelServed = 0;

		this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });
		this.queuedNodes = new Set();

		this.initialize();
	}

	initialize () {
		const root = this.pointcloud.pcoGeometry.root;
		if (root) {
			this.queuedNodes.add(root);
			this.priorityQueue.push({node: root, weight: Infinity});
		}
	};

	// traverse the node and add intersecting descendants to queue
	traverse (node) {
		let stack = [];
		for (let i = 0; i < 8; i++) {
			let child = node.children[i];
			if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
				stack.push(child);
			}
		}

		while (stack.length > 0) {
			let current = stack.pop();
			if (!this.queuedNodes.has(current)) {
				this.queuedNodes.add(current);
				let weight = current.boundingSphere.radius;
				this.priorityQueue.push({node: current, weight: weight});
			}

			// add children that intersect the cutting plane
			if (current.level < this.maxDepth) {
				for (let i = 0; i < 8; i++) {
					let child = current.children[i];
					if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
						stack.push(child);
					}
				}
			}
		}
	}

	update(){
		if(!this.updateGeneratorInstance){
			this.updateGeneratorInstance = this.updateGenerator();
		}

		let result = this.updateGeneratorInstance.next();
		if(result.done){
			this.updateGeneratorInstance = null;
		}
	}

	* updateGenerator(){
		// load nodes in queue
		// if hierarchy expands, also load nodes from expanded hierarchy
		// once loaded, add data to this.points and remove node from queue
		// only evaluate 1-50 nodes per frame to maintain responsiveness

		let start = performance.now();

		let maxNodesPerUpdate = this.maxNodesPerUpdate || 20;
		let intersectedNodes = [];
		let unloadedElements = [];

		let queueCheckCount = Math.min(maxNodesPerUpdate, this.priorityQueue.size());
		for (let i = 0; i < queueCheckCount; i++) {
			let element = this.priorityQueue.pop();
			let node = element.node;

			if(node.level > this.maxDepth){
				continue;
			}

			if (node.loaded) {
				// add points to result
				intersectedNodes.push(node);
				const lru = (typeof Potree !== 'undefined' && Potree.lru)
					? Potree.lru
					: (typeof window !== 'undefined' && window.Potree && window.Potree.lru)
						? window.Potree.lru
						: (typeof exports !== 'undefined' && exports.lru)
							? exports.lru
							: null;
				if (lru) {
					lru.touch(node);
				}
				this.highestLevelServed = Math.max(node.getLevel(), this.highestLevelServed);

				this.traverse(node);
			} else {
				node.load();
				unloadedElements.push(element);
			}
		}

		for (let el of unloadedElements) {
			this.priorityQueue.push(el);
		}

		if (intersectedNodes.length > 0) {

			for(let done of this.getPointsInsideProfile(intersectedNodes, this.temporaryResult)){
				if(!done){
					//console.log("updateGenerator yields");
					yield false;
				}
			}
			if (this.temporaryResult.size() > 100) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new ProfileData(this.profile);
			}
		}

		if (this.priorityQueue.size() === 0) {
			// we're done! inform callback and remove from pending requests

			if (this.temporaryResult.size() > 0) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new ProfileData(this.profile);
			}

			this.callback.onFinish({request: this});

			let index = this.pointcloud.profileRequests.indexOf(this);
			if (index >= 0) {
				this.pointcloud.profileRequests.splice(index, 1);
			}
		}

		yield true;
	};

	* getAccepted(numPoints, node, matrix, segment, segmentDir, points, totalMileage){
		let checkpoint = performance.now();

		let accepted = new Uint32Array(numPoints);
		let mileage = new Float64Array(numPoints);
		let acceptedPositions = new Float32Array(numPoints * 3);
		let numAccepted = 0;

		let pos = new Vector3();
		let svp = new Vector3();

		let view = new Float32Array(node.geometry.attributes.position.array);

		for (let i = 0; i < numPoints; i++) {

			pos.set(
				view[i * 3 + 0],
				view[i * 3 + 1],
				view[i * 3 + 2]);

			pos.applyMatrix4(matrix);
			let distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
			let centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));
			let segWidth = segment.width || this.profile.width;

			if (distance < segWidth / 2 && centerDistance < segment.length / 2) {
				svp.subVectors(pos, segment.start);
				let localMileage = segmentDir.dot(svp);

				accepted[numAccepted] = i;
				mileage[numAccepted] = localMileage + totalMileage;
				points.boundingBox.expandByPoint(pos);

				pos.sub(this.pointcloud.position);

				acceptedPositions[3 * numAccepted + 0] = pos.x;
				acceptedPositions[3 * numAccepted + 1] = pos.y;
				acceptedPositions[3 * numAccepted + 2] = pos.z;

				numAccepted++;
			}

			if((i % 1000) === 0){
				let duration = performance.now() - checkpoint;
				if(duration > 4){
					//console.log(`getAccepted yield after ${duration}ms`);
					yield false;
					checkpoint = performance.now();
				}
			}
		}

		accepted = accepted.subarray(0, numAccepted);
		mileage = mileage.subarray(0, numAccepted);
		acceptedPositions = acceptedPositions.subarray(0, numAccepted * 3);

		//let end = performance.now();
		//let duration = end - start;
		//console.log("accepted duration ", duration)

		//console.log(`getAccepted finished`);

		yield [accepted, mileage, acceptedPositions];
	}

	* getPointsInsideProfile(nodes, target){
		let checkpoint = performance.now();
		let totalMileage = 0;
		let pointsProcessed = 0;

		const segments = target.segments;
		if (!segments || segments.length === 0 || !nodes || nodes.length === 0) {
			yield true;
			return;
		}

		// Precompute per-segment metadata (direction, mileage offset, 2D XY bounding box)
		const segMeta = new Array(segments.length);
		for (let s = 0; s < segments.length; s++) {
			const segment = segments[s];
			const segWidth = segment.width || target.profile.width;
			const halfW = segWidth * 0.5;
			const halfLen = segment.length * 0.5;
			const sv = new Vector3().subVectors(segment.end, segment.start).setZ(0);
			const segmentDir = sv.clone().normalize();

			segMeta[s] = {
				segment,
				segWidth,
				halfW,
				halfLen,
				segmentDir,
				mileageOffset: totalMileage,
				minX: Math.min(segment.start.x, segment.end.x) - halfW,
				maxX: Math.max(segment.start.x, segment.end.x) + halfW,
				minY: Math.min(segment.start.y, segment.end.y) - halfW,
				maxY: Math.max(segment.start.y, segment.end.y) + halfW,
			};
			totalMileage += segment.length;
		}

		// Process each node ONCE, testing each transformed point against only the segments overlapping that node
		let pos = new Vector3();
		let svp = new Vector3();

		for (let node of nodes) {
			let numPoints = node.numPoints;
			let geometry = node.geometry;
			if (!numPoints || !geometry || !geometry.attributes || !geometry.attributes.position) {
				continue;
			}

			let bbWorld = node.boundingBox.clone().applyMatrix4(this.pointcloud.matrixWorld);
			let bsWorld = bbWorld.getBoundingSphere(new Sphere());

			// Find all segments that overlap this node's world XY bounds
			let activeSegs = [];
			let unionMinX = Infinity;
			let unionMaxX = -Infinity;
			let unionMinY = Infinity;
			let unionMaxY = -Infinity;

			for (let s = 0; s < segMeta.length; s++) {
				const sm = segMeta[s];
				if (
					bbWorld.max.x < sm.minX ||
					bbWorld.min.x > sm.maxX ||
					bbWorld.max.y < sm.minY ||
					bbWorld.min.y > sm.maxY
				) {
					continue;
				}

				let start = new Vector3(sm.segment.start.x, sm.segment.start.y, bsWorld.center.z);
				let end = new Vector3(sm.segment.end.x, sm.segment.end.y, bsWorld.center.z);
				let closest = new Line3(start, end).closestPointToPoint(bsWorld.center, true, new Vector3());
				let distance = closest.distanceTo(bsWorld.center);
				if (distance >= (bsWorld.radius + sm.segWidth)) {
					continue;
				}

				activeSegs.push({
					meta: sm,
					accepted: [],
					mileage: [],
					positions: [],
					boundingBox: new Box3(),
				});

				if (sm.minX < unionMinX) unionMinX = sm.minX;
				if (sm.maxX > unionMaxX) unionMaxX = sm.maxX;
				if (sm.minY < unionMinY) unionMinY = sm.minY;
				if (sm.maxY > unionMaxY) unionMaxY = sm.maxY;
			}

			if (activeSegs.length === 0) {
				continue;
			}

			let nodeMatrix = new Matrix4().makeTranslation(...node.boundingBox.min.toArray());
			let matrix = new Matrix4().multiplyMatrices(this.pointcloud.matrixWorld, nodeMatrix);
			let view = geometry.attributes.position.array;
			let pcPos = this.pointcloud.position;

			pointsProcessed += numPoints;

			for (let i = 0; i < numPoints; i++) {
				pos.set(view[i * 3 + 0], view[i * 3 + 1], view[i * 3 + 2]);
				pos.applyMatrix4(matrix);

				const wx = pos.x;
				const wy = pos.y;
				const wz = pos.z;

				// Fast union 2D XY bounding box reject
				if (wx < unionMinX || wx > unionMaxX || wy < unionMinY || wy > unionMaxY) {
					continue;
				}

				const lx = wx - pcPos.x;
				const ly = wy - pcPos.y;
				const lz = wz - pcPos.z;

				for (let a = 0; a < activeSegs.length; a++) {
					const bucket = activeSegs[a];
					const sm = bucket.meta;

					if (wx < sm.minX || wx > sm.maxX || wy < sm.minY || wy > sm.maxY) {
						continue;
					}

					const segment = sm.segment;
					const distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
					if (distance >= sm.halfW) {
						continue;
					}
					const centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));
					if (centerDistance >= sm.halfLen) {
						continue;
					}

					svp.subVectors(pos, segment.start);
					const localMileage = sm.segmentDir.dot(svp);

					bucket.accepted.push(i);
					bucket.mileage.push(localMileage + sm.mileageOffset);
					bucket.positions.push(lx, ly, lz);
					bucket.boundingBox.expandByPoint(pos);
				}

				if ((i % 4000) === 0) {
					let duration = performance.now() - checkpoint;
					if (duration > 8) {
						yield false;
						checkpoint = performance.now();
					}
				}
			}

			let relevantAttributes = Object.keys(geometry.attributes).filter(a => !["position", "indices"].includes(a));

			for (let a = 0; a < activeSegs.length; a++) {
				const bucket = activeSegs[a];
				const numAccepted = bucket.accepted.length;
				if (numAccepted === 0) {
					continue;
				}

				let points = new Points();
				points.numPoints = numAccepted;
				points.data.position = new Float32Array(bucket.positions);
				points.data.mileage = new Float64Array(bucket.mileage);
				points.boundingBox.copy(bucket.boundingBox);

				for (let attributeName of relevantAttributes) {
					let attribute = geometry.attributes[attributeName];
					let numElements = attribute.array.length / numPoints;
					let Type = attribute.array.constructor;
					let filteredBuffer = new Type(numElements * numAccepted);
					let source = attribute.array;

					for (let i = 0; i < numAccepted; i++) {
						let index = bucket.accepted[i];
						let start = index * numElements;
						let end = start + numElements;
						filteredBuffer.set(source.subarray(start, end), i * numElements);
					}

					points.data[attributeName] = filteredBuffer;
				}

				bucket.meta.segment.points.add(points);
			}

			let duration = performance.now() - checkpoint;
			if (duration > 8) {
				yield false;
				checkpoint = performance.now();
			}
		}

		for (let segment of target.segments) {
			target.boundingBox.union(segment.points.boundingBox);
		}

		yield true;
	};

	finishLevelThenCancel () {
		if (this.cancelRequested) {
			return;
		}

		this.maxDepth = this.highestLevelServed;
		this.cancelRequested = true;

		//console.log(`maxDepth: ${this.maxDepth}`);
	};

	cancel () {
		this.callback.onCancel();

		this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

		let index = this.pointcloud.profileRequests.indexOf(this);
		if (index >= 0) {
			this.pointcloud.profileRequests.splice(index, 1);
		}
	};
}
