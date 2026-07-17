
import {Box3, Camera, Object3D, OrthographicCamera, PerspectiveCamera, Vector2, Vector3} from 'three';
import {Annotation} from "../Annotation.js";
import {CameraMode, ClipMethod, ClipTask} from "../defines.js";
import {DXFExporter} from "../exporter/DXFExporter.js";
import {GeoJSONExporter} from "../exporter/GeoJSONExporter.js";
import {CameraAnimation} from "../modules/CameraAnimation/CameraAnimation.js";
import {Images360} from "../modules/Images360/Images360.js";
import {OrientedImage} from "../modules/OrientedImages/OrientedImages.js";
import {PointCloudTree} from "../PointCloudTree.js";
import {Utils} from "../utils.js";
import {Measure} from "../utils/Measure.js";
import {PolygonClipVolume} from "../utils/PolygonClipVolume.js";
import {Profile} from "../utils/Profile.js";
import {ScreenBoxSelectTool} from "../utils/ScreenBoxSelectTool.js";
import {SphereVolume, Volume} from "../utils/Volume.js";
import {HierarchicalSlider} from "./HierarchicalSlider.js";
import {PropertiesPanel} from "./PropertyPanels/PropertiesPanel.js";
import JSON5 from "../../libs/json5-2.1.3/json5.mjs";

function convertSelectgroup(elSelectgroup, title = "") {
	if (!elSelectgroup) return;
	const options = elSelectgroup.querySelectorAll("option");
	const rootId = elSelectgroup.id;
	const fieldset = document.createElement("fieldset");
	fieldset.style.border = "none";
	fieldset.style.margin = "0px";
	fieldset.style.padding = "0px";
	fieldset.style.width = "100%";

	if (title) {
		const legend = document.createElement("legend");
		legend.textContent = title;
		legend.style.padding = "0";
		legend.style.color = "#9AA1A4";
		legend.style.fontSize = "90%";
		fieldset.appendChild(legend);
	}

	const container = document.createElement("div");
	container.style.display = "flex";
	container.style.gap = "2px";
	container.className = "selectgroup-container";
	fieldset.appendChild(container);

	options.forEach(opt => {
		const optionId = opt.id || (rootId + "_" + opt.value);
		const labelText = opt.innerHTML;
		const value = opt.value;

		const span = document.createElement("span");
		span.style.flexGrow = "1";
		span.style.display = "inline-inherit";

		const input = document.createElement("input");
		input.type = "radio";
		input.name = rootId;
		input.id = optionId;
		input.value = value;
		input.style.display = "none";

		const label = document.createElement("label");
		label.setAttribute("for", optionId);
		label.className = "ui-button ui-widget ui-corner-all ui-state-default";
		label.style.width = "100%";
		label.style.padding = "0.4em 0.1em";
		label.style.textAlign = "center";
		label.style.display = "block";
		label.style.cursor = "pointer";
		label.innerHTML = labelText;

		input.addEventListener("change", () => {
			container.querySelectorAll("label").forEach(lbl => {
				lbl.classList.remove("ui-state-active");
				lbl.classList.add("ui-state-default");
			});
			if (input.checked) {
				label.classList.remove("ui-state-default");
				label.classList.add("ui-state-active");
			}
		});

		span.appendChild(input);
		span.appendChild(label);
		container.appendChild(span);
	});

	elSelectgroup.innerHTML = "";
	elSelectgroup.appendChild(fieldset);
}

class VanillaSingleSlider {
	constructor(container, params) {
		this.container = container;
		this.container.innerHTML = "";
		this.input = document.createElement("input");
		this.input.type = "range";
		this.input.min = params.min !== undefined ? params.min : 0;
		this.input.max = params.max !== undefined ? params.max : 100;
		this.input.step = params.step !== undefined ? params.step : 1;
		this.input.value = params.value !== undefined ? params.value : this.input.min;
		this.input.style.width = "100%";
		this.input.style.margin = "8px 0";
		this.input.style.cursor = "pointer";

		if (params.slide) {
			this.input.addEventListener("input", (e) => {
				params.slide(e, { value: parseFloat(this.input.value) });
			});
		}
		this.container.appendChild(this.input);
	}

	slider(action, optionName, optionValue) {
		if (action === "value") {
			if (optionName !== undefined) {
				this.input.value = optionName;
			} else {
				return parseFloat(this.input.value);
			}
		} else if (action === "option") {
			if (optionValue !== undefined) {
				if (optionName === "value") {
					this.input.value = optionValue;
				} else {
					this.input[optionName] = optionValue;
				}
			} else {
				return this.input[optionName];
			}
		}
	}
}

