// Bundles the GLSL shader sources using Vite's native `?raw` import so they
// are inlined as strings at build time (and hot-reloaded during `vite dev`)
// without any separate pre-build step. Exposed as a `Shaders["filename"]`
// map to match the historical lookup pattern used across the materials.

import pointcloudVs from "./pointcloud.vs?raw";
import pointcloudFs from "./pointcloud.fs?raw";
import pointcloudSmVs from "./pointcloud_sm.vs?raw";
import pointcloudSmFs from "./pointcloud_sm.fs?raw";
import normalizeVs from "./normalize.vs?raw";
import normalizeFs from "./normalize.fs?raw";
import normalizeAndEdlFs from "./normalize_and_edl.fs?raw";
import edlVs from "./edl.vs?raw";
import edlFs from "./edl.fs?raw";
import blurVs from "./blur.vs?raw";
import blurFs from "./blur.fs?raw";

export const Shaders = {
	"pointcloud.vs": pointcloudVs,
	"pointcloud.fs": pointcloudFs,
	"pointcloud_sm.vs": pointcloudSmVs,
	"pointcloud_sm.fs": pointcloudSmFs,
	"normalize.vs": normalizeVs,
	"normalize.fs": normalizeFs,
	"normalize_and_edl.fs": normalizeAndEdlFs,
	"edl.vs": edlVs,
	"edl.fs": edlFs,
	"blur.vs": blurVs,
	"blur.fs": blurFs,
};
