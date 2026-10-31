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
	RGBAFormat,
	Sphere,
	SphereGeometry,
	Vector3
} from 'three';

import {Volume} from "./Volume.js";
import {FilterIntType} from "./FilterConsts.js";
import {Utils} from "../utils.js";

/**
 * 6 canonical tetrahedra decomposing a hexahedron with vertices [0..7]:
 * Bottom face: 0=(-x,-y,-z), 1=(+x,-y,-z), 2=(+x,+y,-z), 3=(-x,+y,-z)
 * Top face:    4=(-x,-y,+z), 5=(+x,-y,+z), 6=(+x,+y,+z), 7=(-x,+y,+z)
 * Space diagonal: 0 -> 6
 */
export const TET_INDICES = [
	[0, 1, 2, 6],
	[0, 2, 3, 6],
	[0, 3, 7, 6],
	[0, 7, 4, 6],
	[0, 4, 5, 6],
	[0, 5, 1, 6],
];

/**
 * 12 outer box edges (wireframe)
 */
export const OUTER_EDGES = [
	// bottom
	[0, 1], [1, 2], [2, 3], [3, 0],
	// top
	[4, 5], [5, 6], [6, 7], [7, 4],
	// vertical
	[0, 4], [1, 5], [2, 6], [3, 7]
];

/**
 * Internal diagonal edges connecting the 6 tetrahedra (excluding outer edges)
 */
export const INTERNAL_TET_EDGES = [
	[0, 6], // main space diagonal
	[0, 2], [0, 7], [0, 5], // face diagonals
	[1, 6], [3, 6], [4, 6]
];

/**
 * 3 connected box edges for each corner vertex (indices of neighbors).
 * Corner movements are constrained along these edge directions.
 */
export const CORNER_NEIGHBORS = [
	[1, 3, 4], // 0
	[0, 2, 5], // 1
	[1, 3, 6], // 2
	[2, 0, 7], // 3
	[5, 7, 0], // 4
	[4, 6, 1], // 5
	[5, 7, 2], // 6
	[6, 4, 3]  // 7
];

/**
 * CPU point in tetrahedron test using barycentric coordinates
 */
export function pointInTetrahedron(p, a, b, c, d) {
	const v0x = b.x - a.x, v0y = b.y - a.y, v0z = b.z - a.z;
	const v1x = c.x - a.x, v1y = c.y - a.y, v1z = c.z - a.z;
	const v2x = d.x - a.x, v2y = d.y - a.y, v2z = d.z - a.z;

	// cross(v1, v2)
	const c12x = v1y * v2z - v1z * v2y;
	const c12y = v1z * v2x - v1x * v2z;
	const c12z = v1x * v2y - v1y * v2x;

	const det = v0x * c12x + v0y * c12y + v0z * c12z;
	if (Math.abs(det) < 1e-7) {
		return false;
	}

	const vpx = p.x - a.x, vpy = p.y - a.y, vpz = p.z - a.z;
	const invDet = 1.0 / det;

	const u = (vpx * c12x + vpy * c12y + vpz * c12z) * invDet;
	if (u < -1e-5 || u > 1.00001) return false;

	// cross(vp, v2)
	const cvp2x = vpy * v2z - vpz * v2y;
	const cvp2y = vpz * v2x - vpx * v2z;
	const cvp2z = vpx * v2y - vpy * v2x;
	const v = (v0x * cvp2x + v0y * cvp2y + v0z * cvp2z) * invDet;
	if (v < -1e-5 || (u + v) > 1.00001) return false;

	// cross(v1, vp)
	const cv1px = v1y * vpz - v1z * vpy;
	const cv1py = v1z * vpx - v1x * vpz;
	const cv1pz = v1x * vpy - v1y * vpx;
	const w = (v0x * cv1px + v0y * cv1py + v0z * cv1pz) * invDet;
	if (w < -1e-5 || (u + v + w) > 1.00001) return false;

	return true;
}

/**
 * TetrahedralBoxVolume (TetrahedralVolume)
 * Topologically similar to a box, defined with 8 explicit vertices and 6 internal tetrahedra.
 * Supports:
 * - Corner dragging constrained along connected edge directions (toggleable via modifiable flag)
 * - showTet: toggle internal tetrahedral representation vs outer lines only
 * - Distance-based visibility updating (disappearing at distance)
 * - Render function committing to shader uniforms or DataTexture (selectable)
 * - Integration with FilterConsts.js as FilterIntType.TETBOXVOLUME and MixedFilters
 */
