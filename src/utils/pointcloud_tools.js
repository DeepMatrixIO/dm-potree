import { Box2, Vector3 } from 'three';
import { ProfileRequest } from '../ProfileRequest.js';
import { Profile } from './Profile.js';
import { ProfileFakeOctree } from '../viewer/profile.js';

/**
 * Normalizes the input target into { viewer, pointclouds }.
 * Accepts a Viewer, a PScene, a single PointCloudOctree, or an array of PointCloudOctrees.
 */
function resolvePointClouds(viewerOrPointclouds) {
	if (!viewerOrPointclouds) {
		return { viewer: null, pointclouds: [] };
	}
	if (Array.isArray(viewerOrPointclouds)) {
		return { viewer: null, pointclouds: viewerOrPointclouds };
	}
	if (viewerOrPointclouds.scene && Array.isArray(viewerOrPointclouds.scene.pointclouds)) {
		return {
			viewer: viewerOrPointclouds,
			pointclouds: viewerOrPointclouds.scene.pointclouds,
		};
	}
	if (Array.isArray(viewerOrPointclouds.pointclouds)) {
		return {
			viewer: null,
			pointclouds: viewerOrPointclouds.pointclouds,
		};
	}
	if (viewerOrPointclouds.pcoGeometry) {
		return {
			viewer: null,
			pointclouds: [viewerOrPointclouds],
		};
	}
	return { viewer: null, pointclouds: [] };
}

/**
 * Creates a short Profile centered at (x, y) with the given corridor width,
 * forming a vertical (width x width) extraction column across the full Z extent.
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {Profile}
 */
export function createXYColumnProfile(x, y, width = 1.0) {
	const safeWidth = Math.max(0.05, Number(width) || 1.0);
	const half = safeWidth / 2;

	const profile = new Profile();
	profile.name = `XY_Z_Query_(${x.toFixed(2)},${y.toFixed(2)})`;
	profile.setWidth(safeWidth);
	profile.addMarker(new Vector3(x - half, y, 0));
	profile.addMarker(new Vector3(x + half, y, 0));

	return profile;
}

/**
 * Runs a ProfileRequest across all matching pointclouds, forcing every intersecting
 * octree node (down to maxDepth) to load and streaming the extracted points into
 * a ProfileFakeOctree per pointcloud.
 */
