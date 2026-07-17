
function addCommas(nStr){
	nStr += '';
	let x = nStr.split('.');
	let x1 = x[0];
	let x2 = x.length > 1 ? '.' + x[1] : '';
	let rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
};

function format(value){
	return addCommas(value.toFixed(3));
};

class VanillaSlider {
	constructor(params) {
		this.min = params.min !== undefined ? params.min : 0;
		this.max = params.max !== undefined ? params.max : 100;
		this.step = params.step !== undefined ? params.step : 1;
		this.values = params.values !== undefined ? [...params.values] : [this.min, this.max];
		this.onSlide = params.slide;

		this.element = document.createElement("div");
		this.element.className = "vanilla-slider-container";
		this.element.style.position = "relative";
		this.element.style.height = "24px";
		this.element.style.margin = "5px 0";
		this.element.style.display = "flex";
		this.element.style.alignItems = "center";
		this.element.style.width = "100%";

		// Track background
		this.track = document.createElement("div");
		this.track.style.position = "absolute";
		this.track.style.left = "0";
		this.track.style.right = "0";
		this.track.style.height = "6px";
		this.track.style.backgroundColor = "#ccc";
		this.track.style.borderRadius = "3px";
		this.element.appendChild(this.track);

		// Highlighted range track
		this.highlight = document.createElement("div");
		this.highlight.style.position = "absolute";
		this.highlight.style.height = "6px";
		this.highlight.style.backgroundColor = "#5d9cec";
		this.highlight.style.borderRadius = "3px";
		this.element.appendChild(this.highlight);

		// Min input
		this.inputMin = document.createElement("input");
		this.inputMin.type = "range";
		this.inputMin.style.position = "absolute";
		this.inputMin.style.width = "100%";
		this.inputMin.style.pointerEvents = "none";
		this.inputMin.style.background = "none";
		this.inputMin.style.appearance = "none";
		this.inputMin.style.webkitAppearance = "none";
		this.inputMin.style.margin = "0";
		this.inputMin.style.border = "none";
		this.inputMin.style.padding = "0";
		this.inputMin.style.zIndex = "2";
		this.element.appendChild(this.inputMin);

		// Max input
		this.inputMax = document.createElement("input");
		this.inputMax.type = "range";
		this.inputMax.style.position = "absolute";
		this.inputMax.style.width = "100%";
		this.inputMax.style.pointerEvents = "none";
		this.inputMax.style.background = "none";
		this.inputMax.style.appearance = "none";
		this.inputMax.style.webkitAppearance = "none";
		this.inputMax.style.margin = "0";
		this.inputMax.style.border = "none";
		this.inputMax.style.padding = "0";
		this.inputMax.style.zIndex = "2";
		this.element.appendChild(this.inputMax);

		// Ensure global style sheet for thumbs is injected once
		let styleId = "vanilla-slider-style-injected";
		if (!document.getElementById(styleId)) {
			let style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				.vanilla-slider-container input[type="range"]::-webkit-slider-thumb {
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
				.vanilla-slider-container input[type="range"]::-moz-range-thumb {
					pointer-events: auto;
					width: 14px;
					height: 14px;
					border-radius: 50%;
					background: #ffffff;
					border: 2px solid #5d9cec;
					cursor: pointer;
					box-shadow: 0 1px 3px rgba(0,0,0,0.3);
				}
				.vanilla-slider-container input[type="range"]::-webkit-slider-runnable-track {
					height: 6px;
					background: transparent;
					border: none;
				}
				.vanilla-slider-container input[type="range"]::-moz-range-track {
					height: 6px;
					background: transparent;
					border: none;
				}
			`;
			document.head.appendChild(style);
		}

		this.inputMin.addEventListener("input", () => this.onInputChanged("min"));
		this.inputMax.addEventListener("input", () => this.onInputChanged("max"));

		this.updateDom();
	}

	updateDom() {
		// Prevent division-by-zero or negative values issues should min/max collapse
		if (this.min >= this.max) {
			this.max = this.min + 0.0001;
		}

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

		if (percent1 < 0) percent1 = 0;
		if (percent1 > 100) percent1 = 100;
		if (percent2 < 0) percent2 = 0;
		if (percent2 > 100) percent2 = 100;

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
			this.onSlide([...this.values]);
		}
	}

	set(options) {
		if (options.min !== undefined) this.min = options.min;
		if (options.max !== undefined) this.max = options.max;
		if (options.step !== undefined) this.step = options.step;
		if (options.values !== undefined) this.values = [...options.values];

		if (this.values[0] < this.min) this.values[0] = this.min;
		if (this.values[1] > this.max) this.values[1] = this.max;
		if (this.values[0] > this.values[1]) {
			this.values = [this.min, this.max];
		}

		this.updateDom();
	}

	getValues() {
		return [...this.values];
	}
}

export class HierarchicalSlider{

	constructor(params = {}){

		this.element = document.createElement("div");

		this.labels = [];
		this.sliders = [];
		this.range = params.range != null ? params.range : [0, 1];
		this.slide = params.slide != null ? params.slide : null;
		this.step = params.step != null ? params.step : 0.0001;

		let levels = params.levels != null ? params.levels : 1;

		for(let level = 0; level < levels; level++){
			this.addLevel();
		}

	}

	setRange(range){
		this.range = [...range];

		{ // root slider
			let slider = this.sliders[0];
			slider.set({
				min: range[0],
				max: range[1],
			});
		}

		for(let i = 1; i < this.sliders.length; i++){
			let parentSlider = this.sliders[i - 1];
			let slider = this.sliders[i];

			let parentValues = parentSlider.getValues();
			let childRange = [...parentValues];

			slider.set({
				min: childRange[0],
				max: childRange[1],
			});
		}

		this.updateLabels();
	}

	setValues(values){
		for(let slider of this.sliders){
			slider.set({
				values: [...values],
			});
		}

		this.updateLabels();
	}

	addLevel(){
		const elLevel = document.createElement("li");
		const elRange = document.createTextNode("Range: ");
		const label = document.createElement("span");

		let level = this.sliders.length;
		let [min, max] = [0, 0];

		if(this.sliders.length === 0){
			[min, max] = this.range;
		}else{
			let parentSlider = this.sliders[this.sliders.length - 1];
			[min, max] = parentSlider.getValues();
		}

		let slider = new VanillaSlider({
			min: min,
			max: max,
			step: this.step,
			values: [min, max],
			slide: (values) => {
				// set all descendants to same range
				let levels = this.sliders.length;
				for(let i = level + 1; i < levels; i++){
					let descendant = this.sliders[i];

					descendant.set({
						min: values[0],
						max: values[1],
						values: [...values],
					});
				}

				if(this.slide){
					this.slide({
						target: this,
						range: this.range,
						values: [...values],
					});
				}

				this.updateLabels();
			}
		});

		elLevel.append(elRange, label, slider.element);

		this.sliders.push(slider);
		this.labels.push(label);
		this.element.append(elLevel);

		this.updateLabels();
	}

	removeLevel(){

	}

	updateSliders(){

	}

	updateLabels(){

		let levels = this.sliders.length;

		for(let i = 0; i < levels; i++){

			let slider = this.sliders[i];
			let label = this.labels[i];

			let [min, max] = slider.getValues();
			let strMin = format(min);
			let strMax = format(max);
			let strLabel = `${strMin} to ${strMax}`;

			label.innerHTML = strLabel;
		}

	}


}
