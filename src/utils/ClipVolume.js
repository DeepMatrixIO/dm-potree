
// import * as THREE from "../../libs/js/build/module.js";
import {Vector3,Vector4,Sphere,BufferGeometry, Mesh, MeshBasicMaterial, CylinderGeometry, BoxGeometry, LineBasicMaterial, Line,  LineSegments,  Object3D} from 'three'

export class ClipVolume extends Object3D {

	_groupId = 0; // used to group volumes, e.g. for filtering
	constructor(args) {
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "clip_volume_" + this.constructor.counter;

		let alpha = args.alpha || 0;
		let beta = args.beta || 0;
		let gamma = args.gamma || 0;

		this.rotation.x = alpha;
		this.rotation.y = beta;
		this.rotation.z = gamma;

		this.clipOffset = 0.001;
		this.clipRotOffset = 1;

		let boxGeometry = new BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();

		let boxFrameGeometry = new BufferGeometry();
		//let boxFrameGeometry = new Geometry();
		{
			// bottom
			boxFrameGeometry.vertices.push(new Vector3(-0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, -0.5, 0.5));
			// top
			boxFrameGeometry.vertices.push(new Vector3(-0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, 0.5, 0.5));
			// sides
			boxFrameGeometry.vertices.push(new Vector3(-0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new Vector3(-0.5, 0.5, -0.5));

			boxFrameGeometry.colors.push(new Vector3(1, 1, 1));
		}

		//let planeFrameGeometry = new Geometry();
		let planeFrameGeometry = new BufferGeometry();
		{
			// middle line
			planeFrameGeometry.vertices.push(new Vector3(-0.5, -0.5, 0.0));
			planeFrameGeometry.vertices.push(new Vector3(-0.5, 0.5, 0.0));
			planeFrameGeometry.vertices.push(new Vector3(0.5, 0.5, 0.0));
			planeFrameGeometry.vertices.push(new Vector3(0.5, -0.5, 0.0));
			planeFrameGeometry.vertices.push(new Vector3(-0.5, 0.5, 0.0));
			planeFrameGeometry.vertices.push(new Vector3(0.5, 0.5, 0.0));
			planeFrameGeometry.vertices.push(new Vector3(-0.5, -0.5, 0.0));
			planeFrameGeometry.vertices.push(new Vector3(0.5, -0.5, 0.0));
		}

		this.dimension = new Vector3(1, 1, 1);
		this.material = new MeshBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.3,
			depthTest: true,
			depthWrite: false
		});
		this.box = new Mesh(boxGeometry, this.material);
		this.box.geometry.computeBoundingBox();
		this.boundingBox = this.box.geometry.boundingBox;
		this.add(this.box);

		this.frame = new LineSegments(boxFrameGeometry, new LineBasicMaterial({color: 0x000000}));
		this.add(this.frame);
		this.planeFrame = new LineSegments(planeFrameGeometry, new LineBasicMaterial({color: 0xff0000}));
		this.add(this.planeFrame);

		// set default thickness
		this.setScaleZ(0.1);

		// create local coordinate system
		let createArrow = (name, direction, color) => {
			let material = new MeshBasicMaterial({
				color: color,
				depthTest: false,
				depthWrite: false
			});

			//let shaftGeometry = new Geometry();
			let shaftGeometry = new BufferGeometry();
			shaftGeometry.vertices.push(new Vector3(0, 0, 0));
			shaftGeometry.vertices.push(new Vector3(0, 1, 0));

			let shaftMaterial = new LineBasicMaterial({
				color: color,
				depthTest: false,
				depthWrite: false,
				transparent: true
			});
			let shaft = new Line(shaftGeometry, shaftMaterial);
			shaft.name = name + "_shaft";

			let headGeometry = new CylinderGeometry(0, 0.04, 0.1, 10, 1, false);
			let headMaterial = material;
			let head = new Mesh(headGeometry, headMaterial);
			head.name = name + "_head";
			head.position.y = 1;

			let arrow = new Object3D();
			arrow.name = name;
			arrow.add(shaft);
			arrow.add(head);

			return arrow;
		};

		this.arrowX = createArrow("arrow_x", new Vector3(1, 0, 0), 0xFF0000);
		this.arrowY = createArrow("arrow_y", new Vector3(0, 1, 0), 0x00FF00);
		this.arrowZ = createArrow("arrow_z", new Vector3(0, 0, 1), 0x0000FF);

		this.arrowX.rotation.z = -Math.PI / 2;
		this.arrowZ.rotation.x = Math.PI / 2;

		this.arrowX.visible = false;
		this.arrowY.visible = false;
		this.arrowZ.visible = false;

		this.add(this.arrowX);
		this.add(this.arrowY);
		this.add(this.arrowZ);

