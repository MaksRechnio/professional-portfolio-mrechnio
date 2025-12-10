import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: false
});
renderer.setClearColor(0x000000, 0);

const container = document.getElementById('canvas-container');
const containerRect = container.getBoundingClientRect();
renderer.setSize(containerRect.width, containerRect.height);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Mouse tracking with trail and momentum
const mouse = new THREE.Vector2(0.5, 0.5);
const mouseVelocity = new THREE.Vector2(0, 0);
const mouseTrail = []; // Store {x, y, time} objects
const mouseClicks = []; // Store {x, y, time} objects for click ripples
let isHovering = false;
let time = 0;
let lastMouseTime = 0;
let lastMousePos = new THREE.Vector2(0.5, 0.5);

// Global mouse position for picture and text movement
let globalMouseX = 0.5;
let globalMouseY = 0.5;

const textureLoader = new THREE.TextureLoader();
let profileTexture;
let shaderMaterial;

// 100px width = 50px radius in normalized coordinates
let revealRadiusNormalized = 0.15;

function calculateRevealRadius() {
    const containerRect = container.getBoundingClientRect();
    // Use width for horizontal, height for vertical - use the smaller to ensure it fits
    const minDimension = Math.min(containerRect.width, containerRect.height);
    // 140px wide = 70px radius (decreased from 80px)
    revealRadiusNormalized = (70.0) / minDimension;
    console.log('Reveal radius:', revealRadiusNormalized, 'for 100px width, container:', containerRect.width, 'x', containerRect.height);
}

function initTextures() {
    textureLoader.load('profile-pic.png', (profile) => {
        profileTexture = profile;
        profileTexture.minFilter = THREE.LinearFilter;
        profileTexture.magFilter = THREE.LinearFilter;
        console.log('Profile texture loaded:', profile.width, 'x', profile.height);

        calculateRevealRadius();
        createShaderMaterial();
    }, undefined, (error) => {
        console.error('Error loading profile-pic.png:', error);
    });
}

