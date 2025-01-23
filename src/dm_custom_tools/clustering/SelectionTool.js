import {EventDispatcher} from "../../EventDispatcher";

export class SelectionTool extends EventDispatcher {
	constructor(viewer) {
		super();
		this.active = true;
		this.viewer = viewer;
	}
	activate() {
		this.active = true;
		this.viewer.setControls(this.viewer.orbitControls);
	}
	deactivate() {
		this.active = false;
	}
	deselectAll() {
		if (!this.active) return;
		this.viewer.scene.dispatchEvent({
			type: 'measurement_select',
			value: {measure: undefined, isCtrl: false},
		});
	}
}