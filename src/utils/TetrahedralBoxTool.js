import {Scene, Vector2, Vector3} from 'three';
import {EventDispatcher} from "../EventDispatcher.js";
import {Utils} from "../utils.js";
import {TetrahedralBoxVolume, TetrahedralVolume, TET_INDICES} from "./TetrahedralBoxVolume.js";
import {Volume} from "./Volume.js";

/**
 * TetrahedralBoxTool (TetTool)
 * Interactive and programmatic insertion tool for TetrahedralBoxVolume objects.
 * Similar to VolumeTool, supporting:
 * 1. Screen insertion by raycasting on the point cloud to extract 3D position and set scale.
 * 2. Programmatic insertion from an XYZ coordinate array or 8-corner array.
 * 3. Programmatic insertion from a GeoJSON Point feature or FeatureCollection.
 */
export class TetrahedralBoxTool extends EventDispatcher {

	constructor(viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_tet_box', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});
		this.addEventListener('start_inserting_tet', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new Scene();
		this.scene.name = 'scene_tetrahedral_box';

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = e => {
			if (e.volume instanceof TetrahedralBoxVolume) {
				this.scene.remove(e.volume);
			}
		};

		this.onAdd = e => {
			if (e.volume instanceof TetrahedralBoxVolume) {
				this.scene.add(e.volume);
			}
		};

		for (let volume of viewer.scene.volumes) {
			if (volume instanceof TetrahedralBoxVolume) {
				this.onAdd({volume: volume});
			}
		}

		this.viewer.inputHandler.addEventListener('delete', e => {
			let volumes = e.selection.filter(item => (item instanceof TetrahedralBoxVolume));
			volumes.forEach(vol => this.viewer.scene.removeVolume(vol));
		});

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.scene", e => this.render(e));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('volume_added', this.onAdd);
		viewer.scene.addEventListener('volume_removed', this.onRemove);
	}

	onSceneChange(e) {
		if (e.oldScene) {
			e.oldScene.removeEventListeners('volume_added', this.onAdd);
			e.oldScene.removeEventListeners('volume_removed', this.onRemove);
		}

		e.scene.addEventListener('volume_added', this.onAdd);
		e.scene.addEventListener('volume_removed', this.onRemove);
	}

	/**
	 * Starts interactive insertion of a TetrahedralVolume on the screen via mouse raycasting.
	 * Raycasts against the active point clouds, positions the volume at the hit location,
	 * scales it appropriately according to camera distance, and begins interactive dragging.
	 *
	 * @param {Object} args - Optional configuration parameters for TetrahedralVolume
	 * @returns {TetrahedralVolume}
	 */
	startInsertion(args = {}) {
		const VolumeClass = args.type || TetrahedralBoxVolume;
		const volume = new VolumeClass({
			showTet: args.showTet !== undefined ? args.showTet : true,
			modifiable: args.modifiable !== undefined ? args.modifiable : true,
			renderMode: args.renderMode || 'uniforms',
			maxDistance: args.maxDistance !== undefined ? args.maxDistance : Infinity,
			minDistance: args.minDistance !== undefined ? args.minDistance : 0,
			color: args.color !== undefined ? args.color : 0x00ffff,
			clip: args.clip || false,
			...args
		});

		volume.name = args.name || ('TetBoxVolume_' + (TetrahedralBoxVolume.counter || 0));
		volume.initialized = true;

		this.dispatchEvent({
			type: 'start_inserting_tet_box',
			volume: volume
		});
		this.dispatchEvent({
			type: 'start_inserting_tet',
			volume: volume
		});
		this.dispatchEvent({
			type: 'start_inserting_volume',
			volume: volume
		});

		this.viewer.scene.addVolume(volume);
		this.scene.add(volume);

		let dropped = false;
		const cancel = {
			callback: null
		};

		const drag = e => {
			const camera = this.viewer.scene.getActiveCamera();
			if (!camera) return;

			const I = Utils.getMousePointCloudIntersection(
				e.drag.end,
				camera,
				this.viewer,
				this.viewer.scene.pointclouds,
				{pickClipped: false}
			);

			if (I) {
				volume.position.copy(I.location);

				if (args.scale !== undefined) {
					if (typeof args.scale === 'number') {
						volume.scale.set(args.scale, args.scale, args.scale);
					} else if (Array.isArray(args.scale)) {
						volume.scale.set(args.scale[0], args.scale[1], args.scale[2]);
					} else if (args.scale.isVector3) {
						volume.scale.copy(args.scale);
					}
				} else {
					// Adaptive scale based on camera distance
					const wp = volume.getWorldPosition(new Vector3()).applyMatrix4(camera.matrixWorldInverse);
					const w = Math.max(0.1, Math.abs(wp.z / 5));
					volume.scale.set(w, w, w);
				}

				volume.updateMatrix();
				volume.updateMatrixWorld(true);
				volume.updateGeometry();
			}
		};

		const drop = e => {
			dropped = true;
			volume.removeEventListener('drag', drag);
			volume.removeEventListener('drop', drop);

			if (cancel.callback) {
				cancel.callback();
			}

			this.dispatchEvent({
				type: 'tet_box_inserted',
				volume: volume,
				location: volume.position.clone()
			});
			this.dispatchEvent({
				type: 'tet_inserted',
				volume: volume,
				location: volume.position.clone()
			});
		};

		cancel.callback = e => {
			volume.removeEventListener('drag', drag);
			volume.removeEventListener('drop', drop);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
			if (!dropped) {
				this.viewer.scene.removeVolume(volume);
			}
		};

		volume.addEventListener('drag', drag);
		volume.addEventListener('drop', drop);
		this.viewer.addEventListener('cancel_insertions', cancel.callback);

		this.viewer.inputHandler.startDragging(volume);

		return volume;
	}

	/**
	 * Programmatically inserts a TetrahedralVolume from an XYZ point or 8-corner array.
	 *
	 * @param {Array<number>|Object|Vector3|Array<Array<number>>} xyz
	 *        - [x, y, z] coordinates of center
	 *        - { x, y, z } object
	 *        - Vector3 instance
	 *        - Array of 8 coordinates [[x,y,z], ...] specifying exact 8 corner vertices
	 * @param {Object} args - Optional properties (scale, name, showTet, color, modifiable, etc.)
	 * @returns {TetrahedralVolume}
	 */
	insertFromXYZ(xyz, args = {}) {
		if (!xyz) {
			throw new Error("insertFromXYZ: xyz coordinate is required.");
		}

		let position = new Vector3();
		let explicitVertices = null;

		// Case A: Array of 8 corners [[x,y,z], ...]
		if (Array.isArray(xyz) && xyz.length === 8 && (Array.isArray(xyz[0]) || xyz[0].x !== undefined)) {
			const pts = xyz.map(p => {
				if (Array.isArray(p)) return new Vector3(p[0], p[1], p[2] || 0);
				return new Vector3(p.x, p.y, p.z || 0);
			});

			// Compute centroid as volume position
			const centroid = new Vector3();
			for (const p of pts) centroid.add(p);
			centroid.divideScalar(8);
			position.copy(centroid);

			// Local offsets from centroid
			explicitVertices = pts.map(p => new Vector3().subVectors(p, centroid));
		}
		// Case B: Single point [x, y, z] or [x, y]
		else if (Array.isArray(xyz)) {
			position.set(xyz[0] || 0, xyz[1] || 0, xyz[2] || 0);
		}
		// Case C: Object with x, y, z
		else if (xyz.isVector3) {
			position.copy(xyz);
		} else if (typeof xyz === 'object') {
			position.set(xyz.x || 0, xyz.y || 0, xyz.z || 0);
		}

		const volume = new TetrahedralBoxVolume({
			showTet: args.showTet !== undefined ? args.showTet : true,
			modifiable: args.modifiable !== undefined ? args.modifiable : true,
			renderMode: args.renderMode || 'uniforms',
			maxDistance: args.maxDistance !== undefined ? args.maxDistance : Infinity,
			minDistance: args.minDistance !== undefined ? args.minDistance : 0,
			color: args.color !== undefined ? args.color : 0x00ffff,
			clip: args.clip || false,
			vertices: explicitVertices || args.vertices,
			...args
		});

		volume.position.copy(position);

		if (args.scale !== undefined) {
			if (typeof args.scale === 'number') {
				volume.scale.set(args.scale, args.scale, args.scale);
			} else if (Array.isArray(args.scale)) {
				volume.scale.set(args.scale[0], args.scale[1], args.scale[2]);
			} else if (args.scale.isVector3) {
				volume.scale.copy(args.scale);
			}
		}

		volume.name = args.name || ('TetBoxVolume_' + (TetrahedralVolume.counter || 0));
		volume.initialized = true;

		this.viewer.scene.addVolume(volume);
		this.scene.add(volume);

		volume.updateMatrix();
		volume.updateMatrixWorld(true);
		volume.updateGeometry();

		this.dispatchEvent({
			type: 'tet_added',
			volume: volume
		});

		return volume;
	}

	/**
	 * Programmatically inserts TetrahedralVolume(s) from a GeoJSON Point feature,
	 * Point geometry, or FeatureCollection.
	 *
	 * @param {Object|string} geojson - GeoJSON Feature, FeatureCollection, or JSON string
	 * @param {Object} args - Optional overrides for volume parameters
	 * @returns {TetrahedralVolume|Array<TetrahedralVolume>}
	 */
	insertFromGeoJSON(geojson, args = {}) {
		let data = geojson;
		if (typeof geojson === 'string') {
			data = JSON.parse(geojson);
		}

		if (!data) {
			throw new Error("insertFromGeoJSON: invalid geojson data.");
		}

		// Handle FeatureCollection
		if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
			const inserted = [];
			for (const feature of data.features) {
				if (feature.geometry && feature.geometry.type === 'Point') {
					inserted.push(this._insertSingleGeoJSONFeature(feature, args));
				}
			}
			return inserted;
		}

		// Handle single Feature or Geometry
		if (data.type === 'Feature' || data.type === 'Point') {
			return this._insertSingleGeoJSONFeature(data, args);
		}

		throw new Error(`insertFromGeoJSON: unsupported GeoJSON type '${data.type}'. Expected 'Point' or 'Feature'.`);
	}

