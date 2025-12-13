
// import * as THREE from "../../libs/js/build/module.js";
import {Vector3, LinearFilter, FloatType, RGBAFormat, UnsignedIntType, PerspectiveCamera, WebGLRenderTarget, DepthTexture} from 'three'
export class PointCloudSM{

	constructor(potreeRenderer){

		this.potreeRenderer = potreeRenderer;
		this.threeRenderer = this.potreeRenderer.threeRenderer;

		this.target = new WebGLRenderTarget(2 * 1024, 2 * 1024, {
			minFilter: LinearFilter,
			magFilter: LinearFilter,
			format: RGBAFormat,
			type: FloatType
		});
		this.target.depthTexture = new DepthTexture();
		this.target.depthTexture.type = UnsignedIntType;

		//this.threeRenderer.setClearColor(0x000000, 1);
		this.threeRenderer.setClearColor(0xff0000, 1);

		//HACK? removed while moving to js 109
		//this.threeRenderer.clearTarget(this.target, true, true, true);
		{
			const oldTarget = this.threeRenderer.getRenderTarget();

			this.threeRenderer.setRenderTarget(this.target);
			this.threeRenderer.clear(true, true, true);

			this.threeRenderer.setRenderTarget(oldTarget);
		}
	}

	setLight(light){
		this.light = light;

		let fov = (180 * light.angle) / Math.PI;
		let aspect = light.shadow.mapSize.width / light.shadow.mapSize.height;
		let near = 0.1;
		let far = light.distance === 0 ? 10000 : light.distance;
		this.camera = new PerspectiveCamera(fov, aspect, near, far);
		this.camera.up.set(0, 0, 1);
		this.camera.position.copy(light.position);

		let target = new Vector3().subVectors(light.position, light.getWorldDirection(new Vector3()));
		this.camera.lookAt(target);

		this.camera.updateProjectionMatrix();
		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
		this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
	}

	setSize(width, height){
		if(this.target.width !== width || this.target.height !== height){
			this.target.dispose();
		}
		this.target.setSize(width, height);
	}

	render(scene, camera){

		this.threeRenderer.setClearColor(0x000000, 1);

		const oldTarget = this.threeRenderer.getRenderTarget();

		this.threeRenderer.setRenderTarget(this.target);
		this.threeRenderer.clear(true, true, true);

		this.potreeRenderer.render(scene, this.camera, this.target, {});

		this.threeRenderer.setRenderTarget(oldTarget);
	}


}