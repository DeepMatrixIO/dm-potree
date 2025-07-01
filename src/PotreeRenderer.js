
import {max, mix} from "three/tsl";
import * as THREE from "../libs/three.js/build/three.module.js";
import {PointCloudTree} from "./PointCloudTree.js";
import {ClipTask, ElevationGradientRepeat, PointSizeType} from "./defines.js";
import {FilterConstListType, FilterIntType} from "./utils/FilterConsts.js";
import {PointCloudFilterList} from "./utils/Filter.js";

// Copied from three.js: WebGLRenderer.js
function paramThreeToGL(_gl, p) {

	let extension;

	if (p === THREE.RepeatWrapping) return _gl.REPEAT;
	if (p === THREE.ClampToEdgeWrapping) return _gl.CLAMP_TO_EDGE;
	if (p === THREE.MirroredRepeatWrapping) return _gl.MIRRORED_REPEAT;

	if (p === THREE.NearestFilter) return _gl.NEAREST;
	if (p === THREE.NearestMipMapNearestFilter) return _gl.NEAREST_MIPMAP_NEAREST;
	if (p === THREE.NearestMipMapLinearFilter) return _gl.NEAREST_MIPMAP_LINEAR;

	if (p === THREE.LinearFilter) return _gl.LINEAR;
	if (p === THREE.LinearMipMapNearestFilter) return _gl.LINEAR_MIPMAP_NEAREST;
	if (p === THREE.LinearMipMapLinearFilter) return _gl.LINEAR_MIPMAP_LINEAR;

	if (p === THREE.UnsignedByteType) return _gl.UNSIGNED_BYTE;
	if (p === THREE.UnsignedShort4444Type) return _gl.UNSIGNED_SHORT_4_4_4_4;
	if (p === THREE.UnsignedShort5551Type) return _gl.UNSIGNED_SHORT_5_5_5_1;
	//if (p === THREE.UnsignedShort565Type) return _gl.UNSIGNED_SHORT_5_6_5;// removed from 136 to 137, use UnsignedShort5551Type isntead


	if (p === THREE.ByteType) return _gl.BYTE;
	if (p === THREE.ShortType) return _gl.SHORT;
	if (p === THREE.UnsignedShortType) return _gl.UNSIGNED_SHORT;
	if (p === THREE.IntType) return _gl.INT;
	if (p === THREE.UnsignedIntType) return _gl.UNSIGNED_INT;
	if (p === THREE.FloatType) return _gl.FLOAT;

	if (p === THREE.HalfFloatType) {

		extension = extensions.get('OES_texture_half_float');

		if (extension !== null) return extension.HALF_FLOAT_OES;

	}

	if (p === THREE.AlphaFormat) return _gl.ALPHA;
	if (p === THREE.RGBFormat) return _gl.RGB;
	if (p === THREE.RGBAFormat) return _gl.RGBA;
	if (p === THREE.LuminanceFormat) return _gl.LUMINANCE;
	if (p === THREE.LuminanceAlphaFormat) return _gl.LUMINANCE_ALPHA;
	if (p === THREE.DepthFormat) return _gl.DEPTH_COMPONENT;
	if (p === THREE.DepthStencilFormat) return _gl.DEPTH_STENCIL;

	if (p === THREE.AddEquation) return _gl.FUNC_ADD;
	if (p === THREE.SubtractEquation) return _gl.FUNC_SUBTRACT;
	if (p === THREE.ReverseSubtractEquation) return _gl.FUNC_REVERSE_SUBTRACT;

	if (p === THREE.ZeroFactor) return _gl.ZERO;
	if (p === THREE.OneFactor) return _gl.ONE;
	if (p === THREE.SrcColorFactor) return _gl.SRC_COLOR;
	if (p === THREE.OneMinusSrcColorFactor) return _gl.ONE_MINUS_SRC_COLOR;
	if (p === THREE.SrcAlphaFactor) return _gl.SRC_ALPHA;
	if (p === THREE.OneMinusSrcAlphaFactor) return _gl.ONE_MINUS_SRC_ALPHA;
	if (p === THREE.DstAlphaFactor) return _gl.DST_ALPHA;
	if (p === THREE.OneMinusDstAlphaFactor) return _gl.ONE_MINUS_DST_ALPHA;

	if (p === THREE.DstColorFactor) return _gl.DST_COLOR;
	if (p === THREE.OneMinusDstColorFactor) return _gl.ONE_MINUS_DST_COLOR;
	if (p === THREE.SrcAlphaSaturateFactor) return _gl.SRC_ALPHA_SATURATE;

	if (p === THREE.RGB_S3TC_DXT1_Format || p === RGBA_S3TC_DXT1_Format ||
		p === THREE.RGBA_S3TC_DXT3_Format || p === RGBA_S3TC_DXT5_Format) {

		extension = extensions.get('WEBGL_compressed_texture_s3tc');

		if (extension !== null) {

			if (p === THREE.RGB_S3TC_DXT1_Format) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;
			if (p === THREE.RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
			if (p === THREE.RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
			if (p === THREE.RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;

		}

	}

	if (p === THREE.RGB_PVRTC_4BPPV1_Format || p === THREE.RGB_PVRTC_2BPPV1_Format ||
		p === THREE.RGBA_PVRTC_4BPPV1_Format || p === THREE.RGBA_PVRTC_2BPPV1_Format) {

		extension = extensions.get('WEBGL_compressed_texture_pvrtc');

		if (extension !== null) {

			if (p === THREE.RGB_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
			if (p === THREE.RGB_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
			if (p === THREE.RGBA_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
			if (p === THREE.RGBA_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;

		}

	}

	if (p === THREE.RGB_ETC1_Format) {

		extension = extensions.get('WEBGL_compressed_texture_etc1');

		if (extension !== null) return extension.COMPRESSED_RGB_ETC1_WEBGL;

	}

	if (p === THREE.MinEquation || p === THREE.MaxEquation) {

		extension = extensions.get('EXT_blend_minmax');

		if (extension !== null) {

			if (p === THREE.MinEquation) return extension.MIN_EXT;
			if (p === THREE.MaxEquation) return extension.MAX_EXT;

		}

	}

	if (p === UnsignedInt248Type) {

		extension = extensions.get('WEBGL_depth_texture');

		if (extension !== null) return extension.UNSIGNED_INT_24_8_WEBGL;

	}

	return 0;

};

//t his has to be changed and adjusted as location 11 does not exist on all pointclouds
let attributeLocations = {
	"position": {name: "position", location: 0},
	"color": {name: "color", location: 1},
	"rgba": {name: "color", location: 1},
	"intensity": {name: "intensity", location: 2},
	"classification": {name: "classification", location: 3},
	"returnNumber": {name: "returnNumber", location: 4},
	"return number": {name: "returnNumber", location: 4},
	"returns": {name: "returnNumber", location: 4},
	"numberOfReturns": {name: "numberOfReturns", location: 5},
	"number of returns": {name: "numberOfReturns", location: 5},
	"pointSourceID": {name: "pointSourceID", location: 6},
	"source id": {name: "pointSourceID", location: 6},
	"point source id": {name: "pointSourceID", location: 6},
	"indices": {name: "indices", location: 7},
	"normal": {name: "normal", location: 8},
	"spacing": {name: "spacing", location: 9},
	"gps-time": {name: "gpsTime", location: 10},
	"seg_cluster_id": {name: 'seg_cluster_id', location: 11},
	"aExtra": {name: "aExtra", location: 12},

	//"aExtra": {name: "aExtra", location: 7},//due to input size differences, set to 7 for testing

	//filtering attributes array
	"filterAttributes": {name: "filterAttributes", location: 13},


};

class Shader {

	constructor(gl, name, vsSource, fsSource) {
		this.gl = gl;
		this.name = name;
		this.vsSource = vsSource;
		this.fsSource = fsSource;

		this.cache = new Map();

		this.vs = null;
		this.fs = null;
		this.program = null;

		this.uniformLocations = {};
		this.attributeLocations = {};
		this.uniformBlockIndices = {};
		this.uniformBlocks = {};
		this.uniforms = {};

		this.update(vsSource, fsSource);
	}

	update(vsSource, fsSource) {
		this.vsSource = vsSource;
		this.fsSource = fsSource;

		this.linkProgram();
	}

	compileShader(shader, source) {
		let gl = this.gl;

		gl.shaderSource(shader, source);

		gl.compileShader(shader);

		let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (!success) {
			let info = gl.getShaderInfoLog(shader);
			let numberedSource = source.split("\n").map((a, i) => `${i + 1}`.padEnd(5) + a).join("\n");
			throw `could not compile shader ${this.name}: ${info}, \n${numberedSource}`;
		}
	}

	linkProgram() {

		const tStart = performance.now();

		let gl = this.gl;

		this.uniformLocations = {};
		this.attributeLocations = {};
		this.uniforms = {};

		gl.useProgram(null);

		let cached = this.cache.get(`${this.vsSource}, ${this.fsSource}`);
		if (cached) {
			this.program = cached.program;
			this.vs = cached.vs;
			this.fs = cached.fs;
			this.attributeLocations = cached.attributeLocations;
			this.uniformLocations = cached.uniformLocations;
			this.uniformBlocks = cached.uniformBlocks;
			this.uniforms = cached.uniforms;

			return;
		} else {

			this.vs = gl.createShader(gl.VERTEX_SHADER);
			this.fs = gl.createShader(gl.FRAGMENT_SHADER);
			this.program = gl.createProgram();

			for (let name of Object.keys(attributeLocations)) {
				let location = attributeLocations[name].location;
				let glslName = attributeLocations[name].name;
				gl.bindAttribLocation(this.program, location, glslName);
			}

			this.compileShader(this.vs, this.vsSource);
			this.compileShader(this.fs, this.fsSource);

			let program = this.program;

			gl.attachShader(program, this.vs);
			gl.attachShader(program, this.fs);

			gl.linkProgram(program);

			gl.detachShader(program, this.vs);
			gl.detachShader(program, this.fs);

			let success = gl.getProgramParameter(program, gl.LINK_STATUS);
			if (!success) {
				let info = gl.getProgramInfoLog(program);
				throw `could not link program ${this.name}: ${info}`;
			}

			{ // attribute locations
				let numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

				for (let i = 0;i < numAttributes;i++) {
					let attribute = gl.getActiveAttrib(program, i);

					let location = gl.getAttribLocation(program, attribute.name);

					this.attributeLocations[attribute.name] = location;
				}
			}

			{ // uniform locations
				let numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

				for (let i = 0;i < numUniforms;i++) {
					let uniform = gl.getActiveUniform(program, i);

					let location = gl.getUniformLocation(program, uniform.name);

					this.uniformLocations[uniform.name] = location;
					this.uniforms[uniform.name] = {
						location: location,
						value: null,
					};
				}
			}

			// uniform blocks
			if (gl instanceof WebGL2RenderingContext) {
				let numBlocks = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);

				for (let i = 0;i < numBlocks;i++) {
					let blockName = gl.getActiveUniformBlockName(program, i);

					let blockIndex = gl.getUniformBlockIndex(program, blockName);

					this.uniformBlockIndices[blockName] = blockIndex;

					gl.uniformBlockBinding(program, blockIndex, blockIndex);
					let dataSize = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE);

					let uBuffer = gl.createBuffer();
					gl.bindBuffer(gl.UNIFORM_BUFFER, uBuffer);
					gl.bufferData(gl.UNIFORM_BUFFER, dataSize, gl.DYNAMIC_READ);

					gl.bindBufferBase(gl.UNIFORM_BUFFER, blockIndex, uBuffer);

					gl.bindBuffer(gl.UNIFORM_BUFFER, null);

					this.uniformBlocks[blockName] = {
						name: blockName,
						index: blockIndex,
						dataSize: dataSize,
						buffer: uBuffer
					};

				}
			}

			let cached = {
				program: this.program,
				vs: this.vs,
				fs: this.fs,
				attributeLocations: this.attributeLocations,
				uniformLocations: this.uniformLocations,
				uniforms: this.uniforms,
				uniformBlocks: this.uniformBlocks,
			};

			this.cache.set(`${this.vsSource}, ${this.fsSource}`, cached);
		}

		const tEnd = performance.now();
		const duration = tEnd - tStart;

		console.log(`shader compile duration: ${duration.toFixed(3)}`);


	}

	setUniformMatrix4(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		let tmp = new Float32Array(value.elements);
		gl.uniformMatrix4fv(location, false, tmp);
	}

	setUniform1f(name, value) {
		const gl = this.gl;
		const uniform = this.uniforms[name];

		if (uniform === undefined) {
			return;
		}

		if (uniform.value === value) {
			return;
		}

		uniform.value = value;

		gl.uniform1f(uniform.location, value);
	}

	setUniformBoolean(name, value) {
		const gl = this.gl;
		const uniform = this.uniforms[name];

		if (uniform === undefined) {
			return;
		}

		if (uniform.value === value) {
			return;
		}

		uniform.value = value;

		gl.uniform1i(uniform.location, value);
	}

	setUniformTexture(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1i(location, value);
	}

	setUniform2f(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform2f(location, value[0], value[1]);
	}

	setUniform3f(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform3f(location, value[0], value[1], value[2]);
	}

	setUniform(name, value) {

		if (value.constructor === THREE.Matrix4) {
			this.setUniformMatrix4(name, value);
		} else if (typeof value === "number") {
			this.setUniform1f(name, value);
		} else if (typeof value === "boolean") {
			this.setUniformBoolean(name, value);
		} else if (value instanceof WebGLTexture) {
			this.setUniformTexture(name, value);
		} else if (value instanceof Array) {

			if (value.length === 2) {
				this.setUniform2f(name, value);
			} else if (value.length === 3) {
				this.setUniform3f(name, value);
			}

		} else {
			console.error("unhandled uniform type: ", name, value);
		}

	}


	setUniform1i(name, value) {
		let gl = this.gl;
		let location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1i(location, value);
	}

};

class WebGLTexture {

	constructor(gl, texture) {
		this.gl = gl;

		this.texture = texture;
		this.id = gl.createTexture();

		this.target = gl.TEXTURE_2D;
		this.version = -1;

		this.update(texture);
	}

	update() {

		if (!this.texture.image) {
			this.version = this.texture.version;

			return;
		}

		let gl = this.gl;
		let texture = this.texture;

		if (this.version === texture.version) {
			return;
		}

		this.target = gl.TEXTURE_2D;

		gl.bindTexture(this.target, this.id);

		let level = 0;
		let internalFormat = paramThreeToGL(gl, texture.format);
		let width = texture.image.width;
		let height = texture.image.height;
		let border = 0;
		let srcFormat = internalFormat;
		let srcType = paramThreeToGL(gl, texture.type);
		let data;

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, texture.flipY);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, texture.unpackAlignment);

		if (texture instanceof THREE.DataTexture) {
			data = texture.image.data;

			gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, paramThreeToGL(gl, texture.magFilter));
			gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, paramThreeToGL(gl, texture.minFilter));

			gl.texImage2D(this.target, level, internalFormat,
				width, height, border, srcFormat, srcType,
				data);
		} else if ((texture instanceof THREE.CanvasTexture) || (texture instanceof THREE.Texture)) {
			data = texture.image;

			gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, paramThreeToGL(gl, texture.wrapS));
			gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, paramThreeToGL(gl, texture.wrapT));

			gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, paramThreeToGL(gl, texture.magFilter));
			gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, paramThreeToGL(gl, texture.minFilter));

			gl.texImage2D(this.target, level, internalFormat,
				internalFormat, srcType, data);

			if (texture instanceof THREE.Texture) {gl.generateMipmap(gl.TEXTURE_2D);}
		}

		gl.bindTexture(this.target, null);

		this.version = texture.version;
	}

};

