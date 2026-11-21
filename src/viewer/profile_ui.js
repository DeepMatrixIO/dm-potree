/**
 * Programmatic Profile UI builder & style injector (replaces fetching profile.html).
 * Applies both inline layout styles (matching profile.html so layout never collapses
 * in external systems) and an injected stylesheet, and exposes all elements & icons.
 */

export const PROFILE_UI_STYLE_ID = 'potree-profile-ui-styles';

export const PROFILE_UI_STYLES = `
div#profile_window {
	position: absolute;
	width: 84%;
	left: 15%;
	top: 55%;
	height: 44%;
	margin: 5px;
	border: 1px solid #444444;
	background-color: #d4d4d4;
	color: #1a1a1a;
	display: none;
	box-sizing: border-box;
	z-index: 10000;
	font-family: sans-serif;
}

#profile_window #profile_titlebar {
	display: flex;
	align-items: center;
	position: absolute;
	height: 30px;
	width: 100%;
	background-color: #b8b8b8;
	color: #1a1a1a;
	text-shadow: none;
	font-size: 1em;
	font-weight: bold;
	box-sizing: border-box;
}

#profile_window #profile_titlebar .profile-title-wrapper {
	padding-right: 10px;
	padding-left: 6px;
	color: #1a1a1a;
}

#profile_window #profile_window_title {
	position: relative;
	margin: 0 5px;
	color: #1a1a1a;
}

#profile_window #profileInfo {
	flex-grow: 1;
	flex-direction: row;
	color: #1a1a1a;
	font-weight: normal;
	font-size: 0.9em;
}

#profile_window #closeProfileContainer {
	width: 24px;
	height: 24px;
	margin: 4px;
	cursor: pointer;
}

#profile_window .button-icon {
	width: 24px;
	height: 24px;
	cursor: pointer;
}

#profile_window .button-icon:hover {
	filter: drop-shadow(0px 0px 4px #333333);
}

#profile_window .text-icon {
	height: 24px;
	width: 24px;
	opacity: 0.75;
	cursor: pointer;
	display: inline-block;
	vertical-align: middle;
}

#profile_window .text-icon:hover {
	opacity: 1.0;
}

#profile_window .pw_content {
	position: absolute;
	top: 30px;
	width: 100%;
	height: calc(100% - 30px);
	background-color: #d4d4d4;
	color: #1a1a1a;
	box-sizing: border-box;
}

#profile_window .profile-main-container {
	height: 100%;
	width: 100%;
	padding: 5px;
	display: flex;
	flex-direction: column;
	background-color: #d4d4d4;
	color: #1a1a1a;
	box-sizing: border-box;
}

#profile_window .profile-toolbar {
	width: 100%;
	color: #1a1a1a;
	font-size: 0.9em;
	margin: 5px;
	display: flex;
	flex-direction: row;
	align-items: center;
	box-sizing: border-box;
}

#profile_window .profile-points-label {
	color: #1a1a1a;
	font-weight: 500;
}

#profile_window #profile_num_points {
	color: #1a1a1a;
	font-weight: 600;
}

#profile_window .profile-toolbar-spacer {
	flex-grow: 1;
}

#profile_window .profile-toolbar-controls {
	display: inline-flex;
	align-items: center;
	gap: 2px;
}

#profile_window .profile-toolbar a {
	display: inline-flex;
	align-items: center;
	text-decoration: none;
	color: #1a1a1a;
}

#profile_window #potree_profile_rotate_amount {
	display: inline-block;
	width: 2.5em;
	vertical-align: top;
	background: #f5f5f5;
	color: #1a1a1a;
	border: 1px solid #666666;
	border-radius: 2px;
	padding: 1px 4px;
	margin: 2px;
}

#profile_window #profile_draw_container {
	width: 100%;
	flex-grow: 1;
	position: relative;
	height: 100%;
	min-height: 0;
	color: #1a1a1a;
	box-sizing: border-box;
	user-select: none;
}

#profile_window .profile-canvas-bg {
	position: absolute;
	left: 41px;
	top: 0;
	bottom: 20px;
	width: calc(100% - 41px);
	height: calc(100% - 20px);
	background-color: #000000;
}

#profile_window #profileSVG {
	fill: #1a1a1a;
	color: #1a1a1a;
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

#profile_window #profileSVG text {
	fill: #1a1a1a;
	font-size: 11px;
}

#profile_window #profileSVG path,
#profile_window #profileSVG line {
	stroke: #333333;
}

#profile_window #profileCanvasContainer {
	position: absolute;
	left: 41px;
	top: 0;
	bottom: 20px;
	width: calc(100% - 41px);
	height: calc(100% - 20px);
}

#profile_window #profileSelectionProperties {
	position: absolute;
	left: 50px;
	top: 10px;
	background-color: rgba(240, 240, 240, 0.92);
	color: #1a1a1a;
	padding: 6px 8px;
	border: 1px solid #444444;
	border-radius: 3px;
	font-size: 12px;
	user-select: text;
}
`;