	_insertSingleGeoJSONFeature(featureOrGeometry, args = {}) {
		let coords = null;
		let properties = {};

		if (featureOrGeometry.type === 'Feature') {
			if (!featureOrGeometry.geometry || featureOrGeometry.geometry.type !== 'Point') {
				throw new Error("insertFromGeoJSON: Feature geometry must be of type 'Point'.");
			}
			coords = featureOrGeometry.geometry.coordinates;
			properties = featureOrGeometry.properties || {};
		} else if (featureOrGeometry.type === 'Point') {
			coords = featureOrGeometry.coordinates;
		}

		if (!coords || !Array.isArray(coords)) {
			throw new Error("insertFromGeoJSON: missing or invalid Point coordinates.");
		}

		let x = coords[0];
		let y = coords[1];
		let z = coords.length > 2 ? coords[2] : 0;

		// Optional coordinate projection using proj4 if specified
		const sourceProj = args.sourceProjection || args.projection;
		if (sourceProj && typeof window !== 'undefined' && window.proj4 && this.viewer.projection) {
			const transformed = window.proj4(sourceProj, this.viewer.projection, [x, y]);
			x = transformed[0];
			y = transformed[1];
		}

		// Merge properties from GeoJSON with explicit args (args take precedence)
		const mergedArgs = {
			name: properties.name,
			color: properties.color,
			showTet: properties.showTet,
			modifiable: properties.modifiable,
			renderMode: properties.renderMode,
			maxDistance: properties.maxDistance,
			minDistance: properties.minDistance,
			scale: properties.scale !== undefined ? properties.scale : properties.size,
			vertices: properties.vertices,
			...args
		};

		return this.insertFromXYZ([x, y, z], mergedArgs);
	}

