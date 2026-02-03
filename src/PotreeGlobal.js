/**
 * The final outcome from this is the creation of a Class holding all variables and methods created during the classical
 * Potree initialization as global functions and variables, plus all exports must made available from here.
 */
// export * from "./Actions.js";
// export * from "./AnimationPath.js";
// export * from "./Annotation.js";
// export * as DEFINES from "./defines.js";
import * as DEFINES from "./defines.js";
// export * from "./Enum.js";
// export * from "./EventDispatcher.js";
// export * from "./Features.js";
// export * from "./KeyCodes.js";
// export * from "./LRU.js";
// export * from "./PointCloudEptGeometry.js";
// export * from "./PointCloudOctree.js";
// export * from "./PointCloudOctreeGeometry.js";
// export * from "./PointCloudTree.js";
// export * from "./Points.js";
// export * from "./Potree_update_visibility.js";
// import {updatePointClouds as _updatePointClouds, updateVisibility as _updateVisibility} from "./Potree_update_visibility.js";
import * as POTREE_UPDATE_VISIBILITY from "./Potree_update_visibility.js";
// export * from "./PotreeRenderer.js";
// export * from "./ProfileRequest.js";
// export * from "./TextSprite.js";
// export * from "./utils.js";
// export * from "./Version.js";
// export * from "./viewer/LoadProject.js";
// export * from "./viewer/SaveProject.js";
// export * from "./WorkerPool.js";
// export * from "./XHRFactory.js";

// export * from "./materials/ClassificationScheme.js";
// export * from "./materials/EyeDomeLightingMaterial.js";
// export * from "./materials/Gradients.js";
// export * from "./materials/NormalizationEDLMaterial.js";
// export * from "./materials/NormalizationMaterial.js";
import {PointCloudMaterial} from "./materials/PointCloudMaterial.js";

// export * from "./loader/ept/BinaryLoader.js";
// export * from "./loader/ept/LaszipLoader.js";
// export * from "./loader/ept/ZstandardLoader.js";
// export * from "./loader/EptLoader.js";
// export * from "./loader/GeoPackageLoader.js";
// export * from "./loader/POCLoader.js";
// export * from "./loader/PointAttributes.js";
// export * from "./loader/ShapefileLoader.js";
// export * from "./modules/loader/2.0/OctreeLoader.js";

// export * from "./utils/Box3Helper.js";
// export * from "./utils/ClippingTool.js";
// export * from "./utils/ClipVolume.js";
// export * from "./utils/Compass.js";
// export * from "./utils/GeoTIFF.js";
// export * from "./utils/Measure.js";
// export * from "./utils/MeasuringTool.js";
// export * from "./utils/Message.js";
// export * from "./utils/PointCloudSM.js";
// export * from "./utils/PolygonClipVolume.js";
// export * from "./utils/Profile.js";
// export * from "./utils/ProfileTool.js";
// export * from "./utils/ScreenBoxSelectTool.js";
// export * from "./utils/SpotLightHelper.js";
// export * from "./utils/TransformationTool.js";
// export * from "./utils/Volume.js";
// export * from "./utils/VolumeTool.js";

// export * from "./viewer/HierarchicalSlider.js";
// export * from "./viewer/Scene.js";
// export * from "./viewer/viewer.js";

// export * from "./modules/CameraAnimation/CameraAnimation.js";
// export * from "./modules/Images360/Images360.js";
// export * from "./modules/OrientedImages/OrientedImages.js";

// export * from "./modules/loader/2.0/OctreeLoader.js";

// export * from './tokenUpdater.js';

// export {ClusteredPoint} from './dm_custom_tools/clustering/ClusteredPoint.js';
// export {ClusterTool} from './dm_custom_tools/clustering/ClusterTool.js';
// export {PointCluster} from './dm_custom_tools/clustering/PointCluster.js';



// export {DeviceOrientationControls} from "./navigation/DeviceOrientationControls.js";
// export {EarthControls} from "./navigation/EarthControls.js";
// export {FirstPersonControls} from "./navigation/FirstPersonControls.js";
// export {OrbitControls} from "./navigation/OrbitControls.js";

import {update} from "three/examples/jsm/libs/tween.module.js";
//export {VRControls} from "./navigation/VRControls.js";

import "./extensions/OrthographicCamera.js";
import "./extensions/PerspectiveCamera.js";
import "./extensions/Ray.js";

import {CopcLoader, EptLoader} from "./loader/EptLoader.js";
import {POCLoader} from "./loader/POCLoader.js";
import {LRU} from "./LRU.js";
import {OctreeLoader} from "./modules/loader/2.0/OctreeLoader.js";
import {PointCloudOctree} from "./PointCloudOctree.js";
import {WorkerPool} from "./WorkerPool.js";



export class Potree {

