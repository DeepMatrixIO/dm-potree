// import * as THREE from "../../libs/js/build/module.js";
import {DoubleSide, Mesh, MeshBasicMaterial, Object3D, Raycaster, TextureLoader, Vector2, Vector3} from 'three';

export class NavigationCube extends Object3D {

	constructor(viewer){
		super();

		this.viewer = viewer;

		let createPlaneMaterial = (img) => {
			let material = new MeshBasicMaterial( {
				depthTest: true,
				depthWrite: true,
				side: DoubleSide
			});
			new TextureLoader().load(
				exports.resourcePath + '/textures/navigation/' + img,
				function(texture) {
					texture.anisotropy = viewer.renderer.capabilities.getMaxAnisotropy();
					material.map = texture;
					material.needsUpdate = true;
				});
			return material;
		};

		let planeGeometry = new PlaneGeometry(1, 1);

		this.front = new Mesh(planeGeometry, createPlaneMaterial('F.png'));
		this.front.position.y = -0.5;
		this.front.rotation.x = Math.PI / 2.0;
		this.front.updateMatrixWorld();
		this.front.name = "F";
		this.add(this.front);

		this.back = new Mesh(planeGeometry, createPlaneMaterial('B.png'));
		this.back.position.y = 0.5;
		this.back.rotation.x = Math.PI / 2.0;
		this.back.updateMatrixWorld();
		this.back.name = "B";
		this.add(this.back);

		this.left = new Mesh(planeGeometry, createPlaneMaterial('L.png'));
		this.left.position.x = -0.5;
		this.left.rotation.y = Math.PI / 2.0;
		this.left.updateMatrixWorld();
		this.left.name = "L";
		this.add(this.left);

		this.right = new Mesh(planeGeometry, createPlaneMaterial('R.png'));
		this.right.position.x = 0.5;
		this.right.rotation.y = Math.PI / 2.0;
		this.right.updateMatrixWorld();
		this.right.name = "R";
		this.add(this.right);

		this.bottom = new Mesh(planeGeometry, createPlaneMaterial('D.png'));
		this.bottom.position.z = -0.5;
		this.bottom.updateMatrixWorld();
		this.bottom.name = "D";
		this.add(this.bottom);

		this.top = new Mesh(planeGeometry, createPlaneMaterial('U.png'));
		this.top.position.z = 0.5;
		this.top.updateMatrixWorld();
		this.top.name = "U";
		this.add(this.top);

		this.width = 150; // in px

		this.camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
		this.camera.position.copy(new Vector3(0, 0, 0));
		this.camera.lookAt(new Vector3(0, 1, 0));
		this.camera.updateMatrixWorld();
		this.camera.rotation.order = "ZXY";

		let onMouseDown = (event) => {
			if (!this.visible) {
				return;
			}

			this.pickedFace = null;
			let mouse = new Vector2();
			mouse.x = event.clientX - (window.innerWidth - this.width);
			mouse.y = event.clientY;

			if(mouse.x < 0 || mouse.y > this.width) return;

			mouse.x = (mouse.x / this.width) * 2 - 1;
			mouse.y = -(mouse.y / this.width) * 2 + 1;

			let raycaster = new Raycaster();
			raycaster.setFromCamera(mouse, this.camera);
			raycaster.ray.origin.sub(this.camera.getWorldDirection(new Vector3()));

			let intersects = raycaster.intersectObjects(this.children);

			let minDistance = 1000;
			for (let i = 0; i < intersects.length; i++) {
				if(intersects[i].distance < minDistance) {
					this.pickedFace = intersects[i].object.name;
					minDistance = intersects[i].distance;
				}
			}

			if(this.pickedFace) {
				this.viewer.setView(this.pickedFace);
			}
		};

		this.viewer.renderer.domElement.addEventListener('mousedown', onMouseDown, false);
	}

	update(rotation) {
		this.camera.rotation.copy(rotation);
		this.camera.updateMatrixWorld();
	}

}