class WebGLBuffer {

	constructor() {
		this.numElements = 0;
		this.vao = null;
		this.vbos = new Map();
	}

};

export class Renderer {

	constructor(threeRenderer) {
		this.threeRenderer = threeRenderer;
		this.gl = this.threeRenderer.getContext();

		this.buffers = new Map();
		this.shaders = new Map();
		this.textures = new Map();

		this.glTypeMapping = new Map();
		this.glTypeMapping.set(Float32Array, this.gl.FLOAT);
		this.glTypeMapping.set(Uint8Array, this.gl.UNSIGNED_BYTE);
		this.glTypeMapping.set(Uint16Array, this.gl.UNSIGNED_SHORT);

		this.toggle = 0;
	}

	deleteBuffer(geometry) {

		let gl = this.gl;
		let webglBuffer = this.buffers.get(geometry);
		if (webglBuffer != null) {
			for (let attributeName in geometry.attributes) {
				gl.deleteBuffer(webglBuffer.vbos.get(attributeName).handle);
			}
			this.buffers.delete(geometry);
		}
	}

	createBuffer(geometry) {
		let gl = this.gl;
		let webglBuffer = new WebGLBuffer();
		webglBuffer.vao = gl.createVertexArray();
		webglBuffer.numElements = geometry.attributes.position.count;

		gl.bindVertexArray(webglBuffer.vao);

		for (let attributeName in geometry.attributes) {
			let bufferAttribute = geometry.attributes[attributeName];

			let vbo = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, bufferAttribute.array, gl.STATIC_DRAW);

			let normalized = bufferAttribute.normalized;
			let type = this.glTypeMapping.get(bufferAttribute.array.constructor);

			if (attributeLocations[attributeName] === undefined) {
				//attributeLocation = attributeLocations["aExtra"];
			} else {
				let attributeLocation = attributeLocations[attributeName].location;

				gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
				gl.enableVertexAttribArray(attributeLocation);
			}


			webglBuffer.vbos.set(attributeName, {
				handle: vbo,
				name: attributeName,
				count: bufferAttribute.count,
				itemSize: bufferAttribute.itemSize,
				type: geometry.attributes.position.array.constructor,
				version: 0
			});
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

		let disposeHandler = (event) => {
			this.deleteBuffer(geometry);
			geometry.removeEventListener("dispose", disposeHandler);
		};
		geometry.addEventListener("dispose", disposeHandler);

		return webglBuffer;
	}