function createShaderMaterial() {
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform sampler2D profileTexture;
        uniform vec2 mousePosition;
        uniform vec2 mouseTrail[20];
        uniform float trailTimes[20];
        uniform int trailCount;
        uniform vec2 mouseClicks[5];
        uniform float clickTimes[5];
        uniform int clickCount;
        uniform bool isHovering;
        uniform float time;
        uniform vec2 resolution;
        uniform float revealRadius;
        varying vec2 vUv;

        // Noise function for flow animation
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        // Flow-based noise for smooth movement
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        // Generate dense animated dots with flow movement (white and black)
        vec3 animatedDots(vec2 uv) {
            // More dense grid for more dots
            float dotSpacing = 2.0;
            vec2 grid = floor(uv * resolution / dotSpacing);
            vec2 gridUV = fract(uv * resolution / dotSpacing);
            
            // Create more dynamic flow field for movement
            vec2 flow = vec2(
                sin(time * 1.2 + grid.x * 0.15 + grid.y * 0.2) * 0.8,
                cos(time * 1.0 + grid.y * 0.18 + grid.x * 0.12) * 0.8
            );
            
            // Add more intense noise-based flow for dynamics
            vec2 noiseFlow = vec2(
                noise(grid * 0.4 + time * 0.8) - 0.5,
                noise(grid * 0.4 + time * 0.8 + vec2(100.0)) - 0.5
            ) * 0.6;
            
            // Add secondary turbulence layer for more chaos
            vec2 turbulence = vec2(
                noise(grid * 0.6 - time * 0.6) - 0.5,
                noise(grid * 0.6 - time * 0.6 + vec2(50.0)) - 0.5
            ) * 0.4;
            
            // Combine flows for more dynamic movement
            vec2 totalFlow = flow + noiseFlow + turbulence;
            
            // Animate position with more dynamic flow
            vec2 animatedPos = gridUV - 0.5 + totalFlow * 0.3;
            
            // Create pulsing/disappearing effect
            float pulse = sin(time * 2.5 + random(grid) * 6.28) * 0.5 + 0.5;
            float fade = smoothstep(0.2, 0.8, pulse);
            
            // Create dot shape with specified size
            float dist = length(animatedPos);
            float dot = smoothstep(0.25, 0.13, dist) * fade; // Smaller dots (0.25, 0.13)
            
            // Randomly show/hide dots for flow effect (more dots visible)
            float visibility = step(0.15, random(grid + time * 0.1)); // Lower threshold = more visible
            dot *= visibility;
            
            // Alternate between white and black dots
            float dotType = mod(grid.x + grid.y, 2.0);
            vec3 whiteDot = vec3(1.0, 1.0, 1.0);
            vec3 blackDot = vec3(0.0, 0.0, 0.0);
            
            float colorVariation = random(grid * 0.7);
            vec3 dotColor = mix(whiteDot, blackDot, dotType);
            
            if (colorVariation > 0.7) {
                dotColor = mix(dotColor, dotType < 0.5 ? whiteDot : blackDot, 0.5);
            }
            
            return dotColor * dot;
        }

        // Calculate distance to fluid stroke trail
        float distanceToTrail(vec2 uv) {
            float minDist = 999.0;
            
            // Check distance to current mouse position first (head of stroke)
            float distToMouse = distance(uv, mousePosition);
            float headRadius = revealRadius;
            minDist = distToMouse / headRadius;
            
            // Then check trail segments (limit to actual count for performance)
            int maxCheck = trailCount < 15 ? trailCount : 15;
            for (int i = 0; i < maxCheck; i++) {
                if (i >= trailCount) break;
                
                vec2 trailPos = mouseTrail[i];
                vec2 nextTrailPos = (i < trailCount - 1) ? mouseTrail[i + 1] : mousePosition;
                
                // Calculate distance to line segment
                vec2 lineDir = nextTrailPos - trailPos;
                float lineLen = length(lineDir);
                
                // Skip if segment is too short (prevents glitches)
                if (lineLen < 0.001) continue;
                
                vec2 toPoint = uv - trailPos;
                float t = clamp(dot(toPoint, lineDir) / (lineLen * lineLen), 0.0, 1.0);
                vec2 closestPoint = trailPos + lineDir * t;
                float dist = distance(uv, closestPoint);
                
                // Fade based on age (older points fade out)
                float age = trailTimes[i];
                float ageFade = smoothstep(1.0, 0.3, age); // Fade out over 1 second
                
                // Add dynamic turbulence to thickness for more fluid-like behavior
                float noiseValue = noise(trailPos * 12.0 + time * 1.5);
                float turbulence = (noiseValue - 0.5) * 0.4; // -0.2 to 0.2 variation
                
                // Add position-based turbulence for unpredictable shape
                vec2 turbulenceOffset = vec2(
                    noise(trailPos * 10.0 + time * 1.0) - 0.5,
                    noise(trailPos * 10.0 + time * 1.0 + vec2(100.0)) - 0.5
                ) * 0.06 * (1.0 - age * 0.3);
                
                // Make stroke wider with dynamic thickness - thicker at head, slightly thinner at tail
                // Base radius is revealRadius (50px = 100px wide)
                float baseThickness = revealRadius * (1.0 - age * 0.2); // Slight taper
                float thickness = baseThickness * (1.0 + turbulence); // Dynamic width variation
                
                // Apply turbulence to position
                vec2 turbulentPoint = closestPoint + turbulenceOffset;
                float turbulentDist = distance(uv, turbulentPoint);
                float normalizedDist = turbulentDist / thickness;
                
                // Only consider if within stroke and not faded out
                if (normalizedDist < 1.0 && ageFade > 0.01) {
                    minDist = min(minDist, normalizedDist * ageFade);
                }
            }
            
            return minDist;
        }

        // Calculate distance to click ripple effect
        float distanceToClickRipple(vec2 uv) {
            float minDist = 999.0;
            
            // Check all click ripples
            int maxCheck = clickCount < 5 ? clickCount : 5;
            for (int i = 0; i < maxCheck; i++) {
                if (i >= clickCount) break;
                
                vec2 clickPos = mouseClicks[i];
                float clickAge = time - clickTimes[i];
                
                // Ripple lasts for 0.6 seconds
                if (clickAge > 0.6) continue;
                
                float dist = distance(uv, clickPos);
                
                // Ripple expands outward over time with wave effect
                float rippleRadius = revealRadius * (0.2 + clickAge * 1.5);
                
                // Add wave pattern to ripple (wave speed 15)
                float wave = sin(dist * 20.0 - clickAge * 15.0) * 0.1;
                rippleRadius += wave * revealRadius;
                
                // Calculate normalized distance
                float normalizedDist = dist / rippleRadius;
                
                // Fade out over time
                float fade = smoothstep(0.6, 0.0, clickAge);
                
                if (normalizedDist < 1.2 && fade > 0.01) {
                    minDist = min(minDist, normalizedDist * fade);
                }
            }
            
            return minDist;
        }

        // Create enhanced 3D shadow with multiple layers on both sides
        float createShadow(vec2 uv) {
            vec2 shadowOffsetRight = vec2(0.025, -0.008); // Rightward and slightly up (main light from left)
            vec2 shadowOffsetLeft = vec2(-0.015, -0.005); // Leftward and slightly up (secondary light from right)
            float shadowIntensity = 0.0;
            
            // RIGHT SIDE SHADOWS (main shadow)
            // Layer 1: Close shadow (sharp, dark)
            int samples1 = 9;
            float blurRadius1 = 0.006; // Tighter blur for close shadow
            float layer1Intensity = 0.0;
            
            for (int x = -1; x <= 1; x++) {
                for (int y = -1; y <= 1; y++) {
                    vec2 sampleOffset = shadowOffsetRight * 0.6 + vec2(float(x), float(y)) * blurRadius1;
                    vec4 shadowSample = texture2D(profileTexture, uv + sampleOffset);
                    float weight = 1.0 - length(vec2(float(x), float(y))) * 0.3;
                    layer1Intensity += shadowSample.a * weight;
                }
            }
            layer1Intensity /= float(samples1);
            
            // Layer 2: Mid shadow (medium blur)
            int samples2 = 25;
            float blurRadius2 = 0.012; // Medium blur
            float layer2Intensity = 0.0;
            
            for (int x = -2; x <= 2; x++) {
                for (int y = -2; y <= 2; y++) {
                    vec2 sampleOffset = shadowOffsetRight * 0.8 + vec2(float(x), float(y)) * blurRadius2;
                    vec4 shadowSample = texture2D(profileTexture, uv + sampleOffset);
                    float weight = 1.0 - length(vec2(float(x), float(y))) * 0.2;
                    layer2Intensity += shadowSample.a * weight;
                }
            }
            layer2Intensity /= float(samples2);
            
            // Layer 3: Far shadow (large blur, soft)
            int samples3 = 25;
            float blurRadius3 = 0.020; // Large blur for soft shadow
            float layer3Intensity = 0.0;
            
            for (int x = -2; x <= 2; x++) {
                for (int y = -2; y <= 2; y++) {
                    vec2 sampleOffset = shadowOffsetRight * 1.0 + vec2(float(x), float(y)) * blurRadius3;
                    vec4 shadowSample = texture2D(profileTexture, uv + sampleOffset);
                    float weight = 1.0 - length(vec2(float(x), float(y))) * 0.15;
                    layer3Intensity += shadowSample.a * weight;
                }
            }
            layer3Intensity /= float(samples3);
            
            // LEFT SIDE SHADOWS (secondary shadow for depth)
            // Layer 4: Left side shadow (softer, less intense)
            float layer4Intensity = 0.0;
            
            for (int x = -1; x <= 1; x++) {
                for (int y = -1; y <= 1; y++) {
                    vec2 sampleOffset = shadowOffsetLeft * 0.7 + vec2(float(x), float(y)) * blurRadius2;
                    vec4 shadowSample = texture2D(profileTexture, uv + sampleOffset);
                    float weight = 1.0 - length(vec2(float(x), float(y))) * 0.3;
                    layer4Intensity += shadowSample.a * weight;
                }
            }
            layer4Intensity /= float(samples1);
            
            // Layer 5: Left side far shadow (very soft)
            float layer5Intensity = 0.0;
            
            for (int x = -2; x <= 2; x++) {
                for (int y = -2; y <= 2; y++) {
                    vec2 sampleOffset = shadowOffsetLeft * 1.0 + vec2(float(x), float(y)) * blurRadius3;
                    vec4 shadowSample = texture2D(profileTexture, uv + sampleOffset);
                    float weight = 1.0 - length(vec2(float(x), float(y))) * 0.15;
                    layer5Intensity += shadowSample.a * weight;
                }
            }
            layer5Intensity /= float(samples2);
            
            // Combine layers with different opacities for depth
            // Right side shadows (stronger) + Left side shadows (softer)
            shadowIntensity = layer1Intensity * 0.6 + layer2Intensity * 0.3 + layer3Intensity * 0.2 + 
                             layer4Intensity * 0.15 + layer5Intensity * 0.1;
            
            return shadowIntensity * 0.7; // Overall shadow intensity
        }

        void main() {
            vec4 profileColor = texture2D(profileTexture, vUv);
            
            // Reduce saturation by 10%
            float luminance = dot(profileColor.rgb, vec3(0.299, 0.587, 0.114)); // Convert to grayscale
            vec3 desaturatedColor = mix(profileColor.rgb, vec3(luminance), 0.1); // Mix with grayscale (10% reduction)
            profileColor.rgb = desaturatedColor;
            
            // Create iOS-style blurred shadow (always rendered first)
            float shadowAlpha = createShadow(vUv);
            vec4 shadowLayer = vec4(0.0, 0.0, 0.0, shadowAlpha);
            
            // Start with shadow as base layer
            vec4 finalColor = shadowLayer;
            
            // If hovering, reveal dots underneath through fluid stroke
            if (isHovering) {
                // Calculate distance to fluid stroke trail
                float trailDist = distanceToTrail(vUv);
                
                // Calculate distance to click ripple
                float rippleDist = distanceToClickRipple(vUv);
                
                // Combine trail and ripple - use the closest one
                float combinedDist = min(trailDist, rippleDist);
                
                // Create fluid stroke mask - completely soft edge, no visible stroke
                // Very smooth transition for seamless fluid effect
                float strokeMask = 1.0 - smoothstep(0.5, 1.0, combinedDist);
                
                // CRITICAL: Only reveal dots where stroke exists AND within silhouette
                // This prevents showing dots outside the silhouette outline
                if (strokeMask > 0.01 && profileColor.a > 0.1) {
                    // Generate animated dots (white and black)
                    vec3 dots = animatedDots(vUv);
                    
                    // Background color (#0C042D = rgb(12, 4, 45)) with 30% opacity
                    vec3 bgColor = vec3(12.0/255.0, 4.0/255.0, 45.0/255.0);
                    
                    // Mix background with dots - dots already contain their colors
                    float dotIntensity = length(dots);
                    vec3 fluidRGB = mix(bgColor, dots, dotIntensity);
                    float fluidAlpha = profileColor.a * strokeMask * 0.3; // 30% opacity
                    
                    // Composite layers: shadow (base) + fluid (on top)
                    // Shadow stays visible by compositing fluid on top of shadow
                    finalColor.rgb = mix(shadowLayer.rgb, fluidRGB, fluidAlpha);
                    finalColor.a = shadowAlpha + fluidAlpha * (1.0 - shadowAlpha); // Proper alpha blending
                } else {
                    // Draw silhouette on top of shadow (outside stroke area)
                    if (profileColor.a > 0.1) {
                        finalColor.rgb = mix(shadowLayer.rgb, profileColor.rgb, profileColor.a);
                        finalColor.a = shadowAlpha + profileColor.a * (1.0 - shadowAlpha); // Keep shadow visible
                    }
                }
            } else {
                // Draw silhouette on top of shadow (when not hovering)
                if (profileColor.a > 0.1) {
                    finalColor.rgb = mix(shadowLayer.rgb, profileColor.rgb, profileColor.a);
                    finalColor.a = shadowAlpha + profileColor.a * (1.0 - shadowAlpha); // Keep shadow visible
                }
            }
            
            gl_FragColor = finalColor;
        }
    `;

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            profileTexture: { value: profileTexture },
            mousePosition: { value: new THREE.Vector2(0.5, 0.5) },
            mouseTrail: { value: new Array(20).fill(null).map(() => new THREE.Vector2(0.5, 0.5)) },
            trailTimes: { value: new Array(20).fill(0) },
            trailCount: { value: 0 },
            mouseClicks: { value: new Array(5).fill(null).map(() => new THREE.Vector2(0.5, 0.5)) },
            clickTimes: { value: new Array(5).fill(0) },
            clickCount: { value: 0 },
            isHovering: { value: false },
            time: { value: 0 },
            resolution: { value: new THREE.Vector2(containerRect.width, containerRect.height) },
            revealRadius: { value: revealRadiusNormalized }
        },
        vertexShader,
        fragmentShader,
        transparent: true
    });

    // Make picture bigger - scale geometry
    const geometry = new THREE.PlaneGeometry(2.65, 2.65); /* Increased from 2.5 to make picture bigger */
    
    const mesh = new THREE.Mesh(geometry, shaderMaterial);
    
    // Base position
    const baseY = 0.35; /* Increased from 0.20 to move picture higher */
    const baseX = -0.0;
    mesh.position.y = baseY;
    mesh.position.x = baseX;
    
    // Store mesh reference for interactive movement
    window.interactiveMesh = mesh;
    window.baseMeshY = baseY;
    window.baseMeshX = baseX;
    window.targetMeshY = baseY;
    window.targetMeshX = baseX;
    
    scene.add(mesh);
}

function updateMouseTrail(x, y) {
    const currentTime = time;
    
    // Only add point if moved significantly (reduces glitches and improves performance)
    if (mouseTrail.length > 0) {
        const lastPoint = mouseTrail[mouseTrail.length - 1];
        const dist = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
        // Skip if movement is too small (prevents excessive points)
        if (dist < 0.001) {
            // Just update the last point's time
            lastPoint.time = currentTime;
            return;
        }
    }
    
    // Add current position to trail
    mouseTrail.push({ x, y, time: currentTime });
    
    // Remove old positions (older than 1 second)
    while (mouseTrail.length > 0 && currentTime - mouseTrail[0].time > 1.0) {
        mouseTrail.shift();
    }
    
    // Limit trail length to 15 points for better performance
    if (mouseTrail.length > 15) {
        mouseTrail.shift();
    }
    
    // Update shader uniforms (only if material exists)
    if (shaderMaterial) {
        const trailPositions = [];
        const trailTimes = [];
        const count = Math.min(mouseTrail.length, 15);
        
        for (let i = 0; i < count; i++) {
            const point = mouseTrail[i];
            trailPositions.push(new THREE.Vector2(point.x, point.y));
            trailTimes.push(currentTime - point.time);
        }
        
        // Pad arrays to 20 elements (shader expects 20)
        while (trailPositions.length < 20) {
            trailPositions.push(new THREE.Vector2(0.5, 0.5));
            trailTimes.push(0);
        }
        
        shaderMaterial.uniforms.mouseTrail.value = trailPositions;
        shaderMaterial.uniforms.trailTimes.value = trailTimes;
        shaderMaterial.uniforms.trailCount.value = count;
    }
}

function onMouseMove(event) {
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1.0 - ((event.clientY - rect.top) / rect.height);
    
    const currentTime = time;
    const deltaTime = Math.max(0.001, currentTime - lastMouseTime);
    lastMouseTime = currentTime;
    
    // Calculate velocity for momentum
    const dx = x - lastMousePos.x;
    const dy = y - lastMousePos.y;
    mouseVelocity.set(dx / deltaTime, dy / deltaTime);
    
    lastMousePos.set(x, y);
    mouse.set(x, y);
    
    // Enable hover when mouse moves over container
    if (!isHovering) {
        isHovering = true;
        if (shaderMaterial) {
            shaderMaterial.uniforms.isHovering.value = true;
        }
    }
    
    // Note: Picture movement is now handled in animate() using globalMouseX/Y
    // This onMouseMove function only handles fluid trail for the picture
    
    // Update trail
    updateMouseTrail(x, y);
    
    if (shaderMaterial) {
        shaderMaterial.uniforms.mousePosition.value.set(x, y);
    }
}

function onMouseEnter() {
    isHovering = true;
    lastMouseTime = time;
    if (shaderMaterial) {
        shaderMaterial.uniforms.isHovering.value = true;
    }
}

function onMouseLeave() {
    isHovering = false;
    mouse.set(0.5, 0.5);
    lastMousePos.set(0.5, 0.5);
    mouseTrail.length = 0; // Clear trail
    mouseVelocity.set(0, 0);
    
    // Reset picture position and rotation targets
    if (window.interactiveMesh) {
        window.targetMeshY = window.baseMeshY;
        window.targetMeshX = window.baseMeshX;
    }
    
    if (shaderMaterial) {
        shaderMaterial.uniforms.isHovering.value = false;
        shaderMaterial.uniforms.mousePosition.value.set(0.5, 0.5);
        shaderMaterial.uniforms.trailCount.value = 0;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update time for animation
    time += 0.016; // ~60fps
    
    // Apply momentum/overshoot when mouse stops moving rapidly
    if (isHovering && mouseTrail.length > 0) {
        const velocityMag = mouseVelocity.length();
        
        // If velocity was high but now stopped, apply overshoot (water sloshing effect)
        if (velocityMag > 2.0) {
            // Decay velocity
            mouseVelocity.multiplyScalar(0.92);
            
            if (mouseVelocity.length() > 0.01) {
                // Apply overshoot - continue movement with decay
                const overshootAmount = 0.015;
                const newX = mouse.x + mouseVelocity.x * overshootAmount;
                const newY = mouse.y + mouseVelocity.y * overshootAmount;
                
                // Clamp to bounds
                const clampedX = Math.max(0, Math.min(1, newX));
                const clampedY = Math.max(0, Math.min(1, newY));
                
                // Update position and trail
                mouse.set(clampedX, clampedY);
                updateMouseTrail(clampedX, clampedY);
                
                if (shaderMaterial) {
                    shaderMaterial.uniforms.mousePosition.value.set(clampedX, clampedY);
                }
            } else {
                mouseVelocity.set(0, 0);
            }
        } else {
            mouseVelocity.multiplyScalar(0.8); // Decay when not moving
        }
    }
    
    if (shaderMaterial) {
        shaderMaterial.uniforms.time.value = time;
        
        // Update click times for ripple animation
        if (mouseClicks.length > 0) {
            const clickTimesArray = [];
            const count = Math.min(mouseClicks.length, 5);
            
            for (let i = 0; i < count; i++) {
                clickTimesArray.push(mouseClicks[i].time);
            }
            
            while (clickTimesArray.length < 5) {
                clickTimesArray.push(0);
            }
            
            shaderMaterial.uniforms.clickTimes.value = clickTimesArray;
            
            // Remove expired clicks (older than 0.6 seconds)
            while (mouseClicks.length > 0 && time - mouseClicks[0].time > 0.6) {
                mouseClicks.shift();
            }
            
            shaderMaterial.uniforms.clickCount.value = Math.min(mouseClicks.length, 5);
        }
    }

    // Smoothly interpolate mesh position for interactive movement (with slight delay)
    // Update picture position based on global mouse position
    if (window.interactiveMesh && typeof window.baseMeshY !== 'undefined' && typeof window.baseMeshX !== 'undefined') {
        // Use global mouse position for picture movement
        const normalizedX = (globalMouseX - 0.5) * 2.0; // -1 to 1
        const normalizedY = (globalMouseY - 0.5) * 2.0; // -1 to 1
        
        // Calculate target position (increased movement, inverted Y for correct direction)
        const verticalOffset = -normalizedY * 0.005; // Inverted Y so cursor up = picture up
        const horizontalOffset = normalizedX * 0.003; // Increased from 0.001
        
        window.targetMeshY = window.baseMeshY + verticalOffset;
        window.targetMeshX = window.baseMeshX + horizontalOffset;
        
        // Smooth interpolation
        const lerpFactor = 0.025; // Slight delay for smooth movement
        window.interactiveMesh.position.y = THREE.MathUtils.lerp(window.interactiveMesh.position.y, window.targetMeshY, lerpFactor);
        window.interactiveMesh.position.x = THREE.MathUtils.lerp(window.interactiveMesh.position.x, window.targetMeshX, lerpFactor);
    }
    
    renderer.render(scene, camera);
}

// Event listeners
container.addEventListener('mousemove', onMouseMove);
container.addEventListener('mouseenter', onMouseEnter);
container.addEventListener('mouseleave', onMouseLeave);

renderer.domElement.addEventListener('mousemove', onMouseMove);
renderer.domElement.addEventListener('mouseenter', onMouseEnter);
renderer.domElement.addEventListener('mouseleave', onMouseLeave);

// Click handler for ripple effect
function onMouseClick(event) {
    if (!isHovering) return;
    
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1.0 - ((event.clientY - rect.top) / rect.height);
    
    // Add click to ripple array
    mouseClicks.push({ x, y, time: time });
    
    // Remove old clicks (older than 0.6 seconds)
    while (mouseClicks.length > 0 && time - mouseClicks[0].time > 0.6) {
        mouseClicks.shift();
    }
    
    // Limit to 5 clicks
    if (mouseClicks.length > 5) {
        mouseClicks.shift();
    }
    
    // Update shader uniforms
    if (shaderMaterial) {
        const clickPositions = [];
        const clickTimesArray = [];
        const count = Math.min(mouseClicks.length, 5);
        
        for (let i = 0; i < count; i++) {
            const click = mouseClicks[i];
            clickPositions.push(new THREE.Vector2(click.x, click.y));
            clickTimesArray.push(click.time);
        }
        
        // Pad arrays to 5 elements
        while (clickPositions.length < 5) {
            clickPositions.push(new THREE.Vector2(0.5, 0.5));
            clickTimesArray.push(0);
        }
        
        shaderMaterial.uniforms.mouseClicks.value = clickPositions;
        shaderMaterial.uniforms.clickTimes.value = clickTimesArray;
        shaderMaterial.uniforms.clickCount.value = count;
    }
}

container.addEventListener('mousedown', onMouseClick);
renderer.domElement.addEventListener('mousedown', onMouseClick);

window.addEventListener('resize', () => {
    const newRect = container.getBoundingClientRect();
    renderer.setSize(newRect.width, newRect.height);
    calculateRevealRadius();
    
    if (shaderMaterial) {
        shaderMaterial.uniforms.resolution.value.set(newRect.width, newRect.height);
        shaderMaterial.uniforms.revealRadius.value = revealRadiusNormalized;
    }
});

// Interactive text movement (same as picture)
const textElements = [];
// globalMouseX and globalMouseY are now defined at the top of the file

function initInteractiveText() {
    // Get all text elements except navbar
    const selectors = [
        '.greeting',
        '.intro',
        '.stat-number',
        '.stat-label',
        '.stats-section',
        '.greeting-section'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            // Exclude navbar elements
            if (!element.closest('.header') && !element.closest('.nav') && !element.classList.contains('nav-link') && !element.classList.contains('cta-button')) {
                // Get element position to calculate delay (elements further down get more delay)
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top;
                const viewportHeight = window.innerHeight;
                // Calculate delay based on position: 0 at top, increases as we go down
                // Delay ranges from 0 to ~0.1 seconds (100ms) for elements at bottom
                const delayFactor = Math.min(elementTop / viewportHeight, 1.0) * 0.1;
                
                // Store initial position (relative to viewport center)
                textElements.push({
                    element: element,
                    offsetX: 0,
                    offsetY: 0,
                    targetOffsetX: 0,
                    targetOffsetY: 0,
                    delay: delayFactor, // Delay factor based on position
                    delayedTargetX: 0,
                    delayedTargetY: 0,
                    delayLerpSpeed: 0.05 + delayFactor * 0.1 // Slower lerp for elements further down
                });
            }
        });
    });
}

function updateTextMovement() {
    // Normalize mouse position (0 to 1)
    const normalizedX = (globalMouseX - 0.5) * 2.0; // -1 to 1
    const normalizedY = (globalMouseY - 0.5) * 2.0; // -1 to 1
    
    // Update target offsets for all text elements (in pixels)
    // Slightly decreased vertically
    const verticalOffset = normalizedY * 1.2; // Slightly decreased (was 1.5, now 1.2)
    const horizontalOffset = normalizedX * 1; // Further reduced (was 2, now 1)
    
    textElements.forEach(item => {
        item.targetOffsetY = verticalOffset;
        item.targetOffsetX = horizontalOffset;
    });
}

// Simple lerp function (in case THREE is not available)
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

function animateTextElements() {
    const lerpFactor = 0.03; // Same as picture
    
    textElements.forEach(item => {
        // Apply delay: smoothly move delayed target towards actual target
        // Elements further down have slower delay lerp (more delay)
        item.delayedTargetY = lerp(item.delayedTargetY, item.targetOffsetY, item.delayLerpSpeed);
        item.delayedTargetX = lerp(item.delayedTargetX, item.targetOffsetX, item.delayLerpSpeed);
        
        // Smoothly interpolate offset towards delayed target
        item.offsetY = lerp(item.offsetY, item.delayedTargetY, lerpFactor);
        item.offsetX = lerp(item.offsetX, item.delayedTargetX, lerpFactor);
        
        // Apply transform
        item.element.style.transform = `translate(${item.offsetX}px, ${item.offsetY}px)`;
    });
    
    requestAnimationFrame(animateTextElements);
}

// Global mouse move handler for picture and text movement
function onGlobalMouseMove(event) {
    // Normalize to viewport (0 to 1)
    globalMouseX = event.clientX / window.innerWidth;
    globalMouseY = event.clientY / window.innerHeight;
    
    // Update text movement
    updateTextMovement();
    
    // Picture movement is handled in animate() function using globalMouseX/Y
}

// Initialize text movement after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initInteractiveText();
            animateTextElements();
        }, 100);
    });
} else {
    setTimeout(() => {
        initInteractiveText();
        animateTextElements();
    }, 100);
}

window.addEventListener('mousemove', onGlobalMouseMove);

initTextures();
animate();

// Quote Section Letter-by-Letter Animation
function initQuoteAnimation() {
    const quoteSection = document.getElementById('quote-section');
    const quoteText = document.getElementById('quote-text');
    
    if (!quoteSection || !quoteText) return;
    
    // Text: "User Experience is a conscious responsibility of every proactive brand with a product."
    const textLines = [
        { text: '"User Experience is a', isHighlight: false }, // Opening quote at the start
        { text: 'conscious responsibility', isHighlight: true },
        { text: 'of every proactive brand', isHighlight: false },
        { text: 'with a product."', isHighlight: false } // Closing quote at the end
    ];
    
    // Define font weights for specific words
    const wordFontWeights = {
        'User': 300,        // Light
        'Experience': 300,   // Light
        'every': 300,       // Light
        'proactive': 400,   // Regular
        'conscious': 400,   // Regular
        'responsibility': 500, // Medium
        'brand': 400,       // Regular
        'product': 400      // Regular
    };
    
    // Clear existing content
    quoteText.innerHTML = '';
    
    let charIndex = 0;
    
    // Process each line
    textLines.forEach((line, lineIndex) => {
        // Split line into words to determine font weights
        const words = line.text.split(/(\s+)/); // Split but keep spaces
        
        words.forEach((word) => {
            if (!word) return; // Skip empty strings
            
            // Check if this is a word (not just spaces)
            const trimmedWord = word.trim();
            const isSpace = trimmedWord === '';
            
            if (isSpace) {
                // Add space as non-breaking space
                const spaceSpan = document.createElement('span');
                spaceSpan.className = 'quote-letter';
                spaceSpan.textContent = '\u00A0';
                spaceSpan.setAttribute('data-delay', charIndex * 0.01);
                quoteText.appendChild(spaceSpan);
                charIndex++;
            } else {
                // Strip punctuation to match word in font weight map
                const wordWithoutPunctuation = trimmedWord.replace(/[.,!?;:]/g, '');
                const fontWeight = wordFontWeights[wordWithoutPunctuation] || 200; // Default to ExtraLight (200)
                
                // Split word into characters
                const characters = word.split('');
                
                characters.forEach((char) => {
                    const span = document.createElement('span');
                    
                    span.className = line.isHighlight ? 'quote-letter quote-highlight' : 'quote-letter';
                    span.textContent = char;
                    
                    // Apply font weight
                    span.style.fontWeight = fontWeight;
                    
                    // Store delay as data attribute for reliable restart
                    span.setAttribute('data-delay', charIndex * 0.01);
                    
                    quoteText.appendChild(span);
                    charIndex++;
                });
            }
        });
        
        // Add line break after each line except the last one
        if (lineIndex < textLines.length - 1) {
            const br = document.createElement('br');
            quoteText.appendChild(br);
        }
    });
    
    // Animation counter to force restart
    let animationCounter = 0;
    
    // Intersection Observer to trigger animation when section comes into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Increment counter to force new animation
                animationCounter++;
                
                // Get all letters
                const letters = Array.from(quoteText.querySelectorAll('.quote-letter'));
                
                // Reset all letters to initial state
                letters.forEach((letter) => {
                    // Remove any existing animation
                    letter.style.animation = 'none';
                    letter.style.opacity = '0';
                    letter.style.transform = 'translateY(20px)';
                    
                    // Get delay from data attribute
                    const delay = letter.getAttribute('data-delay') || '0';
                    
                    // Force reflow by reading offsetWidth
                    void letter.offsetWidth;
                    
                    // Set animation with unique name using counter
                    letter.style.animation = `quoteLetterAppear-${animationCounter} 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s forwards`;
                });
                
                // Create unique keyframe animation for this iteration
                const styleId = `quote-animation-${animationCounter}`;
                let styleElement = document.getElementById(styleId);
                
                if (!styleElement) {
                    styleElement = document.createElement('style');
                    styleElement.id = styleId;
                    document.head.appendChild(styleElement);
                }
                
                // Define keyframes for this animation iteration
                styleElement.textContent = `
                    @keyframes quoteLetterAppear-${animationCounter} {
                        0% {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        100% {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `;
                
                // Force reflow to ensure animation starts
                void quoteText.offsetWidth;
                
            } else {
                // When leaving viewport, reset everything
                const letters = quoteText.querySelectorAll('.quote-letter');
                letters.forEach(letter => {
                    letter.style.animation = 'none';
                    letter.style.opacity = '0';
                    letter.style.transform = 'translateY(20px)';
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '0px'
    });
    
    observer.observe(quoteSection);
}

// Initialize quote animation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuoteAnimation);
} else {
    initQuoteAnimation();
}

// Waterfall Animation for Third View Section
function initWaterfallAnimation() {
    const leftColumn = document.getElementById('waterfall-left');
    const rightColumn = document.getElementById('waterfall-right');
    
    if (!leftColumn || !rightColumn) return;
    
    // List of all images
    const imageFiles = [
        'exq-down.png',
        'exq-middle-1.png',
        'exq-middle-2.png',
        'exq-top.png',
        'mentis-down-right.png',
        'mentis-middle.png',
        'mentis-top-left.png',
        'mentis-top-right.png',
        'onlylabs-bottom.png',
        'onlylabs-top.png',
        'openline-left.png',
        'openline-middle.png',
        'openline-right.png',
        'orrys-bottom-right.png',
        'orrys-left.png',
        'orrys-top-right.png',
        'overload-bottom-left.png',
        'overload-bottom-right.png',
        'overload-middle.png',
        'overload-top-left.png',
        'overload-top-right.png',
        'tuner-left.png',
        'tuner-right.png'
    ];
    
    // Split images between left and right columns
    const leftImages = [];
    const rightImages = [];
    
    imageFiles.forEach((file, index) => {
        if (index % 2 === 0) {
            leftImages.push(file);
        } else {
            rightImages.push(file);
        }
    });
    
    const fallSpeed = 1.5; // pixels per frame (increased for more dynamic effect)
    const minSpacing = 20; // minimum spacing between images (further reduced for higher density)
    
    // Create and position images for a column
    function createImageColumn(column, images, isReversed = false) {
        return new Promise((resolve) => {
            const columnImages = [];
            let loadedCount = 0;
            const totalImages = images.length;
            
            images.forEach((filename, index) => {
                const img = new Image();
                img.src = `third-page-pictures/${filename}`;
                img.className = 'waterfall-image';
                img.style.position = 'absolute';
                
                img.onload = function() {
                    // Set to half size
                    const originalWidth = img.naturalWidth;
                    const originalHeight = img.naturalHeight;
                    const scaledWidth = originalWidth * 0.5;
                    const scaledHeight = originalHeight * 0.5;
                    
                    img.style.width = `${scaledWidth}px`;
                    img.style.height = `${scaledHeight}px`;
                    
                    // Get column width to ensure images stay within bounds
                    const columnWidth = column.offsetWidth || window.innerWidth / 3;
                    
                    // Random horizontal position, ensuring image stays fully within column
                    // Max left position = columnWidth - imageWidth (so right edge doesn't go out)
                    const maxLeft = Math.max(0, columnWidth - scaledWidth);
                    const randomLeft = Math.random() * maxLeft;
                    
                    img.style.left = `${randomLeft}px`;
                    
                    // Speed is negative for reversed (upward) flow
                    const baseSpeed = isReversed ? -(fallSpeed + Math.random() * 0.8) : (fallSpeed + Math.random() * 0.8);
                    
                    columnImages.push({
                        element: img,
                        y: 0,
                        height: scaledHeight,
                        width: scaledWidth,
                        speed: baseSpeed,
                        order: index // Track original order
                    });
                    
                    column.appendChild(img);
                    loadedCount++;
                    
                    // When all images are loaded, position them
                    if (loadedCount === totalImages) {
                        // Sort by original order
                        columnImages.sort((a, b) => a.order - b.order);
                        
                        const viewportHeight = window.innerHeight;
                        
                        if (isReversed) {
                            // For reversed flow, start from bottom and go up
                            let currentY = viewportHeight + 200;
                            columnImages.forEach(imgObj => {
                                imgObj.y = currentY;
                                imgObj.element.style.top = `${currentY}px`;
                                currentY += (imgObj.height + minSpacing);
                            });
                        } else {
                            // For normal flow, start from top and go down
                            let currentY = -200;
                            columnImages.forEach(imgObj => {
                                imgObj.y = currentY;
                                imgObj.element.style.top = `${currentY}px`;
                                currentY -= (imgObj.height + minSpacing);
                            });
                        }
                        
                        resolve(columnImages);
                    }
                };
                
                img.onerror = function() {
                    loadedCount++;
                    if (loadedCount === totalImages) {
                        resolve(columnImages);
                    }
                };
            });
        });
    }
    
    // Wait for both columns to load, then start animation
    Promise.all([
        createImageColumn(leftColumn, leftImages, false), // Left column: normal downward flow
        createImageColumn(rightColumn, rightImages, true)  // Right column: reversed upward flow
    ]).then(([leftColumnImages, rightColumnImages]) => {
        // Animation loop
        function animateWaterfall() {
            const viewportHeight = window.innerHeight;
            
            // Animate left column (downward flow)
            leftColumnImages.forEach(imgObj => {
                imgObj.y += imgObj.speed;
                
                // If image goes below viewport, loop it back to top
                if (imgObj.y > viewportHeight) {
                    // Find the highest image
                    const highestY = Math.min(...leftColumnImages.map(i => i.y));
                    imgObj.y = highestY - imgObj.height - minSpacing;
                }
                
                imgObj.element.style.top = `${imgObj.y}px`;
            });
            
            // Animate right column (upward flow - reversed)
            rightColumnImages.forEach(imgObj => {
                imgObj.y += imgObj.speed; // Speed is negative, so this moves upward
                
                // If image goes above viewport, loop it back to bottom
                if (imgObj.y + imgObj.height < 0) {
                    // Find the lowest image
                    const lowestY = Math.max(...rightColumnImages.map(i => i.y));
                    imgObj.y = lowestY + imgObj.height + minSpacing;
                }
                
                imgObj.element.style.top = `${imgObj.y}px`;
            });
            
            requestAnimationFrame(animateWaterfall);
        }
        
        // Start animation
        animateWaterfall();
    });
}

// Initialize waterfall animation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWaterfallAnimation);
} else {
    initWaterfallAnimation();
}

// Third View Section - Three.js Scroll-Driven Portfolio Gallery Animation
function initThirdViewWebGL() {
    const thirdViewSection = document.getElementById('third-view-section');
    const canvas = document.getElementById('third-view-canvas');
    
    if (!thirdViewSection || !canvas) return;
    
    // Scene setup - transparent background
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    
    // Camera setup - Perspective camera positioned at z: 5
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.z = 5;
    camera.position.x = 0;
    camera.position.y = 0;
    
    // Renderer setup - transparent canvas
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        premultipliedAlpha: false
    });
    renderer.setClearColor(0x000000, 0); // Transparent
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Ensure proper color space
    
    // Image files list (23 images)
    const imageFiles = [
        'exq-down.png', 'exq-middle-1.png', 'exq-middle-2.png', 'exq-top.png',
        'mentis-down-right.png', 'mentis-middle.png', 'mentis-top-left.png', 'mentis-top-right.png',
        'onlylabs-bottom.png', 'onlylabs-top.png',
        'openline-left.png', 'openline-middle.png', 'openline-right.png',
        'orrys-bottom-right.png', 'orrys-left.png', 'orrys-top-right.png',
        'overload-bottom-left.png', 'overload-bottom-right.png', 'overload-middle.png',
        'overload-top-left.png', 'overload-top-right.png',
        'tuner-left.png', 'tuner-right.png'
    ];
    
    const textureLoader = new THREE.TextureLoader();
    const imageMeshes = [];
    let loadedCount = 0;
    const totalImages = imageFiles.length;
    
    // Get maximum anisotropy for high-quality texture filtering
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    
    // Render function - only renders when needed (on scroll or image load)
    function render() {
        renderer.render(scene, camera);
    }
    
    // Create image planes in circular pattern
    imageFiles.forEach((filename, index) => {
        textureLoader.load(`third-page-pictures/${filename}`, (texture) => {
            // Configure texture properly - prevent white overlay and ensure high quality
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = true; // Default Three.js texture orientation (flip Y for correct display)
            texture.premultiplyAlpha = false; // Prevent premultiplied alpha issues
            texture.generateMipmaps = true; // Generate mipmaps for better quality at different distances
            texture.minFilter = THREE.LinearMipmapLinearFilter; // High-quality filtering when scaled down
            texture.magFilter = THREE.LinearFilter; // High-quality filtering when scaled up
            texture.anisotropy = maxAnisotropy; // Use maximum anisotropy for best quality
            
            // Calculate aspect ratio
            const aspect = texture.image.width / texture.image.height;
            const baseWidth = 1.5; // Base width for images
            const width = baseWidth;
            const height = width / aspect;
            
            // Create plane geometry - flat orientation
            const geometry = new THREE.PlaneGeometry(width, height);
            
            // MeshBasicMaterial with transparent texture - no lighting needed
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1.0,
                color: 0xffffff, // Explicitly set white color to prevent tinting
                side: THREE.DoubleSide // Render both sides
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            
            // Circular pattern at varying depths
            const angle = (index / totalImages) * Math.PI * 2;
            const radius = 8 + Math.random() * 3; // Moderate spacing between images
            
            // Initial positions in circular pattern
            // Avoid center area where text is positioned (Y around 0)
            let initialX = Math.cos(angle) * radius;
            let initialY = Math.sin(angle) * radius * 0.6; // Slightly elliptical for visual interest
            
            // Get text bounds to avoid from the start
            const textElement = document.querySelector('.third-view-content');
            if (textElement) {
                const rect = textElement.getBoundingClientRect();
                const fov = camera.fov * Math.PI / 180;
                const cameraAspect = camera.aspect;
                const distance = Math.abs(camera.position.z);
                const worldHeight = 2 * Math.tan(fov / 2) * distance;
                const worldWidth = worldHeight * cameraAspect;
                
                // Approximate text center in world space (at z = 0, which is where text appears)
                const textCenterX = 0; // Text is centered horizontally
                const textCenterY = 0; // Text is centered vertically
                const textWidth = (rect.width / window.innerWidth) * worldWidth;
                const textHeight = (rect.height / window.innerHeight) * worldHeight;
                const textPadding = 1.5; // Padding around text
                
                // Check if initial position is too close to text
                const imageSize = Math.max(width, height);
                const imageHalfSize = imageSize / 2;
                
                const dx = initialX - textCenterX;
                const dy = initialY - textCenterY;
                
                const textLeft = textCenterX - textWidth / 2 - textPadding;
                const textRight = textCenterX + textWidth / 2 + textPadding;
                const textTop = textCenterY - textHeight / 2 - textPadding;
                const textBottom = textCenterY + textHeight / 2 + textPadding;
                
                const imageLeft = initialX - imageHalfSize;
                const imageRight = initialX + imageHalfSize;
                const imageTop = initialY - imageHalfSize;
                const imageBottom = initialY + imageHalfSize;
                
                const overlapsX = !(imageRight < textLeft || imageLeft > textRight);
                const overlapsY = !(imageBottom < textTop || imageTop > textBottom);
                
                if (overlapsX && overlapsY) {
                    // Push away from text center
                    const distanceFromText = Math.sqrt(dx * dx + dy * dy);
                    if (distanceFromText > 0.01) {
                        const pushDirX = dx / distanceFromText;
                        const pushDirY = dy / distanceFromText;
                        const minDistance = Math.max(
                            (textWidth / 2 + textPadding + imageHalfSize) - Math.abs(dx),
                            (textHeight / 2 + textPadding + imageHalfSize) - Math.abs(dy),
                            0
                        );
                        initialX = initialX + pushDirX * minDistance;
                        initialY = initialY + pushDirY * minDistance;
                    } else {
                        // If at center, push in direction of angle
                        initialX = Math.cos(angle) * (textWidth / 2 + textPadding + imageHalfSize + 0.5);
                        initialY = Math.sin(angle) * (textHeight / 2 + textPadding + imageHalfSize + 0.5);
                    }
                }
            } else {
                // Fallback: push away from center Y if text element not found
                const textAvoidanceZone = 1.5;
                if (Math.abs(initialY) < textAvoidanceZone) {
                    initialY = initialY > 0 ? textAvoidanceZone : -textAvoidanceZone;
                }
            }
            
            mesh.position.x = initialX;
            mesh.position.y = initialY;
            mesh.position.z = -20 - Math.random() * 10; // Start at z: -20 to -30
            
            // Store initial Z position for scroll interpolation
            // Assign different speed multipliers for varied approach rates (0.7x to 1.5x) - Slightly decreased speed
            const speedMultiplier = 0.7 + Math.random() * 0.8; // Random speed between 0.7 and 1.5 (slightly slower)
            mesh.userData = {
                startZ: mesh.position.z,
                endZ: 2.5, // Final position - close enough but not too close (camera at z: 5)
                initialX: mesh.position.x,
                initialY: mesh.position.y,
                speedMultiplier: speedMultiplier // Each asset moves at different rate
            };
            
            // No rotation - images stay flat
            mesh.rotation.x = 0;
            mesh.rotation.y = 0;
            mesh.rotation.z = 0;
            
            scene.add(mesh);
            imageMeshes.push(mesh);
            loadedCount++;
            
            // Update positions based on current scroll progress when image loads
            updateScrollProgress();
            render();
        }, undefined, (error) => {
            console.error(`Error loading ${filename}:`, error);
            loadedCount++;
        });
    });
    
    // Scroll progress tracking - relaxed scroll range
    let scrollProgress = 0;
    
    // Function to get text bounds in world coordinates
    function getTextBoundsInWorldSpace() {
        const textElement = document.querySelector('.third-view-content');
        if (!textElement) return null;
        
        const rect = textElement.getBoundingClientRect();
        const sectionRect = thirdViewSection.getBoundingClientRect();
        
        // Convert screen coordinates to normalized device coordinates (-1 to 1)
        const ndcX = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
        const ndcY = 1 - ((rect.top + rect.height / 2) / window.innerHeight) * 2; // Invert Y
        
        // Convert NDC to world coordinates (approximate)
        // Using camera's field of view and position
        const fov = camera.fov * Math.PI / 180;
        const aspect = camera.aspect;
        const distance = Math.abs(camera.position.z);
        
        // Calculate world space bounds
        const worldHeight = 2 * Math.tan(fov / 2) * distance;
        const worldWidth = worldHeight * aspect;
        
        const worldX = ndcX * worldWidth / 2;
        const worldY = ndcY * worldHeight / 2;
        const worldWidthText = (rect.width / window.innerWidth) * worldWidth;
        const worldHeightText = (rect.height / window.innerHeight) * worldHeight;
        
        return {
            x: worldX - worldWidthText / 2,
            y: worldY - worldHeightText / 2,
            width: worldWidthText,
            height: worldHeightText,
            centerX: worldX,
            centerY: worldY
        };
    }
    
    function updateScrollProgress() {
        const sectionRect = thirdViewSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const sectionTop = sectionRect.top;
        
        // Slightly faster scroll range: animation completes over a slightly shorter scroll distance
        // Animation starts when section enters viewport (sectionTop < windowHeight)
        // Animation completes when section has scrolled slightly past viewport
        const animationStart = windowHeight; // Section top at viewport top
        const animationEnd = -windowHeight * 0.4; // Section top slightly past viewport (changed from 0.35 to 0.4 for slightly slower speed)
        const scrollRange = animationStart - animationEnd;
        
        // Calculate progress: 0 to 1 over relaxed scroll range
        if (sectionTop <= animationStart && sectionTop >= animationEnd) {
            // Map scroll position to 0-1 range (inverted: top = 0, bottom = 1)
            scrollProgress = 1 - (sectionTop - animationEnd) / scrollRange;
            scrollProgress = Math.max(0, Math.min(1, scrollProgress));
        } else if (sectionTop > animationStart) {
            scrollProgress = 0; // Before animation starts
        } else {
            scrollProgress = 1; // After animation completes
        }
        
        // Get text bounds in world space
        const textBounds = getTextBoundsInWorldSpace();
        const textPadding = 1.5; // Padding around text in world units
        
        // Update image positions directly based on scroll - no physics, no easing
        imageMeshes.forEach((mesh) => {
            if (!mesh.userData) return;
            
            // Apply speed multiplier to scroll progress for varied approach rates
            // Each asset moves at its own rate (0.5x to 1.5x of base scroll progress)
            const speedMultiplier = mesh.userData.speedMultiplier || 1.0;
            const adjustedProgress = Math.min(1.0, scrollProgress * speedMultiplier);
            
            // Direct interpolation: startZ to endZ based on adjusted scroll progress
            mesh.position.z = mesh.userData.startZ + (mesh.userData.endZ - mesh.userData.startZ) * adjustedProgress;
            
            // Calculate image bounds (approximate size in world space)
            const imageSize = Math.max(mesh.geometry.parameters.width, mesh.geometry.parameters.height);
            const imageHalfSize = imageSize / 2;
            
            // Avoid text area as images approach camera
            let finalX = mesh.userData.initialX;
            let finalY = mesh.userData.initialY;
            
            if (textBounds && adjustedProgress > 0.2) {
                // Use initial position for direction calculation (where image would be without avoidance)
                const initialX = mesh.userData.initialX;
                const initialY = mesh.userData.initialY;
                
                // Calculate distance from text center using initial position
                const dx = initialX - textBounds.centerX;
                const dy = initialY - textBounds.centerY;
                
                // Expanded text bounds with padding
                const textLeft = textBounds.x - textPadding;
                const textRight = textBounds.x + textBounds.width + textPadding;
                const textTop = textBounds.y - textPadding;
                const textBottom = textBounds.y + textBounds.height + textPadding;
                
                // Check if image would overlap with text (using initial position)
                const imageLeft = initialX - imageHalfSize;
                const imageRight = initialX + imageHalfSize;
                const imageTop = initialY - imageHalfSize;
                const imageBottom = initialY + imageHalfSize;
                
                // Check for overlap or proximity
                const overlapsX = !(imageRight < textLeft || imageLeft > textRight);
                const overlapsY = !(imageBottom < textTop || imageTop > textBottom);
                
                if (overlapsX && overlapsY) {
                    // Image overlaps with text - push it away
                    const progressFactor = (adjustedProgress - 0.2) / 0.8; // Scale from 0.2 to 1.0
                    const pushStrength = progressFactor * 1.5; // Stronger push
                    
                    // Calculate push direction (away from text center)
                    const distanceFromText = Math.sqrt(dx * dx + dy * dy);
                    if (distanceFromText > 0.01) {
                        // Normalize direction
                        const pushDirX = dx / distanceFromText;
                        const pushDirY = dy / distanceFromText;
                        
                        // Calculate minimum distance needed to avoid overlap
                        const minDistanceX = (textBounds.width / 2 + textPadding + imageHalfSize) - Math.abs(dx);
                        const minDistanceY = (textBounds.height / 2 + textPadding + imageHalfSize) - Math.abs(dy);
                        const minDistance = Math.max(minDistanceX, minDistanceY, 0);
                        
                        // Push away from text
                        finalX = initialX + pushDirX * minDistance * pushStrength;
                        finalY = initialY + pushDirY * minDistance * pushStrength;
                    } else {
                        // If exactly at center, push in direction of angle
                        const angle = Math.atan2(initialY, initialX);
                        const pushDistance = (textBounds.width / 2 + textPadding + imageHalfSize) * pushStrength;
                        finalX = initialX + Math.cos(angle) * pushDistance;
                        finalY = initialY + Math.sin(angle) * pushDistance;
                    }
                } else if (overlapsX || overlapsY) {
                    // Close but not overlapping - still push away slightly
                    const progressFactor = (adjustedProgress - 0.2) / 0.8;
                    const pushStrength = progressFactor * 0.8;
                    
                    if (overlapsX) {
                        // Push vertically away
                        const pushDirY = dy > 0 ? 1 : -1;
                        const minDistance = (textBounds.height / 2 + textPadding + imageHalfSize) - Math.abs(dy);
                        finalY = initialY + pushDirY * Math.max(minDistance, 0) * pushStrength;
                    }
                    
                    if (overlapsY) {
                        // Push horizontally away
                        const pushDirX = dx > 0 ? 1 : -1;
                        const minDistance = (textBounds.width / 2 + textPadding + imageHalfSize) - Math.abs(dx);
                        finalX = initialX + pushDirX * Math.max(minDistance, 0) * pushStrength;
                    }
                }
            }
            
            // Apply final positions
            mesh.position.x = finalX;
            mesh.position.y = finalY;
        });
    }
    
    // Scroll event handler - update positions immediately on scroll
    function handleScroll() {
        updateScrollProgress();
        render(); // Render immediately on scroll
    }
    
    // Handle window resize
    function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        // Recalculate positions to account for new text bounds
        updateScrollProgress();
        render();
    }
    
    // Use passive scroll listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // Initial render
    updateScrollProgress();
    render();
}

// Initialize third view WebGL when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThirdViewWebGL);
} else {
    initThirdViewWebGL();
}

// Fourth View Section - 3D Experience Summary Animations
function initFourthViewAnimations() {
    const fourthViewSection = document.getElementById('fourth-view-section');
    if (!fourthViewSection) return;
    
    // Get all experience entries
    const experienceEntries = fourthViewSection.querySelectorAll('.experience-entry');
    const experienceTitle = fourthViewSection.querySelector('.experience-title');
    const experienceHeader = fourthViewSection.querySelector('.experience-header');
    
    if (experienceEntries.length === 0) return;
    
    // Create a Three.js scene for 3D effects
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 5;
    
    // Create a hidden canvas for 3D calculations (we'll use CSS transforms for actual rendering)
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(1, 1); // Minimal size, just for calculations
    
    // Store original positions and create 3D objects for each entry
    const entryObjects = [];
    
    // Get all dividers
    const dividers = fourthViewSection.querySelectorAll('.experience-divider');
    
    experienceEntries.forEach((entry, index) => {
        const contentColumn = entry.querySelector('.experience-content-column');
        const dateColumn = entry.querySelector('.experience-date-column');
        const divider = dividers[index]; // Get corresponding divider
        
        if (!contentColumn || !dateColumn) return;
        
        // Create 3D representation
        const entryObj = {
            element: entry,
            contentColumn: contentColumn,
            dateColumn: dateColumn,
            divider: divider,
            index: index,
            // 3D position
            position: new THREE.Vector3(
                (index - experienceEntries.length / 2) * 0.5, // Spread horizontally
                -index * 2, // Stack vertically
                -index * 1.5 // Depth
            ),
            // Rotation
            rotation: new THREE.Euler(0, 0, 0),
            // Original transform
            originalTransform: entry.style.transform || '',
            // Animation state
            scrollProgress: 0,
            // Parallax offset
            parallaxOffset: new THREE.Vector2(0, 0)
        };
        
        entryObjects.push(entryObj);
    });
    
    // Animate title
    let titleScrollProgress = 0;
    const titleOriginalTransform = experienceTitle ? experienceTitle.style.transform || '' : '';
    
    // Mouse tracking for parallax
    let mouseX = 0.5;
    let mouseY = 0.5;
    
    function onMouseMove(event) {
        mouseX = event.clientX / window.innerWidth;
        mouseY = event.clientY / window.innerHeight;
    }
    
    window.addEventListener('mousemove', onMouseMove);
    
    // Animation function
    function animate() {
        requestAnimationFrame(animate);
        
        // Get section position
        const sectionRect = fourthViewSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const sectionTop = sectionRect.top;
        const sectionBottom = sectionRect.bottom;
        
        // Calculate scroll progress for the section
        // Animation starts when section enters viewport
        const animationStart = windowHeight * 0.8;
        const animationEnd = -windowHeight * 0.2;
        const scrollRange = animationStart - animationEnd;
        
        let sectionProgress = 0;
        if (sectionTop <= animationStart && sectionTop >= animationEnd) {
            sectionProgress = 1 - (sectionTop - animationEnd) / scrollRange;
            sectionProgress = Math.max(0, Math.min(1, sectionProgress));
        } else if (sectionTop > animationStart) {
            sectionProgress = 0;
        } else {
            sectionProgress = 1;
        }
        
        // Animate title
        if (experienceTitle) {
            titleScrollProgress = sectionProgress;
            const titleY = (1 - titleScrollProgress) * 100; // Slide in from top
            const titleRotX = (1 - titleScrollProgress) * 20; // Rotate in
            const titleScale = 0.8 + titleScrollProgress * 0.2; // Scale up
            // Force opacity to 1.0 when section is fully visible
            const titleOpacity = sectionProgress >= 0.9 ? 1.0 : Math.min(titleScrollProgress, 1.0);
            
            // Add parallax based on mouse
            const parallaxX = (mouseX - 0.5) * 20 * titleScrollProgress;
            const parallaxY = (mouseY - 0.5) * 20 * titleScrollProgress;
            
            experienceTitle.style.transform = `
                translate3d(${parallaxX}px, ${titleY}px, 0)
                rotateX(${titleRotX}deg)
                scale(${titleScale})
            `;
            experienceTitle.style.opacity = titleOpacity;
        }
        
        // Animate each entry with staggered timing
        const time = Date.now() * 0.001;
        
        entryObjects.forEach((entryObj, index) => {
            // Stagger the animation - each entry starts slightly later
            const staggerDelay = index * 0.15;
            const entryProgress = Math.max(0, Math.min(1, (sectionProgress - staggerDelay) / (1 - staggerDelay)));
            
            entryObj.scrollProgress = entryProgress;
            
            // Calculate 3D transforms
            let entryY = (1 - entryProgress) * 150; // Slide in from bottom
            
            // Add floating animation when entry is in view
            if (entryProgress > 0.3) {
                const floatAmount = Math.sin(time + entryObj.index) * 3;
                entryY += floatAmount;
            }
            
            const entryRotY = (1 - entryProgress) * 15; // Rotate in
            const entryRotX = (1 - entryProgress) * 10; // Tilt
            const entryScale = 0.85 + entryProgress * 0.15; // Scale up
            const entryOpacity = Math.min(entryProgress, 1.0); // Ensure it reaches 1.0
            const entryZ = (1 - entryProgress) * -100; // Move forward in Z
            
            // Parallax effect based on mouse position
            const parallaxStrength = entryProgress * 0.3;
            const parallaxX = (mouseX - 0.5) * 30 * parallaxStrength;
            const parallaxY = (mouseY - 0.5) * 30 * parallaxStrength;
            
            // Apply transforms to the entry
            entryObj.element.style.transform = `
                translate3d(${parallaxX}px, ${entryY + parallaxY}px, ${entryZ}px)
                rotateY(${entryRotY}deg)
                rotateX(${entryRotX}deg)
                scale(${entryScale})
            `;
            // Force opacity to 1.0 when section is fully visible
            entryObj.element.style.opacity = sectionProgress >= 0.9 ? 1.0 : entryOpacity;
            entryObj.element.style.transformStyle = 'preserve-3d';
            entryObj.element.style.willChange = 'transform, opacity';
            
            // Animate content column separately (slight delay)
            const contentProgress = Math.max(0, Math.min(1, (sectionProgress - staggerDelay - 0.1) / (1 - staggerDelay)));
            const contentX = (1 - contentProgress) * -50;
            const contentOpacity = sectionProgress >= 0.9 ? 1.0 : Math.min(contentProgress, 1.0); // Force 1.0 when visible
            
            entryObj.contentColumn.style.transform = `translate3d(${contentX}px, 0, 0)`;
            entryObj.contentColumn.style.opacity = contentOpacity;
            entryObj.contentColumn.style.transition = 'none';
            
            // Animate date column separately (slide from right)
            const dateProgress = Math.max(0, Math.min(1, (sectionProgress - staggerDelay - 0.1) / (1 - staggerDelay)));
            const dateX = (1 - dateProgress) * 50;
            const dateOpacity = sectionProgress >= 0.9 ? 1.0 : Math.min(dateProgress, 1.0); // Force 1.0 when visible
            
            entryObj.dateColumn.style.transform = `translate3d(${dateX}px, 0, 0)`;
            entryObj.dateColumn.style.opacity = dateOpacity;
            entryObj.dateColumn.style.transition = 'none';
            
            // Animate divider
            if (entryObj.divider && entryObj.divider.classList.contains('experience-divider')) {
                const dividerProgress = Math.max(0, Math.min(1, (sectionProgress - staggerDelay - 0.05) / (1 - staggerDelay)));
                const dividerScaleX = dividerProgress;
                const dividerOpacity = dividerProgress;
                
                entryObj.divider.style.transform = `scaleX(${dividerScaleX})`;
                entryObj.divider.style.opacity = dividerOpacity;
                entryObj.divider.style.transformOrigin = 'left center';
            }
        });
    }
    
    // Start animation
    animate();
    
    // Handle window resize
    function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
    
    window.addEventListener('resize', handleResize);
}

// Initialize fourth view animations when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFourthViewAnimations);
} else {
    initFourthViewAnimations();
}