export class TetrahedralBoxVolume extends Volume {

	constructor(args = {}) {
		super(args);

		this._intType = FilterIntType.TETBOXVOLUME; // 3
		this.isTetrahedralBoxVolume = true;
		this.isTetrahedralVolume = true;
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = 'tet_box_volume_' + this.constructor.counter;

		// Modifiable flag: enables or disables corner movement
		this._modifiable = args.modifiable !== undefined ? args.modifiable : true;
		this.allowCornerDrag = true;

		// showTet flag: show internal tetrahedral representation vs outer lines only
		this._showTet = args.showTet !== undefined ? args.showTet : false;

		// Distance-based visibility control
		this.maxDistance = args.maxDistance !== undefined ? args.maxDistance : Infinity;
		this.minDistance = args.minDistance !== undefined ? args.minDistance : 0;
		this.fadeDistance = args.fadeDistance || 0; // optional fade margin

		// Render mode: 'uniforms' or 'dataTexture'
		this._renderMode = args.renderMode || (args.useDataTexture ? 'dataTexture' : 'uniforms');

		// Volume styling and filter color
		this.color = args.color ? new Color(args.color) : new Color(0.0, 1.0, 1.0); // Cyan default
		this.actualClipTask = 1; // CLIPTASK_HIGHLIGHT

		// 8 explicit corner vertices (local space, default unit cube centered at origin)
		this.vertices = [
			new Vector3(-0.5, -0.5, -0.5), // 0
			new Vector3(0.5, -0.5, -0.5), // 1
			new Vector3(0.5, 0.5, -0.5), // 2
			new Vector3(-0.5, 0.5, -0.5), // 3
			new Vector3(-0.5, -0.5, 0.5), // 4
			new Vector3(0.5, -0.5, 0.5), // 5
			new Vector3(0.5, 0.5, 0.5), // 6
			new Vector3(-0.5, 0.5, 0.5), // 7
		];

		if (args.vertices && args.vertices.length === 8) {
			for (let i = 0;i < 8;i++) {
				const v = args.vertices[i];
				this.vertices[i].set(v.x !== undefined ? v.x : v[0], v.y !== undefined ? v.y : v[1], v.z !== undefined ? v.z : v[2]);
			}
		}

		// Cached data texture and vertex array
		this.dataTexture = null;
		this.textureData = null;
		this._cachedTetWorldVertices = new Float32Array(24 * 3); // 6 tet * 4 vertices * 3 coords

		// Initialize visual meshes
		this._initMaterials(args);
		this._initMeshes();
		this._initCornerHandles();

		this.updateGeometry();
		this.initialized = true;
	}

	// -------------------------------------------------------------
	// Properties
	// -------------------------------------------------------------

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
	// Initialization of visual objects
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

		this.boxMaterial = args.boxMaterial || new MeshBasicMaterial({
			color: this.color.getHex(),
			transparent: true,
			opacity: 0.15,
			depthTest: true,
			depthWrite: false
		});

		this.tetMeshMaterial = args.tetMeshMaterial || new MeshBasicMaterial({
			color: 0xffaa00,
			wireframe: false,
			transparent: true,
			opacity: 0.1,
			depthTest: true,
			depthWrite: false
		});