	/**
	 * Returns all TetrahedralVolume instances currently in the scene.
	 */
	getVolumes() {
		if (!this.viewer || !this.viewer.scene) return [];
		return this.viewer.scene.volumes.filter(v => v instanceof TetrahedralBoxVolume);
	}

	/**
	 * Updates labels, distances, and volumes each frame.
	 */
	update() {
		if (!this.viewer.scene) {
			return;
		}

		const camera = this.viewer.scene.getActiveCamera();
		if (!camera) return;

		const renderAreaSize = this.viewer.renderer.getSize(new Vector2());
		const clientWidth = renderAreaSize.width;
		const clientHeight = renderAreaSize.height;

		const volumes = this.getVolumes();
		for (const volume of volumes) {
			// Update distance-based visibility and geometry
			volume.update(camera);

			// Update volume label if present
			const label = volume.label;
			if (label && volume.showVolumeLabel) {
				const distance = label.position.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

				if (pr > 0) {
					const scale = (70 / pr);
					label.scale.set(scale, scale, scale);
				}

				let calculatedVolume = volume.getVolume();
				if (this.viewer.lengthUnit && this.viewer.lengthUnitDisplay) {
					calculatedVolume = calculatedVolume / Math.pow(this.viewer.lengthUnit.unitspermeter, 3) * Math.pow(this.viewer.lengthUnitDisplay.unitspermeter, 3);
					const text = Utils.addCommas(calculatedVolume.toFixed(3)) + ' ' + this.viewer.lengthUnitDisplay.code + '\u00B3';
					label.setText(text);
				} else {
					label.setText(calculatedVolume.toFixed(3) + ' m\u00B3');
				}
			}
		}
	}

