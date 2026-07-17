
// import * as THREE from "../../../libs/js/build/module.js";
import {Camera, Color} from 'three';
import GUI from 'lil-gui';
import {Annotation} from "../../Annotation.js";
import {ElevationGradientRepeat, PointShape, PointSizeType} from "../../defines.js";
import {Gradients} from "../../materials/Gradients.js";
import {CameraAnimation} from "../../modules/CameraAnimation/CameraAnimation.js";
import {PointCloudTree} from "../../PointCloudTree.js";
import {Utils} from "../../utils.js";
import {Measure} from "../../utils/Measure.js";
import {Profile} from "../../utils/Profile.js";
import {Volume} from "../../utils/Volume.js";

import {AnglePanel} from "./AnglePanel.js";
import {AnnotationPanel} from "./AnnotationPanel.js";
import {AreaPanel} from "./AreaPanel.js";
import {CameraAnimationPanel} from "./CameraAnimationPanel.js";
import {CameraPanel} from "./CameraPanel.js";
import {CirclePanel} from "./CirclePanel.js";
import {DistancePanel} from "./DistancePanel.js";
import {HeightPanel} from "./HeightPanel.js";
import {PointPanel} from "./PointPanel.js";
import {ProfilePanel} from "./ProfilePanel.js";
import {VolumePanel} from "./VolumePanel.js";

export class PropertiesPanel{

	constructor(container, viewer){
		this.container = container;
		this.viewer = viewer;
		this.object = null;
		this.cleanupTasks = [];
		this.scene = null;
	}

	setScene(scene){
		this.scene = scene;
	}

	set(object){
		if(this.object === object){
			return;
		}

		this.object = object;

		for(let task of this.cleanupTasks){
			task();
		}
		this.cleanupTasks = [];
		this.container.innerHTML = "";

		if(object instanceof PointCloudTree){
			this.setPointCloud(object);
		}else if(object instanceof Measure || object instanceof Profile || object instanceof Volume){
			this.setMeasurement(object);
		}else if(object instanceof Camera){
			this.setCamera(object);
		}else if(object instanceof Annotation){
			this.setAnnotation(object);
		}else if(object instanceof CameraAnimation){
			this.setCameraAnimation(object);
		}

	}

	//
	// Used for events that should be removed when the property object changes.
	// This is for listening to materials, scene, point clouds, etc.
	// not required for DOM listeners, since they are automatically cleared by removing the DOM subtree.
	//
	addVolatileListener(target, type, callback){
		target.addEventListener(type, callback);
		this.cleanupTasks.push(() => {
			target.removeEventListener(type, callback);
		});
	}

