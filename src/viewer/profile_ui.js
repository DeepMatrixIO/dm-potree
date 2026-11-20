/**
 * Programmatic Profile UI builder & style injector (replaces fetching profile.html).
 * Exposes all styleable elements and icon elements for external customization.
 */

export const PROFILE_UI_STYLE_ID = 'potree-profile-ui-styles';

export const PROFILE_UI_STYLES = `
#profile_window {
	position: absolute;
	width: 84%;
	left: 15%;
	top: 55%;
	height: 44%;
	margin: 5px;
	border: 1px solid black;
	display: none;
	box-sizing: border-box;
	z-index: 10000;
}

#profile_titlebar {
	display: flex;
	position: absolute;
	height: 30px;
	width: 100%;
	box-sizing: border-box;
}

#profile_titlebar .profile-title-wrapper {
	padding-right: 10px;
}

#profileInfo {
	flex-grow: 1;
	flex-direction: row;
}

#closeProfileContainer {
	width: 24px;
	height: 24px;
	margin: 4px;
}

#profile_window .pw_content {
	position: absolute;
	top: 30px;
	width: 100%;
	height: calc(100% - 30px);
	box-sizing: border-box;
}

#profile_window .profile-main-container {
	height: 100%;
	width: 100%;
	padding: 5px;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
}

#profile_window .profile-toolbar {
	width: 100%;
	color: #9d9d9d;
	margin: 5px;
	display: flex;
	flex-direction: row;
	align-items: center;
	box-sizing: border-box;
}

#profile_window .profile-toolbar-spacer {
	flex-grow: 1;
}

#profile_window .profile-toolbar-controls {
	display: inline-flex;
	align-items: center;
}

#potree_profile_rotate_amount {
	display: inline-block;
	width: 2.5em;
	vertical-align: top;
	background: white;
	margin: 2px;
}

#profile_draw_container {
	width: 100%;
	flex-grow: 1;
	position: relative;
	height: 100%;
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

#profileSVG {
	fill: #9d9d9d;
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

#profileCanvasContainer {
	position: absolute;
	left: 41px;
	top: 0;
	bottom: 20px;
	width: calc(100% - 41px);
	height: calc(100% - 20px);
}

#profileSelectionProperties {
	position: absolute;
	left: 50px;
	top: 10px;
	background-color: black;
	color: white;
	opacity: 0.7;
	padding: 5px;
	border: 1px solid white;
	user-select: text;
}
`;

/**
 * Injects the extracted Profile UI stylesheet into document.head (idempotent).
 * @param {object} [options]
 * @param {string} [options.css] - Custom CSS string to inject instead of the default styles.
 * @param {string} [options.styleId] - ID for the <style> tag.
 * @param {HTMLElement} [options.target] - Target container for the <style> tag (defaults to document.head).
 * @returns {HTMLStyleElement}
 */
export function injectProfileStyles(options = {}) {
	const {
		css = PROFILE_UI_STYLES,
		styleId = PROFILE_UI_STYLE_ID,
		target = document.head,
	} = options;

	let styleEl = document.getElementById(styleId);
	if (!styleEl) {
		styleEl = document.createElement('style');
		styleEl.id = styleId;
		styleEl.textContent = css;
		target.appendChild(styleEl);
	}
	return styleEl;
}

