The Miration of potree from older code to newer module has gone trhrough several changes;

Include code to build module instead of older Es code.
Test server to start the code.
Removal of Global Potree Exports to Potree class with only the required exports, however all other classes are exposed.
Jquery removal
Jquery related libraries removal like jstree with replacement to code tools, which have a GUI entry point.
Spectrum removal as well.
Removal of GUI elements in favour of modularization, like sidebar and others based on jstree.

TWEEN has been migrated as well by using a TWEENGROUP defined in viewer and managed accordingly.
Proj4 is also handled as module rather than a global property unless required.

Lets not forget how  every pointcloud computes its ECEF coordinate on every frame for compatibility and sync to other 3d frameworks.

What is missing is:


Scripting language, so features can be tested and results expected on every operation.

MIssing things include:

Clipping changed code to accept newer shader strategies, such tools changed into filtering strategies which stack and add up  until an explicit stop appears.

Styling strategies also changed as result of a filtering and changes in shader code, in particular with gradient styling.

What is missing too is the context menu on right button, which should be added on demand.

The Save and load project also needs to change to accept newer declarative items


///////////////////////////
For testing, it is required to define a set of conditions for the different elements and their interactions.

From the Main class, Potree does nothing but expose the loading pointcloud function and global variables.

The more complex class, viewer is actually the main app in charge of everything.

Classical checkups involve different aspects:

-Navigation
-Loading mechanisms for pointclouds and others
-Activation and deactivation of elements
-