function loadProfileIntoFakeOctrees(pointclouds, profile, options = {}) {
	const {
		maxDepth = Number.MAX_VALUE,
		timeoutMs = 30000,
		onProgress = null,
	} = options;

	// Filter to pointclouds whose world XY bounding box intersects the profile XY box
	const profileXYBox = new Box2();
	for (const pt of profile.points) {
		profileXYBox.expandByPoint({ x: pt.x, y: pt.y });
	}
	profileXYBox.expandByScalar(profile.width);

	const activePointclouds = pointclouds.filter(pc => {
		if (!pc || !pc.pcoGeometry || !pc.pcoGeometry.root) return false;
		pc.updateMatrixWorld(true);
		const worldBox = pc.pcoGeometry.boundingBox.clone().applyMatrix4(pc.matrixWorld);
		const pcXYBox = new Box2(
			{ x: worldBox.min.x, y: worldBox.min.y },
			{ x: worldBox.max.x, y: worldBox.max.y }
		);
		return pcXYBox.intersectsBox(profileXYBox);
	});

	const targetPointclouds = activePointclouds.length > 0 ? activePointclouds : pointclouds.filter(pc => pc && pc.pcoGeometry);

	return new Promise((resolve) => {
		const fakeOctrees = new Map();
		if (targetPointclouds.length === 0) {
			resolve({ fakeOctrees, highestLevelServed: 0, requests: [] });
			return;
		}

		let pending = targetPointclouds.length;
		let highestLevelServed = 0;
		const requests = [];
		let finished = false;
		let pumpTimer = null;

		const cleanupAndResolve = () => {
			if (finished) return;
			finished = true;
			if (pumpTimer !== null) {
				clearInterval(pumpTimer);
				pumpTimer = null;
			}
			for (const req of requests) {
				highestLevelServed = Math.max(highestLevelServed, req.highestLevelServed || 0);
				const idx = req.pointcloud.profileRequests.indexOf(req);
				if (idx >= 0) {
					req.pointcloud.profileRequests.splice(idx, 1);
				}
			}
			resolve({ fakeOctrees, highestLevelServed, requests });
		};

		const timeoutId = setTimeout(() => {
			cleanupAndResolve();
		}, timeoutMs);

		for (const pointcloud of targetPointclouds) {
			const fakeOctree = new ProfileFakeOctree(pointcloud);
			fakeOctrees.set(pointcloud, fakeOctree);

			const req = new ProfileRequest(pointcloud, profile, maxDepth, {
				onProgress: (event) => {
					for (const segment of event.points.segments) {
						if (segment.points && segment.points.numPoints > 0) {
							fakeOctree.addPoints(segment.points);
						}
					}
					highestLevelServed = Math.max(highestLevelServed, req.highestLevelServed || 0);
					if (typeof onProgress === 'function') {
						onProgress({
							pointcloud,
							fakeOctree,
							pointsServed: req.pointsServed,
							highestLevelServed,
						});
					}
				},
				onFinish: () => {
					highestLevelServed = Math.max(highestLevelServed, req.highestLevelServed || 0);
					pending--;
					if (pending <= 0) {
						clearTimeout(timeoutId);
						cleanupAndResolve();
					}
				},
			});

			pointcloud.profileRequests.push(req);
			requests.push(req);
		}

		// Pump requests so octree loading & traversal progress rapidly even if the viewer loop is idle
		pumpTimer = setInterval(() => {
			if (finished) return;
			for (const req of requests) {
				if (req.priorityQueue.size() > 0) {
					req.update();
				}
			}
		}, 16);
	});
}

/**
 * Evaluates Z statistics (min/lowest, max/highest, avg/mean, median, IDW, closest) around (x, y)
 * from populated ProfileFakeOctrees.
 */