/**
 * Builds the Profile UI DOM tree without appending it to the document.
 * Returns structured references to all elements that require styling or icons.
 * @param {object} [options]
 * @param {string} [options.title] - Title text for the profile window header.
 * @param {string} [options.pointsLabel] - Label text next to the point count.
 * @param {string} [options.defaultRotateAmount] - Default rotation angle input value.
 * @returns {object}
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

	// Titlebar
	const elTitlebar = document.createElement('div');
	elTitlebar.id = 'profile_titlebar';
	elTitlebar.className = 'pv-titlebar';

	const elTitleWrapper = document.createElement('span');
	elTitleWrapper.className = 'profile-title-wrapper';

	const elWindowTitle = document.createElement('span');
	elWindowTitle.id = 'profile_window_title';
	elWindowTitle.textContent = title;
	elTitleWrapper.appendChild(elWindowTitle);

	const elProfileInfo = document.createElement('span');
	elProfileInfo.id = 'profileInfo';
	elProfileInfo.textContent = ' ';

	const elCloseIcon = document.createElement('img');
	elCloseIcon.id = 'closeProfileContainer';
	elCloseIcon.className = 'button-icon';

	elTitlebar.appendChild(elTitleWrapper);
	elTitlebar.appendChild(elProfileInfo);
	elTitlebar.appendChild(elCloseIcon);
	elProfileWindow.appendChild(elTitlebar);

	// Content wrapper
	const elContent = document.createElement('div');
	elContent.className = 'pw_content';

	const elMainContainer = document.createElement('div');
	elMainContainer.className = 'pv-main-color profile-main-container';

	// Toolbar
	const elToolbar = document.createElement('div');
	elToolbar.className = 'profile-toolbar';

	const elPointsLabel = document.createElement('span');
	elPointsLabel.textContent = `${pointsLabel}:\u00A0`;

	const elNumPoints = document.createElement('span');
	elNumPoints.id = 'profile_num_points';
	elNumPoints.textContent = '-';

	const elToolbarSpacer = document.createElement('span');
	elToolbarSpacer.className = 'profile-toolbar-spacer';

	const elToolbarControls = document.createElement('span');
	elToolbarControls.className = 'profile-toolbar-controls';

	const elRotateAmount = document.createElement('input');
	elRotateAmount.id = 'potree_profile_rotate_amount';
	elRotateAmount.type = 'text';
	elRotateAmount.maxLength = 4;
	elRotateAmount.value = defaultRotateAmount;

	const elRotateCWIcon = document.createElement('img');
	elRotateCWIcon.id = 'potree_profile_rotate_cw';
	elRotateCWIcon.className = 'text-icon';

	const elRotateCCWIcon = document.createElement('img');
	elRotateCCWIcon.id = 'potree_profile_rotate_ccw';
	elRotateCCWIcon.className = 'text-icon';

	const elMoveForwardIcon = document.createElement('img');
	elMoveForwardIcon.id = 'potree_profile_move_forward';
	elMoveForwardIcon.className = 'text-icon';

	const elMoveBackwardIcon = document.createElement('img');
	elMoveBackwardIcon.id = 'potree_profile_move_backward';
	elMoveBackwardIcon.className = 'text-icon';

	const createDownloadLink = (linkId, filename, iconId) => {
		const link = document.createElement('a');
		link.id = linkId;
		link.href = '#';
		link.setAttribute('download', filename);

		const icon = document.createElement('img');
		icon.id = iconId;
		icon.className = 'text-icon';

		link.appendChild(icon);
		return { link, icon };
	};

	const dxf2D = createDownloadLink('potree_download_profile_dxf2D_link', 'profile_2D.dxf', 'potree_download_dxf2D_icon');
	const dxf3D = createDownloadLink('potree_download_profile_dxf3D_link', 'profile_3D.dxf', 'potree_download_dxf3D_icon');
	const csv = createDownloadLink('potree_download_profile_ortho_link', 'profile.csv', 'potree_download_csv_icon');
	const las = createDownloadLink('potree_download_profile_link', 'profile.las', 'potree_download_las_icon');

	elToolbarControls.appendChild(elRotateAmount);
	elToolbarControls.appendChild(elRotateCWIcon);
	elToolbarControls.appendChild(elRotateCCWIcon);
	elToolbarControls.appendChild(elMoveForwardIcon);
	elToolbarControls.appendChild(elMoveBackwardIcon);
	elToolbarControls.appendChild(dxf2D.link);
	elToolbarControls.appendChild(dxf3D.link);
	elToolbarControls.appendChild(csv.link);
	elToolbarControls.appendChild(las.link);

	elToolbar.appendChild(elPointsLabel);
	elToolbar.appendChild(elNumPoints);
	elToolbar.appendChild(elToolbarSpacer);
	elToolbar.appendChild(elToolbarControls);
	elMainContainer.appendChild(elToolbar);

	// Draw container
	const elDrawContainer = document.createElement('div');
	elDrawContainer.id = 'profile_draw_container';

	const elCanvasBg = document.createElement('div');
	elCanvasBg.className = 'profile-canvas-bg';

	const elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	elSvg.id = 'profileSVG';

	const elCanvasContainer = document.createElement('div');
	elCanvasContainer.id = 'profileCanvasContainer';

	const elSelectionProperties = document.createElement('div');
	elSelectionProperties.id = 'profileSelectionProperties';

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
 * @param {object} [options]
 * @param {HTMLElement} [options.container] - Parent element to append #profile_window to (defaults to document.body).
 * @param {boolean} [options.injectStyles] - Whether to inject default styles into document.head (defaults to true).
 * @param {string} [options.customStyles] - Optional custom CSS string overriding PROFILE_UI_STYLES.
 * @param {object} [options.icons] - Optional map of icon keys (close, rotateCW, rotateCCW, moveForward, moveBackward, downloadDxf2D, downloadDxf3D, downloadCsv, downloadLas) to image URLs.
 * @returns {object} Handle containing { root, styleElement, elements, icons, setIcons }.
 */
export function loadProfileUI(options = {}) {
	const {
		container = document.body,
		injectStyles = true,
		customStyles,
		icons: iconOverrides,
		...uiOptions
	} = options;

	let styleElement = null;
	if (injectStyles) {
		styleElement = injectProfileStyles(customStyles ? { css: customStyles } : {});
	}

	const existing = document.getElementById('profile_window');
	if (existing) {
		const icons = {
			close: document.getElementById('closeProfileContainer'),
			rotateCW: document.getElementById('potree_profile_rotate_cw'),
			rotateCCW: document.getElementById('potree_profile_rotate_ccw'),
			moveForward: document.getElementById('potree_profile_move_forward'),
			moveBackward: document.getElementById('potree_profile_move_backward'),
			downloadDxf2D: document.getElementById('potree_download_dxf2D_icon'),
			downloadDxf3D: document.getElementById('potree_download_dxf3D_icon'),
			downloadCsv: document.getElementById('potree_download_csv_icon'),
			downloadLas: document.getElementById('potree_download_las_icon'),
		};

		const elements = {
			window: existing,
			titlebar: document.getElementById('profile_titlebar'),
			windowTitle: document.getElementById('profile_window_title'),
			info: document.getElementById('profileInfo'),
			content: existing.querySelector('.pw_content'),
			mainContainer: existing.querySelector('.profile-main-container') || existing.querySelector('.pv-main-color'),
			toolbar: existing.querySelector('.profile-toolbar'),
			numPoints: document.getElementById('profile_num_points'),
			rotateAmountInput: document.getElementById('potree_profile_rotate_amount'),
			drawContainer: document.getElementById('profile_draw_container'),
			canvasBackground: existing.querySelector('.profile-canvas-bg'),
			svg: document.getElementById('profileSVG'),
			canvasContainer: document.getElementById('profileCanvasContainer'),
			selectionProperties: document.getElementById('profileSelectionProperties'),
			links: {
				dxf2D: document.getElementById('potree_download_profile_dxf2D_link'),
				dxf3D: document.getElementById('potree_download_profile_dxf3D_link'),
				csv: document.getElementById('potree_download_profile_ortho_link'),
				las: document.getElementById('potree_download_profile_link'),
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
