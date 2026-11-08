# Using `dm-potree` as a Git Module in Another Project

This guide explains how to install and consume this project directly from its GitHub repository as an ES module dependency in another project.

---

## 1. Installation from Git

Add `dm-potree` to your target project's `package.json` using the GitHub repository:

### Using npm
```bash
# Install from a specific branch (e.g. jg/feat/line_filter)
npm install github:DeepMatrixIO/dm-potree#jg/feat/line_filter

# Or using the full Git URL
npm install git+https://github.com/DeepMatrixIO/dm-potree.git#jg/feat/line_filter

# Install default branch (main/develop)
npm install github:DeepMatrixIO/dm-potree
```

### Or add directly to `dependencies` in `package.json`:
```json
{
  "dependencies": {
    "dm_potree": "github:DeepMatrixIO/dm-potree#jg/feat/line_filter"
  }
}
```

> **Note on automated build:**  
> When installed via git, npm automatically executes the package's `"prepare": "npm run build"` hook, which compiles the ES module bundle into `dist/potree_module.js` and prepares static assets.

---

## 2. Importing and Basic Usage

Import the module and its stylesheet into your application:

```javascript
import Potree, { Viewer, PScene } from 'dm_potree';
import 'dm_potree/potree.css';

// 1. Initialize Potree
window.Potree = new Potree();

// 2. Initialize the Viewer inside a DOM element
const renderArea = document.getElementById('potree_render_area');
const viewer = new Viewer(renderArea);
window.viewer = viewer;

// 3. Configure Viewer & Scene
viewer.setEDLEnabled(true);
viewer.setFOV(60);
viewer.setPointBudget(1_000_000);
viewer.setBackground('gradient');

const scene = new PScene();
viewer.setScene(scene);

// 4. Load a point cloud
Potree.loadPointCloud('https://your-server.com/pointcloud/metadata.json', 'pointcloud', (e) => {
  scene.addPointCloud(e.pointcloud);
  viewer.zoomTo(e.pointcloud);
});
```

---

## 3. Web Workers & Assets Configuration

Potree requires Web Workers (e.g., `DecoderWorker.js`, `BinaryDecoderWorker.js`) to decode point clouds asynchronously.

1. **Serve worker files**: Copy `node_modules/dm_potree/dist/workers/` to your project's static/public directory (e.g., `public/workers/`).
2. **Configure `scriptPath`**: Point Potree to your static folder root in your application code:
   ```javascript
   Potree.scriptPath = window.location.origin; // or custom static base URL
   ```
