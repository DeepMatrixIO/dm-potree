import {
	TetrahedralLineVolume,
	TetrahedralSegmentBox,
	extractPointVec3,
	extractLineCoordinates
} from "./TetrahedralLineVolume.js";
import {TET_INDICES} from "./TetrahedralBoxVolume.js";

/**
 * TetrahedralLineTool (TetLineTool)
 * Tool constructed in the same fashion as VolumeLineTool, but producing a sequence
 * of topologically connected tetrahedral boxes along a polyline.
 *
 * Supports:
 * 1. Constructor taking coordinate array, GeoJSON, or viewer:
 *    new TetrahedralLineTool([x0, y0, z0, x1, y1, z1, ...], options)
 *    new TetrahedralLineTool(geoJSON, options)
 *    new TetrahedralLineTool(viewer, options)
 * 2. Sequence of tetrahedral boxes with line segments in the center of the box.
 * 3. Topological vertex sharing between consecutive boxes (non-straight 3D polylines).
 * 4. getCoordinatesArray() / getCoordinates() for populating shader uniforms.
 * 5. fromArray(), fromGeoJSON(), fromMeasure(), testTool(), and live measurement binding.
 */
export class TetrahedralLineTool {

	/**
	 * @param {Array<number>|Object} [viewerOrInput]
	 *        - Coordinate array: [x0, y0, z0, x1, y1, z1, ...] or [[x, y, z], ...]
	 *        - GeoJSON: Feature, FeatureCollection, or LineString
	 *        - Measure instance
	 *        - Potree.Viewer instance
	 * @param {Object|number} [options={}]
	 *        - distance / radius: half-thickness (default 5)
	 *        - width, height: cross-section dimensions (default 2 * distance)
	 *        - showTet: toggle internal tetrahedral edges & meshes
	 *        - showCenterLine: toggle center polyline
	 *        - color: volume color
	 *        - clip: boolean
	 *        - viewer, scene: optional viewer/scene reference
	 */
	constructor(viewerOrInput, options = {}) {
		const customOptions = typeof options === 'number'
			? {distance: options, radius: options}
			: {...options};

		this.options = customOptions;
		this.viewer = null;
		this.scene = null;
		this.volumes = [];
		this.boxes = [];
		this.volume = null;
		this.measureBindings = new Map();

		// Check if first argument is a Viewer or contains a scene
		if (viewerOrInput && (viewerOrInput.scene || viewerOrInput.renderer || viewerOrInput.inputHandler)) {
			this.viewer = viewerOrInput;
			this.scene = viewerOrInput.scene;
		} else if (viewerOrInput && viewerOrInput.viewer) {
			this.viewer = viewerOrInput.viewer;
			this.scene = viewerOrInput.scene || viewerOrInput.viewer.scene;
		}

		if (customOptions.viewer) {
			this.viewer = customOptions.viewer;
			this.scene = customOptions.scene || customOptions.viewer.scene;
		} else if (customOptions.scene) {
			this.scene = customOptions.scene;
		}

		// If first argument is a coordinate array, GeoJSON, or Measure, build sequence immediately
		if (viewerOrInput && viewerOrInput !== this.viewer) {
			this.build(viewerOrInput, customOptions);
		}
	}

	get distance() {
		return this.options.distance ?? this.options.radius ?? 5;
	}

	set distance(val) {
		const num = typeof val === 'number' ? val : parseFloat(val);
		this.options.distance = num;
		this.options.radius = num;
		this.options.width = num * 2;
		this.options.height = num * 2;

		for (const vol of this.volumes) {
			vol.distance = num;
		}
	}

	get radius() {
		return this.distance;
	}

	set radius(val) {
		this.distance = val;
	}

