import {Vector3, SphereGeometry, MeshBasicMaterial, Mesh} from 'three';
import {Potree, PScene, Viewer, Profile, Measure} from '../dist/potree_module.js';
import {extractZAtXY, extractZBatchAtXY, extractZHistogramAtXY, extractZHistogramBatchAtXY, extractZCircleAtXY, clearPointCloudToolCaches} from '../src/utils/pointcloud_tools.js';
import {VolumeLineTool} from '../src/utils/VolumeLineTool.js';
import {SphereVolume} from '../src/utils/Volume.js';
import {TetrahedralBoxTool, TetTool} from '../src/utils/TetrahedralBoxTool.js';
import {TetrahedralBoxVolume, TetrahedralVolume} from '../src/utils/TetrahedralBoxVolume.js';
import {TetrahedralLineTool, TetLineTool} from '../src/utils/TetrahedralLineTool.js';
import {TetrahedralLineVolume} from '../src/utils/TetrahedralLineVolume.js';

let initialized = false;
function init() {
	if (initialized) return;
	initialized = true;
	// Add stylesheets dynamically
	const stylesheets = `
		<link rel="stylesheet" type="text/css" href="./potree/potree.css">
		<link rel="stylesheet" type="text/css" href="./libs/jquery-ui/jquery-ui.min.css">
		<link rel="stylesheet" type="text/css" href="./libs/openlayers3/ol.css">
		<link rel="stylesheet" type="text/css" href="./libs/spectrum/spectrum.css">
	`;
	document.head.insertAdjacentHTML('beforeend', stylesheets);

	// Load libraries
	const libs = `
		<script src="./libs/spectrum/spectrum.js"></script>
		<script src="./libs/jquery-ui/jquery-ui.min.js"></script>
		<script src="./libs/d3/d3.js"></script>
		<script src="./libs/proj4/proj4.js"></script>
		<script src="./libs/openlayers3/ol.js"></script>
		<script src="./libs/i18next/i18next.js"></script>
		<script src="./libs/plasio/js/laslaz.js"></script>
	`;
	document.body.insertAdjacentHTML('beforeend', libs);

	// Initialize the Potree viewer in the render area
	window.Potree = new Potree();
	console.log("Loading Potree Feature Test Viewer");
	const viewer = new Viewer(document.getElementById("potree_render_area"));
	window.viewer = viewer;

	// Basic viewer setup
	viewer.setEDLEnabled(true);
	viewer.setFOV(60);
	viewer.setPointBudget(1_000_000);
	viewer.loadSettingsFromURL();
	viewer.setBackground("gradient");

	let sceneSG = new PScene();
	viewer.setScene(sceneSG);

	// Disable standard sidebar to let our floating panel breathe
	// and register custom resize handler
	document.body.onresize = function () {
		const width = window.innerWidth;
		const height = window.innerHeight;
		viewer.renderer.setSize(width, height);
		viewer.scene.getActiveCamera().aspect = width / height;
		viewer.scene.getActiveCamera().updateProjectionMatrix();
	};
	document.body.onresize();

	// Test Suite States & Assertions List
	const tests = {
		'load-veg': {
			id: 'load-veg',
			name: "Load 'Vegetation'",
			status: 'status-load-veg',
			checkbox: 'check-load-veg',
			passed: false,
			run: async () => {
				log("Loading 'Vegetation' pointcloud (metadata.json format)...");
				try {
					let octreePath = "../pointclouds/vegetation_zone_ROW_75_20_1_64930dd1.las_converted/metadata.json";
					Potree.loadPointCloud(octreePath, "Vegetation", function (e) {
						sceneSG.addPointCloud(e.pointcloud);
						viewer.zoomTo(e.pointcloud);
						log("SUCCESS: 'Vegetation' pointcloud added to scene.", "success");
						setPassState('load-veg', true);
						setTimeout(() => fillBBoxExtremes(false), 300);
					});
				} catch (err) {
					log("ERROR loading Vegetation: " + err.message, "error");
					setPassState('load-veg', false);
				}
			}
		},
		'unload-pc': {
			id: 'unload-pc',
			name: 'Unload All Pointclouds',
			status: 'status-unload-pc',
			checkbox: 'check-unload-pc',
			passed: false,
			run: async () => {
				log("Unloading all pointclouds from the scene...");
				try {
					while (sceneSG.pointclouds.length > 0) {
						let pc = sceneSG.pointclouds[0];
						sceneSG.removePointCloud(pc);
					}
					log("SUCCESS: All pointclouds cleared. Scene is empty.", "success");
					setPassState('unload-pc', true);
				} catch (err) {
					log("ERROR clearing scene: " + err.message, "error");
					setPassState('unload-pc', false);
				}
			}
		},
		'camera-flyto': {
			id: 'camera-flyto',
			name: 'Recenter / Fly To Bounds',
			status: 'status-camera-flyto',
			checkbox: 'check-camera-flyto',
			passed: false,
			run: async () => {
				log("Recentering camera to loaded pointclouds bounds...");
				if (sceneSG.pointclouds.length === 0) {
					log("WARNING: Cannot fly-to. No point clouds loaded in scene. Load a pointcloud first!", "error");
					setPassState('camera-flyto', false);
					return;
				}
				try {
					for (let pc of sceneSG.pointclouds) {
						viewer.zoomTo(pc);
					}
					log("SUCCESS: Recenter/Fly Completed.", "success");
					setPassState('camera-flyto', true);
				} catch (err) {
					log("ERROR executing ZoomTo: " + err.message, "error");
					setPassState('camera-flyto', false);
				}
			}
		},
		'toggle-projection': {
			id: 'toggle-projection',
			name: 'Toggle Projection Mode',
			status: 'status-toggle-projection',
			checkbox: 'check-toggle-projection',
			passed: false,
			run: async () => {
				try {
					let currentMode = viewer.scene.cameraMode;
					let targetMode = (currentMode === 1) ? 0 : 1; // CamMode: PERSPECTIVE: 1, ORTHOGRAPHIC: 0
					viewer.setCameraMode(targetMode);
					let modeName = targetMode === 1 ? "PERSPECTIVE" : "ORTHOGRAPHIC";
					log(`SUCCESS: Transitioned camera to ${modeName} projection.`, "success");
					setPassState('toggle-projection', true);
				} catch (err) {
					log("ERROR changing camera projection mode: " + err.message, "error");
					setPassState('toggle-projection', false);
				}
			}
		},
		'cycle-fov': {
			id: 'cycle-fov',
			name: 'Cycle FOV Setting',
			status: 'status-cycle-fov',
			checkbox: 'check-cycle-fov',
			passed: false,
			run: async () => {
				try {
					let degrees = [30, 60, 90];
					let current = viewer.fov;
					let index = degrees.indexOf(Math.round(current));
					let nextIndex = (index + 1) % degrees.length;
					let targetFOV = degrees[nextIndex];
					viewer.setFOV(targetFOV);
					log(`SUCCESS: Set camera Field of View to ${targetFOV}°.`, "success");
					setPassState('cycle-fov', true);
				} catch (err) {
					log("ERROR cycling FOV: " + err.message, "error");
					setPassState('cycle-fov', false);
				}
			}
		},
		'distance-measure': {
			id: 'distance-measure',
			name: 'Start Distance Tool',
			status: 'status-distance-measure',
			checkbox: 'check-distance-measure',
			passed: false,
			run: async () => {
				log("LINEAR MEASUREMENT: Click multiple points on loaded cloud to place line. Right-click to stop.");
				showOnScreenInstructions("Linear Distance Tool", "Click points on the point cloud to measure distances. Right-click to finalize, click 'Clear Screen' above to clear.");
				try {
					const measurement = viewer.measuringTool.startInsertion({
						showDistances: true,
						showArea: false,
						closed: false,
						name: 'Distance'
					});
					log("Distance measuring tool active. Deposit vertices on the map.", "info");
					setPassState('distance-measure', true);
				} catch (err) {
					log("ERROR starting Distance tool: " + err.message, "error");
					setPassState('distance-measure', false);
				}
			}
		},
		'point-measure': {
			id: 'point-measure',
			name: 'Start Point Tool',
			status: 'status-point-measure',
			checkbox: 'check-point-measure',
			passed: false,
			run: async () => {
				log("POINT MEASUREMENT: Click on loaded cloud to place a point.");
				showOnScreenInstructions("Point Measurement  Tool", "Click point cloud to extract coordinates. ");
				try {
					const measurement = viewer.measuringTool.startInsertion({
						showDistances: false,
						showArea: false,
						closed: false,
						name: 'Point',
						maxMarkers: 1
					});
					log("Point measuring tool active. Deposit vertices on the map.", "info");
					setPassState('point-measure', true);
				} catch (err) {
					log("ERROR starting Point tool: " + err.message, "error");
					setPassState('point-measure', false);
				}
			}
		}
		,
		'height-measure': {
			id: 'height-measure',
			name: 'Start Height Tool',
			status: 'status-height-measure',
			checkbox: 'check-height-measure',
			passed: false,
			run: async () => {
				log("HEIGHT CALCULATOR: Select two points on the cloud to compute delta vertical height.");
				showOnScreenInstructions("Vertical Height Tool", "Deposit 2 points on the cloud to calculate their height delta.");
				try {
					const measurement = viewer.measuringTool.startInsertion({
						showDistances: false,
						showHeight: true,
						showArea: false,
						closed: false,
						maxMarkers: 2,
						name: 'Height'
					});
					log("Height measure tool instantiated. Select two points.", "info");
					setPassState('height-measure', true);
				} catch (err) {
					log("ERROR starting Height tool: " + err.message, "error");
					setPassState('height-measure', false);
				}
			}
		},
		'cross-profile': {
			id: 'cross-profile',
			name: 'Cross-Cloud Profile & 2D Window',
			status: 'status-cross-profile',
			checkbox: 'check-cross-profile',
			passed: false,
			run: async () => {
				log("Creating a profile across the loaded point cloud bounding box...");
				if (sceneSG.pointclouds.length === 0) {
					log("WARNING: No point clouds loaded in scene. Load a pointcloud first!", "error");
					setPassState('cross-profile', false);
					return;
				}
				try {
					const bbox = viewer.getBoundingBox();
					if (!bbox || !isFinite(bbox.min.x) || !isFinite(bbox.max.x)) {
						throw new Error("Could not determine point cloud bounding box.");
					}

					const center = bbox.getCenter(new Vector3());
					const size = bbox.getSize(new Vector3());

					let start, end;
					if (size.x >= size.y) {
						start = new Vector3(bbox.min.x, center.y, center.z);
						end = new Vector3(bbox.max.x, center.y, center.z);
					} else {
						start = new Vector3(center.x, bbox.min.y, center.z);
						end = new Vector3(center.x, bbox.max.y, center.z);
					}

					const profile = new Profile();
					profile.name = "BBox Cross Profile";
					const widthInput = document.getElementById('input-cross-profile-width');
					const customWidth = widthInput ? parseFloat(widthInput.value) : NaN;
					const profileWidth = (Number.isFinite(customWidth) && customWidth > 0)
						? customWidth
						: parseFloat(Math.max(1, Math.min(size.x, size.y) * 0.05).toFixed(2));
					if (widthInput && (!Number.isFinite(customWidth) || customWidth <= 0)) {
						widthInput.value = String(profileWidth);
					}
					profile.setWidth(profileWidth);
					profile.addMarker(start);
					profile.addMarker(end);
					sceneSG.addProfile(profile);
					window.__activeCrossProfile = profile;

					if (!viewer._profileWindow || !viewer._profileWindowController) {
						await viewer.loadProfileGUI();
					}
					viewer.profileWindow.show();
					viewer.profileWindowController.setProfile(profile);

					log(`SUCCESS: Profile inserted across point cloud bbox from (${start.x.toFixed(2)}, ${start.y.toFixed(2)}, ${start.z.toFixed(2)}) to (${end.x.toFixed(2)}, ${end.y.toFixed(2)}, ${end.z.toFixed(2)}), width=${profileWidth.toFixed(2)}m. ProfileWindow opened.`, "success");
					setPassState('cross-profile', true);
				} catch (err) {
					log("ERROR creating cross-cloud profile: " + err.message, "error");
					setPassState('cross-profile', false);
				}
			}
		},
		'extract-z-xy': {
			id: 'extract-z-xy',
			name: 'Extract Z at XY (Profile Fake Octree)',
			status: 'status-extract-z-xy',
			checkbox: 'check-extract-z-xy',
			passed: false,
			run: async () => {
				if (sceneSG.pointclouds.length === 0) {
					log("WARNING: No point clouds loaded in scene. Load a pointcloud first!", "error");
					setPassState('extract-z-xy', false);
					return;
				}
				try {
					const xInput = document.getElementById('input-extract-z-x');
					const yInput = document.getElementById('input-extract-z-y');
					const widthInput = document.getElementById('input-extract-z-width');
					const showWinCheck = document.getElementById('check-extract-z-show-window');
					const outputBox = document.getElementById('output-extract-z-xy');

					let x = xInput ? parseFloat(xInput.value) : NaN;
					let y = yInput ? parseFloat(yInput.value) : NaN;

					if (!Number.isFinite(x) || !Number.isFinite(y)) {
						const defaultXY = getPointCloudRepresentativeXY();
						if (!defaultXY) {
							throw new Error("Could not determine point cloud XY bounds.");
						}
						x = defaultXY.x;
						y = defaultXY.y;
						if (xInput) xInput.value = String(x);
						if (yInput) yInput.value = String(y);
					}

					const width = widthInput ? (parseFloat(widthInput.value) || 1.5) : 1.5;
					const binSizeInput = document.getElementById('input-extract-z-binsize');
					const binSize = binSizeInput ? (parseFloat(binSizeInput.value) || 0.25) : 0.25;
					const modeSelect = document.getElementById('select-extract-z-mode');
					const selectedMode = modeSelect ? modeSelect.value : 'all';
					const showInProfileWindow = Boolean(showWinCheck && showWinCheck.checked);

					log(`Loading all intersecting octree nodes around XY=(${x.toFixed(3)}, ${y.toFixed(3)}), width=${width}m, binSize=${binSize}m into ProfileFakeOctree...`, "info");

					const histResult = await extractZHistogramAtXY(viewer, x, y, {
						width,
						binSize,
						mode: selectedMode,
						showInProfileWindow,
					});

					if (histResult.numPoints === 0 || histResult.statistics.min === null) {
						if (outputBox) {
							outputBox.style.display = 'block';
							outputBox.innerHTML = `No points found around XY=(${x.toFixed(3)}, ${y.toFixed(3)}) within width=${histResult.width.toFixed(2)}m.`;
						}
						const histContainer = document.getElementById('histogram-extract-z-container');
						if (histContainer) histContainer.style.display = 'none';
						log(`WARNING: 0 points found around XY=(${x.toFixed(3)}, ${y.toFixed(3)}) (width=${histResult.width.toFixed(2)}m). Try another XY inside the point cloud or increase Width.`, "error");
						setPassState('extract-z-xy', false);
						return;
					}

					const stats = histResult.statistics;
					const normalizedResult = {
						...histResult,
						zMin: stats.min,
						zMax: stats.max,
						zAvg: stats.avg,
						zMean: stats.mean,
						zMedian: stats.median,
						zIdw: stats.idw,
						zClosest: stats.closest,
						closestPoint: stats.closestPoint || { distanceXY: 0 },
					};

					window.__lastExtractZResult = normalizedResult;
					renderExtractedZConfirmation(normalizedResult, selectedMode);
					renderZHistogramGraph(histResult);

					log(`SUCCESS: Extracted Z & ${histResult.histogram.numBins}-bin (${binSize}m) histogram at XY=(${x.toFixed(3)}, ${y.toFixed(3)}): Min=${stats.min.toFixed(4)}, Max=${stats.max.toFixed(4)}, Avg=${stats.avg.toFixed(4)}, Median=${stats.median.toFixed(4)}, PeakBin=[${histResult.histogram.peakBin.zStart.toFixed(2)}..${histResult.histogram.peakBin.zEnd.toFixed(2)}m (${histResult.histogram.peakBin.count} pts)] from ${histResult.numPoints} points (max octree level=${histResult.highestLevelServed}).`, "success");
					setPassState('extract-z-xy', true);
				} catch (err) {
					log("ERROR extracting Z at XY: " + err.message, "error");
					setPassState('extract-z-xy', false);
				}
			}
		},
		'clear-measures': {
			id: 'clear-measures',
			name: 'Clear Calculations',
			status: 'status-clear-measures',
			checkbox: 'check-clear-measures',
			passed: false,
			run: async () => {
				log("Clearing all drawings, paths, volumes and measurements...");
				try {
					clearExtractedZMarkers();
					sceneSG.removeAllMeasurements();
					while (sceneSG.profiles && sceneSG.profiles.length > 0) {
						sceneSG.removeProfile(sceneSG.profiles[0]);
					}
					clearPointCloudToolCaches(viewer);
					window.__lastExtractZResult = null;
					window.__lastExtractZCircleResult = null;
					window.__lastExtractZBatchResult = null;
					if (viewer._profileWindow) {
						viewer._profileWindow.hide();
					}
					activeMeasureForLineTool = null;
					hideOnScreenInstructions();
					log("SUCCESS: Drawing canvas cleared successfully.", "success");
					setPassState('clear-measures', true);
				} catch (err) {
					log("ERROR clearing drawings: " + err.message, "error");
					setPassState('clear-measures', false);
				}
			}
		},
		'point-pick': {
			id: 'point-pick',
			name: 'Raycast Point Pick',
			status: 'status-point-pick',
			checkbox: 'check-point-pick',
			passed: false,
			run: async () => {
				log("SPATIAL PICK: Hold CTRL and click on the point cloud to register a raycast pick.");
				showOnScreenInstructions("Raycast Point Pick", "Click anywhere on a loaded point cloud. Live coordinates of your click will be written directly into the console/dashboard.");
				try {
					// Registering custom click handler on renderer.domElement
					const domElement = viewer.renderer.domElement;
					const clickListener = (event) => {
						if (event.button !== 0) return;
						const intersection = viewer.inputHandler.getMousePointCloudIntersection();
						const pt = intersection && (intersection.location || (intersection.point && intersection.point.position));
						if (pt) {
							const px = pt.x !== undefined ? pt.x : pt[0];
							const py = pt.y !== undefined ? pt.y : pt[1];
							const pz = pt.z !== undefined ? pt.z : pt[2];
							log(`Raycast Intersection Found: X: ${px.toFixed(3)}, Y: ${py.toFixed(3)}, Z: ${pz.toFixed(3)}`, "success");
							setPassState('point-pick', true);
						}
					};

					domElement.addEventListener('mouseup', clickListener);
					log("Raycast selection active. Try clicking the point cloud.", "info");

					// Automatically remove after 30 seconds to clean up, or manual flag
					setTimeout(() => {
						domElement.removeEventListener('mouseup', clickListener);
						log("Picking listener detached (30s elapsed).", "info");
					}, 30000);

					setPassState('point-pick', true);
				} catch (err) {
					log("ERROR starting Point Pick listener: " + err.message, "error");
					setPassState('point-pick', false);
				}
			}
		},
		'box-clip': {
			id: 'box-clip',
			name: 'Place 3D Clip Box',
			status: 'status-box-clip',
			checkbox: 'check-box-clip',
			passed: false,
			run: async () => {
				log("CLIPPING BOX: Inserting a box volume tool into the map view...");
				try {
					let volume = viewer.volumeTool.startInsertion({clip: true});
					log("SUCCESS: Clipping volume bounding box inserted. Use transformation tool handles.", "success");
					setPassState('box-clip', true);
				} catch (err) {
					log("ERROR inserting clip box: " + err.message, "error");
					setPassState('box-clip', false);
				}
			}
		},
		'polygon-clip': {
			id: 'polygon-clip',
			name: 'Polygon Clip Boundary',
			status: 'status-polygon-clip',
			checkbox: 'check-polygon-clip',
			passed: false,
			run: async () => {
				log("POLYGON CLIP: Click to deposit vertices. Right-click to close and apply polygon boundaries.");
				showOnScreenInstructions("Polygon Clipping Tool", "Click multiple times across the viewport. Right-click to stop and execute clipping.");
				try {
					let item = viewer.clippingTool.startInsertion({type: "polygon"});
					log("Polygon Draw Tool launched.", "info");
					setPassState('polygon-clip', true);
				} catch (err) {
					log("ERROR drawing clip polygon: " + err.message, "error");
					setPassState('polygon-clip', false);
				}
			}
		},
		'change-cliptask': {
			id: 'change-cliptask',
			name: 'Cycle Filter Type',
			status: 'status-change-cliptask',
			checkbox: 'check-change-cliptask',
			passed: false,
			run: async () => {
				try {
					const tasks = [0, 1, 2, 3]; // NONE, HIGHLIGHT, SHOW_INSIDE, SHOW_OUTSIDE
					const names = ["NONE", "HIGHLIGHT", "SHOW_INSIDE", "SHOW_OUTSIDE"];
					let current = viewer.clipTask;
					let index = tasks.indexOf(current);
					let nextIndex = (index + 1) % tasks.length;
					let targetTask = tasks[nextIndex];

					viewer.setClipTask(targetTask);
					log(`SUCCESS: Dynamic clip option updated to: ${names[targetTask]}`, "success");
					setPassState('change-cliptask', true);
				} catch (err) {
					log("ERROR modifying clip tasks: " + err.message, "error");
					setPassState('change-cliptask', false);
				}
			}
		},
		'volume-line': {
			id: 'volume-line',
			name: 'Volume Line Tool (testTool)',
			status: 'status-volume-line',
			checkbox: 'check-volume-line',
			passed: false,
			run: async () => {
				log("VOLUME LINE TOOL: Executing testTool with linestring coordinate array or GeoJSON...");
				try {
					const input = document.getElementById('input-volume-line');
					let raw = input ? input.value.trim() : '';

					if (!raw) {
						fillBBoxExtremes(true);
						raw = input ? input.value.trim() : '';
					}

					if (!raw) {
						log("ERROR: Coordinate array is empty and no pointcloud is loaded to infer bbox extremes.", "error");
						setPassState('volume-line', false);
						return;
					}

					const distInput = document.getElementById('input-volume-line-dist');
					const distVal = distInput ? parseFloat(distInput.value) : 5;
					const distanceParam = (isNaN(distVal) || distVal <= 0) ? 5 : distVal;
					const options = {distance: distanceParam, radius: distanceParam, endDistance: distanceParam};

					if (!viewer.volumeLineTool) {
						viewer.volumeLineTool = new VolumeLineTool(viewer, options);
					} else {
						viewer.volumeLineTool.distance = distanceParam;
					}

					// Check if a live Measurement was selected
					if (activeMeasureForLineTool && activeMeasureForLineTool.points && activeMeasureForLineTool.points.length >= 2) {
						const boxes = viewer.volumeLineTool.fromMeasure(activeMeasureForLineTool, options);
						log(`SUCCESS: VolumeLineTool.fromMeasure created ${boxes.length} aligned BoxVolume(s) live-bound to measurement nodes (distance = ${distanceParam}). Drag measurement nodes in 3D to see box position, rotation, and dimensions update in real-time.`, "success");
						setPassState('volume-line', true);
						return;
					}

					let parsed = null;
					try {
						if (raw.startsWith('{') || raw.startsWith('[')) {
							parsed = JSON.parse(raw);
						}
					} catch (e) {}

					// Check if GeoJSON
					if (parsed && typeof parsed === 'object' && (parsed.type === 'Feature' || parsed.type === 'FeatureCollection' || parsed.type === 'LineString')) {
						const boxes = viewer.volumeLineTool.fromGeoJSON(parsed, options);
						log(`SUCCESS: VolumeLineTool.fromGeoJSON created ${boxes.length} aligned BoxVolume(s) with distance/radius = ${distanceParam} (box: ${distanceParam * 2}x${distanceParam * 2}, endDist: ${distanceParam}).`, "success");
						setPassState('volume-line', true);
						return;
					}

					let lineArray = parsed;
					if (!lineArray || !Array.isArray(lineArray)) {
						lineArray = raw.replace(/[\[\]]/g, '').split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
					}

					if (!lineArray || lineArray.length < 6) {
						log("ERROR: Invalid linestring array. Provide at least 2 points (6 numbers, e.g. [x0, y0, z0, x1, y1, z1]) or GeoJSON.", "error");
						setPassState('volume-line', false);
						return;
					}

					const count = viewer.volumeLineTool.testTool(lineArray, options);
					log(`SUCCESS: VolumeLineTool.testTool created ${count} aligned BoxVolume(s) with distance/radius = ${distanceParam} (box: ${distanceParam * 2}x${distanceParam * 2}, endDist: ${distanceParam}).`, "success");
					setPassState('volume-line', true);
				} catch (err) {
					log("ERROR running VolumeLineTool: " + err.message, "error");
					console.log("ERROR running VolumeLineTool: " + err.message, "error");
					setPassState('volume-line', false);
				}
			}
		},
		'sphere-volume': {
			id: 'sphere-volume',
			name: 'Sphere Volume Tool',
			status: 'status-sphere-volume',
			checkbox: 'check-sphere-volume',
			passed: false,
			run: async () => {
				log("SPHERE VOLUME TOOL: Executing sphere volume test...");
				try {
					const r = getSphereRadius();
					const measurements = sceneSG.measurements || [];

					// 1. If line measurement exists, create spheres per line vertex
					const lineMeasures = measurements.filter(m => m.points && m.points.length >= 2);
					if (lineMeasures.length > 0) {
						const line = lineMeasures[lineMeasures.length - 1];
						line.points.forEach((p, idx) => {
							const sphere = new SphereVolume();
							sphere.name = `Sphere_LineVertex_${idx + 1}`;
							sphere.position.copy(p.position);
							sphere.scale.set(r, r, r);
							sphere.clip = true;
							sphere.initialized = true;
							sceneSG.addVolume(sphere);
						});
						// viewer.requestRender();
						log(`SUCCESS: Created ${line.points.length} SphereVolume(s) along line vertices with radius = ${r}.`, "success");
						setPassState('sphere-volume', true);
						return;
					}

					// 2. If point measurement exists, create sphere at point
					const pointMeasure = measurements.find(m => m.points && m.points.length === 1);
					if (pointMeasure && pointMeasure.points.length > 0) {
						const pos = pointMeasure.points[0].position;
						const sphere = new SphereVolume();
						sphere.name = `Sphere_Point`;
						sphere.position.copy(pos);
						sphere.scale.set(r, r, r);
						sphere.clip = true;
						sphere.initialized = true;

						//TODO make a proper tool for this and add proper mixed
						sceneSG.addVolume(sphere);
						sceneSG.addStaticStopFilter();//required to stop further testing

						viewer.requestRender();
						log(`SUCCESS: Created SphereVolume at point measurement [${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}] with radius = ${r}.`, "success");
						setPassState('sphere-volume', true);
						return;
					}

					// 3. If pointcloud loaded, place sphere at pointcloud center
					const extremes = getPointCloudBBoxExtremes();
					if (extremes) {
						const cx = (extremes[0] + extremes[3]) / 2;
						const cy = (extremes[1] + extremes[4]) / 2;
						const cz = (extremes[2] + extremes[5]) / 2;
						const sphere = new SphereVolume();
						sphere.name = `Sphere_Center`;
						sphere.position.set(cx, cy, cz);
						sphere.scale.set(r, r, r);
						sphere.clip = true;
						sphere.initialized = true;
						sceneSG.addVolume(sphere);
						sceneSG.addStaticStopFilter();//required to stop further testing

						// viewer.requestRender();
						log(`SUCCESS: Created SphereVolume at pointcloud center [${cx.toFixed(2)}, ${cy.toFixed(2)}, ${cz.toFixed(2)}] with radius = ${r}.`, "success");
						setPassState('sphere-volume', true);
						return;
					}

					// 4. Fallback: interactive hand placement
					log("No pointcloud or measurements found. Starting interactive placement: click and drag on map.", "info");
					showOnScreenInstructions("Sphere Volume Placement", "Click and drag across point cloud to place sphere volume.");
					const volume = viewer.volumeTool.startInsertion({type: SphereVolume, clip: true, name: 'Sphere_Hand'});
					if (volume) {
						volume.scale.set(r, r, r);
						volume.addEventListener('drop', () => {
							volume.scale.set(r, r, r);
							log(`SUCCESS: Sphere volume placed by hand with radius = ${r}.`, "success");
							setPassState('sphere-volume', true);
							hideOnScreenInstructions();
						}, {once: true});
					}
					setPassState('sphere-volume', true);
				} catch (err) {
					log("ERROR running Sphere Volume tool: " + err.message, "error");
					setPassState('sphere-volume', false);
				}
			}
		},
		'tet-volume': {
			id: 'tet-volume',
			name: 'Tetrahedral Box Volume Tool (TetrahedralBoxTool)',
			status: 'status-tet-volume',
			checkbox: 'check-tet-volume',
			passed: false,
			run: async () => {
				log("TETRAHEDRAL BOX VOLUME TOOL: Executing TetrahedralBoxTool test...");
				try {
					if (!viewer.tetrahedralBoxTool && !viewer.tetTool) {
						viewer.tetrahedralBoxTool = new TetrahedralBoxTool(viewer); viewer.tetTool = viewer.tetrahedralBoxTool;
					}
					const scaleInput = document.getElementById('input-tet-scale');
					const s = scaleInput ? parseFloat(scaleInput.value) || 5 : 5;
					const coordInput = document.getElementById('input-tet-coords');
					const rawCoord = coordInput ? coordInput.value.trim() : '';
					const showTet = currentTetShowTet;

					// 1. If coordinate input provided, use it
					if (rawCoord) {
						if (rawCoord.startsWith('{')) {
							const vol = (viewer.tetrahedralBoxTool || viewer.tetTool).insertFromGeoJSON(rawCoord, {scale: s, showTet});
							log(`SUCCESS: TetTool.insertFromGeoJSON created volume at [${vol.position.x.toFixed(2)}, ${vol.position.y.toFixed(2)}, ${vol.position.z.toFixed(2)}].`, "success");
							setPassState('tet-volume', true);
							return;
						}
						let coords = null;
						try {coords = JSON.parse(rawCoord);} catch (e) {
							coords = rawCoord.replace(/[\[\]]/g, '').split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
						}
						if (coords && coords.length >= 3) {
							const vol = (viewer.tetrahedralBoxTool || viewer.tetTool).insertFromXYZ(coords, {scale: s, showTet});
							log(`SUCCESS: TetTool.insertFromXYZ created volume at [${vol.position.x.toFixed(2)}, ${vol.position.y.toFixed(2)}, ${vol.position.z.toFixed(2)}].`, "success");
							setPassState('tet-volume', true);
							return;
						}
					}

					// 2. If point measurement exists, pick its coordinate
					const measurements = sceneSG.measurements || [];
					const pointMeasure = measurements.find(m => m.points && m.points.length === 1)
						|| measurements.find(m => m.points && m.points.length >= 1);
					if (pointMeasure && pointMeasure.points.length > 0) {
						const pos = pointMeasure.points[0].position;
						const vol = (viewer.tetrahedralBoxTool || viewer.tetTool).insertFromXYZ([pos.x, pos.y, pos.z], {scale: s, showTet, name: 'Tet_PointMeasure'});
						log(`SUCCESS: Created TetrahedralVolume from point measurement [${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}] with scale = ${s}.`, "success");
						setPassState('tet-volume', true);
						return;
					}

					// 3. If pointcloud loaded, place at center
					const extremes = getPointCloudBBoxExtremes();
					if (extremes) {
						const cx = (extremes[0] + extremes[3]) / 2;
						const cy = (extremes[1] + extremes[4]) / 2;
						const cz = (extremes[2] + extremes[5]) / 2;
						const vol = (viewer.tetrahedralBoxTool || viewer.tetTool).insertFromXYZ([cx, cy, cz], {scale: s, showTet, name: 'Tet_Center'});
						log(`SUCCESS: Created TetrahedralVolume at pointcloud center [${cx.toFixed(2)}, ${cy.toFixed(2)}, ${cz.toFixed(2)}] with scale = ${s}.`, "success");
						setPassState('tet-volume', true);
						return;
					}

					// 4. Fallback: interactive placement
					showOnScreenInstructions("Tetrahedron Volume Placement", "Click and drag across point cloud to place a 6-tetrahedra volume.");
					const vol = (viewer.tetrahedralBoxTool || viewer.tetTool).startInsertion({scale: s, showTet, name: 'Tet_Hand'});
					if (vol) {
						vol.addEventListener('drop', () => {
							log(`SUCCESS: TetrahedralVolume placed interactively at [${vol.position.x.toFixed(2)}, ${vol.position.y.toFixed(2)}, ${vol.position.z.toFixed(2)}].`, "success");
							setPassState('tet-volume', true);
							hideOnScreenInstructions();
						}, {once: true});
					}
					setPassState('tet-volume', true);
				} catch (err) {
					log("ERROR running Tetrahedron Volume tool: " + err.message, "error");
					setPassState('tet-volume', false);
				}
			}
		},
		'tet-line': {
			id: 'tet-line',
			name: 'Tetrahedral Line Tool (TetrahedralLineTool)',
			status: 'status-tet-line',
			checkbox: 'check-tet-line',
			passed: false,
			run: async () => {
				log("TETRAHEDRAL LINE TOOL: Executing TetrahedralLineTool test with coordinate array, GeoJSON, or last measurement...");
				try {
					const input = document.getElementById('input-tet-line');
					let raw = input ? input.value.trim() : '';

					if (!raw) {
						fillTetLineBBoxExtremes(true);
						raw = input ? input.value.trim() : '';
					}

					if (!raw) {
						log("ERROR: Coordinate array is empty. Extract last measurement, fill BBox, or enter coordinates.", "error");
						setPassState('tet-line', false);
						return;
					}

					const distInput = document.getElementById('input-tet-line-dist');
					const distVal = distInput ? parseFloat(distInput.value) : 5;
					const distanceParam = (isNaN(distVal) || distVal <= 0) ? 5 : distVal;
					const showTet = currentTetLineShowTet;
					const options = {
						distance: distanceParam,
						radius: distanceParam,
						showTet: showTet,
						showCenterLine: true,
						clip: true
					};

					// 1. If active measure from last measurement extraction
					if (activeMeasureForTetLine && activeMeasureForTetLine.points && activeMeasureForTetLine.points.length >= 2) {
						const tool = new TetrahedralLineTool(viewer, options);
						viewer.tetrahedralLineTool = tool;
						const boxes = tool.fromMeasure(activeMeasureForTetLine, options);
						const uniformCoords = tool.getCoordinatesArray();
						log(`SUCCESS: TetrahedralLineTool.fromMeasure created ${boxes.length} topologically connected tetrahedral boxes (shared vertices at joints) live-bound to measurement nodes (distance = ${distanceParam}, showTet = ${showTet}). Total uniform float coordinates = ${uniformCoords.length} (${boxes.length * 6} tetrahedra).`, "success");
						setPassState('tet-line', true);
						return;
					}

					let parsed = null;
					try {
						if (raw.startsWith('{') || raw.startsWith('[')) {
							parsed = JSON.parse(raw);
						}
					} catch (e) {}

					// 2. GeoJSON input (direct constructor or fromGeoJSON)
					if (parsed && typeof parsed === 'object' && (parsed.type === 'Feature' || parsed.type === 'FeatureCollection' || parsed.type === 'LineString' || parsed.type === 'MultiLineString')) {
						const tool = new TetrahedralLineTool(parsed, {viewer, ...options});
						viewer.tetrahedralLineTool = tool;
						const boxes = tool.boxes;
						const uniformCoords = tool.getCoordinatesArray();
						log(`SUCCESS: new TetrahedralLineTool(geoJSON) created ${boxes.length} topologically connected tetrahedral boxes with distance = ${distanceParam}. Uniform coordinates array: ${uniformCoords.length} floats (${boxes.length * 6} tetrahedra).`, "success");
						setPassState('tet-line', true);
						return;
					}

					// 3. Coordinate array input (direct constructor with coordinate array)
					let lineArray = parsed;
					if (!lineArray || !Array.isArray(lineArray)) {
						lineArray = raw.replace(/[\[\]]/g, '').split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
					}

					if (!lineArray || lineArray.length < 6) {
						log("ERROR: Invalid linestring array. Provide at least 2 points (6 numbers, e.g. [x0, y0, z0, x1, y1, z1]) or GeoJSON.", "error");
						setPassState('tet-line', false);
						return;
					}

					// Test constructor with coordinate array directly!
					const tool = new TetrahedralLineTool(lineArray, {viewer, ...options});
					viewer.tetrahedralLineTool = tool;
					const boxes = tool.boxes;
					const uniformCoords = tool.getCoordinatesArray();
					log(`SUCCESS: new TetrahedralLineTool(coordsArray) constructed ${boxes.length} tetrahedral boxes centered on line segments with shared joint vertices. getCoordinatesArray() returned ${uniformCoords.length} floats for uniform population.`, "success");
					setPassState('tet-line', true);
				} catch (err) {
					log("ERROR running TetrahedralLineTool: " + err.message, "error");
					console.error("ERROR running TetrahedralLineTool:", err);
					setPassState('tet-line', false);
				}
			}
		}
	};

	// -------------------------------------------------------------
	// EVENT REGISTRATION & BINDING
	// -------------------------------------------------------------

	// Minimise/Maximise Feature Test Panel
	const dashboard = document.getElementById('test-dashboard');
	const header = document.getElementById('dashboard-header');
	const minBtn = document.getElementById('min-toggle-btn');
	const dbContent = document.getElementById('dashboard-content');

	header.addEventListener('click', (e) => {
		if (e.target.closest('#min-toggle-btn')) return; // let the btn handle itself
		toggleMinimize();
	});

	minBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleMinimize();
	});

	function toggleMinimize() {
		if (dashboard.classList.contains('minimized')) {
			dashboard.classList.remove('minimized');
			minBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M5 11h14v2H5z"/></svg>`;
		} else {
			dashboard.classList.add('minimized');
			minBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v2H4zm0 14h16v2H4z"/></svg>`;
		}
	}

	// Trigger runner methods
	Object.keys(tests).forEach(key => {
		const btn = document.getElementById(`btn-${key}`);
		const check = document.getElementById(`check-${key}`);

		if (btn) {
			btn.addEventListener('click', () => {
				setProcessingState(key);
				tests[key].run();
			});
		}

		if (check) {
			check.addEventListener('change', (e) => {
				tests[key].passed = e.target.checked;
				updateUIPendingStates(key);
				recalculateProgress();
			});
		}
	});

	// Reset All Tests
	document.getElementById('btn-reset-all').addEventListener('click', () => {
		log("Resetting all test states and logs.", "info");
		Object.keys(tests).forEach(key => {
			tests[key].passed = false;
			const check = document.getElementById(`check-${key}`);
			if (check) check.checked = false;
			const status = document.getElementById(tests[key].status);
			if (status) {
				status.className = "status-badge status-idle";
				status.textContent = "Untested";
			}
		});
		recalculateProgress();
	});

	// Clear assertions list logs
	document.getElementById('btn-clear-logs').addEventListener('click', () => {
		const logs = document.getElementById('log-messages');
		logs.innerHTML = `
			<div class="log-entry info">
				<span class="timestamp">${getFormattedTime()}</span>
				<span class="message">Log cleared. Proceed with tests.</span>
			</div>
		`;
	});

	// BBox helper functions for VolumeLineTool test
	function getPointCloudBBoxExtremes() {
		if (!sceneSG || sceneSG.pointclouds.length === 0) {
			return null;
		}
		const bbox = viewer.getBoundingBox();
		if (bbox && isFinite(bbox.min.x) && isFinite(bbox.max.x)) {
			return [
				parseFloat(bbox.min.x.toFixed(3)),
				parseFloat(bbox.min.y.toFixed(3)),
				parseFloat(bbox.min.z.toFixed(3)),
				parseFloat(bbox.max.x.toFixed(3)),
				parseFloat(bbox.max.y.toFixed(3)),
				parseFloat(bbox.max.z.toFixed(3))
			];
		}
		const pc = sceneSG.pointclouds[0];
		if (pc && pc.boundingBox) {
			const b = pc.boundingBox;
			return [
				parseFloat(b.min.x.toFixed(3)),
				parseFloat(b.min.y.toFixed(3)),
				parseFloat(b.min.z.toFixed(3)),
				parseFloat(b.max.x.toFixed(3)),
				parseFloat(b.max.y.toFixed(3)),
				parseFloat(b.max.z.toFixed(3))
			];
		}
		return null;
	}

	function fillBBoxExtremes(force = false) {
		const input = document.getElementById('input-volume-line');
		if (!input) return;
		if (!force && input.value.trim() !== '') return;

		const extremes = getPointCloudBBoxExtremes();
		if (extremes) {
			input.value = JSON.stringify(extremes);
			log(`Pointcloud bbox extremes loaded into text box: [${extremes.join(', ')}]`, 'info');
		} else if (force) {
			log("No pointcloud loaded yet to calculate bbox extremes. Load a pointcloud first.", "error");
		}
	}

	let activeMeasureForLineTool = null;

	const lineInputEl = document.getElementById('input-volume-line');
	if (lineInputEl) {
		lineInputEl.addEventListener('input', () => {
			activeMeasureForLineTool = null;
		});
	}

	const btnBBox = document.getElementById('btn-volume-line-bbox');
	if (btnBBox) {
		btnBBox.addEventListener('click', (e) => {
			e.stopPropagation();
			activeMeasureForLineTool = null;
			fillBBoxExtremes(true);
		});
	}

	const btnMeasure = document.getElementById('btn-volume-line-measure');
	if (btnMeasure) {
		btnMeasure.addEventListener('click', (e) => {
			e.stopPropagation();
			const measurements = sceneSG.measurements || [];
			// Only take the latest measurement with at least 2 points to feed the VolumeLine
			const lineMeasures = measurements.filter(m => m.points && m.points.length >= 2);
			const lineMeasure = lineMeasures.length > 0 ? lineMeasures[lineMeasures.length - 1] : null;
			if (lineMeasure) {
				activeMeasureForLineTool = lineMeasure;
				const xyz = typeof lineMeasure.toXYZArray === 'function'
					? lineMeasure.toXYZArray()
					: lineMeasure.points.map(p => [p.position.x, p.position.y, p.position.z]).flat();
				const input = document.getElementById('input-volume-line');
				if (input) input.value = JSON.stringify(xyz);
				log(`SUCCESS: Loaded latest live ${lineMeasure.points.length}-point line measurement. When tested, boxes will be live-bound to this measurement so moving its nodes updates box position and rotation in real-time.`, 'success');
			} else {
				log("No line measurement with >= 2 points found in scene. Draw a line with Linear Distance Tool first.", "error");
			}
		});
	}

	// -------------------------------------------------------------
	// SPHERE VOLUME BUTTON HANDLERS
	// -------------------------------------------------------------

	/** Read the radius input, fall back to 5 */
	function getSphereRadius() {
		const el = document.getElementById('input-sphere-radius');
		if (!el) return 5;
		const v = parseFloat(el.value);
		return (isNaN(v) || v <= 0) ? 5 : v;
	}

	/** Preset radius cycle values */
	const SPHERE_RADIUS_PRESETS = [1, 2, 5, 10, 20, 50];

	// 📋 Extract Array — populate coord text from latest measurement
	const btnSphereExtract = document.getElementById('btn-sphere-extract-measure');
	if (btnSphereExtract) {
		btnSphereExtract.addEventListener('click', (e) => {
			e.stopPropagation();
			const measurements = sceneSG.measurements || [];
			if (measurements.length === 0) {
				log("No measurements in scene. Draw a point or line measurement first.", "error");
				return;
			}
			// Prefer the latest measurement regardless of type
			const m = measurements[measurements.length - 1];
			const arr = m.points.map(p => [
				parseFloat(p.position.x.toFixed(4)),
				parseFloat(p.position.y.toFixed(4)),
				parseFloat(p.position.z.toFixed(4))
			]);
			const input = document.getElementById('input-sphere-coords');
			if (input) input.value = JSON.stringify(arr.length === 1 ? arr[0] : arr);
			log(`Extracted ${m.points.length} point(s) from measurement into sphere coords field.`, 'info');
		});
	}

	// 🔘 Radius cycle button
	const btnSphereRadius = document.getElementById('btn-sphere-radius');
	if (btnSphereRadius) {
		btnSphereRadius.addEventListener('click', (e) => {
			e.stopPropagation();
			const radiusInput = document.getElementById('input-sphere-radius');
			const label = document.getElementById('label-sphere-radius');
			if (!radiusInput) return;

			const cur = parseFloat(radiusInput.value) || 5;
			// Find next preset above current, or wrap around
			let next = SPHERE_RADIUS_PRESETS.find(v => v > cur);
			if (next === undefined) next = SPHERE_RADIUS_PRESETS[0];
			radiusInput.value = next;
			if (label) label.textContent = next;

			// Apply new radius to all existing sphere volumes in scene
			const vols = sceneSG.volumes || [];
			let updated = 0;
			vols.forEach(v => {
				if (v && v.constructor && v.constructor.name === 'SphereVolume') {
					v.scale.set(next, next, next);
					updated++;
				}
			});
			// viewer.requestRender();
			log(`Sphere radius set to ${next}. Updated ${updated} existing sphere volume(s) in scene.`, 'info');
		});
	}

	// 🖐️ By Hand — interactive placement via volumeTool
	const btnSphereByHand = document.getElementById('btn-sphere-by-hand');
	if (btnSphereByHand) {
		btnSphereByHand.addEventListener('click', (e) => {
			e.stopPropagation();
			try {
				const r = getSphereRadius();
				showOnScreenInstructions("Sphere Volume Placement", "Click and drag on the point cloud to place a sphere volume by hand.");
				const volume = viewer.volumeTool.startInsertion({type: SphereVolume, clip: true, name: 'Sphere_Hand'});
				if (volume) {
					volume.scale.set(r, r, r);
					volume.addEventListener('drop', () => {
						volume.scale.set(r, r, r);
						log(`SUCCESS: Sphere placed by hand at [${volume.position.x.toFixed(2)}, ${volume.position.y.toFixed(2)}, ${volume.position.z.toFixed(2)}] with radius = ${r}.`, "success");
						setPassState('sphere-volume', true);
						hideOnScreenInstructions();
					}, {once: true});
				}
				log("Interactive sphere placement started — click and drag on the point cloud.", 'info');
			} catch (err) {
				log("ERROR starting interactive sphere placement: " + err.message, "error");
			}
		});
	}

	// 📍 From Point Measure — sphere centered on the latest single-point measurement
	const btnSphereFromPoint = document.getElementById('btn-sphere-from-point');
	if (btnSphereFromPoint) {
		btnSphereFromPoint.addEventListener('click', (e) => {
			e.stopPropagation();
			try {
				const measurements = sceneSG.measurements || [];
				// Prefer single-point measurements, but accept any measurement's first point
				const pointMeasure = measurements.find(m => m.points && m.points.length === 1)
					|| measurements.find(m => m.points && m.points.length >= 1);
				if (!pointMeasure || pointMeasure.points.length === 0) {
					log("No point measurement found. Use the Point Picker tool first.", "error");
					return;
				}
				const r = getSphereRadius();
				const pos = pointMeasure.points[0].position;
				const sphere = new SphereVolume();
				sphere.name = 'Sphere_Point';
				sphere.position.copy(pos);
				sphere.scale.set(r, r, r);
				sphere.clip = true;//so it can interact with pointcloud
				sphere.initialized = true;
				sceneSG.addVolume(sphere);
				sceneSG.addStaticStopFilter();//required to stop further testing

				// viewer.requestRender();
				log(`SUCCESS: Created SphereVolume at point [${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}] with radius = ${r}.`, "success");
				setPassState('sphere-volume', true);
			} catch (err) {
				log("ERROR creating sphere from point: " + err.message, "error");
				console.log("ERROR creating sphere from point: " + err.message, "error");
			}
		});
	}

	// 📏 From Line Vertices — one sphere per vertex of the latest line measurement
	const btnSphereFromLine = document.getElementById('btn-sphere-from-line');
	if (btnSphereFromLine) {
		btnSphereFromLine.addEventListener('click', (e) => {
			e.stopPropagation();
			try {
				const measurements = sceneSG.measurements || [];
				const lineMeasures = measurements.filter(m => m.points && m.points.length >= 2);
				if (lineMeasures.length === 0) {
					log("No line measurement (>= 2 points) found. Draw a line with the Linear Distance tool first.", "error");
					return;
				}
				const r = getSphereRadius();
				const line = lineMeasures[lineMeasures.length - 1];
				line.points.forEach((p, idx) => {
					const sphere = new SphereVolume();
					sphere.name = `Sphere_LineVertex_${idx + 1}`;
					sphere.position.copy(p.position);
					sphere.scale.set(r, r, r);
					sphere.clip = true;
					sphere.initialized = true;
					sceneSG.addVolume(sphere);
				});
				// viewer.requestRender();
				log(`SUCCESS: Created ${line.points.length} SphereVolume(s) along line vertices with radius = ${r}.`, "success");
				setPassState('sphere-volume', true);
			} catch (err) {
				log("ERROR creating spheres from line: " + err.message, "error");
			}
		});
	}

	// -------------------------------------------------------------
	// TETRAHEDRON VOLUME TOOL (TETTOOL) BUTTON HANDLERS
	// -------------------------------------------------------------
	let currentTetShowTet = true;

	const btnTetExtract = document.getElementById('btn-tet-extract-measure');
	if (btnTetExtract) {
		btnTetExtract.addEventListener('click', (e) => {
			e.stopPropagation();
			const measurements = sceneSG.measurements || [];
			if (measurements.length === 0) {
				log("No measurements in scene. Draw a point or line measurement first.", "error");
				return;
			}
			const m = measurements[measurements.length - 1];
			if (m.points && m.points.length > 0) {
				const p = m.points[0].position;
				const coordStr = `[${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]`;
				const input = document.getElementById('input-tet-coords');
				if (input) input.value = coordStr;
				log(`SUCCESS: Extracted measurement coordinate ${coordStr} into TetTool input.`, "success");
			}
		});
	}

	const btnTetToggleShowTet = document.getElementById('btn-tet-toggle-showtet');
	if (btnTetToggleShowTet) {
		btnTetToggleShowTet.addEventListener('click', (e) => {
			e.stopPropagation();
			currentTetShowTet = !currentTetShowTet;
			btnTetToggleShowTet.textContent = currentTetShowTet ? '🔺 showTet: ON' : '⬜ showTet: OFF';
			// Apply to any existing TetrahedralVolumes
			if (sceneSG && sceneSG.volumes) {
				sceneSG.volumes.forEach(v => {
					if (v instanceof TetrahedralBoxVolume) {
						v.showTet = currentTetShowTet;
					}
				});
			}
			log(`TetTool showTet internal lines set to: ${currentTetShowTet ? 'ON' : 'OFF'}`, 'info');
		});
	}

	function clearExistingTetVolumes() {
		if (sceneSG && sceneSG.volumes) {
			const toRemove = sceneSG.volumes.filter(v => v instanceof TetrahedralBoxVolume || v.isTetrahedralVolume);
			for (const v of toRemove) {
				sceneSG.removeVolume(v);
			}
		}
	}

	const btnTetByHand = document.getElementById('btn-tet-by-hand');
	if (btnTetByHand) {
		btnTetByHand.addEventListener('click', (e) => {
			e.stopPropagation();
			try {
				if (!viewer.tetrahedralBoxTool && !viewer.tetTool) {
					viewer.tetrahedralBoxTool = new TetrahedralBoxTool(viewer); viewer.tetTool = viewer.tetrahedralBoxTool;
				}
				const scaleInput = document.getElementById('input-tet-scale');
				const s = scaleInput ? parseFloat(scaleInput.value) || 5 : 5;
				showOnScreenInstructions("Tetrahedron Volume Placement", "Click and drag on the point cloud to insert a 6-tetrahedra volume.");
				const volume = (viewer.tetrahedralBoxTool || viewer.tetTool).startInsertion({scale: s, showTet: currentTetShowTet, name: 'Tet_Screen'});
				if (volume) {
					volume.addEventListener('drop', () => {
						log(`SUCCESS: Tetrahedron placed interactively at [${volume.position.x.toFixed(2)}, ${volume.position.y.toFixed(2)}, ${volume.position.z.toFixed(2)}] with scale = ${s}.`, "success");
						setPassState('tet-volume', true);
						hideOnScreenInstructions();
					}, {once: true});
				}
				log("Interactive tetrahedron placement started - click and drag on the point cloud.", 'info');
			} catch (err) {
				log("ERROR starting interactive tetrahedron placement: " + err.message, "error");
			}
		});
	}

	const btnTetFromPoint = document.getElementById('btn-tet-from-point');
	if (btnTetFromPoint) {
		btnTetFromPoint.addEventListener('click', (e) => {
			e.stopPropagation();
			try {
				if (!viewer.tetrahedralBoxTool && !viewer.tetTool) {
					viewer.tetrahedralBoxTool = new TetrahedralBoxTool(viewer); viewer.tetTool = viewer.tetrahedralBoxTool;
				}
				const measurements = sceneSG.measurements || [];
				const pointMeasure = measurements.find(m => m.points && m.points.length === 1)
					|| measurements.find(m => m.points && m.points.length >= 1);
				if (!pointMeasure || pointMeasure.points.length === 0) {
					log("No point measurement found. Use the Point Measurement Tool (Item 7) or Point Picker (Item 10) first.", "error");
					return;
				}
				const scaleInput = document.getElementById('input-tet-scale');
				const s = scaleInput ? parseFloat(scaleInput.value) || 5 : 5;
				const pos = pointMeasure.points[0].position;
				const volume = (viewer.tetrahedralBoxTool || viewer.tetTool).insertFromXYZ([pos.x, pos.y, pos.z], {
					scale: s,
					showTet: currentTetShowTet,
					name: 'Tet_From_Point'
				});
				log(`SUCCESS: Created TetrahedralVolume at point measurement [${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}] with scale = ${s}.`, "success");
				setPassState('tet-volume', true);
			} catch (err) {
				log("ERROR creating tetrahedron from point: " + err.message, "error");
			}
		});
	}

	const btnTetVolume = document.getElementById('btn-tet-volume');
	if (btnTetVolume) {
		btnTetVolume.addEventListener('click', () => {
			setProcessingState('tet-volume');
			tests['tet-volume'].run();
		});
	}
	// -------------------------------------------------------------
	// TETRAHEDRAL LINE TOOL BUTTON HANDLERS
	// -------------------------------------------------------------
	let currentTetLineShowTet = true;
	let activeMeasureForTetLine = null;

	function fillTetLineBBoxExtremes(force = false) {
		const input = document.getElementById('input-tet-line');
		if (!input) return;
		if (!force && input.value.trim() !== '') return;

		const extremes = getPointCloudBBoxExtremes();
		if (extremes) {
			input.value = JSON.stringify(extremes);
			log(`Pointcloud bbox extremes loaded into TetrahedralLineTool input: [${extremes.join(', ')}]`, 'info');
		} else if (force) {
			log("No pointcloud loaded yet to calculate bbox extremes. Load a pointcloud or draw a measurement first.", "error");
		}
	}

	const tetLineInputEl = document.getElementById('input-tet-line');
	if (tetLineInputEl) {
		tetLineInputEl.addEventListener('input', () => {
			activeMeasureForTetLine = null;
		});
	}

	const btnTetLineBBox = document.getElementById('btn-tet-line-bbox');
	if (btnTetLineBBox) {
		btnTetLineBBox.addEventListener('click', (e) => {
			e.stopPropagation();
			activeMeasureForTetLine = null;
			fillTetLineBBoxExtremes(true);
		});
	}

	const btnTetLineMeasure = document.getElementById('btn-tet-line-measure');
	if (btnTetLineMeasure) {
		btnTetLineMeasure.addEventListener('click', (e) => {
			e.stopPropagation();
			const measurements = sceneSG.measurements || [];
			if (measurements.length === 0) {
				log("No measurements in scene. Draw a distance or line measurement first.", "error");
				return;
			}
			let lastMeasure = measurements[measurements.length - 1];
			if (!lastMeasure.points || lastMeasure.points.length < 2) {
				const lineMeasures = measurements.filter(m => m.points && m.points.length >= 2);
				if (lineMeasures.length > 0) {
					lastMeasure = lineMeasures[lineMeasures.length - 1];
				} else {
					log("Last measurement has fewer than 2 points. Draw a line with Distance Tool first.", "error");
					return;
				}
			}
			activeMeasureForTetLine = lastMeasure;
			const xyz = typeof lastMeasure.toXYZArray === 'function'
				? lastMeasure.toXYZArray()
				: lastMeasure.points.map(p => [p.position.x, p.position.y, p.position.z]).flat();
			const input = document.getElementById('input-tet-line');
			if (input) input.value = JSON.stringify(xyz);
			log(`SUCCESS: Extracted coords from last measurement (${lastMeasure.points.length} nodes) into TetrahedralLineTool: [${xyz.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')}]`, 'success');
		});
	}

	const btnTetLineFromLastMeasure = document.getElementById('btn-tet-line-from-last-measure')
		|| document.querySelector('button[name="FromLineMeasure"]')
		|| document.querySelector('button[name="FromLastMEasure"]');
	if (btnTetLineFromLastMeasure) {
		btnTetLineFromLastMeasure.addEventListener('click', (e) => {
			e.stopPropagation();
			setProcessingState('tet-line');
			try {
				const measurements = sceneSG.measurements || (viewer.scene ? viewer.scene.measurements : []) || [];
				let lastMeasure = null;
				if (measurements.length > 0) {
					const lineMeasures = measurements.filter(m => m.points && m.points.length >= 2);
					if (lineMeasures.length > 0) {
						lastMeasure = lineMeasures[lineMeasures.length - 1];
					}
				}

				const distInput = document.getElementById('input-tet-line-dist');
				const distVal = distInput ? parseFloat(distInput.value) : 5;
				const distanceParam = (isNaN(distVal) || distVal <= 0) ? 5 : distVal;

				currentTetLineShowTet = true;
				const showTetBtn = document.getElementById('btn-tet-line-toggle-showtet');
				if (showTetBtn) showTetBtn.textContent = '🔺 showTet: ON';

				const options = {
					distance: distanceParam,
					radius: distanceParam,
					showTet: true,
					showCenterLine: true,
					clip: true,
					viewer: viewer,
					scene: sceneSG
				};

				const tool = new TetrahedralLineTool(viewer, options);
				viewer.tetrahedralLineTool = tool;
				let boxes = [];

				if (lastMeasure) {
					activeMeasureForTetLine = lastMeasure;
					boxes = tool.fromMeasure(lastMeasure, options);
					const xyz = typeof lastMeasure.toXYZArray === 'function'
						? lastMeasure.toXYZArray()
						: lastMeasure.points.map(p => [p.position.x, p.position.y, p.position.z]).flat();
					const input = document.getElementById('input-tet-line');
					if (input) input.value = JSON.stringify(xyz);
				} else {
					// Fallback to pointcloud bounding box extremes if no measurement drawn yet
					const extremes = getPointCloudBBoxExtremes();
					if (extremes) {
						log("No existing measurement in scene with >= 2 points. Generating a 3D linestring from point cloud bounds...", "info");
						const p1 = [extremes[0] + (extremes[3] - extremes[0]) * 0.15, extremes[1] + (extremes[4] - extremes[1]) * 0.15, extremes[2] + (extremes[5] - extremes[2]) * 0.2];
						const mid = [(extremes[0] + extremes[3]) / 2, (extremes[1] + extremes[4]) / 2, extremes[5] * 0.85 + extremes[2] * 0.15];
						const p2 = [extremes[3] - (extremes[3] - extremes[0]) * 0.15, extremes[4] - (extremes[4] - extremes[1]) * 0.15, extremes[5] - (extremes[5] - extremes[2]) * 0.2];
						const coords = [...p1, ...mid, ...p2];
						boxes = tool.fromArray(coords, options);
						const input = document.getElementById('input-tet-line');
						if (input) input.value = JSON.stringify(coords);
					} else {
						log("ERROR: No measurements in scene with at least 2 points. Draw a distance or line measurement first.", "error");
						setPassState('tet-line', false);
						return;
					}
				}

				const volume = tool.volume;
				if (!volume) {
					log("ERROR: Failed to create TetrahedralLineVolume.", "error");
					setPassState('tet-line', false);
					return;
				}

				volume.showTet = true;
				if (volume.tetLines) volume.tetLines.visible = true;
				if (volume.tetMesh) volume.tetMesh.visible = true;

				if (sceneSG && !sceneSG.volumes.includes(volume)) {
					sceneSG.addVolume(volume);
				}
				if (viewer.tetrahedralBoxTool && !viewer.tetrahedralBoxTool.scene.children.includes(volume)) {
					viewer.tetrahedralBoxTool.scene.add(volume);
				}

				if (viewer && typeof viewer.requestRender === 'function') {
					viewer.requestRender();
				}

				const uniformCoords = tool.getCoordinatesArray();
				const nodeCount = lastMeasure ? lastMeasure.points.length : 3;
				log(`SUCCESS [FromLineMeasure]: Created TetrahedralLineVolume from ${lastMeasure ? 'last measurement' : 'point cloud path'} (${nodeCount} nodes). Created ${boxes.length} topological boxes (${boxes.length * 6} tetrahedra) with showTet: ON visible on screen. Coordinates array: ${uniformCoords.length} floats.`, "success");
				setPassState('tet-line', true);
			} catch (err) {
				log("ERROR in FromLineMeasure: " + err.message, "error");
				console.error("ERROR in FromLineMeasure:", err);
				setPassState('tet-line', false);
			}
		});
	}

	const btnTetLineToggleShowTet = document.getElementById('btn-tet-line-toggle-showtet');
	if (btnTetLineToggleShowTet) {
		btnTetLineToggleShowTet.addEventListener('click', (e) => {
			e.stopPropagation();
			currentTetLineShowTet = !currentTetLineShowTet;
			btnTetLineToggleShowTet.textContent = currentTetLineShowTet ? '🔺 showTet: ON' : '⬜ showTet: OFF';
			if (sceneSG && sceneSG.volumes) {
				sceneSG.volumes.forEach(v => {
					if (v instanceof TetrahedralLineVolume || v.isTetrahedralLineVolume) {
						v.showTet = currentTetLineShowTet;
					}
				});
			}
			log(`TetrahedralLineTool showTet set to: ${currentTetLineShowTet ? 'ON' : 'OFF'}`, 'info');
		});
	}

	const btnTetLineDumpUniform = document.getElementById('btn-tet-line-dump-uniform');
	if (btnTetLineDumpUniform) {
		btnTetLineDumpUniform.addEventListener('click', (e) => {
			e.stopPropagation();
			let tool = viewer.tetrahedralLineTool;
			let coords = null;
			if (tool && typeof tool.getCoordinatesArray === 'function') {
				coords = tool.getCoordinatesArray();
			} else if (sceneSG && sceneSG.volumes) {
				const lineVol = sceneSG.volumes.find(v => v instanceof TetrahedralLineVolume || v.isTetrahedralLineVolume);
				if (lineVol) {
					coords = lineVol.getCoordinatesArray();
				}
			}

			if (coords && coords.length > 0) {
				const numBoxes = Math.round(coords.length / 72);
				const numTets = numBoxes * 6;
				const sample = [coords[0].toFixed(2), coords[1].toFixed(2), coords[2].toFixed(2)].join(', ');
				log(`SUCCESS: getCoordinatesArray() extracted ${coords.length} float coordinates for ${numBoxes} box(es) (${numTets} tetrahedra). Sample vertex 0: [${sample}]. Ready for uniform uClipTetrahedralBoxes.`, 'success');
			} else {
				log("No active TetrahedralLineTool volume in scene to dump coordinates. Run the tool test first.", "error");
			}
		});
	}

	const btnClearMixedFiltersTetLine = document.getElementById('btn-clear-mixed-filters-tetline');
	if (btnClearMixedFiltersTetLine) {
		btnClearMixedFiltersTetLine.addEventListener('click', (e) => {
			e.stopPropagation();
			clearAllMixedFilters();
		});
	}

	const btnTetLine = document.getElementById('btn-tet-line');
	if (btnTetLine) {
		btnTetLine.addEventListener('click', () => {
			setProcessingState('tet-line');
			tests['tet-line'].run();
		});
	}

	function getPointCloudRepresentativeXY() {
		if (!sceneSG || sceneSG.pointclouds.length === 0) return null;
		const pc = sceneSG.pointclouds[0];

		// Prefer an actual point near the middle of the loaded root node so narrow/corridor pointclouds are guaranteed to hit points
		const root = pc.pcoGeometry && pc.pcoGeometry.root;
		if (root && root.geometry && root.geometry.attributes && root.geometry.attributes.position) {
			const posAttr = root.geometry.attributes.position;
			if (posAttr.count > 0) {
				const midIdx = Math.floor(posAttr.count / 2);
				const worldPt = new Vector3(
					posAttr.array[3 * midIdx + 0],
					posAttr.array[3 * midIdx + 1],
					posAttr.array[3 * midIdx + 2]
				).add(pc.position);
				return {
					x: parseFloat(worldPt.x.toFixed(3)),
					y: parseFloat(worldPt.y.toFixed(3)),
				};
			}
		}

		// Fallback to tight position attribute range if available
		const posMeta = pc.getAttribute && pc.getAttribute('position');
		if (posMeta && Array.isArray(posMeta.range) && Array.isArray(posMeta.range[0]) && Array.isArray(posMeta.range[1])) {
			return {
				x: parseFloat(((posMeta.range[0][0] + posMeta.range[1][0]) * 0.5).toFixed(3)),
				y: parseFloat(((posMeta.range[0][1] + posMeta.range[1][1]) * 0.5).toFixed(3)),
			};
		}

		const bbox = viewer.getBoundingBox();
		if (bbox && isFinite(bbox.min.x)) {
			const center = bbox.getCenter(new Vector3());
			return {
				x: parseFloat(center.x.toFixed(3)),
				y: parseFloat(center.y.toFixed(3)),
			};
		}
		return null;
	}

	const inputCrossProfileWidth = document.getElementById('input-cross-profile-width');
	if (inputCrossProfileWidth) {
		inputCrossProfileWidth.addEventListener('input', () => {
			const val = parseFloat(inputCrossProfileWidth.value);
			if (Number.isFinite(val) && val > 0 && window.__activeCrossProfile) {
				window.__activeCrossProfile.setWidth(val);
				log(`Updated Cross-Cloud Profile width to ${val.toFixed(2)}m.`, "info");
			}
		});
	}

	function disposeMeasureResources(m) {
		if (!m) return;
		if (typeof m.traverse === 'function') {
			m.traverse((child) => {
				if (!child) return;
				if (child.geometry && typeof child.geometry.dispose === 'function') {
					child.geometry.dispose();
				}
				if (child.material) {
					if (child.material.map && typeof child.material.map.dispose === 'function') {
						child.material.map.dispose();
					}
					if (typeof child.material.dispose === 'function') {
						child.material.dispose();
					}
				}
			});
		}
		if (m.sphereGeometry && typeof m.sphereGeometry.dispose === 'function') {
			m.sphereGeometry.dispose();
		}
	}

	function clearExtractedZMarkers() {
		if (!window.__extractedZMarkers) {
			window.__extractedZMarkers = [];
		}
		while (window.__extractedZMarkers.length > 0) {
			const prev = window.__extractedZMarkers.pop();
			if (sceneSG.measurements && sceneSG.measurements.includes(prev)) {
				sceneSG.removeMeasurement(prev);
			} else if (sceneSG.scene) {
				sceneSG.scene.remove(prev);
			}
			disposeMeasureResources(prev);
		}
	}

	function renderExtractedZConfirmation(result, selectedMode = 'min') {
		if (!result || result.numPoints === 0) return;

		clearExtractedZMarkers();

		const addConfirmSphere = (label, zVal, colorHex) => {
			if (!Number.isFinite(zVal)) return;
			const m = new Measure();
			m.name = `${label}_Z_(${result.x.toFixed(2)},${result.y.toFixed(2)})`;
			m.showDistances = false;
			m.showAngles = false;
			m.showArea = false;
			m.showCoordinates = true;
			m.closed = false;
			m.maxMarkers = 1;
			m.color.setHex(colorHex);
			m.addMarker(new Vector3(result.x, result.y, zVal));
			if (m.spheres && m.spheres[0] && m.spheres[0].material) {
				m.spheres[0].material.color.setHex(colorHex);
			}
			sceneSG.addMeasurement(m);
			window.__extractedZMarkers.push(m);
		};

		const modeMap = {
			min: { label: 'Min/Lowest', z: result.zMin, color: 0x00ff88, css: '#00ff88' },
			max: { label: 'Max/Highest', z: result.zMax, color: 0xff5555, css: '#ff5555' },
			avg: { label: 'Avg/Mean', z: result.zAvg, color: 0xfacc15, css: '#facc15' },
			median: { label: 'Median', z: result.zMedian, color: 0xc084fc, css: '#c084fc' },
			idw: { label: 'IDW', z: result.zIdw, color: 0x38bdf8, css: '#38bdf8' },
			closest: { label: 'Closest XY', z: result.zClosest, color: 0xfb923c, css: '#fb923c' },
		};

		if (selectedMode === 'all') {
			addConfirmSphere('Min', result.zMin, 0x00ff88);
			addConfirmSphere('Avg', result.zAvg, 0xfacc15);
			addConfirmSphere('Max', result.zMax, 0xff5555);
		} else {
			const active = modeMap[selectedMode] || modeMap.min;
			addConfirmSphere(active.label, active.z, active.color);
		}

		const activeInfo = modeMap[selectedMode] || modeMap.min;
		const outputBox = document.getElementById('output-extract-z-xy');
		if (outputBox) {
			outputBox.style.display = 'block';
			outputBox.innerHTML = [
				`<b>XY Query:</b> (${result.x.toFixed(3)}, ${result.y.toFixed(3)}) | <b>Column Width:</b> ${result.width.toFixed(2)}m`,
				selectedMode === 'all'
					? `<b>Selected Mode:</b> All Spheres (<span style="color:#00ff88">Min</span> + <span style="color:#facc15">Avg</span> + <span style="color:#ff5555">Max</span>)`
					: `<b>Selected Z (${activeInfo.label}):</b> <span style="color:${activeInfo.css};font-weight:700">${activeInfo.z.toFixed(4)}</span>`,
				`<b>Min (Lowest):</b> <span style="color:#00ff88">${result.zMin.toFixed(4)}</span> | <b>Max (Highest):</b> <span style="color:#ff5555">${result.zMax.toFixed(4)}</span>`,
				`<b>Avg (Mean):</b> <span style="color:#facc15">${result.zAvg.toFixed(4)}</span> | <b>Median:</b> <span style="color:#c084fc">${result.zMedian.toFixed(4)}</span>`,
				`<b>IDW:</b> <span style="color:#38bdf8">${result.zIdw.toFixed(4)}</span> | <b>Closest XY:</b> <span style="color:#fb923c">${result.zClosest.toFixed(4)}</span> (dXY = ${result.closestPoint.distanceXY.toFixed(4)}m)`,
				`<b>FakeOctree Points:</b> ${result.numPoints} | <b>Max Octree Level:</b> ${result.highestLevelServed}`,
			].join('<br>');
		}
	}

	function renderZHistogramGraph(histResult) {
		const container = document.getElementById('histogram-extract-z-container');
		const graphEl = document.getElementById('histogram-extract-z-graph');
		const jsonEl = document.getElementById('histogram-extract-z-json');
		if (!container || !graphEl) return;

		container.style.display = 'flex';
		if (jsonEl) {
			jsonEl.textContent = histResult.json;
		}

		const { bins, maxBinCount, zMin, zMax, binSize, numBins, peakBin } = histResult.histogram;
		const stats = histResult.statistics;

		const svgW = 310;
		const svgH = 135;
		const padL = 34;
		const padR = 10;
		const padT = 14;
		const padB = 26;
		const plotW = svgW - padL - padR;
		const plotH = svgH - padT - padB;

		const safeMaxCount = Math.max(1, maxBinCount);
		const barStep = plotW / Math.max(1, bins.length);
		const barW = Math.max(1.5, barStep - (bins.length > 40 ? 0.5 : 1.5));

		const zToX = (zVal) => {
			if (zMax <= zMin) return padL + plotW * 0.5;
			const t = Math.max(0, Math.min(1, (zVal - zMin) / (zMax - zMin)));
			return padL + t * plotW;
		};

		let barsSvg = '';
		for (let i = 0; i < bins.length; i++) {
			const b = bins[i];
			const bh = (b.count / safeMaxCount) * plotH;
			const bx = padL + i * barStep;
			const by = padT + (plotH - bh);
			const isPeak = peakBin && b.index === peakBin.index && b.count > 0;
			const fill = isPeak ? '#00ff88' : (b.count > 0 ? '#38bdf8' : '#1e293b');
			barsSvg += `<rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${barW.toFixed(2)}" height="${Math.max(1, bh).toFixed(2)}" fill="${fill}" rx="1">`
				+ `<title>Bin #${b.index}: Z=[${b.zStart.toFixed(2)}m .. ${b.zEnd.toFixed(2)}m] | Count: ${b.count} (${b.percentage}%)</title>`
				+ `</rect>`;
		}

		const xMin = padL;
		const xAvg = zToX(stats.avg);
		const xMax = padL + plotW;

		graphEl.innerHTML = `
			<svg width="100%" viewBox="0 0 ${svgW} ${svgH}" style="display:block;background:#090d16;border-radius:4px;border:1px solid #1e293b;">
				<!-- Y grid & labels -->
				<line x1="${padL}" y1="${padT}" x2="${svgW - padR}" y2="${padT}" stroke="#1e293b" stroke-dasharray="2,2"/>
				<line x1="${padL}" y1="${padT + plotH * 0.5}" x2="${svgW - padR}" y2="${padT + plotH * 0.5}" stroke="#1e293b" stroke-dasharray="2,2"/>
				<line x1="${padL}" y1="${padT + plotH}" x2="${svgW - padR}" y2="${padT + plotH}" stroke="#475569"/>
				<text x="${padL - 4}" y="${padT + 4}" fill="#94a3b8" font-size="8.5" text-anchor="end">${maxBinCount}</text>
				<text x="${padL - 4}" y="${padT + plotH * 0.5 + 3}" fill="#64748b" font-size="8" text-anchor="end">${Math.round(maxBinCount * 0.5)}</text>
				<text x="${padL - 4}" y="${padT + plotH}" fill="#94a3b8" font-size="8.5" text-anchor="end">0</text>

				<!-- Histogram bars (upwards from zMin to zMax in ${binSize}m bins) -->
				${barsSvg}

				<!-- Avg Z marker line -->
				<line x1="${xAvg.toFixed(2)}" y1="${padT}" x2="${xAvg.toFixed(2)}" y2="${padT + plotH}" stroke="#facc15" stroke-width="1.2" stroke-dasharray="3,2"/>
				<text x="${xAvg.toFixed(2)}" y="${padT - 3}" fill="#facc15" font-size="8" text-anchor="middle">Avg ${stats.avg.toFixed(2)}m</text>

				<!-- X axis Z labels (Min -> Max) -->
				<text x="${xMin}" y="${svgH - 12}" fill="#00ff88" font-size="8.5" text-anchor="start">Min ${zMin.toFixed(2)}m</text>
				<text x="${(padL + plotW * 0.5).toFixed(1)}" y="${svgH - 3}" fill="#94a3b8" font-size="8" text-anchor="middle">${numBins} bins × ${binSize}m (span ${stats.span.toFixed(2)}m)</text>
				<text x="${xMax}" y="${svgH - 12}" fill="#ff5555" font-size="8.5" text-anchor="end">Max ${zMax.toFixed(2)}m</text>
			</svg>
		`;
	}

	const btnToggleZHistJson = document.getElementById('btn-toggle-z-hist-json');
	if (btnToggleZHistJson) {
		btnToggleZHistJson.addEventListener('click', (e) => {
			e.stopPropagation();
			const jsonEl = document.getElementById('histogram-extract-z-json');
			if (jsonEl) {
				jsonEl.style.display = jsonEl.style.display === 'none' ? 'block' : 'none';
			}
		});
	}

	const selectExtractZMode = document.getElementById('select-extract-z-mode');
	if (selectExtractZMode) {
		selectExtractZMode.addEventListener('change', () => {
			if (window.__lastExtractZCircleResult) {
				renderExtractedZCircleOutline(window.__lastExtractZCircleResult, selectExtractZMode.value);
				log(`Switched 3m Z-circle outline mode to '${selectExtractZMode.value.toUpperCase()}'.`, "info");
			} else if (window.__lastExtractZResult) {
				renderExtractedZConfirmation(window.__lastExtractZResult, selectExtractZMode.value);
				log(`Switched extracted Z display mode to '${selectExtractZMode.value.toUpperCase()}'.`, "info");
			}
		});
	}

	/**
	 * Finds the latest user-placed measurement point in sceneSG.measurements (excluding confirmation markers),
	 * or creates a 1-point Measure at the input/representative XY coordinate so there is a real measurement point.
	 */
	function resolveMeasurementPointForCircle() {
		const markerSet = new Set(window.__extractedZMarkers || []);
		const userMeasures = (sceneSG.measurements || []).filter(m => !markerSet.has(m) && Array.isArray(m.points) && m.points.length > 0);

		if (userMeasures.length > 0) {
			const latestMeasure = userMeasures[userMeasures.length - 1];
			const ptObj = latestMeasure.points[latestMeasure.points.length - 1];
			const pos = ptObj && ptObj.position ? ptObj.position : ptObj;
			if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
				return {
					measure: latestMeasure,
					x: Number(pos.x.toFixed(3)),
					y: Number(pos.y.toFixed(3)),
					z: Number.isFinite(pos.z) ? pos.z : null,
					source: `measurement '${latestMeasure.name || 'Measure'}'`,
				};
			}
		}

		// Otherwise use X/Y input fields (or representative pointcloud XY) and drop a 1-point Measure there
		const xInput = document.getElementById('input-extract-z-x');
		const yInput = document.getElementById('input-extract-z-y');
		let cx = xInput ? parseFloat(xInput.value) : NaN;
		let cy = yInput ? parseFloat(yInput.value) : NaN;

		if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
			const defaultXY = getPointCloudRepresentativeXY();
			if (!defaultXY) {
				throw new Error("Could not determine point cloud XY bounds.");
			}
			cx = defaultXY.x;
			cy = defaultXY.y;
		}

		const bbox = viewer.getBoundingBox();
		const cz = bbox && isFinite(bbox.min.z) ? (bbox.min.z + bbox.max.z) * 0.5 : 0;

		const centerMeasure = new Measure();
		centerMeasure.name = 'Circle_Center_Measure';
		centerMeasure.showDistances = false;
		centerMeasure.showCoordinates = true;
		centerMeasure.maxMarkers = 1;
		centerMeasure.addMarker(new Vector3(cx, cy, cz));
		sceneSG.addMeasurement(centerMeasure);

		return {
			measure: centerMeasure,
			x: Number(cx.toFixed(3)),
			y: Number(cy.toFixed(3)),
			z: cz,
			source: `created measurement 'Circle_Center_Measure'`,
		};
	}

	/**
	 * Renders the 3D discretized horizontal circle outline (3m radius, 0.5m step) in the scene
	 * where every vertex takes its Z value from extractZBatchAtXY.
	 */
	function renderExtractedZCircleOutline(circleResult, selectedMode = 'all') {
		clearExtractedZMarkers();

		const addRingOutline = (label, metricKey, colorHex) => {
			const ringMeasure = new Measure();
			ringMeasure.name = `Z_Circle_${circleResult.radius}m_${label}`;
			ringMeasure.showDistances = false;
			ringMeasure.showCoordinates = false;
			ringMeasure.showAngles = false;
			ringMeasure.showArea = false;
			ringMeasure.closed = true;
			ringMeasure.showEdges = true;
			ringMeasure.sphereGeometry = new SphereGeometry(0.11, 8, 8);
			ringMeasure.color.setHex(colorHex);

			for (const v of circleResult.vertices) {
				const zVal = Number.isFinite(v[metricKey]) ? v[metricKey] : v.zMin;
				ringMeasure.addMarker(new Vector3(v.x, v.y, zVal));
			}

			for (const s of ringMeasure.spheres) {
				if (s.material) s.material.color.setHex(colorHex);
			}
			for (const edge of ringMeasure.edges) {
				if (edge.material) {
					edge.material.color.setHex(colorHex);
					edge.material.linewidth = 3;
				}
			}

			sceneSG.addMeasurement(ringMeasure);
			window.__extractedZMarkers.push(ringMeasure);

			// Also place a center marker at the same Z metric if centerResult matched
			if (circleResult.centerResult && circleResult.centerResult.numPoints > 0) {
				const cz = Number.isFinite(circleResult.centerResult[metricKey])
					? circleResult.centerResult[metricKey]
					: circleResult.centerResult.zMin;
				const cm = new Measure();
				cm.name = `Circle_Center_${label}`;
				cm.showDistances = false;
				cm.showCoordinates = false;
				cm.maxMarkers = 1;
				cm.color.setHex(colorHex);
				cm.addMarker(new Vector3(circleResult.centerX, circleResult.centerY, cz));
				sceneSG.addMeasurement(cm);
				window.__extractedZMarkers.push(cm);
			}
		};

		const modeConfig = {
			min: { label: 'Min', key: 'zMin', color: 0x00ff88, css: '#00ff88' },
			max: { label: 'Max', key: 'zMax', color: 0xff5555, css: '#ff5555' },
			avg: { label: 'Avg', key: 'zAvg', color: 0xfacc15, css: '#facc15' },
			median: { label: 'Median', key: 'zMedian', color: 0xc084fc, css: '#c084fc' },
			idw: { label: 'IDW', key: 'zIdw', color: 0x38bdf8, css: '#38bdf8' },
			closest: { label: 'Closest', key: 'zClosest', color: 0xfb923c, css: '#fb923c' },
		};

		if (selectedMode === 'all') {
			addRingOutline('Min', 'zMin', 0x00ff88);
			addRingOutline('Avg', 'zAvg', 0xfacc15);
			addRingOutline('Max', 'zMax', 0xff5555);
		} else {
			const cfg = modeConfig[selectedMode] || modeConfig.min;
			addRingOutline(cfg.label, cfg.key, cfg.color);
		}

		// Compute outline min/max across the 38 circumference vertices
		const activeKey = (modeConfig[selectedMode] || modeConfig.min).key;
		const ringZValues = circleResult.vertices.map(v => v[activeKey]).filter(Number.isFinite);
		const ringMinZ = ringZValues.length > 0 ? Math.min(...ringZValues) : 0;
		const ringMaxZ = ringZValues.length > 0 ? Math.max(...ringZValues) : 0;
		const summary = circleResult.summary;

		const outputBox = document.getElementById('output-extract-z-xy');
		if (outputBox) {
			const rowsHtml = circleResult.vertices.map(v =>
				`<div>#${v.index} (${v.angleDeg.toFixed(0)}°, s=${v.arcLength.toFixed(2)}m) XY=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}): ` +
				`<span style="color:#00ff88;">Min=${v.zMin.toFixed(2)}</span> | ` +
				`<span style="color:#facc15;">Avg=${v.zAvg.toFixed(2)}</span> | ` +
				`<span style="color:#ff5555;">Max=${v.zMax.toFixed(2)}</span> ` +
				`<span style="color:#94a3b8;">(${v.numPoints} pts)</span></div>`
			).join('');

			outputBox.style.display = 'block';
			outputBox.innerHTML =
				`<div style="color:#2dd4bf;font-weight:700;margin-bottom:4px;">⭕ 3m Z-Circle Outline (${circleResult.numVertices} vertices @ ${circleResult.actualStep.toFixed(2)}m step, C=${circleResult.circumference.toFixed(2)}m)</div>` +
				`<div style="margin-bottom:4px;font-size:10.5px;"><b>Center XY:</b> (${circleResult.centerX.toFixed(3)}, ${circleResult.centerY.toFixed(3)}) | <b>Outline Z Range:</b> [${ringMinZ.toFixed(3)}m .. ${ringMaxZ.toFixed(3)}m]</div>` +
				`<div style="margin-bottom:4px;font-size:10.5px;color:#38bdf8;"><b>RAM Nodes Reused:</b> ${summary.ramNodesReused ?? summary.uniqueNodesQueued} | <b>HTTP Range Requests:</b> ${summary.httpRangeRequests ?? 0} (saved ${summary.nodesCoalescedSaved ?? 0} coalesced, ${summary.duplicateLoadsSkipped ?? 0} dupes skipped) | <b>Time:</b> ${summary.elapsedMs} ms</div>` +
				`<div style="max-height:110px;overflow-y:auto;font-size:10.5px;line-height:1.35;">${rowsHtml}</div>`;
		}

		if (typeof viewer.requestRender === 'function') {
			viewer.requestRender();
		}
	}

	async function runDiscretizedZCircleFromMeasure(measureOrPoint, sourceLabel = 'measurement') {
		const xInput = document.getElementById('input-extract-z-x');
		const yInput = document.getElementById('input-extract-z-y');
		const widthInput = document.getElementById('input-extract-z-width');
		const binSizeInput = document.getElementById('input-extract-z-binsize');
		const modeSelect = document.getElementById('select-extract-z-mode');

		const width = widthInput ? (parseFloat(widthInput.value) || 1.0) : 1.0;
		const binSize = binSizeInput ? (parseFloat(binSizeInput.value) || 0.25) : 0.25;
		const selectedMode = modeSelect ? modeSelect.value : 'all';

		const radius = 3.0;
		const step = 0.5;

		const circleResult = await extractZCircleAtXY(viewer, measureOrPoint, {
			radius,
			step,
			width,
			binSize,
			mode: selectedMode,
			includeHistogram: true,
		});

		if (xInput) xInput.value = String(circleResult.centerX);
		if (yInput) yInput.value = String(circleResult.centerY);

		// Position the source measurement point onto the extracted surface Z if present
		if (measureOrPoint && Array.isArray(measureOrPoint.points) && measureOrPoint.points.length > 0 && circleResult.centerResult && circleResult.centerResult.zMin !== null) {
			const lastPt = measureOrPoint.points[measureOrPoint.points.length - 1];
			if (lastPt && lastPt.position) {
				lastPt.position.z = circleResult.centerResult.zMin;
				if (typeof measureOrPoint.update === 'function') {
					measureOrPoint.update();
				}
			}
		}

		window.__lastExtractZCircleResult = circleResult;
		if (circleResult.centerResult && circleResult.centerResult.numPoints > 0) {
			window.__lastExtractZResult = circleResult.centerResult;
			renderZHistogramGraph({
				...circleResult.centerResult,
				json: circleResult.json,
			});
		}

		renderExtractedZCircleOutline(circleResult, selectedMode);

		const s = circleResult.summary;
		log(`SUCCESS: Drew virtual horizontal circle (radius=${radius.toFixed(1)}m, step=${step.toFixed(2)}m → ${circleResult.numVertices} outline vertices) around ${sourceLabel} XY=(${circleResult.centerX.toFixed(3)}, ${circleResult.centerY.toFixed(3)}) in ${s.elapsedMs}ms (${s.totalPointsExtracted} pts | RAM nodes reused=${s.ramNodesReused ?? s.uniqueNodesQueued} | HTTP Range requests=${s.httpRangeRequests ?? 0}, coalesced saved=${s.nodesCoalescedSaved ?? 0}).`, "success");
		setPassState('extract-z-xy', true);
	}

	function startInteractiveCircleMeasurementPick() {
		if (sceneSG.pointclouds.length === 0) {
			log("Load a pointcloud first before picking a measurement point for the 3m Z-circle.", "error");
			return;
		}
		showOnScreenInstructions(
			"Pick Measurement Point for 3m Z-Circle",
			"Left-click on the point cloud to drop a measurement point. A 3m radius horizontal circle (discretized every 0.5m) will be drawn around its (X, Y) with outline Z values from extractZBatchAtXY."
		);
		log("Move cursor over the pointcloud and left-click to drop a measurement point and draw the 3m horizontal Z-circle (0.5m discretization)...", "info");

		const pickMeasure = viewer.measuringTool.startInsertion({
			showDistances: false,
			showAngles: false,
			showCoordinates: true,
			showArea: false,
			closed: false,
			maxMarkers: 1,
			name: 'Circle_Center_Measure',
		});

		let handled = false;
		const domElement = viewer.renderer.domElement;

		const handlePointCommitted = async (mouseEvt) => {
			if (handled) return;
			handled = true;
			pickMeasure.removeEventListener('marker_dropped', onMarkerDropped);
			domElement.removeEventListener('mouseup', onDomMouseUp, false);
			hideOnScreenInstructions();

			let droppedPos = (pickMeasure.points && pickMeasure.points[0] && pickMeasure.points[0].position)
				? pickMeasure.points[0].position.clone()
				: null;

			// If the marker position is still (0, 0, 0), raycast directly at the mouse click location
			if (!droppedPos || (droppedPos.x === 0 && droppedPos.y === 0 && droppedPos.z === 0)) {
				let mousePos = viewer.inputHandler && viewer.inputHandler.mouse ? viewer.inputHandler.mouse : null;
				if (mouseEvt && typeof mouseEvt.clientX === 'number') {
					const rect = domElement.getBoundingClientRect();
					mousePos = {
						x: mouseEvt.clientX - rect.left,
						y: mouseEvt.clientY - rect.top,
					};
				}
				if (mousePos && Potree.Utils && typeof Potree.Utils.getMousePointCloudIntersection === 'function') {
					const hit = Potree.Utils.getMousePointCloudIntersection(
						mousePos,
						viewer.scene.getActiveCamera(),
						viewer,
						viewer.scene.pointclouds,
						{ pickClipped: true }
					);
					if (hit && hit.location) {
						droppedPos = hit.location.clone();
						if (pickMeasure.points && pickMeasure.points[0]) {
							pickMeasure.setPosition(0, droppedPos);
						}
					}
				}
			}

			if (droppedPos && Number.isFinite(droppedPos.x) && Number.isFinite(droppedPos.y) && !(droppedPos.x === 0 && droppedPos.y === 0)) {
				setProcessingState('extract-z-xy');
				try {
					log(`Dropped measurement point at XY=(${droppedPos.x.toFixed(3)}, ${droppedPos.y.toFixed(3)}). Computing 3m circle (0.5m step, 38 vertices) via extractZBatchAtXY...`, "info");
					// Remove the temporary picking marker so the extracted 3m circle & center marker replace it cleanly
					sceneSG.removeMeasurement(pickMeasure);
					await runDiscretizedZCircleFromMeasure({ x: droppedPos.x, y: droppedPos.y }, `dropped measurement point`);
				} catch (err) {
					log("ERROR drawing 3m Z-circle from picked measurement: " + err.message, "error");
					setPassState('extract-z-xy', false);
				}
			} else {
				sceneSG.removeMeasurement(pickMeasure);
				log("WARNING: Could not intersect pointcloud at clicked location. Try clicking directly on visible points.", "error");
			}
		};

		const onMarkerDropped = () => {
			handlePointCommitted(null);
		};

		const onDomMouseUp = (evt) => {
			if (evt.button !== 0) return;
			setTimeout(() => handlePointCommitted(evt), 20);
		};

		pickMeasure.addEventListener('marker_dropped', onMarkerDropped);
		domElement.addEventListener('mouseup', onDomMouseUp, false);
	}

	const btnExtractZCircle = document.getElementById('btn-extract-z-circle');
	if (btnExtractZCircle) {
		btnExtractZCircle.addEventListener('click', async (e) => {
			e.stopPropagation();
			if (sceneSG.pointclouds.length === 0) {
				log("WARNING: No point clouds loaded in scene. Load a pointcloud first!", "error");
				setPassState('extract-z-xy', false);
				return;
			}

			// Check if there is an existing user-dropped measurement point with valid non-zero coordinates
			const markerSet = new Set(window.__extractedZMarkers || []);
			const userMeasures = (sceneSG.measurements || []).filter(m => {
				if (markerSet.has(m) || !Array.isArray(m.points) || m.points.length === 0) return false;
				const pos = m.points[m.points.length - 1].position;
				return pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) && !(pos.x === 0 && pos.y === 0 && pos.z === 0);
			});

			// If the user is currently mid-drag placing a point (e.g. from Test #7) or has no measurement yet, let them drop the point on the cloud
			const isDraggingPoint = Boolean(viewer.inputHandler && viewer.inputHandler.drag && viewer.inputHandler.drag.object);
			if (userMeasures.length === 0 || isDraggingPoint) {
				startInteractiveCircleMeasurementPick();
				return;
			}

			setProcessingState('extract-z-xy');
			try {
				const resolved = resolveMeasurementPointForCircle();
				log(`Taking XY=(${resolved.x.toFixed(3)}, ${resolved.y.toFixed(3)}) from ${resolved.source} and extracting 3m horizontal circle discretized every 0.5m via extractZBatchAtXY...`, "info");
				await runDiscretizedZCircleFromMeasure(resolved.measure, resolved.source);
			} catch (err) {
				log("ERROR extracting 3m Z-circle: " + err.message, "error");
				setPassState('extract-z-xy', false);
			}
		});
	}

	const btnExtractZCirclePick = document.getElementById('btn-extract-z-circle-pick');
	if (btnExtractZCirclePick) {
		btnExtractZCirclePick.addEventListener('click', (e) => {
			e.stopPropagation();
			startInteractiveCircleMeasurementPick();
		});
	}

	const btnExtractZCenter = document.getElementById('btn-extract-z-center');
	if (btnExtractZCenter) {
		btnExtractZCenter.addEventListener('click', (e) => {
			e.stopPropagation();
			const xy = getPointCloudRepresentativeXY();
			if (!xy) {
				log("Load a pointcloud first before filling XY.", "error");
				return;
			}
			const xInput = document.getElementById('input-extract-z-x');
			const yInput = document.getElementById('input-extract-z-y');
			if (xInput) xInput.value = String(xy.x);
			if (yInput) yInput.value = String(xy.y);
			log(`Filled representative pointcloud XY: (${xy.x}, ${xy.y})`, "info");
		});
	}

	const btnExtractZBatch = document.getElementById('btn-extract-z-batch');
	if (btnExtractZBatch) {
		btnExtractZBatch.addEventListener('click', async (e) => {
			e.stopPropagation();
			if (sceneSG.pointclouds.length === 0) {
				log("WARNING: No point clouds loaded in scene. Load a pointcloud first!", "error");
				setPassState('extract-z-xy', false);
				return;
			}
			setProcessingState('extract-z-xy');
			try {
				const xInput = document.getElementById('input-extract-z-x');
				const yInput = document.getElementById('input-extract-z-y');
				const widthInput = document.getElementById('input-extract-z-width');
				const binSizeInput = document.getElementById('input-extract-z-binsize');
				const modeSelect = document.getElementById('select-extract-z-mode');
				const outputBox = document.getElementById('output-extract-z-xy');

				let cx = xInput ? parseFloat(xInput.value) : NaN;
				let cy = yInput ? parseFloat(yInput.value) : NaN;
				if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
					const defaultXY = getPointCloudRepresentativeXY();
					if (!defaultXY) {
						throw new Error("Could not determine point cloud XY bounds.");
					}
					cx = defaultXY.x;
					cy = defaultXY.y;
					if (xInput) xInput.value = String(cx);
					if (yInput) yInput.value = String(cy);
				}

				const width = widthInput ? (parseFloat(widthInput.value) || 1.5) : 1.5;
				const binSize = binSizeInput ? (parseFloat(binSizeInput.value) || 0.25) : 0.25;
				const selectedMode = modeSelect ? modeSelect.value : 'all';
				const step = Math.max(width * 1.5, 2.0);

				// Build a 3x3 grid of 9 close XY coordinates around (cx, cy)
				const xyCollection = [];
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						xyCollection.push({
							x: Number((cx + dx * step).toFixed(3)),
							y: Number((cy + dy * step).toFixed(3)),
						});
					}
				}

				log(`Batch extracting Z & histograms for ${xyCollection.length} close XY points (3×3 grid, step=${step.toFixed(2)}m, width=${width}m) in a SINGLE shared octree pass...`, "info");

				const batchResults = await extractZHistogramBatchAtXY(viewer, xyCollection, {
					width,
					binSize,
					mode: selectedMode,
				});

				// Clear previous markers and place confirmation markers for all matched points in the batch
				clearExtractedZMarkers();
				const matchedResults = batchResults.filter(r => r.numPoints > 0);
				if (matchedResults.length === 0) {
					log(`WARNING: 0 points matched across the ${xyCollection.length}-point XY grid around (${cx.toFixed(2)}, ${cy.toFixed(2)}).`, "error");
					setPassState('extract-z-xy', false);
					return;
				}

				for (const item of matchedResults) {
					const zToMark = (selectedMode === 'max') ? item.zMax
						: (selectedMode === 'avg') ? item.zAvg
						: (selectedMode === 'median') ? item.zMedian
						: (selectedMode === 'idw') ? item.zIdw
						: (selectedMode === 'closest') ? item.zClosest
						: item.zMin;
					const m = new Measure();
					m.name = `BatchZ[${item.index}] (${zToMark.toFixed(2)}m)`;
					m.showDistances = false;
					m.showCoordinates = false;
					m.maxMarkers = 1;
					m.color.setHex(0x00ff88);
					m.addMarker(new Vector3(item.x, item.y, zToMark));
					sceneSG.addMeasurement(m);
					window.__extractedZMarkers.push(m);
				}

				// Show batch summary table in outputBox and render center point's histogram + full batch JSON
				const summary = batchResults.summary;
				if (outputBox) {
					const rowsHtml = batchResults.map(r => {
						if (r.numPoints === 0) {
							return `<div style="color:#94a3b8;">#${r.index} (${r.x.toFixed(1)}, ${r.y.toFixed(1)}): 0 pts</div>`;
						}
						return `<div>#${r.index} (${r.x.toFixed(1)}, ${r.y.toFixed(1)}): <span style="color:#00ff88;">Min=${r.zMin.toFixed(2)}</span> | <span style="color:#facc15;">Avg=${r.zAvg.toFixed(2)}</span> | <span style="color:#ff5555;">Max=${r.zMax.toFixed(2)}</span> <span style="color:#94a3b8;">(${r.numPoints} pts)</span></div>`;
					}).join('');

					outputBox.style.display = 'block';
					outputBox.innerHTML =
						`<div style="color:#38bdf8;font-weight:700;margin-bottom:4px;">Batch Collection: ${summary.numMatchedQueries}/${summary.numQueries} XY points | ${summary.totalPointsExtracted} pts | RAM nodes: ${summary.ramNodesReused ?? summary.uniqueNodesQueued} | HTTP Range Reqs: ${summary.httpRangeRequests ?? 0} | ${summary.elapsedMs} ms</div>` +
						`<div style="max-height:110px;overflow-y:auto;font-size:10.5px;line-height:1.35;">${rowsHtml}</div>`;
				}

				const centerResult = batchResults[4] && batchResults[4].numPoints > 0 ? batchResults[4] : matchedResults[0];
				window.__lastExtractZResult = centerResult;
				window.__lastExtractZBatchResult = batchResults;
				renderZHistogramGraph({
					...centerResult,
					json: batchResults.json,
				});

				if (typeof viewer.requestRender === 'function') {
					viewer.requestRender();
				}

				log(`SUCCESS: Batch extracted ${summary.numMatchedQueries}/${summary.numQueries} XY points (${summary.totalPointsExtracted} total points) in ${summary.elapsedMs}ms (RAM nodes reused=${summary.ramNodesReused ?? summary.uniqueNodesQueued}, HTTP Range requests=${summary.httpRangeRequests ?? 0}, coalesced saved=${summary.nodesCoalescedSaved ?? 0}).`, "success");
				setPassState('extract-z-xy', true);
			} catch (err) {
				log("ERROR in batch Z extraction: " + err.message, "error");
				setPassState('extract-z-xy', false);
			}
		});
	}

	const btnExtractZPick = document.getElementById('btn-extract-z-pick');
	if (btnExtractZPick) {
		btnExtractZPick.addEventListener('click', (e) => {
			e.stopPropagation();
			if (sceneSG.pointclouds.length === 0) {
				log("Load a pointcloud first before picking XY.", "error");
				return;
			}
			showOnScreenInstructions("Pick XY for Z Extraction", "Move cursor over the point cloud and left-click to pick (X, Y) and extract Z across all octree levels.");
			log("Move cursor over the pointcloud and click to deposit pick sphere and extract Z...", "info");

			const pickMeasure = viewer.measuringTool.startInsertion({
				showDistances: false,
				showAngles: false,
				showCoordinates: true,
				showArea: false,
				closed: false,
				maxMarkers: 1,
				name: 'XY_Pick_Target',
			});

			const onMarkerDropped = (evt) => {
				pickMeasure.removeEventListener('marker_dropped', onMarkerDropped);
				hideOnScreenInstructions();
				const droppedPos = pickMeasure.points && pickMeasure.points[0] ? pickMeasure.points[0].position : null;
				// Remove the temporary red picking marker so the green confirmation sphere/marker takes its place
				sceneSG.removeMeasurement(pickMeasure);

				if (droppedPos && Number.isFinite(droppedPos.x) && Number.isFinite(droppedPos.y)) {
					const px = parseFloat(droppedPos.x.toFixed(3));
					const py = parseFloat(droppedPos.y.toFixed(3));
					const xInput = document.getElementById('input-extract-z-x');
					const yInput = document.getElementById('input-extract-z-y');
					if (xInput) xInput.value = String(px);
					if (yInput) yInput.value = String(py);
					log(`Picked XY=(${px}, ${py}) from pointcloud. Extracting Z from all octree levels...`, "info");
					setProcessingState('extract-z-xy');
					tests['extract-z-xy'].run();
				} else {
					log("WARNING: Could not intersect pointcloud at clicked location. Try clicking directly on visible points.", "error");
				}
			};

			pickMeasure.addEventListener('marker_dropped', onMarkerDropped);
		});
	}

	// -------------------------------------------------------------
	// CLEAR ALL MIXED FILTERS HANDLERS
	// -------------------------------------------------------------
	function clearAllMixedFilters() {
		try {
			const count = (sceneSG.mixedFilters ? sceneSG.mixedFilters.length : 0)
				+ (sceneSG.volumes ? sceneSG.volumes.length : 0);

			if (typeof sceneSG.removeAllMixedFilters === 'function') {
				sceneSG.removeAllMixedFilters();
			} else {
				sceneSG.mixedFilters = [];
			}

			if (typeof sceneSG.removeAllVolumes === 'function') {
				sceneSG.removeAllVolumes();
			} else if (sceneSG.volumes) {
				while (sceneSG.volumes.length > 0) {
					sceneSG.removeVolume(sceneSG.volumes[0]);
				}
			}

			if (viewer.volumeTool && viewer.volumeTool.scene) {
				while (viewer.volumeTool.scene.children.length > 0) {
					viewer.volumeTool.scene.remove(viewer.volumeTool.scene.children[0]);
				}
			}
			if (viewer.tetTool && (viewer.tetrahedralBoxTool || viewer.tetTool).scene) {
				while ((viewer.tetrahedralBoxTool || viewer.tetTool).scene.children.length > 0) {
					(viewer.tetrahedralBoxTool || viewer.tetTool).scene.remove((viewer.tetrahedralBoxTool || viewer.tetTool).scene.children[0]);
				}
			}

			if (sceneSG.pointclouds) {
				for (const pc of sceneSG.pointclouds) {
					if (pc.material && typeof pc.material.setMixedFilters === 'function') {
						pc.material.setMixedFilters([]);
					}
				}
			}

			hideOnScreenInstructions();
			if (typeof viewer.requestRender === 'function') {
				viewer.requestRender();
			}

			log(`SUCCESS: Cleared all mixed filters, volumes and clips (${count} item(s) removed).`, 'success');
		} catch (err) {
			log('ERROR clearing mixed filters: ' + err.message, 'error');
		}
	}

	const btnClearMixedFilters = document.getElementById('btn-clear-mixed-filters');
	if (btnClearMixedFilters) {
		btnClearMixedFilters.addEventListener('click', (e) => {
			e.stopPropagation();
			clearAllMixedFilters();
		});
	}

	const btnClearMixedFiltersTet = document.getElementById('btn-clear-mixed-filters-tet');
	if (btnClearMixedFiltersTet) {
		btnClearMixedFiltersTet.addEventListener('click', (e) => {
			e.stopPropagation();
			clearAllMixedFilters();
		});
	}

	// Auto-calculate start conditions
	recalculateProgress();

	// -------------------------------------------------------------
	// HELPER UTILITIES
	// -------------------------------------------------------------

	function log(msg, type = "info") {
		const logs = document.getElementById('log-messages');
		const entry = document.createElement('div');
		entry.className = `log-entry ${type}`;
		entry.innerHTML = `
			<span class="timestamp">${getFormattedTime()}</span>
			<span class="message">${msg}</span>
		`;
		logs.appendChild(entry);
		logs.scrollTop = logs.scrollHeight;
	}

	function getFormattedTime() {
		const d = new Date();
		return d.toTimeString().split(' ')[0];
	}

	function setProcessingState(id) {
		const status = document.getElementById(tests[id].status);
		if (status) {
			status.className = "status-badge status-progress";
			status.textContent = "Testing...";
		}
	}

	function setPassState(id, isPassed) {
		tests[id].passed = isPassed;
		const check = document.getElementById(tests[id].checkbox);
		if (check) check.checked = isPassed;
		updateUIPendingStates(id);
		recalculateProgress();
	}

	function updateUIPendingStates(id) {
		const status = document.getElementById(tests[id].status);
		if (!status) return;

		if (tests[id].passed) {
			status.className = "status-badge status-passed";
			status.textContent = "Passed";
		} else {
			status.className = "status-badge status-idle";
			status.textContent = "Untested";
		}
	}

	function recalculateProgress() {
		const totalKeys = Object.keys(tests);
		const total = totalKeys.length;
		const passedCount = totalKeys.filter(k => tests[k].passed).length;
		const percent = total > 0 ? Math.round((passedCount / total) * 100) : 0;

		const score = document.getElementById('progress-score');
		const bar = document.getElementById('progress-fill');

		if (score) score.textContent = `${passedCount} / ${total} (${percent}%)`;
		if (bar) bar.style.width = `${percent}%`;
	}

	function showOnScreenInstructions(title, text) {
		const panel = document.getElementById('on-screen-overlay');
		const h = document.getElementById('overlay-title');
		const p = document.getElementById('overlay-text');

		h.textContent = title;
		p.textContent = text;
		panel.style.display = 'block';
	}

	function hideOnScreenInstructions() {
		const panel = document.getElementById('on-screen-overlay');
		panel.style.display = 'none';
	}

	// Load default pointcloud as initial demo validation
	setTimeout(() => {
		tests['load-veg'].run();
	}, 1200);
}

document.body.onload = init;
if (document.readyState === 'complete' || document.readyState === 'interactive') {
	init();
} else {
	window.addEventListener('DOMContentLoaded', init);
	window.addEventListener('load', init);
}