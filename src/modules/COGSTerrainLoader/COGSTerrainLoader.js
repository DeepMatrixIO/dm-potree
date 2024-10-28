/**
 * 
 * Potree layer loader for a mesh based terrain sourced from COGS resources.
 * 
 * Is the entry potree loader but the main class for data is 
 * 
 * COGSTerrainNodeLoader.
 * 
 * 
 * The simplest case corresponds to a DEM file stored as COGS where for every X,Y, a Z value exists.
 * 
 * Styling can be applied in multiple  forms
 * 
 * 1) Use a base color and only use vertex normals for shading 
 * 2) Using a base color with random variations around that rone  to simulate texture and ease 3D paralax effect.
 * 3) Apply a global(or local) color ramp given a value range [min, max] or multiple  combinations.
 * 4) Apply textures taken from parallel COGS sources. Resolution may be different but a sampling is applied accordingly to keep up w loading speeds
 * 5) Apply multiple styling rule based on band operations, filtering values or even spatial 
 * 
 * Styling definitions come from external resources but default modes are considered 1 and 2
 * 
 * 
 * 
 * The dynamic loading and resolution depends on interacting with the current viewer, 
 * so computing interactions between the geometry and the current view is required.
 * 
 * Multiple functions can be added as within PointCLoudOCtree or others
 * 
 * Check EPTLoader, POCLoader, Potree.OCtreeLoader , PointCloudArena4D
 * 
 * I am using the modules/loader 2.0/ OctreeLoader.js file with NodeLoader and OctreeLoader
 * 
 * PointCloudOctree extends PointCloudTree with more functions
 * 
 * 
 * 
 * 
 * The firstCall in this class is the loader  for 
 * COGSTerrainNodeLoader(), later some attributte setters and the load() mEthod
 * 
 * 
 * The loadere then fetches the corresponding description file and sets parameters
 * 
 * The structure, rather than being amn octree is a quadtree but may apply the same
 * 
 * 
 * 
 * 
 * 
 */


