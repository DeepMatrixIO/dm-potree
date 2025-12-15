// import { AmbientLight, BoxGeometry,  Euler,  Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer } from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

//@ts-ignore
import {Viewer} from '../dist/potree_module_index.js';//as index is changed name to potree_module

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


	// loadPointCloud('/data/lion_takanawa/', 'cloud.js', new Vector3(-4, -2, 5), new Euler(-Math.PI / 2, 0, 0));
	// loadPointCloud('/data/pump/', 'metadata.json', new Vector3(0, -1.5, 3), new Euler(-Math.PI / 2, 0, 0), new Vector3(2, 2, 2));

	const libs = `
		<script src="../libs/jquery/jquery-3.1.1.min.js"></script>
	<script src="../libs/spectrum/spectrum.js"></script>
	<script src="../libs/jquery-ui/jquery-ui.min.js"></script>
	<script src="../libs/other/BinaryHeap.js"></script>
	<script src="../libs/tween/tween.min.js"></script>
	<script src="../libs/d3/d3.js"></script>
	<script src="../libs/proj4/proj4.js"></script>
	<script src="../libs/openlayers3/ol.js"></script>
	<script src="../libs/i18next/i18next.js"></script>
	<script src="../libs/jstree/jstree.js"></script>

	<script src="../libs/plasio/js/laslaz.js"></script>
	`
	document.body.insertAdjacentHTML('afterbegin', libs);

	// You can place this in your JS file where you want to use the HTML
	const potreeContainerHTML = `
<div class="potree_container" style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px; ">
    <div id="potree_render_area" style="background-image: url('../build/potree/resources/images/background.jpg');">
    </div>
    <div id="potree_sidebar_container"> </div>
</div>
`;

	// Example: Insert into the body
	document.body.insertAdjacentHTML('beforeend', potreeContainerHTML);

// @ts-ignore
	const viewer = new Viewer(document.getElementById("potree_render_area"));
	// @ts-ignore
	window.viewer = viewer;

	document.body.onresize = function () {
		const width = window.innerWidth;
		const height = window.innerHeight;


	};

	// @ts-ignore
	document.body.onresize();
};
