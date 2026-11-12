import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pageJsonPath = path.resolve(rootDir, 'examples/page.json');
const pageData = JSON5.parse(fs.readFileSync(pageJsonPath, 'utf8'));

// Build list of categorized items
const categories = {
	featured: [
		{
			title: 'Dev Viewer (index.js)',
			desc: 'Core development viewer executing example/index.js with default point cloud and sidebar.',
			url: '/example/dev_viewer.html',
			thumb: 'thumbnails/viewer.png',
			badge: 'Core Entry'
		},
		{
			title: 'Feature Test Suite Dashboard',
			desc: 'Interactive testing dashboard for tools, filters, clipping, and tetrahedral volumes.',
			url: '/feature_test.html',
			thumb: 'thumbnails/clipping_volume.png',
			badge: 'Test Suite'
		}
	],
	tools: [
		{ title: 'Clipping Volume', desc: 'Volumetric box clipping with inside/outside/highlight filters.', url: '/example/clipping_volume.html', thumb: 'thumbnails/clipping_volume.png' },
		{ title: 'Measurements', desc: 'Distance, angle, height, area, and circle measurements.', url: '/example/measurements.html', thumb: 'thumbnails/measurements.png' },
		{ title: 'Elevation Profile', desc: 'Draw profile paths across terrain and inspect cross-sections.', url: '/example/elevation_profile.html', thumb: 'thumbnails/elevation_profile.png' },
		{ title: 'Annotations', desc: 'Interactive 3D points of interest and camera bookmarks.', url: '/example/annotations.html', thumb: 'thumbnails/annotations.png' },
		{ title: 'Hierarchical Annotations', desc: 'Nested multi-level annotation tree with custom actions.', url: '/example/annotation_hierarchy.html', thumb: 'thumbnails/annotation_hierarchy.png' },
		{ title: 'Transformation Tool', desc: 'Interactive Gizmo for translating and rotating scene objects.', url: '/example/testing/transformation_tool.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Annotations Performance', desc: 'Benchmark high volume annotation rendering.', url: '/example/testing/annotations_performance.html', thumb: 'thumbnails/annotations.png' },
		{ title: 'Toolbar', desc: 'Quick-access measurement and clipping toolbar atop viewer.', url: '/example/toolbar.html', thumb: 'thumbnails/toolbar.jpg' },
		{ title: 'Custom Sidebar Section', desc: 'Inject custom UI sections and controllers into sidebar.', url: '/example/custom_sidebar_section.html', thumb: 'thumbnails/custom_sidebar_section.png' }
	],
	data: [
		{ title: 'Classifications', desc: 'ASPRS LiDAR classification filtering and color schemes.', url: '/example/classifications.html', thumb: 'thumbnails/classifications.jpg' },
		{ title: 'COPC Loader', desc: 'Cloud Optimized Point Cloud direct HTTP range loading.', url: '/example/copc.html', thumb: 'thumbnails/lion_las.png' },
		{ title: 'EPT (Entwine Point Tile)', desc: 'Entwine format streaming and octree traversal.', url: '/example/ept.html', thumb: 'thumbnails/lion.png' },
		{ title: 'EPT Binary', desc: 'Raw binary stream parsing for Entwine datasets.', url: '/example/ept_binary.html', thumb: 'thumbnails/lion_las.png' },
		{ title: 'EPT zstandard', desc: 'Zstandard compressed Entwine stream decoding.', url: '/example/ept_zstandard.html', thumb: 'thumbnails/lion_las.png' },
		{ title: 'Lion LAS', desc: 'Direct LAS format loading without server preprocessing.', url: '/example/lion_las.html', thumb: 'thumbnails/lion_las.png' },
		{ title: 'Lion LAZ', desc: 'Compressed LAZ point cloud stream decompression.', url: '/example/lion_laz.html', thumb: 'thumbnails/lion_las.png' },
		{ title: 'Geopackage', desc: 'Loading vector overlays and geometries from SQLite GeoPackage.', url: '/example/geopackage.html', thumb: 'thumbnails/geopackage.jpg' },
		{ title: 'Shapefiles', desc: 'Render GIS shapefile polygons and lines over point clouds.', url: '/example/shapefiles.html', thumb: 'thumbnails/shapefiles.png' },
		{ title: 'Load Project', desc: 'Save and reload full scene states and annotations JSON.', url: '/example/load_project.html', thumb: 'thumbnails/load_project.jpg' },
		{ title: 'Multiple Point Clouds', desc: 'Render and blend multiple overlapping point clouds.', url: '/example/multiple_pointclouds.html', thumb: 'thumbnails/multiple_point_clouds.png' },
		{ title: 'Extra Attributes', desc: 'Custom scalar attribute extraction and visualization.', url: '/example/extra_attributes.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Extra Attributes (Vegetation)', desc: 'Vegetation NDVI and segmented point attribute shaders.', url: '/example/extra_attributes_vegetation.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Extra Attributes (Calkini)', desc: 'High density agricultural point cloud classification.', url: '/example/extra_attributes_calkini.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Extra Attributes (Fragua)', desc: 'Multi-spectral attribute coloring and segmentation.', url: '/example/extra_attributes_fragua.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Extra Attributes (INEGI)', desc: 'Official geospatial LiDAR with normal and intensity attributes.', url: '/example/extra_attributes_inegi.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Extra Attributes (KMeans)', desc: 'Point cluster visualization from KMeans attributes.', url: '/example/extra_attributes_kmeans.html', thumb: 'thumbnails/viewer.png' }
	],
	rendering: [
		{ title: 'Matcap Shading', desc: 'Sphere-mapped lighting textures for stylized point rendering.', url: '/example/matcap.html', thumb: 'thumbnails/matcap.jpg' },
		{ title: 'Point Lights', desc: 'Realtime dynamic Three.js lighting and point illumination.', url: '/example/light.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Animated Lights', desc: 'Moving light sources with real-time shadow & diffuse updates.', url: '/example/light_animated.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Gradient Colors', desc: 'Custom color gradients mapped across elevation or intensity.', url: '/example/gradient_colors.html', thumb: 'thumbnails/gradient_colors.png' },
		{ title: 'Lines & Wireframes', desc: 'Three.js Fat Lines and vector overlays in Point Cloud space.', url: '/example/lines.html', thumb: 'thumbnails/viewer.png' },
		{ title: 'Meshes', desc: 'Load OBJ and 3D textured meshes alongside point clouds.', url: '/example/meshes.html', thumb: 'thumbnails/meshes.png' },
		{ title: 'Custom Isolines', desc: 'Elevation contour lines rendered directly on point surface.', url: '/example/custom_isolines.html', thumb: 'thumbnails/viewer.png' }
	],
	camera: [
		{ title: 'Camera Animation', desc: 'Keyframed camera fly-through paths with bezier smoothing.', url: '/example/camera_animation.html', thumb: 'thumbnails/camera_animation.jpg' },
		{ title: 'Animation Paths', desc: 'Pre-computed camera trajectory paths across complex terrain.', url: '/example/animation_paths.html', thumb: 'thumbnails/animation_paths.png' },
		{ title: 'Oriented Images', desc: 'Photogrammetry camera frustums and aligned high-res photos.', url: '/example/oriented_images.html', thumb: 'thumbnails/oriented_images.jpg' },
		{ title: '360 Images', desc: 'Spherical 360 panorama nodes georeferenced to 3D points.', url: '/example/360.html', thumb: 'thumbnails/360.jpg' },
		{ title: 'Device Orientation', desc: 'Mobile gyro and compass camera orientation controls.', url: '/example/deviceorientation.html', thumb: 'thumbnails/viewer.png' }
	],
	cesium: [
		{ title: 'Cesium CA13', desc: 'Synchronized Potree point cloud inside Cesium 3D Globe.', url: '/example/cesium_ca13.html', thumb: 'thumbnails/cesium_ca13.png' },
		{ title: 'Cesium Retz', desc: 'Large scale municipal terrain rendered on Cesium globe.', url: '/example/cesium_retz.html', thumb: 'thumbnails/cesium_retz.png' },
		{ title: 'Cesium Sorvilier', desc: 'High precision valley point cloud with Cesium imagery.', url: '/example/cesium_sorvilier.html', thumb: 'thumbnails/cesium_sorvilier.png' }
	],
	vr: [
		{ title: 'VR Heidentor', desc: 'WebXR immersive VR inspection for Heidentor monument.', url: '/example/vr_heidentor.html', thumb: 'thumbnails/heidentor.jpg' },
		{ title: 'VR Eclepens', desc: 'Immersive VR quarry walkthrough with 6DOF teleportation.', url: '/example/vr_eclepens.html', thumb: 'thumbnails/eclepens.jpg' },
		{ title: 'VR Morro Bay', desc: 'VR coastline flythrough and volumetric inspection.', url: '/example/vr_morro_bay.html', thumb: 'thumbnails/ca13.png' },
		{ title: 'VR Lion', desc: 'VR controller scale and orientation tests on high-res statue.', url: '/example/vr_lion.html', thumb: 'thumbnails/lion.png' },
		{ title: 'VR Dechen Cave', desc: 'Subterranean cave exploration in full immersive VR.', url: '/example/vr_dechen_cave.html', thumb: 'thumbnails/dechen_cave.jpg' }
	],
	showcase: pageData.showcase.map(item => ({
		title: item.label,
		desc: `Showcase 3D capture: ${item.label}`,
		url: `/example/${item.url}`,
		thumb: item.thumb
	}))
};

