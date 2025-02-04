//import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
//@ts-ignore
//import * as Potree from '../src/Potree.js';
import * as Potree from '../src/PotreeModule';


// @ts-ignore

window.Potree = Potree;//mantains compatibility with the old code  but the most relevant item is viewer bcs is the running instance


document.body.onload = function () {

	const canvas = document.createElement('canvas');
	canvas.style.position = 'absolute';
	canvas.style.top = '0px';
	canvas.style.left = '0px';
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	document.body.appendChild(canvas);

	//lust a dummy loader
	//@ts-ignore
	Potree.loadPointCloud('data/lion_takanawa/cloud.js', 'LionHead', e => {
		console.log('loader pointcloud: lion')

	});

	//@ts-ignore
	//	Potree.loadPointCloud('pointclouds/inegi_point_cloud_cov_40cm.las_converted/metadata.json', 'INEGI', (e: any) => {
	//		console.log('loaded Pointcloud: inegi')
	//	});



	let text = document.createElement('div')
	text.innerHTML = '<b>Hello, World!<b>'


	document.body.appendChild(text);





	document.body.onresize = function () {
		const width = window.innerWidth;
		const height = window.innerHeight;


	};

	// @ts-ignore
	document.body.onresize();



	//entry point

	Potree.loadPointCloud('data/lion_takanawa/cloud.js', 'LionHead', (e: any) => {


	});



};
