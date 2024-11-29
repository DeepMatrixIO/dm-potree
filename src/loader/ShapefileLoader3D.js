

import * as THREE from "../../libs/three.js/build/three.module.js";
import {Line2} from "../../libs/three.js/lines/Line2.js";
import {LineGeometry} from "../../libs/three.js/lines/LineGeometry.js";
import {LineMaterial} from "../../libs/three.js/lines/LineMaterial.js";

 export default  class ShapefileLoader{

	constructor(){
		this.transform = null;
	}

	async load(path, offset	){

		offset=offset?offset:{x:0.0,y:0.0,z:0.0};//failproofing the loader

		const matLine = new LineMaterial( {
			color: 0xff0000,
			linewidth: 4, // in pixels
			resolution:  new THREE.Vector2(1000, 1000),
			dashed: false
		} );

		const features = await this.loadShapefileFeatures(path);
		const node = new THREE.Object3D();
		
		for(const feature of features){
			const fnode = this.featureToSceneNode(feature, matLine,offset);
			if( fnode instanceof Array){
				fnode.forEach(line => node.add(line) )
			}else
				node.add(fnode);
		}

		let setResolution = (x, y) => {
			matLine.resolution.set(x, y);
		};

		const result = {
			features: features,
			node: node,
			setResolution: setResolution,
		};

		return result;
	}

/**
 * Here, geometries are transformed into ThreeJS nodes, so they can be rendered.
 * 
 * 
 * Offset must be valid. No Further checks are performed at this step.
 * */
	featureToSceneNode(feature, matLine,offset){
		console.log(feature.geometry.type)
		let geometry = feature.geometry;
		
		let color = new THREE.Color(1, 1, 1);

		let transform = this.transform;
		if(transform === null){
			transform = {forward: (v) => v};
		}
		
		if(feature.geometry.type === "Point"){
			let sg = new THREE.SphereGeometry(1, 18, 18);
			let sm = new THREE.MeshNormalMaterial();
			let s = new THREE.Mesh(sg, sm);
			
			let [long, lat] = geometry.coordinates;
			let pos = transform.forward([long, lat]);
			
			s.position.set(...pos, 20);
			
			s.scale.set(10, 10, 10);
			
			return s;
		}
		if(feature.geometry.type === "PointZ"){
			let sg = new THREE.SphereGeometry(1, 18, 18);
			let sm = new THREE.MeshNormalMaterial();
			let s = new THREE.Mesh(sg, sm);
			
			let [long, lat] = geometry.coordinates;
			let pos = transform.forward([long, lat]);

			pos=[
					pos[0] + offset.x , 
					pos[1] + offset.y , 
					geometry.coordinates[2]  + offset.z 
				 	];

			
			s.position.set(...pos);
			
			s.scale.set(10, 10, 10);
			
			return s;
		} 
		
		if(geometry.type === "LineString"){
			let coordinates = [];
			
			let min = new THREE.Vector3(Infinity, Infinity, Infinity);
			for(let i = 0; i < geometry.coordinates.length; i++){
				let [long, lat] = geometry.coordinates[i];
				let pos = transform.forward([long, lat]);

				pos=[
					pos[0] + offset.x , 
					pos[1] + offset.y , 
					offset.z
					];

				
				min.x = Math.min(min.x, pos[0]);
				min.y = Math.min(min.y, pos[1]);
				min.z = Math.min(min.z, pos[2]);
				
				coordinates.push(...pos);
				if(i > 0 && i < geometry.coordinates.length - 1){
					coordinates.push(...pos);
				}
			}
			
			for(let i = 0; i < coordinates.length; i += 3){
				coordinates[i+0] -= min.x;
				coordinates[i+1] -= min.y;
				coordinates[i+2] -= min.z;
			}
			
			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions( coordinates );

			const line = new Line2( lineGeometry, matLine );
			line.computeLineDistances();
			line.scale.set( 1, 1, 1 );
			line.position.copy(min);
			
			return line;
		} 

		if(geometry.type === "LineStringZ"){
			let coordinates = [];
			
			let min = new THREE.Vector3(Infinity, Infinity, Infinity);
			for(let i = 0; i < geometry.coordinates.length; i++){
				let [long, lat] = geometry.coordinates[i];
				let pos = transform.forward([long, lat]);//only metric units
				//fix for Z coord and offset
				pos=[
					pos[0] + offset.x , 
					pos[1] + offset.y , 
					geometry.coordinates[i][2]  + offset.z 
				 	];

				min.x = Math.min(min.x, pos[0]);
				min.y = Math.min(min.y, pos[1]);
				min.z = Math.min(min.z, pos[2]);
				
				coordinates.push(...pos);
				if(i > 0 && i < geometry.coordinates.length - 1){
					coordinates.push(...pos);
				}
			}
			
			for(let i = 0; i < coordinates.length; i += 3){
				coordinates[i+0] -= min.x;
				coordinates[i+1] -= min.y;
				coordinates[i+2] -= min.z;
			}
			
			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions( coordinates );

			const line = new Line2( lineGeometry, matLine );
			line.computeLineDistances();
			line.scale.set( 1, 1, 1 );
			line.position.copy(min);
			
			return line;
		} 

		if(geometry.type === "MultiLineStringZ"){
			
			let lines=[];
			
			for(let i = 0; i < geometry.coordinates.length; i++){
							let min = new THREE.Vector3(Infinity, Infinity, Infinity);

			let coordinates = [];
				for(let j = 0; j < geometry.coordinates[i].length; j++){//all the points
				let [long, lat,z] = geometry.coordinates[i][j];
				let pos = transform.forward([long, lat]);
				
				pos=[
					pos[0] + offset.x , 
					pos[1] + offset.y , 
					z  + offset.z 
				 	];


				min.x = Math.min(min.x, pos[0]);
				min.y = Math.min(min.y, pos[1]);
				min.z = Math.min(min.z, pos[2]);
				
				coordinates.push(...pos);
				if(j > 0 && j < geometry.coordinates[i].length - 1){
					coordinates.push(...pos);
				}
			}
			
			for(let j = 0; j < coordinates.length; j += 3){
				coordinates[j+0] -= min.x;
				coordinates[j+1] -= min.y;
				coordinates[j+2] -= min.z;
			}
			
			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions( coordinates );

			const line = new Line2( lineGeometry, matLine );
			//line.computeLineDistances();
			line.scale.set( 1, 1, 1 );
			line.position.copy(min);
			
			//return line;
			lines.push(line)


		}
		return lines;

		}
		 
if(geometry.type === "MultiLineString"){
			
			let lines=[];
			
			for(let i = 0; i < geometry.coordinates.length; i++){
							let min = new THREE.Vector3(Infinity, Infinity, Infinity);

			let coordinates = [];
				for(let j = 0; j < geometry.coordinates[i].length; j++){//all the points
				let [long, lat] = geometry.coordinates[i][j];
				let pos = transform.forward([long, lat]);
				
				pos=[
					pos[0] + offset.x , 
					pos[1] + offset.y , 
					 offset.z 
				 	];


				min.x = Math.min(min.x, pos[0]);
				min.y = Math.min(min.y, pos[1]);
				min.z = Math.min(min.z, pos[2]);
				
				coordinates.push(...pos);
				if(j > 0 && j < geometry.coordinates[i].length - 1){
					coordinates.push(...pos);
				}
			}
			
			for(let j = 0; j < coordinates.length; j += 3){
				coordinates[j+0] -= min.x;
				coordinates[j+1] -= min.y;
				coordinates[j+2] -= min.z;
			}
			
			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions( coordinates );

			const line = new Line2( lineGeometry, matLine );
			//line.computeLineDistances();
			line.scale.set( 1, 1, 1 );
			line.position.copy(min);
			
			//return line;
			lines.push(line)


		}
		return lines;

		}
		 

		//todo.  Only the outline is considered. No fillers unless 2d or a mesh is created.
		if(geometry.type === "Polygon"){
			for(let pc of geometry.coordinates){
				let coordinates = [];
				
				let min = new THREE.Vector3(Infinity, Infinity, Infinity);
				for(let i = 0; i < pc.length; i++){
					let [long, lat] = pc[i];
					let pos = transform.forward([long, lat]);
					
					pos=[
					pos[0] + offset.x , 
					pos[1] + offset.y , 
					 offset.z 
				 	];

					min.x = Math.min(min.x, pos[0]);
					min.y = Math.min(min.y, pos[1]);
					min.z = Math.min(min.z, pos[2]);
					
					coordinates.push(...pos);
					if(i > 0 && i < pc.length - 1){
						coordinates.push(...pos);
					}
				}
				
				for(let i = 0; i < coordinates.length; i += 3){
					coordinates[i+0] -= min.x;
					coordinates[i+1] -= min.y;
					coordinates[i+2] -= min.z;
				}

				const lineGeometry = new LineGeometry();
				lineGeometry.setPositions( coordinates );

				const line = new Line2( lineGeometry, matLine );
				line.computeLineDistances();
				line.scale.set( 1, 1, 1 );
				line.position.copy(min);
				
				return line;
			}
		}

		if(geometry.type === "PolygonZ"){
			for(let pc of geometry.coordinates){
				let coordinates = [];
				
				let min = new THREE.Vector3(Infinity, Infinity, Infinity);
				for(let i = 0; i < pc.length; i++){
					let [long, lat,z] = pc[i];
					let pos = transform.forward([long, lat]);
					
					pos=[
					pos[0] + offset.x , 
					pos[1] + offset.y , 
					 z + offset.z 
				 	];

					min.x = Math.min(min.x, pos[0]);
					min.y = Math.min(min.y, pos[1]);
					min.z = Math.min(min.z, pos[2]);
					
					coordinates.push(...pos);
					if(i > 0 && i < pc.length - 1){
						coordinates.push(...pos);
					}
				}
				
				for(let i = 0; i < coordinates.length; i += 3){
					coordinates[i+0] -= min.x;
					coordinates[i+1] -= min.y;
					coordinates[i+2] -= min.z;
				}

				const lineGeometry = new LineGeometry();
				lineGeometry.setPositions( coordinates );

				const line = new Line2( lineGeometry, matLine );
				line.computeLineDistances();
				line.scale.set( 1, 1, 1 );
				line.position.copy(min);
				
				return line;
			}
		}else
		{
			console.log("unhandled feature: ", feature);
		}
	}

	async loadShapefileFeatures(file){
		let features = [];

		let source = await shapefile.open(file);

		while(true){
			let result = await source.read();

			if (result.done) {
				break;
			}

			if (result.value && result.value.type === 'Feature' && result.value.geometry !== undefined) {
				features.push(result.value);
			}
		}

		return features;
	}

};
export {ShapefileLoader};
