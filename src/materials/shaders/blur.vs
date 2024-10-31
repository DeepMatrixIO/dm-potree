
#version 300 es // PointCloudMaterial does not add it unline eyeDomeLighthing Material
// blur.vs
out vec2 vUv;

void main()
{
	vUv = uv;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}