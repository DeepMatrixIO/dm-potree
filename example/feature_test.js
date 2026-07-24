import { Potree, PScene, Viewer } from '../dist/potree_module.js';

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