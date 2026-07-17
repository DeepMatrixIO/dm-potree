// import { AmbientLight, BoxGeometry,  Euler,  Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer } from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// import {Potree, PScene, Viewer} from '../src/PotreeGlobal.js';//as index is changed name to potree_module
import {Potree, PScene, Viewer} from '../dist/potree_module.js';//as index is changed name to potree_module


document.body.onload = function () {

	// let pointClouds: PointCloudOctree[] = [];

	// three.js
	// const scene = new Scene();
	// const camera = new PerspectiveCamera(60, 1, 0.1, 1000);

	// const canvas = document.createElement('canvas');
	// canvas.style.position = 'absolute';
	// canvas.style.top = '0px';
	// canvas.style.left = '0px';
	// canvas.style.width = '100%';
	// canvas.style.height = '100%';
	// document.body.appendChild(canvas);


	const stylesheets = `
		<link rel="stylesheet" type="text/css" href="./potree/potree.css">

	`	;

	document.head.insertAdjacentHTML('beforeend', stylesheets);

	// loadPointCloud('/data/lion_takanawa/', 'cloud.js', new Vector3(-4, -2, 5), new Euler(-Math.PI / 2, 0, 0));
	// loadPointCloud('/data/pump/', 'metadata.json', new Vector3(0, -1.5, 3), new Euler(-Math.PI / 2, 0, 0), new Vector3(2, 2, 2));

	const libs = `
	<!--<script src="./libs/jquery/jquery-3.1.1.min.js"></script>-->
	<script src="./libs/spectrum/spectrum.js"></script>
	<script src="./libs/jquery-ui/jquery-ui.min.js"></script>
	<!--<script src="./libs/other/BinaryHeap.js"></script> -->
	<!--<script src="./libs/tween/tween.min.js"></script> --> <!-- removed-->
	<script src="./libs/d3/d3.js"></script>
	<script src="./libs/proj4/proj4.js"></script>
	<script src="./libs/openlayers3/ol.js"></script>
	<script src="./libs/i18next/i18next.js"></script>
    <!--<script src="./libs/jstree/jstree.js"></script> -->

	<script src="./libs/plasio/js/laslaz.js"></script>
	`
	document.body.insertAdjacentHTML('beforeend', libs);

	// You can place this in your JS file where you want to use the HTML
	const potreeContainerHTML = `
	<div class="potree_container" style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px; ">
		<div id="potree_render_area" style="background-image: url('/resources/images/background.jpg');">
		</div>
		<div id="potree_sidebar_container"> </div>
	</div>`;

	// Example: Insert into the body
	document.body.innerHTML = potreeContainerHTML;//clear body
	// document.body.insertAdjacentHTML('beforeend', potreeContainerHTML);


	// window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
	window.Potree = new Potree()

	console.log(window.Potree)

	console.log("Loading Potree as Module - Viewer");
	const potree_viewer =
		new Viewer(document.getElementById("potree_render_area"));
	window.viewer = potree_viewer;


	viewer.setEDLEnabled(true);
	viewer.setFOV(60);
	viewer.setPointBudget(1_000_000);
	viewer.loadSettingsFromURL();
	viewer.setBackground("skybox");//is crashing due to missing loader


	console.log(potree_viewer)

	viewer.setDescription(`
		Initial example showing Potree as a MOdule
		`);

	let sceneSG = new PScene();//PScene to avoid confusion with Threejs Scene

	viewer.setScene(sceneSG);


	//classic potree viewer contains a gUi
	//that is removed in favour


	viewer.loadGUI(() => {//no more jquery pls
		viewer.setLanguage('en');
		// $("#menu_scene").next().show();
		viewer.toggleSidebar();

		// Add floating test suite switch link at bottom of sidebar
		const sidebar = document.getElementById('potree_sidebar_container');
		if (sidebar) {
			const linkDiv = document.createElement('div');
			linkDiv.style.position = 'absolute';
			linkDiv.style.bottom = '15px';
			linkDiv.style.left = '15px';
			linkDiv.style.right = '15px';
			linkDiv.style.padding = '10px';
			linkDiv.style.background = 'rgba(2, 132, 199, 0.2)';
			linkDiv.style.border = '1px solid #0284c7';
			linkDiv.style.borderRadius = '8px';
			linkDiv.style.zIndex = '1000';
			linkDiv.innerHTML = `
				<a href="feature_test.html" style="color: #0ea5e9; text-decoration: none; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;">
					<span>🧪</span> Open Feature Test Suite
				</a>
			`;
			sidebar.appendChild(linkDiv);
		}
	});



	//profile needs to be added

	//here the viewer is not visible, only the window.viewer
	document.body.onresize = function () {
		const width = window.innerWidth;
		const height = window.innerHeight;

		viewer.renderer.setSize(width, height);
		viewer.scene.getActiveCamera().aspect = width / height;
		viewer.scene.getActiveCamera().updateProjectionMatrix();
	};

	// @ts-ignore
	document.body.onresize();

	let octreePath= "../pointclouds/vegetation_zone_ROW_75_20_1_64930dd1.las_converted/metadata.json";
	// let octreeName = "vegetation";
	// let octreePath= "pointclouds/dense_cloud_crop2_out_a6ac0ecb.las_converted/metadata.json";
		// let octreePath= "pointclouds/calkini_dem_k8_r1_r2_class1_segmented_1751888546983_segmented_1751977953588_segmented_1751978171236_ebff23d6.las_converted/metadata.json";

	let octreeName = "dense_cloud";

	Potree.loadPointCloud(octreePath, octreeName, function (e) {
		sceneSG.addPointCloud(e.pointcloud);
		//sceneSG.view.position.set(590030, 231767, 1007);
		viewer.zoomTo(e.pointcloud)

		//material.size = 1;
		// material.pointSizeType = Potree.PointSizeType.ADAPTIVE;

		// let clip= new PolygonClipVolume(viewer.getCamera());
		// viewer.scene.addClipVolume(clip);
		//viewer.scene.polygonClipVolumes[0].markers.map(marker => [marker.position.x,marker.position.y,marker.position.z]).toString()

	}
	);

}


