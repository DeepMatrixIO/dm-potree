
#version 300 es // PointCloudMaterial does not add it unline eyeDomeLighthing Material
out vec2 vUv;

void main()
{
	vUv = uv;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}