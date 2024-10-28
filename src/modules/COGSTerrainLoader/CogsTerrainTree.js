
import * as THREE from "../libs/three.js/build/three.module.js";
import { EventDispatcher } from "./EventDispatcher.js";


export class COGSTerrainTreeNode extends EventDispatcher{

	constructor(){
		super();
		this.needsTransformUpdate = true;
	}

	getChildren () {
		throw new Error('override function');
	}

	getBoundingBox () {
		throw new Error('override function');
	}

	isLoaded () {
		throw new Error('override function');
	}

	isGeometryNode () {
		throw new Error('override function');
	}

	isTreeNode () {
		throw new Error('override function');
	}

	getLevel () {
		throw new Error('override function');
	}

	getBoundingSphere () {
		throw new Error('override function');
	}
};

//This is the actual 3D object
//
export class COGSTerrainTree extends THREE.Object3D {
	constructor () {
		super();
	}

	initialized () {
		return this.root !== null;
	}
};
