import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DataTexture,
	FloatType,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	Plane,
	Quaternion,
	RGBAFormat,
	Sphere,
	SphereGeometry,
	Vector3
} from 'three';

import {Volume} from "./Volume.js";
import {FilterIntType} from "./FilterConsts.js";
import {Utils} from "../utils.js";
import {TET_INDICES, OUTER_EDGES, INTERNAL_TET_EDGES, pointInTetrahedron} from "./TetrahedralBoxVolume.js";

/**
 * Normalizes an input point into a THREE.Vector3.
 * Supports Vector3, {x, y, z}, and [x, y, z].
 */
export function extractPointVec3(pt) {
	if (!pt) return new Vector3(0, 0, 0);
	if (pt.position && typeof pt.position.x === 'number') {
		return pt.position.clone();
	}
	if (typeof pt.x === 'number') {
		return new Vector3(pt.x, pt.y, pt.z || 0);
	}
	if (Array.isArray(pt) && pt.length >= 2) {
		return new Vector3(pt[0], pt[1], pt[2] || 0);
	}
	return new Vector3(0, 0, 0);
}

/**
 * Extracts line coordinate sequences from GeoJSON geometries, Features, or Collections.
 */
export function extractLineCoordinates(geometry) {
	const lines = [];
	if (!geometry) return lines;

	if (geometry.type === "GeometryCollection" && Array.isArray(geometry.geometries)) {
		for (const geom of geometry.geometries) {
			lines.push(...extractLineCoordinates(geom));
		}
	} else if (geometry.type === "FeatureCollection" && Array.isArray(geometry.features)) {
		for (const feat of geometry.features) {
			lines.push(...extractLineCoordinates(feat.geometry));
		}
	} else if (geometry.type === "Feature" && geometry.geometry) {
		lines.push(...extractLineCoordinates(geometry.geometry));
	} else if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
		lines.push(geometry.coordinates);
	} else if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
		for (const line of geometry.coordinates) {
			lines.push(line);
		}
	}

	return lines;
}

/**
 * TetrahedralSegmentBox
 * Represents a single topological hexahedral box within a TetrahedralLineVolume chain.
 * Decomposed into 6 tetrahedra following TET_INDICES.
 * Shares cross-section vertices with adjacent segment boxes to preserve topology.
 */
export class TetrahedralSegmentBox {

	constructor(parentVolume, segmentIndex, startRing, endRing, p1, p2) {
		this.parentVolume = parentVolume;
		this.segmentIndex = segmentIndex;
		this.p1 = p1.clone();
		this.p2 = p2.clone();
		this.center = new Vector3().addVectors(p1, p2).multiplyScalar(0.5);

		this._intType = FilterIntType.TETBOXVOLUME;
		this.actualClipTask = 1;
		this.isTetrahedralBoxVolume = true;

		// 8 corner vertices:
		// 0..3: start face (startRing)
		// 4..7: end face (endRing)
		this.vertices = [
			startRing[0],
			startRing[1],
			startRing[2],
			startRing[3],
			endRing[0],
			endRing[1],
			endRing[2],
			endRing[3]
		];
	}

	get intType() {
		return this._intType;
	}

	set intType(val) {
		this._intType = val;
	}

	get matrixWorld() {
		return this.parentVolume ? this.parentVolume.matrixWorld : null;
	}

	getWorldPosition(target = new Vector3()) {
		if (this.parentVolume) {
			this.parentVolume.updateMatrixWorld(true);
			return target.copy(this.center).applyMatrix4(this.parentVolume.matrixWorld);
		}
		return target.copy(this.center);
	}

	getWorldP1(target = new Vector3()) {
		if (this.parentVolume) {
			this.parentVolume.updateMatrixWorld(true);
			return target.copy(this.p1).applyMatrix4(this.parentVolume.matrixWorld);
		}
		return target.copy(this.p1);
	}

	getWorldP2(target = new Vector3()) {
		if (this.parentVolume) {
			this.parentVolume.updateMatrixWorld(true);
			return target.copy(this.p2).applyMatrix4(this.parentVolume.matrixWorld);
		}
		return target.copy(this.p2);
	}

	getWorldVertices() {
		if (this.parentVolume) {
			this.parentVolume.updateMatrixWorld(true);
			return this.vertices.map(v => v.clone().applyMatrix4(this.parentVolume.matrixWorld));
		}
		return this.vertices.map(v => v.clone());
	}

	getWorldVertexPosition(index, target = new Vector3()) {
		if (index >= 0 && index < this.vertices.length) {
			if (this.parentVolume) {
				this.parentVolume.updateMatrixWorld(true);
				return target.copy(this.vertices[index]).applyMatrix4(this.parentVolume.matrixWorld);
			}
			return target.copy(this.vertices[index]);
		}
		return target;
	}

	updateMatrixWorld() {
		if (this.parentVolume) {
			this.parentVolume.updateMatrixWorld(true);
		}
	}

	/**
	 * Dumps the 72 float coordinates for this single segment box (6 tetrahedra * 4 vertices * 3 coords).
	 *
	 * @param {Object} [options]
	 *        - world: boolean (default true)
	 *        - asFloat32: boolean (default true)
	 * @returns {Float32Array|Array<number>}
	 */
	getCoordinatesArray(options = {}) {
		const world = options.world !== undefined ? options.world : true;
		const asFloat32 = options.asFloat32 !== undefined ? options.asFloat32 : true;
		const totalFloats = 6 * 4 * 3; // 72 floats
		const result = asFloat32 ? new Float32Array(totalFloats) : new Array(totalFloats);

		const worldMat = (world && this.parentVolume) ? this.parentVolume.matrixWorld : null;
		if (world && this.parentVolume) {
			this.parentVolume.updateMatrixWorld(true);
		}

		const vWorld = worldMat
			? this.vertices.map(v => v.clone().applyMatrix4(worldMat))
			: this.vertices;

		let offset = 0;
		for (const tet of TET_INDICES) {
			for (let i = 0; i < 4; i++) {
				const v = vWorld[tet[i]];
				result[offset++] = v.x;
				result[offset++] = v.y;
				result[offset++] = v.z;
			}
		}

		return result;
	}

	getCoordinates(options = {}) {
		return this.getCoordinatesArray(options);
	}

	containsPoint(point) {
		const worldMat = this.parentVolume ? this.parentVolume.matrixWorld : null;
		if (this.parentVolume) {
			this.parentVolume.updateMatrixWorld(true);
		}

		const vWorld = worldMat
			? this.vertices.map(v => v.clone().applyMatrix4(worldMat))
			: this.vertices;

		for (const tet of TET_INDICES) {
			const a = vWorld[tet[0]];
			const b = vWorld[tet[1]];
			const c = vWorld[tet[2]];
			const d = vWorld[tet[3]];

			if (pointInTetrahedron(point, a, b, c, d)) {
				return true;
			}
		}
		return false;
	}

