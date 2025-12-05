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
    // 160px wide = 80px radius
    revealRadiusNormalized = (80.0) / minDimension;
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
    const geometry = new THREE.PlaneGeometry(2.5, 2.5); // Reduced by half
    
    const mesh = new THREE.Mesh(geometry, shaderMaterial);
    
    // Base position
    const baseY = 0.28;
    const baseX = -0.1;
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