	render(params) {
		const renderer = this.viewer.renderer;
		if (!renderer || !this.viewer.scene) return;

		const oldTarget = renderer.getRenderTarget();

		if (params && params.renderTarget) {
			renderer.setRenderTarget(params.renderTarget);
		}
		renderer.render(this.scene, this.viewer.scene.getActiveCamera());
		renderer.setRenderTarget(oldTarget);
	}


	/**
	 * Dumps into a single 1D array of 32-bit floats the explicit coordinates making all tetrahedral vertices.
	 * Sequentially dumps per tetrahedron the coordinates of its 4 vertices (x, y, z),
	 * then the second tetrahedron, the third, and so on (12 floats per tetrahedron, 72 per box volume).
	 *
	 * If no arguments are provided, dumps all active TetrahedralBoxVolume instances in the scene.
	 * Alternatively, a specific volume, array of volumes, or options object can be supplied.
	 *
	 * @param {Object|TetrahedralBoxVolume|Array<TetrahedralBoxVolume>} [options]
	 *        - volume: specific TetrahedralBoxVolume to dump
	 *        - volumes: array of TetrahedralBoxVolume instances
	 *        - world: boolean (default true, transform coordinates to world-space)
	 *        - asFloat32: boolean (default true, returns Float32Array; set false for standard Array)
	 * @returns {Float32Array|Array<number>}
	 */
	getCoordinatesArray(options = {}) {
		let targetVolumes = [];
		let world = true;
		let asFloat32 = true;

		if (options instanceof TetrahedralBoxVolume || (options && options.isTetrahedralBoxVolume)) {
			targetVolumes = [options];
		} else if (Array.isArray(options)) {
			targetVolumes = options;
		} else if (typeof options === 'object') {
			world = options.world !== undefined ? options.world : true;
			asFloat32 = options.asFloat32 !== undefined ? options.asFloat32 : true;
			if (options.volume) {
				targetVolumes = [options.volume];
			} else if (options.volumes) {
				targetVolumes = options.volumes;
			} else {
				targetVolumes = this.getVolumes();
			}
		} else {
			targetVolumes = this.getVolumes();
		}

		const totalLength = targetVolumes.length * 6 * 4 * 3;
		const result = asFloat32 ? new Float32Array(totalLength) : new Array(totalLength);

		let offset = 0;
		for (const vol of targetVolumes) {
			const coords = vol.getCoordinatesArray({world, asFloat32});
			for (let i = 0; i < coords.length; i++) {
				result[offset++] = coords[i];
			}
		}

		return result;
	}

}

// Backwards compatibility alias
export { TetrahedralBoxTool as TetTool };
