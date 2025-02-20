/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 */

import * as THREE from "../../libs/three.js/build/three.module.js";
import {EventDispatcher} from "../EventDispatcher.js";
import {KeyCodes} from "../KeyCodes.js";
import {Utils} from "../utils.js";
import {BoxVolume} from "../utils/Volume.js";

export class InputHandler extends EventDispatcher {
	constructor(viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;
		this.domElement = this.renderer.domElement;
		this.enabled = true;

		this.scene = null;
		this.interactiveScenes = [];
		this.interactiveObjects = new Set();
		this.inputListeners = [];//added by me, check if it works
		this.blacklist = new Set();

		this.drag = null;
		this.mouse = new THREE.Vector2(0, 0);

		this.selection = [];

		this.hoveredElements = [];
		this.pressedKeys = {};

		this.wheelDelta = 0;

		this.speed = 1;

		this.logMessages = false;

		this.extraTools = [];//to register additional tools and events

		if (this.domElement.tabIndex === -1) {
			this.domElement.tabIndex = 2222;
		}

		this.domElement.addEventListener('contextmenu', (event) => {event.preventDefault();}, false);
		this.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
		this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
		this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
		this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
		this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
		this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel.bind(this), false); // Firefox
		this.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
		this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
		this.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
		this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
		this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
		this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
	}

	registerExtraTool(tool) {
		this.extraTools.push(tool);
	}

	enableExtraTool(name) {
		this.extraTools.find(e => e.name === name).enabled = true;
	}

	disaableExtraTool(tool) {
		this.extraTools.find(e => e.name === name).enabled = false;
	}




	addInputListener(listener) {
		this.inputListeners.push(listener);
	}

	removeInputListener(listener) {
		this.inputListeners = this.inputListeners.filter(e => e !== listener);
	}

	getSortedListeners() {
		return this.inputListeners.sort((a, b) => {
			let ia = (a.importance !== undefined) ? a.importance : 0;
			let ib = (b.importance !== undefined) ? b.importance : 0;

			return ib - ia;
		});
	}

	onTouchStart(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchStart');

		e.preventDefault();

		if (e.touches.length === 1) {
			let rect = this.domElement.getBoundingClientRect();
			let x = e.touches[0].pageX - rect.left;
			let y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);

			this.startDragging(null);
		}


		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}
	}

	onTouchEndOld(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchEnd');
		this.lastTouchEnd = new Date().getTime();//added cluster tool

		e.preventDefault();

		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: 'drop',
				drag: this.drag,
				viewer: this.viewer
			});
		}

		this.drag = null;
		this.touchMoved = false;//added cluster tool

		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}
	}
	onTouchEnd(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchEnd');
		this.lastTouchEnd = new Date().getTime();

		const handleRegularTouchEnd = () => {
			e.preventDefault();

			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'drop',
					drag: this.drag,
					viewer: this.viewer,
				});
			}

			this.drag = null;
			this.touchMoved = false;

			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: e.type,
					touches: e.touches,
					changedTouches: e.changedTouches,
				});
			}
		};

		const rect = this.domElement.getBoundingClientRect();
		const x = e.changedTouches[0].pageX - rect.left;
		const y = e.changedTouches[0].pageY - rect.top;
		this.mouse.set(x, y);
		const hoveredElements = this.getHoveredElements();

		// Multiple fingers, touchEnd already triggered
		if (this.ignoreNextTouchEnd) {
			if (this.logMessages) console.log('Touchend multiple fingers');
			if (e.touches.length === 0) {
				this.ignoreNextTouchEnd = false;
			}
			return;
		}
		// Multiple fingers, first touchEnd
		if (e.touches.length > 0) {
			if (this.logMessages) console.log('Touchend first of multiple fingers');
			this.ignoreNextTouchEnd = true;
			// Pan or Zoom
			if (this.touchMoved) {
				if (this.logMessages) console.log('Pan or zoom');
				handleRegularTouchEnd();
				return;
			}
			// Two finger tap
			if (e.touches.length === 1) {
				if (this.logMessages) console.log('Two finger tap');
				if (document.fullscreenElement) {
					document.exitFullscreen();
				}
				if (this.viewer.clusterTool.active)
					this.viewer.clusterTool.onClick(this.mouse, MOUSE$1.RIGHT);
				return;
			}
			// More than two finger tap
			if (e.touches.length > 1) {
				if (this.logMessages) console.log('More than two finger tap');
				return;
			}
		}
		// Single finger drag
		if (
			this.drag &&
			(this.drag.lastDrag.x !== 0 || this.drag.lastDrag.y !== 0)
		) {
			if (this.drag.object) {
				if (this.logMessages)
					console.log('Touchend single finger drag object');
				this.drag.object.dispatchEvent({
					type: 'touchEnd',
					drag: this.drag,
					button: MOUSE$1.LEFT,
					viewer: this.viewer,
				});
				this.viewer.measuringTool.lastMovedMeasure = this.drag.object.parent;
				this.drag = null;
			} else {
				if (this.logMessages) console.log('Touchend single finger drag');
				handleRegularTouchEnd();
			}
			return;
		}

		// Single finger tap
		if (this.viewer.volumeTool.active) {
			const tappedBoxes = this.getHoveredElements()
				.map((element) => element.object)
				.filter((object) => object instanceof BoxVolume && object.visible);
			this.viewer.volumeTool.dispatchEvent({
				type: 'tap',
				location: this.mouse,
				tappedBox: tappedBoxes[0] || null,
				viewer: this.viewer,
			});
		} else if (this.viewer.clusterTool.active) {
			this.viewer.clusterTool.onClick(this.mouse, MOUSE$1.LEFT);
		}
		if (this.draw?.object) {
			if (this.logMessages) console.log('Touchend single finger tap draw');
			this.draw.object.dispatchEvent({
				type: 'draw',
				mouse: this.mouse,
				viewer: this.viewer,
				drawingTarget: hoveredElements[0]?.object.parent.editable
					? hoveredElements[0]
					: undefined,
			});
		} else {
			if (this.logMessages) console.log('Touchend single finger tap');
			if (hoveredElements[0]?.object) {
				hoveredElements[0].object.dispatchEvent({
					type: 'click',
					viewer: this.viewer,
					isCtrl: false,
					button: MOUSE$1.LEFT,
				});
			}
		}
	}

	onTouchMove(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchMove');

		e.preventDefault();

		if (e.touches.length === 1) {
			let rect = this.domElement.getBoundingClientRect();
			let x = e.touches[0].pageX - rect.left;
			let y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);

			if (this.drag) {
				this.drag.mouse = 1;

				this.drag.lastDrag.x = x - this.drag.end.x;
				this.drag.lastDrag.y = y - this.drag.end.y;

				this.drag.end.set(x, y);

				if (this.logMessages) console.log(this.constructor.name + ': drag: ');
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}
		}

		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}

		// DEBUG CODE
		// let debugTouches = [...e.touches, {
		//	pageX: this.domElement.clientWidth / 2,
		//	pageY: this.domElement.clientHeight / 2}];
		// for(let inputListener of this.getSortedListeners()){
		//	inputListener.dispatchEvent({
		//		type: e.type,
		//		touches: debugTouches,
		//		changedTouches: e.changedTouches
		//	});
		// }
	}

	onKeyDown(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyDown');

		// DELETE
		if (e.keyCode === KeyCodes.DELETE && this.selection.length > 0) {
			this.dispatchEvent({
				type: 'delete',
				selection: this.selection
			});

			this.deselectAll();
		}

		this.dispatchEvent({
			type: 'keydown',
			keyCode: e.keyCode,
			event: e
		});

		// for(let l of this.getSortedListeners()){
		//	l.dispatchEvent({
		//		type: "keydown",
		//		keyCode: e.keyCode,
		//		event: e
		//	});
		// }

		this.pressedKeys[e.keyCode] = true;

		// e.preventDefault();
	}

	onKeyUp(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyUp');

		delete this.pressedKeys[e.keyCode];

		e.preventDefault();
	}

	onDoubleClickOld(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onDoubleClick');

		if (this.viewer.measuringTool.currentTool) {
			this.viewer.measuringTool.onDoubleClick();
			return;
		} else {
			this.extraTools.forEach(tool => {tool.active && tool.onDoubleClick();});
		}
		/**
		 * if (this.viewer.clusterTool.active) {
			this.viewer.clusterTool.onDoubleClick();
			return;
		}
		**/


		let consumed = false;
		for (let hovered of this.hoveredElements) {
			//if (hovered._listeners && hovered._listeners['dblclick']) {//getHoveredElements does not return the object but the event
			if (hovered.object._listeners && hovered.object._listeners['dblclick']) {//fixed to listen to the object
				hovered.object.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: hovered.object
				});
				consumed = true;
				break;
			}
		}

		if (!consumed) {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: null
				});
			}
		}

		e.preventDefault();//removed from clustertool
	}
	onDoubleClick(e) {
		//clustertool pointorama tool

		if (this.logMessages)
			console.log(this.constructor.name + ': onDoubleClick');

		//added
		if (this.viewer.measuringTool.currentTool) {
			this.viewer.measuringTool.onDoubleClick();
			return;
		} else {
			let toolStatus = false
			this.extraTools.forEach(tool => {
				if (tool.active) {
					toolStatus = true
					tool.onDoubleClick();
				}
			});//to avoid other actions if a tool is active
			if (toolStatus) return;
		}
		//added end

		//std
		let consumed = false;
		for (let hovered of this.hoveredElements) {
			//			if (hovered._listeners && hovered._listeners['dblclick']) {
			if (hovered.object._listeners && hovered.object._listeners['dblclick']) {//fixed to listen to the object

				hovered.object.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: hovered.object,
				});
				consumed = true;
				break;
			}

			//all other objects that are not directly attached to the object but to the rootScene
			{//2d tiles renderer case, where the root scene is linked to the object

				if (hovered.rootScene !== undefined) {//must have rootScene

					if (hovered.rootScene._listeners['dblclick']) {
						hovered.rootScene.dispatchEvent({type: 'dblclick', source: hovered});
					}
				}
			}//adding additional cases where the event is not directly attached to the object bot to root as rootScene



		}

		if (!consumed) {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: null,
				});
			}
		}
		e.preventDefault();//not present in clusterTool

	}
	onMouseClick(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseClick');

		e.preventDefault();
	}

	onMouseDown(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseDown');

		e.preventDefault();

		this.mouseHasMovedSinceMouseDown = false;//pointorama

		let consumed = false;
		let consume = () => {return consumed = true;};
		if (this.hoveredElements.length === 0) {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mousedown',
					viewer: this.viewer,
					mouse: this.mouse
				});
			}
		} else {
			for (let hovered of this.hoveredElements) {
				let object = hovered.object;
				object.dispatchEvent({
					type: 'mousedown',
					viewer: this.viewer,
					consume: consume
				});

				if (consumed) {
					break;
				}
			}
		}

		if (!this.drag) {
			let target = this.hoveredElements
				.find(el => (
					el.object._listeners &&
					el.object._listeners['drag'] &&
					el.object._listeners['drag'].length > 0));

			if (target) {
				this.startDragging(target.object, {location: target.point});
			} else {
				this.startDragging(null);
			}
		}

		if (this.scene) {
			this.viewStart = this.scene.view.clone();
		}
	}

	onMouseUpOld(e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseUp');

		e.preventDefault();

		let noMovement = this.getNormalizedDrag().length() === 0;


		let consumed = false;
		let consume = () => {return consumed = true;};
		if (this.hoveredElements.length === 0) {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					mouse: this.mouse,
					consume: consume
				});

				if (consumed) {
					break;
				}
			}
		} else {
			let hovered = this.hoveredElements
				.map(e => e.object)
				.find(e => (e._listeners && e._listeners['mouseup']));
			if (hovered) {
				hovered.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					consume: consume
				});
			}
		}

		if (this.drag) {
			if (this.drag.object) {
				if (this.logMessages) console.log(`${this.constructor.name}: drop ${this.drag.object.name}`);
				this.drag.object.dispatchEvent({
					type: 'drop',
					drag: this.drag,
					viewer: this.viewer

				});
			} else {
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drop',
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}

			// check for a click
			let clicked = this.hoveredElements.map(h => h.object).find(v => v === this.drag.object) !== undefined;
			if (clicked) {
				if (this.logMessages) console.log(`${this.constructor.name}: click ${this.drag.object.name}`);
				this.drag.object.dispatchEvent({
					type: 'click',
					viewer: this.viewer,
					consume: consume,
				});
			}

			this.drag = null;
		}

		if (!consumed) {
			if (e.button === THREE.MOUSE.LEFT) {
				if (noMovement) {
					let selectable = this.hoveredElements
						.find(el => el.object._listeners && el.object._listeners['select']);

					if (selectable) {
						selectable = selectable.object;

						if (this.isSelected(selectable)) {
							this.selection
								.filter(e => e !== selectable)
								.forEach(e => this.toggleSelection(e));
						} else {
							this.deselectAll();
							this.toggleSelection(selectable);
						}
					} else {
						this.deselectAll();
					}
				}
			} else if ((e.button === THREE.MOUSE.RIGHT) && noMovement) {
				this.deselectAll();
			}
		}
	}
	onMouseUp(e) {
		//taken from pointorama clusterTool

		if (this.logMessages) console.log(this.constructor.name + ': onMouseUp');

		e.preventDefault();

		//// code added from ClusterTool
		if (this.mouseHasMovedSinceMouseDown) {
			this.mouseHasMovedSinceMouseDown = false;//reset the flag
			// Drag end functions should go here
		} else {//in less than 300ms means performs doubleclick but breaks previous behaviour
			const interval = new Date().getTime() - this.lastClick;
			if (interval < 300 && !this.mouseHasMovedSinceLastClick) {
				// Double click
				// TODO: Differentiate between double click with left and right mouse button
				//console.log('detected double click');
				this.onDoubleClick(e);// simulated double click
			} else {
				//console.log('detected single click');
				// Click
				this.lastClick = new Date().getTime();
				this.mouseHasMovedSinceLastClick = false;

				if (this.viewer.measuringTool.currentTool) {
					this.viewer.measuringTool.onClick(e.button);
				}
				//not workling yet
				else {
					this.extraTools.forEach(tool => {tool.active && tool.onClick(this.mouse, e.button);});
				}
				// (this.viewer.clusterTool.active) {
				//his.viewer.clusterTool.onClick(this.mouse, e.button);
				//

				const hoveredObject = this.hoveredElements
					.map((e) => e.object)
					.find((e) => e._listeners && e._listeners['click']);
				if (this.viewer.selectionTool.active && !hoveredObject) {
					console.log('SelectionTool:deselect all');
					this.viewer.selectionTool.deselectAll();
				} else

					if (hoveredObject) {
						hoveredObject.dispatchEvent({
							type: 'click',
							viewer: this.viewer,
							consume: () => {},
							isCtrl: this.pressedKeys[KeyCodes.CONTROL],
							button: e.button,
						});
					} else {
						//added for listening to items where events are not directly attached, but in the rootScene or group
						if (this.hoveredElements.length) {

							{//2d tiles renderer case, where the root scene is linked to the object
								const hoveredObject = this.hoveredElements
									.find((obj) => obj.rootScene && obj.rootScene._listeners['click']);//this works for 3dTilesRenderer, where the intersect
								if (hoveredObject !== undefined) {//must have rootScene
									hoveredObject.rootScene.dispatchEvent({type: 'mouseup', source: hoveredObject});//force it on the source
								}
							}

							////other cases where a group contains multiple meshes and events are declared and listened at the root
							//the raycasted object must have alink to that group   as rootScene
							// {//2d tiles renderer case, where the root scene is linked to the object
							// 	const hoveredObject = this.hoveredElements
							// 		.find((intersected) => intersected.object.rootScene && intersected.object.rootScene._listeners['click']);//this works for 3dTilesRenderer, where the intersect
							// 	if (hoveredObject !== undefined) {//must have rootScene
							// 		hoveredObject.object.rootScene.dispatchEvent({type: 'mouseup', source: hoveredObject});//force it on the source
							// 	}
							// }


						}
					}
			}
		}

		//old code is missing related to propagatting code


		let consumed = false;
		let consume = () => {return consumed = true;};
		if (this.hoveredElements.length === 0) {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					mouse: this.mouse,
					consume: consume
				});

				if (consumed) {
					break;
				}
			}
		} else {
			let hovered = this.hoveredElements
				.map(e => e.object)
				.find(e => (e._listeners && e._listeners['mouseup']));
			if (hovered) {
				hovered.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					consume: consume
				});
			}
		}

		//// end code added from ClusterTool

		if (this.drag) {
			if (this.drag.object) {
				if (this.logMessages)
					console.log(
						`${this.constructor.name}: drop ${this.drag.object.name}`
					);
				this.drag.object.dispatchEvent({
					type: 'drop',
					drag: this.drag,
					button: e.button,
					viewer: this.viewer,
				});
			} else {
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drop',
						drag: this.drag,
						viewer: this.viewer,
					});
				}
			}
			if (!['DRAG', 'PAN'].includes(this.viewer.orbitControls.mode))
				this.drag = null;
		}
	}


	onMouseMove(e) {
		//pointorama version
		e.preventDefault();
		this.mouseHasMovedSinceMouseDown = true;
		this.mouseHasMovedSinceLastClick = true;
		const rect = this.domElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		this.mouse.set(x, y);

		let hoveredElements = this.getHoveredElements();
		if (hoveredElements.length > 0) {
			let names = hoveredElements.map((h) => h.object.name).join(', ');
			if (this.logMessages)
				console.log(
					`${this.constructor.name}: onMouseMove; hovered: '${names}'`
				);
		}

		if (this.viewer.clusterTool.active) {
			this.viewer.clusterTool.onMouseMove(this.mouse);
		}

		if (this.draw?.object) {
			this.draw.object.dispatchEvent({
				type: 'draw',
				mouse: this.mouse,
				viewer: this.viewer,
				drawingTarget: hoveredElements[0]?.object.parent.editable
					? hoveredElements[0]
					: undefined,
			});
		}

		if (this.drag) {
			this.drag.mouse = e.buttons;

			this.drag.lastDrag.x = x - this.drag.end.x;
			this.drag.lastDrag.y = y - this.drag.end.y;

			this.drag.end.set(x, y);

			if (this.drag.object) {
				if (this.logMessages)
					console.log(
						this.constructor.name + ': drag: ' + this.drag.object.name
					);
				this.drag.object.dispatchEvent({
					type: 'drag',
					drag: this.drag,
					viewer: this.viewer,
				});
			} else {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ');

				let dragConsumed = false;
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer,
						consume: () => {
							dragConsumed = true;
						},
					});

					if (dragConsumed) {
						break;
					}
				}
			}
			return;
		}//drag end, no else

		const currentlyHoveredObjects
			= hoveredElements.map(
				(element) => element.object
			);
		const previouslyHoveredObjects = this.hoveredElements.map(
			(element) => element.object
		);

		const abandonedHovers = previouslyHoveredObjects.filter(
			(object) => !currentlyHoveredObjects.includes(object)
		);
		const newHovers = currentlyHoveredObjects.filter(
			(object) => !previouslyHoveredObjects.includes(object)
		);

		const currentFrontObject = currentlyHoveredObjects.find((a) => true);
		const previousFrontObject = previouslyHoveredObjects.find((a) => true);

		if (currentFrontObject !== previousFrontObject) {
			if (previousFrontObject) {
				if (this.logMessages)
					console.log(
						`${this.constructor.name}: mouseleave: ${previousFrontObject.name}`
					);
				previousFrontObject.dispatchEvent({
					type: 'mouseleave',
					object: previousFrontObject,
					viewer: this.viewer,
				});
			}
			if (currentFrontObject) {
				if (this.logMessages)
					console.log(
						`${this.constructor.name}: mouseover: ${currentFrontObject.name}`
					);
				currentFrontObject.dispatchEvent({
					type: 'mouseover',
					object: currentFrontObject,
					viewer: this.viewer,
				});
			}
		}

		for (const object of abandonedHovers) {
			object.dispatchEvent({
				type: 'mouseleavemultiple',
				object: object,
				viewer: this.viewer,
			});
		}
		for (const object of newHovers) {
			object.dispatchEvent({
				type: 'mouseovermultiple',
				object: object,
				viewer: this.viewer,
			});
		}

		if (hoveredElements.length > 0) {
			let object = hoveredElements
				.map((e) => e.object)
				.find((e) => e._listeners && e._listeners['mousemove']);

			if (object) {
				object.dispatchEvent({
					type: 'mousemove',
					object: object,
				});
			}
		}

		// for (let inputListener of this.getSortedListeners()) {
		// 	inputListener.dispatchEvent({
		// 		type: 'mousemove',
		// 		object: null
		// 	});
		// }

		this.hoveredElements = hoveredElements;
	}

	//double check because is really changed
	onMouseMoveOld(e) {
		e.preventDefault();
		this.mouseHasMovedSinceMouseDown = true;//clusterTool
		this.mouseHasMovedSinceLastClick = true;//clusterTool
		let rect = this.domElement.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		this.mouse.set(x, y);

		let hoveredElements = this.getHoveredElements();
		if (hoveredElements.length > 0) {
			let names = hoveredElements.map(h => h.object.name).join(", ");
			if (this.logMessages) console.log(`${this.constructor.name}: onMouseMove; hovered: '${names}'`);
		}

		//added for cluster tool
		//		if (this.viewer.clusterTool.active) {
		//			this.viewer.clusterTool.onMouseMove(this.mouse);
		//		}

		this.extraTools.forEach(tool => {tool.active && tool.onMouseMove(this.mouse);});


		if (this.draw?.object) {
			this.draw.object.dispatchEvent({
				type: 'draw',
				mouse: this.mouse,
				viewer: this.viewer,
				drawingTarget: hoveredElements[0]?.object.parent.editable
					? hoveredElements[0]
					: undefined,
			});
		}

		//end of additions

		if (this.drag) {
			this.drag.mouse = e.buttons;

			this.drag.lastDrag.x = x - this.drag.end.x;
			this.drag.lastDrag.y = y - this.drag.end.y;

			this.drag.end.set(x, y);

			if (this.drag.object) {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ' + this.drag.object.name);
				this.drag.object.dispatchEvent({
					type: 'drag',
					drag: this.drag,
					viewer: this.viewer
				});
			} else {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ');

				let dragConsumed = false;
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer,
						consume: () => {dragConsumed = true;}
					});

					if (dragConsumed) {
						break;
					}
				}
			}

			//it used to be a return and no else here, but it turned into an else
			return;//added by me
		} else //no else in clustered version
		{
			let curr = hoveredElements.map(a => a.object).find(a => true);
			let prev = this.hoveredElements.map(a => a.object).find(a => true);

			if (curr !== prev) {
				if (curr) {
					if (this.logMessages) console.log(`${this.constructor.name}: mouseover: ${curr.name}`);
					curr.dispatchEvent({
						type: 'mouseover',
						object: curr,
					});
				}
				if (prev) {
					if (this.logMessages) console.log(`${this.constructor.name}: mouseleave: ${prev.name}`);
					prev.dispatchEvent({
						type: 'mouseleave',
						object: prev,
					});
				}
			}

			if (hoveredElements.length > 0) {
				let object = hoveredElements
					.map(e => e.object)
					.find(e => (e._listeners && e._listeners['mousemove']));

				if (object) {
					object.dispatchEvent({
						type: 'mousemove',
						object: object
					});
				}
			}

		}

		// for (let inputListener of this.getSortedListeners()) {
		// 	inputListener.dispatchEvent({
		// 		type: 'mousemove',
		// 		object: null
		// 	});
		// }


		this.hoveredElements = hoveredElements;
	}

	onMouseWheel(e) {
		if (!this.enabled) return;

		if (this.logMessages) console.log(this.constructor.name + ": onMouseWheel");

		e.preventDefault();

		let delta = 0;
		if (e.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
			delta = e.wheelDelta;
		} else if (e.detail !== undefined) { // Firefox
			delta = -e.detail;
		}

		let ndelta = Math.sign(delta);

		// this.wheelDelta += Math.sign(delta);

		if (this.hoveredElement) {
			this.hoveredElement.object.dispatchEvent({
				type: 'mousewheel',
				delta: ndelta,
				object: this.hoveredElement.object
			});
		} else {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mousewheel',
					delta: ndelta,
					object: null
				});
			}
		}
	}

	startDragging(object, args = null) {

		let name = object ? object.name : "no name";
		if (this.logMessages) console.log(`${this.constructor.name}: startDragging: '${name}'`);

		this.drag = {
			start: this.mouse.clone(),
			end: this.mouse.clone(),
			lastDrag: new THREE.Vector2(0, 0),
			startView: this.scene.view.clone(),
			object: object
		};

		if (args) {
			for (let key of Object.keys(args)) {
				this.drag[key] = args[key];
			}
		}
	}

	getMousePointCloudIntersection(mouse) {
		return Utils.getMousePointCloudIntersection(
			this.mouse,
			this.scene.getActiveCamera(),
			this.viewer,
			this.scene.pointclouds);
	}

	toggleSelection(object) {
		let oldSelection = this.selection;

		let index = this.selection.indexOf(object);

		if (index === -1) {
			this.selection.push(object);
			object.dispatchEvent({
				type: 'select'
			});
		} else {
			this.selection.splice(index, 1);
			object.dispatchEvent({
				type: 'deselect'
			});
		}

		this.dispatchEvent({
			type: 'selection_changed',
			oldSelection: oldSelection,
			selection: this.selection
		});
	}

	deselect(object) {

		let oldSelection = this.selection;

		let index = this.selection.indexOf(object);

		if (index >= 0) {
			this.selection.splice(index, 1);
			object.dispatchEvent({
				type: 'deselect'
			});

			this.dispatchEvent({
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection
			});
		}
	}

	deselectAll() {
		for (let object of this.selection) {
			object.dispatchEvent({
				type: 'deselect'
			});
		}

		let oldSelection = this.selection;

		if (this.selection.length > 0) {
			this.selection = [];
			this.dispatchEvent({
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection
			});
		}
	}

	isSelected(object) {
		let index = this.selection.indexOf(object);

		return index !== -1;
	}

	registerInteractiveObject(object) {
		this.interactiveObjects.add(object);
	}

	removeInteractiveObject(object) {
		this.interactiveObjects.delete(object);
	}

	registerInteractiveScene(scene) {
		let index = this.interactiveScenes.indexOf(scene);
		if (index === -1) {
			this.interactiveScenes.push(scene);
		}
	}

	unregisterInteractiveScene(scene) {
		let index = this.interactiveScenes.indexOf(scene);
		if (index > -1) {
			this.interactiveScenes.splice(index, 1);
		}
	}

	getHoveredElement() {
		let hoveredElements = this.getHoveredElements();
		if (hoveredElements.length > 0) {
			return hoveredElements[0];
		} else {
			return null;
		}
	}

	getHoveredElementsOld() {
		let scenes = this.interactiveScenes.concat(this.scene.scene);

		let interactableListeners = ['mouseup', 'mousemove', 'mouseover', 'mouseleave', 'drag', 'drop', 'click', 'select', 'deselect'];
		let interactables = [];
		for (let scene of scenes) {
			scene.traverseVisible(node => {
				if (node._listeners && node.visible && !this.blacklist.has(node)) {
					let hasInteractableListener = interactableListeners.filter((e) => {
						return node._listeners[e] !== undefined;
					}).length > 0;

					if (hasInteractableListener) {
						interactables.push(node);
					}
				}
			});
		}

		let camera = this.scene.getActiveCamera();
		let ray = Utils.mouseToRay(this.mouse, camera, this.domElement.clientWidth, this.domElement.clientHeight);

		let raycaster = new THREE.Raycaster();
		raycaster.ray.set(ray.origin, ray.direction);
		raycaster.params.Line.threshold = 0.2;

		let intersections = raycaster.intersectObjects(interactables.filter(o => o.visible), false);

		return intersections;
	}

	//split the raycasting betwen native  camera and ECEF cameras or others.
	//Others implement a transformCamera method or even custon raycaster
	//if transform camera is used, camera is transformed from current projection to ecef
	getHoveredElements() {
		let scenes = this.interactiveScenes.concat(this.scene.scene);

		let interactableListeners = ['mouseup', 'mousemove', 'mouseover', 'mouseleave', 'drag', 'drop', 'click', 'select', 'deselect'];
		let interactables = [];
		for (let scene of scenes) {
			scene.traverseVisible(node => {
				if (node._listeners && node.visible && !this.blacklist.has(node)) {
					let hasInteractableListener = interactableListeners.filter((e) => {
						return node._listeners[e] !== undefined;
					}).length > 0;

					if (hasInteractableListener) {
						interactables.push(node);
					}
				}
			});
		}

		let camera = this.scene.getActiveCamera();
		let ray = Utils.mouseToRay(this.mouse, camera, this.domElement.clientWidth, this.domElement.clientHeight);

		//raycasting is split into two parts, one for native camera and one for ECEF cameras
		const scenesWithTransformCamera = interactables.filter(scene => scene.transformCamera);
		const scenesWithoutTransformCamera = interactables.filter(scene => !scene.transformCamera);

		let intersections = [];

		// Additional code for ECEF cameras
		// search for transformCamera method and appends a link to the root objet of the registered scnee (or group)
		// Allowing to have a group with children raycasted but without events per child, which can be expensive


		// code for regular UTM cameras or native projection
		if (scenesWithoutTransformCamera.length > 0) {
			let raycaster = new THREE.Raycaster();
			raycaster.ray.set(ray.origin, ray.direction);
			raycaster.params.Line.threshold = 0.2;

			intersections = intersections.concat(raycaster.intersectObjects(interactables.filter(o => o.visible), false));
		}

		if (scenesWithTransformCamera.length > 0) {

			scenesWithTransformCamera.forEach(scene => {

				if (scene.visible) {

					let customCamera = scene.transformCamera();//required method, origina changes, direction remains??
					let ray = Utils.mouseToRay(this.mouse, customCamera, this.domElement.clientWidth, this.domElement.clientHeight);

					let raycaster = new THREE.Raycaster();
					raycaster.params.Line.threshold = 0.4;
					raycaster.ray.set(ray.origin, ray.direction);
					let intersect = raycaster.intersectObject(scene, true);
					if (intersect.length) {
						intersect[0].rootScene = scene;//link to root node with events for 3dTilesRendered structure
						intersections = intersections.concat(intersect);
					}
				}
			})

		}
		// let raycaster = new THREE.Raycaster();
		// raycaster.ray.set(ray.origin, ray.direction);
		// raycaster.params.Line.threshold = 0.2;

		// let intersections = raycaster.intersectObjects(interactables.filter(o => o.visible), false);

		return intersections;
	}
	setScene(scene) {
		this.deselectAll();

		this.scene = scene;
	}

	update(delta) {

	}

	getNormalizedDrag() {
		if (!this.drag) {
			return new THREE.Vector2(0, 0);
		}

		let diff = new THREE.Vector2().subVectors(this.drag.end, this.drag.start);

		diff.x = diff.x / this.domElement.clientWidth;
		diff.y = diff.y / this.domElement.clientHeight;

		return diff;
	}

	getNormalizedLastDrag() {
		if (!this.drag) {
			return new THREE.Vector2(0, 0);
		}

		let lastDrag = this.drag.lastDrag.clone();

		lastDrag.x = lastDrag.x / this.domElement.clientWidth;
		lastDrag.y = lastDrag.y / this.domElement.clientHeight;

		return lastDrag;
	}
}
