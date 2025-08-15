import * as THREE from "three";

/**
 * PROPER CONTINUOUS SPIRAL SHADERS
 * Generate tube surface mathematically - no discrete sampling!
 */

export const spiralTubeVertexShader = `
uniform float time;
uniform float spiralRotationSpeed;
uniform float pulsationSpeed;
uniform float pulsationAmplitude;
uniform float baseRadius;
uniform float tubeRadius;
uniform float totalLength;
uniform float spiralTurns;
uniform float segmentSpacing;

// Worm spine data
uniform vec3 spinePositions[100];  // Max 100 spine segments
uniform vec3 spineTangents[100];
uniform int numSpineSegments;

// Vertex attributes for the tube surface
attribute float lengthParam;     // 0-1 along spiral length
attribute float angleParam;      // 0-2π around tube circumference

varying float vLengthParam;
varying float vAngleParam;
varying vec3 vWorldPosition;
varying vec3 vNormal;

// Function to get spine position and frame at parameter t
void getSpineFrame(float t, out vec3 position, out vec3 tangent, out vec3 normal, out vec3 binormal) {
    // Find which spine segments to interpolate between
    float segmentFloat = t * float(numSpineSegments - 1);
    int segmentIndex = int(floor(segmentFloat));
    float segmentFrac = segmentFloat - float(segmentIndex);
    
    // Clamp indices
    int seg1 = min(segmentIndex, numSpineSegments - 1);
    int seg2 = min(segmentIndex + 1, numSpineSegments - 1);
    
    // Interpolate spine position and tangent
    position = mix(spinePositions[seg1], spinePositions[seg2], segmentFrac);
    tangent = normalize(mix(spineTangents[seg1], spineTangents[seg2], segmentFrac));
    
    // Calculate normal and binormal
    if (abs(tangent.y) < 0.9) {
        normal = normalize(cross(vec3(0.0, 1.0, 0.0), tangent));
    } else {
        normal = normalize(cross(vec3(1.0, 0.0, 0.0), tangent));
    }
    binormal = normalize(cross(tangent, normal));
}

void main() {
    // Get spine frame at this length parameter
    vec3 spinePos, spineTangent, spineNormal, spineBinormal;
    getSpineFrame(lengthParam, spinePos, spineTangent, spineNormal, spineBinormal);
    
    // Calculate spiral angle - this creates the continuous helix!
    float spiralAngle = lengthParam * spiralTurns * 6.28318531 + spiralRotationSpeed * time;
    
    // Calculate spiral radius with taper and pulsation
    float radiusTaper = 0.3 + 0.7 * cos(lengthParam * 1.5707963); // pi/2
    float pulsation = 1.0 + pulsationAmplitude * sin(time * pulsationSpeed + lengthParam * 12.566371); // 4*pi
    float spiralRadius = baseRadius * radiusTaper * pulsation;
    
    // Calculate center of spiral at this length
    vec3 spiralCenter = spinePos + spiralRadius * (
        cos(spiralAngle) * spineNormal + 
        sin(spiralAngle) * spineBinormal
    );
    
    // Calculate local tube frame at spiral center
    vec3 tubeDirection = normalize(spiralRadius * (
        -sin(spiralAngle) * spineNormal + 
        cos(spiralAngle) * spineBinormal
    ));
    vec3 tubeTangent = spineTangent;
    vec3 tubeNormal = normalize(cross(tubeTangent, tubeDirection));
    vec3 tubeBinormal = normalize(cross(tubeNormal, tubeTangent));
    
    // Generate point on tube surface using angleParam
    vec3 tubeOffset = tubeRadius * (
        cos(angleParam) * tubeNormal + 
        sin(angleParam) * tubeBinormal
    );
    
    // Final world position
    vec3 worldPosition = spiralCenter + tubeOffset;
    
    // Calculate surface normal for lighting
    vec3 surfaceNormal = cos(angleParam) * tubeNormal + sin(angleParam) * tubeBinormal;
    
    vLengthParam = lengthParam;
    vAngleParam = angleParam;
    vWorldPosition = worldPosition;
    vNormal = surfaceNormal;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
}
`;

export const spiralTubeFragmentShader = `
uniform float time;
uniform vec3 colorStart;
uniform vec3 colorMid;
uniform vec3 colorEnd;

varying float vLengthParam;
varying float vAngleParam;
varying vec3 vWorldPosition;
varying vec3 vNormal;

// Color function f(t)
vec3 getWormColor(float t) {
    // Animated rainbow
    float hue = fract(t + time * 0.1) * 6.0;
    float c = 0.8;
    float v = 0.9;
    
    float x = c * (1.0 - abs(mod(hue, 2.0) - 1.0));
    
    vec3 rgb;
    if (hue < 1.0) rgb = vec3(c, x, 0.0);
    else if (hue < 2.0) rgb = vec3(x, c, 0.0);
    else if (hue < 3.0) rgb = vec3(0.0, c, x);
    else if (hue < 4.0) rgb = vec3(0.0, x, c);
    else if (hue < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    
    return rgb * v;
}

void main() {
    // Get base color from position along worm
    vec3 baseColor = getWormColor(vLengthParam);
    
    // Simple lighting calculation
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float lightIntensity = max(0.3, dot(normalize(vNormal), lightDir));
    
    // Add some variation around tube circumference
    float circumferenceVariation = 0.9 + 0.1 * sin(vAngleParam * 2.0);
    
    vec3 finalColor = baseColor * lightIntensity * circumferenceVariation;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * Color function type
 */
export type ColorFunction = (t: number, time: number) => THREE.Color;

/**
 * Optimized color functions
 */
export const colorFunctions = {
	rainbow: (t: number, time: number): THREE.Color => {
		const hue = (t + time * 0.1) % 1.0;
		return new THREE.Color().setHSL(hue, 0.8, 0.6);
	},

	fireGradient: (t: number, time: number): THREE.Color => {
		const phase = t + time * 0.2;
		const r = Math.min(1, 0.5 + phase);
		const g = Math.min(1, Math.max(0, phase - 0.3));
		const b = Math.min(1, Math.max(0, phase - 0.7));
		return new THREE.Color(r, g, b);
	},

	oceanWave: (t: number, time: number): THREE.Color => {
		const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 3 + time);
		return new THREE.Color(0, 0.4 + wave * 0.4, 0.8 + wave * 0.2);
	},

	electricPulse: (t: number, time: number): THREE.Color => {
		const pulse = Math.abs(Math.sin(t * Math.PI * 8 + time * 4));
		return new THREE.Color(0, 0.5 + pulse * 0.5, 1);
	},
};