	getVolume() {
		const worldMat = this.parentVolume ? this.parentVolume.matrixWorld : null;
		if (this.parentVolume) {
			this.parentVolume.updateMatrixWorld(true);
		}

		const vWorld = worldMat
			? this.vertices.map(v => v.clone().applyMatrix4(worldMat))
			: this.vertices;

		let total = 0;
		for (const tet of TET_INDICES) {
			const a = vWorld[tet[0]];
			const b = vWorld[tet[1]];
			const c = vWorld[tet[2]];
			const d = vWorld[tet[3]];

			const v0 = new Vector3().subVectors(b, a);
			const v1 = new Vector3().subVectors(c, a);
			const v2 = new Vector3().subVectors(d, a);
			const det = v0.dot(new Vector3().crossVectors(v1, v2));

			total += Math.abs(det) / 6.0;
		}
		return total;
	}
}

/**
 * TetrahedralLineVolume
 * Volume object created along a polyline, built from topologically connected tetrahedral boxes.
 *
 * Key characteristics:
 * 1. Each line segment has a box centered on it.
 * 2. Between consecutive segments, the joint vertices are shared with the exact same 3D coordinates,
 *    forming a continuous, watertight topological corridor/tube without gaps or overlaps.
 * 3. Handles non-straight, 3D non-planar polylines with rotation-minimizing parallel transport frames
 *    and miter-bisector cross-section joint planes.
 * 4. Each box decomposes into 6 tetrahedra using the canonical TET_INDICES of TetrahedralBoxVolume.
 * 5. Provides getCoordinates(options) / getCoordinatesArray(options) to populate shader uniforms
 *    (e.g., uClipTetrahedralBoxes / uClipTetrahedrons) or DataTextures.
 */
export class TetrahedralLineVolume extends Volume {

	constructor(args = {}) {
		super(args);

		this._intType = FilterIntType.TETBOXVOLUME; // 3
		this.isTetrahedralLineVolume = true;
		this.isTetrahedralVolume = true;

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = args.name || ('tet_line_volume_' + this.constructor.counter);

		// Radius / distance / cross-section dimensions (thickness = 2 * distance)
		const dist = args.distance ?? args.radius ?? 5;
		this._distance = dist;
		this._width = args.width ?? (dist * 2);
		this._height = args.height ?? (dist * 2);

		// Miter limit to prevent excessive expansion at extreme acute bend angles
		this.miterLimit = args.miterLimit !== undefined ? args.miterLimit : 3.0;

		// Modifiable flag: enables or disables dragging handles
		this._modifiable = args.modifiable !== undefined ? args.modifiable : true;
		this.allowCornerDrag = this._modifiable;

		// showTet flag: toggle internal tetrahedral edges & meshes vs outer envelope only
		this._showTet = args.showTet !== undefined ? args.showTet : false;

		// showCenterLine flag: toggle visual polyline along the center of the boxes
		this._showCenterLine = args.showCenterLine !== undefined ? args.showCenterLine : true;

		// Distance-based visibility control
		this.maxDistance = args.maxDistance !== undefined ? args.maxDistance : Infinity;
		this.minDistance = args.minDistance !== undefined ? args.minDistance : 0;
		this.fadeDistance = args.fadeDistance || 0;

		// Render mode: 'uniforms' or 'dataTexture'
		this._renderMode = args.renderMode || (args.useDataTexture ? 'dataTexture' : 'uniforms');

		// Volume styling
		this.color = args.color ? new Color(args.color) : new Color(0.0, 1.0, 1.0); // Cyan default
		this.actualClipTask = 1;

		// Array of Vector3 points representing the center polyline
		this.points = [];

		// Array of cross-section rings: each ring has 4 Vector3 vertices [0..3]
		this.rings = [];

		// Array of TetrahedralSegmentBox instances (one per segment)
		this.boxes = [];

		// Cached data texture and vertex buffer
		this.dataTexture = null;
		this.textureData = null;

		// Initialize visual meshes and handles
		this._initMaterials(args);
		this._initMeshes();
		this._initHandles();

		// Parse initial points if provided
		if (args.points || args.coordinates || args.line) {
			this.setPoints(args.points || args.coordinates || args.line);
		} else if (args.p1 && args.p2) {
			this.setPoints([args.p1, args.p2]);
		}

		this.initialized = true;
	}

	// -------------------------------------------------------------
	// Properties
	// -------------------------------------------------------------

	get distance() {
		return this._distance;
	}

	set distance(val) {
		const num = typeof val === 'number' ? val : parseFloat(val);
		if (num !== this._distance && num > 0) {
			this._distance = num;
			this._width = num * 2;
			this._height = num * 2;
			this.updateGeometry();
			this.dispatchEvent({type: 'distance_changed', object: this, value: num});
		}
	}

	get radius() {
		return this.distance;
	}

	set radius(val) {
		this.distance = val;
	}

	get width() {
		return this._width;
	}

	set width(val) {
		const num = typeof val === 'number' ? val : parseFloat(val);
		if (num !== this._width && num > 0) {
			this._width = num;
			this.updateGeometry();
			this.dispatchEvent({type: 'dimension_changed', object: this});
		}
	}

	get height() {
		return this._height;
	}

	set height(val) {
		const num = typeof val === 'number' ? val : parseFloat(val);
		if (num !== this._height && num > 0) {
			this._height = num;
			this.updateGeometry();
			this.dispatchEvent({type: 'dimension_changed', object: this});
		}
	}

	get showTet() {
		return this._showTet;
	}

	set showTet(value) {
		if (this._showTet !== value) {
			this._showTet = value;
			if (this.tetLines) this.tetLines.visible = value;
			if (this.tetMesh) this.tetMesh.visible = value;
			this.dispatchEvent({type: 'showTet_changed', object: this, value});
		}
	}

	get showCenterLine() {
		return this._showCenterLine;
	}

	set showCenterLine(value) {
		if (this._showCenterLine !== value) {
			this._showCenterLine = value;
			if (this.centerLine) this.centerLine.visible = value;
			this.dispatchEvent({type: 'showCenterLine_changed', object: this, value});
		}
	}

	get modifiable() {
		return this._modifiable;
	}

	set modifiable(value) {
		if (this._modifiable !== value) {
			this._modifiable = value;
			this.allowCornerDrag = value;
			if (this.handlesGroup) {
				this.handlesGroup.visible = value;
			}
			this.dispatchEvent({type: 'modifiable_changed', object: this, value});
		}
	}

