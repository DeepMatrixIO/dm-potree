#version 300 es
precision highp float;
precision highp int;

// #define max_clip_polygons 8
#define max_clip_polygons 16
#define max_clip_vertices 16
#define PI 3.141592653589793

in vec3 position;
in vec3 color;
in float intensity;
in float classification;
in float returnNumber;
in float numberOfReturns;
in float pointSourceID;
in vec4 indices;
in float spacing;
in float gpsTime;
in vec3 normal;
in float aExtra;
in float seg_cluster_id;

// in float filterAttribute[3];//Filtering  Attributes Indexed by number from browser side. Total number limited by webgl to 16, so trying with 3

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 uViewInv;

uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float fov;
uniform float near;
uniform float far;

uniform bool uDebug;

uniform bool uUseOrthographicCamera;
uniform float uOrthoWidth;
uniform float uOrthoHeight;

#define CLIPTASK_NONE 0
#define CLIPTASK_HIGHLIGHT 1
#define CLIPTASK_SHOW_INSIDE 2
#define CLIPTASK_SHOW_OUTSIDE 3
#define CLIPTASK_GRAYSCALE 4
#define CLIPTASK_ACTIVE 5

#define CLIPMETHOD_INSIDE_ANY 0
#define CLIPMETHOD_INSIDE_ALL 1

#define OP_EQUALS_CONST 0
#define OP_EQUALS_ATTRIBUTE 1

#define OP_LESS_THAN_CONST 2
#define OP_LESS_THAN_ATTRIBUTE 3
#define OP_LESS_THAN_EQ_CONST 4
#define OP_LESS_THAN_EQ_ATTRIBUTE 5
#define OP_GREATER_THAN_CONST 6
#define OP_GREATER_THAN_ATTRIBUTE 7
#define OP_GREATER_THAN_EQ_CONST 8
#define OP_GREATER_THAN_EQ_ATTRIBUTE 9

#define OP_RANGE_INCINC 10
#define OP_RANGE_INCEXC 11
#define OP_RANGE_EXCINC 12
#define OP_RANGE_EXCEXC 13

#define OP_IN 14
#define OP_NOT_IN 15

#define OP_DISTINCT_CONST 16
#define OP_DISTINCT_ATTRIBUTE 17

#define OP_OUTSIDE_RANGE_INCINC 18
#define OP_OUTSIDE_RANGE_INCEXC 19
#define OP_OUTSIDE_RANGE_EXCINC 20
#define OP_OUTSIDE_RANGE_EXCEXC 21

#define OP_AND 22
#define OP_OR 23
#define OP_NOT 24
#define OP_XOR 25

#define OP_ALL 255

uniform int clipTask;
uniform int clipMethod;
#if defined(num_clipboxes) && num_clipboxes > 0
uniform mat4 clipBoxes[num_clipboxes];
uniform int clipTasks[num_clipboxes];
uniform int selectionClipTasks[num_clipboxes];
uniform vec3 boxColors[num_clipboxes];
uniform vec3 selectionBoxColors[num_clipboxes];
#endif

// distance rendering requires a position and an array of min max ranges
#if defined(distance_to_point) && defined(num_ranges) && num_ranges > 0
uniform float positionRef[3];
uniform float rangeValues[num_ranges]; // uniform mat4 clipBoxes[num_clipboxes];

// textures leave for the moment, using selected range
#endif

#if defined(draw_isolines)

uniform float isoValues[3];
uniform float isoColorA[3];
uniform float isoColorB[3];
// textures left for the moment, using selected range
#endif

// added to make difference between the min max  color ramp range and values subset
//   minValue = colorRampBegin <= minVisibleColor <= maxVisibleColor, maxValue = colorRampEnd
#if defined(custom_range)
uniform float visibleRange[2];		 // visible min max values. They should be within uExtraRange
uniform float maxRange[2];			 // sets the min max range for the gradient texture
uniform float allVisible[2];		 // color for the min value
uniform float nonVisibleColorMin[3]; // color for the min value
uniform float nonVisibleColorMax[3]; // color for the max value

#endif

#if defined(num_clusteredpointsegments) && num_clusteredpointsegments > 0
uniform float clusteredpointsegments[num_clusteredpointsegments];
uniform int segmentClipTasks[num_clusteredpointsegments];
uniform float segmentClassifications[num_clusteredpointsegments];
uniform bool selectedStates[num_clusteredpointsegments];
uniform bool activeStates[num_clusteredpointsegments];
uniform bool visibleStates[num_clusteredpointsegments];
#endif

#if defined(num_clipspheres) && num_clipspheres > 0
uniform mat4 uClipSpheres[num_clipspheres];
#endif

#if defined(num_clippolygons) && num_clippolygons > 0
uniform int uClipPolygonVCount[num_clippolygons]; // number of vertices for a given polygon
// uniform vec3 uClipPolygonVertices[num_clippolygons * 8];//flattened array of vertices
// uniform vec3 uClipPolygonVertices[num_clippolygons * max_clip_polygons]; // flattened array of vertices, but is not max_clip_polygons
uniform vec3 uClipPolygonVertices[num_clippolygons * max_clip_vertices]; // flattened array of vertices, but is not max_clip_polygons
uniform mat4 uClipPolygonWVP[num_clippolygons];							 // flattened matrices world projected matrices
uniform vec3 uClipPolygonColor[num_clippolygons];						 // flattened matrices world projected matrices

#endif

// list of dynamic filters for selection clips box or polygon
#if defined(mixed_volumes) && mixed_volumes > 0 && defined(num_mixed_volumes) && num_mixed_volumes > 0
//&& defined(num_op_attributes)  && num_op_attributes > 0 && defined(num_filters) && num_filters > 0 && defined(num_filter_values) && num_filter_values > 0

uniform int uMixedVolumes[num_mixed_volumes]; // number of attributes used for filtering

// calls doFiltering
#endif

#if defined(num_logical_filters) && num_logical_filters > 0

uniform int uFilterList[num_logical_filters * 5]; // list of filters encoded with indices
// uniform int  uFilterAttributes[num_filter_attributes];//attribute values are packed and indexed for filters
#endif

#if defined(num_float_values) && num_float_values > 0
uniform float uFloatFilterValues[num_float_values];

#endif

#if defined(num_int_values) && num_int_values > 0
uniform int uIntegerFilterValues[num_int_values];
#endif

#if defined(mixed_filters) && mixed_filters > 0 // means something is commited to filtering
uniform int uMixedFilters[mixed_filters];		// list of filters encoded with indices, extra variables are checked independently
// uniform int  uFilterAttributes[num_filter_attributes];//attribute values are packed and indexed for filters
// uniform float uFloatFilterValues[num_filter_values];//arrays cant be set to zero, so setting dummy values
// uniform int uIntegerFilterValues[num_list_values];
// calls doFiltering
#endif

uniform float size;
uniform float minSize;
uniform float maxSize;

uniform float uPCIndex;
uniform float uOctreeSpacing;
uniform float uNodeSpacing;
uniform float uOctreeSize;
uniform vec3 uBBSize;
uniform float uLevel;
uniform float uVNStart;
uniform bool uIsLeafNode;

uniform vec3 uColor;
uniform float uOpacity;

uniform vec2 elevationRange;
uniform vec2 intensityRange;

uniform vec2 uFilterReturnNumberRange;
uniform vec2 uFilterNumberOfReturnsRange;
uniform vec2 uFilterPointSourceIDClipRange;
uniform vec2 uFilterGPSTimeClipRange;
uniform float uGpsScale;
uniform float uGpsOffset;

uniform vec2 uNormalizedGpsBufferRange;

uniform vec3 uIntensity_gbc;
uniform vec3 uRGB_gbc;
uniform vec3 uExtra_gbc;

uniform float uTransition;
uniform float wRGB;
uniform float wIntensity;
uniform float wElevation;
uniform float wClassification;
uniform float wReturnNumber;
uniform float wSourceID;