	setPointCloud(pointcloud){

		let material = pointcloud.material;
		let viewer = this.viewer;

		this.container.innerHTML = "";

		const gui = new GUI({container: this.container, title: "Point Cloud"});
		gui.domElement.style.width = "100%";

		// POINT SIZE
		gui.add(material, "size", 0, 3, 0.01).name("Point Size").listen();
		gui.add(material, "minSize", 0, 3, 0.01).name("Min Point Size").listen();

		// POINT SIZING / SHAPE
		gui.add(material, "pointSizeType", PointSizeType).name("Point Sizing").listen();
		gui.add(material, "shape", PointShape).name("Point Shape").listen();

		// BACKFACE CULLING (only relevant if the point cloud has normals)
		const pointAttributes = pointcloud.pcoGeometry.pointAttributes;
		const hasNormals = pointAttributes.hasNormals ? pointAttributes.hasNormals() : false;
		if(hasNormals){
			gui.add(material, "backfaceCulling").name("Backface Culling").listen();
		}

		// OPACITY
		gui.add(material, "opacity", 0, 1, 0.001).name("Opacity").listen();

		// ATTRIBUTE SELECTION
		const attributes = pointcloud.pcoGeometry.pointAttributes.attributes;
		let options = attributes.map(a => a.name);

		const intensityIndex = options.indexOf("intensity");
		if(intensityIndex >= 0){
			options.splice(intensityIndex + 1, 0, "intensity gradient");
		}

		options.push("elevation", "color", "matcap", "indices", "level of detail", "composite");

		const blacklist = ["POSITION_CARTESIAN", "position"];
		options = options.filter(o => !blacklist.includes(o));

		// FOLDERS FOR EACH ATTRIBUTE MODE
		const folderWeights = gui.addFolder("Attribute Weights");
		folderWeights.add(material, "weightRGB", 0, 1, 0.01).name("RGB").listen();
		folderWeights.add(material, "weightIntensity", 0, 1, 0.01).name("Intensity").listen();
		folderWeights.add(material, "weightElevation", 0, 1, 0.01).name("Elevation").listen();
		folderWeights.add(material, "weightClassification", 0, 1, 0.01).name("Classification").listen();
		folderWeights.add(material, "weightReturnNumber", 0, 1, 0.01).name("Return Number").listen();
		folderWeights.add(material, "weightSourceID", 0, 1, 0.01).name("Source ID").listen();

		const folderRGB = gui.addFolder("RGB");
		folderRGB.add(material, "rgbGamma", 0, 4, 0.01).name("Gamma").listen();
		folderRGB.add(material, "rgbBrightness", -1, 1, 0.01).name("Brightness").listen();
		folderRGB.add(material, "rgbContrast", -1, 1, 0.01).name("Contrast").listen();

		const folderExtra = gui.addFolder("Extra Attribute");
		const extraRangeProxy = {
			get min(){
				let name = material.activeAttributeName;
				let r = material.getRange(name);
				return r ? r[0] : 0;
			},
			set min(v){
				let name = material.activeAttributeName;
				let attribute = pointcloud.getAttribute(name);
				let r = material.getRange(name) || (attribute ? [...attribute.range] : [0, 1]);
				material.setRange(name, [v, r[1]]);
			},
			get max(){
				let name = material.activeAttributeName;
				let r = material.getRange(name);
				return r ? r[1] : 1;
			},
			set max(v){
				let name = material.activeAttributeName;
				let attribute = pointcloud.getAttribute(name);
				let r = material.getRange(name) || (attribute ? [...attribute.range] : [0, 1]);
				material.setRange(name, [r[0], v]);
			},
		};
		const ctrlExtraMin = folderExtra.add(extraRangeProxy, "min").name("Range Min").listen();
		const ctrlExtraMax = folderExtra.add(extraRangeProxy, "max").name("Range Max").listen();
		folderExtra.add(material, "extraGamma", 0, 4, 0.01).name("Gamma").listen();
		folderExtra.add(material, "extraBrightness", -1, 1, 0.01).name("Brightness").listen();
		folderExtra.add(material, "extraContrast", -1, 1, 0.01).name("Contrast").listen();

		const folderMatcap = gui.addFolder("MatCap");
		{
			let matcaps = [
				{name: "Normals", icon: `${Potree.resourcePath}/icons/matcap/check_normal+y.jpg`},
				{name: "Basic 1", icon: `${Potree.resourcePath}/icons/matcap/basic_1.jpg`},
				{name: "Basic 2", icon: `${Potree.resourcePath}/icons/matcap/basic_2.jpg`},
				{name: "Basic Dark", icon: `${Potree.resourcePath}/icons/matcap/basic_dark.jpg`},
				{name: "Basic Side", icon: `${Potree.resourcePath}/icons/matcap/basic_side.jpg`},
				{name: "Ceramic Dark", icon: `${Potree.resourcePath}/icons/matcap/ceramic_dark.jpg`},
				{name: "Ceramic Lightbulb", icon: `${Potree.resourcePath}/icons/matcap/ceramic_lightbulb.jpg`},
				{name: "Clay Brown", icon: `${Potree.resourcePath}/icons/matcap/clay_brown.jpg`},
				{name: "Clay Muddy", icon: `${Potree.resourcePath}/icons/matcap/clay_muddy.jpg`},
				{name: "Clay Studio", icon: `${Potree.resourcePath}/icons/matcap/clay_studio.jpg`},
				{name: "Resin", icon: `${Potree.resourcePath}/icons/matcap/resin.jpg`},
				{name: "Skin", icon: `${Potree.resourcePath}/icons/matcap/skin.jpg`},
				{name: "Jade", icon: `${Potree.resourcePath}/icons/matcap/jade.jpg`},
				{name: "Metal_ Anisotropic", icon: `${Potree.resourcePath}/icons/matcap/metal_anisotropic.jpg`},
				{name: "Metal Carpaint", icon: `${Potree.resourcePath}/icons/matcap/metal_carpaint.jpg`},
				{name: "Metal Lead", icon: `${Potree.resourcePath}/icons/matcap/metal_lead.jpg`},
				{name: "Metal Shiny", icon: `${Potree.resourcePath}/icons/matcap/metal_shiny.jpg`},
				{name: "Pearl", icon: `${Potree.resourcePath}/icons/matcap/pearl.jpg`},
				{name: "Toon", icon: `${Potree.resourcePath}/icons/matcap/toon.jpg`},
				{name: "Check Rim Light", icon: `${Potree.resourcePath}/icons/matcap/check_rim_light.jpg`},
				{name: "Check Rim Dark", icon: `${Potree.resourcePath}/icons/matcap/check_rim_dark.jpg`},
				{name: "Contours 1", icon: `${Potree.resourcePath}/icons/matcap/contours_1.jpg`},
				{name: "Contours 2", icon: `${Potree.resourcePath}/icons/matcap/contours_2.jpg`},
				{name: "Contours 3", icon: `${Potree.resourcePath}/icons/matcap/contours_3.jpg`},
				{name: "Reflection Check Horizontal", icon: `${Potree.resourcePath}/icons/matcap/reflection_check_horizontal.jpg`},
				{name: "Reflection Check Vertical", icon: `${Potree.resourcePath}/icons/matcap/reflection_check_vertical.jpg`},
			];

			let elMatcapContainer = document.createElement("div");
			elMatcapContainer.style.display = "flex";
			elMatcapContainer.style.flexWrap = "wrap";
			elMatcapContainer.style.padding = "4px 8px";

			for(let matcap of matcaps){
				let elMatcap = document.createElement("img");
				elMatcap.src = matcap.icon;
				elMatcap.title = matcap.name;
				elMatcap.className = "button-icon";
				elMatcap.style.width = "25%";
				elMatcap.style.cursor = "pointer";

				elMatcap.addEventListener("click", () => {
					material.matcap = matcap.icon.substring(matcap.icon.lastIndexOf('/'));
				});

				elMatcapContainer.appendChild(elMatcap);
			}

			folderMatcap.domElement.appendChild(elMatcapContainer);
		}

		const folderColor = gui.addFolder("Color");
		const colorProxy = {
			get color(){ return `#${material.color.getHexString()}`; },
			set color(hex){ material.color = new Color(hex); },
		};
		folderColor.addColor(colorProxy, "color").name("Color").listen();

		const folderElevation = gui.addFolder("Elevation");
		const ctrlHeightMin = folderElevation.add(material, "heightMin").name("Height Min").listen();
		const ctrlHeightMax = folderElevation.add(material, "heightMax").name("Height Max").listen();
		folderElevation.add(viewer, "elevationGradientRepeat", ElevationGradientRepeat).name("Gradient Repeat").listen();
		{
			const schemes = Object.keys(Potree.Gradients).map(name => ({name: name, values: Gradients[name]}));

			let elSchemeContainer = document.createElement("div");
			elSchemeContainer.style.display = "flex";
			elSchemeContainer.style.flexWrap = "wrap";
			elSchemeContainer.style.padding = "4px 8px";

			for(let scheme of schemes){
				let elScheme = document.createElement("span");
				elScheme.style.flexGrow = "1";

				const svg = Potree.Utils.createSvgGradient(scheme.values);
				svg.setAttributeNS(null, "class", `button-icon`);

				elScheme.appendChild(svg);

				elScheme.addEventListener("click", () => {
					material.gradient = Gradients[scheme.name];
				});

				elSchemeContainer.appendChild(elScheme);
			}

			folderElevation.domElement.appendChild(elSchemeContainer);
		}

		const folderIntensity = gui.addFolder("Intensity");
		const intensityRangeProxy = {
			get min(){ return material.intensityRange[0]; },
			set min(v){ material.intensityRange = [v, material.intensityRange[1]]; },
			get max(){ return material.intensityRange[1]; },
			set max(v){ material.intensityRange = [material.intensityRange[0], v]; },
		};
		const ctrlIntensityMin = folderIntensity.add(intensityRangeProxy, "min").name("Range Min").listen();
		const ctrlIntensityMax = folderIntensity.add(intensityRangeProxy, "max").name("Range Max").listen();
		folderIntensity.add(material, "intensityGamma", 0, 4, 0.01).name("Gamma").listen();
		folderIntensity.add(material, "intensityBrightness", -1, 1, 0.01).name("Brightness").listen();
		folderIntensity.add(material, "intensityContrast", -1, 1, 0.01).name("Contrast").listen();

		const updateHeightRangeBounds = () => {
			let aPosition = pointcloud.getAttribute("position");

			let bMin, bMax;

			if(aPosition){
				// for new format 2.0 and loader that contain precomputed min/max of attributes
				let min = aPosition.range[0][2];
				let max = aPosition.range[1][2];
				let width = max - min;

				bMin = min - 0.2 * width;
				bMax = max + 0.2 * width;
			}else{
				// for format up until exlusive 2.0
				let box = [pointcloud.pcoGeometry.tightBoundingBox, pointcloud.getBoundingBoxWorld()]
					.find(v => v !== undefined);

				pointcloud.updateMatrixWorld(true);
				box = Utils.computeTransformedBoundingBox(box, pointcloud.matrixWorld);

				let bWidth = box.max.z - box.min.z;
				bMin = box.min.z - 0.2 * bWidth;
				bMax = box.max.z + 0.2 * bWidth;
			}

			ctrlHeightMin.min(bMin).max(bMax);
			ctrlHeightMax.min(bMin).max(bMax);
		};

		const updateExtraRangeBounds = () => {
			let attributeName = material.activeAttributeName;
			let attribute = pointcloud.getAttribute(attributeName);

			if(attribute == null){
				return;
			}

			// currently only supporting scalar ranges.
			// rgba, normals, positions, etc have vector ranges, however
			let [amin, amax] = attribute.range;
			let isValidRange = (typeof amin === "number") && (typeof amax === "number");
			if(!isValidRange){
				return;
			}

			ctrlExtraMin.min(amin).max(amax);
			ctrlExtraMax.min(amin).max(amax);
		};

		const updateIntensityRangeBounds = () => {
			let attribute = pointcloud.getAttribute("intensity");
			if(attribute == null){
				return;
			}

			if(pointcloud.material.intensityRange[0] === Infinity){
				pointcloud.material.intensityRange = attribute.range;
			}

			let [amin, amax] = attribute.range;
			ctrlIntensityMin.min(amin).max(amax);
			ctrlIntensityMax.min(amin).max(amax);
		};

		const updateMaterialPanel = () => {
			let selectedValue = material.activeAttributeName;

			let attribute = pointcloud.getAttribute(selectedValue);
			if(selectedValue === "intensity gradient"){
				attribute = pointcloud.getAttribute("intensity");
			}

			const isIntensity = attribute ? ["intensity", "intensity gradient"].includes(attribute.name) : false;

			if(isIntensity){
				updateIntensityRangeBounds();
			} else if(attribute){
				updateExtraRangeBounds();
			}

			folderWeights.hide();
			folderElevation.hide();
			folderRGB.hide();
			folderExtra.hide();
			folderColor.hide();
			folderIntensity.hide();
			folderMatcap.hide();

			if (selectedValue === 'composite') {
				folderWeights.show();
				folderElevation.show();
				folderRGB.show();
				folderIntensity.show();
			} else if (selectedValue === 'elevation') {
				folderElevation.show();
			} else if (selectedValue === 'RGB and Elevation') {
				folderRGB.show();
				folderElevation.show();
			} else if (selectedValue === 'rgba') {
				folderRGB.show();
			} else if (selectedValue === 'color') {
				folderColor.show();
			} else if (selectedValue === 'intensity' || selectedValue === 'intensity gradient') {
				folderIntensity.show();
			} else if (selectedValue === "matcap") {
				folderMatcap.show();
			} else if (selectedValue === "classification") {
				// add classification color selector?
			} else if (selectedValue === "gps-time") {
				// no dedicated controls currently
			} else if (selectedValue === "indices" || selectedValue === "number of returns" || selectedValue === "return number"
				|| ["source id", "point source id"].includes(selectedValue)) {
				// no dedicated controls currently
			} else {
				folderExtra.show();
			}
		};

		let attributeSelection = {activeAttributeName: material.activeAttributeName};
		gui.add(material, "activeAttributeName", options).name("Attribute").listen().onChange(updateMaterialPanel);

		this.addVolatileListener(material, "point_color_type_changed", updateMaterialPanel);
		this.addVolatileListener(material, "active_attribute_changed", updateMaterialPanel);
		this.addVolatileListener(material, "material_property_changed", () => {
			updateExtraRangeBounds();
			updateHeightRangeBounds();
		});

		updateHeightRangeBounds();
		updateMaterialPanel();

	}




