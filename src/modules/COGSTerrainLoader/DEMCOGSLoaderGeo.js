/**
 * Loader for reading extracting xyz values from a COGS remote resource  and creating a tile.
 */
import {
	BufferGeometry,
	FileLoader,
	Float32BufferAttribute,
	Group,
	Loader,
	Points,
	PointsMaterial
} from 'three';

import * as TIFF from 'tiff';



var DEMTIFFLoaderGeo = (function () {

	//


	//constructor
	//the manager is a loader which takes care of the actual fetch and loading
	function DEMCOGSLoaderGeoConstructor(manager) {
		//Loader.call(this, manager);
		new Loader(manager);
		this.materials = null;

	}


	//copies allproperties from Loader into DEMTIFFLoaderGeo

	//By accessing the Loader prototype or object, it creates an object without instantiating and copying properties to
	//the new loader, so basically,

	//copies all the properties from custon Loader, with new methods to Demtiffloadergeo
	DEMCOGSLoaderGeo.prototype = Object.assign(
		Object.create(Loader.prototype), //by using Loader as object prorotype, creates an object 
		//set of attributes and functions
		{
			constructor: DEMCOGSLoaderGeoConstructor,

			// DEMTIFF loader method, must be implemented
			load: function (url, onLoad, onProgress, onError) {

				var scope = this;//??way to access the DEMTIFFLoader because we will rely on FileLoader

				//is meant to load filed trom url
				var loader = new FileLoader();
				loader.setPath(this.path);
				loader.setRequestHeader(this.requestHeader);
				loader.setWithCredentials(this.withCredentials);

				let fileLoader_onLoad = function (data) {//file loader callback, calls DEMTIFF load
					try {
						//passed parameter
						console.log('FileLoader.onload ' + url)						//uses the parameter from DEMTIFF
						onLoad(scope.parse(text));//FileLoader onload methos. calls the DEMTIFFLoader  itself is the parser
					} catch (e) {
						if (onError) {onError(e);} 
						else {  console.error(e);	}
						scope.manager.itemError(url);
					}
				}//callback end

				//actual call to file loader, which retrieves file, but demtiff loads and parses
				loader.load(url, fileLoader_onLoad , onProgress, onError);

			},


			/////////////////////////
			setMaterials: function (materials) {
				this.materials = materials;
				return this;

			},

			//must be implemented (because is a Loader) to parse the load(ed) contents
			//demtiff parser
			parse: function (data) {

				var state = new ParserState();

				let tiffif=  TIFF.decode(data);//which options
				//tiffDecoder.decodeHeader();

				vertices=[]; //require to compute min and also stote them

				//must push mesh vertices , grid will be created or stitched later

			

				state.finalize();//???

				//storing bbox reference
				state.reference = { x: state.minx, y: state.miny, z: state.minz };


				var container = new Group();//threejs group

				//storing the information to the container as a new attribute
				

					if (state.vertices.length > 0) {

						var material = new PointsMaterial({ size: 1, sizeAttenuation: false });

						var buffergeometry = new BufferGeometry();

						buffergeometry.setAttribute('position', new Float32BufferAttribute(state.vertices, 3));

						if (state.colors.length > 0 && state.colors[0] !== undefined) {

							buffergeometry.setAttribute('color', new Float32BufferAttribute(state.colors, 3));
							material.vertexColors = true;

						}

						var points = new Points(buffergeometry, material);
						container.add(points);

					}

				



			}//parse end

		});

	return OBJLoader;

})();

export { OBJLoader };
