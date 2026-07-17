
import {Utils} from "../../utils.js";
import {createSlider} from "../../utils/VanillaSlider.js";

export class CameraAnimationPanel{
	constructor(viewer, propertiesPanel, animation){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;
		this.animation = animation;

		const template = document.createElement("template");
		template.innerHTML = `
			<div class="propertypanel_content">
				<span id="animation_keyframes"></span>

				<span>

					<span style="display:flex">
						<span style="display:flex; align-items: center; padding-right: 10px">Duration: </span>
						<input name="spnDuration" type="number" min="0" step="0.01" value="5.0" style="flex-grow: 1; width:100%">
					</span>

					<span>Time: </span><span id="lblTime"></span> <div id="sldTime"></div>

					<input name="play" type="button" value="play"/>
				</span>
			</div>
		`;
		this.elContent = template.content.firstElementChild;

		const elPlay = this.elContent.querySelector("input[name=play]");
		elPlay.addEventListener("click", () => {
			animation.play();
		});

		const elSlider = this.elContent.querySelector('#sldTime');
		createSlider(elSlider, {
			value: 0,
			min: 0,
			max: 1,
			step: 0.001,
			slide: (event, ui) => {
				animation.set(ui.value);
			}
		});

		let elDuration = this.elContent.querySelector(`input[name=spnDuration]`);
		elDuration.value = animation.getDuration();
		elDuration.addEventListener("input", () => {
			let value = parseFloat(elDuration.value);
			if(!isNaN(value)){
				animation.setDuration(value);
			}
		});

		const elKeyframes = this.elContent.querySelector("#animation_keyframes");

		const updateKeyframes = () => {
			elKeyframes.innerHTML = "";

			//let index = 0;

			// <span style="flex-grow: 0;">
			// 				<img name="add" src="${Potree.resourcePath}/icons/add.svg" style="width: 1.5em; height: 1.5em"/>
			// 			</span>

			const addNewKeyframeItem = (index) => {
				const template = document.createElement("template");
				template.innerHTML = `
					<div style="display: flex; margin: 0.2em 0em">
						<span style="flex-grow: 1"></span>
						<input type="button" name="add" value="insert control point" />
						<span style="flex-grow: 1"></span>
					</div>
				`;
				const elNewKeyframe = template.content.firstElementChild;

				const elAdd = elNewKeyframe.querySelector("input[name=add]");
				elAdd.addEventListener("click", () => {
					animation.createControlPoint(index);
				});

				elKeyframes.appendChild(elNewKeyframe);
			};

			const addKeyframeItem = (index) => {
				const template = document.createElement("template");
				template.innerHTML = `
					<div style="display: flex; margin: 0.2em 0em">
						<span style="flex-grow: 0;">
							<img name="assign" src="${Potree.resourcePath}/icons/assign.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
						<span style="flex-grow: 0;">
							<img name="move" src="${Potree.resourcePath}/icons/circled_dot.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
						<span style="flex-grow: 0; width: 1.5em; height: 1.5em"></span>
						<span style="flex-grow: 0; font-size: 1.5em">keyframe</span>
						<span style="flex-grow: 1"></span>
						<span style="flex-grow: 0;">
							<img name="delete" src="${Potree.resourcePath}/icons/remove.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
					</div>
				`;
				const elKeyframe = template.content.firstElementChild;

				const elAssign = elKeyframe.querySelector("img[name=assign]");
				const elMove = elKeyframe.querySelector("img[name=move]");
				const elDelete = elKeyframe.querySelector("img[name=delete]");

				elAssign.addEventListener("click", () => {
					const cp = animation.controlPoints[index];

					cp.position.copy(viewer.scene.view.position);
					cp.target.copy(viewer.scene.view.getPivot());
				});

				elMove.addEventListener("click", () => {
					const cp = animation.controlPoints[index];

					viewer.scene.view.position.copy(cp.position);
					viewer.scene.view.lookAt(cp.target);
				});

				elDelete.addEventListener("click", () => {
					const cp = animation.controlPoints[index];
					animation.removeControlPoint(cp);
				});

				elKeyframes.appendChild(elKeyframe);
			};

			let index = 0;

			addNewKeyframeItem(index);

			for(const cp of animation.controlPoints){

				addKeyframeItem(index);
				index++;
				addNewKeyframeItem(index);

			}
		};

		updateKeyframes();

		animation.addEventListener("controlpoint_added", updateKeyframes);
		animation.addEventListener("controlpoint_removed", updateKeyframes);




		// this._update = () => { this.update(); };

		// this.update();
	}

	update(){

	}
};