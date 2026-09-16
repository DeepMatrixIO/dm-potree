// Lightweight vanilla-JS replacements for jQuery UI's draggable/resizable widgets,
// used for floating panels such as the 2D profile window.

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

const MIN_SIZE = 50;
const DEFAULT_DRAG_CANCEL_SELECTOR = "input, textarea, button, select, option";

// Makes `el` draggable by pressing on `handle` (defaults to `el` itself),
// staying within the bounds of `containment`. Mirrors jQuery UI's
// `.draggable({handle, containment})` call signature used throughout the codebase.
export function makeDraggable(el, {handle = el, containment = document.body, cancel = DEFAULT_DRAG_CANCEL_SELECTOR} = {}) {
	if (el._vanillaDraggable) {
		return el._vanillaDraggable;
	}

	let startMouse = {x: 0, y: 0};
	let startPos = {left: 0, top: 0};

	const onMouseMove = (e) => {
		let dx = e.clientX - startMouse.x;
		let dy = e.clientY - startMouse.y;

		let containmentRect = containment.getBoundingClientRect();
		let elRect = el.getBoundingClientRect();

		let left = clamp(startPos.left + dx, 0, containmentRect.width - elRect.width);
		let top = clamp(startPos.top + dy, 0, containmentRect.height - elRect.height);

		el.style.left = `${left}px`;
		el.style.top = `${top}px`;
	};

	const onMouseUp = () => {
		document.removeEventListener("mousemove", onMouseMove);
		document.removeEventListener("mouseup", onMouseUp);
	};

	handle.addEventListener("mousedown", (e) => {
		if (cancel && e.target.closest(cancel)) {
			return;
		}

		e.preventDefault();

		let containmentRect = containment.getBoundingClientRect();
		let elRect = el.getBoundingClientRect();

		startMouse = {x: e.clientX, y: e.clientY};
		startPos = {
			left: elRect.left - containmentRect.left,
			top: elRect.top - containmentRect.top,
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	});

	el._vanillaDraggable = {handle, containment};

	return el._vanillaDraggable;
}

const HANDLE_STYLES = {
	n: {top: "-3px", left: "0", width: "100%", height: "6px", cursor: "ns-resize"},
	s: {bottom: "-3px", left: "0", width: "100%", height: "6px", cursor: "ns-resize"},
	e: {top: "0", right: "-3px", width: "6px", height: "100%", cursor: "ew-resize"},
	w: {top: "0", left: "-3px", width: "6px", height: "100%", cursor: "ew-resize"},
};

// Adds resize handles to the edges of `el` (n, e, s, w by default), constrained
// within `containment`. Mirrors jQuery UI's `.resizable({containment, handles})`.
export function makeResizable(el, {containment = document.body, handles = ["n", "e", "s", "w"]} = {}) {
	if (el._vanillaResizable) {
		return el._vanillaResizable;
	}

	if (getComputedStyle(el).position === "static") {
		el.style.position = "absolute";
	}

	const elHandles = {};

	for (let dir of handles) {
		let elHandle = document.createElement("div");
		elHandle.className = `vanilla-resize-handle vanilla-resize-handle-${dir}`;
		Object.assign(elHandle.style, {position: "absolute", zIndex: 10001}, HANDLE_STYLES[dir]);
		el.appendChild(elHandle);
		elHandles[dir] = elHandle;

		let startMouse = {x: 0, y: 0};
		let startRect = {left: 0, top: 0, width: 0, height: 0};

		const onMouseMove = (e) => {
			let dx = e.clientX - startMouse.x;
			let dy = e.clientY - startMouse.y;
			let containmentRect = containment.getBoundingClientRect();

			if (dir === "e") {
				let width = clamp(startRect.width + dx, MIN_SIZE, containmentRect.right - startRect.left);
				el.style.width = `${width}px`;
			} else if (dir === "w") {
				let rightEdge = startRect.left + startRect.width;
				let newLeft = clamp(startRect.left + dx, containmentRect.left, rightEdge - MIN_SIZE);
				el.style.width = `${rightEdge - newLeft}px`;
				el.style.left = `${newLeft - containmentRect.left}px`;
			} else if (dir === "s") {
				let height = clamp(startRect.height + dy, MIN_SIZE, containmentRect.bottom - startRect.top);
				el.style.height = `${height}px`;
			} else if (dir === "n") {
				let bottomEdge = startRect.top + startRect.height;
				let newTop = clamp(startRect.top + dy, containmentRect.top, bottomEdge - MIN_SIZE);
				el.style.height = `${bottomEdge - newTop}px`;
				el.style.top = `${newTop - containmentRect.top}px`;
			}
		};

		const onMouseUp = () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		elHandle.addEventListener("mousedown", (e) => {
			e.preventDefault();
			e.stopPropagation();

			let elRect = el.getBoundingClientRect();

			startMouse = {x: e.clientX, y: e.clientY};
			startRect = {left: elRect.left, top: elRect.top, width: elRect.width, height: elRect.height};

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});
	}

	el._vanillaResizable = {containment, handles: elHandles};

	return el._vanillaResizable;
}
