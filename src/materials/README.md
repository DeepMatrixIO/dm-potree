# Custom Pointcloud Rendering using shader code.

Rendering pointclouds requires shader code written in GLSL.

- RBG  rendering requires to fetch per point their RGB colors within an array and a custom function/defines value/ uniforms to render the points according to requirements.
- Color-gradient requires a color scale/ map as uniform, a mapping function and a define to trigger the use of such function within a gradient

- Mixed filter rendering requries to fetch as well geometric filtering info and or logic filtering. It can be composed by geometryc filter, logic, filter,  each one chained with an AND operator and  continue until a stop action is received. Multiple independent filters can be applied  after a stop, which is equivalent to the OR operator. The evaluation order matters, so the first filters can be overriden by the lattest.

- Geometric filtering avaialble:
- - Box Filtering:  Provides a 3D box where points are tested against to find if they are inside. If inside,  marked as inside/ selected or intersected for further analysis.

- - Polygon Filtering:  Under a given ortho projection and polygo, points are tested and checked if inside. If matched, marked as inside/ selected or intersected for further analysis.



- Profile filtering:  Provides a 2D polyline (profile) representing a cross-section of the pointcloud. Points are tested against this profile to determine if they lie on or near it.
 The profile is defined by a series of 2D points in the horizontal plane (X, Y). The Z-values of the profile can be explicitly provided or calculated from the pointcloud data along the profile line.
 A "thickness" or tolerance band can be defined around the profile. Points falling within this band are considered "on the profile".
The testing is typically performed in the local coordinate system of the profile, which may involve transforming the pointcloud data.
The results can be used to highlight, select, or filter points that lie on or near the profile for further analysis, such as creating 2D cross-section plots or 3D visualizations.

- - Polyline distance rendering: From a list of line segments, points within a certain ortho distance to each segment are selected for further render. If inside, a custom coloring sceheme is applied.
Underdevelopement. Line distance functions can be ortho or simply compared against all x, y, z coords.



Filter are evaluated at viewer.update method on every mixedFilter stored in viewer.scene.mixedFilters
Filters should be initialized and visible to be applied.

For every pointcloud node, pointcloud.material.setMixedFilters(mixedFilters)  are parred down and
pointcloud.material.updateShaderSource() applied