

import * as THREE from "../../libs/three.js/build/three.module.js";
import {ClipVolume} from "./ClipVolume.js";
import {PolygonClipVolume} from "./PolygonClipVolume.js";
import {EventDispatcher} from "../EventDispatcher.js";
import {KeyCodes} from "../KeyCodes.js";

export class ClippingTool extends EventDispatcher {

	constructor(viewer) {
		super();

		this.viewer = viewer;

		//this.maxPolygonVertices = 8;
		this.maxPolygonVertices = 64;

		this.addEventListener("start_inserting_clipping_volume", e => {
			this.viewer.disableControls();


		});

		this.sceneMarker = new THREE.Scene();
		this.sceneVolume = new THREE.Scene();
		this.sceneVolume.name = "scene_clip_volume";
		this.viewer.inputHandler.registerInteractiveScene(this.sceneVolume);

		this.onRemove = e => {
			this.sceneVolume.remove(e.volume);
		};

		this.onAdd = e => {
			this.sceneVolume.add(e.volume);
		};

		this.viewer.inputHandler.addEventListener("delete", e => {
			// let volumes = e.selection.filter(e => (e instanceof ClipVolume));//apparentrly is not in use
			// volumes.forEach(e => this.viewer.scene.removeClipVolume(e));//aparently not in use
			let polyVolumes = e.selection.filter(e => (e instanceof PolygonClipVolume));
			polyVolumes.forEach(e => {
				this.viewer.scene.removePolygonClipVolume(e);
				this.viewer.scene.removeMixedFilter(e);
			});
		});
	}

	setScene(scene) {
		if (this.scene === scene) {
			return;
		}

		if (this.scene) {
			this.scene.removeEventListeners("clip_volume_added", this.onAdd);
			this.scene.removeEventListeners("clip_volume_removed", this.onRemove);
			this.scene.removeEventListeners("polygon_clip_volume_added", this.onAdd);
			this.scene.removeEventListeners("polygon_clip_volume_removed", this.onRemove);
		}

		this.scene = scene;

		this.scene.addEventListener("clip_volume_added", this.onAdd);
		this.scene.addEventListener("clip_volume_removed", this.onRemove);
		this.scene.addEventListener("polygon_clip_volume_added", this.onAdd);
		this.scene.addEventListener("polygon_clip_volume_removed", this.onRemove);
	}