function resolveStyleTarget(container) {
	const doc = (container && container.ownerDocument) ? container.ownerDocument : document;
	const rootNode = (container && typeof container.getRootNode === 'function')
		? container.getRootNode()
		: doc;
	const isShadowRoot = Boolean(rootNode && rootNode.host);
	const styleTarget = isShadowRoot ? rootNode : (doc.head || doc.documentElement);
	return { doc, rootNode, styleTarget };
}

/**
 * Injects the extracted Profile UI stylesheet into document.head or the container's ShadowRoot (idempotent).
 */
export function injectProfileStyles(options = {}) {
	const {
		css = PROFILE_UI_STYLES,
		styleId = PROFILE_UI_STYLE_ID,
		target,
		container,
		nonce,
	} = options;

	const resolved = resolveStyleTarget(container);
	const styleTarget = target || resolved.styleTarget;
	const lookupRoot = (styleTarget && typeof styleTarget.getElementById === 'function')
		? styleTarget
		: resolved.rootNode;

	let styleEl = (lookupRoot && typeof lookupRoot.getElementById === 'function')
		? lookupRoot.getElementById(styleId)
		: (styleTarget && typeof styleTarget.querySelector === 'function')
			? styleTarget.querySelector(`#${styleId}`)
			: null;

	if (!styleEl) {
		styleEl = resolved.doc.createElement('style');
		styleEl.id = styleId;
		if (nonce) {
			styleEl.setAttribute('nonce', nonce);
		}
		styleEl.textContent = css;
		styleTarget.appendChild(styleEl);
	} else if (options.css && styleEl.textContent !== css) {
		styleEl.textContent = css;
	}

	return styleEl;
}

/**
 * Builds the Profile UI DOM tree (matching profile.html structure & inline layout fallback styles).
 * Exposes all styleable elements and icon elements.
 */
