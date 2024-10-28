/**
 * Hods the overall geometry related to the layer.
 * 
 * - bbox  : [minx,miny,minz,maxx,maxy,maxz]
 * - url
 * - spacing 
 * - root  -> pointer to the root TerrainGeometryNode
 * - attributes: [elevation,class] elevation tipically, but other values may apply per band
 * - bands: 5
 * - loader: the COGSTerrainNodeLoader. The root node loader is a coarse representation.
 * - Rather than having an initial tile, a minimum tile size and resolution is applied accordingly.
 * 
 * 
 * 
 * 
 * 
 * 
 */
export class TerrainGeometry{

	constructor(){
		this.url = null;
		this.spacing = 0;
		this.boundingBox = null;
		this.root = null;
		this.pointAttributes = null;
		this.loader = null;
	}

};