	startInsertion(args = {}) {


		let type = args.type || null;

		if (!type) return null;

		let domElement = this.viewer.renderer.domElement;
		let canvasSize = this.viewer.renderer.getSize(new THREE.Vector2());

		let svg = $(`
		<svg height="${canvasSize.height}" width="${canvasSize.width}" style="position:absolute; pointer-events: none">

			<defs>
				 <marker id="diamond" markerWidth="24" markerHeight="24" refX="12" refY="12"
						markerUnits="userSpaceOnUse">
					<circle cx="12" cy="12" r="6" fill="white" stroke="black" stroke-width="3"/>
				</marker>
			</defs>

			<polyline  stroke="black"

				style="stroke:rgb(0, 0, 0);
				fill-opacity:0.5;
				polygon-fill="rgba(200,0,0,0.5)"
				stroke-width:6;"
				stroke-dasharray="9, 6"
				stroke-dashoffset="2"
				/>

			<polyline fill="none" stroke="black"
				style="stroke:rgb(255, 255, 255);
				stroke-width:2;"
				stroke-dasharray="5, 10"
				marker-start="url(#diamond)"
				marker-mid="url(#diamond)"
				marker-end="url(#diamond)"
				/>
		</svg>`);
		$(domElement.parentElement).append(svg);

		let polyClipVol = new PolygonClipVolume(this.viewer.scene.getActiveCamera().clone());
		this.viewer.dispatchEvent({
			type: "cancel_insertions", source: polyClipVol, reason: "start_insertion"
		});
		polyClipVol.initialized = false;
		this.dispatchEvent({"type": "start_inserting_clipping_volume"});

		this.viewer.scene.addPolygonClipVolume(polyClipVol);
		this.sceneMarker.add(polyClipVol);

		let cancel = {
			callback: null
		};

		let insertionCallback = (e) => {
			if (e.button === THREE.MOUSE.LEFT) {

				polyClipVol.addMarker();

				// SVC Screen Line
				svg.find("polyline").each((index, target) => {
					let newPoint = svg[0].createSVGPoint();
					newPoint.x = e.offsetX;
					newPoint.y = e.offsetY;
					let polyline = target.points.appendItem(newPoint);
				});


				if (polyClipVol.markers.length > this.maxPolygonVertices) {
					cancel.callback();
				}

				this.viewer.inputHandler.startDragging(
					polyClipVol.markers[polyClipVol.markers.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {

				cancel.callback(e);
			}
		};

		cancel.callback = e => {

			//let first = svg.find("polyline")[0].points[0];
			//svg.find("polyline").each((index, target) => {
			//	let newPoint = svg[0].createSVGPoint();
			//	newPoint.x = first.x;
			//	newPoint.y = first.y;
			//	let polyline = target.points.appendItem(newPoint);
			//});
			svg.remove();

			if (polyClipVol.markers.length > 3) {
				if (polyClipVol.markers.length == this.maxPolygonVertices) {//bounded to 8
					polyClipVol.removeLastMarker();
				}
				//polyClipVol.removeLastMarker();//las marker was removed with no reason
				polyClipVol.initialized = true;
			} else {
				this.viewer.scene.removePolygonClipVolume(polyClipVol);
			}
			this.viewer.renderer.domElement.removeEventListener("mouseup", insertionCallback, true);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
			this.viewer.removeEventListener("keydown", cancelKey);

			this.viewer.inputHandler.enabled = true;
			this.viewer.enableControls();

			// this.viewer.dispatchEvent({type: "cancel_polygon_insertions"});
			this.viewer.dispatchEvent({type: "polygon_insertions_completed"});



		};


		let cancelInsertion = (polyClipVol) => {

			if (polyClipVol.initialized) {
				return
			}
			svg.remove();

			this.viewer.scene.removeMixedFilter(polyClipVol);
			this.viewer.scene.removePolygonClipVolume(polyClipVol);
			this.viewer.renderer.domElement.removeEventListener("mouseup", insertionCallback, true);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
			this.viewer.inputHandler.enabled = true;
			this.viewer.enableControls();
			// this.viewer.dispatchEvent({type: "cancel_polygon_insertions"});
			//this.dispatchEvent({type: "volume_insertion_canceled", volume: polyClipVol});

			this.viewer.inputHandler.removeEventListener("keydown", cancelKey);

		};


		// this.viewer.addEventListener("cancel_insertions", cancel.callback);
		this.viewer.addEventListener("cancel_insertions",

			e => {
				// if (e.source == polyClipVol && polyClipVol.initialized) {
				// 	return;
				// }
				console.log("canceling insertions")
				cancelInsertion(polyClipVol);
				this.viewer.inputHandler.removeEventListener("keydown", cancelKey);


			});
		this.viewer.addEventListener("polygon_insertions_cancelled", cancel.callback);
		this.viewer.renderer.domElement.addEventListener("mouseup", insertionCallback, true);
		this.viewer.inputHandler.enabled = false;


		let cancelKey = e => {
			// console.log("Pressing cancel key ", e.key)
			if (e.keyCode === KeyCodes.ESCAPE) {
				// $(selectionBox).remove();

				this.viewer.dispatchEvent({
					type: "cancel_insertions", source: polyClipVol, reason: "cancel_insertion"
				});
				//cancelInsertion(polyClipVol);


			} else {
				console.warn("Unknown key pressed for canceling insertion: ", e.key);
			}
		};


		this.viewer.inputHandler.addEventListener("keydown", cancelKey);




		polyClipVol.addMarker();
		this.viewer.inputHandler.startDragging(
			polyClipVol.markers[polyClipVol.markers.length - 1]);

		return polyClipVol;
	}

	update() {

	}
};