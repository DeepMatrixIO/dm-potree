# Setting a chain of filters or MixedFilters is a complex process requiring definitions from FilterConsts and combination of Geometric Filters and Logical Filters.

Geometric Filters allow to select pointw within a given geometric contraint.

Logical filter allow to filter poinhts by specific values, mostly tied to data attributes and or coordinates.


Things like distances are more complex as they require to compute a distance function using point coordinates and a reference value.


In general terms:

1. The geometric filter allows to select points in space, within a given geometric shape or restriction.
2. Logic filters check if a given attribute is equal to, less than, greater than, in range, out of range, etc a given value or values
3. Colorize is simply a function to assign a color to selected values.
4. Stop filter is a handle to finish the current chain of filters and apply the changes. It is mostly used to close a set of  filters chained by an implicit  AND and start a new chain, linked by an implicit OR operator.






To unify an expandable system, filters are identified by a filter type from 1 to 10 and above up to 255.

Currently Geometrical filters are defined below 10 but can use any number


The logical filters are defined by number 10 and use three arrays:

1- Filter
2- intValues
3- floatValues

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