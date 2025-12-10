// Background Animation - Animated Plus Signs using Three.js
// Elements consist of 2 crossed lines at 90 degrees with rounded ends

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

class PlusElement {
    constructor(x, y, length1, length2, thickness1, thickness2, angle, intersectionRatio1, intersectionRatio2, scene) {
        this.x = x;
        this.y = y;
        this.length1 = length1;
        this.length2 = length2;
        this.thickness1 = thickness1;
        this.thickness2 = thickness2;
        this.angle = angle;
        this.intersectionRatio1 = intersectionRatio1;
        this.intersectionRatio2 = intersectionRatio2;
        this.scene = scene;
        
        // Animation state
        this.phase = 0; // 0 = extending, 1 = retracting, 2 = fading out
        this.progress = 0;
        this.opacity = 0;
        this.startTime = Date.now();
        this.phaseStartTime = Date.now();
        
        // Calculate bounding box for collision detection
        const maxLength = Math.max(length1, length2);
        this.bounds = {
            x: x - maxLength / 2,
            y: y - maxLength / 2,
            width: maxLength,
            height: maxLength
        };
        
        // Create Three.js line objects
        this.line1 = null;
        this.line2 = null;
        this.createLines();
    }
    
    createLines() {
        // Use Line2 for proper line width support
        // Create initial geometries (will be updated in updateLineGeometry)
        const line1Geometry = new LineGeometry();
        const line2Geometry = new LineGeometry();
        
        // Materials with proper line width
        const material1 = new LineMaterial({
            color: 0xE6E9EB,
            linewidth: this.thickness1 * window.devicePixelRatio, // Scale by DPR for proper rendering
            transparent: true,
            opacity: this.opacity,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
        });
        
        const material2 = new LineMaterial({
            color: 0xE6E9EB,
            linewidth: this.thickness2 * window.devicePixelRatio,
            transparent: true,
            opacity: this.opacity,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
        });
        
        this.line1 = new Line2(line1Geometry, material1);
        this.line2 = new Line2(line2Geometry, material2);
        
        // Lines are positioned at origin, geometry defines the actual line positions
        this.line1.position.set(0, 0, 0);
        this.line2.position.set(0, 0, 0);
        
        this.scene.add(this.line1);
        this.scene.add(this.line2);
        
        this.updateLineGeometry();
    }
    
    updateLineGeometry() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        // Current lengths based on progress
        const currentLength1 = this.length1 * this.progress;
        const currentLength2 = this.length2 * this.progress;
        
        // Calculate start and end points based on intersection ratio (in pixel coordinates)
        const line1StartDist = currentLength1 * this.intersectionRatio1;
        const line1EndDist = currentLength1 * (1 - this.intersectionRatio1);
        
        const line2StartDist = currentLength2 * this.intersectionRatio2;
        const line2EndDist = currentLength2 * (1 - this.intersectionRatio2);
        
        // Convert pixel coordinates to world coordinates for orthographic camera
        // Camera is set to (-aspect, aspect, 1, -1), so we need to map pixels to this range
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const aspect = viewportWidth / viewportHeight;
        
        // Convert pixel coordinates to world coordinates
        // X: pixel 0 -> -aspect, pixel width -> aspect
        // Y: pixel 0 -> 1, pixel height -> -1 (inverted)
        const pixelToWorldX = (pixelX) => (pixelX / viewportWidth) * (2 * aspect) - aspect;
        const pixelToWorldY = (pixelY) => 1 - (pixelY / viewportHeight) * 2;
        
        // Line 1 points in world coordinates
        const line1StartX = pixelToWorldX(this.x - line1StartDist * cos);
        const line1StartY = pixelToWorldY(this.y - line1StartDist * sin);
        const line1EndX = pixelToWorldX(this.x + line1EndDist * cos);
        const line1EndY = pixelToWorldY(this.y + line1EndDist * sin);
        
        // Line 2 points (rotated 90 degrees)
        const line2StartX = pixelToWorldX(this.x - line2StartDist * (-sin));
        const line2StartY = pixelToWorldY(this.y - line2StartDist * cos);
        const line2EndX = pixelToWorldX(this.x + line2EndDist * (-sin));
        const line2EndY = pixelToWorldY(this.y + line2EndDist * cos);
        
        // Update Line2 geometry (requires array format: [x, y, z, x, y, z, ...])
        const line1Points = [line1StartX, line1StartY, 0, line1EndX, line1EndY, 0];
        const line2Points = [line2StartX, line2StartY, 0, line2EndX, line2EndY, 0];
        
        this.line1.geometry.setPositions(line1Points);
        this.line2.geometry.setPositions(line2Points);
        