function computeZStatsFromFakeOctrees(fakeOctrees, x, y, maxRadius = Infinity, mode = 'min') {
	let lowestPoint = null;
	let highestPoint = null;
	let closestPoint = null;
	let minDistanceXY = Infinity;
	let zMin = Infinity;
	let zMax = -Infinity;
	let zSum = 0;
	let idwNumerator = 0;
	let idwDenominator = 0;
	let numPoints = 0;
	const zValues = [];

	const extractPointRecord = (pointsBatch, n, i, wx, wy, wz, distXY, mileageArr, pointcloud) => {
		const attributes = {};
		for (const attrName of Object.keys(pointsBatch.data)) {
			if (attrName === 'position' || attrName === 'mileage') continue;
			const arr = pointsBatch.data[attrName];
			const itemSize = arr.length / n;
			const slice = arr.subarray(itemSize * i, itemSize * i + itemSize);
			attributes[attrName] = slice.length === 1 ? slice[0] : Array.from(slice);
		}
		return {
			x: wx,
			y: wy,
			z: wz,
			distanceXY: distXY,
			mileage: mileageArr ? mileageArr[i] : 0,
			pointcloud,
			attributes,
		};
	};

	for (const [pointcloud, fakeOctree] of fakeOctrees.entries()) {
		const pcOffset = pointcloud.position;

		for (const pointsBatch of fakeOctree.points) {
			const n = pointsBatch.numPoints;
			const posArr = pointsBatch.data.position;
			const mileageArr = pointsBatch.data.mileage;
			if (!posArr) continue;

			for (let i = 0; i < n; i++) {
				const wx = posArr[3 * i + 0] + pcOffset.x;
				const wy = posArr[3 * i + 1] + pcOffset.y;
				const wz = posArr[3 * i + 2] + pcOffset.z;

				const dx = wx - x;
				const dy = wy - y;
				const distXY = Math.hypot(dx, dy);

				if (distXY > maxRadius) {
					continue;
				}

				numPoints++;
				zSum += wz;
				zValues.push(wz);

				if (wz < zMin) {
					zMin = wz;
					lowestPoint = extractPointRecord(pointsBatch, n, i, wx, wy, wz, distXY, mileageArr, pointcloud);
				}
				if (wz > zMax) {
					zMax = wz;
					highestPoint = extractPointRecord(pointsBatch, n, i, wx, wy, wz, distXY, mileageArr, pointcloud);
				}

				const weight = 1 / Math.max(distXY * distXY, 1e-8);
				idwNumerator += wz * weight;
				idwDenominator += weight;

				if (distXY < minDistanceXY) {
					minDistanceXY = distXY;
					closestPoint = extractPointRecord(pointsBatch, n, i, wx, wy, wz, distXY, mileageArr, pointcloud);
				}
			}
		}
	}

	if (numPoints === 0) {
		return {
			x,
			y,
			mode,
			z: null,
			zMin: null,
			zLowest: null,
			zMax: null,
			zHighest: null,
			zAvg: null,
			zMean: null,
			zMedian: null,
			zIdw: null,
			zClosest: null,
			lowestPoint: null,
			highestPoint: null,
			closestPoint: null,
			values: {
				min: null,
				max: null,
				avg: null,
				mean: null,
				median: null,
				idw: null,
				closest: null,
			},
			numPoints: 0,
		};
	}

	zValues.sort((a, b) => a - b);
	const mid = Math.floor(zValues.length / 2);
	const zMedian = (zValues.length % 2 === 1)
		? zValues[mid]
		: (zValues[mid - 1] + zValues[mid]) * 0.5;

	const zClosest = closestPoint ? closestPoint.z : null;
	const zIdw = idwDenominator > 0 ? idwNumerator / idwDenominator : zClosest;
	const zMean = zSum / numPoints;

	const normalizedMode = String(mode || 'all').toLowerCase();
	let selectedZ = zMin;
	if (normalizedMode === 'max' || normalizedMode === 'highest') {
		selectedZ = zMax;
	} else if (normalizedMode === 'avg' || normalizedMode === 'mean') {
		selectedZ = zMean;
	} else if (normalizedMode === 'median') {
		selectedZ = zMedian;
	} else if (normalizedMode === 'idw') {
		selectedZ = zIdw;
	} else if (normalizedMode === 'closest') {
		selectedZ = zClosest;
	}

	return {
		x,
		y,
		mode: normalizedMode,
		z: selectedZ,
		zMin,
		zLowest: zMin,
		zMax,
		zHighest: zMax,
		zAvg: zMean,
		zMean,
		zMedian,
		zIdw,
		zClosest,
		lowestPoint,
		highestPoint,
		closestPoint,
		values: {
			min: zMin,
			max: zMax,
			avg: zMean,
			mean: zMean,
			median: zMedian,
			idw: zIdw,
			closest: zClosest,
		},
		numPoints,
	};
}

/**
 * Extracts the Z coordinate (and vertical column statistics) at a given (x, y) position
 * by creating a Profile column at (x, y), force-loading all intersecting octree nodes
 * down to maxDepth via ProfileRequest, and accumulating the points into a ProfileFakeOctree.
 *
 * @param {object|Array} viewerOrPointclouds - Viewer, PScene, PointCloudOctree, or PointCloudOctree[]
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @param {object} [options]
 * @param {number} [options.width=1.0] - Search column width (meters) around (x, y)
 * @param {number} [options.radius] - Optional horizontal search radius (sets width = 2 * radius)
 * @param {number} [options.maxDepth=Number.MAX_VALUE] - Maximum octree depth to load (defaults to all levels)
 * @param {boolean} [options.autoExpand=true] - Automatically expand search width if 0 points found in initial column
 * @param {boolean} [options.showInProfileWindow=false] - Whether to also display the query profile in viewer.profileWindow
 * @param {Function} [options.onProgress] - Progress callback ({ pointcloud, fakeOctree, pointsServed, highestLevelServed })
 * @returns {Promise<object>} Result with { x, y, z, zClosest, zIdw, zMean, zMin, zMax, closestPoint, numPoints, highestLevelServed, width, profile, fakeOctrees }
 */