let COGSTerrainLoader = (function () {


	console.log('COGSTerrainLoader...')//loaded within the genera scene
	//this creates a constuctor
	function COGSTerrainLoader(manager) {
		//Loader.call(this, manager);
		let mgr = new THREE.Loader(manager);//threejs

		COGSTerrainLoader.prototype = Object.assign(
			Object.create(THREE.Loader.prototype), //by using Loader as object prorotype, creates an object 
			//set of attributes and functions
			{




				constructor: COGSTerrainLoader,

				// DEMTIFF loader method, must be implemented
				load: async function (url, onLoad, onProgress, onError) {

					var scope = this;//??way to access the DEMTIFFLoader because we will rely on FileLoader
					//the file loader itseld
					//is meant to load filed trom url
					var loader = new THREE.FileLoader();//three js  loader

					loader.setPath(this.path);
					loader.setResponseType('arraybuffer');
					loader.setRequestHeader(this.requestHeader);
					loader.setWithCredentials(this.withCredentials);

					//callback
					let fileLoader_onLoad = async function (data) {//file loader callback, calls DEMTIFF load
						try {
							//passed parameter
							console.log('FileLoader.onload ' + url)
							//DEMMTIFF load		

							//this is the parameter function, or the calllback from the menumesh
							//if I need another function, set it here		

							//let mytiff=await GeoTIFF.fromArrayBuffer(data);
							//i must do something like creating the mesh

							//let mytiff = await GeoTIFF.fromUrl(url)//from geotiffssssssss
							let mytiff = await GeoTIFF.fromArrayBuffer(data)//from geotiffssssssss
							//Promise.all([mytiff])
							let node3d = await scope.createMesh(mytiff, url);//may be static
							onLoad(node3d);//returning to the menu mesh loader

						} catch (e) {
							if (onError) { onError(e); }
							else { console.error(e); }
							scope.manager.itemError(url);
						}
					}//callback end

					//actual call to file loader, which retrieves file, but demtiff loads and parses
					loader.load(url, fileLoader_onLoad, onProgress, onError);

				},


				/////////////////////////
				setMaterials: function (materials) {
					this.materials = materials;
					return this;

				},

				//what happens when the resource is retrieved
				//use newe refrences
				async createMesh(mytiff, url) {
					//let scope=this;
					let mesh = {




						//validVertices: [],//only with vertices larger than zero

						vertices: [],//all vertices  width * height*3
						normals: [],//all normals per  vertex  width * height*3 items, computed on the fly
						colors: [],// one color per vertex
						//uvs=[]

						minx: 200000000,
						miny: 200000000,
						minz: 200000000,

						maxx: -200000000,
						maxy: -200000000,
						maxz: -200000000,

					}

					logger.log('DEMTIFFLoaderGeo.createMesh()');
					logger.log('')
					//console.log(data);
					try {
						//let mytiffarrary = await fromArrayBuffer(data);
						let mytiffarray = mytiff;
						//let mytiffurl = await GeoTIFF.fromUrl(url);
						logger.log('TIFF READY')
						let image = await mytiffarray.getImage(); // by default, the first image is read.
						logger.log('TIFF IMAGE READY')


						let width = image.getWidth();
						let height = image.getHeight();
						let origin = image.getOrigin();
						let resolution = image.getResolution();
						let noData = image.getGDALNoData();

						console.log('# WIDTH: ' + width)
						console.log('# HEIGHT:' + height)
						console.log('# ORIGIN:' + origin);
						console.log('# RESOLUTION: ' + resolution);
						console.log('# NODATA: ' + noData);

						let rows = height;
						let cols = width;
						let pixelWidth = resolution[0]
						let pixelHeight = resolution[1]


						//dont use, it, instead compute use position
						//let originX = origin[0]
						//let originY = origin[1]
						let originX = 0
						let originY = 0

						//let mesh = new TIFFMesh();//container for all data

						let data = (await image.readRasters())[0];

						//creates a 3D mesh based on point coordinates
						//it is required to have a minimum/maximum so it can be offset accordingly.
						//As things are computed relative to the left top corner, it can be considered as the new position coordinate for the group

						//This approach will work if

						//	

						var container = new THREE.Group();

						container.position.set(origin[0], origin[1], 0)//actual coordinates
						//container.position.set(0,0, 0 )//actual coordinates

						//minx is origin x ,miny is originy + (sizey*(-1)*height), so gets the minimum coord 	


						var buffergeometry = new THREE.BufferGeometry();//basic storage
						//some material
						//let color1 = new THREE.Color('0x0f32fa');
						//let color2 = new THREE.Color('0xf0690f');
						let meshMaterial = new THREE.MeshPhongMaterial({ color: 0Xffffff });
						//let meshMaterial = new THREE.MeshBasicMaterial({color:0xAAffAA,flatShading:true,wireframe:true});

						//meshMaterial.flatShading = true;
						meshMaterial.vertexColors = true;
						//meshMaterial.color='0xff00ff';
						//using explicit geometry buffers, i.e. no indexing






						for (let r = 0; r < rows - 1; r++) {
							let y1 = originY + (r * (pixelHeight));
							let y2 = originY + ((r + 1) * (pixelHeight));
							let y3 = originY + (r * (pixelHeight));

							let y4 = originY + (r * (pixelHeight));
							let y5 = originY + ((r + 1) * (pixelHeight));
							let y6 = originY + ((r + 1) * (pixelHeight));

							for (let c = 0; c < cols - 1; c++) {

								let x1 = originX + (c * pixelWidth);
								let x2 = originX + (c * pixelWidth);
								let x3 = originX + ((c + 1) * pixelWidth);

								let x4 = originX + ((c + 1) * pixelWidth);
								let x5 = originX + (c * pixelWidth);
								let x6 = originX + ((c + 1) * pixelWidth);



								//obj indices start at 1, but theejs at zero

								let v1 = ((r * width) + c);
								let v2 = (((r + 1) * width) + c);
								let v3 = ((r * width) + (c + 1));

								let v4 = ((r * width) + (c + 1));
								let v5 = (((r + 1) * width) + c);
								let v6 = (((r + 1) * width) + (c + 1))
								let z1 = data[v1]
								let z2 = data[v2]
								let z3 = data[v3]

								let z4 = data[v4]
								let z5 = data[v5]
								let z6 = data[v6]
								//console.log(v1, v2, v3, v4, v5, v6)
								//console.log(z1, z2, z3, z4, z5, z6)

								if (z1 > 0 & z2 > 0 & z3 > 0) {
									//console.log(x1, y1, z1, x2, y2, z2, x3, y3, z3)




									mesh.vertices.push(
										x1, y1, z1,
										x2, y2, z2,
										x3, y3, z3
									);
									//vertices are given clockwise, so v2-v1 and v3-v1 will do the job
									let normal = this.computeNormalVector(x2 - x1, y2 - y1, z2 - z1, x3 - x1, y3 - y1, z3 - z1);


									mesh.normals.push(...normal);
									mesh.normals.push(...normal);
									mesh.normals.push(...normal);

									let r = Math.random()
									let g = Math.random()
									let b = Math.random()
									mesh.colors.push(0.95 + r, 0.95 + g, 0.95 + b);//three
									mesh.colors.push(0.95 + r, 0.95 + g, 0.95 + b);//three
									mesh.colors.push(0.95 + r, 0.95 + g, 0.95 + b);//three


									//this.mesh.colors.push(0.9,0.9,0.9);//three
									//this.mesh.colors.push(0.9,0.9,0.9);//three
									//this.mesh.colors.push(0.9,0.9,0.9);//three

								}

								//adding only non zero faces
								if (z4 > 0 & z5 > 0 & z6 > 0) {
									//console.log(x4, y4, z4, x5, y5, z5, x6, y6, z6)
									mesh.vertices.push(
										x4, y4, z4,
										x5, y5, z5,
										x6, y6, z6
									);
									let normal = this.computeNormalVector(x5 - x4, y5 - y4, z5 - z4, x6 - x4, y6 - y4, z6 - z4);

									mesh.normals.push(...normal);
									mesh.normals.push(...normal);
									mesh.normals.push(...normal);


									/*
									this.mesh.colors.push(Math.random(),Math.random(),Math.random());//three
									this.mesh.colors.push(Math.random(),Math.random(),Math.random());//three
									this.mesh.colors.push(Math.random(),Math.random(),Math.random());//three
									*/
									let r = Math.random()
									let g = Math.random()
									let b = Math.random()
									mesh.colors.push(0.95 + r, 0.95 + g, 0.95 + b);//three
									mesh.colors.push(0.95 + r, 0.95 + g, 0.95 + b);//three
									mesh.colors.push(0.95 + r, 0.95 + g, 0.95 + b);//three
									/*
									this.mesh.colors.push(0.9,0.9,0.9);//three
									this.mesh.colors.push(0.9,0.9,0.9);//three
									this.mesh.colors.push(0.9,0.9,0.9);//three
									*/


								}


							}

						}

						logger.log('Data Length :' + data.length)
						logger.log(`Vertices Length 3*2*data:  ${mesh.vertices.length}`)
						//explicitly adding triangles

						buffergeometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.vertices, 3));
						buffergeometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
						buffergeometry.setAttribute('color', new THREE.Float32BufferAttribute(mesh.colors, 3));

						let tiffmesh = new THREE.Mesh(buffergeometry, meshMaterial);

						container.add(tiffmesh);
						return container;


					} catch (error) {
						console.log(error)
					}

				},



				computeNormalVector: function (x1, y1, z1, x2, y2, z2) {
					//cross product is required

					let nx = y1 * z2 - y2 * z1;
					let ny = -(x1 * z2 - x2 * z1);
					let nz = x1 * y2 - x2 * y1;
					return [nx, ny, nz];
				},


				parse: function (data) {

					//var state = new ParserState();

					//let demtiff = TIFF.decode(data);//which options


					//tiffDecoder.decodeHeader();

					let vertices = []; //require to compute min and also stote them

					//must push mesh vertices , grid will be created or stitched later



					// state.finalize();//???

					//storing bbox reference
					// state.reference = { x: state.minx, y: state.miny, z: state.minz };


					var container = new THREE.Group();//threejs group

					//storing the information to the container as a new attribute
					/*
	
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
	
					
	*/


				}//parse end
			}
		);

		return DEMTIFFLoaderGeo;


	}
});

export {COGSTerrainLoader};