	/**
	 * Builds or updates the sequence of tetrahedral boxes from any supported input.
	 *
	 * @param {Array|Object} input - Array of coords, GeoJSON, or Measure
	 * @param {Object} [options={}]
	 * @returns {Array<TetrahedralSegmentBox>}
	 */
	build(input, options = {}) {
		if (!input) return [];

		const mergedOptions = {...this.options, ...options};

		// 1. Measure instance
		if (input && (Array.isArray(input.points) || typeof input.toXYZArray === 'function')) {
			return this.fromMeasure(input, mergedOptions);
		}

		// 2. GeoJSON object or string
		let geoData = input;
		if (typeof input === 'string' && (input.trim().startsWith('{') || input.trim().startsWith('['))) {
			try {
				geoData = JSON.parse(input);
			} catch (e) {}
		}

		if (geoData && typeof geoData === 'object' && (geoData.type === 'Feature' || geoData.type === 'FeatureCollection' || geoData.type === 'LineString' || geoData.type === 'MultiLineString')) {
			return this.fromGeoJSON(geoData, mergedOptions);
		}

		// 3. Coordinate array
		if (Array.isArray(geoData)) {
			return this.fromArray(geoData, mergedOptions);
		}

		return [];
	}

	/**
	 * Creates a TetrahedralLineVolume along given points, registers its boxes,
	 * and adds it to the scene if available.
	 *
	 * @param {Array|Object} points
	 * @param {Object} [options={}]
	 * @returns {TetrahedralLineVolume}
	 */
	createVolume(points, options = {}) {
		const customOptions = typeof options === 'number'
			? {distance: options, radius: options}
			: (options || {});
		const mergedOptions = {
			clip: true,
			showTet: true,
			showCenterLine: true,
			...this.options,
			...customOptions
		};

		const volume = new TetrahedralLineVolume(mergedOptions);
		volume.setPoints(points, mergedOptions);

		const scene = this.scene || (this.viewer ? this.viewer.scene : null);
		if (scene) {
			scene.addVolume(volume);
		}

		this.volumes.push(volume);
		this.volume = volume;
		this.boxes = volume.boxes;

		return volume;
	}

	/**
	 * Constructs the sequence of tetrahedral boxes from a flat array:
	 * [x0, y0, z0, x1, y1, z1, ...] or array of point tuples [[x, y, z], ...].
	 *
	 * @param {Array<number>|Array<Array<number>>} array
	 * @param {Object} [options={}]
	 * @returns {Array<TetrahedralSegmentBox>}
	 */
	fromArray(array, options = {}) {
		const volume = this.createVolume(array, options);
		return volume ? volume.boxes : [];
	}

	/**
	 * Constructs the sequence of tetrahedral boxes from a GeoJSON LineString,
	 * MultiLineString, Feature, or FeatureCollection.
	 *
	 * @param {Object|string} geoJSON
	 * @param {Object} [options={}]
	 * @returns {Array<TetrahedralSegmentBox>}
	 */
	fromGeoJSON(geoJSON, options = {}) {
		let data = geoJSON;
		if (typeof geoJSON === 'string') {
			try {
				data = JSON.parse(geoJSON);
			} catch (e) {
				return [];
			}
		}

		const customOptions = typeof options === 'number'
			? {distance: options, radius: options}
			: (options || {});

		const lineCoordsList = extractLineCoordinates(data);
		const allBoxes = [];

		for (const coords of lineCoordsList) {
			const volume = this.createVolume(coords, customOptions);
			if (volume && volume.boxes) {
				allBoxes.push(...volume.boxes);
			}
		}

		this.boxes = allBoxes;
		return allBoxes;
	}

	/**
	 * Constructs the sequence of tetrahedral boxes along a Measure instance's linestring.
	 * Automatically binds live update listeners so dragging measurement nodes updates
	 * the boxes and tetrahedra in real-time.
	 *
	 * @param {Object} measure - Potree.Measure instance
	 * @param {Object} [options={}]
	 * @returns {Array<TetrahedralSegmentBox>}
	 */
	fromMeasure(measure, options = {}) {
		if (!measure) return [];

		const customOptions = typeof options === 'number'
			? {distance: options, radius: options}
			: (options || {});

		const points = measure.points || [];
		if (points.length < 2 && typeof measure.toXYZArray === 'function') {
			return this.fromArray(measure.toXYZArray(), customOptions);
		}

		const volume = this.createVolume(points, customOptions);

		if (typeof measure.addEventListener === 'function' && customOptions.track !== false) {
			this.bindMeasure(measure, customOptions, volume);
		}

		return volume ? volume.boxes : [];
	}

