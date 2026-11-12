
// import * as THREE from "../../libs/js/build/module.js";
import {Vector3,Matrix4,BufferGeometry, Mesh, LineBasicMaterial,  LineSegments, BufferAttribute, Object3D, SphereGeometry, Quaternion, MeshNormalMaterial} from 'three'
export class SpotLightHelper extends Object3D{

	constructor(light, color){
		super();

		this.light = light;
		this.color = color;

		//this.up.set(0, 0, 1);
		this.updateMatrix();
		this.updateMatrixWorld();

		{ // SPHERE
			let sg = new SphereGeometry(1, 32, 32);
			let sm = new MeshBasicMaterial({color: 0x00ff88, depthTest: false});
			this.sphere = new Mesh(sg, sm);
			this.sphere.scale.set(2, 2, 2);
			this.sphere.renderOrder = 9999;
			this.add(this.sphere);
		}

		{ // LINES


			let positions = new Float32Array([
				+0, +0, +0,     +0, +0, -1,

				+0, +0, +0,     -1, -1, -1,
				+0, +0, +0,     +1, -1, -1,
				+0, +0, +0,     +1, +1, -1,
				+0, +0, +0,     -1, +1, -1,

				-1, -1, -1,     +1, -1, -1,
				+1, -1, -1,     +1, +1, -1,
				+1, +1, -1,     -1, +1, -1,
				-1, +1, -1,     -1, -1, -1,
			]);

			let geometry = new BufferGeometry();
			geometry.setAttribute("position", new BufferAttribute(positions, 3));

			let material = new LineBasicMaterial({
				color: this.color !== undefined ? this.color : 0xffff00,
				depthTest: false
			});

			this.frustum = new LineSegments(geometry, material);
			this.frustum.renderOrder = 9999;
			this.add(this.frustum);

		}

		this.update();
	}

	update(){

		this.light.updateMatrix();
		this.light.updateMatrixWorld();

		let position = this.light.position;
		let targetPos;
		if (this.light.target) {
			this.light.target.updateMatrixWorld();
			targetPos = this.light.target.getWorldPosition(new Vector3());
		} else {
			targetPos = new Vector3().addVectors(
				position, this.light.getWorldDirection(new Vector3()).multiplyScalar(-1));
		}

		let dir = new Vector3().subVectors(targetPos, position).normalize();
		let up = new Vector3(0, 0, 1);
		if (Math.abs(dir.dot(up)) > 0.99) {
			up.set(0, 1, 0);
		}

		let quat = new Quaternion().setFromRotationMatrix(
			new Matrix4().lookAt( position, targetPos, up )
		);

		this.setRotationFromQuaternion(quat);
		this.position.copy(position);
		this.updateMatrix();
		this.updateMatrixWorld(true);

		let coneLength = (this.light.distance > 0) ? this.light.distance : 1000;
		let coneWidth = coneLength * Math.tan( this.light.angle * 0.5 );

		this.frustum.scale.set(coneWidth, coneWidth, coneLength);

		let sphereRadius = Math.max(coneLength * 0.015, 0.5);
		this.sphere.scale.set(sphereRadius, sphereRadius, sphereRadius);
	}

}