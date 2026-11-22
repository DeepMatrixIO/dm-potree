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

		const stepRequests = () => {
			if (finished) return;
			const budgetStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			for (const req of requests) {
				while (
					!finished &&
					(req.priorityQueue.size() > 0 || req.updateGeneratorInstance) &&
					(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - budgetStart < 10)
				) {
					const prevServed = req.pointsServed;
					const prevGen = req.updateGeneratorInstance;
					req.update();
					// If generator finished this step and remaining nodes in priorityQueue are still loading asynchronously, wait for next tick
					if (!req.updateGeneratorInstance && prevGen === null && req.pointsServed === prevServed && req.priorityQueue.size() > 0) {
						break;
					}
				}
			}
		};

		// Pump requests immediately and every 16ms so octree loading & traversal progress rapidly
		stepRequests();
		if (!finished) {
			pumpTimer = setInterval(stepRequests, 16);
		}
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
 * Normalizes a collection of XY points into an array of { index, x, y, raw }.
 * Accepts:
 *  - Array of [x, y] or [x, y, z] arrays
 *  - Array of { x, y } / THREE.Vector2 / THREE.Vector3 / { position: { x, y } }
 *  - A Potree Measure instance ({ points: [{ position: Vector3 }, ...] })
 * @param {Array|object} xyPoints
 * @returns {Array<{ index: number, x: number, y: number, raw: any }>}
 */
export function normalizeXYPointsCollection(xyPoints) {
	let sourceList = xyPoints;
	if (xyPoints && !Array.isArray(xyPoints) && Array.isArray(xyPoints.points)) {
		sourceList = xyPoints.points;
	}
	if (!Array.isArray(sourceList)) {
		return [];
	}

	const normalized = [];
	for (let i = 0; i < sourceList.length; i++) {
		const item = sourceList[i];
		if (item == null) continue;

		let px;
		let py;
		if (Array.isArray(item)) {
			px = Number(item[0]);
			py = Number(item[1]);
		} else if (item.position && typeof item.position === 'object') {
			px = Number(item.position.x);
			py = Number(item.position.y);
		} else if (typeof item === 'object') {
			px = Number(item.x);
			py = Number(item.y);
		}

		if (!Number.isFinite(px) || !Number.isFinite(py)) {
			throw new Error(`Invalid XY coordinate at index ${i}: (${px}, ${py})`);
		}

		normalized.push({
			index: i,
			x: px,
			y: py,
			raw: item,
		});
	}

	return normalized;
}

/**
 * Creates a multi-column Profile for a collection of discrete (x, y) query points.
 * Instead of connecting point k to point k+1 with bridging segments, this populates
 * `profile.customSegments` with one disjoint (width x width) vertical column segment
 * per query point so ProfileRequest traverses the octree ONCE per pointcloud and reuses
 * every shared octree node across all nearby (x, y) query points.
 *
 * @param {Array<[number, number]|{x: number, y: number}>} xyPoints
 * @param {number} [width=1.0]
 * @returns {Profile}
 */
export function createMultiXYColumnProfile(xyPoints, width = 1.0) {
	const normalized = normalizeXYPointsCollection(xyPoints);
	const safeWidth = Math.max(0.05, Number(width) || 1.0);
	const half = safeWidth / 2;

	const profile = new Profile();
	profile.name = `Multi_XY_Z_Query_(${normalized.length}_pts)`;
	profile.setWidth(safeWidth);

	const customSegments = [];
	const customXYBox = new Box2();

	for (let k = 0; k < normalized.length; k++) {
		const pt = normalized[k];
		const start = new Vector3(pt.x - half, pt.y, 0);
		const end = new Vector3(pt.x + half, pt.y, 0);

		customSegments.push({
			queryIndex: k,
			x: pt.x,
			y: pt.y,
			width: safeWidth,
			start,
			end,
		});

		customXYBox.expandByPoint({ x: pt.x - half, y: pt.y - half });
		customXYBox.expandByPoint({ x: pt.x + half, y: pt.y + half });
	}

	profile.customSegments = customSegments;
	profile.customXYBox = customXYBox;

	// Populate profile.points with bounding/endpoint markers for compatibility
	if (customSegments.length === 1) {
		profile.addMarker(customSegments[0].start.clone());
		profile.addMarker(customSegments[0].end.clone());
	} else if (customSegments.length > 1) {
		profile.addMarker(new Vector3(customXYBox.min.x, customXYBox.min.y, 0));
		profile.addMarker(new Vector3(customXYBox.max.x, customXYBox.max.y, 0));
	}

	return profile;
}

