import {Potree, PScene, Viewer} from '../dist/potree_module.js';
import {VolumeLineTool} from '../src/utils/VolumeLineTool.js';
import {SphereVolume} from '../src/utils/Volume.js';
import {TetrahedralBoxTool, TetTool} from '../src/utils/TetrahedralBoxTool.js';
import {TetrahedralBoxVolume, TetrahedralVolume} from '../src/utils/TetrahedralBoxVolume.js';

document.body.onload = function () {
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
		'load-lion': {
			id: 'load-lion',
			name: "Load 'Lion Takanawa'",
			status: 'status-load-lion',
			checkbox: 'check-load-lion',
			passed: false,
			run: async () => {
				log("Loading classic 'Lion Takanawa' pointcloud (cloud.js)...");
				try {
					Potree.loadPointCloud("../pointclouds/lion_takanawa/cloud.js", "Lion Takanawa", function (e) {
						sceneSG.addPointCloud(e.pointcloud);
						viewer.zoomTo(e.pointcloud);
						log("SUCCESS: 'Lion Takanawa' pointcloud added to scene.", "success");
						setPassState('load-lion', true);
						setTimeout(() => fillBBoxExtremes(false), 300);
					});
				} catch (err) {
					log("ERROR loading Lion: " + err.message, "error");
					setPassState('load-lion', false);
				}
			}
		},
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
		'clear-measures': {
			id: 'clear-measures',
			name: 'Clear Calculations',
			status: 'status-clear-measures',
			checkbox: 'check-clear-measures',
			passed: false,
			run: async () => {
				log("Clearing all drawings, paths, volumes and measurements...");
				try {
					sceneSG.removeAllMeasurements();
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
					// Registering custom click handler via viewer logic
					const clickListener = (event) => {
						const intersection = viewer.inputHandler.getMousePointCloudIntersection(event.mouse);
						if (intersection) {
							const pt = intersection.point;
							log(`Raycast Intersection Found: X: ${pt.x.toFixed(3)}, Y: ${pt.y.toFixed(3)}, Z: ${pt.z.toFixed(3)}`, "success");
							setPassState('point-pick', true);
						}
					};

					// Check if listener is registered, add it to input handler
					viewer.inputHandler.addEventListener('click', clickListener);
					log("Raycast selection active. Try clicking the point cloud.", "info");

					// Automatically remove after 30 seconds to clean up, or manual flag
					setTimeout(() => {
						viewer.inputHandler.removeEventListener('click', clickListener);
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
						try { coords = JSON.parse(rawCoord); } catch (e) {
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
		tests['load-lion'].run();
	}, 1200);
};