export async function extractZAtXY(viewerOrPointclouds, x, y, options = {}) {
	const { viewer, pointclouds } = resolvePointClouds(viewerOrPointclouds);
	if (pointclouds.length === 0) {
		throw new Error('extractZAtXY: No point clouds available.');
	}

	const numX = Number(x);
	const numY = Number(y);
	if (!Number.isFinite(numX) || !Number.isFinite(numY)) {
		throw new Error(`extractZAtXY: Invalid (x, y) coordinates: (${x}, ${y})`);
	}

	const initialWidth = options.radius !== undefined
		? Math.max(0.05, Number(options.radius) * 2)
		: Math.max(0.05, Number(options.width) || 1.0);

	let currentWidth = initialWidth;
	let profile = options.profile || createXYColumnProfile(numX, numY, currentWidth);

	let { fakeOctrees, highestLevelServed } = await loadProfileIntoFakeOctrees(
		pointclouds,
		profile,
		options
	);

	const mode = options.mode || 'min';
	let stats = computeZStatsFromFakeOctrees(fakeOctrees, numX, numY, Infinity, mode);

	// If no points fell inside the initial narrow column and autoExpand is enabled, retry with wider column
	if (stats.numPoints === 0 && options.autoExpand !== false && !options.profile) {
		const baseSpacing = pointclouds.reduce((maxS, pc) => {
			const s = (pc.pcoGeometry && pc.pcoGeometry.spacing) ? pc.pcoGeometry.spacing : 1.0;
			return Math.max(maxS, s);
		}, 1.0);
		currentWidth = Math.max(initialWidth * 4, baseSpacing * 2);
		profile = createXYColumnProfile(numX, numY, currentWidth);

		const retryResult = await loadProfileIntoFakeOctrees(pointclouds, profile, options);
		fakeOctrees = retryResult.fakeOctrees;
		highestLevelServed = Math.max(highestLevelServed, retryResult.highestLevelServed);
		stats = computeZStatsFromFakeOctrees(fakeOctrees, numX, numY, Infinity, mode);
	}

	if (options.showInProfileWindow && viewer) {
		if (viewer.scene && !viewer.scene.profiles.includes(profile)) {
			viewer.scene.addProfile(profile);
		}
		if (!viewer._profileWindow || !viewer._profileWindowController) {
			await viewer.loadProfileGUI();
		}
		if (viewer.profileWindow && viewer.profileWindowController) {
			viewer.profileWindow.show();
			viewer.profileWindowController.setProfile(profile);
		}
	}

	return {
		...stats,
		width: currentWidth,
		highestLevelServed,
		profile,
		fakeOctrees,
	};
}

/**
 * Extracts Z positions for a list of (x, y) coordinates by building a multi-segment Profile
 * across the waypoints, force-loading all intersecting octree nodes into ProfileFakeOctree(s),
 * and evaluating Z at each (x, y) coordinate.
 *
 * @param {object|Array} viewerOrPointclouds
 * @param {Array<[number, number]|{x: number, y: number}>} xyPoints
 * @param {object} [options]
 * @returns {Promise<Array<object>>}
 */
export async function extractZBatchAtXY(viewerOrPointclouds, xyPoints, options = {}) {
	if (!Array.isArray(xyPoints) || xyPoints.length === 0) {
		return [];
	}
	const results = [];
	for (const pt of xyPoints) {
		const px = Array.isArray(pt) ? pt[0] : pt.x;
		const py = Array.isArray(pt) ? pt[1] : pt.y;
		const res = await extractZAtXY(viewerOrPointclouds, px, py, options);
		results.push(res);
	}
	return results;
}
