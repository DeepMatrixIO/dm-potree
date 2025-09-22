
// import * as THREE from "../../libs/js/build/module.js";

import {Vector3} from "three";
import {Utils} from "../utils.js";

export class Compass{

	constructor(viewer){
		this.viewer = viewer;

		this.visible = false;
		this.dom = this.createElement();

        viewer.addEventListener("update", () => {
            const direction = viewer.scene.view.direction.clone();
            direction.z = 0;
            direction.normalize();

            const camera = viewer.scene.getActiveCamera();

            const p1 = camera.getWorldPosition(new Vector3());
            const p2 = p1.clone().add(direction);

            const projection = viewer.getProjection();
            const azimuth = Utils.computeAzimuth(p1, p2, projection);

            this.dom.style.transform = `rotateZ(${-azimuth}rad)`;
        });

		this.dom.click( () => {
			viewer.setTopView();
		});

		// const renderArea = $(viewer.renderArea);
		const renderArea = viewer.renderArea
		renderArea.append(this.dom);

		this.setVisible(this.visible);
	}

    setVisible(visible){
        this.visible = visible;

        const value = visible ? "" : "none";
        this.dom.style.display = value;
    }

	isVisible(){
		return this.visible;
	}
    createElement(){
        const img = document.createElement('img');
        // img.src = `${Potree.resourcePath}/images/compas.svg`;
		img.src = `/images/compas.svg`;
        img.style.position = 'absolute';
        img.style.top = '10px';
        img.style.right = '10px';
        img.style.zIndex = '10000';
        img.style.width = '64px';

        return img;
    }

};