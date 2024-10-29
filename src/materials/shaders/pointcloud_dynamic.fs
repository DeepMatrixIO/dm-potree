#version 300 es //

precision highp float;
precision highp int;

in vec3 vColor;
// added
out vec4 fragColor;

void main()
{

	vec3 color = vColor;

	// gl_FragColor = vec4(color, 1.0);
	fragColor = vec4(color, 1.0);
}