		this.handleMaterial = new MeshBasicMaterial({
			color: 0xffff00, // Yellow draggable corner handles
			depthTest: false,
			depthWrite: false
		});
	}

	_initMeshes() {
		// 1. Outer box wireframe (12 edges = 24 vertices)
		this.outerLinesGeometry = new BufferGeometry();
		this.outerLinesGeometry.setAttribute('position', new BufferAttribute(new Float32Array(OUTER_EDGES.length * 2 * 3), 3));
		this.outerLines = new LineSegments(this.outerLinesGeometry, this.outerLineMaterial);
		this.add(this.outerLines);

		// 2. Internal tetrahedral wireframe (all 19 edges = 38 vertices)
		const allTetEdges = [...OUTER_EDGES, ...INTERNAL_TET_EDGES];
		this.tetLinesGeometry = new BufferGeometry();
		this.tetLinesGeometry.setAttribute('position', new BufferAttribute(new Float32Array(allTetEdges.length * 2 * 3), 3));
		this.tetLines = new LineSegments(this.tetLinesGeometry, this.tetLineMaterial);
		this.tetLines.visible = this._showTet;
		this.add(this.tetLines);

		// 3. Translucent outer box mesh (12 triangles = 36 vertices)
		this.boxGeometry = new BufferGeometry();
		this.boxGeometry.setAttribute('position', new BufferAttribute(new Float32Array(36 * 3), 3));
		this.boxMesh = new Mesh(this.boxGeometry, this.boxMaterial);
		this.add(this.boxMesh);

		// 4. Translucent internal tetrahedral mesh (6 tet * 4 faces * 3 vertices = 72 vertices)
		this.tetMeshGeometry = new BufferGeometry();
		this.tetMeshGeometry.setAttribute('position', new BufferAttribute(new Float32Array(6 * 4 * 3 * 3), 3));
		this.tetMesh = new Mesh(this.tetMeshGeometry, this.tetMeshMaterial);
		this.tetMesh.visible = this._showTet;
		this.add(this.tetMesh);
	}

	_initCornerHandles() {
		this.handlesGroup = new Object3D();
		this.handlesGroup.name = 'tet_corner_handles';
		this.cornerHandles = [];

		const handleGeo = new SphereGeometry(0.04, 12, 12);

		for (let i = 0;i < 8;i++) {
			const handle = new Mesh(handleGeo, this.handleMaterial.clone());
			handle.name = `corner_handle_${i}`;
			handle.vertexIndex = i;
			handle.position.copy(this.vertices[i]);

			// Event listeners for dragging
			handle.addEventListener('drag', (e) => this._onCornerDrag(e, i));
			handle.addEventListener('drop', (e) => this._onCornerDrop(e, i));
			handle.addEventListener('mouseover', (e) => this._onCornerHover(e, true));
			handle.addEventListener('mouseleave', (e) => this._onCornerHover(e, false));

			this.handlesGroup.add(handle);
			this.cornerHandles.push(handle);
		}

		this.handlesGroup.visible = this._modifiable;
		this.add(this.handlesGroup);
	}

	// -------------------------------------------------------------
	// Corner Dragging along edge directions
	// -------------------------------------------------------------

	_onCornerDrag(e, vertexIndex) {
		if (!this._modifiable || !this.allowCornerDrag) {
			return;
		}

		const drag = e.drag;
		const viewer = e.viewer || this.viewer;
		if (!viewer) return;
		const camera = viewer.scene ? viewer.scene.getActiveCamera() : null;
		if (!camera) return;

		// On drag start, record baseline vertex pos and drag plane
		if (!drag.intersectionStart) {
			drag.intersectionStart = drag.location ? drag.location.clone() : this.getWorldVertexPosition(vertexIndex);
			drag.vertexStart = this.vertices[vertexIndex].clone();
			drag.activeVertexIndex = vertexIndex;

			const worldPos = this.getWorldVertexPosition(vertexIndex);
			const camDir = new Vector3();
			camera.getWorldDirection(camDir);
			// Plane perpendicular to camera forward passing through vertex world pos
			drag.dragPlane = new Plane().setFromNormalAndCoplanarPoint(camDir.negate(), worldPos);
		}

		const domElement = viewer.renderer ? viewer.renderer.domElement : null;
		if (!domElement) return;

		const ray = Utils.mouseToRay(drag.end, camera, domElement.clientWidth, domElement.clientHeight);
		const I = ray.intersectPlane(drag.dragPlane, new Vector3());

		if (I) {
			// Transform world point I to local space
			this.updateMatrixWorld(true);
			const invMatrix = this.matrixWorld.clone().invert();
			const I_local = I.clone().applyMatrix4(invMatrix);

			// Movement vector from initial corner position
			const delta = new Vector3().subVectors(I_local, drag.vertexStart);

			// 3 connected corner edge neighbors
			const neighbors = CORNER_NEIGHBORS[vertexIndex];

			// Find connected edge direction with highest projection
			let bestDir = new Vector3();
			let maxDot = -Infinity;
			let bestProj = 0;

			for (const nIdx of neighbors) {
				const edgeDir = new Vector3().subVectors(this.vertices[nIdx], drag.vertexStart);
				const edgeLen = edgeDir.length();
				if (edgeLen > 1e-6) {
					edgeDir.normalize();
					const proj = delta.dot(edgeDir);
					if (Math.abs(proj) > maxDot) {
						maxDot = Math.abs(proj);
						bestDir.copy(edgeDir);
						bestProj = proj;
					}
				}
			}

			// Constrain movement strictly along the closest connected edge direction
			if (maxDot > 0) {
				const constrainedDelta = bestDir.multiplyScalar(bestProj);
				this.vertices[vertexIndex].copy(drag.vertexStart).add(constrainedDelta);

				this.updateGeometry();
				this.dispatchEvent({type: 'change', object: this, vertexIndex});
			}
		}
	}

	_onCornerDrop(e, vertexIndex) {
		if (e.drag) {
			e.drag.intersectionStart = null;
			e.drag.vertexStart = null;
			e.drag.dragPlane = null;
		}
		this.updateGeometry();
		this.dispatchEvent({type: 'position_changed', object: this, vertexIndex});
	}

	_onCornerHover(e, isHovered) {
		const target = e.target || (e.drag ? e.drag.object : null);
		if (target && target.material) {
			target.material.color.setHex(isHovered ? 0xff3333 : 0xffff00);
		}
	}

	// -------------------------------------------------------------
	// Geometry Updating
	// -------------------------------------------------------------

	updateGeometry() {
		// Update outer box lines
		const outerPos = this.outerLinesGeometry.attributes.position.array;
		let oIdx = 0;
		for (const [i1, i2] of OUTER_EDGES) {
			const v1 = this.vertices[i1];
			const v2 = this.vertices[i2];
			outerPos[oIdx++] = v1.x; outerPos[oIdx++] = v1.y; outerPos[oIdx++] = v1.z;
			outerPos[oIdx++] = v2.x; outerPos[oIdx++] = v2.y; outerPos[oIdx++] = v2.z;
		}
		this.outerLinesGeometry.attributes.position.needsUpdate = true;

		// Update all tetrahedral lines (outer + internal diagonals)
		const allTetEdges = [...OUTER_EDGES, ...INTERNAL_TET_EDGES];
		const tetPos = this.tetLinesGeometry.attributes.position.array;
		let tIdx = 0;
		for (const [i1, i2] of allTetEdges) {
			const v1 = this.vertices[i1];
			const v2 = this.vertices[i2];
			tetPos[tIdx++] = v1.x; tetPos[tIdx++] = v1.y; tetPos[tIdx++] = v1.z;
			tetPos[tIdx++] = v2.x; tetPos[tIdx++] = v2.y; tetPos[tIdx++] = v2.z;
		}
		this.tetLinesGeometry.attributes.position.needsUpdate = true;

		// Update outer box mesh faces (6 faces * 2 triangles * 3 vertices = 36 vertices)
		const boxFaces = [
			// bottom: 0, 1, 2, 3
			0, 1, 2, 0, 2, 3,
			// top: 4, 7, 6, 4, 6, 5
			4, 7, 6, 4, 6, 5,
			// front: 4, 5, 1, 4, 1, 0 (or +z face: 4,5,6,7 depending on coords)
			0, 1, 5, 0, 5, 4,
			// back: 3, 2, 6, 3, 6, 7
			2, 3, 7, 2, 7, 6,
			// left: 0, 4, 7, 0, 7, 3
			0, 4, 7, 0, 7, 3,
			// right: 1, 2, 6, 1, 6, 5
			1, 5, 6, 1, 6, 2
		];
		const bPos = this.boxGeometry.attributes.position.array;
		let bIdx = 0;
		for (const vIdx of boxFaces) {
			const v = this.vertices[vIdx];
			bPos[bIdx++] = v.x; bPos[bIdx++] = v.y; bPos[bIdx++] = v.z;
		}
		this.boxGeometry.attributes.position.needsUpdate = true;
		this.boxGeometry.computeVertexNormals();

		// Update 6 tetrahedra mesh faces (6 * 4 faces * 3 vertices = 72 vertices)
		const tetFaces = [];
		for (const tet of TET_INDICES) {
			const [a, b, c, d] = tet;
			tetFaces.push(a, b, c);
			tetFaces.push(a, c, d);
			tetFaces.push(a, d, b);
			tetFaces.push(b, d, c);
		}
		const tmPos = this.tetMeshGeometry.attributes.position.array;
		let tmIdx = 0;
		for (const vIdx of tetFaces) {
			const v = this.vertices[vIdx];
			tmPos[tmIdx++] = v.x; tmPos[tmIdx++] = v.y; tmPos[tmIdx++] = v.z;
		}
		this.tetMeshGeometry.attributes.position.needsUpdate = true;
		this.tetMeshGeometry.computeVertexNormals();

		// Update corner handle positions
		if (this.cornerHandles) {
			for (let i = 0;i < 8;i++) {
				this.cornerHandles[i].position.copy(this.vertices[i]);
			}
		}

		// Update bounding box and sphere
		this.boxGeometry.computeBoundingBox();
		this.boundingBox = this.boxGeometry.boundingBox.clone();
		this.boundingSphere = this.boxGeometry.boundingSphere ? this.boxGeometry.boundingSphere.clone() : new Sphere();
	}

	getWorldVertexPosition(index) {
		this.updateMatrixWorld(true);
		return this.vertices[index].clone().applyMatrix4(this.matrixWorld);
	}

	/**
	 * Returns flattened Float32Array of 24 world-space vertices (6 tetrahedra * 4 vertices * 3 coords).
	 * Expressed as: [t1a, t1b, t1c, t1d, t2a, t2b, t2c, t2d, ...]
	 */
	getTetrahedralVerticesWorld() {
		this.updateMatrixWorld(true);
		const out = this._cachedTetWorldVertices;
		let idx = 0;

		const worldVerts = [
			this.vertices[0].clone().applyMatrix4(this.matrixWorld),
			this.vertices[1].clone().applyMatrix4(this.matrixWorld),
			this.vertices[2].clone().applyMatrix4(this.matrixWorld),
			this.vertices[3].clone().applyMatrix4(this.matrixWorld),
			this.vertices[4].clone().applyMatrix4(this.matrixWorld),
			this.vertices[5].clone().applyMatrix4(this.matrixWorld),
			this.vertices[6].clone().applyMatrix4(this.matrixWorld),
			this.vertices[7].clone().applyMatrix4(this.matrixWorld),
		];

		for (const tet of TET_INDICES) {
			for (let i = 0;i < 4;i++) {
				const w = worldVerts[tet[i]];
				out[idx++] = w.x;
				out[idx++] = w.y;
				out[idx++] = w.z;
			}
		}

		return out;
	}

	/**
	 * Dumps into a 1D array of 32-bit floats the explicit coordinates making all 6 tetrahedra vertices (6 * 4 * 3 = 72 floats).
	 * Sequentially dumps per tetrahedron the coordinates of its 4 vertices (x, y, z),
	 * then the second tetrahedron, the third, and so on.
	 *
	 * @param {Object} [options]
	 *        - world: boolean (default true, transforms to world coordinates)
	 *        - asFloat32: boolean (default true, returns Float32Array; set false for standard Array)
	 * @returns {Float32Array|Array<number>}
	 */
	getCoordinatesArray(options = {}) {
		const world = options.world !== undefined ? options.world : true;
		const asFloat32 = options.asFloat32 !== undefined ? options.asFloat32 : true;
		const totalFloats = 6 * 4 * 3; // 72 coordinates
		const result = asFloat32 ? new Float32Array(totalFloats) : new Array(totalFloats);

		let offset = 0;
		if (world) {
			this.updateMatrixWorld(true);
			const worldVerts = [
				this.vertices[0].clone().applyMatrix4(this.matrixWorld),
				this.vertices[1].clone().applyMatrix4(this.matrixWorld),
				this.vertices[2].clone().applyMatrix4(this.matrixWorld),
				this.vertices[3].clone().applyMatrix4(this.matrixWorld),
				this.vertices[4].clone().applyMatrix4(this.matrixWorld),
				this.vertices[5].clone().applyMatrix4(this.matrixWorld),
				this.vertices[6].clone().applyMatrix4(this.matrixWorld),
				this.vertices[7].clone().applyMatrix4(this.matrixWorld),
			];

			for (const tet of TET_INDICES) {
				for (let i = 0; i < 4; i++) {
					const v = worldVerts[tet[i]];
					result[offset++] = v.x;
					result[offset++] = v.y;
					result[offset++] = v.z;
				}
			}
		} else {
			for (const tet of TET_INDICES) {
				for (let i = 0; i < 4; i++) {
					const v = this.vertices[tet[i]];
					result[offset++] = v.x;
					result[offset++] = v.y;
					result[offset++] = v.z;
				}
			}
		}

		return result;
	}

	// -------------------------------------------------------------
	// Visibility and Camera Distance Update
	// -------------------------------------------------------------

	update(camera) {
		super.update();

		if (!camera && this.viewer && this.viewer.scene) {
			camera = this.viewer.scene.getActiveCamera();
		}

		// Distance-based visibility check: disappear in the distance
		if (camera && this.maxDistance !== undefined && this.maxDistance !== Infinity) {
			const worldCenter = this.getWorldPosition(new Vector3());
			const camPos = camera.getWorldPosition(new Vector3());
			const dist = camPos.distanceTo(worldCenter);

			const inRange = dist <= this.maxDistance && dist >= this.minDistance;
			this.visible = inRange;

			// Optional smooth opacity fading as it nears maxDistance
			if (this.fadeDistance > 0 && inRange) {
				const fadeStart = this.maxDistance - this.fadeDistance;
				if (dist > fadeStart) {
					const alpha = 1.0 - (dist - fadeStart) / this.fadeDistance;
					if (this.boxMaterial) this.boxMaterial.opacity = 0.15 * alpha;
					if (this.outerLineMaterial) this.outerLineMaterial.opacity = alpha;
					if (this.tetLineMaterial) this.tetLineMaterial.opacity = 0.7 * alpha;
				}
			}
		}

		if (this.tetLines) this.tetLines.visible = this._showTet;
		if (this.tetMesh) this.tetMesh.visible = this._showTet;
	}

	// -------------------------------------------------------------
	// Render / Commit Uniforms or DataTexture
	// -------------------------------------------------------------

	/**
	 * Renders/commits the tetrahedron data to shader uniforms or DataTexture.
	 * Selectable via this.renderMode ('uniforms' | 'dataTexture').
	 */
	render(material, options = {}) {
		const mode = options.renderMode || this._renderMode;
		if (mode === 'dataTexture') {
			return this.commitDataTexture(material);
		} else {
			return this.commitUniforms(material);
		}
	}

	/**
	 * Commits the 6 tetrahedra as a flat Float32Array to shader uniforms.
	 * Matches pointInClipTetrahedron(tetrahedrons, count, point) in pointcloud.vs.
	 */
	commitUniforms(material) {
		if (!material || !material.uniforms) return;

		const worldTetData = this.getTetrahedralVerticesWorld(); // Float32Array(72)

		if (!material.uniforms.uClipTetrahedrons) {
			// Allocate buffer sized up to max_clip_tetrahedron_vertices * 3
			material.uniforms.uClipTetrahedrons = {
				value: new Float32Array(256 * 3) // default 64 tetrahedrons * 4 vertices * 3
			};
		}

		// Copy current 24 vertices (6 tetrahedrons)
		material.uniforms.uClipTetrahedrons.value.set(worldTetData, 0);

		if (!material.uniforms.uClipTetrahedronCount) {
			material.uniforms.uClipTetrahedronCount = {value: 6};
		} else {
			material.uniforms.uClipTetrahedronCount.value = 6;
		}

		if (material.uniforms.uClipTetraUseTexture) {
			material.uniforms.uClipTetraUseTexture.value = false;
		}

		if (material.uniforms.uClipTetraColor) {
			material.uniforms.uClipTetraColor.value = [this.color.r, this.color.g, this.color.b];
		}
	}

	/**
	 * Commits the 6 tetrahedra into a THREE.DataTexture (RGBA32F).
	 * Eliminates uniform register limits for large volumes.
	 */
	commitDataTexture(material) {
		const numVertices = 24; // 6 tet * 4 vertices
		const worldTetData = this.getTetrahedralVerticesWorld();

		if (!this.dataTexture) {
			this.textureData = new Float32Array(numVertices * 4); // RGBA format
			this.dataTexture = new DataTexture(
				this.textureData,
				numVertices, // width
				1,           // height
				RGBAFormat,
				FloatType
			);
		}

		// Fill RGBA texture data with (x, y, z, 1.0)
		for (let i = 0;i < numVertices;i++) {
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

			if (!material.uniforms.uClipTetraUseTexture) {
				material.uniforms.uClipTetraUseTexture = {value: true};
			} else {
				material.uniforms.uClipTetraUseTexture.value = true;
			}

			if (!material.uniforms.uClipTetrahedronCount) {
				material.uniforms.uClipTetrahedronCount = {value: 6};
			} else {
				material.uniforms.uClipTetrahedronCount.value = 6;
			}
		}

		return this.dataTexture;
	}

	// -------------------------------------------------------------
	// CPU Point In Volume Test
	// -------------------------------------------------------------

	/**
	 * Tests whether a point in world coordinates is inside any of the 6 tetrahedra.
	 * Objective: find points inside the object and perform coloring/filtering.
	 */
	containsPoint(point) {
		const worldVerts = [
			this.vertices[0].clone().applyMatrix4(this.matrixWorld),
			this.vertices[1].clone().applyMatrix4(this.matrixWorld),
			this.vertices[2].clone().applyMatrix4(this.matrixWorld),
			this.vertices[3].clone().applyMatrix4(this.matrixWorld),
			this.vertices[4].clone().applyMatrix4(this.matrixWorld),
			this.vertices[5].clone().applyMatrix4(this.matrixWorld),
			this.vertices[6].clone().applyMatrix4(this.matrixWorld),
			this.vertices[7].clone().applyMatrix4(this.matrixWorld),
		];

		for (const tet of TET_INDICES) {
			const a = worldVerts[tet[0]];
			const b = worldVerts[tet[1]];
			const c = worldVerts[tet[2]];
			const d = worldVerts[tet[3]];

			if (pointInTetrahedron(point, a, b, c, d)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Calculates the exact total volume by summing the 6 tetrahedra.
	 * Volume = 1/6 * |det([b-a, c-a, d-a])|
	 */
	getVolume() {
		this.updateMatrixWorld(true);
		const worldVerts = this.vertices.map(v => v.clone().applyMatrix4(this.matrixWorld));
		let totalVolume = 0;

		for (const tet of TET_INDICES) {
			const a = worldVerts[tet[0]];
			const b = worldVerts[tet[1]];
			const c = worldVerts[tet[2]];
			const d = worldVerts[tet[3]];

			const v0 = new Vector3().subVectors(b, a);
			const v1 = new Vector3().subVectors(c, a);
			const v2 = new Vector3().subVectors(d, a);
			const det = v0.dot(new Vector3().crossVectors(v1, v2));

			totalVolume += Math.abs(det) / 6.0;
		}

		return totalVolume;
	}

	raycast(raycaster, intersects) {
		if (this.boxMesh) {
			this.boxMesh.raycast(raycaster, intersects);
		}
	}

	// -------------------------------------------------------------
	// Serialization (toJSON / fromJSON)
	// -------------------------------------------------------------

	toJSON() {
		const data = {
			name: this.name,
			uuid: this.uuid,
			intType: this._intType,
			groupId: this.groupId,
			_clip: this._clip,
			_visible: this.visible,
			_modifiable: this._modifiable,
			showTet: this._showTet,
			renderMode: this._renderMode,
			maxDistance: this.maxDistance,
			minDistance: this.minDistance,
			color: this.color.getHex(),
			vertices: this.vertices.map(v => [v.x, v.y, v.z]),
			matrix: this.matrix.toArray(),
			matrixWorld: this.matrixWorld.toArray()
		};

		return data;
	}

	static fromJSON(data) {
		const volume = new TetrahedralBoxVolume({
			clip: data._clip,
			modifiable: data._modifiable !== undefined ? data._modifiable : true,
			showTet: data.showTet || false,
			renderMode: data.renderMode || 'uniforms',
			maxDistance: data.maxDistance !== undefined ? data.maxDistance : Infinity,
			minDistance: data.minDistance || 0,
			color: data.color !== undefined ? data.color : 0x00ffff,
			vertices: data.vertices ? data.vertices.map(v => new Vector3(v[0], v[1], v[2])) : undefined
		});

		volume.name = data.name || volume.name;
		volume.uuid = data.uuid || volume.uuid;
		volume.groupId = data.groupId || 0;
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



// Backwards compatibility alias
export { TetrahedralBoxVolume as TetrahedralVolume };
