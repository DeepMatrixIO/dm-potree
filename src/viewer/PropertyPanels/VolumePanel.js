
// import * as THREE from "../../../libs/js/build/module.js";
import {Vector3,Matrix4, Plane} from 'three'
import {updateFetchToken} from "../../tokenUpdater.js";
import {Utils} from "../../utils.js";
import {BoxVolume, SphereVolume} from "../../utils/Volume.js";

import {MeasurePanel} from "./MeasurePanel.js";

export class VolumePanel extends MeasurePanel {
	constructor(viewer, measurement, propertiesPanel) {
		super(viewer, measurement, propertiesPanel);

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';

		let lblLengthText = new Map([
			[BoxVolume, "length"],
			[SphereVolume, "rx"],
		]).get(measurement.constructor);

		let lblWidthText = new Map([
			[BoxVolume, "width"],
			[SphereVolume, "ry"],
		]).get(measurement.constructor);

		let lblHeightText = new Map([
			[BoxVolume, "height"],
			[SphereVolume, "rz"],
		]).get(measurement.constructor);

		this.elContent = document.createElement("template");
		this.elContent.innerHTML = `
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>

				<table class="measurement_value_table">
					<tr>
						<th>\u03b1</th>
						<th>\u03b2</th>
						<th>\u03b3</th>
						<th></th>
					</tr>
					<tr>
						<td align="center" id="angle_cell_alpha" style="width: 33%"></td>
						<td align="center" id="angle_cell_betta" style="width: 33%"></td>
						<td align="center" id="angle_cell_gamma" style="width: 33%"></td>
						<td align="right" style="width: 25%">
							<img name="copyRotation" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
				</table>

				<table class="measurement_value_table">
					<tr>
						<th>${lblLengthText}</th>
						<th>${lblWidthText}</th>
						<th>${lblHeightText}</th>
						<th></th>
					</tr>
					<tr>
						<td align="center" id="cell_length" style="width: 33%"></td>
						<td align="center" id="cell_width" style="width: 33%"></td>
						<td align="center" id="cell_height" style="width: 33%"></td>
						<td align="right" style="width: 25%">
							<img name="copyScale" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
				</table>

				<br>
				<span style="font-weight: bold">Volume: </span>
				<span id="measurement_volume"></span>

				<!--
				<li>
					<label style="whitespace: nowrap">
						<input id="volume_show" type="checkbox"/>
						<span>show volume</span>
					</label>
				</li>-->

				<li>
					<label style="whitespace: nowrap">
						<input id="volume_clip" type="checkbox"/>
						<span>make clip volume</span>
					</label>
				</li>

				<li style="margin-top: 10px">
					<input name="download_volume" type="button" value="prepare download" style="width: 100%" />
					<div name="download_message"></div>
				</li>


				<!-- ACTIONS -->
				<li style="display: grid; grid-template-columns: auto auto; grid-column-gap: 5px; margin-top: 10px">
					<input id="volume_reset_orientation" type="button" value="reset orientation"/>
					<input id="volume_make_uniform" type="button" value="make uniform"/>
				</li>
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`;
		this.elContent = this.elContent.content.firstElementChild;

		{ // download
			this.elDownloadButton = this.elContent.querySelector("input[name=download_volume]");

			if (this.propertiesPanel.viewer.server) {
				this.elDownloadButton.addEventListener("click", () => this.download());
			} else {
				this.elDownloadButton.style.display = "none";
			}
		}

		this.elCopyRotation = this.elContent.querySelector("img[name=copyRotation]");
		this.elCopyRotation.addEventListener("click", () => {
			let rotation = this.measurement.rotation.toArray().slice(0, 3);
			let msg = rotation.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
				`Copied value to clipboard: <br>'${msg}'`,
				{duration: 3000});
		});