class VanillaDoubleSlider {
	constructor(container, params) {
		this.container = container;
		this.container.innerHTML = "";
		this.min = params.min !== undefined ? params.min : 0;
		this.max = params.max !== undefined ? params.max : 100;
		this.values = params.values !== undefined ? [...params.values] : [this.min, this.max];
		this.step = params.step !== undefined ? params.step : 1;
		this.onSlide = params.slide;

		this.element = document.createElement("div");
		this.element.style.position = "relative";
		this.element.style.height = "24px";
		this.element.style.margin = "8px 0";
		this.element.style.display = "flex";
		this.element.style.alignItems = "center";
		this.element.style.width = "100%";

		const track = document.createElement("div");
		track.style.position = "absolute";
		track.style.left = "0";
		track.style.right = "0";
		track.style.height = "6px";
		track.style.backgroundColor = "#ccc";
		track.style.borderRadius = "3px";
		this.element.appendChild(track);

		this.highlight = document.createElement("div");
		this.highlight.style.position = "absolute";
		this.highlight.style.height = "6px";
		this.highlight.style.backgroundColor = "#5d9cec";
		this.highlight.style.borderRadius = "3px";
		this.element.appendChild(this.highlight);

		this.inputMin = document.createElement("input");
		this.inputMin.type = "range";
		this.inputMin.style.position = "absolute";
		this.inputMin.style.width = "100%";
		this.inputMin.style.pointerEvents = "none";
		this.inputMin.style.background = "none";
		this.inputMin.style.appearance = "none";
		this.inputMin.style.webkitAppearance = "none";
		this.inputMin.style.margin = "0";
		this.inputMin.style.zIndex = "2";
		this.element.appendChild(this.inputMin);

		this.inputMax = document.createElement("input");
		this.inputMax.type = "range";
		this.inputMax.style.position = "absolute";
		this.inputMax.style.width = "100%";
		this.inputMax.style.pointerEvents = "none";
		this.inputMax.style.background = "none";
		this.inputMax.style.appearance = "none";
		this.inputMax.style.webkitAppearance = "none";
		this.inputMax.style.margin = "0";
		this.inputMax.style.zIndex = "2";
		this.element.appendChild(this.inputMax);

		let styleId = "vanilla-slider-style-injected-sidebar";
		if (!document.getElementById(styleId)) {
			let style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				.vanilla-slider-container-sidebar input[type="range"]::-webkit-slider-thumb {
					pointer-events: auto;
					width: 14px;
					height: 14px;
					border-radius: 50%;
					background: #ffffff;
					border: 2px solid #5d9cec;
					cursor: pointer;
					-webkit-appearance: none;
					box-shadow: 0 1px 3px rgba(0,0,0,0.3);
					margin-top: -4px;
				}
				.vanilla-slider-container-sidebar input[type="range"]::-moz-range-thumb {
					pointer-events: auto;
					width: 14px;
					height: 14px;
					border-radius: 50%;
					background: #ffffff;
					border: 2px solid #5d9cec;
					cursor: pointer;
					box-shadow: 0 1px 3px rgba(0,0,0,0.3);
				}
				.vanilla-slider-container-sidebar input[type="range"]::-webkit-slider-runnable-track {
					height: 6px;
					background: transparent;
					border: none;
				}
				.vanilla-slider-container-sidebar input[type="range"]::-moz-range-track {
					height: 6px;
					background: transparent;
					border: none;
				}
			`;
			document.head.appendChild(style);
		}
		this.element.className = "vanilla-slider-container-sidebar";

		this.inputMin.addEventListener("input", () => this.onInputChanged("min"));
		this.inputMax.addEventListener("input", () => this.onInputChanged("max"));

		this.updateDom();
		this.container.appendChild(this.element);
	}

	updateDom() {
		if (this.min >= this.max) this.max = this.min + 0.0001;

		this.inputMin.min = this.min;
		this.inputMin.max = this.max;
		this.inputMin.step = this.step;
		this.inputMin.value = this.values[0];

		this.inputMax.min = this.min;
		this.inputMax.max = this.max;
		this.inputMax.step = this.step;
		this.inputMax.value = this.values[1];

		this.updateHighlight();
	}

	updateHighlight() {
		let rangeDiff = this.max - this.min;
		let percent1 = rangeDiff > 0 ? ((this.values[0] - this.min) / rangeDiff) * 100 : 0;
		let percent2 = rangeDiff > 0 ? ((this.values[1] - this.min) / rangeDiff) * 100 : 100;

		this.highlight.style.left = percent1 + "%";
		this.highlight.style.width = (percent2 - percent1) + "%";
	}

	onInputChanged(origin) {
		let valMin = parseFloat(this.inputMin.value);
		let valMax = parseFloat(this.inputMax.value);

		if (origin === "min") {
			if (valMin > valMax) {
				valMin = valMax;
				this.inputMin.value = valMin;
			}
		} else {
			if (valMax < valMin) {
				valMax = valMin;
				this.inputMax.value = valMax;
			}
		}

		this.values = [valMin, valMax];
		this.updateHighlight();

		if (this.onSlide) {
			this.onSlide({}, { values: [...this.values] });
		}
	}

	slider(action, optionName, optionValue) {
		if (action === "values") {
			if (optionName !== undefined) {
				this.values = [...optionName];
				this.updateDom();
			} else {
				return [...this.values];
			}
		}
	}
}

function initVanillaSlider(container, params) {
	if (!container) return null;
	if (params.range === true) {
		return new VanillaDoubleSlider(container, params);
	} else {
		return new VanillaSingleSlider(container, params);
	}
}

class VanillaTree {
	constructor(parentContainer) {
		this.parentContainer = parentContainer;
		this.parentContainer.innerHTML = "";
		this.element = document.createElement("ul");
		this.element.className = "vanilla-tree-root";
		this.element.style.listStyleType = "none";
		this.element.style.paddingLeft = "5px";
		this.element.style.margin = "0";
		this.parentContainer.appendChild(this.element);

		this.nodes = new Map();

		let styleId = "vanilla-tree-styles";
		if (!document.getElementById(styleId)) {
			let style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				.vanilla-tree-root ul {
					list-style-type: none;
					padding-left: 18px;
					margin: 0;
				}
				.vanilla-tree-node {
					margin: 3px 0;
					user-select: none;
				}
				.vanilla-tree-content {
					display: flex;
					align-items: center;
					gap: 5px;
					padding: 2px 4px;
					border-radius: 3px;
					cursor: pointer;
				}
				.vanilla-tree-content:hover {
					background-color: rgba(255, 255, 255, 0.1);
				}
				.vanilla-tree-content.selected {
					background-color: rgba(93, 156, 236, 0.3);
				}
				.vanilla-tree-toggle {
					width: 12px;
					height: 12px;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					font-size: 10px;
					cursor: pointer;
				}
				.vanilla-tree-icon {
					width: 16px;
					height: 16px;
				}
				.vanilla-tree-checkbox {
					cursor: pointer;
					margin: 0;
					width: 14px;
					height: 14px;
				}
				.vanilla-tree-text {
					font-size: 13px;
				}
			`;
			document.head.appendChild(style);
		}

		this.selectedNode = null;
		this.listeners = {
			select_node: [],
			deselect_node: [],
			delete_node: [],
			check_node: [],
			uncheck_node: [],
			dblclick_node: []
		};
	}

	on(event, callback) {
		if (this.listeners[event]) {
			this.listeners[event].push(callback);
		}
	}

	trigger(event, data) {
		if (this.listeners[event]) {
			this.listeners[event].forEach(cb => cb(data));
		}
	}

	create_node(parentId, nodeData) {
		const id = nodeData.id || "node_" + Math.random().toString(36).substr(2, 9);
		const text = nodeData.text || "";
		const icon = nodeData.icon || null;
		const data = nodeData.data || nodeData.object || null;

		const li = document.createElement("li");
		li.className = "vanilla-tree-node";
		li.dataset.id = id;

		const contentDiv = document.createElement("div");
		contentDiv.className = "vanilla-tree-content";

		const toggleSpan = document.createElement("span");
		toggleSpan.className = "vanilla-tree-toggle";
		contentDiv.appendChild(toggleSpan);

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.className = "vanilla-tree-checkbox";
		checkbox.checked = true;
		contentDiv.appendChild(checkbox);

		if (icon) {
			const iconImg = document.createElement("img");
			iconImg.className = "vanilla-tree-icon";
			iconImg.src = icon;
			contentDiv.appendChild(iconImg);
		}

		const textSpan = document.createElement("span");
		textSpan.className = "vanilla-tree-text";
		textSpan.innerHTML = text;
		contentDiv.appendChild(textSpan);

		li.appendChild(contentDiv);

		const childrenUl = document.createElement("ul");
		childrenUl.style.display = "block";
		li.appendChild(childrenUl);

		let targetContainer = this.element;
		if (parentId && parentId !== "#") {
			const parentNode = this.nodes.get(parentId);
			if (parentNode) {
				targetContainer = parentNode.element.querySelector("ul");
				const pToggle = parentNode.element.querySelector(".vanilla-tree-toggle");
				if (pToggle && pToggle.innerHTML === "") {
					pToggle.innerHTML = "▼";
					pToggle.addEventListener("click", (evt) => {
						evt.stopPropagation();
						const childList = parentNode.element.querySelector("ul");
						if (childList.style.display === "none") {
							childList.style.display = "block";
							pToggle.innerHTML = "▼";
						} else {
							childList.style.display = "none";
							pToggle.innerHTML = "▶";
						}
					});
				}
			}
		}

		targetContainer.appendChild(li);

		const nodeObj = {
			id: id,
			text: text,
			icon: icon,
			data: data,
			element: li,
			parent: parentId,
			checkbox: checkbox,
			contentDiv: contentDiv,
			textSpan: textSpan
		};

		this.nodes.set(id, nodeObj);

		contentDiv.addEventListener("click", (evt) => {
			if (evt.target === checkbox) {
				if (checkbox.checked) {
					this.trigger("check_node", { node: nodeObj });
				} else {
					this.trigger("uncheck_node", { node: nodeObj });
				}
				return;
			}

			if (this.selectedNode === nodeObj) {
				contentDiv.classList.remove("selected");
				this.selectedNode = null;
				this.trigger("deselect_node", { node: nodeObj });
			} else {
				if (this.selectedNode) {
					this.selectedNode.contentDiv.classList.remove("selected");
				}
				this.selectedNode = nodeObj;
				contentDiv.classList.add("selected");
				this.trigger("select_node", { node: nodeObj });
			}
		});

		contentDiv.addEventListener("dblclick", (evt) => {
			if (evt.target === checkbox) return;
			this.trigger("dblclick_node", { node: nodeObj, originalEvent: evt });
		});

		return id;
	}

	check_node(id) {
		const node = this.nodes.get(id);
		if (node) {
			node.checkbox.checked = true;
			this.trigger("check_node", { node: node });
		}
	}

	uncheck_node(id) {
		const node = this.nodes.get(id);
		if (node) {
			node.checkbox.checked = false;
			this.trigger("uncheck_node", { node: node });
		}
	}