        // Update material resolution for proper line width rendering
        const resolution = new THREE.Vector2(viewportWidth, viewportHeight);
        this.line1.material.resolution = resolution;
        this.line2.material.resolution = resolution;
    }
    
    intersects(other) {
        // Simple bounding box check first
        if (this.bounds.x + this.bounds.width < other.bounds.x ||
            other.bounds.x + other.bounds.width < this.bounds.x ||
            this.bounds.y + this.bounds.height < other.bounds.y ||
            other.bounds.y + other.bounds.height < this.bounds.y) {
            return false;
        }
        
        // More precise line intersection check
        const lines1 = this.getLineSegments();
        const lines2 = other.getLineSegments();
        
        for (const line1 of lines1) {
            for (const line2 of lines2) {
                if (this.lineIntersects(line1, line2)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    getLineSegments() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        const line1StartDist = this.length1 * this.intersectionRatio1;
        const line1EndDist = this.length1 * (1 - this.intersectionRatio1);
        
        const line2StartDist = this.length2 * this.intersectionRatio2;
        const line2EndDist = this.length2 * (1 - this.intersectionRatio2);
        
        const line1Start = {
            x: this.x - line1StartDist * cos,
            y: this.y - line1StartDist * sin
        };
        const line1End = {
            x: this.x + line1EndDist * cos,
            y: this.y + line1EndDist * sin
        };
        
        const line2Start = {
            x: this.x - line2StartDist * (-sin),
            y: this.y - line2StartDist * cos
        };
        const line2End = {
            x: this.x + line2EndDist * (-sin),
            y: this.y + line2EndDist * cos
        };
        
        return [
            { start: line1Start, end: line1End },
            { start: line2Start, end: line2End }
        ];
    }
    
    lineIntersects(line1, line2) {
        const x1 = line1.start.x, y1 = line1.start.y;
        const x2 = line1.end.x, y2 = line1.end.y;
        const x3 = line2.start.x, y3 = line2.start.y;
        const x4 = line2.end.x, y4 = line2.end.y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
    
    intersectsContent(contentBounds) {
        const lineSegments = this.getLineSegments();
        
        for (const bounds of contentBounds) {
            const intersectionPadding = 20;
            if (this.x >= bounds.x - intersectionPadding &&
                this.x <= bounds.x + bounds.width + intersectionPadding &&
                this.y >= bounds.y - intersectionPadding &&
                this.y <= bounds.y + bounds.height + intersectionPadding) {
                return true;
            }
            
            for (const line of lineSegments) {
                if (this.lineIntersectsRect(line, bounds)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    lineIntersectsRect(line, rect) {
        const rectEdges = [
            { start: { x: rect.x, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y } },
            { start: { x: rect.x + rect.width, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y + rect.height } },
            { start: { x: rect.x + rect.width, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y + rect.height } },
            { start: { x: rect.x, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y } }
        ];
        
        for (const edge of rectEdges) {
            if (this.lineIntersects(line, edge)) {
                return true;
            }
        }
        
        if (line.start.x >= rect.x && line.start.x <= rect.x + rect.width &&
            line.start.y >= rect.y && line.start.y <= rect.y + rect.height &&
            line.end.x >= rect.x && line.end.x <= rect.x + rect.width &&
            line.end.y >= rect.y && line.end.y <= rect.y + rect.height) {
            return true;
        }
        
        return false;
    }
    
    update(currentTime) {
        const extendDuration = 3.0;
        const retractDuration = 3.0;
        const fadeDuration = 0.3;
        
        if (this.phase === 0) {
            const phaseTime = (currentTime - this.phaseStartTime) / 1000;
            this.progress = Math.min(phaseTime / extendDuration, 1.0);
            this.opacity = Math.min(this.progress * 0.3, 0.3);
            
            if (this.progress >= 1.0) {
                this.progress = 1.0;
                this.phaseStartTime = currentTime;
                this.phase = 1;
            }
        } else if (this.phase === 1) {
            const phaseTime = (currentTime - this.phaseStartTime) / 1000;
            this.progress = Math.max(1.0 - (phaseTime / retractDuration), 0.0);
            this.opacity = 0.3;
            
            if (this.progress <= 0.0) {
                this.progress = 0.0;
                this.phaseStartTime = currentTime;
                this.phase = 2;
            }
        } else if (this.phase === 2) {
            const phaseTime = (currentTime - this.phaseStartTime) / 1000;
            this.progress = 0.0;
            const fadeProgress = Math.min(phaseTime / fadeDuration, 1.0);
            this.opacity = 0.3 * (1 - fadeProgress);
            
            if (this.opacity <= 0) {
                return false;
            }
        }
        
        // Update Three.js line materials and geometry
        if (this.line1 && this.line2) {
            this.line1.material.opacity = this.opacity;
            this.line2.material.opacity = this.opacity;
            this.updateLineGeometry();
        }
        
        return true;
    }
    
    dispose() {
        if (this.line1) {
            this.scene.remove(this.line1);
            this.line1.geometry.dispose();
            this.line1.material.dispose();
        }
        if (this.line2) {
            this.scene.remove(this.line2);
            this.line2.geometry.dispose();
            this.line2.material.dispose();
        }
    }
}

class BackgroundAnimation {
    constructor() {
        this.canvas = document.getElementById('background-animation');
        this.elements = [];
        this.contentBounds = [];
        this.allowedArea = null;
        
        // Three.js setup
        this.scene = new THREE.Scene();
        
        // Use OrthographicCamera for 2D-like rendering
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);
        this.camera.position.z = 1;
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.updateContentBounds();
        
        // Spawn initial elements
        setTimeout(() => {
            for (let i = 0; i < 10; i++) {
                this.trySpawnElement();
            }
        }, 100);
        
        this.animate();
        
        // Spawn elements periodically
        this.spawnInterval = setInterval(() => {
            const spawnCount = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < spawnCount; i++) {
                setTimeout(() => this.trySpawnElement(), i * 50);
            }
        }, 500);
    }
    
    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const aspect = width / height;
        this.camera.left = -aspect;
        this.camera.right = aspect;
        this.camera.top = 1;
        this.camera.bottom = -1;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        
        // Update line material resolutions
        const resolution = new THREE.Vector2(width, height);
        this.elements.forEach(element => {
            if (element.line1 && element.line2) {
                element.line1.material.resolution = resolution;
                element.line2.material.resolution = resolution;
            }
        });
        
        this.updateContentBounds();
    }
    
    updateContentBounds() {
        this.contentBounds = [];
        
        const greeting = document.querySelector('.greeting');
        if (greeting) {
            const rect = greeting.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 50,
                y: rect.top - 50,
                width: rect.width + 100,
                height: rect.height + 100
            });
        }
        
        const intro = document.querySelector('.intro');
        if (intro) {
            const rect = intro.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 50,
                y: rect.top - 50,
                width: rect.width + 100,
                height: rect.height + 100
            });
        }
        
        const stats = document.querySelector('.stats-section');
        if (stats) {
            const rect = stats.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 50,
                y: rect.top - 50,
                width: rect.width + 100,
                height: rect.height + 100
            });
        }
        
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            const rect = canvasContainer.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 50,
                y: rect.top - 50,
                width: rect.width + 100,
                height: rect.height + 100
            });
        }
        
        const header = document.querySelector('.header');
        if (header) {
            const rect = header.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 50,
                y: rect.top - 50,
                width: rect.width + 100,
                height: rect.height + 100
            });
        }
        
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const rect = link.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 30,
                y: rect.top - 30,
                width: rect.width + 60,
                height: rect.height + 60
            });
        });
        
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            const rect = ctaButton.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 30,
                y: rect.top - 30,
                width: rect.width + 60,
                height: rect.height + 60
            });
        }
        
        const verticalLines = document.querySelectorAll('.vertical-line-segment, .vertical-label');
        verticalLines.forEach(line => {
            const rect = line.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 30,
                y: rect.top - 30,
                width: rect.width + 60,
                height: rect.height + 60
            });
        });
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const rect = mainContent.getBoundingClientRect();
            this.allowedArea = {
                x: rect.left,
                y: rect.top + rect.height,
                width: rect.width,
                height: window.innerHeight - (rect.top + rect.height)
            };
        } else {
            this.allowedArea = {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        }
    }
    
    trySpawnElement() {
        const maxAttempts = 100;
        
        let spawnArea;
        if (this.allowedArea && this.allowedArea.height > 0) {
            spawnArea = this.allowedArea;
        } else {
            spawnArea = {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        }
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = spawnArea.x + Math.random() * spawnArea.width;
            const y = spawnArea.y + Math.random() * spawnArea.height;
            
            const length1 = 70 + Math.random() * 160;
            const length2 = 70 + Math.random() * 160;
            const thickness1 = 0.7;
            const thickness2 = 0.7;
            const angle = Math.random() < 0.5 ? 0 : Math.PI / 2;
            
            const useEarlyRange1 = Math.random() < 0.5;
            const intersectionRatio1 = useEarlyRange1 
                ? Math.random() * 0.3
                : 0.65 + Math.random() * 0.35;
            
            const useEarlyRange2 = Math.random() < 0.5;
            const intersectionRatio2 = useEarlyRange2 
                ? Math.random() * 0.3
                : 0.65 + Math.random() * 0.35;
            
            const newElement = new PlusElement(x, y, length1, length2, thickness1, thickness2, angle, intersectionRatio1, intersectionRatio2, this.scene);
            
            let intersects = false;
            for (const element of this.elements) {
                if (newElement.intersects(element)) {
                    intersects = true;
                    break;
                }
            }
            
            if (!intersects && !newElement.intersectsContent(this.contentBounds)) {
                this.elements.push(newElement);
                return;
            } else {
                // Clean up if spawn failed
                newElement.dispose();
            }
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update content bounds periodically
        if (Math.random() < 0.01) {
            this.updateContentBounds();
        }
        
        // Update and filter elements
        const currentTime = Date.now();
        this.elements = this.elements.filter(element => {
            const stillActive = element.update(currentTime);
            if (!stillActive) {
                element.dispose();
            }
            return stillActive;
        });
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BackgroundAnimation();
    });
} else {
    new BackgroundAnimation();
}