	/**
	 * Binds live event listeners to a Measure instance.
	 */
	bindMeasure(measure, options = {}, existingVolume = null) {
		if (!measure || typeof measure.addEventListener !== 'function') return;

		this.unbindMeasure(measure);

		const volume = existingVolume || this.createVolume(measure.points || [], options);

		const updateVolume = () => {
			if (volume && measure.points) {
				volume.setPoints(measure.points);
				this.boxes = volume.boxes;
				if (this.viewer && typeof this.viewer.requestRender === 'function') {
					this.viewer.requestRender();
				}
			}
		};

		measure.addEventListener('marker_moved', updateVolume);
		measure.addEventListener('marker_added', updateVolume);
		measure.addEventListener('marker_removed', updateVolume);
		measure.addEventListener('marker_dropped', updateVolume);

		this.measureBindings.set(measure, {
			volume,
			updateVolume
		});

		// Auto-unbind when measurement is removed from scene
		const scene = this.scene || (this.viewer ? this.viewer.scene : null);
		if (scene && typeof scene.addEventListener === 'function') {
			const onSceneMeasurementRemoved = (e) => {
				if (e.measurement === measure) {
					this.unbindMeasure(measure);
					if (scene.removeEventListener) {
						scene.removeEventListener('measurement_removed', onSceneMeasurementRemoved);
					}
				}
			};
			scene.addEventListener('measurement_removed', onSceneMeasurementRemoved);
		}
	}

	unbindMeasure(measure) {
		if (!measure || !this.measureBindings) return;
		const binding = this.measureBindings.get(measure);
		if (binding) {
			if (typeof measure.removeEventListener === 'function' && binding.updateVolume) {
				measure.removeEventListener('marker_moved', binding.updateVolume);
				measure.removeEventListener('marker_added', binding.updateVolume);
				measure.removeEventListener('marker_removed', binding.updateVolume);
				measure.removeEventListener('marker_dropped', binding.updateVolume);
			}
			this.measureBindings.delete(measure);
		}
	}

	/**
	 * Test tool runner matching VolumeLineTool.prototype.testTool.
	 * Takes a coordinate array, GeoJSON, or Measure, creates the sequence of tetrahedral boxes,
	 * adds to scene, and returns the number of boxes created.
	 *
	 * @param {Array<number>|Object} lineArrayOrMeasureOrGeoJSON
	 * @param {Object|number} [options={}]
	 * @returns {number} count of tetrahedral boxes created
	 */
	testTool(lineArrayOrMeasureOrGeoJSON, options = {}) {
		const boxes = this.build(lineArrayOrMeasureOrGeoJSON, options);
		return boxes ? boxes.length : 0;
	}

	/**
	 * Returns the contiguous 1D array of 32-bit floats making all tetrahedra vertices
	 * across all active boxes in this tool, for populating shader uniforms.
	 *
	 * @param {Object} [options={}]
	 *        - world: boolean (default true)
	 *        - asFloat32: boolean (default true)
	 *        - asArray: boolean
	 * @returns {Float32Array|Array<number>}
	 */
	getCoordinatesArray(options = {}) {
		const targetVolumes = options.volume
			? [options.volume]
			: (options.volumes || this.volumes);

		let totalFloats = 0;
		for (const vol of targetVolumes) {
			totalFloats += vol.boxes.length * 6 * 4 * 3;
		}

		const asFloat32 = (options.asArray === true) ? false : (options.asFloat32 !== undefined ? options.asFloat32 : true);
		const result = asFloat32 ? new Float32Array(totalFloats) : new Array(totalFloats);

		let offset = 0;
		for (const vol of targetVolumes) {
			const coords = vol.getCoordinatesArray(options);
			for (let i = 0; i < coords.length; i++) {
				result[offset++] = coords[i];
			}
		}

		return result;
	}

	getCoordinates(options = {}) {
		return this.getCoordinatesArray(options);
	}

	getCoordinatesAsArray(options = {}) {
		return this.getCoordinatesArray({...options, asFloat32: false, asArray: true});
	}

	getBoxes() {
		return this.boxes;
	}

	getVolume() {
		let total = 0;
		for (const vol of this.volumes) {
			total += vol.getVolume();
		}
		return total;
	}

	containsPoint(point) {
		for (const vol of this.volumes) {
			if (vol.containsPoint(point)) return true;
		}
		return false;
	}
}

export {TetrahedralLineTool as TetLineTool};

