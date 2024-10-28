/**
 * TerrainGeometryNode is the actual holder  of a geometry and texture.
 * 
 * This is the visible part holding info about 
 * 
 * -- id
 * -- name
 * -- index
 * -  TerrainGeometry // links to the root
 * -- BBOX
 * -- BoundingSphere
 * -- Children
 * -- resolution
 * --  level
 *  -- oneTimeDisposeHandlers ???? nose
 */


export class TerrainGeometryNode extends TerrainTreeNode{

	//
	constructor(name, octreeGeometry, boundingBox) {
		this.id = OctreeGeometryNode.IDCount++;//make it unique by taken the previous number
		this.name = name;
		this.index = parseInt(name.charAt(name.length - 1));
		this.octreeGeometry = octreeGeometry;
		this.boundingBox = boundingBox;
		this.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		this.children = {};
		this.numPoints = 0;
		this.level = null;
		this.oneTimeDisposeHandlers = [];//????
	}

	isGeometryNode(){
		return true;
	}

	getLevel(){
		return this.level;
	}

	isTreeNode(){
		return false;
	}

	isLoaded(){
		return this.loaded;
	}

	getBoundingSphere(){
		return this.boundingSphere;
	}

	getBoundingBox(){
		return this.boundingBox;
	}

	getChildren(){
		let children = [];

		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}

		return children;
	}

	getBoundingBox(){
		return this.boundingBox;
	}

	load(){

		if (Potree.numNodesLoading >= Potree.maxNodesLoading) {
			return;
		}

		this.octreeGeometry.loader.load(this);
	}

	getNumPoints(){
		return this.numPoints;
	}

	dispose(){
		if (this.geometry && this.parent != null) {
			this.geometry.dispose();
			this.geometry = null;
			this.loaded = false;

			// this.dispatchEvent( { type: 'dispose' } );
			for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
				let handler = this.oneTimeDisposeHandlers[i];
				handler();
			}
			this.oneTimeDisposeHandlers = [];
		}
	}


};
TerrainGeometryNode.IDCount = 0;