export function createProfileUI(options = {}) {
	const {
		title = 'Profile',
		pointsLabel = 'Points',
		defaultRotateAmount = '10',
	} = options;

	// Root window
	const elProfileWindow = document.createElement('div');
	elProfileWindow.id = 'profile_window';
	elProfileWindow.style.cssText = 'position: absolute; width: 84%; left: 15%; top: 55%; height: 44%; margin: 5px; border: 1px solid #444444; background-color: #d4d4d4; color: #1a1a1a; display: none; box-sizing: border-box; z-index: 10000;';

	// Titlebar
	const elTitlebar = document.createElement('div');
	elTitlebar.id = 'profile_titlebar';
	elTitlebar.className = 'pv-titlebar';
	elTitlebar.style.cssText = 'display: flex; align-items: center; position: absolute; height: 30px; width: 100%; background-color: #b8b8b8; color: #1a1a1a; text-shadow: none; font-weight: bold; box-sizing: border-box;';

	const elTitleWrapper = document.createElement('span');
	elTitleWrapper.className = 'profile-title-wrapper';
	elTitleWrapper.style.cssText = 'padding-right: 10px; padding-left: 6px; color: #1a1a1a;';

	const elWindowTitle = document.createElement('span');
	elWindowTitle.id = 'profile_window_title';
	elWindowTitle.style.cssText = 'position: relative; margin: 0 5px; color: #1a1a1a;';
	elWindowTitle.textContent = title;
	elTitleWrapper.appendChild(elWindowTitle);

	const elProfileInfo = document.createElement('span');
	elProfileInfo.id = 'profileInfo';
	elProfileInfo.style.cssText = 'flex-grow: 1; flex-direction: row; color: #1a1a1a;';
	elProfileInfo.textContent = ' ';

	const elCloseIcon = document.createElement('img');
	elCloseIcon.id = 'closeProfileContainer';
	elCloseIcon.className = 'button-icon';
	elCloseIcon.style.cssText = 'width: 24px; height: 24px; margin: 4px; cursor: pointer;';

	elTitlebar.appendChild(elTitleWrapper);
	elTitlebar.appendChild(elProfileInfo);
	elTitlebar.appendChild(elCloseIcon);
	elProfileWindow.appendChild(elTitlebar);

	// Content wrapper
	const elContent = document.createElement('div');
	elContent.className = 'pw_content';
	elContent.style.cssText = 'position: absolute; top: 30px; width: 100%; height: calc(100% - 30px); background-color: #d4d4d4; color: #1a1a1a; box-sizing: border-box;';

	const elMainContainer = document.createElement('span');
	elMainContainer.className = 'pv-main-color profile-main-container';
	elMainContainer.style.cssText = 'height: 100%; width: 100%; padding: 5px; display: flex; flex-direction: column; background-color: #d4d4d4; color: #1a1a1a; box-sizing: border-box;';

	// Toolbar
	const elToolbar = document.createElement('div');
	elToolbar.className = 'profile-toolbar';
	elToolbar.style.cssText = 'width: 100%; color: #1a1a1a; margin: 5px; display: flex; flex-direction: row; align-items: center; box-sizing: border-box;';

	const elPointsLabel = document.createElement('span');
	elPointsLabel.className = 'profile-points-label';
	elPointsLabel.style.cssText = 'color: #1a1a1a;';
	elPointsLabel.textContent = pointsLabel;

	const elPointsColon = document.createTextNode(':\u00A0');

	const elNumPoints = document.createElement('span');
	elNumPoints.id = 'profile_num_points';
	elNumPoints.style.cssText = 'color: #1a1a1a; font-weight: 600;';
	elNumPoints.textContent = '-';

	const elToolbarSpacer = document.createElement('span');
	elToolbarSpacer.className = 'profile-toolbar-spacer';
	elToolbarSpacer.style.cssText = 'flex-grow: 1;';

	const elToolbarControls = document.createElement('span');
	elToolbarControls.className = 'profile-toolbar-controls';

	const elRotateAmount = document.createElement('input');
	elRotateAmount.id = 'potree_profile_rotate_amount';
	elRotateAmount.type = 'text';
	elRotateAmount.maxLength = 4;
	elRotateAmount.value = defaultRotateAmount;
	elRotateAmount.style.cssText = 'display: inline-block; width: 2.5em; vertical-align: top; background: #f5f5f5; color: #1a1a1a; border: 1px solid #666666; margin: 2px;';
	elToolbarControls.appendChild(elRotateAmount);

	const iconInlineStyle = 'height: 24px; width: 24px; cursor: pointer; display: inline-block; vertical-align: middle;';

	const elRotateCWIcon = document.createElement('img');
	elRotateCWIcon.id = 'potree_profile_rotate_cw';
	elRotateCWIcon.className = 'text-icon';
	elRotateCWIcon.style.cssText = iconInlineStyle;

	const elRotateCCWIcon = document.createElement('img');
	elRotateCCWIcon.id = 'potree_profile_rotate_ccw';
	elRotateCCWIcon.className = 'text-icon';
	elRotateCCWIcon.style.cssText = iconInlineStyle;

	const elMoveForwardIcon = document.createElement('img');
	elMoveForwardIcon.id = 'potree_profile_move_forward';
	elMoveForwardIcon.className = 'text-icon';
	elMoveForwardIcon.style.cssText = iconInlineStyle;

	const elMoveBackwardIcon = document.createElement('img');
	elMoveBackwardIcon.id = 'potree_profile_move_backward';
	elMoveBackwardIcon.className = 'text-icon';
	elMoveBackwardIcon.style.cssText = iconInlineStyle;

	const createDownloadLink = (linkId, filename, iconId) => {
		const link = document.createElement('a');
		link.id = linkId;
		link.href = '#';
		link.setAttribute('download', filename);
		link.style.cssText = 'display: inline-flex; align-items: center; text-decoration: none; color: #1a1a1a;';

		const icon = document.createElement('img');
		icon.id = iconId;
		icon.className = 'text-icon';
		icon.style.cssText = iconInlineStyle;

		link.appendChild(icon);
		return { link, icon };
	};

	const dxf2D = createDownloadLink('potree_download_profile_dxf2D_link', 'profile_2D.dxf', 'potree_download_dxf2D_icon');
	const dxf3D = createDownloadLink('potree_download_profile_dxf3D_link', 'profile_3D.dxf', 'potree_download_dxf3D_icon');
	const csv = createDownloadLink('potree_download_profile_ortho_link', 'profile.csv', 'potree_download_csv_icon');
	const las = createDownloadLink('potree_download_profile_link', 'profile.las', 'potree_download_las_icon');

	elToolbar.appendChild(elPointsLabel);
	elToolbar.appendChild(elPointsColon);
	elToolbar.appendChild(elNumPoints);
	elToolbar.appendChild(elToolbarSpacer);
	elToolbar.appendChild(elToolbarControls);
	elToolbar.appendChild(elRotateCWIcon);
	elToolbar.appendChild(elRotateCCWIcon);
	elToolbar.appendChild(elMoveForwardIcon);
	elToolbar.appendChild(elMoveBackwardIcon);
	elToolbar.appendChild(dxf2D.link);
	elToolbar.appendChild(dxf3D.link);
	elToolbar.appendChild(csv.link);
	elToolbar.appendChild(las.link);
	elMainContainer.appendChild(elToolbar);

	// Draw container
	const elDrawContainer = document.createElement('div');
	elDrawContainer.id = 'profile_draw_container';
	elDrawContainer.style.cssText = 'width: 100%; flex-grow: 1; position: relative; height: 100%; min-height: 0; color: #1a1a1a; box-sizing: border-box; user-select: none;';

	const elCanvasBg = document.createElement('div');
	elCanvasBg.className = 'profile-canvas-bg';
	elCanvasBg.style.cssText = 'position: absolute; left: 41px; top: 0; bottom: 20px; width: calc(100% - 41px); height: calc(100% - 20px); background-color: #000000;';

	const elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	elSvg.id = 'profileSVG';
	elSvg.style.cssText = 'fill: #1a1a1a; color: #1a1a1a; position: absolute; left: 0; right: 0; top: 0; bottom: 0; width: 100%; height: 100%; pointer-events: none;';

	const elCanvasContainer = document.createElement('div');
	elCanvasContainer.id = 'profileCanvasContainer';
	elCanvasContainer.style.cssText = 'position: absolute; left: 41px; top: 0; bottom: 20px; width: calc(100% - 41px); height: calc(100% - 20px);';

	const elSelectionProperties = document.createElement('div');
	elSelectionProperties.id = 'profileSelectionProperties';
	elSelectionProperties.style.cssText = 'position: absolute; left: 50px; top: 10px; background-color: rgba(240, 240, 240, 0.92); color: #1a1a1a; padding: 6px 8px; border: 1px solid #444444; border-radius: 3px; user-select: text; display: none;';

	elDrawContainer.appendChild(elCanvasBg);
	elDrawContainer.appendChild(elSvg);
	elDrawContainer.appendChild(elCanvasContainer);
	elDrawContainer.appendChild(elSelectionProperties);
	elMainContainer.appendChild(elDrawContainer);

	elContent.appendChild(elMainContainer);
	elProfileWindow.appendChild(elContent);

	const icons = {
		close: elCloseIcon,
		rotateCW: elRotateCWIcon,
		rotateCCW: elRotateCCWIcon,
		moveForward: elMoveForwardIcon,
		moveBackward: elMoveBackwardIcon,
		downloadDxf2D: dxf2D.icon,
		downloadDxf3D: dxf3D.icon,
		downloadCsv: csv.icon,
		downloadLas: las.icon,
	};

	const elements = {
		window: elProfileWindow,
		titlebar: elTitlebar,
		windowTitle: elWindowTitle,
		info: elProfileInfo,
		content: elContent,
		mainContainer: elMainContainer,
		toolbar: elToolbar,
		pointsLabel: elPointsLabel,
		numPoints: elNumPoints,
		toolbarControls: elToolbarControls,
		rotateAmountInput: elRotateAmount,
		drawContainer: elDrawContainer,
		canvasBackground: elCanvasBg,
		svg: elSvg,
		canvasContainer: elCanvasContainer,
		selectionProperties: elSelectionProperties,
		links: {
			dxf2D: dxf2D.link,
			dxf3D: dxf3D.link,
			csv: csv.link,
			las: las.link,
		},
	};

	return {
		root: elProfileWindow,
		elements,
		icons,
		setIcons(iconMap = {}) {
			for (const [key, src] of Object.entries(iconMap)) {
				if (icons[key] && src) {
					icons[key].src = src;
				}
			}
		},
	};
}

