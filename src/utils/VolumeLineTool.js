/** auxiliary class to take a geojson definition and draw box volumes around their line segments.
 * Box volumes are added as mixed filters to support custom classification and rendering.
 *
 *
 *
 *
 */

import {Matrix4, Vector3} from "three";
import {BoxVolume} from "./Volume.js";
import {LineBoxVolume} from "./LineVolume.js";

export const TURBO_16 = [
	"#30123b",
	"#4143a7",
	"#4771e9",
	"#3e9bfe",
	"#22c5e2",
	"#1ae4b6",
	"#46f884",
	"#88ff4e",
	"#b9f635",
	"#e1dd37",
	"#faba39",
	"#fd8d27",
	"#f05b12",
	"#d63506",
	"#af1801",
	"#7a0403"
];

// If mapping distance where closer = higher warning (0 = Red, Far = Blue):
export const TURBO_16_REVERSED = [...TURBO_16].reverse();

// turbo_16 float array [r, g, b, r, g, b, ...] normalized to [0.0, 1.0]
export const turbo_16_array = [
	48 / 255, 18 / 255, 59 / 255,   // #30123b
	65 / 255, 67 / 255, 167 / 255,  // #4143a7
	71 / 255, 113 / 255, 233 / 255, // #4771e9
	62 / 255, 155 / 255, 254 / 255, // #3e9bfe
	34 / 255, 197 / 255, 226 / 255, // #22c5e2
	26 / 255, 228 / 255, 182 / 255, // #1ae4b6
	70 / 255, 248 / 255, 132 / 255, // #46f884
	136 / 255, 255 / 255, 78 / 255, // #88ff4e
	185 / 255, 246 / 255, 53 / 255, // #b9f635
	225 / 255, 221 / 255, 55 / 255, // #e1dd37
	251 / 255, 186 / 255, 57 / 255, // #faba39
	253 / 255, 141 / 255, 39 / 255, // #fd8d27
	240 / 255, 91 / 255, 18 / 255,  // #f05b12
	214 / 255, 53 / 255, 6 / 255,   // #d63506
	175 / 255, 24 / 255, 1 / 255,   // #af1801
	122 / 255, 4 / 255, 3 / 255     // #7a0403
];

export const TURBO_16_ARRAY = turbo_16_array;

export const turbo_16_array_reversed = [
	122 / 255, 4 / 255, 3 / 255,    // #7a0403
	175 / 255, 24 / 255, 1 / 255,   // #af1801
	214 / 255, 53 / 255, 6 / 255,   // #d63506
	240 / 255, 91 / 255, 18 / 255,  // #f05b12
	253 / 255, 141 / 255, 39 / 255, // #fd8d27
	251 / 255, 186 / 255, 57 / 255, // #faba39
	225 / 255, 221 / 255, 55 / 255, // #e1dd37
	185 / 255, 246 / 255, 53 / 255, // #b9f635
	136 / 255, 255 / 255, 78 / 255, // #88ff4e
	70 / 255, 248 / 255, 132 / 255, // #46f884
	26 / 255, 228 / 255, 182 / 255, // #1ae4b6
	34 / 255, 197 / 255, 226 / 255, // #22c5e2
	62 / 255, 155 / 255, 254 / 255, // #3e9bfe
	71 / 255, 113 / 255, 233 / 255, // #4771e9
	65 / 255, 67 / 255, 167 / 255,  // #4143a7
	48 / 255, 18 / 255, 59 / 255    // #30123b
];

export const TURBO_16_ARRAY_REVERSED = turbo_16_array_reversed;

export const TURBO_8 = [
	"#30123b",
	"#4771e9",
	"#22c5e2",
	"#46f884",
	"#e1dd37",
	"#fd8d27",
	"#d63506",
	"#7a0403"
];
export const TURBO_8_REVERSED = [...TURBO_8].reverse();

export const REDS_4 = [
	"#7a0403",
	"#d63506",
	"#f05b12",
	"#fd8d27"
];
export const REDS_4_REVERSED = [...REDS_4].reverse();