		{ // event listeners
			this.addEventListener("ui_select", e => {
				this.arrowX.visible = true;
				this.arrowY.visible = true;
				this.arrowZ.visible = true;
			});
			this.addEventListener("ui_deselect", e => {
				this.arrowX.visible = false;
				this.arrowY.visible = false;
				this.arrowZ.visible = false;
			});
			this.addEventListener("select", e => {
				let scene_header = document.querySelector(`#${this.name} .scene_header`);
				if (scene_header) {
					let next = scene_header.nextElementSibling;
					let isVisible = next && getComputedStyle(next).display !== "none" && next.offsetParent !== null;
					if (!isVisible) {
						scene_header.click();
					}
				}
			});
			this.addEventListener("deselect", e => {
				let scene_header = document.querySelector(`#${this.name} .scene_header`);
				if (scene_header) {
					let next = scene_header.nextElementSibling;
					let isVisible = next && getComputedStyle(next).display !== "none" && next.offsetParent !== null;
					if (isVisible) {
						scene_header.click();
					}
				}
			});
		}

		this.update();
	};


	get groupId() {
		return this._groupId;
	}
	set groupId(value) {
			this._groupId = value;
	}


	setClipOffset(offset) {
		this.clipOffset = offset;
	}

	setClipRotOffset(offset) {
		this.clipRotOffset = offset;
	}

	setScaleX(x) {
		this.box.scale.x = x;
		this.frame.scale.x = x;
		this.planeFrame.scale.x = x;
	}

	setScaleY(y) {
		this.box.scale.y = y;
		this.frame.scale.y = y;
		this.planeFrame.scale.y = y;
	}

	setScaleZ(z) {
		this.box.scale.z = z;
		this.frame.scale.z = z;
		this.planeFrame.scale.z = z;
	}

	offset(args) {
		let cs = args.cs || null;
		let axis = args.axis || null;
		let dir = args.dir || null;

		if (!cs || !axis || !dir) return;

		if (axis === "x") {
			if (cs === "local") {
				this.position.add(this.localX.clone().multiplyScalar(dir * this.clipOffset));
			} else if (cs === "global") {
				this.position.x = this.position.x + dir * this.clipOffset;
			}
		} else if (axis === "y") {
			if (cs === "local") {
				this.position.add(this.localY.clone().multiplyScalar(dir * this.clipOffset));
			} else if (cs === "global") {
				this.position.y = this.position.y + dir * this.clipOffset;
			}
		} else if (axis === "z") {
			if (cs === "local") {
				this.position.add(this.localZ.clone().multiplyScalar(dir * this.clipOffset));
			} else if (cs === "global") {
				this.position.z = this.position.z + dir * this.clipOffset;
			}
		}

		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
	}

	rotate(args) {
		let cs = args.cs || null;
		let axis = args.axis || null;
		let dir = args.dir || null;

		if (!cs || !axis || !dir) return;

		if (cs === "local") {
			if (axis === "x") {
				this.rotateOnAxis(new Vector3(1, 0, 0), dir * this.clipRotOffset * Math.PI / 180);
			} else if (axis === "y") {
				this.rotateOnAxis(new Vector3(0, 1, 0), dir * this.clipRotOffset * Math.PI / 180);
			} else if (axis === "z") {
				this.rotateOnAxis(new Vector3(0, 0, 1), dir * this.clipRotOffset * Math.PI / 180);
			}
		} else if (cs === "global") {
			let rotaxis = new Vector4(1, 0, 0, 0);
			if (axis === "y") {
				rotaxis = new Vector4(0, 1, 0, 0);
			} else if (axis === "z") {
				rotaxis = new Vector4(0, 0, 1, 0);
			}
			this.updateMatrixWorld();
			let invM = newthis.matrixWorld.clone().invert();
			rotaxis = rotaxis.applyMatrix4(invM).normalize();
			rotaxis = new Vector3(rotaxis.x, rotaxis.y, rotaxis.z);
			this.rotateOnAxis(rotaxis, dir * this.clipRotOffset * Math.PI / 180);
		}

		this.updateLocalSystem();

		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
	}

	update() {
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere(new Sphere());

		this.box.visible = false;

		this.updateLocalSystem();
	};

	updateLocalSystem() {
		// extract local coordinate axes
		let rotQuat = this.getWorldQuaternion();
		this.localX = new Vector3(1, 0, 0).applyQuaternion(rotQuat).normalize();
		this.localY = new Vector3(0, 1, 0).applyQuaternion(rotQuat).normalize();
		this.localZ = new Vector3(0, 0, 1).applyQuaternion(rotQuat).normalize();
	}

	raycast(raycaster, intersects) {

		let is = [];
		this.box.raycast(raycaster, is);

		if (is.length > 0) {
			let I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	};
};