		this.elCopyScale = this.elContent.querySelector("img[name=copyScale]");
		this.elCopyScale.addEventListener("click", () => {
			let scale = this.measurement.scale.toArray();
			let msg = scale.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
				`Copied value to clipboard: <br>'${msg}'`,
				{duration: 3000});
		});

		this.elRemove = this.elContent.querySelector("img[name=remove]");
		this.elRemove.addEventListener("click", () => {
			this.viewer.scene.removeVolume(measurement);
		});

		this.elContent.querySelector("#volume_reset_orientation").addEventListener("click", () => {
			measurement.rotation.set(0, 0, 0);
		});

		this.elContent.querySelector("#volume_make_uniform").addEventListener("click", () => {
			let mean = (measurement.scale.x + measurement.scale.y + measurement.scale.z) / 3;
			measurement.scale.set(mean, mean, mean);
		});

		this.elCheckClip = this.elContent.querySelector('#volume_clip');
		this.elCheckClip.addEventListener("click", event => {
			this.measurement.clip = event.target.checked;
		});

		this.elCheckShow = this.elContent.querySelector('#volume_show');
		if(this.elCheckShow){
			this.elCheckShow.addEventListener("click", event => {
				this.measurement.visible = event.target.checked;
			});
		}

		this.propertiesPanel.addVolatileListener(measurement, "position_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "orientation_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "scale_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "clip_changed", this._update);

		this.update();
	}

	async download() {

		let clipBox = this.measurement;

		let regions = [];
		//for(let clipBox of boxes){
		{
			let toClip = clipBox.matrixWorld;

			let px = new Vector3(+0.5, 0, 0).applyMatrix4(toClip);
			let nx = new Vector3(-0.5, 0, 0).applyMatrix4(toClip);
			let py = new Vector3(0, +0.5, 0).applyMatrix4(toClip);
			let ny = new Vector3(0, -0.5, 0).applyMatrix4(toClip);
			let pz = new Vector3(0, 0, +0.5).applyMatrix4(toClip);
			let nz = new Vector3(0, 0, -0.5).applyMatrix4(toClip);

			let pxN = new Vector3().subVectors(nx, px).normalize();
			let nxN = pxN.clone().multiplyScalar(-1);
			let pyN = new Vector3().subVectors(ny, py).normalize();
			let nyN = pyN.clone().multiplyScalar(-1);
			let pzN = new Vector3().subVectors(nz, pz).normalize();
			let nzN = pzN.clone().multiplyScalar(-1);

			let planes = [
				new Plane().setFromNormalAndCoplanarPoint(pxN, px),
				new Plane().setFromNormalAndCoplanarPoint(nxN, nx),
				new Plane().setFromNormalAndCoplanarPoint(pyN, py),
				new Plane().setFromNormalAndCoplanarPoint(nyN, ny),
				new Plane().setFromNormalAndCoplanarPoint(pzN, pz),
				new Plane().setFromNormalAndCoplanarPoint(nzN, nz),
			];

			let planeQueryParts = [];
			for (let plane of planes) {
				let part = [plane.normal.toArray(), plane.constant].join(",");
				part = `[${part}]`;
				planeQueryParts.push(part);
			}
			let region = "[" + planeQueryParts.join(",") + "]";
			regions.push(region);
		}

		let regionsArg = regions.join(",");

		let pointcloudArgs = [];
		for (let pointcloud of this.viewer.scene.pointclouds) {
			if (!pointcloud.visible) {
				continue;
			}

			let offset = pointcloud.pcoGeometry.offset.clone();
			let negateOffset = new Matrix4().makeTranslation(...offset.multiplyScalar(-1).toArray());
			let matrixWorld = pointcloud.matrixWorld;

			let transform = new Matrix4().multiplyMatrices(matrixWorld, negateOffset);

			let path = `${window.location.pathname}/../${pointcloud.pcoGeometry.url}`;

			let arg = {
				path: path,
				transform: transform.elements,
			};
			let argString = JSON.stringify(arg);

			pointcloudArgs.push(argString);
		}
		let pointcloudsArg = pointcloudArgs.join(",");

		let elMessage = this.elContent.querySelector("div[name=download_message]");

		let error = (message) => {
			elMessage.innerHTML = `<div style="color: #ff0000">ERROR: ${message}</div>`;
		};

		let info = (message) => {
			elMessage.innerHTML = `${message}`;
		};

		let handle = null;
		{ // START FILTER
			let url = `${viewer.server}/create_regions_filter?pointclouds=[${pointcloudsArg}]&regions=[${regionsArg}]`;

			//console.log(url);

			info("estimating results ...");

			const fetchOptions = updateFetchToken({headers: {}});//added by jguerrer

			let response = await fetch(url, fetchOptions);

			let jsResponse = await response.json();
			//console.log(jsResponse);

			if (!jsResponse.handle) {
				error(jsResponse.message);
				return;
			} else {
				handle = jsResponse.handle;
			}
		}

		{ // WAIT, CHECK PROGRESS, HANDLE FINISH
			let url = `${viewer.server}/check_regions_filter?handle=${handle}`;

			let sleep = (function (duration) {
				return new Promise((res, rej) => {
					setTimeout(() => {
						res();
					}, duration);
				});
			});

			let handleFiltering = (jsResponse) => {
				let {progress, estimate} = jsResponse;

				let progressFract = progress["processed points"] / estimate.points;
				let progressPercents = parseInt(progressFract * 100);

				info(`progress: ${progressPercents}%`);
			};

			let handleFinish = (jsResponse) => {
				let message = "downloads ready: <br>";
				message += "<ul>";

				for (let i = 0; i < jsResponse.pointclouds.length; i++) {
					let url = `${viewer.server}/download_regions_filter_result?handle=${handle}&index=${i}`;

					message += `<li><a href="${url}">result_${i}.las</a> </li>\n`;
				}

				let reportURL = `${viewer.server}/download_regions_filter_report?handle=${handle}`;
				message += `<li> <a href="${reportURL}">report.json</a> </li>\n`;
				message += "</ul>";

				info(message);
			};

			let handleUnexpected = (jsResponse) => {
				let message = `Unexpected Response. <br>status: ${jsResponse.status} <br>message: ${jsResponse.message}`;
				info(message);
			};

			let handleError = (jsResponse) => {
				let message = `ERROR: ${jsResponse.message}`;
				error(message);

				throw new Error(message);
			};

			let start = Date.now();

			while (true) {
				const fetchOptions = updateFetchToken({headers: {}});//added by jguerrer

				let response = await fetch(url, fetchOptions);

				let jsResponse = await response.json();

				if (jsResponse.status === "ERROR") {
					handleError(jsResponse);
				} else if (jsResponse.status === "FILTERING") {
					handleFiltering(jsResponse);
				} else if (jsResponse.status === "FINISHED") {
					handleFinish(jsResponse);

					break;
				} else {
					handleUnexpected(jsResponse);
				}

				let durationS = (Date.now() - start) / 1000;
				let sleepAmountMS = durationS < 10 ? 100 : 1000;

				await sleep(sleepAmountMS);
			}
		}

	}

	//removes toVector3
	update() {
		let elCoordiantesContainer = this.elContent.querySelector('.coordinates_table_container');
		elCoordiantesContainer.innerHTML = "";
		elCoordiantesContainer.appendChild(this.createCoordinatesTable([this.measurement.position]));

		{
			let euler= this.measurement.rotation;

			let angles =new Vector3(euler.x, euler.y, euler.z);
			angles = angles.toArray();
			//angles = [angles.z, angles.x, angles.y];
			angles = angles.map(v => 180 * v / Math.PI);
			angles = angles.map(a => a.toFixed(1) + '\u00B0');

			let elAlpha = this.elContent.querySelector(`#angle_cell_alpha`);
			let elBetta = this.elContent.querySelector(`#angle_cell_betta`);
			let elGamma = this.elContent.querySelector(`#angle_cell_gamma`);

			elAlpha.innerHTML = angles[0];
			elBetta.innerHTML = angles[1];
			elGamma.innerHTML = angles[2];
		}

		{
			let dimensions = this.measurement.scale.toArray();
			dimensions = dimensions.map(v => Utils.addCommas(v.toFixed(2)));

			let elLength = this.elContent.querySelector(`#cell_length`);
			let elWidth = this.elContent.querySelector(`#cell_width`);
			let elHeight = this.elContent.querySelector(`#cell_height`);

			elLength.innerHTML = dimensions[0];
			elWidth.innerHTML = dimensions[1];
			elHeight.innerHTML = dimensions[2];
		}

		{
			let elVolume = this.elContent.querySelector(`#measurement_volume`);
			let volume = this.measurement.getVolume();
			elVolume.innerHTML = Utils.addCommas(volume.toFixed(2));
		}

		this.elCheckClip.checked = this.measurement.clip;
		if(this.elCheckShow){
			this.elCheckShow.checked = this.measurement.visible;
		}

	}
};