uniform vec2 uExtraNormalizedRange;
uniform vec2 uExtraRange;
uniform float uExtraScale;
uniform float uExtraOffset;

uniform vec3 uShadowColor;

uniform sampler2D visibleNodes;
uniform sampler2D gradient;
uniform sampler2D classificationLUT;

#if defined(color_type_matcap)
uniform sampler2D matcapTextureUniform;
#endif
uniform bool backfaceCulling;

#if defined(num_shadowmaps) && num_shadowmaps > 0
uniform sampler2D uShadowMap[num_shadowmaps];
uniform mat4 uShadowWorldView[num_shadowmaps];
uniform mat4 uShadowProj[num_shadowmaps];
#endif

out vec3 vColor;
out float vLogDepth;
out vec3 vViewPosition;
out float vRadius;
out float vPointSize;
// out to ignorecolor by making transparent

// out float vOpacity;
flat out int isVisible;

float roundDeprecated(float number)
{
	return floor(number + 0.5);
}

//
//    ###    ########     ###    ########  ######## #### ##     ## ########     ######  #### ######## ########  ######
//   ## ##   ##     ##   ## ##   ##     ##    ##     ##  ##     ## ##          ##    ##  ##       ##  ##       ##    ##
//  ##   ##  ##     ##  ##   ##  ##     ##    ##     ##  ##     ## ##          ##        ##      ##   ##       ##
// ##     ## ##     ## ##     ## ########     ##     ##  ##     ## ######       ######   ##     ##    ######    ######
// ######### ##     ## ######### ##           ##     ##   ##   ##  ##                ##  ##    ##     ##             ##
// ##     ## ##     ## ##     ## ##           ##     ##    ## ##   ##          ##    ##  ##   ##      ##       ##    ##
// ##     ## ########  ##     ## ##           ##    ####    ###    ########     ######  #### ######## ########  ######
//

// ---------------------
// OCTREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_level_of_detail)) && defined(tree_type_octree)
/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
int numberOfOnes(int number, int index)
{
	int numOnes = 0;
	int tmp = 128;
	for (int i = 7; i >= 0; i--)
	{

		if (number >= tmp)
		{
			number = number - tmp;

			if (i <= index)
			{
				numOnes++;
			}
		}

		tmp = tmp / 2;
	}

	return numOnes;
}

/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(int number, int index)
{

	// weird multi else if due to lack of proper array, int and bitwise support in WebGL 1.0
	int powi = 1;
	if (index == 0)
	{
		powi = 1;
	}
	else if (index == 1)
	{
		powi = 2;
	}
	else if (index == 2)
	{
		powi = 4;
	}
	else if (index == 3)
	{
		powi = 8;
	}
	else if (index == 4)
	{
		powi = 16;
	}
	else if (index == 5)
	{
		powi = 32;
	}
	else if (index == 6)
	{
		powi = 64;
	}
	else if (index == 7)
	{
		powi = 128;
	}
	else
	{
		return false;
	}

	int ndp = number / powi;

	return mod(float(ndp), 2.0) != 0.0;
}

/**
 * find the LOD at the point position
 */
float getLOD()
{

	vec3 offset = vec3(0.0, 0.0, 0.0);
	int iOffset = int(uVNStart);
	float depth = uLevel;
	for (float i = 0.0; i <= 30.0; i++)
	{
		float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel + 0.0);

		vec3 index3d = (position - offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));

		// vec4 value = texture(visibleNodes, vec2(iOffset / 2048.0, 0.0));
		vec4 value = texture(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0)); // cannot operate on different typesww
		int mask = int(round(value.r * 255.0));

		if (isBitSet(mask, index))
		{
			// there are more visible child nodes at this position
			int advanceG = int(round(value.g * 255.0)) * 256;
			int advanceB = int(round(value.b * 255.0));
			int advanceChild = numberOfOnes(mask, index - 1);
			int advance = advanceG + advanceB + advanceChild;

			iOffset = iOffset + advance;

			depth++;
		}
		else
		{
			// no more visible child nodes at this position
			// return value.a * 255.0;

			float lodOffset = (255.0 * value.a) / 10.0 - 10.0;

			return depth + lodOffset;
		}

		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
	}

	return depth;
}

float getSpacing()
{
	vec3 offset = vec3(0.0, 0.0, 0.0);
	int iOffset = int(uVNStart);
	float depth = uLevel;
	float spacing = uNodeSpacing;
	for (float i = 0.0; i <= 30.0; i++)
	{
		float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel + 0.0);

		vec3 index3d = (position - offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));

		// vec4 value = texture(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
		vec4 value = texture(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
		int mask = int(round(value.r * 255.0));
		float spacingFactor = value.a;

		if (i > 0.0)
		{
			spacing = spacing / (255.0 * spacingFactor);
		}

		if (isBitSet(mask, index))
		{
			// there are more visible child nodes at this position
			int advanceG = int(round(value.g * 255.0)) * 256;
			int advanceB = int(round(value.b * 255.0));
			int advanceChild = numberOfOnes(mask, index - 1);
			int advance = advanceG + advanceB + advanceChild;

			iOffset = iOffset + advance;

			// spacing = spacing / (255.0 * spacingFactor);
			// spacing = spacing / 3.0;

			depth++;
		}
		else
		{
			// no more visible child nodes at this position
			return spacing;
		}

		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
	}

	return spacing;
}

float getPointSizeAttenuation()
{
	return pow(2.0, getLOD());
}

#endif

// ---------------------
// KD-TREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_level_of_detail)) && defined(tree_type_kdtree)

float getLOD()
{
	vec3 offset = vec3(0.0, 0.0, 0.0);
	float iOffset = 0.0;
	float depth = 0.0;

	vec3 size = uBBSize;
	vec3 pos = position;

	for (float i = 0.0; i <= 1000.0; i++)
	{

		vec4 value = texture(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));

		int children = int(value.r * 255.0);
		float next = value.g * 255.0;
		int split = int(value.b * 255.0);

		if (next == 0.0)
		{
			return depth;
		}

		vec3 splitv = vec3(0.0, 0.0, 0.0);
		if (split == 1)
		{
			splitv.x = 1.0;
		}
		else if (split == 2)
		{
			splitv.y = 1.0;
		}
		else if (split == 4)
		{
			splitv.z = 1.0;
		}

		iOffset = iOffset + next;

		float factor = length(pos * splitv / size);
		if (factor < 0.5)
		{
			// left
			if (children == 0 || children == 2)
			{
				return depth;
			}
		}
		else
		{
			// right
			pos = pos - size * splitv * 0.5;
			if (children == 0 || children == 1)
			{
				return depth;
			}
			if (children == 3)
			{
				iOffset = iOffset + 1.0;
			}
		}
		size = size * ((1.0 - (splitv + 1.0) / 2.0) + 0.5);

		depth++;
	}

	return depth;
}

float getPointSizeAttenuation()
{
	return 0.5 * pow(1.3, getLOD());
}

#endif

//
//    ###    ######## ######## ########  #### ########  ##     ## ######## ########  ######
//   ## ##      ##       ##    ##     ##  ##  ##     ## ##     ##    ##    ##       ##    ##
//  ##   ##     ##       ##    ##     ##  ##  ##     ## ##     ##    ##    ##       ##
// ##     ##    ##       ##    ########   ##  ########  ##     ##    ##    ######    ######
// #########    ##       ##    ##   ##    ##  ##     ## ##     ##    ##    ##             ##
// ##     ##    ##       ##    ##    ##   ##  ##     ## ##     ##    ##    ##       ##    ##
// ##     ##    ##       ##    ##     ## #### ########   #######     ##    ########  ######
//

// formula adapted from: http://www.dfstudios.co.uk/articles/programming/image-programming-algorithms/image-processing-algorithms-part-5-contrast-adjustment/
float getContrastFactor(float contrast)
{
	return (1.0158730158730156 * (contrast + 1.0)) / (1.0158730158730156 - contrast);
}