/**
 * Loads the Profile UI into the DOM (idempotent) and injects its styles.
 */
export function loadProfileUI(options = {}) {
	const {
		container = document.body,
		injectStyles = true,
		customStyles,
		nonce,
		icons: iconOverrides,
		...uiOptions
	} = options;

	let styleElement = null;
	if (injectStyles) {
		styleElement = injectProfileStyles({
			container,
			nonce,
			...(customStyles ? { css: customStyles } : {}),
		});
	}

	const { rootNode } = resolveStyleTarget(container);
	const getById = (id) => (rootNode && typeof rootNode.getElementById === 'function'
		? rootNode.getElementById(id)
		: document.getElementById(id));

	const existing = getById('profile_window');
	if (existing) {
		const icons = {
			close: getById('closeProfileContainer'),
			rotateCW: getById('potree_profile_rotate_cw'),
			rotateCCW: getById('potree_profile_rotate_ccw'),
			moveForward: getById('potree_profile_move_forward'),
			moveBackward: getById('potree_profile_move_backward'),
			downloadDxf2D: getById('potree_download_dxf2D_icon'),
			downloadDxf3D: getById('potree_download_dxf3D_icon'),
			downloadCsv: getById('potree_download_csv_icon'),
			downloadLas: getById('potree_download_las_icon'),
		};

		const elements = {
			window: existing,
			titlebar: getById('profile_titlebar'),
			windowTitle: getById('profile_window_title'),
			info: getById('profileInfo'),
			content: existing.querySelector('.pw_content'),
			mainContainer: existing.querySelector('.profile-main-container') || existing.querySelector('.pv-main-color'),
			toolbar: existing.querySelector('.profile-toolbar'),
			pointsLabel: existing.querySelector('.profile-points-label'),
			numPoints: getById('profile_num_points'),
			toolbarControls: existing.querySelector('.profile-toolbar-controls'),
			rotateAmountInput: getById('potree_profile_rotate_amount'),
			drawContainer: getById('profile_draw_container'),
			canvasBackground: existing.querySelector('.profile-canvas-bg'),
			svg: getById('profileSVG'),
			canvasContainer: getById('profileCanvasContainer'),
			selectionProperties: getById('profileSelectionProperties'),
			links: {
				dxf2D: getById('potree_download_profile_dxf2D_link'),
				dxf3D: getById('potree_download_profile_dxf3D_link'),
				csv: getById('potree_download_profile_ortho_link'),
				las: getById('potree_download_profile_link'),
			},
		};

		const handle = {
			root: existing,
			styleElement,
			elements,
			icons,
			setIcons(iconMap = {}) {
				for (const [key, src] of Object.entries(iconMap)) {
					if (icons[key] && src) {
						icons[key].src = src;
					}
				}
			},
		};

		if (iconOverrides) {
			handle.setIcons(iconOverrides);
		}
		return handle;
	}

	const ui = createProfileUI(uiOptions);
	container.appendChild(ui.root);

	if (iconOverrides) {
		ui.setIcons(iconOverrides);
	}

	return {
		...ui,
		styleElement,
	};
}