	setMeasurement(object){

		let TYPE = {
			DISTANCE: {panel: DistancePanel},
			AREA: {panel: AreaPanel},
			POINT: {panel: PointPanel},
			ANGLE: {panel: AnglePanel},
			HEIGHT: {panel: HeightPanel},
			PROFILE: {panel: ProfilePanel},
			VOLUME: {panel: VolumePanel},
			CIRCLE: {panel: CirclePanel},
			OTHER: {panel: PointPanel},
		};

		let getType = (measurement) => {
			if (measurement instanceof Measure) {
				if (measurement.showDistances && !measurement.showArea && !measurement.showAngles) {
					return TYPE.DISTANCE;
				} else if (measurement.showDistances && measurement.showArea && !measurement.showAngles) {
					return TYPE.AREA;
				} else if (measurement.maxMarkers === 1) {
					return TYPE.POINT;
				} else if (!measurement.showDistances && !measurement.showArea && measurement.showAngles) {
					return TYPE.ANGLE;
				} else if (measurement.showHeight) {
					return TYPE.HEIGHT;
				} else if (measurement.showCircle) {
					return TYPE.CIRCLE;
				} else {
					return TYPE.OTHER;
				}
			} else if (measurement instanceof Profile) {
				return TYPE.PROFILE;
			} else if (measurement instanceof Volume) {
				return TYPE.VOLUME;
			}
		};

		//this.container.html("measurement");

		let type = getType(object);
		let Panel = type.panel;

		let panel = new Panel(this.viewer, object, this);
		this.container.appendChild(panel.elContent);
	}

	setCamera(camera){
		let panel = new CameraPanel(this.viewer, this);
		this.container.appendChild(panel.elContent);
	}

	setAnnotation(annotation){
		let panel = new AnnotationPanel(this.viewer, this, annotation);
		this.container.appendChild(panel.elContent);
	}

	setCameraAnimation(animation){
		let panel = new CameraAnimationPanel(this.viewer, this, animation)
		this.container.appendChild(panel.elContent);
	}

}
