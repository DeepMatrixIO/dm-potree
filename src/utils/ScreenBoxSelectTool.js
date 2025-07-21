
import * as THREE from "../../libs/three.js/build/three.module.js";
import {BoxVolume} from "./Volume.js";
import {Utils} from "../utils.js";
import {PointSizeType} from "../defines.js";
import {EventDispatcher} from "../EventDispatcher.js";


export class ScreenBoxSelectTool extends EventDispatcher {

	constructor(viewer) {
		super();

		this.viewer = viewer;
		this.scene = new THREE.Scene();

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));
	}

	onSceneChange(scene) {
		console.log("scene changed");
	}

	startInsertion() {
		let domElement = this.viewer.renderer.domElement;

		let volume = new BoxVolume();
		volume.position.set(12345, 12345, 12345);
		volume.showVolumeLabel = false;
		volume.visible = true;
		volume.update();

		this.viewer.scene.addVolume(volume);

		this.importance = 10;

		let selectionBox = $(`<div style="position: absolute; border: 2px solid white; pointer-events: none; border-style:dashed"></div>`);// selection box style
		$(domElement.parentElement).append(selectionBox);
		selectionBox.css("right", "10px");
		selectionBox.css("bottom", "10px");



		// Regular mouseToRay does not work properly on orthographic cameras, so we need to create a custom function

		// //Orthographic Camera:
		// Ray origin is the unprojected screen coordinate.
		// Ray direction is constant and aligned with the camera's forward vector.
		// Perspective Camera:
		// Ray origin is the camera's position.
		// Ray direction varies based on the screen coordinate.
		// If you're switching to an orthographic camera, ensure the m


		let drag = e => {
			// console.log("dragging....................................................................");
			volume.visible = true;

			let mStart = e.drag.start;
			let mEnd = e.drag.end;

			// console.log("drag start: ", mStart.x, mStart.y, "drag end: ", mEnd.x, mEnd.y);

			let box2D = new THREE.Box2();
			box2D.expandByPoint(mStart);
			box2D.expandByPoint(mEnd);

			selectionBox.css("left", `${box2D.min.x}px`);
			selectionBox.css("top", `${box2D.min.y}px`);
			selectionBox.css("width", `${box2D.max.x - box2D.min.x}px`);
			selectionBox.css("height", `${box2D.max.y - box2D.min.y}px`);

			let camera = e.viewer.scene.getActiveCamera();
			let size = e.viewer.renderer.getSize(new THREE.Vector2());//size of the canvas
			// console.log("CANVAS SIZE: ",size.width, size.height);
			let frustumSize = new THREE.Vector2(
				camera.right - camera.left,
				camera.top - camera.bottom);
			// console.log("FRUSTUM SIZE: ",frustumSize.x, frustumSize.y);

			let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			// console.log("BOX CENTROID: ",screenCentroid.x, screenCentroid.y);
			let ray = Utils.mouseToRay(screenCentroid, camera, size.width, size.height);//use the fixed mouseToRay function
			//let ray = mouseToRayOrtho(screenCentroid, camera, size.width, size.height);






			let diff = new THREE.Vector2().subVectors(e.drag.end, e.drag.start);
			diff.divide(size).multiply(frustumSize);

			volume.position.copy(ray.origin);
			volume.up.copy(camera.up);
			volume.rotation.copy(camera.rotation);
			volume.scale.set(diff.x, diff.y, 1000 * 100);

			e.consume();
		};






		let drop = e => {

			// console.log("drop....................................................................");
			this.importance = 0;

			$(selectionBox).remove();

			this.viewer.inputHandler.deselectAll();
			this.viewer.inputHandler.toggleSelection(volume);
			//
			// camera.updateMatrixWorld();
			// camera.updateProjectionMatrix();
			//
			let camera = e.viewer.scene.getActiveCamera();
			let size = e.viewer.renderer.getSize(new THREE.Vector2());

			//checking box size
			let xSize = e.drag.end.x - e.drag.start.x
			let ySize = e.drag.end.y - e.drag.start.y
			let minAllowedSize = 20;
			let boxSize = Math.sqrt(xSize * xSize + ySize * ySize)
			if (boxSize < minAllowedSize) {
				console.warn("Box size is too small, minimum allowed size is: ", minAllowedSize);
				this.viewer.scene.removeVolume(volume);
				return;

			}



			let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			//let ray = mouseToRayOrtho(screenCentroid, camera, size.width, size.height);
			let ray = Utils.mouseToRay(screenCentroid, camera, size.width, size.height);

			let line = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));


			/////////////////////////////////////////////////////////////////
			//DRAWIING AN ARROW HELPER TO UNDERSTAND THE DIRECTION

			// console.log("RAY ORIGIN: ",ray.origin.x, ray.origin.y, ray.origin.z);
			// console.log("RAY DIRECTION: ",ray.direction.x, ray.direction.y, ray.direction.z);

			// const arrowHelper = new THREE.ArrowHelper(ray.direction.clone().normalize(), ray.origin, 40, 0xffff00, 3, 2);
			// this.viewer.scene.scene.add(arrowHelper);



			// this.viewer.arrowHelper = arrowHelper;



			// const planeGeometry = new THREE.PlaneGeometry(128, 128, 8, 8);
			// const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
			// planeMaterial.wireframe= true;
			// const plane = new THREE.Mesh(planeGeometry, planeMaterial);

			// plane.position.copy(  ray.origin.add(ray.direction.clone().multiplyScalar(10)) );
			// const up = new THREE.Vector3(0, 0, 1); // Plane's default normal
			// const quaternion = new THREE.Quaternion().setFromUnitVectors(up, ray.direction.clone().normalize());
			// plane.quaternion.copy(quaternion);
			// this.viewer.plane = plane;
			// this.viewer.scene.scene.add(plane);




			//console.log("DROP: ",e.drag.start.x, e.drag.start.y, e.drag.end.x, e.drag.end.y);
			//console.log("DROP: ",e.drop.x, e.drop.y, e.drop.width, e.drop.height);

			/////////////////////////////////////////////

			// let rayStart = mouseToRayOrtho(e.drag.start, camera, size.width, size.height);
			// let rayEnd = mouseToRayOrtho(e.drag.end, camera, size.width, size.height);

			// console.log("RAY START: ",rayStart.origin.x, rayStart.origin.y, rayStart.origin.z);
			// console.log("RAY START DIR: ",rayStart.direction.x, rayStart.direction.y, rayStart.direction.z);

			// console.log("RAY STOP: ",rayEnd.origin.x,  rayEnd.origin.y, rayEnd.origin.z);
			// console.log("RAY STOP DIR : ",rayEnd.direction.x, rayEnd.direction.y, rayEnd.direction.z);


			// const arrowHelperStart = new THREE.ArrowHelper(rayStart.direction.clone().normalize(), rayStart.origin, 50, 0xff0000, 3, 2);
			// this.viewer.scene.scene.add(arrowHelperStart);
			// const arrowHelperEnd = new THREE.ArrowHelper( rayEnd.direction.clone().normalize(), rayEnd.origin, 60, 0x0000ff, 3, 2);
			// this.viewer.scene.scene.add(arrowHelperEnd);



			// let caster1=new THREE.Raycaster(rayStart.origin, rayStart.direction.clone().normalize(), 0, 10000);
			// let caster2=new THREE.Raycaster(rayEnd.origin, rayEnd.direction.clone().normalize(), 0, 10000);

			// let intersections=[]
			// intersections=caster1.intersectObjects(plane);






			/////////////////////////////////////////////////////////////////




			this.removeEventListener("drag", drag);
			this.removeEventListener("drop", drop);

			let allPointsNear = [];
			let allPointsFar = [];

			// TODO support more than one point cloud
			//iterate over all pointclouds and raycast them
			for (let pointcloud of this.viewer.scene.pointclouds) {

				if (!pointcloud.visible) {
					continue;
				}

				let volCam = camera.clone();
				volCam.left = -volume.scale.x / 2;
				volCam.right = +volume.scale.x / 2;
				volCam.top = +volume.scale.y / 2;
				volCam.bottom = -volume.scale.y / 2;
				volCam.near = -volume.scale.z / 2;
				volCam.far = +volume.scale.z / 2;
				volCam.rotation.copy(volume.rotation);
				volCam.position.copy(volume.position);

				volCam.updateMatrix();
				volCam.updateMatrixWorld();
				volCam.updateProjectionMatrix();
				volCam.matrixWorldInverse.copy(volCam.matrixWorld).invert();

				let volpos = volCam.getWorldPosition(new THREE.Vector3())
				let voldir = volCam.getWorldDirection(new THREE.Vector3())
				let ray = new THREE.Ray(volpos, voldir);

				//computes inverse ray
				let rayInverse = new THREE.Ray(
					ray.origin.clone().add(ray.direction.clone().multiplyScalar(volume.scale.z)),
					ray.direction.clone().multiplyScalar(-1));


				let pickerSettings = {
					width: 8,
					height: 8,
					pickWindowSize: 8,
					all: true,
					pickClipped: true,
					pointSizeType: PointSizeType.FIXED,
					pointSize: 7
				};

				let pointsNear = pointcloud.pick(viewer, volCam, ray, pickerSettings);

				volCam.rotateX(Math.PI);
				volCam.updateMatrix();
				volCam.updateMatrixWorld();
				volCam.updateProjectionMatrix();
				volCam.matrixWorldInverse.copy(volCam.matrixWorld).invert();
				let pointsFar = pointcloud.pick(viewer, volCam, rayInverse, pickerSettings);

				allPointsNear.push(...pointsNear);
				allPointsFar.push(...pointsFar);
			}

			//near points appear at the back while far points appear at the front, check it twice

			//debugging
			console.log("Total points raycasted:", allPointsNear.length, allPointsFar.length);

			//adds all points
			if (allPointsNear.length > 0 && allPointsFar.length > 0) {
				let viewLine = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

				let closestOnLine = allPointsNear.map(p => viewLine.closestPointToPoint(p.position, false, new THREE.Vector3()));
				let closest = closestOnLine.sort((a, b) => ray.origin.distanceTo(a) - ray.origin.distanceTo(b))[0];

				let farthestOnLine = allPointsFar.map(p => viewLine.closestPointToPoint(p.position, false, new THREE.Vector3()));
				let farthest = farthestOnLine.sort((a, b) => ray.origin.distanceTo(b) - ray.origin.distanceTo(a))[0];

				let distance = closest.distanceTo(farthest);
				let centroid = new THREE.Vector3().addVectors(closest, farthest).multiplyScalar(0.5);
				volume.scale.z = distance * 1.1;
				volume.position.copy(centroid);

				volume.initialized = true;
				volume.visible = true;
			} else {
				this.viewer.scene.removeVolume(volume);
				return;
			}

			volume.clip = true;

		};

		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);

		viewer.inputHandler.addInputListener(this);

		return volume;
	}

	update(e) {
		//console.log(e.delta)
	}

	render() {
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}