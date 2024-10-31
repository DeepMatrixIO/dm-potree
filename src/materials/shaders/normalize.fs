// #version 300 es // normalize.fs  not added in PointCloudMaterial.js

// #extension GL_EXT_frag_depth : enable

precision mediump float;
precision mediump int;

uniform sampler2D uWeightMap;
uniform sampler2D uDepthMap;

in vec2 vUv;
out vec4 fragColor;

void main()
{
	// float depth = texture2D(uDepthMap, vUv).r;
	float depth = texture(uDepthMap, vUv).r;

	if (depth >= 1.0)
	{
		discard;
	}

	// gl_FragColor = vec4(depth, 1.0, 0.0, 1.0);
	fragColor = vec4(depth, 1.0, 0.0, 1.0);

	vec4 color = texture2D(uWeightMap, vUv);
	color = color / color.w;

	// gl_FragColor = vec4(color.xyz, 1.0);
	fragColor = vec4(color.xyz, 1.0);

	// gl_FragDepthEXT = depth;
	gl_FragDepth = depth;
}