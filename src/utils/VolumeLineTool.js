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

// turbo_8 float array [r, g, b, r, g, b, ...] normalized to [0.0, 1.0]
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
		this.options = options;
		this.scene = viewer.scene;
		this.boxVolumes = [];
	}

	//defines a distance to render around and a distance test setting
	selectionLineFactory() {
		let params =
		{
			width: 5,
			height: 5,
			distanceFunction: "alignedBox",//cylinder, ortho distance
			colorScheme: {
				scheme: "discreteColorMap",
				size: 4,
				"map": TURBO_4_REVERSED,
			},

		}
		return params;
	}


	testTool(lineArray) {
		let params = this.selectionLineFactory();
		let boxes = this.fromArray(lineArray, params);

		boxes.forEach(box => {
			if (this.viewer && this.viewer.scene && !this.viewer.scene.volumes.includes(box)) {
				// box.clip = true;//redundant
				this.viewer.scene.addVolume(box);//
				// this.viewer.scene.addStaticFilterColor(0.7, 0.1, 0.1, 4);//adding a color to the volume, however is not adding stuff
				//this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[0].r / 255, DEFAULT_LINE_COLOR_RGB[0].g / 255, DEFAULT_LINE_COLOR_RGB[0].b / 255, DEFAULT_LINE_COLOR_RGB[0].a, 4);//adding a color to the volume, however is not adding stuff
				let gradient = TURBO_4_ARRAY_REVERSED;
				// this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
				this.viewer.scene.addStaticDistanceGradient(1, 50, gradient.length / 3, gradient);
				this.viewer.scene.addStaticStopFilter();//this should stop but it is not
			}
		});
		console.log("added line boxes:", boxes.length);
		return boxes.length;
	}



	//takes a geojson and only reads polyline definitions or line segments.
	//options include rendering options


	createBox(p1, p2, options = {}) {
		const v1 = Array.isArray(p1) ? new Vector3(p1[0], p1[1], p1[2] || 0) : p1;
		const v2 = Array.isArray(p2) ? new Vector3(p2[0], p2[1], p2[2] || 0) : p2;
		const dir = new Vector3().subVectors(v2, v1);
		const length = dir.length();
		if (length < 1e-6) return null;
		dir.normalize();

		const thickness = options.distance !== undefined ? options.distance * 2 : 10;
		const width = options.width ?? thickness;
		const height = options.height ?? thickness;

		// const box = new BoxVolume(options);
		const box = new LineBoxVolume(options);//exaatly the same but with

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
		box.visible = true;
		box.initialized = true;
		box.clip = true;

		//somethign is missing

		box.update();
		return box;
	}
	fromGeoJSON(geoJSON, options = {}) {
		const mergedOptions = {...this.selectionLineFactory(), ...this.options, ...options};
		this.boxVolumes = [];
		const lineCoordsList = extractLineCoordinates(geoJSON);
		for (const coords of lineCoordsList) {
			for (let i = 0;i < coords.length - 1;i++) {
				const box = this.createBox(coords[i], coords[i + 1], mergedOptions);
				if (box) {
					this.boxVolumes.push(box);
					if (this.scene) {
						this.scene.addVolume(box);
						//may add color here
						//this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
						let gradient = TURBO_4_ARRAY_REVERSED;
						// this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
						this.viewer.scene.addStaticDistanceGradient(0, 5, gradient.length / 3, gradient);
						this.viewer.scene.addStaticStopFilter();//this should stop but it is not

					}
				}
			}
		}
		return this.boxVolumes;
	}

	/**
	 * Takes a Measure instance (or measurement object) and creates BoxVolumes along its linestring.
	 *
	 * @param {Object} measure - Measure instance with toXYZArray / toGeoJSON methods or points
	 * @param {Object} [options={}] - Options overriding defaults
	 * @returns {Array<LineBoxVolume>}
	 */
	fromMeasure(measure, options = {}) {
		if (!measure) return [];
		if (typeof measure.toXYZArray === 'function') {
			return this.fromArray(measure.toXYZArray(options), options);
		} else if (typeof measure.toGeoJSON === 'function') {
			return this.fromGeoJSON(measure.toGeoJSON(options), options);
		} else if (Array.isArray(measure.points)) {
			const coords = measure.points.map(p => (p && p.position) ? [p.position.x, p.position.y, p.position.z] : p);
			return this.fromArray(coords, options);
		}
		return [];
	}



	/**
 * Takes a flat array representing a linestring: [x0, y0, z0, x1, y1, z1, ...]
 * and creates BoxVolumes for each segment.
 *
 * @param {Array<number>|Array<Array<number>>} array - Flat array of coords or array of points
 * @param {Object} [options={}] - Options overriding defaults (stride, distance, width, height, etc.)
 * @returns {Array<LineBoxVolume>}
 */
	fromArray(array, options = {}) {
		const mergedOptions = {...this.selectionLineFactory(), ...this.options, ...options};
		this.boxVolumes = [];

		if (!array || array.length === 0) {
			return this.boxVolumes;
		}

		// Gracefully handle array of point tuples: [[x, y, z], [x, y, z], ...]
		if (Array.isArray(array[0])) {
			for (let i = 0;i < array.length - 1;i++) {
				const box = this.createBox(array[i], array[i + 1], mergedOptions);
				if (box) {
					this.boxVolumes.push(box);
					if (this.scene) {
						this.scene.addVolume(box);
						//this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
						let gradient = TURBO_4_ARRAY_REVERSED;
						this.viewer.scene.addStaticDistanceGradient(0, 5, gradient.length / 3, gradient);
						this.viewer.scene.addStaticStopFilter();//this should stop but it is not
					}
				}
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
			if (box) {
				this.boxVolumes.push(box);
				if (this.scene) {
					this.scene.addVolume(box);
					// this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
					let gradient = TURBO_4_ARRAY_REVERSED;
					// this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
					this.viewer.scene.addStaticDistanceGradient(0, 5, gradient.length / 3, gradient);
					this.viewer.scene.addStaticStopFilter();//this should stop but it is not
				}
			}
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