	rename_node(id, newTitle) {
		const node = this.nodes.get(id);
		if (node) {
			node.text = newTitle;
			node.textSpan.innerHTML = newTitle;
		}
	}

	delete_node(id) {
		const node = this.nodes.get(id);
		if (node) {
			if (this.selectedNode === node) {
				this.selectedNode = null;
				this.trigger("deselect_node", { node: node });
			}
			node.element.remove();
			this.nodes.delete(id);
			if (node.parent && node.parent !== "#") {
				const parentNode = this.nodes.get(node.parent);
				if (parentNode) {
					const childList = parentNode.element.querySelector("ul");
					if (childList && childList.children.length === 0) {
						const pToggle = parentNode.element.querySelector(".vanilla-tree-toggle");
						if (pToggle) pToggle.innerHTML = "";
					}
				}
			}
		}
	}

	get_json(id) {
		const node = this.nodes.get(id);
		if (!node) return { children: [] };
		const getChildrenData = (nodeId) => {
			const arr = [];
			this.nodes.forEach(n => {
				if (n.parent === nodeId) {
					arr.push({
						id: n.id,
						text: n.text,
						data: n.data,
						children: getChildrenData(n.id)
					});
				}
			});
			return arr;
		};
		return {
			id: node.id,
			text: node.text,
			data: node.data,
			children: getChildrenData(node.id)
		};
	}
}

export class Sidebar {

	constructor(viewer) {
		this.viewer = viewer;

		this.measuringTool = viewer.measuringTool;
		this.profileTool = viewer.profileTool;
		this.volumeTool = viewer.volumeTool;

		let sidebarRoot = document.querySelector('#sidebar_root');
		if (!sidebarRoot) {
			sidebarRoot = document.createElement('div');
			sidebarRoot.id = 'sidebar_root';
			const container = viewer.renderArea.querySelector('#potree_sidebar_container') || viewer.renderArea;
			container.appendChild(sidebarRoot);
		}

		// this.dom =	$(sidebarRoot);
		this.dom = sidebarRoot;
	}

	createToolIcon(icon, title, callback) {
		let element = document.createElement('img');
		element.src = icon;
		element.style.width = "32px";
		element.style.height = "32px";
		element.className = "button-icon";
		element.setAttribute("data-i18n", title);
		element.addEventListener("click", callback);

		return element;
	}

	init() {

		this.initAccordion();
		this.initAppearance();//appearance UI options

		this.initToolbar();//measurements

		this.initScene();

		this.initNavigation();//controls for nav

		this.initFilters(); //pointcloud filtering

		this.initClippingTool();//clip tools

		this.initSettings();//settings

		document.querySelector('#potree_version_number').innerHTML = Potree.version.major + "." + Potree.version.minor + Potree.version.suffix;
	}


