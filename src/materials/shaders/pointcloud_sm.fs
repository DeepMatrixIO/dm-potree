#version 300 es // pointcloud_sm.fs Shadow Mapping
precision mediump float;
precision mediump int;

in vec3 vColor;
in float vLinearDepth;

// added
out vec4 fragColor;
void main()
{

	// gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
	// gl_FragColor = vec4(vColor, 1.0);
	// gl_FragColor = vec4(vLinearDepth, pow(vLinearDepth, 2.0), 0.0, 1.0);

	// gl_FragColor = vec4(vLinearDepth, vLinearDepth / 30.0, vLinearDepth / 30.0, 1.0);
	fragColor = vec4(vLinearDepth, vLinearDepth / 30.0, vLinearDepth / 30.0, 1.0);
}