	//for completeness it would be good to add a constructor
	constructor() {
		this.segmentsAttributeKey = 'seg_cluster_id';//used to set the attribute key for the segments

		//  const
		this.workerPool = new WorkerPool();

		//  const
		this.version = {
			major: 1,
			minor: 8,
			suffix: '.1'

		};

		this.lru = new LRU();

		console.log('Potree ' + this.version.major + '.' + this.version.minor + this.version.suffix);

		this.pointBudget = 1 * 1000 * 1000;
		this.framenumber = 0;
		this.numNodesLoading = 0;
		// export let
		this.maxNodesLoading = 4;

		// export const
		this.debug = {};


		// let
		this.scriptPath = "";

		if (document.currentScript && document.currentScript.src) {
			this.scriptPath = new URL(document.currentScript.src + '/..').href;
			if (this.scriptPath.slice(-1) === '/') {
				this.scriptPath = this.scriptPath.slice(0, -1);
			}
		} else if (import.meta) {
			this.scriptPath = new URL(import.meta.url + "/..").href;
			if (this.scriptPath.slice(-1) === '/') {
				this.scriptPath = this.scriptPath.slice(0, -1);
			}
		} else {
			console.error('Potree was unable to find its script path using document.currentScript. Is Potree included with a script tag? Does your browser support this function?');
		}
		this.resourcePath = this.scriptPath + '/resources';

		/////

		this.PointShape=DEFINES.PointShape;
		this.PointSizeType=DEFINES.PointSizeType;
		this.CameraMode=DEFINES.CameraMode;
		this.ClipTask=DEFINES.ClipTask;
		this.ClipMethod=DEFINES.ClipMethod;
		this.ElevationGradientRepeat=DEFINES.ElevationGradientRepeat;
		this.MOUSE=DEFINES.MOUSE;
		this.TreeType=DEFINES.TreeType;
		this.LengthUnits=DEFINES.LengthUnits;


		this.updatePointClouds = POTREE_UPDATE_VISIBILITY.updatePointClouds;
		this.updateVisibility = POTREE_UPDATE_VISIBILITY.updateVisibility;

		this.PointCloudMaterial=PointCloudMaterial;

		// window.Potree=this;
		window.exports=this;//FIX for LRU and other imports
	}

	// const






	// scriptPath: build/potree
	// resourcePath:build/potree/resources
	// export {resourcePath, scriptPath};


	static loadPointCloud(path, name, callback) {
		let loaded = function (e) {
			e.pointcloud.name = name;
			callback(e);
		};

		let promise = new Promise(resolve => {

			// load pointcloud
			if (!path) {
				// TODO: callback? comment? Hello? Bueller? Anyone?
			} else if (path.includes('ept.json')) {
				EptLoader.load(path, function (geometry) {
					if (!geometry) {
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					}
					else {
						let pointcloud = new PointCloudOctree(geometry);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else if (path.includes('.copc.laz')) {
				CopcLoader.load(path, function (geometry) {
					if (!geometry) {
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					}
					else {
						let pointcloud = new PointCloudOctree(geometry);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else if (path.indexOf('cloud.js') > 0) {
				POCLoader.load(path, function (geometry) {
					if (!geometry) {
						//callback({type: 'loading_failed'});
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					} else {
						let pointcloud = new PointCloudOctree(geometry);
						// loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else if (path.indexOf('metadata.json') > 0) {
				// Potree.OctreeLoader.load(path).then(e => {
				OctreeLoader.load(path).then(e => {
					let geometry = e.geometry;

					if (!geometry) {
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					} else {
						let pointcloud = new PointCloudOctree(geometry);

						let aPosition = pointcloud.getAttribute("position");

						let material = pointcloud.material;
						material.elevationRange = [
							aPosition.range[0][2],
							aPosition.range[1][2],
						];

						// loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});

				OctreeLoader.load(path, function (geometry) {
					if (!geometry) {
						//callback({type: 'loading_failed'});
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					} else {
						let pointcloud = new PointCloudOctree(geometry);
						// loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else if (path.indexOf('.vpc') > 0) {
				PointCloudArena4DGeometry.load(path, function (geometry) {
					if (!geometry) {
						//callback({type: 'loading_failed'});
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					} else {
						let pointcloud = new PointCloudArena4D(geometry);
						// loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else {
				//callback({'type': 'loading_failed'});
				console.error(new Error(`failed to load point cloud from URL: ${path}`));
			}
		});

		if (callback) {
			promise.then(pointcloud => {
				loaded(pointcloud);
			});
		} else {
			return promise;
		}
	}

//needs to be updated to point to the file

	// updatePointClouds(scene, camera, renderer) {
	// 	return _updatePointClouds(scene, camera, renderer);
	// }

	// updateVisibility(pointcloud, camera, renderer) {
	// 	return _updateVisibility(pointcloud, camera, renderer);
	// }

}