vec3 getRGB()
{
	vec3 rgb = color;

	rgb = pow(rgb, vec3(uRGB_gbc.x));
	rgb = rgb + uRGB_gbc.y;
	rgb = (rgb - 0.5) * getContrastFactor(uRGB_gbc.z) + 0.5;
	rgb = clamp(rgb, 0.0, 1.0);

	return rgb;
}

float getIntensity()
{
	float w = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
	w = pow(w, uIntensity_gbc.x);
	w = w + uIntensity_gbc.y;
	w = (w - 0.5) * getContrastFactor(uIntensity_gbc.z) + 0.5;
	w = clamp(w, 0.0, 1.0);

	return w;
}

vec3 getGpsTime()
{

	float w = (gpsTime + uGpsOffset) * uGpsScale;

	vec3 c = texture(gradient, vec2(w, 1.0 - w)).rgb;

	// vec2 r = uNormalizedGpsBufferRange;
	// float w = gpsTime * (r.y - r.x) + r.x;
	// w = clamp(w, 0.0, 1.0);
	// vec3 c = texture(gradient, vec2(w,1.0-w)).rgb;

	return c;
}

vec3 getElevation()
{
	vec4 world = modelMatrix * vec4(position, 1.0);
	float w = (world.z - elevationRange.x) / (elevationRange.y - elevationRange.x);
	vec3 cElevation = texture(gradient, vec2(w, 1.0 - w)).rgb;
// vec3 iso = vec3(0.0, 0.0, 0.0);
// override the color at a given heights and tolerance
#if defined(draw_isolines) && draw_isolines > 0
	//	cElevation=isolinesRendering(cElevation).xyz;//considers only z position
	// vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	float ppos = world.z;
	// vec3 color=vec3(0.0, 0.0, 0.0);
	bool none = true;
	if (abs(mod(ppos, isoValues[1])) < isoValues[2])
	{
		cElevation = vec3(isoColorB[0], isoColorB[1], isoColorB[2]);
		// color = vec3(0.0, 1.0, 0.0);
		// none=false;
	}
	if (abs(mod(ppos, isoValues[0])) < isoValues[2])
	{
		// color = vec3(1.0, 0.0, 0.0);
		cElevation = vec3(isoColorA[0], isoColorA[1], isoColorA[2]);
	}

#endif

	return cElevation;
}

vec4 getClassification()
{
	vec2 uv = vec2(classification / 255.0, 0.5);

#if defined(num_clusteredpointsegments) && num_clusteredpointsegments > 0
	for (int i = 0; i < num_clusteredpointsegments; i++)
	{
		if (clusteredpointsegments[i] == seg_cluster_id)
		{
			float segmentClass = segmentClassifications[i];
			if (segmentClass != -1.0)
			{
				uv = vec2(segmentClass / 255.0, 0.5);
			}
			else
			{
				uv = vec2(128.0 / 255.0, 0.5); // by default, assign a color different than gray, as it hides the results.
			}
		}
	}
#endif

	vec4 classColor = texture(classificationLUT, uv);
	// vec4 classColor = texture(gradient, uv);

	return classColor;
}

vec4 getClassificationBak()
{
	vec2 uv = vec2(classification / 255.0, 0.5);

#if defined(num_clusteredpointsegments) && num_clusteredpointsegments > 0

	if (seg_cluster_id < 57.0)
	{
		uv = vec2(32.0 / 255.0, 0.5); // just ingnore the segmentClassification mapping
	}
	else if (seg_cluster_id < 195.0)
	{
		uv = vec2(64.0 / 255.0, 0.5); // just ingnore the segmentClassification mapping
	}
	else if (seg_cluster_id < 200.0)
	{
		uv = vec2(128.0 / 255.0, 0.5); // just ingnore the segmentClassification mapping
	}
	else if (seg_cluster_id < 230.0)
	{
		uv = vec2(196.0 / 255.0, 0.5); // just ingnore the segmentClassification mapping
	}
	else
	{
		uv = vec2(255.0 / 255.0, 0.5); // just ingnore the segmentClassification mapping
	}
	//}
	//}
#endif

	// vec4 classColor = texture(classificationLUT, uv);
	vec4 classColor = texture(gradient, uv);

	return classColor;
}

vec3 getReturns()
{

	// 0b 00_000_111
	float rn = mod(returnNumber, 8.0);
	// 0b 00_111_000
	float nr = mod(returnNumber / 8.0, 8.0);

	if (nr <= 1.0)
	{
		return vec3(1.0, 0.0, 0.0);
	}
	else
	{
		return vec3(0.0, 1.0, 0.0);
	}

	// return vec3(nr / 4.0, 0.0, 0.0);

	// if(nr == 1.0){
	// 	return vec3(1.0, 1.0, 0.0);
	// }else{
	// 	if(rn == 1.0){
	// 		return vec3(1.0, 0.0, 0.0);
	// 	}else if(rn == nr){
	// 		return vec3(0.0, 0.0, 1.0);
	// 	}else{
	// 		return vec3(0.0, 1.0, 0.0);
	// 	}
	// }

	// if(numberOfReturns == 1.0){
	// 	return vec3(1.0, 1.0, 0.0);
	// }else{
	// 	if(returnNumber == 1.0){
	// 		return vec3(1.0, 0.0, 0.0);
	// 	}else if(returnNumber == numberOfReturns){
	// 		return vec3(0.0, 0.0, 1.0);
	// 	}else{
	// 		return vec3(0.0, 1.0, 0.0);
	// 	}
	// }
}

vec3 getReturnNumber()
{
	if (numberOfReturns == 1.0)
	{
		return vec3(1.0, 1.0, 0.0);
	}
	else
	{
		if (returnNumber == 1.0)
		{
			return vec3(1.0, 0.0, 0.0);
		}
		else if (returnNumber == numberOfReturns)
		{
			return vec3(0.0, 0.0, 1.0);
		}
		else
		{
			return vec3(0.0, 1.0, 0.0);
		}
	}
}

vec3 getNumberOfReturns()
{
	float value = numberOfReturns;

	float w = value / 6.0;

	vec3 color = texture(gradient, vec2(w, 1.0 - w)).rgb;

	return color;
}

vec3 getSourceID()
{
	float w = mod(pointSourceID, 10.0) / 10.0;
	return texture(gradient, vec2(w, 1.0 - w)).rgb;
}

vec3 getCompositeColor()
{
	vec3 c;
	float w;

	c += wRGB * getRGB();
	w += wRGB;

	c += wIntensity * getIntensity() * vec3(1.0, 1.0, 1.0);
	w += wIntensity;

	c += wElevation * getElevation();
	w += wElevation;

	c += wReturnNumber * getReturnNumber();
	w += wReturnNumber;

	c += wSourceID * getSourceID();
	w += wSourceID;

	vec4 cl = wClassification * getClassification();
	c += cl.a * cl.rgb;
	w += wClassification * cl.a;

	c = c / w;

	if (w == 0.0)
	{
		// c = color;
		gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
	}

	return c;
}

vec3 getNormal()
{
	// vec3 n_hsv = vec3( modelMatrix * vec4( normal, 0.0 )) * 0.5 + 0.5; // (n_world.xyz + vec3(1.,1.,1.)) / 2.;
	vec3 n_view = normalize(vec3(modelViewMatrix * vec4(normal, 0.0)));
	return n_view;
}
bool applyBackfaceCulling()
{
	// Black not facing vertices / Backface culling
	vec3 e = normalize(vec3(modelViewMatrix * vec4(position, 1.)));
	vec3 n = getNormal(); // normalize( vec3(modelViewMatrix * vec4( normal, 0.0 )) );

	if ((uUseOrthographicCamera && n.z <= 0.) || (!uUseOrthographicCamera && dot(n, e) >= 0.))
	{
		return true;
	}
	else
	{
		return false;
	}
}

