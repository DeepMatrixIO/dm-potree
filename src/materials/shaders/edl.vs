// edl.vs updated to webgl 2, added glsl to RAWShaderMaterial
in vec3 position;
in vec2 uv;

uniform mat4 modelViewMatrix; // comes from
uniform mat4 projectionMatrix;

out vec2 vUv;

void main()
{
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}