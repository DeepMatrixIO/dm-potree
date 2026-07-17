
import {Utils} from "../../utils.js";

export class AnnotationPanel{
	constructor(viewer, propertiesPanel, annotation){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;
		this.annotation = annotation;

		this._update = () => { this.update(); };

		let copyIconPath = `${Potree.resourcePath}/icons/copy.svg`;
		const template = document.createElement("template");
		template.innerHTML = `
		<div class="propertypanel_content">
			<table>
				<tr>
					<th colspan="3">position</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="annotation_position_x" style="width: 25%"></td>
					<td align="center" id="annotation_position_y" style="width: 25%"></td>
					<td align="center" id="annotation_position_z" style="width: 25%"></td>
					<td align="right" id="copy_annotation_position" style="width: 25%">
						<img name="copyPosition" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>

			</table>

			<div>

				<div class="heading">Title</div>
				<div id="annotation_title" contenteditable="true">
					Annotation Title
				</div>

				<div class="heading">Description</div>
				<div id="annotation_description" contenteditable="true">
					A longer description of this annotation.
						Can be multiple lines long. TODO: the user should be able
						to modify title and description.
				</div>

			</div>

		</div>
		`;
		this.elContent = template.content.firstElementChild;

		this.elCopyPosition = this.elContent.querySelector("img[name=copyPosition]");
		this.elCopyPosition.addEventListener("click", () => {
			let pos = this.annotation.position.toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elTitle = this.elContent.querySelector("#annotation_title");
		this.elTitle.innerHTML = annotation.title;
		this.elDescription = this.elContent.querySelector("#annotation_description");
		this.elDescription.innerHTML = annotation.description;

		this.elTitle.addEventListener("input", () => {
			const title = this.elTitle.innerHTML;
			annotation.title = title;

		}, false);

		this.elDescription.addEventListener("input", () => {
			const description = this.elDescription.innerHTML;
			annotation.description = description;
		}, false);

		this.update();
	}

	update(){
		const {annotation, elContent, elTitle, elDescription} = this;

		let pos = annotation.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
		elContent.querySelector("#annotation_position_x").innerHTML = pos[0];
		elContent.querySelector("#annotation_position_y").innerHTML = pos[1];
		elContent.querySelector("#annotation_position_z").innerHTML = pos[2];

		elTitle.innerHTML = annotation.title;
		elDescription.innerHTML = annotation.description;


	}
};