	//starts all tools used for measurements
	initToolbar() {

		// ANGLE
		let elToolbar = document.querySelector('#tools');
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/angle.png',
			'[title]tt.angle_measurement',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showAngles: true,
					showArea: false,
					closed: true,
					maxMarkers: 3,
					name: 'Angle'
				});
			}
		));

		// POINT
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/point.svg',
			'[title]tt.point_measurement',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showAngles: false,
					showCoordinates: true,
					showArea: false,
					closed: true,
					maxMarkers: 1,
					name: 'Point'
				});
			}
		));

		// DISTANCE
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/distance.svg',
			'[title]tt.distance_measurement',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let measurement = this.measuringTool.startInsertion({
					showDistances: true,
					showArea: false,
					closed: false,
					name: 'Distance'
				});
			}
		));

		// HEIGHT
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/height.svg',
			'[title]tt.height_measurement',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: true,
					showArea: false,
					closed: false,
					maxMarkers: 2,
					name: 'Height'
				});
			}
		));

		// CIRCLE
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/circle.svg',
			'[title]tt.circle_measurement',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: false,
					showArea: false,
					showCircle: true,
					showEdges: false,
					closed: false,
					maxMarkers: 3,
					name: 'Circle'
				});
			}
		));

		// AZIMUTH
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/azimuth.svg',
			'Azimuth',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: false,
					showArea: false,
					showCircle: false,
					showEdges: false,
					showAzimuth: true,
					closed: false,
					maxMarkers: 2,
					name: 'Azimuth'
				});
			}
		));

		// AREA
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/area.svg',
			'[title]tt.area_measurement',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let measurement = this.measuringTool.startInsertion({
					showDistances: true,
					showArea: true,
					closed: true,
					name: 'Area'
				});
			}
		));

		// VOLUME
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/volume.svg',
			'[title]tt.volume_measurement',
			() => {
				let volume = this.volumeTool.startInsertion();
			}
		));

		// SPHERE VOLUME
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/sphere_distances.svg',
			'[title]tt.volume_measurement',
			() => {
				let volume = this.volumeTool.startInsertion({type: SphereVolume});
			}
		));

		// PROFILE
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/profile.svg',
			'[title]tt.height_profile',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let profile = this.profileTool.startInsertion();
			}
		));

		// ANNOTATION
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/annotation.svg',
			'[title]tt.annotation',
			() => {
				let elMenu = document.querySelector('#menu_measurements');
				if (elMenu && elMenu.nextElementSibling) {
					elMenu.nextElementSibling.style.display = 'block';
				}
				let annotation = this.viewer.annotationTool.startInsertion();
			}
		));

		// REMOVE ALL
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/reset_tools.svg',
			'[title]tt.remove_all_measurement',
			() => {
				this.viewer.scene.removeAllMeasurements();
			}
		));


		{ // SHOW / HIDE Measurements
			let elShow = document.querySelector("#measurement_options_show");
			if (elShow) {
				convertSelectgroup(elShow, "Show/Hide labels");

				elShow.querySelectorAll("input").forEach(input => {
					input.addEventListener("click", (e) => {
						const show = e.target.value === "SHOW";
						this.measuringTool.showLabels = show;
					});
				});

				let currentShow = this.measuringTool.showLabels ? "SHOW" : "HIDE";
				let targetInput = elShow.querySelector(`input[value=${currentShow}]`);
				if (targetInput) {
					targetInput.click();
				}
			}
		}
	}

	initScene() {

		let elScene = document.querySelector("#menu_scene");
		let elNext = elScene ? elScene.nextElementSibling : null;
		let elObjects = elNext ? elNext.querySelector("#scene_objects") : null;
		let elProperties = elNext ? elNext.querySelector("#scene_object_properties") : null;

		{
			let elExport = elNext ? elNext.querySelector("#scene_export") : null;

			let geoJSONIcon = `/icons/file_geojson.svg`;
			let dxfIcon = `/icons/file_dxf.svg`;
			let potreeIcon = `/icons/file_potree.svg`;

			if (elExport) {
				elExport.insertAdjacentHTML('beforeend', `
					Export: <br>
					<a href="#" download="measure.json"><img name="geojson_export_button" src="${geoJSONIcon}" class="button-icon" style="height: 24px" /></a>
					<a href="#" download="measure.dxf"><img name="dxf_export_button" src="${dxfIcon}" class="button-icon" style="height: 24px" /></a>
					<a href="#" download="potree.json5"><img name="potree_export_button" src="${potreeIcon}" class="button-icon" style="height: 24px" /></a>
				`);

				let imgGeoJSON = elExport.querySelector("img[name=geojson_export_button]");
				let elDownloadJSON = imgGeoJSON ? imgGeoJSON.parentElement : null;
				if (elDownloadJSON) {
					elDownloadJSON.addEventListener("click", (event) => {
						let scene = this.viewer.scene;
						let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

						if (measurements.length > 0) {
							let geoJson = GeoJSONExporter.toString(measurements);

							let url = window.URL.createObjectURL(new Blob([geoJson], {type: 'data:application/octet-stream'}));
							elDownloadJSON.setAttribute('href', url);
						} else {
							this.viewer.postError("no measurements to export");
							event.preventDefault();
						}
					});
				}

				let imgDXF = elExport.querySelector("img[name=dxf_export_button]");
				let elDownloadDXF = imgDXF ? imgDXF.parentElement : null;
				if (elDownloadDXF) {
					elDownloadDXF.addEventListener("click", (event) => {
						let scene = this.viewer.scene;
						let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

						if (measurements.length > 0) {
							let dxf = DXFExporter.toString(measurements);

							let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
							elDownloadDXF.setAttribute('href', url);
						} else {
							this.viewer.postError("no measurements to export");
							event.preventDefault();
						}
					});
				}

				let imgPotree = elExport.querySelector("img[name=potree_export_button]");
				let elDownloadPotree = imgPotree ? imgPotree.parentElement : null;
				if (elDownloadPotree) {
					elDownloadPotree.addEventListener("click", (event) => {
						let data = Potree.saveProject(this.viewer);
						let dataString = JSON5.stringify(data, null, "\t")

						let url = window.URL.createObjectURL(new Blob([dataString], {type: 'data:application/octet-stream'}));
						elDownloadPotree.setAttribute('href', url);
					});
				}
			}
		}

		let propertiesPanel = new PropertiesPanel(elProperties, this.viewer);
		propertiesPanel.setScene(this.viewer.scene);

		localStorage.removeItem('jstree');

		let treeContainer = document.createElement("div");
		treeContainer.id = "jstree_scene";

		if (elObjects) {
			elObjects.append(treeContainer);
		}

		let tree = new VanillaTree(treeContainer);

		let createNode = (parent, text, icon, object) => {
			let nodeID = tree.create_node(parent, {
				"text": text,
				"icon": icon,
				"data": object
			});

			if (object.visible) {
				tree.check_node(nodeID);
			} else {
				tree.uncheck_node(nodeID);
			}

			return nodeID;
		}

		let pcID = tree.create_node("#", {"text": "<b>Point Clouds</b>", "id": "pointclouds"});
		let measurementID = tree.create_node("#", {"text": "<b>Measurements</b>", "id": "measurements"});
		let annotationsID = tree.create_node("#", {"text": "<b>Annotations</b>", "id": "annotations"});
		let otherID = tree.create_node("#", {"text": "<b>Other</b>", "id": "other"});
		let vectorsID = tree.create_node("#", {"text": "<b>Vectors</b>", "id": "vectors"});
		let imagesID = tree.create_node("#", {"text": "<b> Images</b>", "id": "images"});

		tree.check_node(pcID);
		tree.check_node(measurementID);
		tree.check_node(annotationsID);
		tree.check_node(otherID);
		tree.check_node(vectorsID);
		tree.check_node(imagesID);

		tree.on("select_node", (e) => {
			let object = e.node.data;
			propertiesPanel.set(object);

			this.viewer.inputHandler.deselectAll();

			if (object instanceof Volume) {
				this.viewer.inputHandler.toggleSelection(object);
			}

			if (this.viewer.renderer.domElement) {
				this.viewer.renderer.domElement.focus();
			}
		});

		tree.on("deselect_node", (e) => {
			propertiesPanel.set(null);
		});

		tree.on("delete_node", (e) => {
			propertiesPanel.set(null);
		});

		tree.on("uncheck_node", (e) => {
			let object = e.node.data;

			if (object) {
				object.visible = false;
			}
		});

		tree.on("check_node", (e) => {
			let object = e.node.data;

			if (object) {
				object.visible = true;
			}
		});

		tree.on("dblclick_node", (e) => {
			let object = e.node.data;
			if (!object) return;

			if (object instanceof PointCloudTree) {
				let box = this.viewer.getBoundingBox([object]);
				let node3d = new Object3D();
				node3d.boundingBox = box;
				this.viewer.zoomTo(node3d, 1, 500);
			} else if (object instanceof Measure) {
				let points = object.points.map(p => p.position);
				let box = new Box3().setFromPoints(points);
				if (box.getSize(new Vector3()).length() > 0) {
					let node3d = new Object3D();
					node3d.boundingBox = box;
					this.viewer.zoomTo(node3d, 2, 500);
				}
			} else if (object instanceof Profile) {
				let points = object.points;
				let box = new Box3().setFromPoints(points);
				if (box.getSize(new Vector3()).length() > 0) {
					let node3d = new Object3D();
					node3d.boundingBox = box;
					this.viewer.zoomTo(node3d, 1, 500);
				}
			} else if (object instanceof Volume) {

				let box = object.boundingBox.clone().applyMatrix4(object.matrixWorld);

				if (box.getSize(new Vector3()).length() > 0) {
					let node3d = new Object3D();
					node3d.boundingBox = box;
					this.viewer.zoomTo(node3d, 1, 500);
				}
			} else if (object instanceof Annotation) {
				object.moveHere(this.viewer.scene.getActiveCamera());
			} else if (object instanceof PolygonClipVolume) {
				let dir = object.camera.getWorldDirection(new Vector3());
				let target;

				if (object.camera instanceof OrthographicCamera) {
					dir.multiplyScalar(object.camera.right)
					target = new Vector3().addVectors(object.camera.position, dir);
					this.viewer.setCameraMode(CameraMode.ORTHOGRAPHIC);
				} else if (object.camera instanceof PerspectiveCamera) {
					dir.multiplyScalar(this.viewer.scene.view.radius);
					target = new Vector3().addVectors(object.camera.position, dir);
					this.viewer.setCameraMode(CameraMode.PERSPECTIVE);
				}

				this.viewer.scene.view.position.copy(object.camera.position);
				this.viewer.scene.view.lookAt(target);
			} else if (object.type === "SpotLight") {
				let distance = (object.distance > 0) ? object.distance / 4 : 5 * 1000;
				let position = object.position;
				let target = new Vector3().addVectors(
					position,
					object.getWorldDirection(new Vector3()).multiplyScalar(distance));

				this.viewer.scene.view.position.copy(object.position);
				this.viewer.scene.view.lookAt(target);
			} else if (object instanceof Object3D) {
				let box = new Box3().setFromObject(object);

				if (box.getSize(new Vector3()).length() > 0) {
					let node3d = new Object3D();
					node3d.boundingBox = box;
					this.viewer.zoomTo(node3d, 1, 500);
				}
			} else if (object instanceof OrientedImage) {
				// TODO zoom to images
			} else if (object instanceof Images360) {
				// TODO
			} else if (object instanceof Geopackage) {
				// TODO
			}
		});


		let onPointCloudAdded = (e) => {
			let pointcloud = e.pointcloud;
			let cloudIcon = `${Potree.resourcePath}/icons/cloud.svg`;
			let node = createNode(pcID, pointcloud.name, cloudIcon, pointcloud);

			pointcloud.addEventListener("visibility_changed", () => {
				if (pointcloud.visible) {
					tree.check_node(node);
				} else {
					tree.uncheck_node(node);
				}
			});
		};

		let onMeasurementAdded = (e) => {
			let measurement = e.measurement;
			let icon = Utils.getMeasurementIcon(measurement);
			createNode(measurementID, measurement.name, icon, measurement);
		};

		let onVolumeAdded = (e) => {
			let volume = e.volume;
			let icon = Utils.getMeasurementIcon(volume);
			let node = createNode(measurementID, volume.name, icon, volume);

			volume.addEventListener("visibility_changed", () => {
				if (volume.visible) {
					tree.check_node(node);
				} else {
					tree.uncheck_node(node);
				}
			});
		};

		let onProfileAdded = (e) => {
			let profile = e.profile;
			let icon = Utils.getMeasurementIcon(profile);
			createNode(measurementID, profile.name, icon, profile);
		};

		let onAnnotationAdded = (e) => {
			let annotation = e.annotation;

			let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
			let parentID = this.annotationMapping.get(annotation.parent);
			let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
			this.annotationMapping.set(annotation, annotationID);

			annotation.addEventListener("annotation_changed", (e) => {
				let annotationsRoot = tree.get_json("annotations");
				let jsonNode = annotationsRoot.children.find(child => child.data.uuid === annotation.uuid);
				if (jsonNode) {
					tree.rename_node(jsonNode.id, annotation.title);
				}
			});
		};

		let onCameraAnimationAdded = (e) => {
			const animation = e.animation;

			const animationIcon = `${Potree.resourcePath}/icons/camera_animation.svg`;
			createNode(otherID, "animation", animationIcon, animation);
		};

		let onOrientedImagesAdded = (e) => {
			const images = e.images;

			const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
			const node = createNode(imagesID, "images", imagesIcon, images);

			images.addEventListener("visibility_changed", () => {
				if (images.visible) {
					tree.check_node(node);
				} else {
					tree.uncheck_node(node);
				}
			});
		};

		let onImages360Added = (e) => {
			const images = e.images;

			const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
			const node = createNode(imagesID, "360° images", imagesIcon, images);

			images.addEventListener("visibility_changed", () => {
				if (images.visible) {
					tree.check_node(node);
				} else {
					tree.uncheck_node(node);
				}
			});
		};

		const onGeopackageAdded = (e) => {
			const geopackage = e.geopackage;

			const geopackageIcon = `${Potree.resourcePath}/icons/triangle.svg`;
			const parentNode = "vectors";

			for (const layer of geopackage.node.children) {
				const name = layer.name;

				let shpPointsID = tree.create_node(parentNode, {
					"text": name,
					"icon": geopackageIcon,
					"data": layer,
				});
				if (layer.visible) {
					tree.check_node(shpPointsID);
				} else {
					tree.uncheck_node(shpPointsID);
				}
			}

		};

		this.viewer.scene.addEventListener("pointcloud_added", onPointCloudAdded);
		this.viewer.scene.addEventListener("measurement_added", onMeasurementAdded);
		this.viewer.scene.addEventListener("profile_added", onProfileAdded);
		this.viewer.scene.addEventListener("volume_added", onVolumeAdded);
		this.viewer.scene.addEventListener("camera_animation_added", onCameraAnimationAdded);
		this.viewer.scene.addEventListener("oriented_images_added", onOrientedImagesAdded);
		this.viewer.scene.addEventListener("360_images_added", onImages360Added);
		this.viewer.scene.addEventListener("geopackage_added", onGeopackageAdded);
		this.viewer.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
		this.viewer.scene.annotations.addEventListener("annotation_added", onAnnotationAdded);

		let onMeasurementRemoved = (e) => {
			try {//failproofing methods if jstree or jquery
				let measurementsRoot = tree.get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.measurement.uuid);
				if (jsonNode) {
					tree.delete_node(jsonNode.id);
				}
			}
			catch (error) {
				console.error(error);
			}
		};

		let onVolumeRemoved = (e) => {
			try {//failproofing methods if jstree or jquery
				let measurementsRoot = tree.get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);
				if (jsonNode) {
					tree.delete_node(jsonNode.id);
				}
			} catch (error) {
				console.error(error);
			}
		};

		let onPolygonClipVolumeRemoved = (e) => {
			try {
				let measurementsRoot = tree.get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);
				if (jsonNode) {
					tree.delete_node(jsonNode.id);
				}
			} catch (error) {
				console.error("error");
			}
		};

		let onProfileRemoved = (e) => {
			try {
				let measurementsRoot = tree.get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.profile.uuid);
				if (jsonNode) {
					tree.delete_node(jsonNode.id);
				}
			} catch (error) {
				console.error(error);
			}
		};

		this.viewer.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		this.viewer.scene.addEventListener("volume_removed", onVolumeRemoved);
		this.viewer.scene.addEventListener("polygon_clip_volume_removed", onPolygonClipVolumeRemoved);
		this.viewer.scene.addEventListener("profile_removed", onProfileRemoved);

		{
			let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
			this.annotationMapping = new Map();
			this.annotationMapping.set(this.viewer.scene.annotations, annotationsID);
			this.viewer.scene.annotations.traverseDescendants(annotation => {
				let parentID = this.annotationMapping.get(annotation.parent);
				let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
				this.annotationMapping.set(annotation, annotationID);
			});
		}

		const scene = this.viewer.scene;
		for (let pointcloud of scene.pointclouds) {
			onPointCloudAdded({pointcloud: pointcloud});
		}

		for (let measurement of scene.measurements) {
			onMeasurementAdded({measurement: measurement});
		}

		for (let volume of [...scene.volumes, ...scene.polygonClipVolumes]) {
			onVolumeAdded({volume: volume});
		}

		for (let animation of scene.cameraAnimations) {
			onCameraAnimationAdded({animation: animation});
		}

		for (let images of scene.orientedImages) {
			onOrientedImagesAdded({images: images});
		}

		for (let images of scene.images360) {
			onImages360Added({images: images});
		}

		for (const geopackage of scene.geopackages) {
			onGeopackageAdded({geopackage: geopackage});
		}

		for (let profile of scene.profiles) {
			onProfileAdded({profile: profile});
		}

		{
			createNode(otherID, "Camera", null, new Camera());
		}

		this.viewer.addEventListener("scene_changed", (e) => {
			propertiesPanel.setScene(e.scene);

			e.oldScene.removeEventListener("pointcloud_added", onPointCloudAdded);
			e.oldScene.removeEventListener("measurement_added", onMeasurementAdded);
			e.oldScene.removeEventListener("profile_added", onProfileAdded);
			e.oldScene.removeEventListener("volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("measurement_removed", onMeasurementRemoved);

			e.scene.addEventListener("pointcloud_added", onPointCloudAdded);
			e.scene.addEventListener("measurement_added", onMeasurementAdded);
			e.scene.addEventListener("profile_added", onProfileAdded);
			e.scene.addEventListener("volume_added", onVolumeAdded);
			e.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		});

	}

	initClippingTool() {


		this.viewer.addEventListener("cliptask_changed", (event) => {
			console.log("TODO");
		});

		this.viewer.addEventListener("clipmethod_changed", (event) => {
			console.log("TODO");
		});

		{
			let elClipTask = document.querySelector("#cliptask_options");
			if (elClipTask) {
				convertSelectgroup(elClipTask, "Clip Task");

				elClipTask.querySelectorAll("input").forEach(input => {
					input.addEventListener("click", (e) => {
						this.viewer.setClipTask(ClipTask[e.target.value]);
					});
				});

				let currentClipTask = Object.keys(ClipTask)
					.filter(key => ClipTask[key] === this.viewer.clipTask)[0];
				let targetInput = elClipTask.querySelector(`input[value=${currentClipTask}]`);
				if (targetInput) {
					targetInput.click();
				}
			}
		}

		{
			let elClipMethod = document.querySelector("#clipmethod_options");
			if (elClipMethod) {
				convertSelectgroup(elClipMethod, "Clip Method");

				elClipMethod.querySelectorAll("input").forEach(input => {
					input.addEventListener("click", (e) => {
						this.viewer.setClipMethod(ClipMethod[e.target.value]);
					});
				});

				let currentClipMethod = Object.keys(ClipMethod)
					.filter(key => ClipMethod[key] === this.viewer.clipMethod)[0];
				let targetInput = elClipMethod.querySelector(`input[value=${currentClipMethod}]`);
				if (targetInput) {
					targetInput.click();
				}
			}
		}

		let clippingToolBar = document.querySelector("#clipping_tools");

		if (clippingToolBar) {
			// CLIP VOLUME
			clippingToolBar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/clip_volume.svg',
				'[title]tt.clip_volume',
				() => {
					let item = this.volumeTool.startInsertion({clip: true});
				}
			));

			// CLIP POLYGON
			clippingToolBar.append(this.createToolIcon(
				Potree.resourcePath + "/icons/clip-polygon.svg",
				"[title]tt.clip_polygon",
				() => {
					let item = this.viewer.clippingTool.startInsertion({type: "polygon"});
				}
			));

			{// SCREEN BOX SELECT
				let boxSelectTool = new ScreenBoxSelectTool(this.viewer);

				clippingToolBar.append(this.createToolIcon(
					Potree.resourcePath + "/icons/clip-screen.svg",
					"[title]tt.screen_clip_box",
					() => {
						if (!(this.viewer.scene.getActiveCamera() instanceof OrthographicCamera)) {
							this.viewer.postMessage(`Switch to Orthographic Camera Mode before using the Screen-Box-Select tool.`,
								{duration: 2000});
							return;
						}

						let item = boxSelectTool.startInsertion();
					}
				));
			}

			{ // REMOVE CLIPPING TOOLS
				clippingToolBar.append(this.createToolIcon(
					Potree.resourcePath + "/icons/remove.svg",
					"[title]tt.remove_all_clipping_volumes",
					() => {

						this.viewer.scene.removeAllClipVolumes();
					}
				));
			}
		}

	}

	initFilters() {
		this.initClassificationList();
		this.initReturnFilters();
		//this.initGPSTimeFilters();
		this.initPointSourceIDFilters();

	}

	initReturnFilters() {
		let elReturnFilterPanel = document.querySelector('#return_filter_panel');
		if (!elReturnFilterPanel) return;

		{ // RETURN NUMBER
			let sldReturnNumber = elReturnFilterPanel.querySelector('#sldReturnNumber');
			let lblReturnNumber = elReturnFilterPanel.querySelector('#lblReturnNumber');

			let sliderCtrl = null;
			if (sldReturnNumber) {
				sliderCtrl = initVanillaSlider(sldReturnNumber, {
					range: true,
					min: 0, max: 7, step: 1,
					values: [0, 7],
					slide: (event, ui) => {
						this.viewer.setFilterReturnNumberRange(ui.values[0], ui.values[1])
					}
				});
			}

			let onReturnNumberChanged = (event) => {
				let [from, to] = this.viewer.filterReturnNumberRange;

				if (lblReturnNumber) {
					lblReturnNumber.innerHTML = `${from} to ${to}`;
				}
				if (sliderCtrl) {
					sliderCtrl.slider('values', [from, to]);
				}
			};

			this.viewer.addEventListener('filter_return_number_range_changed', onReturnNumberChanged);

			onReturnNumberChanged();
		}

		{ // NUMBER OF RETURNS
			let sldNumberOfReturns = elReturnFilterPanel.querySelector('#sldNumberOfReturns');
			let lblNumberOfReturns = elReturnFilterPanel.querySelector('#lblNumberOfReturns');

			let sliderCtrl = null;
			if (sldNumberOfReturns) {
				sliderCtrl = initVanillaSlider(sldNumberOfReturns, {
					range: true,
					min: 0, max: 7, step: 1,
					values: [0, 7],
					slide: (event, ui) => {
						this.viewer.setFilterNumberOfReturnsRange(ui.values[0], ui.values[1])
					}
				});
			}

			let onNumberOfReturnsChanged = (event) => {
				let [from, to] = this.viewer.filterNumberOfReturnsRange;

				if (lblNumberOfReturns) {
					lblNumberOfReturns.innerHTML = `${from} to ${to}`;
				}
				if (sliderCtrl) {
					sliderCtrl.slider('values', [from, to]);
				}
			};

			this.viewer.addEventListener('filter_number_of_returns_range_changed', onNumberOfReturnsChanged);

			onNumberOfReturnsChanged();
		}
	}

	initGPSTimeFilters() {

		let elGPSTimeFilterPanel = document.querySelector('#gpstime_filter_panel');
		if (!elGPSTimeFilterPanel) return;

		{
			let slider = new HierarchicalSlider({
				levels: 4,
				slide: (event) => {
					this.viewer.setFilterGPSTimeRange(...event.values);
				},
			});

			let initialized = false;

			let initialize = () => {

				let elRangeContainer = elGPSTimeFilterPanel.querySelector("#gpstime_multilevel_range_container");
				if (elRangeContainer) {
					elRangeContainer.prepend(slider.element);
				}

				let extent = this.viewer.getGpsTimeExtent();

				slider.setRange(extent);
				slider.setValues(extent);


				initialized = true;
			};

			this.viewer.addEventListener("update", (e) => {
				let extent = this.viewer.getGpsTimeExtent();
				let gpsTimeAvailable = extent[0] !== Infinity;

				if (!initialized && gpsTimeAvailable) {
					initialize();
				}

				slider.setRange(extent);
			});
		}


		{

			const txtGpsTime = elGPSTimeFilterPanel.querySelector("#txtGpsTime");
			const btnFindGpsTime = elGPSTimeFilterPanel.querySelector("#btnFindGpsTime");

			let targetTime = null;

			if (txtGpsTime) {
				txtGpsTime.addEventListener("input", (e) => {
					const str = txtGpsTime.value;

					if (!isNaN(str)) {
						const value = parseFloat(str);
						targetTime = value;

						txtGpsTime.style.backgroundColor = "";
					} else {
						targetTime = null;

						txtGpsTime.style.backgroundColor = "#ff9999";
					}

				});
			}

			if (btnFindGpsTime) {
				btnFindGpsTime.addEventListener("click", () => {
					if (targetTime !== null) {
						viewer.moveToGpsTimeVicinity(targetTime);
					}
				});
			}
		}

	}

	initPointSourceIDFilters() {
		let elPointSourceIDFilterPanel = document.querySelector('#pointsourceid_filter_panel');
		if (!elPointSourceIDFilterPanel) return;

		{
			let slider = new HierarchicalSlider({
				levels: 4,
				range: [0, 65535],
				precision: 1,
				slide: (event) => {
					let values = event.values;
					this.viewer.setFilterPointSourceIDRange(values[0], values[1]);
				}
			});

			let initialized = false;

			let initialize = () => {
				elPointSourceIDFilterPanel.prepend(slider.element);

				initialized = true;
			};

			this.viewer.addEventListener("update", (e) => {
				let extent = this.viewer.filterPointSourceIDRange;

				if (!initialized) {
					initialize();

					slider.setValues(extent);
				}

			});
		}

	}

	initClassificationList() {
		let elClassificationList = document.querySelector('#classificationList');
		if (!elClassificationList) return;

		let addClassificationItem = (code, name) => {
			const classification = this.viewer.classifications[code];
			const inputID = 'chkClassification_' + code;
			const colorPickerID = 'colorPickerClassification_' + code;

			const checked = classification.visible ? "checked" : "";

			let li = document.createElement('li');
			li.innerHTML = `
				<label style="whitespace: nowrap; display: flex; align-items: center; gap: 8px">
					<input id="${inputID}" type="checkbox" ${checked}/>
					<span style="flex-grow: 1">${name}</span>
					<input id="${colorPickerID}" type="color" style="width: 24px; height: 24px; padding: 0; border: none; cursor: pointer; background: none" />
				</label>
			`;

			const elInput = li.querySelector('input');
			const elColorPicker = li.querySelector(`#${colorPickerID}`);

			if (elInput) {
				elInput.addEventListener('click', event => {
					this.viewer.setClassificationVisibility(code, event.target.checked);
				});
			}

			let hexColor = "#" + classification.color.slice(0, 3).map(c => {
				let byte = Math.round(c * 255).toString(16);
				return byte.length === 1 ? "0" + byte : byte;
			}).join("");

			if (elColorPicker) {
				elColorPicker.value = hexColor;

				elColorPicker.addEventListener("input", event => {
					let hex = event.target.value;
					let r = parseInt(hex.substr(1, 2), 16) / 255;
					let g = parseInt(hex.substr(3, 2), 16) / 255;
					let b = parseInt(hex.substr(5, 2), 16) / 255;
					classification.color = [r, g, b, 1];
				});
			}

			elClassificationList.append(li);
		};

		const addToggleAllButton = () => { // toggle all button
			let li = document.createElement('li');
			li.innerHTML = `
				<label style="whitespace: nowrap">
					<input id="toggleClassificationFilters" type="checkbox" checked/>
					<span>show/hide all</span>
				</label>
			`;

			let elInput = li.querySelector('input');
			if (elInput) {
				elInput.addEventListener('click', event => {
					this.viewer.toggleAllClassificationsVisibility();
				});
			}

			elClassificationList.append(li);
		}

		const addInvertButton = () => {
			let li = document.createElement('li');
			li.innerHTML = `
				<input type="button" value="invert" />
			`;

			let elInput = li.querySelector('input');
			if (elInput) {
				elInput.addEventListener('click', () => {
					const classifications = this.viewer.classifications;

					for (let key of Object.keys(classifications)) {
						let value = classifications[key];
						this.viewer.setClassificationVisibility(key, !value.visible);
					}
				});
			}

			elClassificationList.append(li);
		};

		const populate = () => {
			addToggleAllButton();
			for (let classID in this.viewer.classifications) {
				addClassificationItem(classID, this.viewer.classifications[classID].name);
			}
			addInvertButton();
		};

		populate();

		this.viewer.addEventListener("classifications_changed", () => {
			elClassificationList.innerHTML = '';
			populate();
		});

		this.viewer.addEventListener("classification_visibility_changed", () => {

			{ // set checked state of classification buttons
				for (const classID of Object.keys(this.viewer.classifications)) {
					const classValue = this.viewer.classifications[classID];

					let elItem = elClassificationList.querySelector(`#chkClassification_${classID}`);
					if (elItem) {
						elItem.checked = classValue.visible;
					}
				}
			}

			{ // set checked state of toggle button based on state of all other buttons
				let numVisible = 0;
				let numItems = 0;
				for (const key of Object.keys(this.viewer.classifications)) {
					if (this.viewer.classifications[key].visible) {
						numVisible++;
					}
					numItems++;
				}
				const allVisible = numVisible === numItems;

				let elToggle = elClassificationList.querySelector("#toggleClassificationFilters");
				if (elToggle) {
					elToggle.checked = allVisible;
				}
			}
		});
	}

	initAccordion() {
		document.querySelectorAll('.accordion > h3').forEach(function(header) {
			let content = header.nextElementSibling;

			//header.classList.add('accordion-header', 'ui-widget');
			//content.classList.add('accordion-content', 'ui-widget');
			content.style.display = 'none';
			header.addEventListener('click', () => {
				if (content.style.display === 'none') {
					content.style.display = '';
				} else {
					content.style.display = 'none';
				}
			});
		});

		let languages = [
			["EN", "en"],
			["FR", "fr"],
			["DE", "de"],
			["JP", "jp"],
			["ES", "es"],
			["SE", "se"],
			["ZH", "zh"],
			["IT", "it"]
		];

		let elLanguages =  document.querySelector('#potree_languages');

		for (let i = 0;i < languages.length;i++) {
			let [key, value] = languages[i];
			let element = document.createElement('a');
			element.textContent = key;
			element.addEventListener('click', () => this.viewer.setLanguage(value));

			if (i === 0) {
				element.style.marginLeft = "30px";
			}

			elLanguages.append(element);

			if (i < languages.length - 1) {
				elLanguages.append(document.createTextNode(' - '));
			}
		}


		// to close all, call
		// $(".accordion > div").hide()

		// to open the, for example, tool menu, call:
		// $("#menu_tools").next().show()
	}

	initAppearance() {

		const sldPointBudget = this.dom.querySelector('#sldPointBudget');

		let sldPointBudgetCntrl = null;
		if (sldPointBudget) {
			sldPointBudgetCntrl = initVanillaSlider(sldPointBudget, {
				value: this.viewer.getPointBudget(),
				min: 100 * 1000,
				max: 10 * 1000 * 1000,
				step: 1000,
				slide: (event, ui) => {this.viewer.setPointBudget(ui.value);}
			});
		}

		const sldFOV = this.dom.querySelector('#sldFOV');
		let sldFOVCntrl = null;
		if (sldFOV) {
			sldFOVCntrl = initVanillaSlider(sldFOV, {
				value: this.viewer.getFOV(),
				min: 20,
				max: 100,
				step: 1,
				slide: (event, ui) => {this.viewer.setFOV(ui.value);}
			});
		}

		const sldEDLRadius = document.getElementById('sldEDLRadius');
		let sldEDLRadiusCntrl = null;
		if (sldEDLRadius) {
			sldEDLRadiusCntrl = initVanillaSlider(sldEDLRadius, {
				value: this.viewer.getEDLRadius(),
				min: 1,
				max: 4,
				step: 0.01,
				slide: (event, ui) => {this.viewer.setEDLRadius(ui.value);}
			});
		}

		const sldEDLStrength = document.getElementById('sldEDLStrength');
		let sldEDLStrengthCntrl = null;
		if (sldEDLStrength) {
			sldEDLStrengthCntrl = initVanillaSlider(sldEDLStrength, {
				value: this.viewer.getEDLStrength(),
				min: 0,
				max: 5,
				step: 0.01,
				slide: (event, ui) => {this.viewer.setEDLStrength(ui.value);}
			});
		}

		const sldEDLOpacity = document.getElementById('sldEDLOpacity');
		let sldEDLOpacityCntrl = null;
		if (sldEDLOpacity) {
			sldEDLOpacityCntrl = initVanillaSlider(sldEDLOpacity, {
				value: this.viewer.getEDLOpacity(),
				min: 0,
				max: 1,
				step: 0.01,
				slide: (event, ui) => {this.viewer.setEDLOpacity(ui.value);}
			});
		}

		this.viewer.addEventListener('point_budget_changed', (event) => {
			let lbl = document.getElementById('lblPointBudget');
			if (lbl) lbl.innerHTML = Utils.addCommas(this.viewer.getPointBudget());
			if (sldPointBudgetCntrl) {
				sldPointBudgetCntrl.slider("value", this.viewer.getPointBudget());
			}
		});

		this.viewer.addEventListener('fov_changed', (event) => {
			let lbl = document.getElementById('lblFOV');
			if (lbl) lbl.innerHTML = parseInt(this.viewer.getFOV());
			if (sldFOVCntrl) {
				sldFOVCntrl.slider("value", this.viewer.getFOV());
			}
		});

		this.viewer.addEventListener('use_edl_changed', (event) => {
			let chk = document.getElementById('chkEDLEnabled');
			if (chk) chk.checked = this.viewer.getEDLEnabled();
		});

		this.viewer.addEventListener('edl_radius_changed', (event) => {
			let lbl = document.getElementById('lblEDLRadius');
			if (lbl) lbl.innerHTML = this.viewer.getEDLRadius().toFixed(1);
			if (sldEDLRadiusCntrl) {
				sldEDLRadiusCntrl.slider("value", this.viewer.getEDLRadius());
			}
		});

		this.viewer.addEventListener('edl_strength_changed', (event) => {
			let lbl = document.getElementById('lblEDLStrength');
			if (lbl) lbl.innerHTML = this.viewer.getEDLStrength().toFixed(1);
			if (sldEDLStrengthCntrl) {
				sldEDLStrengthCntrl.slider("value", this.viewer.getEDLStrength());
			}
		});

		this.viewer.addEventListener('background_changed', (event) => {
			let input = this.dom.querySelector("input[name=background][value='" + this.viewer.getBackground() + "']");
			if (input) input.checked = true;
		});

		let lblPointBudget = document.getElementById('lblPointBudget');
		if (lblPointBudget) lblPointBudget.innerHTML = Utils.addCommas(this.viewer.getPointBudget());
		let lblFOV = document.getElementById('lblFOV');
		if (lblFOV) lblFOV.innerHTML = parseInt(this.viewer.getFOV());
		let lblEDLRadius = document.getElementById('lblEDLRadius');
		if (lblEDLRadius) lblEDLRadius.innerHTML = this.viewer.getEDLRadius().toFixed(1);
		let lblEDLStrength = document.getElementById('lblEDLStrength');
		if (lblEDLStrength) lblEDLStrength.innerHTML = this.viewer.getEDLStrength().toFixed(1);
		let chkEDLEnabled = document.getElementById('chkEDLEnabled');
		if (chkEDLEnabled) chkEDLEnabled.checked = this.viewer.getEDLEnabled();

		{
			let elBackground = document.getElementById('background_options');
			if (elBackground) {
				convertSelectgroup(elBackground);

				elBackground.querySelectorAll("input").forEach(input => {
					input.addEventListener("click", (e) => {
						this.viewer.setBackground(e.target.value);
					});
				});

				let currentBackground = this.viewer.getBackground();
				let targetInput = elBackground.querySelector(`input[name=background_options][value=${currentBackground}]`);
				if (targetInput) {
					targetInput.click();
				}
			}
		}

		if (chkEDLEnabled) {
			chkEDLEnabled.addEventListener('click', () => {
				this.viewer.setEDLEnabled(chkEDLEnabled.checked);
			});
		}
	}

	initNavigation() {
		let elNavigation = document.getElementById('navigation');
		let sldMoveSpeed = document.getElementById('sldMoveSpeed');
		let lblMoveSpeed = document.getElementById('lblMoveSpeed');

		if (elNavigation) {
			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/earth_controls_1.png',
				'[title]tt.earth_control',
				() => {this.viewer.setControls(this.viewer.earthControls);}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/fps_controls.svg',
				'[title]tt.flight_control',
				() => {
					this.viewer.setControls(this.viewer.fpControls);
					this.viewer.fpControls.lockElevation = false;
				}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/helicopter_controls.svg',
				'[title]tt.heli_control',
				() => {
					this.viewer.setControls(this.viewer.fpControls);
					this.viewer.fpControls.lockElevation = true;
				}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/orbit_controls.svg',
				'[title]tt.orbit_control',
				() => {this.viewer.setControls(this.viewer.orbitControls);}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/focus.svg',
				'[title]tt.focus_control',
				() => {this.viewer.fitToScreen();}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/navigation_cube.svg",
				"[title]tt.navigation_cube_control",
				() => {this.viewer.toggleNavigationCube()}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/images/compas.svg",
				"[title]tt.compass",
				() => {
					const visible = !this.viewer.compass.isVisible();
					this.viewer.compass.setVisible(visible);
				}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/camera_animation.svg",
				"[title]tt.camera_animation",
				() => {
					const animation = CameraAnimation.defaultFromView(this.viewer);

					viewer.scene.addCameraAnimation(animation);
				}
			));


			elNavigation.insertAdjacentHTML('beforeend', "<br>");


			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/left.svg",
				"[title]tt.left_view_control",
				() => {this.viewer.setLeftView()}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/right.svg",
				"[title]tt.right_view_control",
				() => {this.viewer.setRightView()}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/front.svg",
				"[title]tt.front_view_control",
				() => {this.viewer.setFrontView()}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/back.svg",
				"[title]tt.back_view_control",
				() => {this.viewer.setBackView()}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/top.svg",
				"[title]tt.top_view_control",
				() => {this.viewer.setTopView()}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/bottom.svg",
				"[title]tt.bottom_view_control",
				() => {this.viewer.setBottomView()}
			));

			let divProjection = document.createElement('div');
			divProjection.innerHTML = `
				<selectgroup id="camera_projection_options">
					<option id="camera_projection_options_perspective" value="PERSPECTIVE">Perspective</option>
					<option id="camera_projection_options_orthigraphic" value="ORTHOGRAPHIC">Orthographic</option>
				</selectgroup>
			`;
			let elCameraProjection = divProjection.firstElementChild;
			elNavigation.append(elCameraProjection);

			convertSelectgroup(elCameraProjection, "Camera Projection");

			elCameraProjection.querySelectorAll("input").forEach(input => {
				input.addEventListener("click", (e) => {
					this.viewer.setCameraMode(CameraMode[e.target.value]);
				});
			});

			let cameraMode = Object.keys(CameraMode)
				.filter(key => CameraMode[key] === this.viewer.scene.cameraMode)[0];
			let targetInput = elCameraProjection.querySelector(`input[value=${cameraMode}]`);
			if (targetInput) {
				targetInput.click();
			}
		}

		let speedRange = new Vector2(1, 10 * 1000);

		let toLinearSpeed = (value) => {
			return Math.pow(value, 4) * speedRange.y + speedRange.x;
		};

		let toExpSpeed = (value) => {
			return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
		};

		let sldMoveSpeedCtrl = null;
		if (sldMoveSpeed) {
			sldMoveSpeedCtrl = initVanillaSlider(sldMoveSpeed, {
				value: toExpSpeed(this.viewer.getMoveSpeed()),
				min: 0,
				max: 1,
				step: 0.01,
				slide: (event, ui) => {this.viewer.setMoveSpeed(toLinearSpeed(ui.value));}
			});
		}

		this.viewer.addEventListener('move_speed_changed', (event) => {
			if (lblMoveSpeed) {
				lblMoveSpeed.innerHTML = this.viewer.getMoveSpeed().toFixed(1);
			}
			if (sldMoveSpeedCtrl) {
				sldMoveSpeedCtrl.slider("value", toExpSpeed(this.viewer.getMoveSpeed()));
			}
		});

		if (lblMoveSpeed) {
			lblMoveSpeed.innerHTML = this.viewer.getMoveSpeed().toFixed(1);
		}
	}


	initSettings() {

		{
			let sldMinNodeSize = document.getElementById('sldMinNodeSize');
			let sldMinNodeSizeCtrl = null;
			if (sldMinNodeSize) {
				sldMinNodeSizeCtrl = initVanillaSlider(sldMinNodeSize, {
					value: this.viewer.getMinNodeSize(),
					min: 0,
					max: 1000,
					step: 0.01,
					slide: (event, ui) => {this.viewer.setMinNodeSize(ui.value);}
				});
			}

			this.viewer.addEventListener('minnodesize_changed', (event) => {
				let lbl = document.getElementById('lblMinNodeSize');
				if (lbl) {
					lbl.innerHTML = parseInt(this.viewer.getMinNodeSize());
				}
				if (sldMinNodeSizeCtrl) {
					sldMinNodeSizeCtrl.slider("value", this.viewer.getMinNodeSize());
				}
			});
			let lbl = document.getElementById('lblMinNodeSize');
			if (lbl) {
				lbl.innerHTML = parseInt(this.viewer.getMinNodeSize());
			}
		}

		{
			let elSplatQuality = document.getElementById("splat_quality_options");
			if (elSplatQuality) {
				convertSelectgroup(elSplatQuality, "Splat Quality");

				elSplatQuality.querySelectorAll("input").forEach(input => {
					input.addEventListener("click", (e) => {
						if (e.target.value === "standard") {
							this.viewer.useHQ = false;
						} else if (e.target.value === "hq") {
							this.viewer.useHQ = true;
						}
					});
				});

				let currentQuality = this.viewer.useHQ ? "hq" : "standard";
				let targetInput = elSplatQuality.querySelector(`input[value=${currentQuality}]`);
				if (targetInput) {
					targetInput.click();
				}
			}
		}

		let chkShowBoundingBox = document.getElementById('show_bounding_box');
		if (chkShowBoundingBox) {
			chkShowBoundingBox.addEventListener('click', () => {
				this.viewer.setShowBoundingBox(chkShowBoundingBox.checked);
			});
		}

		let chkSetFreeze = document.getElementById('set_freeze');
		if (chkSetFreeze) {
			chkSetFreeze.addEventListener('click', () => {
				this.viewer.setFreeze(chkSetFreeze.checked);
			});
		}
	}

}
