
// see http://john-chapman-graphics.blogspot.co.at/2013/01/ssao-tutorial.html

// import * as THREE from "../../libs/js/build/module.js";
import {ShaderMaterial} from 'three';
Potree.BlurMaterial = class BlurMaterial extends ShaderMaterial {

	constructor(parameters = {}) {
		super();
		this.glslVersion = GLSL3;
		let uniforms = {
			near: {type: 'f', value: 0},
			far: {type: 'f', value: 0},
			screenWidth: {type: 'f', value: 0},
			screenHeight: {type: 'f', value: 0},
			map: {type: 't', value: null}
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: Potree.Shaders['blur.vs'],
			fragmentShader: Potree.Shaders['blur.fs']
		});
	}
};

