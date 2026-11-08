# Setting a chain of filters or MixedFilters is a complex process requiring definitions from FilterConsts and combination of Geometric Filters and Logical Filters.

Geometric Filters allow to select points within a given geometric constraint.

Logical filter allow to filter points by specific values, mostly tied to data attributes and or coordinates.


Things like distances are more complex as they require to compute a distance function using point coordinates and a reference value.


In general terms:

1. The geometric filter allows to select points in space, within a given geometric shape or restriction.
2. Logic filters check if a given attribute is equal to, less than, greater than, in range, out of range, etc a given value or values
3. Colorize is simply a function to assign a color to selected values.
4. Stop filter is a handle to finish the current chain of filters and apply the changes. It is mostly used to close a set of  filters chained by an implicit  AND and start a new chain, linked by an implicit OR operator.






To unify an expandable system, filters are identified by a filter type from 1 to 10 and above up to 255.

Currently Geometrical filters are defined below 10 but can use any number


Filter include
- BoxVolume
- PolygonVolume
- LineBoxVolume
- TetBoxVolume

- Those elements have some specific requirements to be added into the geometrical filtering system.The  in which they are added is important as consecutive elements are chained logically with an AND.

In any case, the requested volume have specific attributes:
intType = FilterIntType.SomeVolumeCode
visible = true/false enables the visiblity and toggling form an ui
modifiable
clip=true, sets this as a mixedFilter
an internal Geometric Element used to render in screen and its internal characteristics
Internal Material.
raycaster() to pick this object from the mouse

getVolume, to compute the object volume
toJSON
fromJSON
A boundingBox


In addition to each Volume, a Tool is also used to insert the object in screen from some source  and provide some helper functions and graphic handlers

Such objects are updated in the viewer.update and also
within potreeRenderer their attributes are passed down for the pointcoud renderer to apply visualization

As each object has different characteristics, a  typical function checkInObject function is created per volume and custom code is aded per each geomtryc type to determine id a point is inside.





The logical filters are defined by number 10 and use three arrays:

- 1 Filter
- 2 intValues
- 3 floatValues

Any logical filter is made of 5 elements

[ operator , attributeIndex, index1, index2, listType(int or float) ]

- Operators are any of the FilterOperationType values

- attributeIndex is the index of the attribute to be filtered, like classification, intensity, or any custom value. Those are set while asigning material.
special indices are
-3 is for z
-2 is for y
-1 is for x
otherwise any of the filterPackedAttributes. With potree are some predefined indices used for some attributes mostly aligned on asprs  values

depending on the operator, attributeIndex, index1,  and index 2 hav different interpretation


Examples for all cases:


-------------------------------
EQUALS_CONST:  checks if a given attribute is equal to a given contant value set in the int or float array, requires only one value

Example 1:
Check if point classification  is equal to  4(medium vegetation)
int values [ 2, 3 ,4,6,8,10]
float values [ 3.3, 4.0 , 88.3, 99.2 ]

How is it written?
[ 0  == equals_const, k = classification_attribute_index, 1 = array_index_1, -1=array_index_2 1 = from_float_array ]

in short
[ 0, k, 1, -1 , 1]	Note, the -1 is just a placeholder for readability, as it just ignored once parsed.


Example 2: filter all z values equal to 3.14 (uses attribute index -3)
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 4.0 , 3.14, 99.2 ]
[ 0, -3 , 2, -1 , 1]

-------------------------------
LESS_THAN_CONSTANT = 2
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 4.0 , 3.14, 99.2 ]

Example 1:
check if Y VALUES ARE LESS THAN 99.2

[ 2 (less_than_constant), -2 (Y_AXIS), 3 (Index of 99.2 in the float array), -1 (ignore), 1 (from_float_array) ]


--------------------------------
LEQ_CONST = 4 (less or equal than)
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 4.0 , 3.14, 99.2 ]

Example 1:
check if X VALUES ARE LESS THAN OR EQUAL TO 6 (int)

[ 4 (leq_const), -1 (X_AXIS), 0 (Index of 6 in the int array), -1 (ignore), 0 (from_int_array) ]


--------------------------
GREATER_THAN_CONST = 6
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 4.0 , 3.14, 99.2 ]

Example 1:
check if Z VALUES ARE GREATER THAN 3.14 (float)

[ 6 (greater_than_constant), -3 (Z_AXIS), 2 (Index of 3.14 in the float array), -1 (ignore), 1 (from_float_array) ]


--------------------------
GEQ_CONST = 8 (greater or equal than)
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 4.0 , 3.14, 99.2 ]

Example 1:
check if Z VALUES ARE GREATER THAN OR EQUAL TO 3.14 (float)