// reds_4 float array [r, g, b, r, g, b, ...] normalized to [0.0, 1.0]
export const reds_4_array = [
	122 / 255, 4 / 255, 3 / 255,    // #7a0403
	214 / 255, 53 / 255, 6 / 255,   // #d63506
	240 / 255, 91 / 255, 18 / 255,  // #f05b12
	253 / 255, 141 / 255, 39 / 255  // #fd8d27
];
export const REDS_4_ARRAY = reds_4_array;

export const reds_4_array_reversed = [
	253 / 255, 141 / 255, 39 / 255, // #fd8d27
	240 / 255, 91 / 255, 18 / 255,  // #f05b12
	214 / 255, 53 / 255, 6 / 255,   // #d63506
	122 / 255, 4 / 255, 3 / 255     // #7a0403
];
export const REDS_4_ARRAY_REVERSED = reds_4_array_reversed;

/**
 * Normalizes a gradient representation (array of hex strings or flat float RGB array)
 * into a flat float RGB array [r0, g0, b0, r1, g1, b1, ...] normalized to [0.0, 1.0].
 *
 * @param {Array<string>|Array<number>} gradient
 * @returns {Array<number>}
 */
export function normalizeGradientToFloatArray(gradient) {
	if (!gradient) return TURBO_4_ARRAY_REVERSED;
	if (Array.isArray(gradient) && gradient.length > 0) {
		if (typeof gradient[0] === 'number') {
			return gradient;
		}
		if (typeof gradient[0] === 'string') {
			const floats = [];
			for (const hex of gradient) {
				const clean = hex.replace('#', '');
				const num = parseInt(clean, 16);
				if (clean.length === 6) {
					floats.push(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
				} else if (clean.length === 3) {
					const r = (num >> 8) & 15;
					const g = (num >> 4) & 15;
					const b = num & 15;
					floats.push((r * 17) / 255, (g * 17) / 255, (b * 17) / 255);
				}
			}
			return floats;
		}
	}
	return TURBO_4_ARRAY_REVERSED;
}
export const turbo_8_array = [
	48 / 255, 18 / 255, 59 / 255,   // #30123b
	71 / 255, 113 / 255, 233 / 255, // #4771e9
	34 / 255, 197 / 255, 226 / 255, // #22c5e2
	70 / 255, 248 / 255, 132 / 255, // #46f884
	225 / 255, 221 / 255, 55 / 255, // #e1dd37
	253 / 255, 141 / 255, 39 / 255, // #fd8d27
	214 / 255, 53 / 255, 6 / 255,   // #d63506
	122 / 255, 4 / 255, 3 / 255     // #7a0403
];
export const TURBO_8_ARRAY = turbo_8_array;

export const turbo_8_array_reversed = [
	122 / 255, 4 / 255, 3 / 255,    // #7a0403
	214 / 255, 53 / 255, 6 / 255,   // #d63506
	253 / 255, 141 / 255, 39 / 255, // #fd8d27
	225 / 255, 221 / 255, 55 / 255, // #e1dd37
	70 / 255, 248 / 255, 132 / 255, // #46f884
	34 / 255, 197 / 255, 226 / 255, // #22c5e2
	71 / 255, 113 / 255, 233 / 255, // #4771e9
	48 / 255, 18 / 255, 59 / 255    // #30123b
];
export const TURBO_8_ARRAY_REVERSED = turbo_8_array_reversed;

export const TURBO_4 = [
	"#30123b",
	"#1ae4b6",
	"#faba39",
	"#7a0403"
];
export const TURBO_4_REVERSED = [...TURBO_4].reverse();

// turbo_4 float array [r, g, b, r, g, b, ...] normalized to [0.0, 1.0]
export const turbo_4_array = [
	48 / 255, 18 / 255, 59 / 255,   // #30123b
	26 / 255, 228 / 255, 182 / 255, // #1ae4b6
	251 / 255, 186 / 255, 57 / 255, // #faba39
	122 / 255, 4 / 255, 3 / 255     // #7a0403
];
export const TURBO_4_ARRAY = turbo_4_array;

export const turbo_4_array_reversed = [
	122 / 255, 4 / 255, 3 / 255,    // #7a0403
	251 / 255, 186 / 255, 57 / 255, // #faba39
	26 / 255, 228 / 255, 182 / 255, // #1ae4b6
	70 / 255, 248 / 255, 132 / 255,    // #46f884
];
export const TURBO_4_ARRAY_REVERSED = turbo_4_array_reversed;



const DEFAULT_LINE_COLOR_RGB = [
	{r: 48, g: 18, b: 59, a: 1},
	{r: 65, g: 67, b: 167, a: 1},
	{r: 71, g: 113, b: 233, a: 1},
	{r: 62, g: 155, b: 254, a: 1},
	{r: 34, g: 197, b: 226, a: 1},
	{r: 26, g: 228, b: 182, a: 1},
	{r: 70, g: 248, b: 132, a: 1},
	{r: 136, g: 255, b: 78, a: 1},
	{r: 185, g: 246, b: 53, a: 1},
	{r: 225, g: 221, b: 55, a: 1},
	{r: 251, g: 186, b: 57, a: 1},
	{r: 253, g: 141, b: 39, a: 1},
	{r: 240, g: 91, b: 18, a: 1},
	{r: 214, g: 53, b: 6, a: 1},
	{r: 175, g: 24, b: 1, a: 1},
	{r: 122, g: 4, b: 3, a: 1}
];


const DEFAULT_COLOR = {r: 255, g: 255, b: 0, a: 0.1};

export class SelectionLineTool {

	constructor(viewer, options = {}) {
		this.viewer = viewer;
		this.options = typeof options === 'number'
			? {distance: options, radius: options, endDistance: options}
			: {...options};
		this.scene = viewer ? viewer.scene : null;
		this.boxVolumes = [];
		this.measureBindings = new Map();
	}

	get distance() {
		return this.options.distance ?? this.options.radius ?? this.options.endDistance ?? 5;
	}

	set distance(val) {
		const num = typeof val === 'number' ? val : parseFloat(val);
		this.options.distance = num;
		this.options.radius = num;
		this.options.endDistance = num;

		// Dynamically update any bound measurements with the new distance
		if (this.measureBindings) {
			for (const [measure, binding] of this.measureBindings.entries()) {
				binding.options.distance = num;
				binding.options.radius = num;
				binding.options.endDistance = num;
				binding.options.width = num * 2;
				binding.options.height = num * 2;
				this.updateFromMeasure(measure);
			}
		}
	}

	get radius() {
		return this.distance;
	}

	set radius(val) {
		this.distance = val;
	}

	get endDistance() {
		return this.options.endDistance ?? this.distance;
	}

	set endDistance(val) {
		this.options.endDistance = typeof val === 'number' ? val : parseFloat(val);
	}

	// Defines parameters for box dimensions and distance gradient rendering
	selectionLineFactory(customOptions = {}) {
		const options = typeof customOptions === 'number'
			? {distance: customOptions, radius: customOptions, endDistance: customOptions}
			: (customOptions || {});

		// Resolve distance / radius parameter (precedence: customOptions > instance options > default 5)
		const dist = options.distance ?? options.radius ?? options.endDistance ??
			this.options.distance ?? this.options.radius ?? this.options.endDistance ?? 5;

		const thickness = dist * 2;
		const width = options.width ?? this.options.width ?? thickness;
		const height = options.height ?? this.options.height ?? thickness;
		const startDist = options.startDistance ?? this.options.startDistance ?? 0;
		const endDist = options.endDistance ?? options.distance ?? options.radius ??
			this.options.endDistance ?? this.options.distance ?? this.options.radius ?? dist;

		let params = {
			distance: dist,
			radius: dist,
			width: width,
			height: height,
			startDistance: startDist,
			endDistance: endDist,
			distanceFunction: "alignedBox",
			colorScheme: {
				scheme: "discreteColorMap",
				size: 4,
				map: TURBO_4_REVERSED,
			},
			gradient: options.gradient ?? this.options.gradient ?? TURBO_4_ARRAY_REVERSED,
			...options
		};

		params.distance = dist;
		params.radius = dist;
		if (params.width === undefined) params.width = width;
		if (params.height === undefined) params.height = height;
		if (params.endDistance === undefined) params.endDistance = endDist;

		return params;
	}

	testTool(lineArrayOrMeasure, optionsOrDistance = {}) {
		const customOptions = typeof optionsOrDistance === 'number'
			? {distance: optionsOrDistance, radius: optionsOrDistance, endDistance: optionsOrDistance}
			: (optionsOrDistance || {});
		customOptions.gradient = REDS_4;
		const params = this.selectionLineFactory(customOptions);

		// Support passing a Measure instance directly
		if (lineArrayOrMeasure && (Array.isArray(lineArrayOrMeasure.points) || (typeof lineArrayOrMeasure.toXYZArray === 'function' && typeof lineArrayOrMeasure.addEventListener === 'function'))) {
			const boxes = this.fromMeasure(lineArrayOrMeasure, params);
			console.log("added line boxes from live measure:", boxes.length, "with distance/radius:", params.distance, "endDistance:", params.endDistance);
			return boxes.length;
		}

		const boxes = this.fromArray(lineArrayOrMeasure, params);
		const startDist = params.startDistance ?? 0;
		const endDist = params.endDistance ?? params.distance ?? params.radius ?? 5;
		const gradient = params.gradient ?? REDS_4;

		const scene = this.scene || (this.viewer ? this.viewer.scene : null);
		if (scene) {
			boxes.forEach(box => {
				if (!scene.volumes.includes(box)) {
					scene.addVolume(box);
					scene.addStaticDistanceGradient(startDist, endDist, gradient.length / 3, gradient);
					scene.addStaticStopFilter();
				}
			});
		}
		console.log("added line boxes:", boxes.length, "with distance/radius:", params.distance, "endDistance:", endDist);
		return boxes.length;
	}

	/**
	 * Updates the position, orientation (quaternion), and length/cross-section of an existing box
	 * to align with the segment defined by p1 and p2 in world space.
	 *
	 * @param {LineBoxVolume} box - The box volume to update
	 * @param {Vector3|Array<number>|Object} p1 - First point of the segment
	 * @param {Vector3|Array<number>|Object} p2 - Second point of the segment
	 * @param {Object} [options={}] - Options (distance, radius, width, height, etc.)
	 * @returns {LineBoxVolume|null}
	 */
	updateBoxGeometry(box, p1, p2, options = {}) {
		if (!box) return null;
		const v1 = extractPointVec3(p1);
		const v2 = extractPointVec3(p2);
		const dir = new Vector3().subVectors(v2, v1);
		const length = dir.length();
		if (length < 1e-6) {
			box.visible = false;
			return box;
		}
		box.visible = true;
		dir.normalize();

		// distance or radius controls both box cross-section dimensions (thickness = 2 * dist) and rendering distance
		const dist = options.distance ?? options.radius ?? options.endDistance ??
			this.options.distance ?? this.options.radius ?? this.options.endDistance ?? 5;
		const thickness = dist * 2;
		const width = options.width ?? this.options.width ?? thickness;
		const height = options.height ?? this.options.height ?? thickness;

		box.position.set((v1.x + v2.x) * 0.5, (v1.y + v2.y) * 0.5, (v1.z + v2.z) * 0.5);

		// Align box's local X-axis with the 3D direction of the line segment
		let up = new Vector3(0, 0, 1);
		if (Math.abs(dir.dot(up)) > 0.999) {
			up = new Vector3(0, 1, 0);
		}
		const right = new Vector3().crossVectors(up, dir).normalize();
		const normal = new Vector3().crossVectors(dir, right).normalize();

		const rotMat = new Matrix4().makeBasis(dir, right, normal);
		box.quaternion.setFromRotationMatrix(rotMat);

		box.scale.set(length, width, height);
		box.update();
		box.updateMatrixWorld(true);
		return box;
	}

	// Takes two points and creates an aligned LineBoxVolume
	createBox(p1, p2, options = {}) {
		const opts = typeof options === 'number'
			? {distance: options, radius: options, endDistance: options}
			: (options || {});

		const box = new LineBoxVolume(opts);
		box.initialized = true;
		box.clip = true;

		const updated = this.updateBoxGeometry(box, p1, p2, opts);
		if (!updated || updated.visible === false) {
			return null;
		}

		return box;
	}

	fromGeoJSON(geoJSON, options = {}) {
		const customOptions = typeof options === 'number'
			? {distance: options, radius: options, endDistance: options}
			: (options || {});
		const params = this.selectionLineFactory(customOptions);
		const mergedOptions = {...this.options, ...params, ...customOptions};
		this.boxVolumes = [];
		const lineCoordsList = extractLineCoordinates(geoJSON);
		const startDist = mergedOptions.startDistance ?? 0;
		const endDist = mergedOptions.endDistance ?? mergedOptions.distance ?? mergedOptions.radius ?? 5;
		const gradient = mergedOptions.gradient ?? TURBO_4_ARRAY_REVERSED;
		const scene = this.scene || (this.viewer ? this.viewer.scene : null);

		for (const coords of lineCoordsList) {
			for (let i = 0;i < coords.length - 1;i++) {
				const box = this.createBox(coords[i], coords[i + 1], mergedOptions);
				if (box) {
					this.boxVolumes.push(box);
					if (scene) {
						scene.addVolume(box);
						scene.addStaticDistanceGradient(startDist, endDist, gradient.length / 3, gradient);
						scene.addStaticStopFilter();
					}
				}
			}
		}
		return this.boxVolumes;
	}

	/**
	 * Binds event listeners to a Measure instance so that when its nodes (markers) are moved, added, or removed,
	 * the corresponding BoxVolume instances have their position, rotation, and dimensions automatically updated in real-time.
	 *
	 * @param {Measure|Object} measure - Measure instance with event dispatching and points
	 * @param {Object} [options={}] - Options (distance, radius, etc.)
	 * @param {Array<LineBoxVolume>} [existingBoxes=null] - Pre-created boxes to associate with this measure
	 */
	bindMeasure(measure, options = {}, existingBoxes = null) {
		if (!measure || typeof measure.addEventListener !== 'function') return;

		this.measureBindings = this.measureBindings || new Map();
		this.unbindMeasure(measure);

		const boxes = existingBoxes || [];
		const customOptions = typeof options === 'number'
			? {distance: options, radius: options, endDistance: options}
			: (options || {});
		const params = this.selectionLineFactory(customOptions);
		const mergedOptions = {...this.options, ...params, ...customOptions};

		const updateBoxes = () => {
			this.updateFromMeasure(measure);
		};

		measure.addEventListener('marker_moved', updateBoxes);
		measure.addEventListener('marker_added', updateBoxes);
		measure.addEventListener('marker_removed', updateBoxes);
		measure.addEventListener('marker_dropped', updateBoxes);

		this.measureBindings.set(measure, {
			boxes,
			options: mergedOptions,
			updateBoxes
		});

		// Auto-unbind if measurement is removed from scene
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

	/**
	 * Unbinds live listeners from a Measure instance.
	 *
	 * @param {Measure|Object} measure
	 */
	unbindMeasure(measure) {
		if (!measure || !this.measureBindings) return;
		const binding = this.measureBindings.get(measure);
		if (binding) {
			if (typeof measure.removeEventListener === 'function' && binding.updateBoxes) {
				measure.removeEventListener('marker_moved', binding.updateBoxes);
				measure.removeEventListener('marker_added', binding.updateBoxes);
				measure.removeEventListener('marker_removed', binding.updateBoxes);
				measure.removeEventListener('marker_dropped', binding.updateBoxes);
			}
			this.measureBindings.delete(measure);
		}
	}

	/**
	 * Synchronizes the position, rotation, and dimensions of all boxes associated with a bound Measure instance.
	 * Called automatically when a marker/node is moved, but can also be invoked manually.
	 *
	 * @param {Measure|Object} measure
	 * @returns {Array<LineBoxVolume>}
	 */
	updateFromMeasure(measure) {
		if (!measure || !this.measureBindings) return [];
		const binding = this.measureBindings.get(measure);
		if (!binding) return [];

		const {boxes, options} = binding;
		const points = measure.points || [];
		const numSegments = Math.max(0, points.length - 1);

		// Update existing boxes for each segment
		for (let i = 0;i < Math.min(boxes.length, numSegments);i++) {
			this.updateBoxGeometry(boxes[i], points[i], points[i + 1], options);
		}

		const scene = this.scene || (this.viewer ? this.viewer.scene : null);
		const startDist = options.startDistance ?? 0;
		const endDist = options.endDistance ?? options.distance ?? options.radius ?? 5;
		const gradient = options.gradient ?? TURBO_4_ARRAY_REVERSED;

		// If new segments were added (e.g. marker_added)
		while (boxes.length < numSegments) {
			const i = boxes.length;
			const box = this.createBox(points[i], points[i + 1], options);
			if (box) {
				boxes.push(box);
				this.boxVolumes.push(box);
				if (scene) {
					scene.addVolume(box);
					scene.addStaticDistanceGradient(startDist, endDist, gradient.length / 3, gradient);
					scene.addStaticStopFilter();
				}
			} else {
				break;
			}
		}

		// If segments were removed (e.g. marker_removed)
		while (boxes.length > numSegments) {
			const box = boxes.pop();
			if (box) {
				box.visible = false;
				if (scene) {
					scene.removeVolume(box);
				}
				const idx = this.boxVolumes.indexOf(box);
				if (idx !== -1) this.boxVolumes.splice(idx, 1);
			}
		}

		if (this.viewer && typeof this.viewer.requestRender === 'function') {
			this.viewer.requestRender();
		}

		return boxes;
	}

	/**
	 * Takes a Measure instance (or measurement object) and creates BoxVolumes along its linestring.
	 * Automatically binds live update listeners so when measurement nodes are moved, the boxes update.
	 *
	 * @param {Object} measure - Measure instance with toXYZArray / toGeoJSON methods or points
	 * @param {Object|number} [options={}] - Options overriding defaults (or distance/radius number)
	 * @returns {Array<LineBoxVolume>}
	 */
	fromMeasure(measure, options = {}) {
		if (!measure) return [];

		const customOptions = typeof options === 'number'
			? {distance: options, radius: options, endDistance: options}
			: (options || {});
		const params = this.selectionLineFactory(customOptions);
		const mergedOptions = {...this.options, ...params, ...customOptions};

		// Clean up any prior binding on this measure
		this.unbindMeasure(measure);

		const points = measure.points || [];
		if (points.length < 2 && typeof measure.toXYZArray === 'function') {
			return this.fromArray(measure.toXYZArray(mergedOptions), mergedOptions);
		}

		const boxes = [];
		const scene = this.scene || (this.viewer ? this.viewer.scene : null);
		const startDist = mergedOptions.startDistance ?? 0;
		const endDist = mergedOptions.endDistance ?? mergedOptions.distance ?? mergedOptions.radius ?? 5;
		const gradient = mergedOptions.gradient ?? TURBO_4_ARRAY_REVERSED;

		for (let i = 0;i < points.length - 1;i++) {
			const box = this.createBox(points[i], points[i + 1], mergedOptions);
			if (box) {
				boxes.push(box);
				this.boxVolumes.push(box);
				if (scene) {
					scene.addVolume(box);
					scene.addStaticDistanceGradient(startDist, endDist, gradient.length / 3, gradient);
					scene.addStaticStopFilter();
				}
			}
		}

		// Automatically bind live updates when measurement nodes are moved, added, or removed
		if (typeof measure.addEventListener === 'function' && customOptions.track !== false) {
			this.bindMeasure(measure, mergedOptions, boxes);
		}

		return boxes;
	}

	/**
	 * Takes a flat array representing a linestring: [x0, y0, z0, x1, y1, z1, ...]
	 * or array of point tuples [[x, y, z], ...] and creates BoxVolumes for each segment.
	 *
	 * @param {Array<number>|Array<Array<number>>} array - Flat array of coords or array of points
	 * @param {Object|number} [options={}] - Options overriding defaults (stride, distance, radius, etc.)
	 * @returns {Array<LineBoxVolume>}
	 */
	fromArray(array, options = {}) {
		const customOptions = typeof options === 'number'
			? {distance: options, radius: options, endDistance: options}
			: (options || {});
		const params = this.selectionLineFactory(customOptions);
		const mergedOptions = {...this.options, ...params, ...customOptions};
		this.boxVolumes = [];

		if (!array || array.length === 0) {
			return this.boxVolumes;
		}

		const startDist = mergedOptions.startDistance ?? 0;
		const endDist = mergedOptions.endDistance ?? mergedOptions.distance ?? mergedOptions.radius ?? 5;
		const gradient = mergedOptions.gradient ?? TURBO_4_ARRAY_REVERSED;
		const scene = this.scene || (this.viewer ? this.viewer.scene : null);

		const registerBox = (box) => {
			if (!box) return;
			this.boxVolumes.push(box);
			if (scene) {
				scene.addVolume(box);
				scene.addStaticDistanceGradient(startDist, endDist, gradient.length / 3, gradient);
				scene.addStaticStopFilter();
			}
		};

		// Gracefully handle array of point tuples: [[x, y, z], [x, y, z], ...]
		if (Array.isArray(array[0])) {
			for (let i = 0;i < array.length - 1;i++) {
				const box = this.createBox(array[i], array[i + 1], mergedOptions);
				registerBox(box);
			}
			return this.boxVolumes;
		}

		// Handle flat array: [x0, y0, z0, x1, y1, z1, ...]
		const stride = mergedOptions.stride || 3;
		if (array.length < stride * 2) {
			return this.boxVolumes;
		}

		for (let i = 0;i <= array.length - stride * 2;i += stride) {
			const p1 = [array[i], array[i + 1], stride >= 3 ? array[i + 2] : 0];
			const p2 = [array[i + stride], array[i + stride + 1], stride >= 3 ? array[i + stride + 2] : 0];

			const box = this.createBox(p1, p2, mergedOptions);
			registerBox(box);
		}

		return this.boxVolumes;
	}

	/**
	 * Helper to extract line start and end coordinates in world space from a BoxVolume or its matrix.
	 */
	static extractBoxLineCoords(boxOrMatrix, isInverse = true) {
		return extractBoxLineCoords(boxOrMatrix, isInverse);
	}

	extractBoxLineCoords(boxOrMatrix, isInverse = true) {
		return extractBoxLineCoords(boxOrMatrix, isInverse);
	}

}

function extractPointVec3(pt) {
	if (!pt) return new Vector3(0, 0, 0);
	if (pt.position && typeof pt.position.x === 'number') {
		return pt.position;
	}
	if (typeof pt.x === 'number') {
		return pt;
	}
	if (Array.isArray(pt) && pt.length >= 3) {
		return new Vector3(pt[0], pt[1], pt[2]);
	}
	return new Vector3(0, 0, 0);
}

function extractLineCoordinates(geometry) {
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
 * Extracts the extreme points of a box that align with the line in world coordinates.
 * In the box's local space (created by VolumeLineTool), the line aligns with the X axis from -0.5 to 0.5.
 *
 * @param {LineBoxVolume|Matrix4|Object} boxOrMatrix - BoxVolume instance, {inverse: Matrix4}, or Matrix4 (inverse matrix by default, or world matrix if isInverse = false)
 * @param {boolean} [isInverse=true] - Set to true if the matrix provided is the inverse matrix (clipBoxInvMat), false if already matrixWorld.
 * @returns {[Vector3, Vector3] & {start: Vector3, end: Vector3, lineStart: Vector3, lineEnd: Vector3}}
 */
export function extractBoxLineCoords(boxOrMatrix, isInverse = true) {
	if (!boxOrMatrix) return null;
	let boxWorldMat;
	if (boxOrMatrix.isMatrix4) {
		boxWorldMat = isInverse ? boxOrMatrix.clone().invert() : boxOrMatrix.clone();
	} else if (boxOrMatrix.matrixWorld) {
		boxOrMatrix.updateMatrixWorld(true);
		boxWorldMat = boxOrMatrix.matrixWorld;
	} else if (boxOrMatrix.inverse && boxOrMatrix.inverse.isMatrix4) {
		boxWorldMat = boxOrMatrix.inverse.clone().invert();
	} else {
		return null;
	}
	const start = new Vector3(-0.5, 0, 0).applyMatrix4(boxWorldMat);
	const end = new Vector3(0.5, 0, 0).applyMatrix4(boxWorldMat);
	const res = [start, end];
	res.start = start;
	res.end = end;
	res.lineStart = start;
	res.lineEnd = end;
	return res;
}

export {SelectionLineTool as VolumeLineTool};
