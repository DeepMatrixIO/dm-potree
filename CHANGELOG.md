# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-10-18

### Added

#### Measure.js Line Measurement Conversion & Export (`task_ulztpu_mveq3tq5`)
- **`getCoordinates(options)`**: Extracts marker positions as coordinate tuples `[[x, y, z], ...]`. Supports `closeLoop: true` (or `this.closed`) to append the closing coordinate when forming a loop.
- **`toXYZArray(options)` / `toXYZ(options)`**: Converts line measurements into an XYZ array:
  - Flat 1D array `[x0, y0, z0, x1, y1, z1, ...]` by default (`flatten: true`), ideal for shaders, buffer geometries, and `LineVolumeTool`.
  - Nested coordinate tuples `[[x0, y0, z0], ...]` when `flatten: false`.
  - `Float32Array` when `asFloat32Array: true`.
  - Supports automatic loop closing via `closeLoop: true`.
- **`toGeoJSON(options)`**: Converts line measurements into RFC 7946 compliant GeoJSON:
  - Generates a GeoJSON `Feature` with `LineString` geometry and metadata properties (`name`, `distance`, `closed`, `pointCount`, `segmentLengths`).
  - Supports `asFeatureCollection: true` to wrap features in a `FeatureCollection`.
  - Supports `geometryOnly: true` to extract raw geometry.
  - Supports `asPolygon: true` for closed polygons.
  - Supports stringified GeoJSON output via `asString: true` or `stringify: true`.
- **`toGeoJSONAndXYZ(options)`**: Convenience method returning `{ geojson, xyz, coordinates, totalDistance, pointCount }`.
- **Static Class Methods on `Measure`**:
  - `Measure.getCoordinates(measure, options)`
  - `Measure.toGeoJSON(measure, options)`
  - `Measure.toXYZArray(measure, options)` / `Measure.toXYZ(measure, options)`
  - `Measure.toGeoJSONAndXYZ(measure, options)`
  - `Measure.convertLineMeasurement(measure, options)`
- **Standalone Exported Functions**:
  - `convertLineMeasurement(measure, options)`
  - `measureToGeoJSON(measure, options)`
  - `measureToXYZArray(measure, options)`
  - `measureToXYZ(measure, options)`
- **Module Exports (`src/potree_module.js`)**:
  - Exported `convertLineMeasurement`, `measureToGeoJSON`, `measureToXYZArray`, and `measureToXYZ` alongside `Measure`.

#### LineVolumeTool.js Integration
- **`SelectionLineTool.fromMeasure(measure, options)`**: Directly consumes a `Measure` instance or measurement object to construct oriented box volumes along its linestring path.
- **Color Palette & Filter Styling**: Added `DEFAULT_LINE_COLOR_RGB` (16 discrete RGBA color definitions derived from the Turbo colormap) and `DEFAULT_COLOR` constant for line volume rendering. Configured `addStaticFilterColor` and `addStaticStopFilter` across `testTool`, `fromGeoJSON`, and `fromArray` methods to apply volumetric filter coloring when attaching line box volumes to the scene.

#### Test Suite & Feature Dashboard (`feature_test.html` & `example/feature_test.js`)
- Added **"📏 Measure"** button in the Volume Line Tool test panel (`feature_test.html`) to automatically populate the input coordinates from any active linear distance measurement in the scene.
- Added GeoJSON format parsing in `example/feature_test.js` so `LineVolumeTool` test can execute directly from either flat/nested arrays or GeoJSON LineString / Feature / FeatureCollection objects.

#### Task Tracking (`.atom8n/My Board.kanban`)
- Marked task `task_ulztpu_mveq3tq5` (*"Add function in Measure.js to convert line measurements into geojson and inti xyz array"*) as **Done**.

#### Configuration
- **`.gitignore`**: Added `.vscode` to ignored patterns.

### Fixed
- **`Measure.js` & `Profile.js` Marker Hover Error**: Fixed `Uncaught TypeError: Cannot read properties of undefined (reading 'setHex')` occurring on mouseover when finishing measurements. Since marker spheres use `MeshBasicMaterial` (which lacks an `emissive` map), `mouseover` and `mouseleave` now safely guard `material.emissive` and gracefully fall back to lightness offset and color restoration on `material.color`.

---

## [1.8.0] - 2026-10-18

### Added
- **`LineVolume.js`**: `LineVolume` and `LineBoxVolume` classes for volumetric selection and clipping around linestrings.
- **`LineVolumeTool.js`**: `SelectionLineTool` / `LineVolumeTool` for creating chains of bounding box volumes along arbitrary polylines.
- Added `FilterConsts.js` definitions for line box volumes (`LINEBOXVOLUME`).
- Interactive feature test dashboard (`feature_test.html` and `example/feature_test.js`) with suite coverage for loading, navigation, linear distance, height calculator, picking, clipping boxes, and volume line generation.