[ 8 (geq_const), -3 (Z_AXIS), 2 (Index of 3.14 in the float array), -1 (ignore), 1 (from_float_array) ]


------------------------------------
RANGE_INCINC = 10 (inclusive, inclusive)
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 3.14, 4.0 , 99.2 ]

Example 1:
check if Y VALUES ARE BETWEEN 4.0 AND 99.2 (inclusive)

[ 10 (range_incinc), -2 (Y_AXIS), 2 (Index of 4.0 in the float array), 3 (Index of 99.2 in the float array), 1 (from_float_array) ]

-------------------------------------------
RANGE_INEXCL = 12 (inclusive, exclusive)
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 3.14, 4.0 , 99.2 ]

Example 1:
check if Z VALUES ARE BETWEEN 3.14 (inclusive) AND 99.2 (exclusive)


[ 12 (range_inexcl), -3 (Z_AXIS), 1 (Index of 3.14 in the float array), 3 (Index of 99.2 in the float array), 1 (from_float_array) ]


--------------------------
RANGE_EXINC = 14 (exclusive, inclusive)
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 3.14, 4.0 , 99.2 ]

Example 1:
check if Z VALUES ARE BETWEEN 3.14 (exclusive) AND 99.2 (inclusive)


===============================
Colorize: 100
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 3.14, 4.0 , 99.2 ]
[100 (colorize), 3(start index of color values), , ,1 (from_float_array) ]
===============================
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 3.14, 4.0 , 99.2 ]
[100 (colorize), 3(start index of color values), , ,1 (from_float_array) ]
===============================
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 3.14, 4.0 , 99.2 ]
[100 (colorize), 3(start index of color values), , ,1 (from_float_array) ]
===============================
int values [ 2, 3 ,4,6,8,10]
float values [ 6, 3.14, 4.0 , 99.2 ]
[100 (colorize), 3(start index of color values), , ,1 (from_float_array) ]
===============================


===============================
Relies on having computed the  distance of the current point to a given line, computed before coloring as minLineDistance
DISTANCE_MAP = 101
Example
float values = [ start_distance,end_distance,r1,g1,b1,r2,g2,b2,r3,g3,b3,r4,g4,b4 ]
float values = [ 2.0,10,0, 0.1,0.5,0.3,0.2,1.0,0.0,1.0.0.5,0.3, 0.2,0.4,0.6 ]
filter = [101 (distance_map), 4(number_of_colors or equal distance zones), 0(float_array_offset), NA ,1 (from_float_array) ]

So this starts coloring from distance 2 up to 10 using 4 colors

===============================

We  take an extension to this to incorporate non uniform distances
DISTANCE_MAP_NONUNIFORM
float values = [ start_distance,distance1,distance2,distance3,distance4=end_distance, r1,g1,b1, r2,g2,b2,r3,g3,b3,r4,g4,b4 ]
float values = [3.0,4.9,6.8,9.9,11.91,
0.1,0.5,0.3,
0.2,1.0,0.0,
1.0.0.5,0.3,
0.2,0.4,0.6 ]
filter = [102 (distance_map_nonuniform), 4(number_of_colors or equal distance zones), 0(float_array_offset), NA ,1 (from_float_array) ]

So based on distance, we check which  color index is used using for... which may be slow




How to add new logical or graphical operations:

1) Update the FilterConst.js file with a new index for the new operation i.e.  DISTANCE_LINE_MAP = 102

2) Check viewer.js update() method, in the section  to commit custom clip volumes and mixed filters
2.1)  Collect Mixed filter Volumes and primitives  .Each one is gathered in a respective array. In a future may be not required.
2.2) Extract and store clipBox information per volume type where a clipbox applies. Used as the filter or prefilter for geometric primitives. Each primitive stores its own information
2.3) Commit clip data  to material using pointcloud.material.setCLipXXX() This is data per geometrical type
2.4) Commit all the mixed filters, splitting between types: geometrical and logical,  setting count per type. Key step is the flattening of all mixed filters, as they are arrays.

NOTE: Check step 2.1 and 2.2 as 2.1 may be not reqired
Check step 2.3 and 2.4 so each type could also set its own defines and uniforms



3) When commiting data,  defines and uniforms can be set. which in viewer is split in various 2.x steps. Review code there
setClipProfile
setClipBoxes
setClipSpheres
setClipTetrahedrals
setPointClusters
setClipPolygons

setMixedFilters()


4) In potreeRenderer , while rendering, the actual defines and  uniforms are defined based on material and is tied to  Shader code. Here the shader code is updated


within the renderNodes, explicit code is used to populate the actual uniforms