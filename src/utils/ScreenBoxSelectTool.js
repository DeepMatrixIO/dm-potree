
import * as THREE from "../../libs/three.js/build/three.module.js";
import {BoxVolume} from "./Volume.js";
import {Utils} from "../utils.js";
import {PointSizeType} from "../defines.js";
import {EventDispatcher} from "../EventDispatcher.js";
import {KeyCodes} from "../KeyCodes.js";


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

		this.viewer.dispatchEvent({
			type: "cancel_insertions", source: volume, reason: "start_insertion"
		});
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

			let camera = e.viewer.scene.getActiveCamera();
			let size = e.viewer.renderer.getSize(new THREE.Vector2());

			//checking box size
			let xSize = e.drag.end.x - e.drag.start.x
			let ySize = e.drag.end.y - e.drag.start.y
			// console.log("Box bounds:  START", e.drag.start.x, e.drag.start.y, " END: ", e.drag.end.x, e.drag.end.y);
			// console.log("Box size: ", xSize, ySize);

			let minAllowedSize = 20;
			let boxSize = Math.sqrt(xSize * xSize + ySize * ySize)
			if (boxSize < minAllowedSize) {
				console.warn("Box size is too small, minimum allowed size is: ", minAllowedSize);
				// this.viewer.scene.removeVolume(volume);
				this.cancelInsertion(volume);
				return;

			}



			let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			// console.log("Screen Size: ", viewer.renderArea.offsetWidth, viewer.renderArea.offsetHeight);
			// console.log("screenCentroid: ", screenCentroid.x, screenCentroid.y);
			//let ray = mouseToRayOrtho(screenCentroid, camera, size.width, size.height);
			let ray = Utils.mouseToRay(screenCentroid, camera, size.width, size.height);
			//ray in orto returns the mouse in screen coords based on ortho proj
			// console.log("ray origin: ", ray.origin.x, ray.origin.y, ray.origin.z);
			// console.log("ray direction: ", ray.direction.x, ray.direction.y, ray.direction.z);

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
					width: 65,//65
					height: 65,
					pickWindowSize: 65,
					all: true,
					pickClipped: true,
					pointSizeType: PointSizeType.FIXED,
					pointSize: 3, //less than half of the pickWindowSize
					// x:-64,
					// y:-64,
					// pickOutsideClipRegion: true //not in use
				};

				// console.log("Finding Near points...");

				//pick is based on the actual camera view planes.
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
			// console.log("Total points picked:", allPointsNear.length, allPointsFar.length);

			//adds all points

			if (allPointsNear.length === 0 && allPointsFar.length >= 0) {
				// console.log("Invalid BoxVolume. Removing")
				//this.viewer.scene.removeVolume(volume);
				this.cancelInsertion(volume);
				return;
			}

			 if (allPointsNear.length > 0 && allPointsFar.length > 0) {
			// if (allPointsNear.length > 0 && allPointsFar.length === 0) {
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

				this.viewer.inputHandler.removeEventListener("keydown", cancelKey);

			}
			if (allPointsNear.length > 0 && allPointsFar.length === 0) {
				// console.log("TESTING Only near points found , creating a far distance");

				let viewLine = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

				let closestOnLine = allPointsNear.map(p => viewLine.closestPointToPoint(p.position, false, new THREE.Vector3()));
				//let closest = closestOnLine.sort((a, b) => ray.origin.distanceTo(a) - ray.origin.distanceTo(b))[0];
				let sorted = closestOnLine.sort((a, b) => ray.origin.distanceTo(a) - ray.origin.distanceTo(b));

				let closest = sorted.at(0);
				let farthest = sorted.at(-1);


				// console.log("Closest: ", closest.x, closest.y, closest.z);
				// console.log("Farthest: ", farthest.x, farthest.y, farthest.z);

				let centroid = new THREE.Vector3().addVectors(closest, farthest).multiplyScalar(0.5);
				// console.log("Centroid: ", centroid.x, centroid.y, centroid.z);
				let distance = closest.distanceTo(farthest);

				volume.scale.z = distance * 1.1;
				volume.position.copy(centroid);

				volume.initialized = true;
				volume.visible = true;

				this.viewer.inputHandler.removeEventListener("keydown", cancelKey);


			}






			volume.clip = true;

		};

		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);

		let cancelKey = e => {
			// console.log("Pressing cancel key ", e.key)
			if (e.keyCode === KeyCodes.ESCAPE) {
				$(selectionBox).remove();
				this.viewer.dispatchEvent({type: "cancel_insertions"}, {
					source: volume,
					reason: "cancel_insertion"
				});
				// this.cancelInsertion(volume);

			} else {
				console.warn("Unknown key pressed for canceling insertion: ", e.key);
			}
		};

		viewer.inputHandler.addEventListener("keydown", cancelKey);

		this.viewer.addEventListener("cancel_insertions", e => {
			// console.log("Canceling insertion");

			this.cancelInsertion(volume);
			this.viewer.inputHandler.removeEventListener("keydown", cancelKey);

		});



		viewer.inputHandler.addInputListener(this);

		return volume;
	}

	//triggered by user pressing ESCAPE or other cancelWe said it also Bank of America.  action
	cancelInsertion(volume) {
		if (volume.initialized) {
			return;
		}
		this.removeEventListener("drag");
		this.removeEventListener("drop");
		// $(selectionBox).remove();//still jquery
		// this.viewer.scene.removeVolume(volume);
		this.viewer.scene.removeMixedFilter(volume);
		// this.dispatchEvent({type: "volume_insertion_canceled", volume: volume});

		this.viewer.inputHandler.deselectAll();
		this.viewer.inputHandler.removeInputListener(this);




	}


	update(e) {
		//console.log(e.delta)
	}

	render() {
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}