#if defined(color_type_matcap)
// Matcap Material
vec3 getMatcap()
{
	vec3 eye = normalize(vec3(modelViewMatrix * vec4(position, 1.)));
	if (uUseOrthographicCamera)
	{
		eye = vec3(0., 0., -1.);
	}
	vec3 r_en = reflect(eye, getNormal()); // or r_en = e - 2. * dot( n, e ) * n;
	float m = 2. * sqrt(pow(r_en.x, 2.) + pow(r_en.y, 2.) + pow(r_en.z + 1., 2.));
	vec2 vN = r_en.xy / m + .5;
	return texture(matcapTextureUniform, vN).rgb;
}
#endif

// Testing to feed additional parameters to the shader to have multiple rendering options
// Proposed parameters are

// positionRefValues:[xref,yref,zref]: reference values for further visualization
// isoValues:[priIso,secIso,refIso]: primary and secondary isosurface values plus start reference
// uExtraRange[x,y]: range of the extra parameter based on attribute
// uExtraScale: scaling factor for the extra parameter
// uExtraOffset: offset for the extra parameter

// in terms of functions, allowed functions include
// distance_rendering
// iso_rendering
// ramp_rendering

// requires positionRefValues, rangeValues
//   In allows to show objects based on their distance to a reference point
//   The reference point is defined by positionRefValues
//   The range of the distance is defined by rangeValues
//   The color is defined by the gradient texture

// semantics are, from a given distance, the color is defined by different clors and gradients
//  within Radius, the color is defined by the gradient texture1 and min ma
//  within 2*Radius, the color is defined by the gradient texture2

#if defined(distance_to_point) && defined(num_ranges) && num_ranges > 0

vec3 distanceRendering()
{

	vec4 worldPosition = modelMatrix * vec4(position, 1.0);

	vec3 ppos = worldPosition.xyz;
	vec3 pref = vec3(positionRef[0], positionRef[1], positionRef[2]);
	float dist = distance(ppos, pref);

	// using the first max value as the reference

	if (rangeValues[0] <= dist && dist < rangeValues[1])
	{
		float w = (dist - rangeValues[0]) / (rangeValues[1] - rangeValues[0]);
		w = clamp(w, 0.0, 1.0);
		vec3 color = texture(gradient, vec2(w, 1.0 - w)).rgb;
		return color;
	}
	else
	{
		return vec3(0.0, 0.0, 0.0);
	}
}
#endif

#if defined(draw_isolines) && draw_isolines > 0

vec3 isolinesRendering(vec3 color)
{
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vec3 ppos = worldPosition.xyz;
	// vec3 color=vec3(0.0, 0.0, 0.0);
	bool none = true;
	if (abs(mod(ppos.z, isoValues[1])) < isoValues[2])
	{
		color = vec3(0.0, 1.0, 0.0);
		// none=false;
	}
	if (abs(mod(ppos.z, isoValues[0])) < isoValues[2])
	{
		color = vec3(1.0, 0.0, 0.0);
		// none=false;
	}

	return color;
}
#endif

// maps a set of values to a given gradient and
// Instead of using the min max values only, adds cuttof values to the gradient, so only part of the gradient is used

// this becomes  uExtraRange[0] <= visRange[0] <= visRange[1] <= uExtraRange[1]

// a extra value does not have to be inside the values. Is a value is outside of visRange, then its not shown
//

#if defined(custom_range) && custom_range > 0

vec3 customRangeRendering()
{
	// vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	// vec3 ppos=worldPosition.xyz;

	vec3 color;
	bool none = true;
	// float w = (aExtra + uExtraOffset) * uExtraScale;
	float w = aExtra;
	// w = clamp(w, 0.0, 1.0);
	// vec3 color = texture(gradient, vec2(w,1.0-w)).rgb;

	// vec2 r = uExtraNormalizedRange;

	// float w = aExtra * (r.y - r.x) + r.x;

	// scale to the whole color range between 0 and 1
	// float w = (aExtra + uExtraOffset) * uExtraScale;
	//  w = clamp(w, 0.0, 1.0);

	// vec3 color = texture(gradient, vec2(w,1.0-w)).rgb;

	// vec2 r = uExtraNormalizedRange;

	// float w = aExtra * (r.y - r.x) + r.x;

	// if (visibleRange[0] < w  &&  w < visibleRange[1]){
	// w = (w - uExtraRange.x) / (uExtraRange.y - uExtraRange.x);
	// w = clamp(w, 0.0, 1.0);//redundant

	// color = texture(gradient, vec2(w, 1.0 - w)).rgb;
	// return color
	//	}else{

	if (w > visibleRange[1])
	{
		w = visibleRange[1];
		if (allVisible[1] == 0.0)
		{
			isVisible = 0;
		}
		// vOpacity=0.0;//set somewhere else
		color = vec3(nonVisibleColorMax[0], nonVisibleColorMax[1], nonVisibleColorMax[2]);
		return color;
	}

	if (w < visibleRange[0])
	{
		w = visibleRange[0];
		if (allVisible[0] == 0.0)
		{
			isVisible = 0;
		}

		// color = vec3(allVisible[0], allVisible[1], allVisible[2]);
		// vOpacity=0.0;//set somewhere else
		color = vec3(nonVisibleColorMin[0], nonVisibleColorMin[1], nonVisibleColorMin[2]);
		return color;
		// return vec3(0.0, 0.0, 0.0);
		// color = vec3(0.0, 0.0, 0.0);
		// none=false;
		// return color;
	}

	w = (w - uExtraRange.x) / (uExtraRange.y - uExtraRange.x);
	w = clamp(w, 0.0, 1.0); // redundant

	color = texture(gradient, vec2(w, 1.0 - w)).rgb;
	return color;
}
#endif

vec3 getExtra()
{

#if defined(distance_to_point) && distance_to_point > 0
	return distanceRendering(); // considers only position
#endif

	// initial implementation for habing uExtraRange and uExtraScale, uExtraOffset
#if defined(custom_range) && custom_range > 0
	return customRangeRendering(); // considers oExtra value and min max data_range
#endif

	float w = (aExtra + uExtraOffset) * uExtraScale;

	// vec2 r = uExtraNormalizedRange;
	// float w = aExtra * (r.y - r.x) + r.x;

	w = (w - uExtraRange.x) / (uExtraRange.y - uExtraRange.x);

	w = clamp(w, 0.0, 1.0);

	// vec3 color = texture(gradient, vec2(w, 1.0 - w)).rgb;//remove once test is done
	vec3 color = vec3(0.0, 0.0, 1.0); // black for testing, comment once done

	return color;
}

vec3 getColor()
{
	vec3 color;
	// do not make transparent by default, only to ignore it, multypli with the uOpacity

#ifdef color_type_rgba
	color = getRGB();
#elif defined color_type_height || defined color_type_elevation
	color = getElevation();
#elif defined color_type_rgb_height
	vec3 cHeight = getElevation();
	color = (1.0 - uTransition) * getRGB() + uTransition * cHeight;
#elif defined color_type_depth
	float linearDepth = gl_Position.w;
	float expDepth = (gl_Position.z / gl_Position.w) * 0.5 + 0.5;
	color = vec3(linearDepth, expDepth, 0.0);
	// color = vec3(1.0, 0.5, 0.3);
#elif defined color_type_intensity
	float w = getIntensity();
	color = vec3(w, w, w);
#elif defined color_type_gps_time
	color = getGpsTime();
#elif defined color_type_intensity_gradient
	float w = getIntensity();
	color = texture(gradient, vec2(w, 1.0 - w)).rgb;
#elif defined color_type_color
	color = uColor;
#elif defined color_type_level_of_detail
	float depth = getLOD();
	float w = depth / 10.0;
	color = texture(gradient, vec2(w, 1.0 - w)).rgb;
#elif defined color_type_indices
	color = indices.rgb;
#elif defined color_type_classification
	vec4 cl = getClassification();
	color = cl.rgb;
#elif defined color_type_return_number
	color = getReturnNumber();
#elif defined color_type_returns
	color = getReturns();
#elif defined color_type_number_of_returns
	color = getNumberOfReturns();
#elif defined color_type_source_id
	color = getSourceID();
#elif defined color_type_point_source_id
	color = getSourceID();
#elif defined color_type_normal
	color = (modelMatrix * vec4(normal, 0.0)).xyz;
#elif defined color_type_phong
	color = color;
#elif defined color_type_composite
	color = getCompositeColor();
#elif defined color_type_matcap
	color = getMatcap();
#else
	color = getExtra();
#endif

	if (backfaceCulling && applyBackfaceCulling())
	{
		color = vec3(0.);
	}

	return color;
}

