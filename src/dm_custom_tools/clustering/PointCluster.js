import {ClipTask} from '../../defines';

export function v4() {
	return crypto.randomUUID();
}

export class PointCluster {
	constructor(args) {
		this.tempSegmentsAreClustered = false;
		this.visible = true;
		this.selected = false;
		this.active = false;
		this.lastTempCluster = undefined;
		this.identifier = args.identifier || v4();//v4 ?
		this.segments = args.segments || [];
		this.tempSegments = [];
		if (args.visible !== undefined) this.visible = args.visible;
		this.finished = false;
		this.clipTask = args.clipTask || ClipTask.NONE;
		this.classification = args.classification || -1;
		this.selected = args.selected || false;
		this.active = args.active || false;
	}
	containsSegment(pointcloudId, segmentId) {
		return this.segments.some(
			(segment) =>
				segment.pointcloudId === pointcloudId &&
				segment.segmentId === segmentId
		);
	}
	addSegment(pointcloudId, segmentId) {
		this.segments.push({pointcloudId, segmentId});
	}
	removeSegment(pointcloudId, segmentId) {
		this.segments = this.segments.filter(
			(segment) =>
				segment.pointcloudId !== pointcloudId ||
				segment.segmentId !== segmentId
		);
	}
	addTempCluster(cluster) {
		this.lastTempCluster = cluster;
		this.lastTempCluster.active = this.active;
		this.tempSegments = cluster.segments;
		this.tempSegmentsAreClustered = true;
	}
	addTempSegment(pointcloudId, segmentId) {
		this.tempSegments = [{pointcloudId, segmentId}];
		this.tempSegmentsAreClustered = false;

	}
	removeTempSegments() {
		if (this.lastTempCluster) this.lastTempCluster.active = false;
		this.tempSegments = [];
		this.tempSegmentsAreClustered = false;
	}
	filterSegmentsByPointCloud(pointCloudId) {
		let filteredSegments = this.segments.filter(
			(segment) => segment.pointcloudId === pointCloudId
		);
		const filteredTempSegments = this.tempSegments.filter(
			(segment) => segment.pointcloudId === pointCloudId
		);
		if (this.tempSegmentsAreClustered) {
			filteredSegments = filteredTempSegments;
		} else {
			filteredSegments = [...filteredSegments, ...filteredTempSegments];
		}
		if (!filteredSegments.length) {
			// Needed in case a segment in a different pointcloud has a grayscale or isolate cliptask
			filteredSegments = [{pointcloudId: '-1', segmentId: -1}];
		}
		return new PointCluster({
			segments: filteredSegments,
			clipTask: this.clipTask,
			classification: this.classification,
			selected: this.selected,
			active: this.active,
			visible: this.visible,
		});
	}
	getSegmentIdentifiers() {
		return this.segments.map((segment) => segment.segmentId);
	}
	getSegmentInfo() {
		return this.segments.map((_) => ({
			clipTask: this.clipTask,
			classification: this.classification,
			selected: this.selected,
			active: this.active,
			visible: this.visible,
		}));
	}
	select() {
		this.selected = true;
	}
	unselect() {
		this.selected = false;
	}
	setActive(active) {
		this.active = active;
	}
	setClipTask(clipTask) {
		this.clipTask = clipTask;
	}
	finish() {
		this.finished = true;
	}
}