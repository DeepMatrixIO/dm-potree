import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const examplesDir = path.resolve(rootDir, 'examples');
const exampleDir = path.resolve(rootDir, 'example');

const backButtonHtml = `\n\t<a href="/index.html" style="position: fixed; top: 10px; left: 10px; z-index: 10000; background: rgba(17, 24, 39, 0.88); color: #38bdf8; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: background 0.2s;" onmouseover="this.style.background='rgba(31, 41, 55, 0.95)'" onmouseout="this.style.background='rgba(17, 24, 39, 0.88)'">← Examples Index</a>\n`;

function adaptHtmlContent(content, depth = 1) {
	const relToRoot = depth === 1 ? '..' : '../..';
	const relToBridge = depth === 1 ? './potree_bridge.js' : '../potree_bridge.js';

	// Normalize libs path
	content = content.replace(/(["'])\.\.\/\.\.\/libs\//g, `$1${relToRoot}/libs/`);
	content = content.replace(/(["'])\.\.\/libs\//g, `$1${relToRoot}/libs/`);

	// Normalize css path
	content = content.replace(/(["'])\.\.\/build\/potree\/potree\.css(["'])/g, `$1${relToRoot}/dist/potree/potree.css$2`);
	content = content.replace(/(["'])\.\.\/\.\.\/build\/potree\/potree\.css(["'])/g, `$1${relToRoot}/dist/potree/potree.css$2`);

	// Normalize background image
	content = content.replace(/\.\.\/build\/potree\/resources\/images\/background\.jpg/g, `${relToRoot}/dist/resources/images/background.jpg`);
	content = content.replace(/\.\.\/\.\.\/build\/potree\/resources\/images\/background\.jpg/g, `${relToRoot}/dist/resources/images/background.jpg`);

	// Replace potree.js script tag with potree_bridge.js module
	content = content.replace(/<script\s+src=["'](?:\.\.\/)+build\/potree\/potree\s*\.js["']><\/script>/gi, `<script type="module" src="${relToBridge}"></script>`);

	// Inject back button after <body>
	if (content.includes('<body') && !content.includes('← Examples Index')) {
		content = content.replace(/(<body[^>]*>)/i, `$1${backButtonHtml}`);
	}

	// Ensure script type="module" imports potree_bridge.js
	content = content.replace(/<script\s+type=["']module["']>([\s\S]*?)<\/script>/gi, (match, scriptBody) => {
		if (scriptBody.includes('potree_bridge.js')) {
			return match;
		}
		const importBridge = `\n\t\timport '${relToBridge}';`;
		return `<script type="module">${importBridge}${scriptBody}</script>`;
	});

	return content;
}

function processDirectory(srcDir, destDir, depth = 1) {
	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}

	const entries = fs.readdirSync(srcDir, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(srcDir, entry.name);
		const destPath = path.join(destDir, entry.name);

		if (entry.isDirectory()) {
			// Process showcase, testing, etc.
			if (['showcase', 'testing'].includes(entry.name)) {
				processDirectory(srcPath, destPath, depth + 1);
			}
		} else if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'page.html') {
			let content = fs.readFileSync(srcPath, 'utf8');
			content = adaptHtmlContent(content, depth);
			fs.writeFileSync(destPath, content, 'utf8');
			console.log(`Copied and adapted: ${path.relative(rootDir, destPath)}`);
		}
	}
}

// 1. Process main examples and subdirectories
console.log('Copying examples from examples/ to example/...');
processDirectory(examplesDir, exampleDir, 1);

// 2. Also create example/dev_viewer.html for existing example/index.js
const devViewerHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Potree Dev Viewer (index.js)</title>
  <link rel="stylesheet" type="text/css" href="./potree/potree.css">
  <link rel="stylesheet" type="text/css" href="../libs/jquery-ui/jquery-ui.min.css">
  <link rel="stylesheet" type="text/css" href="../libs/openlayers3/ol.css">
  <link rel="stylesheet" type="text/css" href="../libs/spectrum/spectrum.css">
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    .back-btn {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 10000;
      background: rgba(17, 24, 39, 0.88);
      color: #38bdf8;
      padding: 6px 14px;
      border-radius: 6px;
      text-decoration: none;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      transition: background 0.2s;
    }
    .back-btn:hover {
      background: rgba(31, 41, 55, 0.95);
    }
  </style>
</head>
<body>
  <a href="/index.html" class="back-btn">← Examples Index</a>
  <script type="module" src="./index.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(exampleDir, 'dev_viewer.html'), devViewerHtml, 'utf8');
console.log('Created example/dev_viewer.html (points to index.js)');

console.log('Done adapting examples.');

