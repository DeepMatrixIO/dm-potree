/** Interactive tool for reassigning classification values to PointCloud segments by */
import {EventDispatcher} from "../../EventDispatcher";
import {PointCluster} from "./PointCluster";

export class ClusterTool extends EventDispatcher {
	constructor(viewer) {
		console.log('ClusterTool:constructor');
		super();
		this.active = false;
		this.viewer = viewer;
		this.currentPointCluster = undefined;

		//shall I add code to the scene???
		//this.viewer.scene.pointClusters = [];

		this.viewer.inputHandler.registerExtraTool(this);//extra tools registered in InputHandler




	}
	activate() {
		console.log('ClusterTool:activate');
		this.active = true;
		this.startNewPointCluster();
		this.viewer.addTool(this);
	}
	deactivate() {
		console.log('ClusterTool:deactivate');
		this.active = false;
		if (this.currentPointCluster && !this.currentPointCluster.finished) {
			this.viewer.scene.removePointCluster(this.currentPointCluster);
		}
		this.setCurrentPointCluster(undefined);
		this.viewer.scene.pointClusters.forEach((pointCluster) =>
			pointCluster.setActive(false)
		);
	}
	setCurrentPointCluster(pointCluster) {
		console.log('ClusterTool:setCurrentPointCluster');
		var _a, _b, _c;
		(_a = this.currentPointCluster) === null || _a === void 0
			? void 0
			: _a.setActive(false);
		(_b = this.currentPointCluster) === null || _b === void 0
			? void 0
			: _b.removeTempSegments();
		this.currentPointCluster = pointCluster;
		(_c = this.currentPointCluster) === null || _c === void 0
			? void 0
			: _c.setActive(true);
	}
	onMouseMove(mouse) {
		//console.log('ClusterTool:onMouseMove');//caution: this is called very often
		var _a, _b, _c, _d, _e, _f, _g, _h, _j;
		const I = Potree.Utils.getMousePointCloudIntersection(
			mouse,
			this.viewer.scene.getActiveCamera(),
			this.viewer,
			this.viewer.scene.pointclouds,
			{
				// Special case, when the current point cluster is invisible we want to find other invisible segments.
				pickClipped:
					!((_a = this.currentPointCluster) === null || _a === void 0
						? void 0
						: _a.visible) ||
					((_b = this.currentPointCluster) === null || _b === void 0
						? void 0
						: _b.clipTask) === Potree.ClipTask.SHOW_OUTSIDE,
			}
		);

		//const id = I === null || I === void 0 ? void 0 : I.pointcloud.dataId;//hardcoded but can be made more flebible
		const id = I === null || I === void 0 ? void 0 :
			(I.pointcloud.dataId || I.pointcloud.identifier || I.pointcloud.id || 0);


		//hardcoded at the beggining attributeKey
		//retrieve segment identifier from attributes
		const segment =
			I === null || I === void 0 ? void 0 : I.point[Potree.segmentsAttributeKey]?.[0];
		//
		let currentPointCluster = this.currentPointCluster;

		if (id && segment !== undefined /*segment CAN be zero!*/) {



			//if segment is not contained in the current pointCluster
			if (!currentPointCluster.containsSegment(id, segment)) {
				//1 remove temp segments from currentPointCluster

				currentPointCluster.removeTempSegments(); //remove temp segments from currentPointCluster
				//2 check if segment is clustered, i.e. if it is part of another cluster and returns it
				const cluster = this.segmentIsClustered(id, segment);//if the segment is on another PointCluster
				//3 if the segment is in a cluster, use that cluster
				// if that cluster has elements, but this segment, 

				if (cluster) {//if segment is on another cluster
					// Don't allow users to activate clusters while they're in the process of creating/editing another cluster.

					//if the current point cluster is empty, add that PointCluster as tempPointCluster in current point cluster
					if (!currentPointCluster.segments.length) {
						currentPointCluster.addTempCluster(cluster);//if the segment is not in the cluster
					}
				}
				else {//if the segment is nowhere on any PointCluster, 
					// them add that segment as tmpSegment in current pointCluster

					currentPointCluster.addTempSegment(id, segment);//add it as tempSegment
				}
			}
			else {//if segment is contained in the current point cluster,
				currentPointCluster.removeTempSegments();
			}
		} else {
			currentPointCluster.removeTempSegments();
		}
	}
	segmentIsClustered(pointcloudId, segmentId) {
		console.log('ClusterTool:segmentIsClustered');
		return this.viewer.scene.pointClusters.find((cluster) =>
			cluster.containsSegment(pointcloudId, segmentId)
		);
	}
	onClick(mouse, button) {
		var _a, _b, _c;
		if (!this.currentPointCluster) return;
		const I = Potree.Utils.getMousePointCloudIntersection(
			mouse,
			this.viewer.scene.getActiveCamera(),
			this.viewer,
			this.viewer.scene.pointclouds,
			{
				// Special case, when the current point cluster is invisible we want to find other invisible segments.
				pickClipped:
					!((_a = this.currentPointCluster) === null || _a === void 0
						? void 0
						: _a.visible) ||
					((_b = this.currentPointCluster) === null || _b === void 0
						? void 0
						: _b.clipTask) === Potree.ClipTask.SHOW_OUTSIDE,
			}
		);

		//TODO, allow other identifiers
		const id = I === null || I === void 0 ? void 0 : (I.pointcloud.dataId || I.pointcloud.identifier || I.pointcloud.id || 0);
		//debugger;
		const segment =
			I === null || I === void 0 ? void 0 : I.point[Potree.segmentsAttributeKey][0];

		if (!id || segment === undefined) {
			// do nothing?
			return;
		}
		if (this.currentPointCluster.containsSegment(id, segment)) {
			//if (button === MOUSE$1.RIGHT) {
			if (button === Potree.MOUSE.RIGHT) {
				if (
					this.currentPointCluster.finished &&
					this.currentPointCluster.segments.length === 1
				) {
					// When last segment is removed from finished cluster, delete the cluster.
					this.viewer.scene.dispatchEvent({
						type: 'measurement_delete',
						value: {measure: this.currentPointCluster},
					});
					this.startNewPointCluster();
				} else {
					this.currentPointCluster.removeSegment(id, segment);
					if (this.currentPointCluster.finished) this.editPointCluster();
				}
			} else {
				// do nothing?
			}
		} else {
			if (button + 1 !== Potree.MOUSE.LEFT) {//TODO  fix this 
				return;
			}
			const cluster = this.segmentIsClustered(id, segment);
			if (cluster) {
				// Don't allow users to activate clusters while they're in the process of creating/editing another cluster.
				if (
					!((_c = this.currentPointCluster) === null || _c === void 0
						? void 0
						: _c.segments.length)
				)
					this.setCurrentPointCluster(cluster);
			} else {
				this.currentPointCluster.addSegment(id, segment);
				if (this.currentPointCluster.finished) this.editPointCluster();
			}
		}
	}
	onDoubleClick() {
		console.log('ClusterTool:onDoubleClick');
		this.finishPointCluster();
	}
	editPointCluster() {
		console.log('ClusterTool:editPointCluster');
		var _a;
		if (
			(_a = this.currentPointCluster) === null || _a === void 0
				? void 0
				: _a.finished
		) {
			this.viewer.scene.dispatchEvent({
				type: 'pointorama_pointCluster_edit',
				value: {pointCluster: this.currentPointCluster},
			});
		}
	}
	startNewPointCluster() {
		console.log('ClusterTool:startNewPointCluster');
		const newCluster = new PointCluster({});
		this.setCurrentPointCluster(newCluster);
		this.viewer.scene.addPointCluster(newCluster);//TODO add code to scene
	}
	finishPointCluster() {
		console.log('ClusterTool:finishPointCluster');
		if (!this.currentPointCluster) return;
		if (!this.currentPointCluster.segments.length) return;
		if (!this.currentPointCluster.finished) {
			this.currentPointCluster.finish();
			this.viewer.scene.dispatchEvent({
				type: 'pointorama_pointCluster_added',
				value: {pointCluster: this.currentPointCluster},
			});
		}
		this.startNewPointCluster();
	}
}