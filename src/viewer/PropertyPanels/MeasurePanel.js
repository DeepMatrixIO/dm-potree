

import {Utils} from "../../utils.js";

export class MeasurePanel{

	constructor(viewer, measurement, propertiesPanel){
		this.viewer = viewer;
		this.measurement = measurement;
		this.propertiesPanel = propertiesPanel;

		this._update = () => { this.update(); };
	}

	createCoordinatesTable(points){
		const table = document.createElement("table");
		table.className = "measurement_value_table";
		table.innerHTML = `
			<tr>
				<th>x</th>
				<th>y</th>
				<th>z</th>
				<th></th>
			</tr>
		`;

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';

		for (let point of points) {
			let x = Utils.addCommas(point.x.toFixed(3));
			let y = Utils.addCommas(point.y.toFixed(3));
			let z = Utils.addCommas(point.z.toFixed(3));

			const row = document.createElement("tr");
			row.innerHTML = `
				<td><span>${x}</span></td>
				<td><span>${y}</span></td>
				<td><span>${z}</span></td>
				<td align="right" style="width: 25%">
					<img name="copy" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
				</td>
			`;

			this.elCopy = row.querySelector("img[name=copy]");
			this.elCopy.addEventListener("click", () => {
				let msg = point.toArray().map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
			});

			table.appendChild(row);
		}

		return table;
	};

	createAttributesTable(){
		const elTable = document.createElement("table");
		elTable.className = "measurement_value_table";

		let point = this.measurement.points[0];

		for(let attributeName of Object.keys(point)){
			if(attributeName === "position"){

			}else if(attributeName === "rgba"){
				let color = point.rgba;
				let text = color.join(', ');

				const row = document.createElement("tr");
				row.innerHTML = `
					<td>rgb</td>
					<td>${text}</td>
				`;
				elTable.appendChild(row);
			}else{
				let value = point[attributeName];
				let text = value.join(', ');

				const row = document.createElement("tr");
				row.innerHTML = `
					<td>${attributeName}</td>
					<td>${text}</td>
				`;
				elTable.appendChild(row);
			}
		}

		return elTable;
	}

	update(){

	}
};