	updateBuffer(geometry) {
		let gl = this.gl;

		let webglBuffer = this.buffers.get(geometry);

		gl.bindVertexArray(webglBuffer.vao);

		for (let attributeName in geometry.attributes) {
			let bufferAttribute = geometry.attributes[attributeName];

			let normalized = bufferAttribute.normalized;
			let type = this.glTypeMapping.get(bufferAttribute.array.constructor);

			let vbo = null;
			if (!webglBuffer.vbos.has(attributeName)) {
				vbo = gl.createBuffer();

				webglBuffer.vbos.set(attributeName, {
					handle: vbo,
					name: attributeName,
					count: bufferAttribute.count,
					itemSize: bufferAttribute.itemSize,
					type: geometry.attributes.position.array.constructor,
					version: bufferAttribute.version
				});
			} else {
				vbo = webglBuffer.vbos.get(attributeName).handle;
				webglBuffer.vbos.get(attributeName).version = bufferAttribute.version;
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, bufferAttribute.array, gl.STATIC_DRAW);

			if (attributeLocations[attributeName] === undefined) {
				//attributeLocation = attributeLocations["aExtra"];
			} else {
				let attributeLocation = attributeLocations[attributeName].location;

				gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
				gl.enableVertexAttribArray(attributeLocation);
			}
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);
	}

	traverse(scene) {

		let octrees = [];

		let stack = [scene];
		while (stack.length > 0) {

			let node = stack.pop();

			if (node instanceof PointCloudTree) {
				octrees.push(node);
				continue;
			}

			let visibleChildren = node.children.filter(c => c.visible);
			stack.push(...visibleChildren);

		}

		let result = {
			octrees: octrees
		};

		return result;
	}



	renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params) {

		if (exports.measureTimings) performance.mark("renderNodes-start");

		let gl = this.gl;

		let material = params.material ? params.material : octree.material;
		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;

		if (params.viewOverride) {
			view = params.viewOverride;
		}

		let worldView = new THREE.Matrix4();

		let mat4holder = new Float32Array(16);

		let i = 0;
		for (let node of nodes) {

			if (exports.debug.allowedNodes !== undefined) {
				if (!exports.debug.allowedNodes.includes(node.name)) {
					continue;
				}
			}

			let world = node.sceneNode.matrixWorld;
			worldView.multiplyMatrices(view, world);

			if (visibilityTextureData) {
				let vnStart = visibilityTextureData.offsets.get(node);
				shader.setUniform1f("uVNStart", vnStart);
			}


			let level = node.getLevel();

			if (node.debug) {
				shader.setUniform("uDebug", true);
			} else {
				shader.setUniform("uDebug", false);
			}

			// let isLeaf = false;
			// if(node instanceof PointCloudOctreeNode){
			// 	isLeaf = Object.keys(node.children).length === 0;
			// }else if(node instanceof PointCloudArena4DNode){
			// 	isLeaf = node.geometryNode.isLeaf;
			// }
			// shader.setUniform("uIsLeafNode", isLeaf);

			// let isLeaf = node.children.filter(n => n != null).length === 0;
			// if(!isLeaf){
			// 	continue;
			// }


			// TODO consider passing matrices in an array to avoid uniformMatrix4fv overhead
			const lModel = shader.uniformLocations["modelMatrix"];
			if (lModel) {
				mat4holder.set(world.elements);
				gl.uniformMatrix4fv(lModel, false, mat4holder);
			}

			const lModelView = shader.uniformLocations["modelViewMatrix"];
			//mat4holder.set(worldView.elements);
			// faster then set in chrome 63
			for (let j = 0;j < 16;j++) {
				mat4holder[j] = worldView.elements[j];
			}
			gl.uniformMatrix4fv(lModelView, false, mat4holder);


			/////////////////////////////////////////////////////////////////////////////////////
			// clip polygons
			// the projectino matrix is commited and the polygon vertices are flattened

			{ // Clip Polygons
				if (material.clipPolygons && material.clipPolygons.length > 0) {//for every clip polygon

					let clipPolygonVCount = [];//vertices per polygon or vertex count  [4,6,8,etc]
					let worldViewProjMatrices = [];

					let maxPolygonVertices = 16;//ut overwritten
					for (let clipPolygon of material.clipPolygons) {

						let view = clipPolygon.viewMatrix;
						let proj = clipPolygon.projMatrix;

						let worldViewProj = proj.clone().multiply(view).multiply(world);

						clipPolygonVCount.push(clipPolygon.markers.length);
						worldViewProjMatrices.push(worldViewProj);

						maxPolygonVertices = clipPolygon.maxPolygonVertices;//setting from clipPolygon
					}

					let flattenedMatrices = [].concat(...worldViewProjMatrices.map(m => m.elements));


					//flattened vertices are limited to 8 vertices max per polygon, so they are 8x3 = 24 floats
					//let flattenedVertices = new Array(8 * 3 * material.clipPolygons.length);
					let flattenedVertices = new Array(maxPolygonVertices * 3 * material.clipPolygons.length);
					for (let i = 0;i < material.clipPolygons.length;i++) {
						let clipPolygon = material.clipPolygons[i];
						for (let j = 0;j < clipPolygon.markers.length;j++) {
							flattenedVertices[i * (maxPolygonVertices * 3) + (j * 3 + 0)] = clipPolygon.markers[j].position.x;
							flattenedVertices[i * (maxPolygonVertices * 3) + (j * 3 + 1)] = clipPolygon.markers[j].position.y;
							flattenedVertices[i * (maxPolygonVertices * 3) + (j * 3 + 2)] = clipPolygon.markers[j].position.z;
							// flattenedVertices[i * 24 + (j * 3 + 0)] = clipPolygon.markers[j].position.x;
							// flattenedVertices[i * 24 + (j * 3 + 1)] = clipPolygon.markers[j].position.y;
							// flattenedVertices[i * 24 + (j * 3 + 2)] = clipPolygon.markers[j].position.z;


						}
					}

					////colors
					let flattenedColors = [].concat(...material.clipPolygons.map(poly => [poly.color.r, poly.color.g, poly.color.b]))
					const lClipPolygonColor = shader.uniformLocations["uClipPolygonColor[0]"];
					gl.uniform3fv(lClipPolygonColor, flattenedColors);
					///end colors

					////polygon task
					let polygonTasks = [].concat(...material.clipPolygons.map(poly => [poly.task]))
					const lClipPolygonTask = shader.uniformLocations["uClipPolygonTask[0]"];
					gl.uniform3fv(lClipPolygonColor, flattenedColors);
					///end colors





					// number of vertices per polygon
					const lClipPolygonVCount = shader.uniformLocations["uClipPolygonVCount[0]"];
					gl.uniform1iv(lClipPolygonVCount, clipPolygonVCount);
					//projection matrix per clip polygon, all flattened, so 4x4 = 16 floats per matrix times num clipPolygons
					const lClipPolygonVP = shader.uniformLocations["uClipPolygonWVP[0]"];
					gl.uniformMatrix4fv(lClipPolygonVP, false, flattenedMatrices);

					const lClipPolygons = shader.uniformLocations["uClipPolygonVertices[0]"];
					gl.uniform3fv(lClipPolygons, flattenedVertices);


				}
			}
			//end of clipPolygons
			///////////////////////////////////////


			//shader.setUniformMatrix4("modelMatrix", world);
			//shader.setUniformMatrix4("modelViewMatrix", worldView);
			shader.setUniform1f("uLevel", level);
			shader.setUniform1f("uNodeSpacing", node.geometryNode.estimatedSpacing);

			shader.setUniform1f("uPCIndex", i);
			// uBBSize

			if (shadowMaps.length > 0) {

				const lShadowMap = shader.uniformLocations["uShadowMap[0]"];

				shader.setUniform3f("uShadowColor", material.uniforms.uShadowColor.value);

				let bindingStart = 5;
				let bindingPoints = new Array(shadowMaps.length).fill(bindingStart).map((a, i) => (a + i));
				gl.uniform1iv(lShadowMap, bindingPoints);

				for (let i = 0;i < shadowMaps.length;i++) {
					let shadowMap = shadowMaps[i];
					let bindingPoint = bindingPoints[i];
					let glTexture = this.threeRenderer.properties.get(shadowMap.target.texture).__webglTexture;

					gl.activeTexture(gl[`TEXTURE${bindingPoint}`]);
					gl.bindTexture(gl.TEXTURE_2D, glTexture);
				}

				{

					let worldViewMatrices = shadowMaps
						.map(sm => sm.camera.matrixWorldInverse)
						.map(view => new THREE.Matrix4().multiplyMatrices(view, world))

					let flattenedMatrices = [].concat(...worldViewMatrices.map(c => c.elements));
					const lWorldView = shader.uniformLocations["uShadowWorldView[0]"];
					gl.uniformMatrix4fv(lWorldView, false, flattenedMatrices);
				}

				{
					let flattenedMatrices = [].concat(...shadowMaps.map(sm => sm.camera.projectionMatrix.elements));
					const lProj = shader.uniformLocations["uShadowProj[0]"];
					gl.uniformMatrix4fv(lProj, false, flattenedMatrices);
				}
			}

			const geometry = node.geometryNode.geometry;

			if (!geometry) console.log('Missing geometry', node)
			if (geometry.attributes["gps-time"]) {
				const bufferAttribute = geometry.attributes["gps-time"];
				const attGPS = octree.getAttribute("gps-time");

				let initialRange = attGPS.initialRange;
				let initialRangeSize = initialRange[1] - initialRange[0];

				let globalRange = attGPS.range;
				let globalRangeSize = globalRange[1] - globalRange[0];

				let scale = initialRangeSize / globalRangeSize;
				let offset = -(globalRange[0] - initialRange[0]) / initialRangeSize;

				scale = Number.isNaN(scale) ? 1 : scale;
				offset = Number.isNaN(offset) ? 0 : offset;

				shader.setUniform1f("uGpsScale", scale);
				shader.setUniform1f("uGpsOffset", offset);
				//shader.setUniform2f("uFilterGPSTimeClipRange", [-Infinity, Infinity]);

				let uFilterGPSTimeClipRange = material.uniforms.uFilterGPSTimeClipRange.value;
				// let gpsCliPRangeMin = uFilterGPSTimeClipRange[0]
				// let gpsCliPRangeMax = uFilterGPSTimeClipRange[1]
				// shader.setUniform2f("uFilterGPSTimeClipRange", [gpsCliPRangeMin, gpsCliPRangeMax]);

				let normalizedClipRange = [
					(uFilterGPSTimeClipRange[0] - globalRange[0]) / globalRangeSize,
					(uFilterGPSTimeClipRange[1] - globalRange[0]) / globalRangeSize,
				];

				shader.setUniform2f("uFilterGPSTimeClipRange", normalizedClipRange);



				// // ranges in full gps coordinate system
				// const globalRange = attGPS.range;
				// const bufferRange = bufferAttribute.potree.range;

				// // ranges in [0, 1]
				// // normalizedGlobalRange = [0, 1]
				// // normalizedBufferRange: norm buffer within norm global range e.g. [0.2, 0.8]
				// const globalWidth = globalRange[1] - globalRange[0];
				// const normalizedBufferRange = [
				// 	(bufferRange[0] - globalRange[0]) / globalWidth,
				// 	(bufferRange[1] - globalRange[0]) / globalWidth,
				// ];

				// shader.setUniform2f("uNormalizedGpsBufferRange", normalizedBufferRange);

				// let uFilterGPSTimeClipRange = material.uniforms.uFilterGPSTimeClipRange.value;
				// let gpsCliPRangeMin = uFilterGPSTimeClipRange[0]
				// let gpsCliPRangeMax = uFilterGPSTimeClipRange[1]
				// shader.setUniform2f("uFilterGPSTimeClipRange", [gpsCliPRangeMin, gpsCliPRangeMax]);

				// shader.setUniform1f("uGpsScale", bufferAttribute.potree.scale);
				// shader.setUniform1f("uGpsOffset", bufferAttribute.potree.offset);
			}

			{
				let uFilterReturnNumberRange = material.uniforms.uFilterReturnNumberRange.value;
				let uFilterNumberOfReturnsRange = material.uniforms.uFilterNumberOfReturnsRange.value;
				let uFilterPointSourceIDClipRange = material.uniforms.uFilterPointSourceIDClipRange.value;



				shader.setUniform2f("uFilterReturnNumberRange", uFilterReturnNumberRange);
				shader.setUniform2f("uFilterNumberOfReturnsRange", uFilterNumberOfReturnsRange);
				shader.setUniform2f("uFilterPointSourceIDClipRange", uFilterPointSourceIDClipRange);
			}

			let webglBuffer = null;
			if (!this.buffers.has(geometry)) {
				webglBuffer = this.createBuffer(geometry);
				this.buffers.set(geometry, webglBuffer);
			} else {
				webglBuffer = this.buffers.get(geometry);
				for (let attributeName in geometry.attributes) {
					let attribute = geometry.attributes[attributeName];

					if (attribute.version > webglBuffer.vbos.get(attributeName).version) {
						this.updateBuffer(geometry);
					}
				}
			}

			gl.bindVertexArray(webglBuffer.vao);

			//binding extra uniforms as float arrays

			if (material.customRenderer) {

				let customUniforms = material.getCustomUniforms();//retrieving definitions

				//this.uniforms = {
				//level: {type: 'f', value: 0.0},
				//vnStart: {type: 'f', value: 0.0},
				//spacing: {type: 'f', value: 1.0},
				//....
				for (let uniformName in customUniforms) {

					let uType = customUniforms[uniformName].type;
					let uValue = customUniforms[uniformName].value;


					const customLocation =
						shader.uniformLocations[`${uniformName}[0]`];
					gl.uniform1fv(customLocation, uValue);//directly setting



					// if (uType === "f") {
					// 	shader.setUniform1f(uniform, uValue);
					// 	return;
					// }
					// if (uType === "t") {
					// 	shader.setUniformTexture(uniform, uValue);
					// 	return;
					// }

					// if (uType === "1f") {
					// 	shader.setUniform1f(uniform, uValue);
					// 	return;
					// }
					// if (uType === "2f") {
					// 	shader.setUniform2f(uniform, uValue);
					// 	return;
					// }

					// if (uType === "3f") {
					// 	shader.setUniform3f(uniform, uValue);
					// 	return;
					// }
					// if (uType === "1i") {
					// 	shader.setUniform1i(uniform, uValue);
					// 	return;
					// }
					// if (uType === "b") {
					// 	shader.setUniformBoolean(uniform, uValue);
					// 	return;
					// }
					// if (uType === "m4") {
					// 	shader.setUniformMatrix4(uniform, uValue);
					// 	return;
					// }





				}



			}

			//for all other attributes, based on material definitions
			let isExtraAttribute =
				attributeLocations[material.activeAttributeName] === undefined
				&& Object.keys(geometry.attributes).includes(material.activeAttributeName);

			if (isExtraAttribute) {//for attributes other than those defined for LiDAR ASPRS

				//testing  ustom shader functions

				const attributeLocation = attributeLocations["aExtra"].location;
				//clearing previous stuff
				for (const attributeName in geometry.attributes) {//disables all other attributes
					//const bufferAttribute = geometry.attributes[attributeName];
					const vbo = webglBuffer.vbos.get(attributeName);

					gl.bindBuffer(gl.ARRAY_BUFFER, vbo.handle);
					gl.disableVertexAttribArray(attributeLocation);
				}

				const attName = material.activeAttributeName;//current attribute name
				const bufferAttribute = geometry.attributes[attName];//get the buffer
				const vbo = webglBuffer.vbos.get(attName);

				//sett ing attribute in aextra Location
				if (bufferAttribute !== undefined && vbo !== undefined) {
					let type = this.glTypeMapping.get(bufferAttribute.array.constructor);
					let normalized = bufferAttribute.normalized;
					//binds the buffer to the current ARRAY_BUFFER bind point
					gl.bindBuffer(gl.ARRAY_BUFFER, vbo.handle);
					gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
					gl.enableVertexAttribArray(attributeLocation);
				}




				{//setting uniforms for the extra attribute
					const attExtra = octree.pcoGeometry.pointAttributes.attributes
						.find(a => a.name === attName);

					let range = material.getRange(attName);
					if (!range) {
						range = attExtra.range;
					}

					if (!range) {
						range = [0, 1];
					}

					let initialRange = attExtra.initialRange;
					let initialRangeSize = initialRange[1] - initialRange[0];

					let globalRange = range;
					let globalRangeSize = globalRange[1] - globalRange[0];

					let scale = initialRangeSize / globalRangeSize;
					let offset = -(globalRange[0] - initialRange[0]) / initialRangeSize;

					scale = Number.isNaN(scale) ? 1 : scale;
					offset = Number.isNaN(offset) ? 0 : offset;

					shader.setUniform1f("uExtraScale", scale);
					shader.setUniform1f("uExtraOffset", offset);
					shader.setUniform2f("uExtraRange", globalRange);
					let debug = false;
					if (debug) {
						let attLoc = 0
						let numAttr = gl.getProgramParameter(shader.program, gl.ACTIVE_ATTRIBUTES)
						const activeAttribute = gl.getActiveAttrib(shader.program, attLoc)
						//retrieve vertex attribute by index and  information to query

						//only returnt vertex attributes
						let vatt = gl.getVertexAttrib(attLoc, gl.CURRENT_VERTEX_ATTRIB)
						let vattbuff = gl.getVertexAttrib(attLoc, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)


						//console.log("activeAttribute", activeAttribute)
						//console.log("vatt", vatt)
						const bufferData = new Float32Array(bufferAttribute.array.length);
						gl.getBufferSubData(gl.ARRAY_BUFFER, 0, bufferData);
						//console.log(bufferAttribute.array)
						//console.log(bufferData)

					}
				}


				///////////adding additional defines and setting uniforms from material







			} else {

				for (const attributeName in geometry.attributes) {
					const bufferAttribute = geometry.attributes[attributeName];
					const vbo = webglBuffer.vbos.get(attributeName);


					if (attributeLocations[attributeName] !== undefined) {
						const attributeLocation = attributeLocations[attributeName].location;

						let type = this.glTypeMapping.get(bufferAttribute.array.constructor);
						let normalized = bufferAttribute.normalized;

						gl.bindBuffer(gl.ARRAY_BUFFER, vbo.handle);
						gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
						gl.enableVertexAttribArray(attributeLocation);

					}
				}
			}

			//////////////////////////
			//adding filter attribute and locations
			//a mapping is required between filter names and indices

			//list to be set somewhere else, here is just for testing


			let selectedAttributeNames = ["classification", "vegetation_distance", "vegetation_zone"]// index 0 is first name
			let filterAttributeKeys = {"classification": 0, "vegetation_distance": 1, "vegetation_zone": 2}// index 0 is first name

			let filterAttributeName = "filterAttributes";//name of the attribute to be used for filtering

			if (false) {//todo, not working
				for (currentAttributeName of selectedAttributeNames) {

					//1) GET THE POINTCLOUD ATTRIBUTE BY NAME
					const bufferAttribute = geometry.attributes[currentAttributeName];//retrieving the buffer by name
					//2) GET THE KEY FOR THE POINTCLOUD ATTRIBUTE
					let attributeIndex = filterAttributeKeys[currentAttributeName];
					//3) GET THE VERTES BUFFER OBJECT (VBO) FOR THE ATTRIBUTE FOR RECYCLING

					const vbo = webglBuffer.vbos.get(filterAttributeName);//get the complete packed attributes array

					//GET THE ATRIBUTE LOCATION
					if (attributeLocations[filterAttributeName] !== undefined) {//if the attribute location is defined

						const attributeLocation = attributeLocations[filterAttributeName].location;//an index

						let type = this.glTypeMapping.get(bufferAttribute.array.constructor);
						let normalized = bufferAttribute.normalized;

						// gl.bindBuffer(gl.ARRAY_BUFFER, vbo.handle);
						// gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
						// gl.enableVertexAttribArray(attributeLocation);


						const loc = gl.getAttribLocation(program, `${filterAttributeName}[${attributeIndex}]`);
						gl.enableVertexAttribArray(loc);
						let index;
						let size;
						let vtype;

						gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, stride, offset + i * 4);



					}
					else//attributeLocation  not set, add it? or not?
					{

					}

				}

			}



			//////////////////////////


			let numPoints = webglBuffer.numElements;
			gl.drawArrays(gl.POINTS, 0, numPoints);

			i++;
		}

		gl.bindVertexArray(null);

		if (exports.measureTimings) {
			performance.mark("renderNodes-end");
			performance.measure("render.renderNodes", "renderNodes-start", "renderNodes-end");
		}
	}

	renderOctree(octree, nodes, camera, target, params = {}) {

		let gl = this.gl;

		let material = params.material ? params.material : octree.material;
		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let viewInv = camera.matrixWorld;

		if (params.viewOverride) {
			view = params.viewOverride;
			viewInv = view.clone().invert();
		}

		let proj = camera.projectionMatrix;
		let projInv = proj.clone().invert();
		//let worldView = new THREE.Matrix4();

		let shader = null;
		let visibilityTextureData = null;

		let currentTextureBindingPoint = 0;

		if (material.pointSizeType >= 0) {
			if (material.pointSizeType === PointSizeType.ADAPTIVE ||
				material.activeAttributeName === "level of detail") {

				let vnNodes = (params.vnTextureNodes != null) ? params.vnTextureNodes : nodes;
				visibilityTextureData = octree.computeVisibilityTextureData(vnNodes, camera);

				const vnt = material.visibleNodesTexture;
				const data = vnt.image.data;
				data.set(visibilityTextureData.data);
				vnt.needsUpdate = true;

			}
		}

		{ // UPDATE SHADER AND TEXTURES
			if (!this.shaders.has(material)) {
				let [vs, fs] = [material.vertexShader, material.fragmentShader];
				//let shader = new Shader(gl, "pointcloud", vs, fs);//shall i rename them?
				let shader = new Shader(gl, "pointcloud", vs, fs);//shall i rename them?

				this.shaders.set(material, shader);
			}

			shader = this.shaders.get(material);

			//if(material.needsUpdate){
			//{
			let [vs, fs] = [material.vertexShader, material.fragmentShader];

			let numSnapshots = material.snapEnabled ? material.numSnapshots : 0;
			let numClipBoxes = (material.clipBoxes && material.clipBoxes.length) ? material.clipBoxes.length : 0;
			let numClipSpheres = (params.clipSpheres && params.clipSpheres.length) ? params.clipSpheres.length : 0;
			let numClipPolygons = (material.clipPolygons && material.clipPolygons.length) ? material.clipPolygons.length : 0;
			const numClusteredPointSegments = material.pointClusters.reduce(
				(segmentCount, cluster) => {
					return segmentCount + cluster.segments.length;
				},
				0
			);
			const roundedNumberOfSegments = numClusteredPointSegments
				? (Math.trunc(numClusteredPointSegments / 20) + 1) * 20
				: 0;

			let defines = [
				`#define num_shadowmaps ${shadowMaps.length}`,
				`#define num_snapshots ${numSnapshots}`,
				`#define num_clipboxes ${numClipBoxes}`,
				`#define num_clipspheres ${numClipSpheres}`,
				`#define num_clippolygons ${numClipPolygons}`,
			];
			//{//block for point cluste



			defines.push(`#define num_clusteredpointsegments ${roundedNumberOfSegments}`);
			//}

			if (octree.pcoGeometry.root.isLoaded()) {
				let attributes = octree.pcoGeometry.root.geometry.attributes;

				if (attributes["gps-time"]) {
					defines.push("#define clip_gps_enabled");
				}

				if (attributes["return number"]) {
					defines.push("#define clip_return_number_enabled");
				}

				if (attributes["number of returns"]) {
					defines.push("#define clip_number_of_returns_enabled");
				}

				if (attributes["source id"] || attributes["point source id"]) {
					defines.push("#define clip_point_source_id_enabled");
				}

			}

			let definesString = defines.join("\n");

			let vsVersionIndex = vs.indexOf("#version ");
			let fsVersionIndex = fs.indexOf("#version ");

			if (vsVersionIndex >= 0) {
				vs = vs.replace(/(#version .*)/, `$1\n${definesString}`)
			} else {
				vs = `${definesString}\n${vs}`;
			}

			if (fsVersionIndex >= 0) {
				fs = fs.replace(/(#version .*)/, `$1\n${definesString}`)
			} else {
				fs = `${definesString}\n${fs}`;
			}


			shader.update(vs, fs);

			material.needsUpdate = false;
			//}

			for (let uniformName of Object.keys(material.uniforms)) {
				let uniform = material.uniforms[uniformName];
				if (uniform.type == "t") {
					let texture = uniform.value;
					if (!texture) {
						continue;
					}
					if (!this.textures.has(texture)) {
						let webglTexture = new WebGLTexture(gl, texture);
						this.textures.set(texture, webglTexture);
					}
					let webGLTexture = this.textures.get(texture);
					webGLTexture.update();
				}
			}
			//}

			gl.useProgram(shader.program);

			let transparent = false;
			if (params.transparent !== undefined) {
				transparent = params.transparent && material.opacity < 1;
			} else {
				transparent = material.opacity < 1;
			}

			if (transparent) {
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
				gl.depthMask(false);
				gl.disable(gl.DEPTH_TEST);
			} else {
				gl.disable(gl.BLEND);
				gl.depthMask(true);
				gl.enable(gl.DEPTH_TEST);
			}

			if (params.blendFunc !== undefined) {
				gl.enable(gl.BLEND);
				gl.blendFunc(...params.blendFunc);
			}

			if (params.depthTest !== undefined) {
				if (params.depthTest === true) {
					gl.enable(gl.DEPTH_TEST);
				} else {
					gl.disable(gl.DEPTH_TEST);
				}
			}

			if (params.depthWrite !== undefined) {
				if (params.depthWrite === true) {
					gl.depthMask(true);
				} else {
					gl.depthMask(false);
				}

			}


			//{ // UPDATE UNIFORMS
			shader.setUniformMatrix4("projectionMatrix", proj);
			shader.setUniformMatrix4("viewMatrix", view);
			shader.setUniformMatrix4("uViewInv", viewInv);
			shader.setUniformMatrix4("uProjInv", projInv);

			let screenWidth = target ? target.width : material.screenWidth;
			let screenHeight = target ? target.height : material.screenHeight;

			shader.setUniform1f("uScreenWidth", screenWidth);
			shader.setUniform1f("uScreenHeight", screenHeight);
			shader.setUniform1f("fov", Math.PI * camera.fov / 180);
			shader.setUniform1f("near", camera.near);
			shader.setUniform1f("far", camera.far);

			if (camera instanceof THREE.OrthographicCamera) {
				shader.setUniform("uUseOrthographicCamera", true);
				shader.setUniform("uOrthoWidth", camera.right - camera.left);
				shader.setUniform("uOrthoHeight", camera.top - camera.bottom);
			} else {
				shader.setUniform("uUseOrthographicCamera", false);
			}

			if (material.clipBoxes.length + material.clipPolygons.length === 0) {
				shader.setUniform1i("clipTask", ClipTask.NONE);
			} else {
				shader.setUniform1i("clipTask", material.clipTask);
			}

			shader.setUniform1i("clipMethod", material.clipMethod);



			/////////////////////////////////////////////////////////////////
			//clipboxes ,may appear on different contexts
			if (material.clipBoxes && material.clipBoxes.length > 0) {
				//let flattenedMatrices = [].concat(...material.clipBoxes.map(c => c.inverse.elements));

				//const lClipBoxes = shader.uniformLocations["clipBoxes[0]"];
				//gl.uniformMatrix4fv(lClipBoxes, false, flattenedMatrices);

				const lClipBoxes = shader.uniformLocations["clipBoxes[0]"];
				gl.uniformMatrix4fv(lClipBoxes, false, material.uniforms.clipBoxes.value);




				//// TODO CHECK using some variable or some other element clipboxes used for clustering tool, which are stored
				let clusterToolClipBoxes = true;
				if (clusterToolClipBoxes) {//code added for ClusterTool, crashed profile tool as profile tool is a set of  clipboxes
					//basically it adds colors from the clipboxes to the shader, as it was not present before within the
					//uniform clipboxes location boxColors[0] and clipTask[0]

					//of course it crashes within the existing profile as it is made of clipboxes
					//a proper if wuilf
					try {
						const clipTasks = material.clipBoxes.map(
							(clipbox) => clipbox.box.actualClipTask
						);
						const lClipTasks = shader.uniformLocations['clipTasks[0]'];

						gl.uniform1iv(lClipTasks, clipTasks);


						const boxColors = material.clipBoxes
							.map((clipbox) => {

								if (clipbox.box.color !== undefined) {
									return [clipbox.box.color.r, clipbox.box.color.g, clipbox.box.color.b]//check why they store materials in such way when using cluster tool
								} else {
									return [clipbox.box.material.color.r, clipbox.box.material.color.g, clipbox.box.material.color.b]
								}

							})
							.flat();

						const lBoxColors = shader.uniformLocations['boxColors[0]'];
						gl.uniform3fv(lBoxColors, boxColors);


					} catch (error) {
						console.log("PotreeRenderer.js Error in in ClusterTool clipBoxes added code");
					}
				}//ignore until implemented



				//////////////////////////////////////////////////////////
				//added for selection tool, values added to selectionClipTasks and selectionBoxColors but may be removed
				let clipBoxSelectionHighlight = true;
				if (clipBoxSelectionHighlight) {
					//code added for ClusterTool, crashed profile tool as profile tool is a set of  clipboxes
					//basically it adds colors from the clipboxes to the shader, as it was not present before within the
					//uniform clipboxes location boxColors[0] and clipTask[0]

					//of course it crashes within the existing profile as it is made of clipboxes
					//a proper if wuilf
					try {
						const clipTask = material.clipBoxes.map(
							(clipbox) => clipbox.box.actualClipTask
						);
						const lClipTask = shader.uniformLocations['selectionClipTasks[0]'];

						gl.uniform1iv(lClipTask, clipTask);


						const boxColors = material.clipBoxes
							.map((clipbox) => {

								if (clipbox.box.color !== undefined) {//this is the code added
									return [clipbox.box.color.r, clipbox.box.color.g, clipbox.box.color.b]//check why they store materials in such way when using cluster tool
								} else {
									return [clipbox.box.material.color.r, clipbox.box.material.color.g, clipbox.box.material.color.b]
								}

							})
							.flat();

						const lBoxColors = shader.uniformLocations['selectionBoxColors[0]'];
						gl.uniform3fv(lBoxColors, boxColors);


					} catch (error) {
						console.log("PotreeRenderer.js Error in in BoxSelectionClusterTool clipBoxes added code");
					}
				}

			}

			/////////////////////////////////////////////////////////////////
			// CODE for CLUSTERING ()
			if (material.pointClusters && material.pointClusters.length > 0) {//


				const clusteredPointSegments = material.pointClusters
					.map((cluster) => cluster.getSegmentIdentifiers())
					.flat();
				while (clusteredPointSegments.length < roundedNumberOfSegments) {
					clusteredPointSegments.push(-1);
				}
				const lClusteredPointSegments =
					shader.uniformLocations['clusteredpointsegments[0]'];
				gl.uniform1fv(lClusteredPointSegments, clusteredPointSegments);

				//segments flatted commited

				const segmentClipTasks = Array(roundedNumberOfSegments).fill(0);
				const segmentClassifications = Array(roundedNumberOfSegments).fill(0);
				const selectedStates = Array(roundedNumberOfSegments).fill(0);
				const activeStates = Array(roundedNumberOfSegments).fill(0);
				const visibleStates = Array(roundedNumberOfSegments).fill(0);
				material.pointClusters
					.map((cluster) => cluster.getSegmentInfo())
					.flat()
					.forEach((info, index) => {
						segmentClipTasks[index] = info.clipTask;
						segmentClassifications[index] = info.classification;
						selectedStates[index] = info.selected ? 1 : 0;
						activeStates[index] = info.active ? 1 : 0;
						visibleStates[index] = info.visible ? 1 : 0;
					});
				const lSegmentClipTasks =
					shader.uniformLocations['segmentClipTasks[0]'];
				gl.uniform1iv(lSegmentClipTasks, segmentClipTasks);
				const lSegmentClassifications =
					shader.uniformLocations['segmentClassifications[0]'];



				//segmentClassifications = segmentClassifications.map((c) => c % 100);
				gl.uniform1fv(lSegmentClassifications, segmentClassifications);
				const lSelectedStates = shader.uniformLocations['selectedStates[0]'];
				gl.uniform1iv(lSelectedStates, selectedStates);
				const lActiveStates = shader.uniformLocations['activeStates[0]'];
				gl.uniform1iv(lActiveStates, activeStates);
				const lVisible = shader.uniformLocations['visibleStates[0]'];
				gl.uniform1iv(lVisible, visibleStates);
			}

			/////////////////////////////////////////////////////////////////
			// TODO CLIPSPHERES
			if (params.clipSpheres && params.clipSpheres.length > 0) {

				let clipSpheres = params.clipSpheres;

				let matrices = [];
				for (let clipSphere of clipSpheres) {
					//let mScale = new THREE.Matrix4().makeScale(...clipSphere.scale.toArray());
					//let mTranslate = new THREE.Matrix4().makeTranslation(...clipSphere.position.toArray());

					//let clipToWorld = new THREE.Matrix4().multiplyMatrices(mTranslate, mScale);
					let clipToWorld = clipSphere.matrixWorld;
					let viewToWorld = camera.matrixWorld
					let worldToClip = clipToWorld.clone().invert();

					let viewToClip = new THREE.Matrix4().multiplyMatrices(worldToClip, viewToWorld);

					matrices.push(viewToClip);
				}

				let flattenedMatrices = [].concat(...matrices.map(matrix => matrix.elements));

				const lClipSpheres = shader.uniformLocations["uClipSpheres[0]"];
				gl.uniformMatrix4fv(lClipSpheres, false, flattenedMatrices);

				//const lClipSpheres = shader.uniformLocations["uClipSpheres[0]"];
				//gl.uniformMatrix4fv(lClipSpheres, false, material.uniforms.clipSpheres.value);
			}

			/////////////////////////////////////////////////////////////////

			/////////////////////////////////////////////////////////////////
			// CODE for handling mixed selection clips for selection
			// requires to commit the list of filter types
			//  uniform int uMixedFilters[]
			//  #define mixed_filters_size

			// for spatial filters, they are clipPolygons and boxVolumes, plus its different sizes and accesories, but already dealt with

			// for logical filter, is a little bit more complex and requries
			// the array with filter definitions size multiple of 5
			// array of  integer values
			// array of float values
			// packed attributes indexed by name, but converted here to integer

			// in float packedAttributes[k];
			// #define num_packed_attributes k


			// uniform int uFilterAttributes[]  // index of packed attributes
			// #define filter_attributes_size k

			// uniform int uFilterList[]
			// #define  filters_list_size k

			// uniform int integer_filter_values[]
			// #define integer_filter_values_size k

			// uniform float float_filter_values[]
			// #define float_filter_values_size k




			let mixedVolumes = false;
			//defines should be defined before updating shader, i.e. begininng of method
			//locations and material.uniform.values set per node and material
			if (mixedVolumes && material.mixedVolumes && material.mixedVolumes.length > 0) {

				const lMixedVolumes = shader.uniformLocations["uMixedVolumes[0]"];//location for mixed volumes

				//podria  poner la lista directamente
				//gl.uniform1iv(lMixedVolumes, false, material.uniforms.lMixedVolumes.value);//setting the mixed volumes

				let mixvol = material.mixedVolumes.map((vol) => vol.getIntType());
				if (mixvol.length > 0) {
					// console.log(mixvol)
					gl.uniform1iv(lMixedVolumes, mixvol)
				}
				// //mixed list
				// const lMixedFilters = shader.uniformLocations["uMixedFilters[0]"];//variable location name
				// gl.uniform1iv(lMixedFilters, material.uniforms.uMixedFilters.value);//setting the mixed filters


				// const lFilterAttributes = shader.uniformLocations["uFilterAttributes[0]"];//packed attributes per point, indexed
				// const lFilterList = shader.uniformLocations["uFilterList[0]"];
				// const lIntegerFilterValues = shader.uniformLocations["uIntegerFilterValues[0]"];
				// const lFloatFilterValues = shader.uniformLocations["uFloatFilterValues[0]"];

				// gl.uniform1fv(lFilterAttributes, material.uniforms.filterAttributes.value);//attribute index for packed values
				// gl.uniform1iv(lFilterList, material.uniforms.uFilterList.value);//setting the filter list
				// gl.uniform1iv(lIntegerFilterValues, material.uniforms.integer_filter_values.value);//setting the integer filter values
				// gl.uniform1fv(lFloatFilterValues, material.uniforms.float_filter_values.value);//setting the float filter values


			}

			let mixedFilters = true;
			//defines should be defined before updating shader, i.e. begininng of method
			//locations and material.uniform.values set per node and material
			if (mixedFilters && material.mixedFilters && material.mixedFilters.length > 0) {

				// const lMixedVolumes = shader.uniformLocations["uMixedVolumes[0]"];//location for mixed volumes
				const lMixedFilters = shader.uniformLocations["uMixedFilters[0]"];//location for mixed volumes

				//podria  poner la lista directamente
				//gl.uniform1iv(lMixedVolumes, false, material.uniforms.lMixedVolumes.value);//setting the mixed volumes

				let mixFilt = material.mixedFilters.map((filt) => filt.getIntType());
				if (mixFilt.length > 0) {
					// console.log(mixvol)
					gl.uniform1iv(lMixedFilters, mixFilt)
				}

				let filters = material.mixedFilters.filter((f) => f.getIntType() == FilterIntType.LOGICAL)
				if (filters.length > 0) {//if there are logical filters, then commit the rest of items

					const lFilterAttributes = shader.uniformLocations["uFilterAttributes[0]"];//packed attributes per point, indexed
					const lFilterList = shader.uniformLocations["uFilterList[0]"];
					const lIntegerFilterValues = shader.uniformLocations["uIntegerFilterValues[0]"];
					const lFloatFilterValues = shader.uniformLocations["uFloatFilterValues[0]"];

					//gl.uniform1fv(lFilterAttributes, material.uniforms.filterAttributes.value);//attribute index for packed values


					let pcfilterlist = new PointCloudFilterList()
					filters.forEach((filter) => {pcfilterlist.addFilter(filter)});
					let flat = pcfilterlist.flatten();


					if (flat.filterList.length > 0) {
						gl.uniform1iv(lFilterList, flat.filterList);//set into the meterial uniform list
					}
					if (flat.integer_filter_values.length > 0) {
						gl.uniform1iv(lIntegerFilterValues, flat.integer_filter_values);//setting the integer filter values
					}
					if (flat.float_filter_values.length > 0) {
						gl.uniform1fv(lFloatFilterValues, flat.float_filter_values);//setting
					}
				}
				//now commit the rest of items

				// //mixed list
				// const lMixedFilters = shader.uniformLocations["uMixedFilters[0]"];//variable location name
				// gl.uniform1iv(lMixedFilters, material.uniforms.uMixedFilters.value);//setting the mixed filters


				// const lFilterAttributes = shader.uniformLocations["uFilterAttributes[0]"];//packed attributes per point, indexed
				// const lFilterList = shader.uniformLocations["uFilterList[0]"];
				// const lIntegerFilterValues = shader.uniformLocations["uIntegerFilterValues[0]"];
				// const lFloatFilterValues = shader.uniformLocations["uFloatFilterValues[0]"];

				// gl.uniform1fv(lFilterAttributes, material.uniforms.filterAttributes.value);//attribute index for packed values
				// gl.uniform1iv(lFilterList, material.uniforms.uFilterList.value);//setting the filter list
				// gl.uniform1iv(lIntegerFilterValues, material.uniforms.integer_filter_values.value);//setting the integer filter values
				// gl.uniform1fv(lFloatFilterValues, material.uniforms.float_filter_values.value);//setting the float filter values


			}




			/////////////////////////////////////////////////////////////////////////////////////
			//code for filters based on numerical expressions
			// require to define indexed attribute values,
			//a list of filters



			// WIP as 24 jun 2025
			let customFiltering = true;
			if (customFiltering) {

				//all enabled by FILTER_PC defines

				//setting locations for filters
				const lfilterAttributes = shader.uniformLocations['filter_attributes[0]'];//packed attributes per point, indexed
				const lfilterList = shader.uniformLocations['filter_list[0]'];
				const lfilterFloatConstants = shader.uniformLocations['filter_float_constants[0]'];
				const lfilterIntConstants = shader.uniformLocations['filter_int_constants[0]'];

				const lfilterBoxVolume = shader.uniformLocations['filter_string_constants[0]'];//list of filters indexed assigned to a  clip
				const lfilterPolygon = shader.uniformLocations['filter_boolean_constants[0]'];


				//setting filter arrays
				//initially do not flat them
				let filter_attributes = []//for the attributes, indexed by point

				let filter_list = [];
				let filter_float_constants = [];
				let filter_int_constants = [];

				let filter_constants = [];
				let filter_box_volume = [];


				//updating filter arrays

				const OPERATORS = {
					"EQUALS_CONST": 0,
					"EQUALS_ATTR": 1,
					"LESS_CONST": 2,
					"LESS_ATTR": 3,
					"LEQ_CONST": 4,
					"LEQ_ATTR": 5,
					"GREATER_CONST": 6,
					"GREATER_ATTR": 7,
					"GREATEREQ_CONST": 8,
					"GREATEREQ_ATTR": 9,

					"RANGE_[]": 10,
					"RANGE_(]": 11,
					"RANGE_[)": 12,
					"RANGE_()": 13,

					"IN": 14,
					"NOT": 15,

				}


				let attribute_index_i = 0;
				let attribute_index_j = 1;
				let float_constant_index_a = 0;
				let float_constant_index_b = 1;

				let filter_equals_constant = [OPERATORS["EQUALS_CONST"], attribute_index_i, float_constant_index_a, -1];
				let filter_equals_attribute = [OPERATORS["EQUALS_ATTR"], attribute_index_i, attribute_index_j, -1];

				let filter_less_constant = [OPERATORS["LESS_CONST"], attribute_index_i, float_constant_index_a, -1]
				let filter_less_attribute = [OPERATORS["LESS_ATTR"], attribute_index_i, attribute_index_j, -1]

				let filter_leq_constant = [OPERATORS["LEQ_CONST"], attribute_index_i, float_constant_index_a, -1]
				let filter_leq_attribute = [OPERATORS["LEQ_ATTR"], attribute_index_i, attribute_index_j, -1]

				let filter_greater_constant = [OPERATORS["GREATER_CONST"], attribute_index_i, float_constant_index_a, -1]
				let filter_greater_attribute = [OPERATORS["GREATER_ATTR"], attribute_index_i, attribute_index_j, -1]

				let filter_greatereq_constant_constant = [OPERATORS["GREATEREQ_CONST"], attribute_index_i, float_constant_index_a, -1]
				let filter_greatereq_attribute = [OPERATORS["GREATEREQ_ATTR"], attribute_index_i, attribute_index_j, -1]

				let filter_range_incinc = [OPERATORS["RANGE_[]"], attribute_index_i, float_constant_index_a, float_constant_index_b] //values at  index a nd b, usually consecutive
				let filter_range_exinc = [OPERATORS["RANGE_(]"], attribute_index_i, float_constant_index_a, float_constant_index_b]
				let filter_range_incex = [OPERATORS["RANGE_[)"], attribute_index_i, float_constant_index_a, float_constant_index_b]
				let filter_range_exex = [OPERATORS["RANGE_()"], attribute_index_i, float_constant_index_a, float_constant_index_b]

				let filter_in = [OPERATORS["IN"], attribute_index_i, float_constant_index_a, float_constant_index_b]// values in list between indices a and b

				//actual example of filter, just append one of the above
				filter_list = filter_list.concat(filter_equals_constant);//testing only with a single filter

				filter_float_constants = filter_float_constants.concat([0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]);//empty for now, but can be used to store constants
				filter_int_constants = filter_int_constants.concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);//empty for now, but can be used to store constants

				//commiting filter uniforms

				gl.uniform4iv(lfilterList, filter_list);
				gl.uniform1fv(lfilterFloatConstants, filter_float_constants);
				gl.uniform1iv(lfilterIntConstants, filter_int_constants);







				//

			}


			//may introduce the clipPolygon code here and extract if from render nodes





			shader.setUniform1f("size", material.size);
			shader.setUniform1f("maxSize", material.uniforms.maxSize.value);
			shader.setUniform1f("minSize", material.uniforms.minSize.value);


			// uniform float uPCIndex
			shader.setUniform1f("uOctreeSpacing", material.spacing);
			shader.setUniform("uOctreeSize", material.uniforms.octreeSize.value);


			//uniform vec3 uColor;
			shader.setUniform3f("uColor", material.color.toArray());
			//uniform float opacity;
			shader.setUniform1f("uOpacity", material.opacity);

			shader.setUniform2f("elevationRange", material.elevationRange);
			shader.setUniform2f("intensityRange", material.intensityRange);


			shader.setUniform3f("uIntensity_gbc", [
				material.intensityGamma,
				material.intensityBrightness,
				material.intensityContrast
			]);

			shader.setUniform3f("uRGB_gbc", [
				material.rgbGamma,
				material.rgbBrightness,
				material.rgbContrast
			]);

			shader.setUniform1f("uTransition", material.transition);
			shader.setUniform1f("wRGB", material.weightRGB);
			shader.setUniform1f("wIntensity", material.weightIntensity);
			shader.setUniform1f("wElevation", material.weightElevation);
			shader.setUniform1f("wClassification", material.weightClassification);
			shader.setUniform1f("wReturnNumber", material.weightReturnNumber);
			shader.setUniform1f("wSourceID", material.weightSourceID);

			shader.setUniform("backfaceCulling", material.uniforms.backfaceCulling.value);

			shader.setUniform3f("reference", material.reference);//test



			let vnWebGLTexture = this.textures.get(material.visibleNodesTexture);
			if (vnWebGLTexture) {
				shader.setUniform1i("visibleNodesTexture", currentTextureBindingPoint);
				gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
				gl.bindTexture(vnWebGLTexture.target, vnWebGLTexture.id);
				currentTextureBindingPoint++;
			}

			let gradientTexture = this.textures.get(material.gradientTexture);
			shader.setUniform1i("gradient", currentTextureBindingPoint);
			gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
			gl.bindTexture(gradientTexture.target, gradientTexture.id);

			const repeat = material.elevationGradientRepeat;
			if (repeat === ElevationGradientRepeat.REPEAT) {
				gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_T, gl.REPEAT);
			} else if (repeat === ElevationGradientRepeat.MIRRORED_REPEAT) {
				gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
				gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
			} else {
				gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			}
			currentTextureBindingPoint++;

			let classificationTexture = this.textures.get(material.classificationTexture);
			shader.setUniform1i("classificationLUT", currentTextureBindingPoint);
			gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
			gl.bindTexture(classificationTexture.target, classificationTexture.id);
			currentTextureBindingPoint++;

			let matcapTexture = this.textures.get(material.matcapTexture);
			shader.setUniform1i("matcapTextureUniform", currentTextureBindingPoint);
			gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
			gl.bindTexture(matcapTexture.target, matcapTexture.id);
			currentTextureBindingPoint++;


			if (material.snapEnabled === true) {

				{
					const lSnapshot = shader.uniformLocations["uSnapshot[0]"];
					const lSnapshotDepth = shader.uniformLocations["uSnapshotDepth[0]"];

					let bindingStart = currentTextureBindingPoint;
					let lSnapshotBindingPoints = new Array(5).fill(bindingStart).map((a, i) => (a + i));
					let lSnapshotDepthBindingPoints = new Array(5)
						.fill(1 + Math.max(...lSnapshotBindingPoints))
						.map((a, i) => (a + i));
					currentTextureBindingPoint = 1 + Math.max(...lSnapshotDepthBindingPoints);

					gl.uniform1iv(lSnapshot, lSnapshotBindingPoints);
					gl.uniform1iv(lSnapshotDepth, lSnapshotDepthBindingPoints);

					for (let i = 0;i < 5;i++) {
						let texture = material.uniforms[`uSnapshot`].value[i];
						let textureDepth = material.uniforms[`uSnapshotDepth`].value[i];

						if (!texture) {
							break;
						}

						let snapTexture = this.threeRenderer.properties.get(texture).__webglTexture;
						let snapTextureDepth = this.threeRenderer.properties.get(textureDepth).__webglTexture;

						let bindingPoint = lSnapshotBindingPoints[i];
						let depthBindingPoint = lSnapshotDepthBindingPoints[i];

						gl.activeTexture(gl[`TEXTURE${bindingPoint}`]);
						gl.bindTexture(gl.TEXTURE_2D, snapTexture);

						gl.activeTexture(gl[`TEXTURE${depthBindingPoint}`]);
						gl.bindTexture(gl.TEXTURE_2D, snapTextureDepth);
					}
				}

				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapView.value.map(c => c.elements));
					const lSnapView = shader.uniformLocations["uSnapView[0]"];
					gl.uniformMatrix4fv(lSnapView, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapProj.value.map(c => c.elements));
					const lSnapProj = shader.uniformLocations["uSnapProj[0]"];
					gl.uniformMatrix4fv(lSnapProj, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapProjInv.value.map(c => c.elements));
					const lSnapProjInv = shader.uniformLocations["uSnapProjInv[0]"];
					gl.uniformMatrix4fv(lSnapProjInv, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapViewInv.value.map(c => c.elements));
					const lSnapViewInv = shader.uniformLocations["uSnapViewInv[0]"];
					gl.uniformMatrix4fv(lSnapViewInv, false, flattenedMatrices);
				}

			}
		}

		this.renderNodes(
			octree,
			nodes,
			visibilityTextureData,
			camera,
			target,
			shader,
			params);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE0);
	}

	//called from main loop
	//1) this.traverses nodes
	//2) this.renderOctree render each node
	render(scene, camera, target = null, params = {}) {

		const gl = this.gl;

		// PREPARE
		if (target != null) {
			this.threeRenderer.setRenderTarget(target);
		}

		//camera.updateProjectionMatrix();
		// camera.matrixWorldInverse.invert(camera.matrixWorld);

		const traversalResult = this.traverse(scene);


		// RENDER
		for (const octree of traversalResult.octrees) {
			let nodes = octree.visibleNodes;
			this.renderOctree(octree, nodes, camera, target, params);
		}


		// CLEANUP
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

		this.threeRenderer.resetState();
	}



};








