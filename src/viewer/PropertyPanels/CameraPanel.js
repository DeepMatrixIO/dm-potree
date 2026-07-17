
import {Utils} from "../../utils.js";

export class CameraPanel{
	constructor(viewer, propertiesPanel){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;

		this._update = () => { this.update(); };

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
		const template = document.createElement("template");
		template.innerHTML = `
		<div class="propertypanel_content">
			<table>
				<tr>
					<th colspan="3">position</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="camera_position_x" style="width: 25%"></td>
					<td align="center" id="camera_position_y" style="width: 25%"></td>
					<td align="center" id="camera_position_z" style="width: 25%"></td>
					<td align="right" id="copy_camera_position" style="width: 25%">
						<img name="copyPosition" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
				<tr>
					<th colspan="3">target</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="camera_target_x" style="width: 25%"></td>
					<td align="center" id="camera_target_y" style="width: 25%"></td>
					<td align="center" id="camera_target_z" style="width: 25%"></td>
					<td align="right" id="copy_camera_target" style="width: 25%">
						<img name="copyTarget" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			</table>
		</div>
		`;
		this.elContent = template.content.firstElementChild;

		this.elCopyPosition = this.elContent.querySelector("img[name=copyPosition]");
		this.elCopyPosition.addEventListener("click", () => {
			let pos = this.viewer.scene.getActiveCamera().position.toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elCopyTarget = this.elContent.querySelector("img[name=copyTarget]");
		this.elCopyTarget.addEventListener("click", () => {
			let pos = this.viewer.scene.view.getPivot().toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.propertiesPanel.addVolatileListener(viewer, "camera_changed", this._update);

		this.update();
	}

	update(){
		//console.log("updating camera panel");

		let camera = this.viewer.scene.getActiveCamera();
		let view = this.viewer.scene.view;

		let pos = camera.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
		this.elContent.querySelector("#camera_position_x").innerHTML = pos[0];
		this.elContent.querySelector("#camera_position_y").innerHTML = pos[1];
		this.elContent.querySelector("#camera_position_z").innerHTML = pos[2];

		let target = view.getPivot().toArray().map(c => Utils.addCommas(c.toFixed(3)));
		this.elContent.querySelector("#camera_target_x").innerHTML = target[0];
		this.elContent.querySelector("#camera_target_y").innerHTML = target[1];
		this.elContent.querySelector("#camera_target_z").innerHTML = target[2];
	}
};