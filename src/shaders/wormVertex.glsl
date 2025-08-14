uniform float uTime;
uniform float uRadius;
uniform float uPulseAmplitude;
uniform float uTotalHeight;

attribute float instanceDistanceStart; // from Worm.ts for per-vertex radius
attribute vec3 position;

void main() {
    float t = position.y / uTotalHeight;

    // Spiral rotation angle: rotates along the Y axis + time
    float angle = t * 6.2831 + uTime * 3.0;

    // Pulsating radius
    float radius = instanceDistanceStart * (1.0 + uPulseAmplitude * sin(uTime * 4.0 + t * 12.0));

    vec3 offset = vec3(cos(angle), 0.0, sin(angle)) * radius;

    vec3 pos = position + offset;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
