/** auxiliary class to take a geojson definition and draw box volumes around their line segments.
 * Box volumes are added as mixed filters to support custom classification and rendering.
 *
 *
 *
 *
 */

import {Vector3} from "three";
import {BoxVolume} from "./Volume.js";

const TURBO_16 = [
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
const TURBO_16_REVERSED = [...TURBO_16].reverse();


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
				size: 16,
				"map": TURBO_16_REVERSED,
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
				this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[0].r / 255, DEFAULT_LINE_COLOR_RGB[0].g / 255, DEFAULT_LINE_COLOR_RGB[0].b / 255, DEFAULT_LINE_COLOR_RGB[0].a, 4);//adding a color to the volume, however is not adding stuff
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
		const dx = v2.x - v1.x;
		const dy = v2.y - v1.y;
		const length = Math.hypot(dx, dy);
		if (length < 1e-6) return null;
		const thickness = options.distance !== undefined ? options.distance * 2 : 10;
		const width = options.width ?? thickness;
		const height = options.height ?? thickness;
		const box = new BoxVolume(options);
		box.position.set((v1.x + v2.x) * 0.5, (v1.y + v2.y) * 0.5, (v1.z + v2.z) * 0.5);
		box.rotation.set(0, 0, Math.atan2(dy, dx));
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
						this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
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
	 * @returns {Array<BoxVolume>}
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
 * @returns {Array<BoxVolume>}
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
						this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
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
					this.viewer.scene.addStaticFilterColor(DEFAULT_LINE_COLOR_RGB[15].r / 255, DEFAULT_LINE_COLOR_RGB[15].g / 255, DEFAULT_LINE_COLOR_RGB[15].b / 255, DEFAULT_LINE_COLOR_RGB[15].a, 4);//adding a color to the volume, however is not adding stuff
					this.viewer.scene.addStaticStopFilter();//this should stop but it is not
				}
			}
		}

		return this.boxVolumes;
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

export {SelectionLineTool as VolumeLineTool};