// Calculate total count
let totalCount = 0;
for (const list of Object.values(categories)) {
	totalCount += list.length;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Potree Examples & Feature Testing Portal</title>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
	<style>
		:root {
			--bg-base: #0b0f19;
			--bg-card: rgba(17, 24, 39, 0.75);
			--border-card: rgba(255, 255, 255, 0.08);
			--accent: #38bdf8;
			--accent-hover: #0ea5e9;
			--text-main: #f3f4f6;
			--text-muted: #9ca3af;
		}

		* { box-sizing: border-box; }
		body, html {
			margin: 0;
			padding: 0;
			background-color: var(--bg-base);
			color: var(--text-main);
			font-family: 'Inter', system-ui, -apple-system, sans-serif;
			min-height: 100vh;
			overflow-x: hidden;
		}

		/* Top Navigation Bar */
		header {
			position: sticky;
			top: 0;
			z-index: 100;
			background: rgba(11, 15, 25, 0.85);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border-bottom: 1px solid var(--border-card);
			padding: 16px 32px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 20px;
			flex-wrap: wrap;
		}

		.brand {
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.brand-logo {
			width: 32px;
			height: 32px;
			background: linear-gradient(135deg, #0284c7, #38bdf8);
			border-radius: 8px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-weight: 800;
			color: #fff;
			font-size: 16px;
			box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
		}

		.brand-title {
			font-size: 18px;
			font-weight: 700;
			letter-spacing: -0.02em;
			color: #fff;
		}

		.brand-subtitle {
			font-size: 12px;
			color: var(--text-muted);
			font-weight: 500;
		}

		/* Search and Filter Controls */
		.controls-bar {
			display: flex;
			align-items: center;
			gap: 12px;
			flex: 1;
			max-width: 500px;
		}

		.search-box {
			width: 100%;
			position: relative;
		}

		.search-input {
			width: 100%;
			padding: 9px 14px 9px 38px;
			background: rgba(31, 41, 55, 0.6);
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 8px;
			color: #fff;
			font-family: inherit;
			font-size: 13px;
			transition: all 0.2s;
			outline: none;
		}

		.search-input:focus {
			border-color: var(--accent);
			background: rgba(31, 41, 55, 0.9);
			box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
		}

		.search-icon {
			position: absolute;
			left: 12px;
			top: 50%;
			transform: translateY(-50%);
			color: var(--text-muted);
			pointer-events: none;
		}

		/* Quick action buttons in header */
		.header-actions {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.btn-pill {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 8px 16px;
			border-radius: 8px;
			font-size: 13px;
			font-weight: 600;
			text-decoration: none;
			transition: all 0.2s;
			cursor: pointer;
			border: 1px solid transparent;
		}

		.btn-primary {
			background: linear-gradient(135deg, #0284c7, #0369a1);
			color: #fff;
			box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
		}

		.btn-primary:hover {
			background: linear-gradient(135deg, #0ea5e9, #0284c7);
			transform: translateY(-1px);
		}

		.btn-outline {
			background: rgba(255, 255, 255, 0.05);
			color: #e5e7eb;
			border-color: rgba(255, 255, 255, 0.15);
		}

		.btn-outline:hover {
			background: rgba(255, 255, 255, 0.1);
			border-color: rgba(255, 255, 255, 0.3);
		}

		/* Hero Banner */
		.hero {
			padding: 36px 32px 20px;
			max-width: 1400px;
			margin: 0 auto;
		}

		.hero h1 {
			margin: 0 0 8px;
			font-size: 28px;
			font-weight: 800;
			letter-spacing: -0.03em;
		}

		.hero p {
			margin: 0;
			color: var(--text-muted);
			font-size: 14px;
			max-width: 700px;
			line-height: 1.5;
		}

		/* Category Filter Navigation */
		.category-nav {
			display: flex;
			gap: 8px;
			padding: 16px 32px;
			max-width: 1400px;
			margin: 0 auto;
			overflow-x: auto;
			white-space: nowrap;
		}

		.cat-btn {
			padding: 7px 14px;
			border-radius: 20px;
			font-size: 12px;
			font-weight: 600;
			background: rgba(255, 255, 255, 0.05);
			border: 1px solid rgba(255, 255, 255, 0.1);
			color: var(--text-muted);
			cursor: pointer;
			transition: all 0.2s;
		}

		.cat-btn:hover {
			background: rgba(255, 255, 255, 0.1);
			color: #fff;
		}

		.cat-btn.active {
			background: rgba(56, 189, 248, 0.2);
			border-color: var(--accent);
			color: var(--accent);
			box-shadow: 0 0 12px rgba(56, 189, 248, 0.2);
		}

		/* Main Content Grid */
		main {
			max-width: 1400px;
			margin: 0 auto;
			padding: 10px 32px 60px;
		}

		.section-title {
			font-size: 18px;
			font-weight: 700;
			letter-spacing: -0.02em;
			margin: 32px 0 16px;
			display: flex;
			align-items: center;
			gap: 10px;
			color: #e5e7eb;
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
			padding-bottom: 10px;
		}

		.badge-count {
			font-size: 11px;
			font-weight: 700;
			background: rgba(255, 255, 255, 0.1);
			color: var(--text-muted);
			padding: 2px 8px;
			border-radius: 12px;
		}

		.cards-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
			gap: 20px;
		}

		/* Example Card */
		.card {
			background: var(--bg-card);
			border: 1px solid var(--border-card);
			border-radius: 12px;
			overflow: hidden;
			display: flex;
			flex-direction: column;
			transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s;
			text-decoration: none;
			color: inherit;
			position: relative;
		}

		.card:hover {
			transform: translateY(-4px);
			border-color: rgba(56, 189, 248, 0.4);
			box-shadow: 0 12px 24px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.15);
		}

		.card-thumb-wrap {
			position: relative;
			width: 100%;
			height: 160px;
			background: #111827;
			overflow: hidden;
		}

		.card-thumb {
			width: 100%;
			height: 100%;
			object-fit: cover;
			transition: transform 0.4s ease;
		}

		.card:hover .card-thumb {
			transform: scale(1.05);
		}

		.card-badge {
			position: absolute;
			top: 10px;
			right: 10px;
			background: rgba(17, 24, 39, 0.85);
			backdrop-filter: blur(4px);
			border: 1px solid rgba(255, 255, 255, 0.15);
			color: var(--accent);
			font-size: 10px;
			font-weight: 700;
			padding: 3px 8px;
			border-radius: 9999px;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		.card-body {
			padding: 16px;
			flex: 1;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			gap: 12px;
		}

		.card-title {
			font-size: 14px;
			font-weight: 700;
			color: #fff;
			margin: 0 0 4px;
		}

		.card-desc {
			font-size: 12px;
			color: var(--text-muted);
			margin: 0;
			line-height: 1.45;
		}

		.card-footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: 11px;
			font-weight: 600;
			color: var(--accent);
			padding-top: 10px;
			border-top: 1px solid rgba(255, 255, 255, 0.05);
		}

		.no-results {
			text-align: center;
			padding: 60px 20px;
			color: var(--text-muted);
			font-size: 15px;
			display: none;
		}
	</style>
</head>
<body>

	<header>
		<div class="brand">
			<div class="brand-logo">P</div>
			<div>
				<div class="brand-title">Potree Module Examples</div>
				<div class="brand-subtitle">Interactive Feature & Component Showcase (${totalCount} examples)</div>
			</div>
		</div>

		<div class="controls-bar">
			<div class="search-box">
				<svg class="search-icon" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
					<path d="M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A7.952 7.952 0 0 0 18 10c0-4.411-3.589-8-8-8s-8 3.589-8 8 3.589 8 8 8zm0-14c3.309 0 6 2.691 6 6s-2.691 6-6 6-6-2.691-6-6 2.691-6 6-6z"/>
				</svg>
				<input type="text" id="searchInput" class="search-input" placeholder="Search examples by name, category or feature...">
			</div>
		</div>

		<div class="header-actions">
			<a href="/example/dev_viewer.html" class="btn-pill btn-primary">
				<span>🚀</span> Dev Viewer (index.js)
			</a>
			<a href="/feature_test.html" class="btn-pill btn-outline">
				<span>🧪</span> Feature Tests
			</a>
		</div>
	</header>

	<div class="hero">
		<h1>Explore Potree Examples</h1>
		<p>Browse and run the full library of Potree examples, converted to modern ES module architecture. Click any card to launch the viewer with that feature configured.</p>
	</div>

	<div class="category-nav">
		<button class="cat-btn active" data-filter="all">All (${totalCount})</button>
		<button class="cat-btn" data-filter="featured">🌟 Featured</button>
		<button class="cat-btn" data-filter="tools">📏 Tools & Clipping</button>
		<button class="cat-btn" data-filter="data">📂 Loaders & Formats</button>
		<button class="cat-btn" data-filter="rendering">🎨 Shaders & Materials</button>
		<button class="cat-btn" data-filter="camera">🎥 Camera & Animation</button>
		<button class="cat-btn" data-filter="cesium">🌍 Cesium</button>
		<button class="cat-btn" data-filter="vr">🕶️ VR</button>
		<button class="cat-btn" data-filter="showcase">🏛️ Showcase Models</button>
	</div>

	<main id="mainContainer">
`;

// Helper to generate cards
function renderSection(id, title, items, badgeName) {
	let str = `
		<section class="section-group" data-category="${id}">
			<div class="section-title">
				<span>${title}</span>
				<span class="badge-count">${items.length}</span>
			</div>
			<div class="cards-grid">
	`;

	for (const item of items) {
		const thumb = item.thumb ? `/${item.thumb}` : '/thumbnails/viewer.png';
		const badge = item.badge || badgeName;
		str += `
			<a class="card" href="${item.url}" data-title="${item.title.toLowerCase()}" data-desc="${(item.desc || '').toLowerCase()}" data-category="${id}">
				<div class="card-thumb-wrap">
					<img class="card-thumb" src="${thumb}" alt="${item.title}" onerror="this.src='/thumbnails/viewer.png'">
					${badge ? `<div class="card-badge">${badge}</div>` : ''}
				</div>
				<div class="card-body">
					<div>
						<h3 class="card-title">${item.title}</h3>
						<p class="card-desc">${item.desc || ''}</p>
					</div>
					<div class="card-footer">
						<span>Launch Example</span>
						<span>→</span>
					</div>
				</div>
			</a>
		`;
	}

	str += `
			</div>
		</section>
	`;
	return str;
}

let bodyHtml = html;
bodyHtml += renderSection('featured', '🌟 Featured Workspaces', categories.featured, 'Core');
bodyHtml += renderSection('tools', '📏 Tools, Measurements & Clipping', categories.tools, 'Tools');
bodyHtml += renderSection('data', '📂 Formats, Loaders & Attributes', categories.data, 'Data');
bodyHtml += renderSection('rendering', '🎨 Rendering, Lighting & Materials', categories.rendering, 'Rendering');
bodyHtml += renderSection('camera', '🎥 Camera, Animation & 360', categories.camera, 'Camera');
bodyHtml += renderSection('cesium', '🌍 Cesium Integration', categories.cesium, 'Cesium');
bodyHtml += renderSection('vr', '🕶️ Virtual Reality (WebXR)', categories.vr, 'VR');
bodyHtml += renderSection('showcase', '🏛️ Showcase Datasets', categories.showcase, 'Showcase');

bodyHtml += `
		<div id="noResults" class="no-results">
			<h3>No matching examples found</h3>
			<p>Try searching for a different keyword like "clipping", "cesium", "las", "vr" or "measure".</p>
		</div>
	</main>

	<script>
		const searchInput = document.getElementById('searchInput');
		const catBtns = document.querySelectorAll('.cat-btn');
		const cards = document.querySelectorAll('.card');
		const sections = document.querySelectorAll('.section-group');
		const noResults = document.getElementById('noResults');

		let currentFilter = 'all';
		let currentQuery = '';

		function filterCards() {
			let visibleCount = 0;

			sections.forEach(section => {
				const sectionCategory = section.getAttribute('data-category');
				const sectionCards = section.querySelectorAll('.card');
				let sectionVisible = 0;

				sectionCards.forEach(card => {
					const cardCategory = card.getAttribute('data-category');
					const title = card.getAttribute('data-title');
					const desc = card.getAttribute('data-desc');

					const matchesCategory = currentFilter === 'all' || cardCategory === currentFilter;
					const matchesQuery = !currentQuery || title.includes(currentQuery) || desc.includes(currentQuery);

					if (matchesCategory && matchesQuery) {
						card.style.display = 'flex';
						sectionVisible++;
						visibleCount++;
					} else {
						card.style.display = 'none';
					}
				});

				if (sectionVisible > 0) {
					section.style.display = 'block';
				} else {
					section.style.display = 'none';
				}
			});

			noResults.style.display = visibleCount === 0 ? 'block' : 'none';
		}

		searchInput.addEventListener('input', e => {
			currentQuery = e.target.value.toLowerCase().trim();
			filterCards();
		});

		catBtns.forEach(btn => {
			btn.addEventListener('click', () => {
				catBtns.forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				currentFilter = btn.getAttribute('data-filter');
				filterCards();
			});
		});
	</script>
</body>
</html>
`;

fs.writeFileSync(path.resolve(rootDir, 'index.html'), bodyHtml, 'utf8');
console.log('Successfully generated index.html with all examples!');