	get renderMode() {
		return this._renderMode;
	}

	set renderMode(mode) {
		if (mode === 'uniforms' || mode === 'dataTexture') {
			this._renderMode = mode;
		}
	}

	get useDataTexture() {
		return this._renderMode === 'dataTexture';
	}

	set useDataTexture(val) {
		this._renderMode = val ? 'dataTexture' : 'uniforms';
	}

	// -------------------------------------------------------------
	// Material and Mesh Initialization
	// -------------------------------------------------------------

	_initMaterials(args) {
		this.outerLineMaterial = args.outerLineMaterial || new LineBasicMaterial({
			color: 0x00ffff,
			linewidth: 2,
			depthTest: true
		});

		this.tetLineMaterial = args.tetLineMaterial || new LineBasicMaterial({
			color: 0xff00ff, // Magenta for internal tetrahedra edges
			linewidth: 1,
			transparent: true,
			opacity: 0.7,
			depthTest: true
		});

		this.centerLineMaterial = args.centerLineMaterial || new LineBasicMaterial({
			color: 0xffff00, // Yellow center polyline
			linewidth: 2,
			depthTest: false
		});

		this.boxMaterial = args.boxMaterial || new MeshBasicMaterial({
			color: this.color.getHex(),
			transparent: true,
			opacity: 0.2,
			depthTest: true,
			depthWrite: false
		});

		this.tetMeshMaterial = args.tetMeshMaterial || new MeshBasicMaterial({
			color: 0xffaa00,
			transparent: true,
			opacity: 0.1,
			depthTest: true,
			depthWrite: false
		});

		this.handleMaterial = new MeshBasicMaterial({
			color: 0xffff00,
			depthTest: false,
			depthWrite: false
		});
	}

	_initMeshes() {
		// 1. Outer tube wireframe
		this.outerLinesGeometry = new BufferGeometry();
		this.outerLines = new LineSegments(this.outerLinesGeometry, this.outerLineMaterial);
		this.add(this.outerLines);

		// 2. Tetrahedral wireframe (outer + internal diagonals)
		this.tetLinesGeometry = new BufferGeometry();
		this.tetLines = new LineSegments(this.tetLinesGeometry, this.tetLineMaterial);
		this.tetLines.visible = this._showTet;
		this.add(this.tetLines);

		// 3. Central polyline wireframe
		this.centerLineGeometry = new BufferGeometry();
		this.centerLine = new LineSegments(this.centerLineGeometry, this.centerLineMaterial);
		this.centerLine.visible = this._showCenterLine;
		this.add(this.centerLine);

		// 4. Outer boundary surface mesh (sides + start/end caps)
		this.boxGeometry = new BufferGeometry();
		this.boxMesh = new Mesh(this.boxGeometry, this.boxMaterial);
		this.add(this.boxMesh);

		// 5. Internal tetrahedra face mesh
		this.tetMeshGeometry = new BufferGeometry();
		this.tetMesh = new Mesh(this.tetMeshGeometry, this.tetMeshMaterial);
		this.tetMesh.visible = this._showTet;
		this.add(this.tetMesh);
	}

	_initHandles() {
		this.handlesGroup = new Object3D();
		this.handlesGroup.name = 'tet_line_handles';
		this.handles = [];
		this.handlesGroup.visible = this._modifiable;
		this.add(this.handlesGroup);
	}

	// -------------------------------------------------------------
	// Geometry Generation: Topological Cross-Sections Along Polyline
	// -------------------------------------------------------------

	/**
	 * Sets or updates the polyline points.
	 * Supports:
	 * - Array of Vector3 or {x,y,z}
	 * - Array of [x,y,z] tuples
	 * - Flat array [x0,y0,z0, x1,y1,z1, ...]
	 * - GeoJSON LineString / Feature / FeatureCollection
	 * - Measure instance with points / toXYZArray
	 *
	 * @param {Array|Object} inputPoints
	 * @param {Object} [options={}]
	 */
	setPoints(inputPoints, options = {}) {
		if (!inputPoints) return;

		let pts = [];

		// GeoJSON support
		if (inputPoints.type === "FeatureCollection" || inputPoints.type === "Feature" || inputPoints.type === "LineString" || inputPoints.type === "MultiLineString") {
			const coordsList = extractLineCoordinates(inputPoints);
			if (coordsList.length > 0) {
				pts = coordsList[0].map(c => new Vector3(c[0], c[1], c[2] || 0));
			}
		}
		// Measure instance support
		else if (Array.isArray(inputPoints.points)) {
			pts = inputPoints.points.map(extractPointVec3);
		} else if (typeof inputPoints.toXYZArray === 'function') {
			const flat = inputPoints.toXYZArray();
			for (let i = 0; i <= flat.length - 3; i += 3) {
				pts.push(new Vector3(flat[i], flat[i + 1], flat[i + 2]));
			}
		}
		// Array of points or flat array
		else if (Array.isArray(inputPoints)) {
			if (inputPoints.length > 0 && typeof inputPoints[0] === 'number') {
				// Flat array [x0, y0, z0, ...]
				const stride = options.stride || 3;
				for (let i = 0; i <= inputPoints.length - stride; i += stride) {
					pts.push(new Vector3(inputPoints[i], inputPoints[i + 1], stride >= 3 ? inputPoints[i + 2] : 0));
				}
			} else {
				pts = inputPoints.map(extractPointVec3);
			}
		}

		// Filter out duplicate consecutive points
		const cleaned = [];
		for (let i = 0; i < pts.length; i++) {
			if (i === 0 || pts[i].distanceTo(pts[i - 1]) > 1e-5) {
				cleaned.push(pts[i].clone());
			}
		}

		if (cleaned.length < 2) {
			this.position.set(0, 0, 0);
			this.updateMatrix();
			this.updateMatrixWorld(true);
			this.points = cleaned;
			this.rings = [];
			this.boxes = [];
			this._clearGeometries();
			return;
		}

		if (options.local === true) {
			this.points = cleaned;
		} else {
			// Center vertices to eliminate WebGL float32 precision jitter at large world coordinates
			let minX = Infinity, minY = Infinity, minZ = Infinity;
			let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
			for (const p of cleaned) {
				if (p.x < minX) minX = p.x;
				if (p.y < minY) minY = p.y;
				if (p.z < minZ) minZ = p.z;
				if (p.x > maxX) maxX = p.x;
				if (p.y > maxY) maxY = p.y;
				if (p.z > maxZ) maxZ = p.z;
			}

			const center = options.center ? options.center.clone() : new Vector3(
				(minX + maxX) * 0.5,
				(minY + maxY) * 0.5,
				(minZ + maxZ) * 0.5
			);

			this.position.copy(center);
			this.rotation.set(0, 0, 0);
			this.scale.set(1, 1, 1);
			this.updateMatrix();
			this.updateMatrixWorld(true);

			this.points = cleaned.map(p => p.clone().sub(center));
		}

		this.updateGeometry();
		this._updateHandles();
		this.dispatchEvent({type: 'change', object: this});
	}

