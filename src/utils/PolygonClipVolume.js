
//import {modelWorldMatrix} from "three/tsl";
import * as THREE from "../../libs/three.js/build/three.module.js";
import {FilterIntType} from "./FilterConsts.js";




export class PolygonClipVolume extends THREE.Object3D {

	//may be removed
	NONE_TASK = 0;
	SELECTION_TASK = 1; // default task
	CLASSIFICATION_TASK = 2;
	DELETION_TASK = 3;


	constructor(camera) {
		super();
		this.intType = FilterIntType.POLYGON; // PolygonClipVolume type, can be set by user
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "polygon_clip_volume_" + this.constructor.counter;

		this.camera = camera.clone();
		this.camera.rotation.set(...camera.rotation.toArray()); // [r85] workaround because camera.clone() doesn't work on rotation
		this.camera.rotation.order = camera.rotation.order;
		this.camera.updateMatrixWorld();
		this.camera.updateProjectionMatrix();
		this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

		this.viewMatrix = this.camera.matrixWorldInverse.clone();
		this.projMatrix = this.camera.projectionMatrix.clone();

		// projected markers
		this.markers = [];
		this.initialized = false;

		this.maxPolygonVertices = 64;//also in Clipping Tool.js, update in potreeRenderer
				// this.maxPolygonVertices = 16;//also in Clipping Tool.js, update in potreeRenderer

		//adding color per PolygonClipVolume
		this.color = new THREE.Color(0xff0000); // default color

		this.task = this.SELECTION_TASK; // default task, selection, used for subcode
		this.visible = true; // default visibility
	}

	addMarker() {

		let marker = new THREE.Mesh();

		let cancel;

		let drag = e => {
			let size = e.viewer.renderer.getSize(new THREE.Vector2());
			let projectedPos = new THREE.Vector3(
				2.0 * (e.drag.end.x / size.width) - 1.0,
				-2.0 * (e.drag.end.y / size.height) + 1.0,
				0
			);

			marker.position.copy(projectedPos);
		};

		let drop = e => {
			cancel();
		};

		cancel = e => {
			marker.removeEventListener("drag", drag);
			marker.removeEventListener("drop", drop);
		};

		marker.addEventListener("drag", drag);
		marker.addEventListener("drop", drop);


		this.markers.push(marker);


		//marker.dispatchEvent({type: "drag", viewer: viewer});//this is added to complete the drag event
		drag({
			viewer: viewer,
			drag: {
				end: viewer.inputHandler.mouse
			}
		})
	}

	removeLastMarker() {
		if (this.markers.length > 0) {
			this.markers.splice(this.markers.length - 1, 1);
		}
	}


	//basically, a polygonClipPolygon is  created from a camera and markers
	//items to be stored?  camera?? too much
	// rotation
	//rotation order
	//camera.matrixWorld

	toJSON() {

		const cameraData = {
			// Camera type
			type: this.camera.type,


			// Transform
			position: this.camera.position.toArray(),
			rotation: this.camera.rotation.toArray(),
			quaternion: this.camera.quaternion.toArray(),
			scale: this.camera.scale.toArray(),
			rotationOrder: this.camera.rotation.order,

			// Optional matrices if needed
			matrix: this.camera.matrix.toArray(),
			matrixWorld: this.camera.matrixWorld.toArray(),
			projectionMatrix: this.camera.projectionMatrix.toArray()
		};





		//camera data is to be stored either as perspective or ortographic parameters
		if (this.camera.type === "PerspectiveCamera") {

			cameraData.fov = this.camera.fov;
			cameraData.aspect = this.camera.aspect;
			cameraData.near = this.camera.near;
			cameraData.far = this.camera.far;
			cameraData.zoom = this.camera.zoom;

		} else if (this.camera.type == "OrthographicCamera") {
			// Ortho cameras need different parameters

			cameraData.left = this.camera.left;
			cameraData.right = this.camera.right;
			cameraData.top = this.camera.top;
			cameraData.bottom = this.camera.bottom;
			cameraData.near = this.camera.near;
			cameraData.far = this.camera.far;


		}




		let data = {
			uuid: this.uuid,//ok
			name: this.name,//ok
			markers: this.markers.map(m => m.position.toArray()),//ok
			color: this.color.getHex(),//ok
			task: this.task,//ok
			camera: cameraData,//ok, but not used in potreeRenderer
			initialized: this.initialized,//ok???
			visible: this.visible,
			intType: this.intType,//ok, but not used in potreeRenderer
			//maxPolygonVertices: this.maxPolygonVertices,//internal static???
			//modelWorldMatrix: this.modelWorldMatrix.toArray(),

			// viewMatrix: this.viewMatrix.toArray(),//created during construction
			// projMatrix: this.projMatrix.toArray(),

		};

		return data;
	}

	static fromJSON(data) {
		let newCamera = null;
		if (data.camera.type === "PerspectiveCamera") {
			newCamera = new THREE.PerspectiveCamera(
				data.camera.fov,
				data.camera.aspect,
				data.camera.near,
				data.camera.far
			);
		} else if (data.camera.type == "OrthographicCamera") {
			// Ortho cameras need different parameters
			newCamera = new THREE.OrthographicCamera(
				data.camera.left,
				data.camera.right,
				data.camera.top,
				data.camera.bottom,
				data.camera.near,
				data.camera.far
			);
		}
		if (data.camera.position) {
			newCamera.position.fromArray(data.camera.position);
		}

		// Apply rotation
		if (data.camera.rotation) {
			newCamera.rotation.fromArray(data.camera.rotation);
			if (data.camera.rotationOrder) {
				newCamera.rotation.order = data.camera.rotationOrder;
			}
		}

		// Update matrices
		newCamera.updateMatrix();
		newCamera.updateMatrixWorld(true);
		newCamera.updateProjectionMatrix();



		let tmp = new PolygonClipVolume(newCamera);


		tmp.uuid = data.uuid;
		tmp.name = data.name;
		tmp.color.setHex(data.color);
		tmp.task = data.task;
		tmp.initialized = data.initialized || false; // default to false if not provided


		tmp.markers = [];
		for (let markerData of data.markers) {
			let marker = new THREE.Mesh();
			marker.position.fromArray(markerData);
			tmp.markers.push(marker);
			console.log(marker)
		}
		tmp.visible = data.visible !== undefined ? data.visible : true; // default to true if not provided
		tmp.intType = data.intType || FilterIntType.POLYGON; // default to POLYGON if not provided
		return tmp;
	}


	getIntType() {
		return this.intType;
	}

};