float getPointSize()
{
	float pointSize = 1.0;

	float slope = tan(fov / 2.0);
	float projFactor = -0.5 * uScreenHeight / (slope * vViewPosition.z);

	float scale = length(
					  modelViewMatrix * vec4(0, 0, 0, 1) -
					  modelViewMatrix * vec4(uOctreeSpacing, 0, 0, 1)) /
				  uOctreeSpacing;
	projFactor = projFactor * scale;

	float r = uOctreeSpacing * 1.7;
	vRadius = r;
#if defined fixed_point_size
	pointSize = size;
#elif defined attenuated_point_size
	if (uUseOrthographicCamera)
	{
		pointSize = size;
	}
	else
	{
		pointSize = size * spacing * projFactor;
		// pointSize = pointSize * projFactor;
	}
#elif defined adaptive_point_size
	if (uUseOrthographicCamera)
	{
		float worldSpaceSize = 1.0 * size * r / getPointSizeAttenuation();
		pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
	}
	else
	{
		float worldSpaceSize = 1.0 * size * r / getPointSizeAttenuation();
		pointSize = worldSpaceSize * projFactor;
	}
#endif

	pointSize = max(minSize, pointSize);
	pointSize = min(maxSize, pointSize);

	vRadius = pointSize / projFactor;

	return pointSize;
}

// Step-by-step explanation
// Transform the point to polygon's clip space:

// wvp = uClipPolygonWVP[polyIdx] is the World-View-Projection matrix for the polygon.
// The point is transformed and projected to normalized device coordinates (NDC):
// pointNDC = wvp * vec4(point, 1.0);
// The x and y are divided by w to get 2D coordinates:
// pointNDC.xy = pointNDC.xy / pointNDC.w;
// Polygon vertices:

// The polygon can have up to 8 vertices (hence the loop and array size).
// uClipPolygonVCount[polyIdx] gives the number of vertices for this polygon.
// Vertices are fetched from uClipPolygonVertices.
// Ray-casting algorithm (even-odd rule):

// The function uses the classic ray-casting algorithm to determine if the point is inside the polygon.
// For each edge of the polygon, it checks if a horizontal ray from the point crosses the edge.
// If the number of crossings is odd, the point is inside; if even, it's outside.
// The variable c toggles each time the ray crosses an edge.
// Return value:

// Returns true if the point is inside the polygon, false otherwise.
// Summary
// Purpose: Checks if a point is inside a 2D polygon (after projecting from 3D).
// How: Projects the point and polygon vertices to 2D, then uses the ray-casting algorithm.
// Why: Used for clipping points in a point cloud renderer, so only points inside (or outside) user-defined polygons are rendered.

#if defined(num_clippolygons) && num_clippolygons > 0
bool pointInClipPolygon(vec3 point, int polyIdx)
{

	mat4 wvp = uClipPolygonWVP[polyIdx]; // world view projection
	// vec4 screenClipPos = uClipPolygonVP[polyIdx] * modelMatrix * vec4(point, 1.0);
	// screenClipPos.xy = screenClipPos.xy / screenClipPos.w * 0.5 + 0.5;

	vec4 pointNDC = wvp * vec4(point, 1.0); // normalized device coordinates
	pointNDC.xy = pointNDC.xy / pointNDC.w;

	int j = uClipPolygonVCount[polyIdx] - 1;
	bool c = false; // by default point is even, means outside the polygon, even means inside

	// checking each edge of the polygon from the, j = last vertex, from j=i-1  to i m i.e.
	// for (int i = 0; i < 8; i++)//this version works with at most 8 vertices
	for (int i = 0; i < max_clip_vertices; i++) // moved to use the max_clip_polygons, default set to 8
	{

		if (i == uClipPolygonVCount[polyIdx])
		{
			break;
		}

		// vec3 verti = uClipPolygonVertices[polyIdx * 8 + i];//
		// vec3 vertj = uClipPolygonVertices[polyIdx * 8 + j];//8 becuase is flattened

		vec3 verti = uClipPolygonVertices[polyIdx * max_clip_vertices + i];
		vec3 vertj = uClipPolygonVertices[polyIdx * max_clip_vertices + j];

		// horitonzal line check
		// if point  crosses the edge y coords, proceed
		// line equation  xm + b
		if (((verti.y > pointNDC.y) != (vertj.y > pointNDC.y)) &&
			(pointNDC.x < (vertj.x - verti.x) * ((pointNDC.y - verti.y) / (vertj.y - verti.y)) + verti.x))
		{
			c = !c; // toggles for every line crossing within the polygon
		}
		j = i;
	}

	return c;
}
#endif

// given an inverse clipBoxMatrix  of a clipBox, taking world to local, checks if a point is inside the clipBox
// by transforming a world position to local position wrt clip transformation
// point is not strictly required to be passed as parameter
// point is defined in local positino, but transformed to world position, and taken back to local position wrt cube
bool pointInClipBox(mat4 clipBoxInvMat, vec3 point)
{
	// every clipBox is defined as an inverse matrix taking from world to local space
	// so checking in within -0.5 and 0.5 in all axes.
	// point in local coords, not worls

	vec4 clipPosition = clipBoxInvMat * modelMatrix * vec4(point, 1.0);
	bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
	inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
	inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;
	return inside;
}

/** Takes an attribute, which for the time being is classification, but mostly a packed attribute index
 * and compares it against another value, either attribute or contant value
 *
 * HAve two options, one is to directly extract a filter from all arrays. other is to explicitely receive the values
 */

bool doLogicalEval(int operator, float attributeValue, float compareValue, int startIndex, int endIndex)
{

	bool result = false;

	if (operator== OP_EQUALS_CONST)
	{
		result = attributeValue == compareValue;
	}
	else if (operator== OP_EQUALS_ATTRIBUTE)
	{
		result = attributeValue == attributeValue;
	}
	else if (operator== OP_LESS_THAN_CONST)
	{
		result = attributeValue < compareValue;
	}
	else if (operator== OP_LESS_THAN_ATTRIBUTE)
	{
		result = attributeValue < attributeValue;
	}
	else if (operator== OP_LESS_THAN_EQ_CONST)
	{
		result = attributeValue <= compareValue;
	}
	else if (operator== OP_LESS_THAN_EQ_ATTRIBUTE)
	{
		result = attributeValue <= attributeValue;
	}
	else if (operator== OP_GREATER_THAN_CONST)
	{
		result = attributeValue > compareValue;
	}
	else if (operator== OP_GREATER_THAN_ATTRIBUTE)
	{
		result = attributeValue > attributeValue;
	}
	else if (operator== OP_GREATER_THAN_EQ_CONST)
	{
		result = attributeValue >= compareValue;
	}
	else if (operator== OP_GREATER_THAN_EQ_ATTRIBUTE)
	{
		result = attributeValue >= attributeValue;
	}
	else if (operator== OP_DISTINCT_CONST)
	{
		result = attributeValue != compareValue;
	}
	else if (operator== OP_DISTINCT_ATTRIBUTE)
	{
		result = attributeValue != compareValue; // todo fix it
	}
	else

#if defined(num_float_values) && num_float_values > 0

		if (operator== OP_RANGE_INCINC)
	{
		// requires indices, keep to float
		result = (uFloatFilterValues[startIndex] <= attributeValue) && attributeValue <= uFloatFilterValues[endIndex];
	}
	else if (operator== OP_RANGE_INCEXC)
	{
		result = (uFloatFilterValues[startIndex] <= attributeValue) && attributeValue < uFloatFilterValues[endIndex];
	}
	else if (operator== OP_RANGE_EXCINC)
	{
		result = (uFloatFilterValues[startIndex] < attributeValue) && attributeValue <= uFloatFilterValues[endIndex];
	}
	else if (operator== OP_RANGE_EXCEXC)
	{
		result = (uFloatFilterValues[startIndex] < attributeValue) && attributeValue < uFloatFilterValues[endIndex];
	}

	else if (operator == OP_NOT_IN) // not working
	{
		result=true;
		for (int i = startIndex; i <= endIndex; i++)
		{
			if (attributeValue == uFloatFilterValues[i])
			{
				result= false;

			}
		}
	}

	else if (operator== OP_IN)
	{
		result=false;
		for (int i = startIndex; i <= endIndex; i++)
		{
			if (attributeValue == uFloatFilterValues[i])
			{
				result= true;
				break;
			}
		}

	} else

#endif



	{
		result = false; // default case, not defined
	}

	return result;
}

