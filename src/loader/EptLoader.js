/**
 * @author Connor Manning
 */


//do not use global potree, instead import modules

import {PointCloudCopcGeometryNode, PointCloudEptGeometry} from "../PointCloudEptGeometry.js";
import {updateFetchToken} from "../tokenUpdater.js"; //added by jguerrer

export class EptLoader {
	static async load(file, callback) {

		const fetchOptions = updateFetchToken({headers: {}});//added by jguerrer
		let response = await fetch(file, fetchOptions);
		//		let response = await fetch(file);
		let json = await response.json();

		let url = file.substr(0, file.lastIndexOf('/ept.json'));
		//let geometry = new Potree.PointCloudEptGeometry(url, json);
		//let root = new Potree.PointCloudCopcGeometryNode(geometry);
		let geometry = new PointCloudEptGeometry(url, json);
		let root = new PointCloudCopcGeometryNode(geometry);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
};

export class CopcLoader {
	static async load(file, callback) {
		const {Copc, Getter} = window.Copc
		//const {Copc, Getter} = Copc//created in from libs/copc/index.js

		const url = file;
		const getter = Getter.http(url);
		const copc = await Copc.create(getter);

		let geometry = new Potree.PointCloudCopcGeometry(getter, copc);
		let root = new Potree.PointCloudCopcGeometryNode(geometry);

		//let geometry = new PointCloudCopcGeometry(getter, copc);
		//let root = new PointCloudCopcGeometryNode(geometry);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
}
