

import {MeasurePanel} from "./MeasurePanel.js";
import {Profile} from "./../../utils/Profile.js";

export class DistancePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		const template = document.createElement("template");
		template.innerHTML = `
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table id="distances_table" class="measurement_value_table"></table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span>
						<input type="button" name="make_profile" value="profile from measure" />
					</span>
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

		this.elMakeProfile = this.elContent.querySelector("input[name=make_profile]");
		this.elMakeProfile.addEventListener("click", () => {
			//measurement.points;
			const profile = new Profile();

			profile.name = measurement.name;
			profile.width = measurement.getTotalDistance() / 50;

			for(const point of measurement.points){
				profile.addMarker(point.position.clone());
			}

			this.viewer.scene.addProfile(profile);

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

		let positions = this.measurement.points.map(p => p.position);
		let distances = [];
		for (let i = 0; i < positions.length - 1; i++) {
			let d = positions[i].distanceTo(positions[i + 1]);
			distances.push(d.toFixed(3));
		}

		let totalDistance = this.measurement.getTotalDistance().toFixed(3);
		let elDistanceTable = this.elContent.querySelector(`#distances_table`);
		elDistanceTable.innerHTML = "";

		for (let i = 0; i < distances.length; i++) {
			let label = (i === 0) ? 'Distances: ' : '';
			let distance = distances[i];
			const elDistance = document.createElement("tr");
			elDistance.innerHTML = `
				<th>${label}</th>
				<td style="width: 100%; padding-left: 10px">${distance}</td>`;
			elDistanceTable.appendChild(elDistance);
		}

		const elTotal = document.createElement("tr");
		elTotal.innerHTML = `
			<th>Total: </td><td style="width: 100%; padding-left: 10px">${totalDistance}</th>`;
		elDistanceTable.appendChild(elTotal);
	}
};