// requires
// #if defined(num_clippolygons) && num_clippolygons > 0
void doClipping()
{

	{
		vec4 cl = getClassification();
		if (cl.a == 0.0)
		{
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);

			return;
		}
	}

#if defined(clip_return_number_enabled)
	{ // return number filter
		vec2 range = uFilterReturnNumberRange;
		if (returnNumber < range.x || returnNumber > range.y)
		{
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);

			return;
		}
	}
#endif

#if defined(clip_number_of_returns_enabled)
	{ // number of return filter
		vec2 range = uFilterNumberOfReturnsRange;
		if (numberOfReturns < range.x || numberOfReturns > range.y)
		{
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);

			return;
		}
	}
#endif

#if defined(clip_gps_enabled)
	{ // GPS time filter
		float time = (gpsTime + uGpsOffset) * uGpsScale;
		vec2 range = uFilterGPSTimeClipRange;

		if (time < range.x || time > range.y)
		{
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);

			return;
		}
	}
#endif

#if defined(clip_point_source_id_enabled)
	{ // point source id filter
		vec2 range = uFilterPointSourceIDClipRange;
		if (pointSourceID < range.x || pointSourceID > range.y)
		{
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);

			return;
		}
	}
#endif

	bool clip = false;
	bool isolateAnything = false;
	bool isolateThis = false;
	bool grayscaleAnything = false;
	bool grayscaleThis = true;
	bool highlight = false;
	bool active_ = false;
	bool visible = true;
	vec3 highlightColor = vec3(1.0, 1.0, 1.0); // white

#if defined(num_clusteredpointsegments) && num_clusteredpointsegments > 0
	for (int i = 0; i < num_clusteredpointsegments; i++)
	{
		if (clusteredpointsegments[i] == seg_cluster_id)
		{
			active_ = activeStates[i];
			highlight = selectedStates[i];
			visible = visibleStates[i];
			highlightColor = vec3(0, 0, 1);
			if (segmentClipTasks[i] == CLIPTASK_SHOW_OUTSIDE || !visible)
			{
				clip = true;
			}
			else if (segmentClipTasks[i] == CLIPTASK_SHOW_INSIDE)
			{
				isolateAnything = true;
				isolateThis = true;
			}
			else if (segmentClipTasks[i] == CLIPTASK_GRAYSCALE)
			{
				grayscaleAnything = true;
				grayscaleThis = false;
			}
		}
		else
		{
			if (segmentClipTasks[i] == CLIPTASK_SHOW_INSIDE)
			{
				isolateAnything = true;
			}
			else if (segmentClipTasks[i] == CLIPTASK_GRAYSCALE)
			{
				grayscaleAnything = true;
			}
		}
	}