	/**
	 * Recalculates the bounding center of the polyline in world coordinates,
	 * re-anchors this.position to that center, and re-offsets all internal vertices/points
	 * to local coordinates. This completely eliminates 32-bit floating point precision jitter
	 * when viewing or manipulating lines with large geographic/UTM coordinates.
	 */
	recenter() {
		if (!this.points || this.points.length < 2) return;

		const worldPoints = this.getWorldPoints();

		let minX = Infinity, minY = Infinity, minZ = Infinity;
		let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
		for (const p of worldPoints) {
			if (p.x < minX) minX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.z < minZ) minZ = p.z;
			if (p.x > maxX) maxX = p.x;
			if (p.y > maxY) maxY = p.y;
			if (p.z > maxZ) maxZ = p.z;
		}

		const newCenter = new Vector3(
			(minX + maxX) * 0.5,
			(minY + maxY) * 0.5,
			(minZ + maxZ) * 0.5
		);

		this.position.copy(newCenter);
		this.rotation.set(0, 0, 0);
		this.scale.set(1, 1, 1);
		this.updateMatrix();
		this.updateMatrixWorld(true);

		const invMat = this.matrixWorld.clone().invert();
		this.points = worldPoints.map(wp => wp.clone().applyMatrix4(invMat));

		this.updateGeometry();
		this._updateHandles();
		this.dispatchEvent({type: 'change', object: this});
	}

	/**
	 * Returns the polyline points transformed into world coordinates.
	 * @returns {Array<Vector3>}
	 */
	getWorldPoints() {
		this.updateMatrixWorld(true);
		return this.points.map(p => p.clone().applyMatrix4(this.matrixWorld));
	}

	/**
	 * Returns the polyline points.
	 * @param {Object} [options={}]
	 *        - world: boolean (default true; set false for local coordinates)
	 * @returns {Array<Vector3>}
	 */
	getPoints(options = {}) {
		const world = options.world !== undefined ? options.world : true;
		if (world) {
			return this.getWorldPoints();
		}
		return this.points.map(p => p.clone());
	}

	/**
	 * Returns the world position of a specific polyline vertex index.
	 */
	getWorldVertexPosition(pointIndex, target = new Vector3()) {
		if (pointIndex >= 0 && pointIndex < this.points.length) {
			this.updateMatrixWorld(true);
			return target.copy(this.points[pointIndex]).applyMatrix4(this.matrixWorld);
		}
		return target;
	}

	/**
	 * Computes the continuous reference frames and miter-bisector cross-section rings
	 * along the non-straight polyline.
	 *
	 * Uses Rotation-Minimizing Parallel Transport frames to prevent twist, and
	 * bisector miter planes at corners so consecutive segment boxes share the EXACT
	 * same 4 vertex coordinates, guaranteeing a topologically continuous construction.
	 */
	_buildTopologicalRings() {
		const N = this.points.length;
		if (N < 2) return [];

		const numSegments = N - 1;
		const tangents = [];
		const segLengths = [];

		for (let i = 0; i < numSegments; i++) {
			const dir = new Vector3().subVectors(this.points[i + 1], this.points[i]);
			const len = dir.length();
			segLengths.push(len);
			tangents.push(len > 1e-6 ? dir.clone().divideScalar(len) : new Vector3(1, 0, 0));
		}

		// Compute continuous Right (R) and Up (U) frames along all segments using Parallel Transport
		const frames = [];

		// Initial frame for segment 0
		let up0 = new Vector3(0, 0, 1);
		if (Math.abs(tangents[0].dot(up0)) > 0.99) {
			up0 = new Vector3(0, 1, 0);
		}
		const right0 = new Vector3().crossVectors(tangents[0], up0).normalize();
		const actualUp0 = new Vector3().crossVectors(right0, tangents[0]).normalize();
		frames.push({T: tangents[0], R: right0, U: actualUp0});

		// Parallel-transport the frame to subsequent segments
		for (let i = 1; i < numSegments; i++) {
			const prevFrame = frames[i - 1];
			const tPrev = tangents[i - 1];
			const tCurr = tangents[i];

			const q = new Quaternion().setFromUnitVectors(tPrev, tCurr);
			const rCurr = prevFrame.R.clone().applyQuaternion(q).normalize();
			const uCurr = new Vector3().crossVectors(rCurr, tCurr).normalize();

			frames.push({T: tCurr, R: rCurr, U: uCurr});
		}

		const halfW = this._width * 0.5;
		const halfH = this._height * 0.5;
		const rings = [];

		// For each polyline vertex k in [0..N-1], compute cross-section ring C_k[0..3]
		for (let k = 0; k < N; k++) {
			const P = this.points[k];
			const ring = [];

			if (k === 0) {
				// Start cap: perpendicular to segment 0 tangent
				const f = frames[0];
				ring.push(
					new Vector3().copy(P).addScaledVector(f.R, -halfW).addScaledVector(f.U, -halfH), // 0: bottom-left
					new Vector3().copy(P).addScaledVector(f.R,  halfW).addScaledVector(f.U, -halfH), // 1: bottom-right
					new Vector3().copy(P).addScaledVector(f.R,  halfW).addScaledVector(f.U,  halfH), // 2: top-right
					new Vector3().copy(P).addScaledVector(f.R, -halfW).addScaledVector(f.U,  halfH)  // 3: top-left
				);
			} else if (k === N - 1) {
				// End cap: perpendicular to last segment tangent
				const f = frames[numSegments - 1];
				ring.push(
					new Vector3().copy(P).addScaledVector(f.R, -halfW).addScaledVector(f.U, -halfH), // 0: bottom-left
					new Vector3().copy(P).addScaledVector(f.R,  halfW).addScaledVector(f.U, -halfH), // 1: bottom-right
					new Vector3().copy(P).addScaledVector(f.R,  halfW).addScaledVector(f.U,  halfH), // 2: top-right
					new Vector3().copy(P).addScaledVector(f.R, -halfW).addScaledVector(f.U,  halfH)  // 3: top-left
				);
			} else {
				// Interior joint: miter plane bisecting the angle between incoming and outgoing segments
				const fPrev = frames[k - 1];
				const fNext = frames[k];
				const tPrev = tangents[k - 1];
				const tNext = tangents[k];

				const tBisect = new Vector3().addVectors(tPrev, tNext);
				let nMiter;
				if (tBisect.lengthSq() > 1e-6) {
					nMiter = tBisect.normalize();
				} else {
					// Fallback for 180-degree turnaround
					nMiter = tPrev.clone();
				}

				// Average reference frame at joint
				const rAvg = new Vector3().addVectors(fPrev.R, fNext.R).multiplyScalar(0.5);
				const uAvg = new Vector3().addVectors(fPrev.U, fNext.U).multiplyScalar(0.5);

				// Corner displacement vectors in unbent cross-section
				const cornerOffsets = [
					new Vector3().addScaledVector(rAvg, -halfW).addScaledVector(uAvg, -halfH), // 0
					new Vector3().addScaledVector(rAvg,  halfW).addScaledVector(uAvg, -halfH), // 1
					new Vector3().addScaledVector(rAvg,  halfW).addScaledVector(uAvg,  halfH), // 2
					new Vector3().addScaledVector(rAvg, -halfW).addScaledVector(uAvg,  halfH)  // 3
				];

				// Project each corner offset along the incoming segment direction onto the miter plane:
				// V_miter = V - (V · n / tPrev · n) * tPrev
				const denom = tPrev.dot(nMiter);
				const safeDenom = Math.abs(denom) > 0.15 ? denom : (denom >= 0 ? 0.15 : -0.15);

				for (let j = 0; j < 4; j++) {
					const O = cornerOffsets[j];
					const projFactor = O.dot(nMiter) / safeDenom;
					const vMiter = new Vector3().copy(O).addScaledVector(tPrev, -projFactor);

					// Clamp extreme miter spike expansion
					const nominalLen = O.length();
					if (nominalLen > 1e-6 && vMiter.length() > nominalLen * this.miterLimit) {
						vMiter.normalize().multiplyScalar(nominalLen * this.miterLimit);
					}

					ring.push(new Vector3().addVectors(P, vMiter));
				}
			}

			rings.push(ring);
		}

		return rings;
	}

	_clearGeometries() {
		this.outerLinesGeometry.setAttribute('position', new BufferAttribute(new Float32Array(0), 3));
		this.tetLinesGeometry.setAttribute('position', new BufferAttribute(new Float32Array(0), 3));
		this.centerLineGeometry.setAttribute('position', new BufferAttribute(new Float32Array(0), 3));
		this.boxGeometry.setAttribute('position', new BufferAttribute(new Float32Array(0), 3));
		this.tetMeshGeometry.setAttribute('position', new BufferAttribute(new Float32Array(0), 3));
	}

	updateGeometry() {
		if (this.points.length < 2) {
			this._clearGeometries();
			return;
		}

		// 1. Build topological vertex rings (shared between adjacent segment boxes)
		this.rings = this._buildTopologicalRings();
		const numSegments = this.rings.length - 1;

		// 2. Instantiate or update TetrahedralSegmentBox items
		this.boxes = [];
		for (let s = 0; s < numSegments; s++) {
			const box = new TetrahedralSegmentBox(
				this,
				s,
				this.rings[s],
				this.rings[s + 1],
				this.points[s],
				this.points[s + 1]
			);
			this.boxes.push(box);
		}

		// ---------------------------------------------------------
		// A. Outer wireframe:
		// Longitudinal lines (4 lines per segment = 8 vertices) +
		// Cross-section ring lines (4 lines per ring = 8 vertices)
		// ---------------------------------------------------------
		const totalOuterSegments = (numSegments * 4) + (this.rings.length * 4);
		const outerPos = new Float32Array(totalOuterSegments * 2 * 3);
		let oIdx = 0;

		// Longitudinal lines connecting consecutive rings
		for (let s = 0; s < numSegments; s++) {
			const r0 = this.rings[s];
			const r1 = this.rings[s + 1];
			for (let j = 0; j < 4; j++) {
				outerPos[oIdx++] = r0[j].x; outerPos[oIdx++] = r0[j].y; outerPos[oIdx++] = r0[j].z;
				outerPos[oIdx++] = r1[j].x; outerPos[oIdx++] = r1[j].y; outerPos[oIdx++] = r1[j].z;
			}
		}

		// Cross-section ring lines
		for (const ring of this.rings) {
			for (let j = 0; j < 4; j++) {
				const nextJ = (j + 1) % 4;
				outerPos[oIdx++] = ring[j].x; outerPos[oIdx++] = ring[j].y; outerPos[oIdx++] = ring[j].z;
				outerPos[oIdx++] = ring[nextJ].x; outerPos[oIdx++] = ring[nextJ].y; outerPos[oIdx++] = ring[nextJ].z;
			}
		}
		this.outerLinesGeometry.setAttribute('position', new BufferAttribute(outerPos, 3));
		this.outerLinesGeometry.attributes.position.needsUpdate = true;

		// ---------------------------------------------------------
		// B. Center polyline wireframe (1 line segment per segment = 2 vertices)
		// ---------------------------------------------------------
		const centerPos = new Float32Array(numSegments * 2 * 3);
		let cIdx = 0;
		for (let s = 0; s < numSegments; s++) {
			const p1 = this.points[s];
			const p2 = this.points[s + 1];
			centerPos[cIdx++] = p1.x; centerPos[cIdx++] = p1.y; centerPos[cIdx++] = p1.z;
			centerPos[cIdx++] = p2.x; centerPos[cIdx++] = p2.y; centerPos[cIdx++] = p2.z;
		}
		this.centerLineGeometry.setAttribute('position', new BufferAttribute(centerPos, 3));
		this.centerLineGeometry.attributes.position.needsUpdate = true;

		// ---------------------------------------------------------
		// C. Tetrahedral wireframe (outer edges + internal diagonals for every box)
		// 19 edges per box = 38 vertices per box
		// ---------------------------------------------------------
		const allTetEdges = [...OUTER_EDGES, ...INTERNAL_TET_EDGES];
		const tetLinePos = new Float32Array(numSegments * allTetEdges.length * 2 * 3);
		let tlIdx = 0;
		for (const box of this.boxes) {
			for (const [i1, i2] of allTetEdges) {
				const v1 = box.vertices[i1];
				const v2 = box.vertices[i2];
				tetLinePos[tlIdx++] = v1.x; tetLinePos[tlIdx++] = v1.y; tetLinePos[tlIdx++] = v1.z;
				tetLinePos[tlIdx++] = v2.x; tetLinePos[tlIdx++] = v2.y; tetLinePos[tlIdx++] = v2.z;
			}
		}
		this.tetLinesGeometry.setAttribute('position', new BufferAttribute(tetLinePos, 3));
		this.tetLinesGeometry.attributes.position.needsUpdate = true;

		// ---------------------------------------------------------
		// D. Outer tube mesh:
		// 4 sides per segment (2 triangles each = 8 triangles = 24 vertices per segment)
		// + start cap (2 triangles = 6 vertices) + end cap (2 triangles = 6 vertices)
		// ---------------------------------------------------------
		const numOuterTriangles = (numSegments * 8) + 4;
		const boxMeshPos = new Float32Array(numOuterTriangles * 3 * 3);
		let bmIdx = 0;

		// Side walls
		for (let s = 0; s < numSegments; s++) {
			const r0 = this.rings[s];
			const r1 = this.rings[s + 1];
			for (let j = 0; j < 4; j++) {
				const nextJ = (j + 1) % 4;
				const a = r0[j];
				const b = r0[nextJ];
				const c = r1[nextJ];
				const d = r1[j];

				// Triangle 1: a, b, c
				boxMeshPos[bmIdx++] = a.x; boxMeshPos[bmIdx++] = a.y; boxMeshPos[bmIdx++] = a.z;
				boxMeshPos[bmIdx++] = b.x; boxMeshPos[bmIdx++] = b.y; boxMeshPos[bmIdx++] = b.z;
				boxMeshPos[bmIdx++] = c.x; boxMeshPos[bmIdx++] = c.y; boxMeshPos[bmIdx++] = c.z;

				// Triangle 2: a, c, d
				boxMeshPos[bmIdx++] = a.x; boxMeshPos[bmIdx++] = a.y; boxMeshPos[bmIdx++] = a.z;
				boxMeshPos[bmIdx++] = c.x; boxMeshPos[bmIdx++] = c.y; boxMeshPos[bmIdx++] = c.z;
				boxMeshPos[bmIdx++] = d.x; boxMeshPos[bmIdx++] = d.y; boxMeshPos[bmIdx++] = d.z;
			}
		}

		// Start cap (ring 0)
		const startRing = this.rings[0];
		boxMeshPos[bmIdx++] = startRing[0].x; boxMeshPos[bmIdx++] = startRing[0].y; boxMeshPos[bmIdx++] = startRing[0].z;
		boxMeshPos[bmIdx++] = startRing[2].x; boxMeshPos[bmIdx++] = startRing[2].y; boxMeshPos[bmIdx++] = startRing[2].z;
		boxMeshPos[bmIdx++] = startRing[1].x; boxMeshPos[bmIdx++] = startRing[1].y; boxMeshPos[bmIdx++] = startRing[1].z;

		boxMeshPos[bmIdx++] = startRing[0].x; boxMeshPos[bmIdx++] = startRing[0].y; boxMeshPos[bmIdx++] = startRing[0].z;
		boxMeshPos[bmIdx++] = startRing[3].x; boxMeshPos[bmIdx++] = startRing[3].y; boxMeshPos[bmIdx++] = startRing[3].z;
		boxMeshPos[bmIdx++] = startRing[2].x; boxMeshPos[bmIdx++] = startRing[2].y; boxMeshPos[bmIdx++] = startRing[2].z;

		// End cap (last ring)
		const endRing = this.rings[this.rings.length - 1];
		boxMeshPos[bmIdx++] = endRing[0].x; boxMeshPos[bmIdx++] = endRing[0].y; boxMeshPos[bmIdx++] = endRing[0].z;
		boxMeshPos[bmIdx++] = endRing[1].x; boxMeshPos[bmIdx++] = endRing[1].y; boxMeshPos[bmIdx++] = endRing[1].z;
		boxMeshPos[bmIdx++] = endRing[2].x; boxMeshPos[bmIdx++] = endRing[2].y; boxMeshPos[bmIdx++] = endRing[2].z;

		boxMeshPos[bmIdx++] = endRing[0].x; boxMeshPos[bmIdx++] = endRing[0].y; boxMeshPos[bmIdx++] = endRing[0].z;
		boxMeshPos[bmIdx++] = endRing[2].x; boxMeshPos[bmIdx++] = endRing[2].y; boxMeshPos[bmIdx++] = endRing[2].z;
		boxMeshPos[bmIdx++] = endRing[3].x; boxMeshPos[bmIdx++] = endRing[3].y; boxMeshPos[bmIdx++] = endRing[3].z;

		this.boxGeometry.setAttribute('position', new BufferAttribute(boxMeshPos, 3));
		this.boxGeometry.attributes.position.needsUpdate = true;
		this.boxGeometry.computeVertexNormals();

		// ---------------------------------------------------------
		// E. Internal tetrahedra mesh:
		// 6 tetrahedra * 4 faces * 3 vertices = 72 vertices per box
		// ---------------------------------------------------------
		const tetMeshPos = new Float32Array(numSegments * 6 * 4 * 3 * 3);
		let tmIdx = 0;
		for (const box of this.boxes) {
			for (const tet of TET_INDICES) {
				const [aIdx, bIdx, cIdx, dIdx] = tet;
				const a = box.vertices[aIdx];
				const b = box.vertices[bIdx];
				const c = box.vertices[cIdx];
				const d = box.vertices[dIdx];

				// 4 triangular faces
				const faces = [
					[a, b, c],
					[a, c, d],
					[a, d, b],
					[b, d, c]
				];
				for (const face of faces) {
					for (const v of face) {
						tetMeshPos[tmIdx++] = v.x;
						tetMeshPos[tmIdx++] = v.y;
						tetMeshPos[tmIdx++] = v.z;
					}
				}
			}
		}
		this.tetMeshGeometry.setAttribute('position', new BufferAttribute(tetMeshPos, 3));
		this.tetMeshGeometry.attributes.position.needsUpdate = true;
		this.tetMeshGeometry.computeVertexNormals();

		// ---------------------------------------------------------
		// F. Update Bounding Box and Sphere
		// ---------------------------------------------------------
		this.boxGeometry.computeBoundingBox();
		this.boundingBox = this.boxGeometry.boundingBox ? this.boxGeometry.boundingBox.clone() : null;
		this.boxGeometry.computeBoundingSphere();
		this.boundingSphere = this.boxGeometry.boundingSphere ? this.boxGeometry.boundingSphere.clone() : new Sphere();
	}

	// -------------------------------------------------------------
	// Node / Marker Handles for Interactive Manipulation
	// -------------------------------------------------------------

	_updateHandles() {
		if (!this.handlesGroup) return;

		// Clean up existing handles
		while (this.handles.length > 0) {
			const h = this.handles.pop();
			this.handlesGroup.remove(h);
		}

		if (!this.points || this.points.length === 0) return;

		const handleGeo = new SphereGeometry(0.08, 12, 12);

		for (let i = 0; i < this.points.length; i++) {
			const handle = new Mesh(handleGeo, this.handleMaterial.clone());
			handle.name = `node_handle_${i}`;
			handle.pointIndex = i;
			handle.position.copy(this.points[i]);

			handle.addEventListener('drag', (e) => this._onNodeDrag(e, i));
			handle.addEventListener('drop', (e) => this._onNodeDrop(e, i));
			handle.addEventListener('mouseover', (e) => {
				if (handle.material) handle.material.color.setHex(0xff3333);
			});
			handle.addEventListener('mouseleave', (e) => {
				if (handle.material) handle.material.color.setHex(0xffff00);
			});

			this.handlesGroup.add(handle);
			this.handles.push(handle);
		}
		this.handlesGroup.visible = this._modifiable;
	}

	_onNodeDrag(e, pointIndex) {
		if (!this._modifiable || !this.allowCornerDrag) return;

		const drag = e.drag;
		const viewer = e.viewer || this.viewer;
		if (!viewer) return;
		const camera = viewer.scene ? viewer.scene.getActiveCamera() : null;
		if (!camera) return;

		if (!drag.intersectionStart) {
			this.updateMatrixWorld(true);
			const worldPos = this.points[pointIndex].clone().applyMatrix4(this.matrixWorld);
			drag.intersectionStart = worldPos;
			drag.pointStart = this.points[pointIndex].clone();
			const camDir = new Vector3();
			camera.getWorldDirection(camDir);
			drag.dragPlane = new Plane().setFromNormalAndCoplanarPoint(camDir.negate(), worldPos);
		}

		const domElement = viewer.renderer ? viewer.renderer.domElement : null;
		if (!domElement) return;

		const ray = Utils.mouseToRay(drag.end, camera, domElement.clientWidth, domElement.clientHeight);
		const I = ray.intersectPlane(drag.dragPlane, new Vector3());

		if (I) {
			this.updateMatrixWorld(true);
			const invMat = this.matrixWorld.clone().invert();
			const localI = I.clone().applyMatrix4(invMat);
			this.points[pointIndex].copy(localI);
			this.updateGeometry();
			if (this.handles[pointIndex]) {
				this.handles[pointIndex].position.copy(localI);
			}
			this.dispatchEvent({type: 'change', object: this, pointIndex});
		}
	}

	_onNodeDrop(e, pointIndex) {
		if (e.drag) {
			e.drag.intersectionStart = null;
			e.drag.pointStart = null;
			e.drag.dragPlane = null;
		}
		this.recenter();
		this.dispatchEvent({type: 'position_changed', object: this, pointIndex});
	}

	// -------------------------------------------------------------
	// Uniform and Data Extraction
	// -------------------------------------------------------------

	/**
	 * Returns the coordinates of all tetrahedra across all segment boxes in a flat array,
	 * suitable for populating shader uniforms (e.g. uClipTetrahedralBoxes / uClipTetrahedrons).
	 *
	 * Sequentially dumps per tetrahedron the coordinates of its 4 vertices (x, y, z):
	 * 12 floats per tetrahedron * 6 tetrahedra = 72 floats per box.
	 * Total length for M boxes = M * 72 floats.
	 *
	 * @param {Object} [options={}]
	 *        - world: boolean (default true, transforms to world coordinates)
	 *        - asFloat32: boolean (default true, returns Float32Array; set false for standard Array)
	 *        - asArray: boolean (if true, returns standard Array)
	 *        - boxIndex: number (optional, dumps only the specified segment box)
	 *        - segmentIndex: number (alias for boxIndex)
	 * @returns {Float32Array|Array<number>}
	 */
	getCoordinates(options = {}) {
		return this.getCoordinatesArray(options);
	}

	getCoordinatesArray(options = {}) {
		const world = options.world !== undefined ? options.world : true;
		const asFloat32 = (options.asArray === true) ? false : (options.asFloat32 !== undefined ? options.asFloat32 : true);

		// Single box dump if boxIndex / segmentIndex specified
		const targetIdx = options.boxIndex !== undefined ? options.boxIndex : options.segmentIndex;
		if (targetIdx !== undefined && this.boxes[targetIdx]) {
			return this.boxes[targetIdx].getCoordinatesArray({world, asFloat32});
		}

		const numBoxes = this.boxes.length;
		const totalFloats = numBoxes * 6 * 4 * 3; // M * 72 floats
		const result = asFloat32 ? new Float32Array(totalFloats) : new Array(totalFloats);

		let offset = 0;
		for (const box of this.boxes) {
			const boxFloats = box.getCoordinatesArray({world, asFloat32: false});
			for (let i = 0; i < boxFloats.length; i++) {
				result[offset++] = boxFloats[i];
			}
		}

		return result;
	}

	/**
	 * Returns the coordinates explicitly as a standard JavaScript Array<number>.
	 */
	getCoordinatesAsArray(options = {}) {
		return this.getCoordinatesArray({...options, asFloat32: false, asArray: true});
	}

	// -------------------------------------------------------------
	// Render / Commit Uniforms and DataTexture
	// -------------------------------------------------------------

	render(material, options = {}) {
		const mode = options.renderMode || this._renderMode;
		if (mode === 'dataTexture') {
			return this.commitDataTexture(material);
		} else {
			return this.commitUniforms(material);
		}
	}

	/**
	 * Commits all tetrahedra into shader uniforms.
	 * Compatible with pointInClipTetrahedralBox and pointInClipTetrahedron.
	 */
	commitUniforms(material) {
		if (!material || !material.uniforms) return;

		const worldTetData = this.getCoordinatesArray({world: true, asFloat32: true});
		const numBoxes = this.boxes.length;
		const totalTets = numBoxes * 6;

		// 1. Commit to uClipTetrahedralBoxes
		if (!material.uniforms.uClipTetrahedralBoxes) {
			material.uniforms.uClipTetrahedralBoxes = {
				value: new Float32Array(Math.max(256 * 3, worldTetData.length))
			};
		}
		if (material.uniforms.uClipTetrahedralBoxes.value.length < worldTetData.length) {
			material.uniforms.uClipTetrahedralBoxes.value = new Float32Array(worldTetData.length);
		}
		material.uniforms.uClipTetrahedralBoxes.value.set(worldTetData, 0);

		// 2. Also populate clipTetrahedralBoxes for PointCloudMaterial
		if (material.uniforms.clipTetrahedralBoxes) {
			material.uniforms.clipTetrahedralBoxes.value = material.uniforms.uClipTetrahedralBoxes.value;
		}

		// 3. Count uniforms
		if (material.uniforms.uClipTetrahedronCount) {
			material.uniforms.uClipTetrahedronCount.value = totalTets;
		}
		if (material.uniforms.clipTetrahedralBoxCount) {
			material.uniforms.clipTetrahedralBoxCount.value = numBoxes;
		}

		// 4. Color uniform
		if (material.uniforms.uClipTetraColor) {
			material.uniforms.uClipTetraColor.value = [this.color.r, this.color.g, this.color.b];
		}
		if (material.uniforms.uClipTetraUseTexture) {
			material.uniforms.uClipTetraUseTexture.value = false;
		}
	}

	/**
	 * Commits all tetrahedra into a THREE.DataTexture (RGBA32F),
	 * eliminating shader uniform register limits for long polylines.
	 */
	commitDataTexture(material) {
		const totalVertices = this.boxes.length * 6 * 4; // M * 24 vertices
		const worldTetData = this.getCoordinatesArray({world: true, asFloat32: true});

		if (!this.dataTexture || this.textureData.length !== totalVertices * 4) {
			this.textureData = new Float32Array(Math.max(4, totalVertices * 4));
			this.dataTexture = new DataTexture(
				this.textureData,
				Math.max(1, totalVertices),
				1,
				RGBAFormat,
				FloatType
			);
		}

		for (let i = 0; i < totalVertices; i++) {
			this.textureData[i * 4 + 0] = worldTetData[i * 3 + 0];
			this.textureData[i * 4 + 1] = worldTetData[i * 3 + 1];
			this.textureData[i * 4 + 2] = worldTetData[i * 3 + 2];
			this.textureData[i * 4 + 3] = 1.0;
		}
		this.dataTexture.needsUpdate = true;

		if (material && material.uniforms) {
			if (!material.uniforms.uClipTetraTexture) {
				material.uniforms.uClipTetraTexture = {value: this.dataTexture};
			} else {
				material.uniforms.uClipTetraTexture.value = this.dataTexture;
			}
			if (material.uniforms.uClipTetraUseTexture) {
				material.uniforms.uClipTetraUseTexture.value = true;
			}
			if (material.uniforms.uClipTetrahedronCount) {
				material.uniforms.uClipTetrahedronCount.value = this.boxes.length * 6;
			}
		}

		return this.dataTexture;
	}

	// -------------------------------------------------------------
	// CPU Queries and Geometric Tests
	// -------------------------------------------------------------

	/**
	 * Tests whether a point in world coordinates lies inside any tetrahedron in the volume.
	 */
	containsPoint(point) {
		for (const box of this.boxes) {
			if (box.containsPoint(point)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Calculates the exact sum of volumes of all tetrahedra across all segment boxes.
	 */
	getVolume() {
		let total = 0;
		for (const box of this.boxes) {
			total += box.getVolume();
		}
		return total;
	}

	update(camera) {
		super.update();

		if (!camera && this.viewer && this.viewer.scene) {
			camera = this.viewer.scene.getActiveCamera();
		}

		// Distance-based visibility check
		if (camera && this.maxDistance !== undefined && this.maxDistance !== Infinity) {
			const worldCenter = this.getWorldPosition(new Vector3());
			const camPos = camera.getWorldPosition(new Vector3());
			const dist = camPos.distanceTo(worldCenter);

			const inRange = dist <= this.maxDistance && dist >= this.minDistance;
			this.visible = inRange;

			if (this.fadeDistance > 0 && inRange) {
				const fadeStart = this.maxDistance - this.fadeDistance;
				if (dist > fadeStart) {
					const alpha = 1.0 - (dist - fadeStart) / this.fadeDistance;
					if (this.boxMaterial) this.boxMaterial.opacity = 0.2 * alpha;
					if (this.outerLineMaterial) this.outerLineMaterial.opacity = alpha;
					if (this.tetLineMaterial) this.tetLineMaterial.opacity = 0.7 * alpha;
				}
			}
		}

		if (this.tetLines) this.tetLines.visible = this._showTet;
		if (this.tetMesh) this.tetMesh.visible = this._showTet;
		if (this.centerLine) this.centerLine.visible = this._showCenterLine;
	}

	raycast(raycaster, intersects) {
		if (this.boxMesh) {
			this.boxMesh.raycast(raycaster, intersects);
		}
	}

	// -------------------------------------------------------------
	// Serialization
	// -------------------------------------------------------------

	toJSON() {
		const data = {
			name: this.name,
			uuid: this.uuid,
			intType: this._intType,
			distance: this._distance,
			width: this._width,
			height: this._height,
			miterLimit: this.miterLimit,
			color: this.color.getHex(),
			_clip: this._clip,
			_visible: this.visible,
			_modifiable: this._modifiable,
			showTet: this._showTet,
			showCenterLine: this._showCenterLine,
			renderMode: this._renderMode,
			maxDistance: this.maxDistance,
			minDistance: this.minDistance,
			points: this.getWorldPoints().map(p => [p.x, p.y, p.z]),
			matrix: this.matrix.toArray(),
			matrixWorld: this.matrixWorld.toArray()
		};
		return data;
	}

	static fromJSON(data) {
		const volume = new TetrahedralLineVolume({
			name: data.name,
			distance: data.distance,
			width: data.width,
			height: data.height,
			miterLimit: data.miterLimit,
			color: data.color,
			clip: data._clip,
			modifiable: data._modifiable !== undefined ? data._modifiable : true,
			showTet: data.showTet || false,
			showCenterLine: data.showCenterLine !== undefined ? data.showCenterLine : true,
			renderMode: data.renderMode || 'uniforms',
			maxDistance: data.maxDistance !== undefined ? data.maxDistance : Infinity,
			minDistance: data.minDistance || 0,
			points: data.points ? data.points.map(p => new Vector3(p[0], p[1], p[2])) : []
		});

		volume.uuid = data.uuid || volume.uuid;
		volume.visible = data._visible !== undefined ? data._visible : true;
		volume._intType = data.intType || FilterIntType.TETBOXVOLUME;

		if (data.matrix) {
			volume.matrix.fromArray(data.matrix);
			volume.matrix.decompose(volume.position, volume.quaternion, volume.scale);
		}
		if (data.matrixWorld) {
			volume.matrixWorld.fromArray(data.matrixWorld);
		}

		volume.updateMatrix();
		volume.updateMatrixWorld(true);
		volume.updateGeometry();

		return volume;
	}
}

export {TetrahedralLineTool, TetLineTool} from "./TetrahedralLineTool.js";


