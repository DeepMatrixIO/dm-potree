

import {MeasurePanel} from "./MeasurePanel.js";

export class AnglePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		const template = document.createElement("template");
		template.innerHTML = `
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table class="measurement_value_table">
					<tr>
						<th>\u03b1</th>
						<th>\u03b2</th>
						<th>\u03b3</th>
					</tr>
					<tr>
						<td align="center" id="angle_cell_alpha" style="width: 33%"></td>
						<td align="center" id="angle_cell_betta" style="width: 33%"></td>
						<td align="center" id="angle_cell_gamma" style="width: 33%"></td>
					</tr>
				</table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`;
		this.elContent = template.content.firstElementChild;

		this.elRemove = this.elContent.querySelector("img[name=remove]");
		this.elRemove.addEventListener("click", () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.querySelector('.coordinates_table_container');
		elCoordiantesContainer.innerHTML = "";
		elCoordiantesContainer.appendChild(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let angles = [];
		for(let i = 0; i < this.measurement.points.length; i++){
			angles.push(this.measurement.getAngle(i) * (180.0 / Math.PI));
		}
		angles = angles.map(a => a.toFixed(1) + '\u00B0');

		let elAlpha = this.elContent.querySelector(`#angle_cell_alpha`);
		let elBetta = this.elContent.querySelector(`#angle_cell_betta`);
		let elGamma = this.elContent.querySelector(`#angle_cell_gamma`);

		elAlpha.innerHTML = angles[0];
		elBetta.innerHTML = angles[1];
		elGamma.innerHTML = angles[2];
	}
};