#endif

	int clipVolumesCount = 0;
	int insideCount = 0;

	// this just assigns the hightlight value and color but seems not to be working the inside check

	// cliptasks[0] is a name, not an array

	// CLIPbOXES
	// every clipBox is defined as an inverse matrix taking from world to local space
	// so checcking in within -0.5 and 0.5 in all axes.
	// IF INSIDE, CHECK CLIP TASK AND CHANGE COLOR ACCORDINGLY
	{
#if defined(num_clipboxes) && num_clipboxes > 0
		for (int i = 0; i < num_clipboxes; i++)
		{
			// vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4(position, 1.0);
			// bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
			// inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
			// inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;

			bool inside = pointInClipBox(clipBoxes[i], position); // replacing code above

			// old code not present
			insideCount = insideCount + (inside ? 1 : 0);
			clipVolumesCount++;

			// adding highlight color
			// highlightColor = vec3(0, 0, 1.0);//setting to blue at the beginning, so
			// highlightColor = boxColors[i];//setting to blue at the beginning, so

			// CLUSTERING TOOLS CODE
			if (inside)
			{

				{ // if inside but nos a clip tasks,highlight as cyan
				  // useful for debugging
				  //	highlightColor = vec3(1, 1, 1);//cyan should not appear as is overwritten
				  // highlight= true;
				}

				if (clipTasks[i] == CLIPTASK_SHOW_OUTSIDE)
				{
					clip = true;
				}
				else if (clipTasks[i] == CLIPTASK_SHOW_INSIDE)
				{
					isolateAnything = true;
					isolateThis = true;
				}
				else if (clipTasks[i] == CLIPTASK_GRAYSCALE)
				{
					grayscaleAnything = true;
					grayscaleThis = false;
				}
				else if (clipTasks[i] == CLIPTASK_HIGHLIGHT)
				{
					highlight = true;
					highlightColor = boxColors[i];
					// highlightColor = vec3(0.5, 1.0, 0.0);
				}
				else if (clipTasks[i] == CLIPTASK_ACTIVE)
				{
					active_ = true;
				}

				//////////// adding code for custom boxvolume  , writing to selectionClipTasks
				if (selectionClipTasks[i] == CLIPTASK_HIGHLIGHT)
				{
					highlight = true;
					// highlightColor = selectionBoxColors[i]; // no esta entrando
					highlightColor = boxColors[i]; // color per clipbox
				}
				else if (selectionClipTasks[i] == CLIPTASK_ACTIVE)
				{
					active_ = true;
				}
				else if (selectionClipTasks[i] == CLIPTASK_GRAYSCALE)
				{
					grayscaleThis = true;
				}
				else if (selectionClipTasks[i] == CLIPTASK_SHOW_INSIDE)
				{
					isolateThis = true;
				}
				else if (selectionClipTasks[i] == CLIPTASK_SHOW_OUTSIDE)
				{
					isolateThis = false;
				}
			}
			else // outside
			{
				if (clipTasks[i] == CLIPTASK_SHOW_INSIDE)
				{
					isolateAnything = true;
				}
				else if (clipTasks[i] == CLIPTASK_GRAYSCALE)
				{
					grayscaleAnything = true;
				}

				// testing to set a variable to show the color
				// points outside are set to a color
				// means are not being found inside
			}
		}
#endif
	}

	// POLYGON CODE
	{ // polygonClipVolume section,
#if defined(num_clippolygons) && num_clippolygons > 0

		for (int i = 0; i < num_clippolygons; i++)
		{
			bool inside = pointInClipPolygon(position, i);

			{ // code PREVIOUS TO CLUSTERING TOOL
				insideCount = insideCount + (inside ? 1 : 0);
				clipVolumesCount++;

				// TODO, if inside, continue or break to skip  testing other polygons
				// must set the color to the polygon color but

				if (inside)
				{ // applies the corresponding color
					vColor.r = uClipPolygonColor[i].x;
					vColor.g = uClipPolygonColor[i].y;
					vColor.b = uClipPolygonColor[i].z;
					// vColor.r = 0.0;
					// vColor.g = 1.0;
					// vColor.b = 1.0;
				}
			}
		}
#endif
	}

	// IF INSIDE, CHECK COLOR AND TASK
	{ // clipVolume section   , uses  clipMethod and clipTask
		bool insideAny = insideCount > 0;
		bool insideAll = (clipVolumesCount > 0) && (clipVolumesCount == insideCount);

		if (clipMethod == CLIPMETHOD_INSIDE_ANY)
		{
			if (insideAny && clipTask == CLIPTASK_HIGHLIGHT)
			{

				vColor.r += 0.5; // default
#if defined(num_clipboxes) && num_clipboxes > 0
				if (highlight)
				{

					vColor.r = highlightColor.x;
					vColor.g = highlightColor.y;
					vColor.b = highlightColor.z;
					// vColor.r = 1.0 -  vColor.r;
					// vColor.g = 1.0 -  vColor.g;
					// vColor.b = 1.0 -  vColor.b;
					// vColor.r=highlightColor.r;
					// vColor.g=highlightColor.g;
					// vColor.b=highlightColor.b;
				}

				// {//inverted color
				// vColor.r = 1.0 -  vColor.r;
				// vColor.g = 1.0 -  vColor.g;
				// vColor.b = 1.0 -  vColor.b;
				// }

#endif

				// this was tested but
				// vColor.r += 0.5;//some constant
				// vColor.g = 0.1;//some constant
				// vColor.b = 0.1;//some constant
			}
			else if (!insideAny && clipTask == CLIPTASK_SHOW_INSIDE)
			{
				gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
			}
			else if (insideAny && clipTask == CLIPTASK_SHOW_OUTSIDE)
			{
				gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
			}
		}
		else if (clipMethod == CLIPMETHOD_INSIDE_ALL)
		{
			if (insideAll && clipTask == CLIPTASK_HIGHLIGHT)
			{
				vColor.r += 0.5; // default highlight color,
#if defined(num_clipboxes) && num_clipboxes > 0
				if (highlight)
				{

					vColor.r = highlightColor.x;
					vColor.g = highlightColor.y;
					vColor.b = highlightColor.z;
					// vColor.r = 1.0 -  vColor.r;
					// vColor.g = 1.0 -  vColor.g;
					// vColor.b = 1.0 -  vColor.b;
					// vColor.r=highlightColor.r;
					// vColor.g=highlightColor.g;
					// vColor.b=highlightColor.b;
				}

				// {//inverted color
				// vColor.r = 1.0 -  vColor.r;
				// vColor.g = 1.0 -  vColor.g;
				// vColor.b = 1.0 -  vColor.b;
				// }

#endif
			}
			else if (!insideAll && clipTask == CLIPTASK_SHOW_INSIDE)
			{
				gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
			}
			else if (insideAll && clipTask == CLIPTASK_SHOW_OUTSIDE)
			{
				gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
			}
		}
	}

	{ // CLUSTERING TOOL CODE  , uses active_, grayscaleAnything, grayscaleThis, highlight, clip, isolateAnything, isolateThis

		if ((isolateAnything && !isolateThis) || clip)
		{
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}
		else if (active_)
		{
			float grayScale75p = 3.0 * (0.299 * vColor.r + 0.587 * vColor.g + 0.114 * vColor.b) / 4.0;
			vColor.r = grayScale75p + 0.71 / 2.0;
			vColor.g = grayScale75p + 1.0 / 2.0;
			vColor.b = grayScale75p + 0.631 / 2.0;
		}
		else if (highlight)
		{
			float grayScale75p = 3.0 * (0.299 * vColor.r + 0.587 * vColor.g + 0.114 * vColor.b) / 4.0;
			vColor.r = grayScale75p + highlightColor.r / 2.0;
			vColor.g = grayScale75p + highlightColor.g / 2.0;
			vColor.b = grayScale75p + highlightColor.b / 2.0;

			// vColor.r = 0.0;
			// vColor.g = 1.0;
			// vColor.b =  0.0;
		}
		else if (grayscaleAnything && grayscaleThis)
		{
			float grayScale = 0.299 * vColor.r + 0.587 * vColor.g + 0.114 * vColor.b;
			vColor.r = grayScale;
			vColor.g = grayScale;
			vColor.b = grayScale;
		}
	}

	// hightlight never arived, triying boxColor
	//  #if defined(num_clipboxes) && num_clipboxes > 0
	//  vColor.r = boxColors[0].x;
	//  vColor.g = boxColors[0].y;
	//  vColor.b =  boxColors[0].z;
	//  #endif
}

// Filtering is set appart from  clipping by passing through a set of spatial an logical filters
// the general worlkflow is a cascade  of  spatial  and logical filters, so resulting poing gets a true or false value
// post actions after filtering are can be highlight, color replacement as value replacement or show/hide

//   [ FILTERtype1, FILTERType2, ..., STOP, FILTERTypeN, STOP, FILTERTypeN+1, ...]

// works differently from clipping, as it does not take in or out directly points, just signals them with true or false

#define FILTER_STOP 0
#define FILTER_BOXVOLUME 1
#define FILTER_POLYGON 4
#define FILTER_POLYGONVOLUME 5
#define FILTER_LOGIC 10
#define FILTER_NONE 255

// #define num_clipboxes 22//added outside, while defining the uniform list
//  check all the required variables are defined

// #define num_mixed_filters 22//come from outside
// uniform int uMixedFilters[num_mixed_filters]; // mixed filters list, each entry is an action in sequence

// PLACES TO LOOK AT
// scene ???  After adding a Volume or  polygonClipVolume, an event is dispatched
// polygon_volume_clip_added and volume_added
// and the corresponding items are added to the arrays

// places to look at

// 1) ui feeds scene data
// 2) actual data is stored in scene.js
// 3) viewer.js   @ update()  sET THE CORRESPONDING POINTCLOUD MATERIAL UNIFORMS automatically from material
// 4) pointcloudmaterial.js  @ update()  SET THE CORRESPONDING POINTCLOUD MATERIAL UNIFORMS and defines

// 5) POTREERENDERER.JS    add or update DEFINES FOR CONSTANTS IN renderOctree()
//					SET UNIFORMS FOR REQUIRED ARRAYS LIKE CLIPBOXES, POLYGONcLIPBOXES, CLIPBOXES,
//  MIXEDFILTERS IS SPECIFICALLY ADDED TO HAVE THIS METHOD WORKING

// This place is easier to work as here directly things are added

