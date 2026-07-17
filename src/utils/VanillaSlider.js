// Lightweight vanilla-JS replacement for the jQuery UI slider widget.
// Supports both single-value sliders (jQuery UI style: {value, min, max, step, slide})
// and dual-handle range sliders ({range: true, values: [min, max], min, max, step, slide}).
//
// The `slide` callback is invoked with the same (event, ui) shape used throughout the
// codebase: `ui.value` for single sliders, `ui.values` for range sliders. This keeps the
// business logic in call sites (e.g. PropertiesPanel.js) unchanged.

let stylesInjected = false;

function injectStylesOnce() {
	if (stylesInjected) return;
	stylesInjected = true;

	const style = document.createElement("style");
	style.id = "vanilla-slider-styles";
	style.textContent = `
		.vanilla-slider-track {
			position: absolute;
			left: 0;
			right: 0;
			top: 50%;
			height: 4px;
			transform: translateY(-50%);
			background-color: rgba(255, 255, 255, 0.2);
			border-radius: 2px;
			cursor: pointer;
		}
		.vanilla-slider-highlight {
			position: absolute;
			top: 50%;
			height: 4px;
			transform: translateY(-50%);
			background-color: #5d9cec;
			border-radius: 2px;
			pointer-events: none;
		}
		.vanilla-slider-handle {
			position: absolute;
			top: 50%;
			width: 14px;
			height: 14px;
			margin-left: -7px;
			border-radius: 50%;
			background: #ffffff;
			border: 1px solid black;
			transform: translateY(-50%);
			cursor: pointer;
			box-shadow: 0 1px 3px rgba(0,0,0,0.4);
			z-index: 2;
		}
	`;
	document.head.appendChild(style);
}

export class VanillaSlider {
	constructor(container, options = {}) {
		this.container = container;
		this.isRange = options.range === true || Array.isArray(options.values);
		this.min = options.min !== undefined ? options.min : 0;
		this.max = options.max !== undefined ? options.max : 100;
		this.step = options.step !== undefined ? options.step : 1;
		this.onSlide = options.slide || null;

		if (this.isRange) {
			this.values = options.values ? [...options.values] : [this.min, this.max];
		} else {
			this.value = options.value !== undefined ? options.value : this.min;
		}

		this._buildDom();
		this._update();
	}

	_buildDom() {
		injectStylesOnce();

		this.container.innerHTML = "";
		this.container.classList.add("ui-slider", "vanilla-slider-container");
		this.container.style.position = "relative";

		this.track = document.createElement("div");
		this.track.className = "vanilla-slider-track";
		this.container.appendChild(this.track);

		this.highlight = document.createElement("div");
		this.highlight.className = "vanilla-slider-highlight";
		this.container.appendChild(this.highlight);

		this.handleMin = document.createElement("div");
		this.handleMin.className = "ui-slider-handle vanilla-slider-handle";
		this.container.appendChild(this.handleMin);

		if (this.isRange) {
			this.handleMax = document.createElement("div");
			this.handleMax.className = "ui-slider-handle vanilla-slider-handle";
			this.container.appendChild(this.handleMax);
		}

		this._bindDrag(this.handleMin, 0);
		if (this.isRange) {
			this._bindDrag(this.handleMax, 1);
		}

		this.track.addEventListener("mousedown", (e) => this._onTrackClick(e));
	}

	_clampToStep(value) {
		let stepped = Math.round((value - this.min) / this.step) * this.step + this.min;
		return Math.min(this.max, Math.max(this.min, stepped));
	}

	_percentFromValue(value) {
		if (this.max === this.min) return 0;
		return ((value - this.min) / (this.max - this.min)) * 100;
	}

	_valueFromClientX(clientX) {
		const rect = this.container.getBoundingClientRect();
		let percent = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
		percent = Math.min(1, Math.max(0, percent));
		return this._clampToStep(this.min + percent * (this.max - this.min));
	}

	_bindDrag(handle, handleIndex) {
		const onMouseMove = (e) => {
			let value = this._valueFromClientX(e.clientX);

			if (this.isRange) {
				if (handleIndex === 0) {
					value = Math.min(value, this.values[1]);
					this.values[0] = value;
				} else {
					value = Math.max(value, this.values[0]);
					this.values[1] = value;
				}
			} else {
				this.value = value;
			}

			this._update();
			this._emitSlide();
		};

		const onMouseUp = () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		handle.addEventListener("mousedown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});
	}

	_onTrackClick(e) {
		let value = this._valueFromClientX(e.clientX);

		if (this.isRange) {
			// move whichever handle is closer
			let dMin = Math.abs(value - this.values[0]);
			let dMax = Math.abs(value - this.values[1]);
			if (dMin <= dMax) {
				this.values[0] = Math.min(value, this.values[1]);
			} else {
				this.values[1] = Math.max(value, this.values[0]);
			}
		} else {
			this.value = value;
		}

		this._update();
		this._emitSlide();
	}

	_emitSlide() {
		if (!this.onSlide) return;

		if (this.isRange) {
			this.onSlide(null, {values: [...this.values]});
		} else {
			this.onSlide(null, {value: this.value});
		}
	}

	_update() {
		if (this.isRange) {
			let p1 = this._percentFromValue(this.values[0]);
			let p2 = this._percentFromValue(this.values[1]);

			this.handleMin.style.left = `${p1}%`;
			this.handleMax.style.left = `${p2}%`;

			this.highlight.style.left = `${p1}%`;
			this.highlight.style.width = `${p2 - p1}%`;
		} else {
			let p = this._percentFromValue(this.value);

			this.handleMin.style.left = `${p}%`;

			this.highlight.style.left = "0%";
			this.highlight.style.width = `${p}%`;
		}
	}

	// Mimics jQuery UI's slider("option", ...) update pattern used throughout the codebase,
	// e.g. `slider.set({value: newValue})` or `slider.set({min, max, values})`.
	set(options = {}) {
		if (options.min !== undefined) this.min = options.min;
		if (options.max !== undefined) this.max = options.max;
		if (options.step !== undefined) this.step = options.step;
		if (options.slide !== undefined) this.onSlide = options.slide;

		if (this.isRange) {
			if (options.values !== undefined) this.values = [...options.values];
		} else {
			if (options.value !== undefined) this.value = options.value;
		}

		this._update();
	}

	getValue() {
		return this.value;
	}

	getValues() {
		return [...this.values];
	}
}

// Creates (or reuses) a VanillaSlider bound to a container element. Subsequent calls with
// the same container update the existing slider's options instead of re-creating the DOM.
export function createSlider(container, options = {}) {
	if (!container) return null;

	if (container._vanillaSlider) {
		container._vanillaSlider.set(options);
		return container._vanillaSlider;
	}

	const slider = new VanillaSlider(container, options);
	container._vanillaSlider = slider;
	return slider;
}