/**
 * Runs a single shared ProfileRequest per pointcloud for a collection of disjoint XY column segments,
 * routing each segment's extracted points into both a per-query-point ProfileFakeOctree and a
 * shared ProfileFakeOctree while visiting and loading each intersecting octree node at most ONCE.
 */
function loadMultiXYProfileIntoFakeOctrees(pointclouds, profile, numQueries, options = {}) {
	const {
		maxDepth = Number.MAX_VALUE,
		timeoutMs = 45000,
		onProgress = null,
	} = options;

	const profileXYBox = profile.customXYBox ? profile.customXYBox.clone() : new Box2();
	if (!profile.customXYBox) {
		for (const pt of profile.points) {
			profileXYBox.expandByPoint({ x: pt.x, y: pt.y });
		}
		profileXYBox.expandByScalar(profile.width);
	}

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

	const targetPointclouds = activePointclouds.length > 0
		? activePointclouds
		: pointclouds.filter(pc => pc && pc.pcoGeometry);

	return new Promise((resolve) => {
		const sharedFakeOctrees = new Map();
		const perPointFakeOctrees = Array.from({ length: numQueries }, () => new Map());

		if (targetPointclouds.length === 0 || numQueries === 0) {
			resolve({
				sharedFakeOctrees,
				perPointFakeOctrees,
				highestLevelServed: 0,
				uniqueNodesQueued: 0,
				requests: [],
			});
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
			let uniqueNodesQueued = 0;
			for (const req of requests) {
				highestLevelServed = Math.max(highestLevelServed, req.highestLevelServed || 0);
				uniqueNodesQueued += req.queuedNodes ? req.queuedNodes.size : 0;
				const idx = req.pointcloud.profileRequests.indexOf(req);
				if (idx >= 0) {
					req.pointcloud.profileRequests.splice(idx, 1);
				}
			}
			resolve({
				sharedFakeOctrees,
				perPointFakeOctrees,
				highestLevelServed,
				uniqueNodesQueued,
				requests,
			});
		};

		const timeoutId = setTimeout(() => {
			cleanupAndResolve();
		}, timeoutMs);

		for (const pointcloud of targetPointclouds) {
			const sharedFakeOctree = new ProfileFakeOctree(pointcloud);
			sharedFakeOctrees.set(pointcloud, sharedFakeOctree);

			for (let k = 0; k < numQueries; k++) {
				// Lightweight per-point accumulator compatible with ProfileFakeOctree.points
				// (avoids allocating N separate 100k-point WebGL BufferGeometries & PointCloudMaterials)
				perPointFakeOctrees[k].set(pointcloud, {
					trueOctree: pointcloud,
					pcoGeometry: pointcloud.pcoGeometry,
					points: [],
					addPoints(data) {
						if (data && data.numPoints > 0) {
							this.points.push(data);
						}
					},
				});
			}

			const req = new ProfileRequest(pointcloud, profile, maxDepth, {
				onProgress: (event) => {
					const segments = event.points.segments;
					for (let sIdx = 0; sIdx < segments.length; sIdx++) {
						const segment = segments[sIdx];
						if (segment.points && segment.points.numPoints > 0) {
							sharedFakeOctree.addPoints(segment.points);
							const qIdx = segment.queryIndex !== undefined ? segment.queryIndex : sIdx;
							const ptMap = perPointFakeOctrees[qIdx];
							if (ptMap) {
								const ptFakeOctree = ptMap.get(pointcloud);
								if (ptFakeOctree) {
									ptFakeOctree.addPoints(segment.points);
								}
							}
						}
					}
					highestLevelServed = Math.max(highestLevelServed, req.highestLevelServed || 0);
					if (typeof onProgress === 'function') {
						onProgress({
							pointcloud,
							sharedFakeOctree,
							pointsServed: req.pointsServed,
							highestLevelServed,
							uniqueNodesQueued: req.queuedNodes ? req.queuedNodes.size : 0,
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

		const stepRequests = () => {
			if (finished) return;
			const budgetStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			for (const req of requests) {
				while (
					!finished &&
					(req.priorityQueue.size() > 0 || req.updateGeneratorInstance) &&
					(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - budgetStart < 10)
				) {
					const prevServed = req.pointsServed;
					const prevGen = req.updateGeneratorInstance;
					req.update();
					if (!req.updateGeneratorInstance && prevGen === null && req.pointsServed === prevServed && req.priorityQueue.size() > 0) {
						break;
					}
				}
			}
		};

		// Pump requests immediately and on a 16ms interval so shared octree traversal finishes quickly
		stepRequests();
		if (!finished) {
			pumpTimer = setInterval(stepRequests, 16);
		}
	});
}

/**
 * Computes the top-to-bottom min/max scan and upward Z-elevation histogram (in `binSize` steps)
 * from an already-evaluated baseResult (with populated `fakeOctrees`).
 */
function buildZHistogramFromBaseResult(baseResult, numX, numY, binSize = 0.25) {
	const safeBinSize = Math.max(0.01, Number(binSize) || 0.25);
	const {
		width,
		numPoints,
		highestLevelServed,
		fakeOctrees,
		lowestPoint,
		highestPoint,
		closestPoint,
	} = baseResult;

	if (numPoints === 0 || baseResult.zMin === null || baseResult.zMax === null) {
		const emptyPayload = {
			x: Number(numX.toFixed(4)),
			y: Number(numY.toFixed(4)),
			width: Number((width || 1.0).toFixed(4)),
			binSize: Number(safeBinSize.toFixed(4)),
			numPoints: 0,
			highestLevelServed: highestLevelServed || 0,
			statistics: {
				min: null,
				max: null,
				span: 0,
				avg: null,
				mean: null,
				median: null,
				mode: null,
				stdDev: null,
				idw: null,
				closest: null,
				lowestPoint: null,
				highestPoint: null,
				closestPoint: null,
			},
			histogram: {
				binSize: Number(safeBinSize.toFixed(4)),
				numBins: 0,
				zMin: null,
				zMax: null,
				maxBinCount: 0,
				peakBin: null,
				bins: [],
			},
		};
		return {
			...emptyPayload,
			json: JSON.stringify(emptyPayload, null, 2),
		};
	}

	const zList = [];
	for (const [pointcloud, fakeOctree] of fakeOctrees.entries()) {
		const pcOffsetZ = pointcloud.position.z;
		for (const pointsBatch of fakeOctree.points) {
			const n = pointsBatch.numPoints;
			const posArr = pointsBatch.data.position;
			if (!posArr) continue;
			for (let i = 0; i < n; i++) {
				zList.push(posArr[3 * i + 2] + pcOffsetZ);
			}
		}
	}

	// Scan top-to-bottom first for min/max & variance
	zList.sort((a, b) => b - a);
	const zMax = zList[0];
	const zMin = zList[zList.length - 1];
	const zSpan = Math.max(0, zMax - zMin);
	const zMean = baseResult.zMean;

	let varianceSum = 0;
	for (let i = 0; i < zList.length; i++) {
		const diff = zList[i] - zMean;
		varianceSum += diff * diff;
	}
	const zStdDev = Math.sqrt(varianceSum / zList.length);

	// Scan upwards from zMin to zMax in safeBinSize steps
	const numBins = Math.max(1, Math.ceil(zSpan / safeBinSize) || 1);
	const counts = new Uint32Array(numBins);

	for (let i = zList.length - 1; i >= 0; i--) {
		const wz = zList[i];
		let binIdx = Math.floor((wz - zMin) / safeBinSize);
		if (binIdx < 0) binIdx = 0;
		if (binIdx >= numBins) binIdx = numBins - 1;
		counts[binIdx]++;
	}

	const bins = [];
	let cumulativeCount = 0;
	let maxBinCount = 0;
	let peakBin = null;

	for (let k = 0; k < numBins; k++) {
		const zStart = Number((zMin + k * safeBinSize).toFixed(4));
		const zEnd = Number((zMin + (k + 1) * safeBinSize).toFixed(4));
		const zCenter = Number(((zStart + zEnd) * 0.5).toFixed(4));
		const count = counts[k];
		cumulativeCount += count;
		const density = Number((count / numPoints).toFixed(6));
		const percentage = Number(((count / numPoints) * 100).toFixed(2));
		const cumulativePercentage = Number(((cumulativeCount / numPoints) * 100).toFixed(2));

		const binEntry = {
			index: k,
			zStart,
			zEnd,
			zCenter,
			count,
			density,
			percentage,
			cumulativeCount,
			cumulativePercentage,
		};
		bins.push(binEntry);

		if (count > maxBinCount) {
			maxBinCount = count;
			peakBin = binEntry;
		}
	}

	const zMode = peakBin ? peakBin.zCenter : zMean;

	const serializePt = (pt) => pt ? {
		x: Number(pt.x.toFixed(4)),
		y: Number(pt.y.toFixed(4)),
		z: Number(pt.z.toFixed(4)),
		distanceXY: Number(pt.distanceXY.toFixed(4)),
	} : null;

	const payload = {
		x: Number(numX.toFixed(4)),
		y: Number(numY.toFixed(4)),
		width: Number(width.toFixed(4)),
		binSize: Number(safeBinSize.toFixed(4)),
		numPoints,
		highestLevelServed,
		statistics: {
			min: Number(zMin.toFixed(4)),
			max: Number(zMax.toFixed(4)),
			span: Number(zSpan.toFixed(4)),
			avg: Number(zMean.toFixed(4)),
			mean: Number(zMean.toFixed(4)),
			median: Number(baseResult.zMedian.toFixed(4)),
			mode: Number(zMode.toFixed(4)),
			stdDev: Number(zStdDev.toFixed(4)),
			idw: Number(baseResult.zIdw.toFixed(4)),
			closest: Number(baseResult.zClosest.toFixed(4)),
			lowestPoint: serializePt(lowestPoint),
			highestPoint: serializePt(highestPoint),
			closestPoint: serializePt(closestPoint),
		},
		histogram: {
			binSize: Number(safeBinSize.toFixed(4)),
			numBins,
			zMin: Number(zMin.toFixed(4)),
			zMax: Number(zMax.toFixed(4)),
			maxBinCount,
			peakBin,
			bins,
		},
	};

	return {
		...payload,
		json: JSON.stringify(payload, null, 2),
	};
}

/**
 * Extracts Z positions and full vertical column statistics for a collection of (x, y) coordinates
 * in a SINGLE shared octree traversal pass per pointcloud.
 *
 * Nearby (x, y) points reuse the same loaded octree nodes without redundant octree traversal
 * or duplicate node requests.
 *
 * @param {object|Array} viewerOrPointclouds - Viewer, PScene, PointCloudOctree, or PointCloudOctree[]
 * @param {Array<[number, number]|{x: number, y: number}>|object} xyPoints - Collection of XY coordinates
 * @param {object} [options]
 * @param {number} [options.width=1.0] - Search column width (meters) around each (x, y)
 * @param {number} [options.radius] - Optional horizontal search radius (sets width = 2 * radius)
 * @param {string} [options.mode='min'] - Primary Z selector ('min'|'max'|'avg'|'median'|'idw'|'closest')
 * @param {boolean} [options.includeHistogram=false] - Also compute the upward Z histogram (default 0.25m bins) for each point
 * @param {number} [options.binSize=0.25] - Vertical histogram bin size in meters when includeHistogram=true
 * @param {number} [options.maxDepth=Number.MAX_VALUE] - Maximum octree depth to load (defaults to all levels)
 * @param {boolean} [options.autoExpand=true] - Automatically expand width for any query points that had 0 points
 * @param {Function} [options.onProgress] - Progress callback
 * @returns {Promise<Array<object>>} Array of per-point extraction results (also decorated with .summary, .sharedFakeOctrees, .highestLevelServed, .uniqueNodesQueued, .elapsedMs, .json)
 */
export async function extractZBatchAtXY(viewerOrPointclouds, xyPoints, options = {}) {
	const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
	const { pointclouds } = resolvePointClouds(viewerOrPointclouds);
	if (pointclouds.length === 0) {
		throw new Error('extractZBatchAtXY: No point clouds available.');
	}

	const normalizedPoints = normalizeXYPointsCollection(xyPoints);
	if (normalizedPoints.length === 0) {
		return [];
	}

	const initialWidth = options.radius !== undefined
		? Math.max(0.05, Number(options.radius) * 2)
		: Math.max(0.05, Number(options.width) || 1.0);
	const mode = options.mode || 'min';
	const includeHistogram = Boolean(options.includeHistogram);
	const binSize = Math.max(0.01, Number(options.binSize) || 0.25);

	// Pass 1: Single shared ProfileRequest across all XY points at initialWidth
	const multiProfile = createMultiXYColumnProfile(normalizedPoints, initialWidth);
	let {
		sharedFakeOctrees,
		perPointFakeOctrees,
		highestLevelServed,
		uniqueNodesQueued,
	} = await loadMultiXYProfileIntoFakeOctrees(
		pointclouds,
		multiProfile,
		normalizedPoints.length,
		options
	);

	const perPointWidths = new Array(normalizedPoints.length).fill(initialWidth);
	const statsList = new Array(normalizedPoints.length);
	const emptyIndices = [];

	for (let k = 0; k < normalizedPoints.length; k++) {
		const pt = normalizedPoints[k];
		const stats = computeZStatsFromFakeOctrees(perPointFakeOctrees[k], pt.x, pt.y, Infinity, mode);
		statsList[k] = stats;
		if (stats.numPoints === 0) {
			emptyIndices.push(k);
		}
	}

	// Selective Pass 2: If autoExpand is enabled and a subset of XY points found 0 points,
	// retry ONLY those empty XY points in a single shared pass with expanded width
	if (emptyIndices.length > 0 && options.autoExpand !== false) {
		const baseSpacing = pointclouds.reduce((maxS, pc) => {
			const s = (pc.pcoGeometry && pc.pcoGeometry.spacing) ? pc.pcoGeometry.spacing : 1.0;
			return Math.max(maxS, s);
		}, 1.0);
		const expandedWidth = Math.max(initialWidth * 4, baseSpacing * 2);
		const retryPoints = emptyIndices.map(k => normalizedPoints[k]);
		const retryProfile = createMultiXYColumnProfile(retryPoints, expandedWidth);

		const retryLoad = await loadMultiXYProfileIntoFakeOctrees(
			pointclouds,
			retryProfile,
			retryPoints.length,
			options
		);

		highestLevelServed = Math.max(highestLevelServed, retryLoad.highestLevelServed);
		uniqueNodesQueued += retryLoad.uniqueNodesQueued;

		for (let r = 0; r < emptyIndices.length; r++) {
			const originalIdx = emptyIndices[r];
			const pt = normalizedPoints[originalIdx];
			perPointFakeOctrees[originalIdx] = retryLoad.perPointFakeOctrees[r];
			perPointWidths[originalIdx] = expandedWidth;
			statsList[originalIdx] = computeZStatsFromFakeOctrees(
				perPointFakeOctrees[originalIdx],
				pt.x,
				pt.y,
				Infinity,
				mode
			);
		}
	}

	let totalPointsExtracted = 0;
	const results = new Array(normalizedPoints.length);

	for (let k = 0; k < normalizedPoints.length; k++) {
		const pt = normalizedPoints[k];
		const stats = statsList[k];
		const ptWidth = perPointWidths[k];
		const ptFakeOctrees = perPointFakeOctrees[k];
		totalPointsExtracted += stats.numPoints;

		const itemResult = {
			index: k,
			...stats,
			width: ptWidth,
			highestLevelServed,
			fakeOctrees: ptFakeOctrees,
			sharedFakeOctrees,
		};

		if (includeHistogram) {
			const histPayload = buildZHistogramFromBaseResult(itemResult, pt.x, pt.y, binSize);
			itemResult.statistics = histPayload.statistics;
			itemResult.histogram = histPayload.histogram;
			itemResult.json = histPayload.json;
		}

		results[k] = itemResult;
	}

	const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
	const elapsedMs = Number((t1 - t0).toFixed(2));

	const summary = {
		numQueries: normalizedPoints.length,
		numMatchedQueries: results.filter(r => r.numPoints > 0).length,
		totalPointsExtracted,
		highestLevelServed,
		uniqueNodesQueued,
		elapsedMs,
	};

	const serializableBatch = {
		summary,
		points: results.map(r => ({
			index: r.index,
			x: Number(r.x.toFixed(4)),
			y: Number(r.y.toFixed(4)),
			width: Number(r.width.toFixed(4)),
			numPoints: r.numPoints,
			z: r.z !== null ? Number(r.z.toFixed(4)) : null,
			values: r.values,
			...(r.statistics ? { statistics: r.statistics } : {}),
			...(r.histogram ? { histogram: r.histogram } : {}),
		})),
	};

	// Attach non-enumerable / convenience metadata to the returned Array so both array iteration and batch telemetry work
	Object.defineProperties(results, {
		summary: { value: summary, enumerable: false, configurable: true },
		sharedFakeOctrees: { value: sharedFakeOctrees, enumerable: false, configurable: true },
		profile: { value: multiProfile, enumerable: false, configurable: true },
		highestLevelServed: { value: highestLevelServed, enumerable: false, configurable: true },
		uniqueNodesQueued: { value: uniqueNodesQueued, enumerable: false, configurable: true },
		elapsedMs: { value: elapsedMs, enumerable: false, configurable: true },
		json: { value: JSON.stringify(serializableBatch, null, 2), enumerable: false, configurable: true },
	});

	return results;
}

/**
 * Alias for extractZBatchAtXY for callers passing a collection of XY points.
 */
export const extractZAtXYPoints = extractZBatchAtXY;

/**
 * Batch variation of extractZHistogramAtXY that accepts a collection of (x, y) coordinates,
 * loads all intersecting octree nodes in a SINGLE shared octree traversal pass per pointcloud,
 * and computes both the Z statistics (min, max, avg, median, mode, stdDev, IDW, closest) and the
 * upward Z-elevation histogram (default 0.25m bins) for every (x, y) point in the collection.
 *
 * @param {object|Array} viewerOrPointclouds
 * @param {Array<[number, number]|{x: number, y: number}>|object} xyPoints
 * @param {object} [options]
 * @returns {Promise<Array<object>>}
 */
export async function extractZHistogramBatchAtXY(viewerOrPointclouds, xyPoints, options = {}) {
	return extractZBatchAtXY(viewerOrPointclouds, xyPoints, {
		...options,
		includeHistogram: true,
	});
}

/**
 * Generates discretized (x, y) coordinates along a horizontal circle of given `radius` (default 3.0m)
 * centered at (centerX, centerY), spaced every `step` meters (default 0.5m) along the circumference.
 *
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} [radius=3.0] - Circle radius in meters
 * @param {number} [step=0.5] - Arc-length discretization step in meters along the circumference
 * @returns {{ centerX: number, centerY: number, radius: number, step: number, actualStep: number, circumference: number, numVertices: number, xyPoints: Array<{ index: number, x: number, y: number, angleRad: number, angleDeg: number, arcLength: number }> }}
 */
export function createDiscretizedCircleXY(centerX, centerY, radius = 3.0, step = 0.5) {
	const cx = Number(centerX);
	const cy = Number(centerY);
	if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
		throw new Error(`createDiscretizedCircleXY: Invalid center XY (${centerX}, ${centerY})`);
	}

	const safeRadius = Math.max(0.1, Number(radius) || 3.0);
	const safeStep = Math.max(0.05, Number(step) || 0.5);
	const circumference = 2 * Math.PI * safeRadius;
	const numVertices = Math.max(8, Math.round(circumference / safeStep));
	const actualStep = circumference / numVertices;

	const xyPoints = [];
	for (let k = 0; k < numVertices; k++) {
		const angleRad = (2 * Math.PI * k) / numVertices;
		const angleDeg = (360 * k) / numVertices;
		const x = cx + safeRadius * Math.cos(angleRad);
		const y = cy + safeRadius * Math.sin(angleRad);
		xyPoints.push({
			index: k,
			x: Number(x.toFixed(4)),
			y: Number(y.toFixed(4)),
			angleRad: Number(angleRad.toFixed(6)),
			angleDeg: Number(angleDeg.toFixed(2)),
			arcLength: Number((k * actualStep).toFixed(4)),
		});
	}

	return {
		centerX: cx,
		centerY: cy,
		radius: safeRadius,
		step: safeStep,
		actualStep: Number(actualStep.toFixed(4)),
		circumference: Number(circumference.toFixed(4)),
		numVertices,
		xyPoints,
	};
}

/**
 * Discretizes a virtual horizontal circle (default 3m radius, 0.5m arc step) around an (x, y) point
 * (or a Potree Measure point) and extracts the Z values for the entire circle outline (plus center)
 * in a SINGLE shared-octree call to `extractZBatchAtXY`.
 *
 * @param {object|Array} viewerOrPointclouds - Viewer, PScene, PointCloudOctree, or PointCloudOctree[]
 * @param {object|Array} centerPointOrMeasure - { x, y }, Vector3, [x, y], or Potree.Measure instance
 * @param {object} [options]
 * @param {number} [options.radius=3.0] - Circle radius in meters (default 3.0m)
 * @param {number} [options.step=0.5] - Discretization step along the circumference in meters (default 0.5m)
 * @param {number} [options.width=1.0] - Search column width (meters) at each discretized XY vertex
 * @param {string} [options.mode='min'] - Primary Z metric ('min'|'max'|'avg'|'median'|'idw'|'closest')
 * @param {boolean} [options.includeHistogram=false] - Whether to also compute 0.25m upward Z histograms
 * @returns {Promise<object>} Circle extraction result with { centerX, centerY, radius, step, actualStep, circumference, numVertices, centerResult, vertices, outlinePoints, summary, batchResults, json }
 */
export async function extractZCircleAtXY(viewerOrPointclouds, centerPointOrMeasure, options = {}) {
	const normalizedCenter = normalizeXYPointsCollection(
		Array.isArray(centerPointOrMeasure) && typeof centerPointOrMeasure[0] === 'number'
			? [centerPointOrMeasure]
			: (centerPointOrMeasure && Array.isArray(centerPointOrMeasure.points))
				? centerPointOrMeasure
				: [centerPointOrMeasure]
	);

	if (normalizedCenter.length === 0) {
		throw new Error('extractZCircleAtXY: Could not extract valid (x, y) center coordinate.');
	}

	// Use the last point if a multi-point Measure was passed, or the single point
	const centerPt = normalizedCenter[normalizedCenter.length - 1];
	const radius = options.radius !== undefined ? Number(options.radius) : 3.0;
	const step = options.step !== undefined ? Number(options.step) : 0.5;

	const circleSpec = createDiscretizedCircleXY(centerPt.x, centerPt.y, radius, step);

	// Query center + all circumference points in a SINGLE extractZBatchAtXY call
	const allQueryPoints = [
		{ x: circleSpec.centerX, y: circleSpec.centerY },
		...circleSpec.xyPoints,
	];

	const batchResults = await extractZBatchAtXY(viewerOrPointclouds, allQueryPoints, options);
	const centerResult = batchResults[0];
	const rawVertices = batchResults.slice(1);

	// Helper to interpolate a missing Z value from nearest valid neighbors on the closed circle
	const resolveVertexMetric = (idx, key, fallbackVal) => {
		const curr = rawVertices[idx];
		if (curr && curr.numPoints > 0 && Number.isFinite(curr[key])) {
			return curr[key];
		}
		const n = rawVertices.length;
		for (let offset = 1; offset <= Math.floor(n / 2); offset++) {
			const prev = rawVertices[(idx - offset + n) % n];
			const next = rawVertices[(idx + offset) % n];
			const prevOk = prev && prev.numPoints > 0 && Number.isFinite(prev[key]);
			const nextOk = next && next.numPoints > 0 && Number.isFinite(next[key]);
			if (prevOk && nextOk) return (prev[key] + next[key]) * 0.5;
			if (prevOk) return prev[key];
			if (nextOk) return next[key];
		}
		return Number.isFinite(fallbackVal) ? fallbackVal : 0;
	};

	const vertices = rawVertices.map((res, idx) => {
		const meta = circleSpec.xyPoints[idx];
		const zMin = resolveVertexMetric(idx, 'zMin', centerResult ? centerResult.zMin : 0);
		const zMax = resolveVertexMetric(idx, 'zMax', centerResult ? centerResult.zMax : 0);
		const zAvg = resolveVertexMetric(idx, 'zAvg', centerResult ? centerResult.zAvg : 0);
		const zMedian = resolveVertexMetric(idx, 'zMedian', centerResult ? centerResult.zMedian : 0);
		const zIdw = resolveVertexMetric(idx, 'zIdw', centerResult ? centerResult.zIdw : 0);
		const zClosest = resolveVertexMetric(idx, 'zClosest', centerResult ? centerResult.zClosest : 0);
		const z = resolveVertexMetric(idx, 'z', centerResult ? centerResult.z : zMin);

		return {
			...res,
			index: idx,
			angleRad: meta.angleRad,
			angleDeg: meta.angleDeg,
			arcLength: meta.arcLength,
			interpolated: res.numPoints === 0,
			z,
			zMin,
			zLowest: zMin,
			zMax,
			zHighest: zMax,
			zAvg,
			zMean: zAvg,
			zMedian,
			zIdw,
			zClosest,
			values: {
				min: zMin,
				max: zMax,
				avg: zAvg,
				mean: zAvg,
				median: zMedian,
				idw: zIdw,
				closest: zClosest,
			},
		};
	});

	const outlinePoints = vertices.map(v => ({
		index: v.index,
		x: Number(v.x.toFixed(4)),
		y: Number(v.y.toFixed(4)),
		z: Number(v.z.toFixed(4)),
		angleDeg: v.angleDeg,
		arcLength: v.arcLength,
		numPoints: v.numPoints,
		values: {
			min: Number(v.zMin.toFixed(4)),
			max: Number(v.zMax.toFixed(4)),
			avg: Number(v.zAvg.toFixed(4)),
			median: Number(v.zMedian.toFixed(4)),
			idw: Number(v.zIdw.toFixed(4)),
			closest: Number(v.zClosest.toFixed(4)),
		},
	}));

	const payload = {
		centerX: Number(circleSpec.centerX.toFixed(4)),
		centerY: Number(circleSpec.centerY.toFixed(4)),
		radius: circleSpec.radius,
		step: circleSpec.step,
		actualStep: circleSpec.actualStep,
		circumference: circleSpec.circumference,
		numVertices: circleSpec.numVertices,
		summary: batchResults.summary,
		center: centerResult ? {
			x: Number(centerResult.x.toFixed(4)),
			y: Number(centerResult.y.toFixed(4)),
			z: centerResult.z !== null ? Number(centerResult.z.toFixed(4)) : null,
			numPoints: centerResult.numPoints,
			values: centerResult.values,
		} : null,
		outlinePoints,
	};

	return {
		...payload,
		centerResult,
		vertices,
		batchResults,
		json: JSON.stringify(payload, null, 2),
	};
}

/**
 * Force-loads all intersecting octree nodes around (x, y) into ProfileFakeOctree(s),
 * scans all points from top to bottom to find min/max Z and summary statistics,
 * and scans upwards from zMin to zMax in `binSize` (default 0.25m) steps to build
 * a vertical Z histogram. Returns a JSON-serializable object (and `.json` string).
 *
 * @param {object|Array} viewerOrPointclouds - Viewer, PScene, PointCloudOctree, or PointCloudOctree[]
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @param {object} [options]
 * @param {number} [options.width=1.0] - Search column width (meters) around (x, y)
 * @param {number} [options.radius] - Optional horizontal search radius (sets width = 2 * radius)
 * @param {number} [options.binSize=0.25] - Vertical Z bin size in meters (defaults to 0.25m)
 * @param {number} [options.maxDepth=Number.MAX_VALUE] - Maximum octree depth to load (defaults to all levels)
 * @param {boolean} [options.autoExpand=true] - Automatically expand search width if 0 points found in initial column
 * @param {boolean} [options.showInProfileWindow=false] - Whether to also display the query profile in viewer.profileWindow
 * @param {Function} [options.onProgress] - Progress callback
 * @returns {Promise<object>} JSON-serializable object containing { x, y, width, binSize, numPoints, highestLevelServed, statistics, histogram, json }
 */
export async function extractZHistogramAtXY(viewerOrPointclouds, x, y, options = {}) {
	const binSize = Math.max(0.01, Number(options.binSize) || 0.25);
	const baseResult = await extractZAtXY(viewerOrPointclouds, x, y, options);
	return buildZHistogramFromBaseResult(baseResult, Number(x), Number(y), binSize);
}