bool doFiltering()
{

	// bool highlight = false;

	// vec3 highlightColor = vec3(1.0, 1.0, 1.0); // white

	// bool inside = true;
	//
	bool globalValue = false;		// global value for all applied filters . all stacked filters are evaluated by OR
	bool currentFilterValue = true; // Each filter list until STOP is evaluated by AND by default but some steps can be OR or XOR evaluated
	vec3 current_xyz = position;	// if some other positional filters applied

	bool skip = false; // skip the rest of the filters, if one is not passed. Experimental
	bool stopped = true;

	// code for complex spatial and logical filtering. depends on a filter list
	//[ filterType1, filterType2, ..., stop,filterTypeN, stop, filterTypeN+1, ...]
	//  where stop is a value that indicates the end of the filter and compute output values
	// at the end all data is cascaded

	{
		// all objects must be defined
#if defined(mixed_filters) && mixed_filters > 0

		// dont check other variables as they were required to reach this state, but are still commited

		int filterIndex = 0;
		int polygonFilterIndex = 0;
		int boxFilterIndex = 0;
		int logicFilterIndex = 0;
		int integerIndex = 0;
		int floatIndex = 0;

		float current_value = aExtra; // move this attribute

		for (int i = 0; i < mixed_filters; i++)
		{

			// each entry in the filter list points to a filter type or an stop value
			int filterType = uMixedFilters[i];

			if (filterType == FILTER_STOP)
			{

				// stop value, means end of the filter list
				if (i == 0)
				{
					// if is the first filter, just return the false value
					currentFilterValue = false; // return true or false, depending on the filters applied
				}
				globalValue = globalValue || currentFilterValue; // OR operation
				currentFilterValue = true;						 // reset for next filter
				skip = false;									 // reset skip for next filter
				stopped = true;
				continue; // continue to next
			}
			stopped = false;
#if defined(num_clipboxes) && num_clipboxes > 0
			if (filterType == FILTER_BOXVOLUME)
			{
				// check if point ins inside box

				if (!skip)
				{
					currentFilterValue = currentFilterValue && pointInClipBox(clipBoxes[boxFilterIndex], position);
					skip = !currentFilterValue; // if is false, skip the rest of the filters until stop
				}
				// currentFilterValue = currentFilterValue && pointInClipBox(clipBoxes[boxFilterIndex], position);

				boxFilterIndex++;
				continue; // continue to next
			}
#endif

#if defined(num_clippolygons) && num_clippolygons > 0
			if (filterType == FILTER_POLYGONVOLUME)
			{
				if (!skip)
				{
					currentFilterValue = currentFilterValue && pointInClipPolygon(position, polygonFilterIndex);
					skip = !currentFilterValue; // if is false, skip the rest of the filters until stop
				}
				// check if point ins inside box

				polygonFilterIndex++;
				continue; // continue to next
			}
#endif

#if defined(num_logical_filters) && num_logical_filters > 0

			if (filterType == FILTER_LOGIC)
			{

				int currentOperator = uFilterList[logicFilterIndex++];
				int attribIdx = uFilterList[logicFilterIndex++];
				int index1 = uFilterList[logicFilterIndex++];
				int index2 = uFilterList[logicFilterIndex++];
				int listType = uFilterList[logicFilterIndex++];

				float currAttVal = classification; // TODO change it

				if (listType == 1)
				{

					currentFilterValue = (currentFilterValue && doLogicalEval(currentOperator, currAttVal, uFloatFilterValues[floatIndex++], index1, index2));
				}
				// currentInside = true; //
				//  logicFilterIndex++;
				continue; // continue to next
			}
#endif

			// other filters

			if (filterType == FILTER_NONE)
			{
				// check if point ins inside box
				currentFilterValue = currentFilterValue && true; //
				continue;										 // continue to next
			}
		}

		// 	vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4(position, 1.0);
		// 	bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
		// 	inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
		// 	inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;

		// 	bool inside= pointInClipBox(clipBoxes[i], position);//replacing code above

		// 	insideCount = insideCount + (inside ? 1 : 0);
		// 	clipVolumesCount++;

#endif
	}
	if (!stopped)
	{
		globalValue = globalValue || currentFilterValue; // OR operation for the last filter
														 // return false; // return false, point is not visible
	}

	return globalValue; // return the global value, true or false, depending on the filters applied
}

//
// ##     ##    ###    #### ##    ##
// ###   ###   ## ##    ##  ###   ##
// #### ####  ##   ##   ##  ####  ##
// ## ### ## ##     ##  ##  ## ## ##
// ##     ## #########  ##  ##  ####
// ##     ## ##     ##  ##  ##   ###
// ##     ## ##     ## #### ##    ##
//

void main()
{
	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
	vViewPosition = mvPosition.xyz;
	gl_Position = projectionMatrix * mvPosition;
	vLogDepth = log2(-mvPosition.z);

	// gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
	// gl_PointSize = 5.0;

	// POINT SIZE
	float pointSize = getPointSize();
	// float pointSize = 2.0;
	gl_PointSize = pointSize;
	vPointSize = pointSize;

	isVisible = 1;

	// #if defined(custom_range)
	// if(allVisible[0] == 0.0)	{
	// 	isVisible=0;
	// } //color for the min value
	// #endif

	// COLOR
	// vOpacity = 1.0;

	vColor = getColor();

	// gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
	// gl_Position = vec4(position.xzy / 1000.0, 1.0 );

	// gl_PointSize = 5.0;
	// vColor = vec3(1.0, 1.0, 1.0);

	// only for "replacing" approaches
	// if(getLOD() != uLevel){
	// 	gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
	// }

#if defined hq_depth_pass
	float originalDepth = gl_Position.w;
	float adjustedDepth = originalDepth + 2.0 * vRadius;
	float adjust = adjustedDepth / originalDepth;

	mvPosition.xyz = mvPosition.xyz * adjust;
	gl_Position = projectionMatrix * mvPosition;
#endif

	// CLIPPING
	doClipping();

#if defined(mixed_filters) && mixed_filters > 0
	bool res = doFiltering();

	if (res)
	{
		vColor = vec3(1.0, 1.0, 0.0); // yellow highlight on selection
	}
#endif

#if defined(num_clipspheres) && num_clipspheres > 0
	for (int i = 0; i < num_clipspheres; i++)
	{
		vec4 sphereLocal = uClipSpheres[i] * mvPosition;

		float distance = length(sphereLocal.xyz);

		if (distance < 1.0)
		{
			float w = distance;
			vec3 cGradient = texture(gradient, vec2(w, 1.0 - w)).rgb;

			vColor = cGradient;
			// vColor = cGradient * 0.7 + vColor * 0.3;
		}
	}
#endif

#if defined(num_shadowmaps) && num_shadowmaps > 0

	const float sm_near = 0.1;
	const float sm_far = 10000.0;

	for (int i = 0; i < num_shadowmaps; i++)
	{
		vec3 viewPos = (uShadowWorldView[i] * vec4(position, 1.0)).xyz;
		float distanceToLight = abs(viewPos.z);

		vec4 projPos = uShadowProj[i] * uShadowWorldView[i] * vec4(position, 1);
		vec3 nc = projPos.xyz / projPos.w;

		float u = nc.x * 0.5 + 0.5;
		float v = nc.y * 0.5 + 0.5;

		vec2 sampleStep = vec2(1.0 / (2.0 * 1024.0), 1.0 / (2.0 * 1024.0)) * 1.5;
		vec2 sampleLocations[9];
		sampleLocations[0] = vec2(0.0, 0.0);
		sampleLocations[1] = sampleStep;
		sampleLocations[2] = -sampleStep;
		sampleLocations[3] = vec2(sampleStep.x, -sampleStep.y);
		sampleLocations[4] = vec2(-sampleStep.x, sampleStep.y);

		sampleLocations[5] = vec2(0.0, sampleStep.y);
		sampleLocations[6] = vec2(0.0, -sampleStep.y);
		sampleLocations[7] = vec2(sampleStep.x, 0.0);
		sampleLocations[8] = vec2(-sampleStep.x, 0.0);

		float visibleSamples = 0.0;
		float numSamples = 0.0;

		float bias = vRadius * 2.0;

		for (int j = 0; j < 9; j++)
		{
			vec4 depthMapValue = texture(uShadowMap[i], vec2(u, v) + sampleLocations[j]);

			float linearDepthFromSM = depthMapValue.x + bias;
			float linearDepthFromViewer = distanceToLight;

			if (linearDepthFromSM > linearDepthFromViewer)
			{
				visibleSamples += 1.0;
			}

			numSamples += 1.0;
		}

		float visibility = visibleSamples / numSamples;

		if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0 || nc.x < -1.0 || nc.x > 1.0 || nc.y < -1.0 || nc.y > 1.0 || nc.z < -1.0 || nc.z > 1.0)
		{
			// vColor = vec3(0.0, 0.0, 0.2);
		}
		else
		{
			// vColor = vec3(1.0, 1.0, 1.0) * visibility + vec3(1.0, 1.0, 1.0) * vec3(0.5, 0.0, 0.0) * (1.0 - visibility);
			vColor = vColor * visibility + vColor * uShadowColor * (1.0 - visibility);
		}
	}

#endif
}
