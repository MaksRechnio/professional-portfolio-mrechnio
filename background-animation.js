// Background Animation - Animated Plus Signs
// Elements consist of 2 crossed lines at 90 degrees with rounded ends

class PlusElement {
    constructor(x, y, length1, length2, thickness1, thickness2, angle, intersectionRatio1, intersectionRatio2) {
        this.x = x;
        this.y = y;
        this.length1 = length1; // First line length
        this.length2 = length2; // Second line length
        this.thickness1 = thickness1; // First line thickness
        this.thickness2 = thickness2; // Second line thickness
        this.angle = angle; // Rotation angle (0 = horizontal/vertical)
        this.intersectionRatio1 = intersectionRatio1; // Where line1 intersects (0-0.3 or 0.65-1.0)
        this.intersectionRatio2 = intersectionRatio2; // Where line2 intersects (0-0.3 or 0.65-1.0)
        
        // Animation state
        this.phase = 0; // 0 = extending, 1 = retracting, 2 = fading out
        this.progress = 0; // 0 to 1 (length multiplier)
        this.opacity = 0;
        this.startTime = Date.now(); // Track actual time for frame-rate independent animation
        this.phaseStartTime = Date.now(); // Track when current phase started
        
        // Calculate bounding box for collision detection (accounting for intersection offset)
        const maxLength = Math.max(length1, length2);
        // Expand bounds to account for intersection not being at center
        this.bounds = {
            x: x - maxLength / 2,
            y: y - maxLength / 2,
            width: maxLength,
            height: maxLength
        };
    }
    
    // Check if this element intersects with another
    intersects(other) {
        // Simple bounding box check first
        if (this.bounds.x + this.bounds.width < other.bounds.x ||
            other.bounds.x + other.bounds.width < this.bounds.x ||
            this.bounds.y + this.bounds.height < other.bounds.y ||
            other.bounds.y + other.bounds.height < this.bounds.y) {
            return false;
        }
        
        // More precise line intersection check
        // Get the 4 line segments (2 lines, each with 2 halves from center)
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
        
        // Line 1: Calculate start and end based on intersection ratio
        // intersectionRatio1 is where along line1 the intersection occurs (0-0.3 or 0.65-1.0)
        const line1StartDist = this.length1 * this.intersectionRatio1;
        const line1EndDist = this.length1 * (1 - this.intersectionRatio1);
        
        const line1Start = {
            x: this.x - line1StartDist * cos,
            y: this.y - line1StartDist * sin
        };
        const line1End = {
            x: this.x + line1EndDist * cos,
            y: this.y + line1EndDist * sin
        };
        
        // Line 2: Calculate start and end based on intersection ratio
        // intersectionRatio2 is where along line2 the intersection occurs (0-0.3 or 0.65-1.0)
        const line2StartDist = this.length2 * this.intersectionRatio2;
        const line2EndDist = this.length2 * (1 - this.intersectionRatio2);
        
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
        // Check if two line segments intersect
        const x1 = line1.start.x, y1 = line1.start.y;
        const x2 = line1.end.x, y2 = line1.end.y;
        const x3 = line2.start.x, y3 = line2.start.y;
        const x4 = line2.end.x, y4 = line2.end.y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return false; // Parallel lines
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
    
    // Check if element intersects with content areas (text, picture)
    // Elements should only appear in empty background space, not where there's content
    intersectsContent(contentBounds) {
        const lineSegments = this.getLineSegments();
        
        for (const bounds of contentBounds) {
            // Check if intersection point is inside or too close to content
            const intersectionPadding = 20; // Padding around content
            if (this.x >= bounds.x - intersectionPadding &&
                this.x <= bounds.x + bounds.width + intersectionPadding &&
                this.y >= bounds.y - intersectionPadding &&
                this.y <= bounds.y + bounds.height + intersectionPadding) {
                return true; // Intersection point is too close to content
            }
            
            // Check if any line segment crosses through content bounds
            for (const line of lineSegments) {
                if (this.lineIntersectsRect(line, bounds)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // Check if a line segment intersects with a rectangle
    lineIntersectsRect(line, rect) {
        // Check if line intersects any of the rectangle's edges
        const rectEdges = [
            { start: { x: rect.x, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y } }, // top
            { start: { x: rect.x + rect.width, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y + rect.height } }, // right
            { start: { x: rect.x + rect.width, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y + rect.height } }, // bottom
            { start: { x: rect.x, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y } } // left
        ];
        
        for (const edge of rectEdges) {
            if (this.lineIntersects(line, edge)) {
                return true;
            }
        }
        
        // Also check if line is completely inside the rectangle
        if (line.start.x >= rect.x && line.start.x <= rect.x + rect.width &&
            line.start.y >= rect.y && line.start.y <= rect.y + rect.height &&
            line.end.x >= rect.x && line.end.x <= rect.x + rect.width &&
            line.end.y >= rect.y && line.end.y <= rect.y + rect.height) {
            return true;
        }
        
        return false;
    }
    
    update(currentTime) {
        const extendDuration = 3.0; // 3 seconds to extend
        const retractDuration = 3.0; // 3 seconds to retract back to intersection (same as extend)
        const fadeDuration = 0.3; // 0.3 seconds to fade out
        
        if (this.phase === 0) {
            // Extending phase: progress from 0 to 1
            const phaseTime = (currentTime - this.phaseStartTime) / 1000;
            this.progress = Math.min(phaseTime / extendDuration, 1.0);
            this.opacity = Math.min(this.progress * 0.3, 0.3); // Fade in to 30% opacity
            
            if (this.progress >= 1.0) {
                this.progress = 1.0;
                this.phaseStartTime = currentTime; // Reset timer for next phase
                this.phase = 1; // Move to retracting
            }
        } else if (this.phase === 1) {
            // Retracting phase: progress from 1.0 back to 0 (intersection point)
            const phaseTime = (currentTime - this.phaseStartTime) / 1000;
            this.progress = Math.max(1.0 - (phaseTime / retractDuration), 0.0);
            this.opacity = 0.3; // Stay at 30% opacity
            
            if (this.progress <= 0.0) {
                this.progress = 0.0;
                this.phaseStartTime = currentTime; // Reset timer
                this.phase = 2; // Move to fading out
            }
        } else if (this.phase === 2) {
            // Fading out phase: keep at intersection (0% length), fade opacity from 30% to 0
            const phaseTime = (currentTime - this.phaseStartTime) / 1000;
            this.progress = 0.0; // Keep at intersection point (0% length)
            const fadeProgress = Math.min(phaseTime / fadeDuration, 1.0);
            this.opacity = 0.3 * (1 - fadeProgress); // Fade out from 30% to 0
            
            if (this.opacity <= 0) {
                return false; // Element should be removed
            }
        }
        
        return true; // Element still active
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = '#E6E9EB';
        ctx.lineCap = 'round'; // Rounded ends
        
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        // Current lengths based on progress
        const currentLength1 = this.length1 * this.progress;
        const currentLength2 = this.length2 * this.progress;
        
        // Calculate start and end points based on intersection ratio
        const line1StartDist = currentLength1 * this.intersectionRatio1;
        const line1EndDist = currentLength1 * (1 - this.intersectionRatio1);
        
        const line2StartDist = currentLength2 * this.intersectionRatio2;
        const line2EndDist = currentLength2 * (1 - this.intersectionRatio2);
        
        // Draw first line
        ctx.lineWidth = this.thickness1;
        ctx.beginPath();
        ctx.moveTo(
            this.x - line1StartDist * cos,
            this.y - line1StartDist * sin
        );
        ctx.lineTo(
            this.x + line1EndDist * cos,
            this.y + line1EndDist * sin
        );
        ctx.stroke();
        
        // Draw second line (rotated 90 degrees)
        ctx.lineWidth = this.thickness2;
        ctx.beginPath();
        ctx.moveTo(
            this.x - line2StartDist * (-sin),
            this.y - line2StartDist * cos
        );
        ctx.lineTo(
            this.x + line2EndDist * (-sin),
            this.y + line2EndDist * cos
        );
        ctx.stroke();
        
        ctx.restore();
    }
}

class BackgroundAnimation {
    constructor() {
        this.canvas = document.getElementById('background-animation');
        this.ctx = this.canvas.getContext('2d');
        this.elements = [];
        this.contentBounds = [];
        this.allowedArea = null; // Area where elements can spawn (underneath texts)
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.updateContentBounds();
        
        // Spawn initial elements immediately
        setTimeout(() => {
            for (let i = 0; i < 10; i++) {
                this.trySpawnElement();
            }
        }, 100);
        
        this.animate();
        
        // Spawn multiple elements more frequently and densely
        this.spawnInterval = setInterval(() => {
            // Spawn 3-6 elements at once (more dense)
            const spawnCount = 3 + Math.floor(Math.random() * 4); // 3, 4, 5, or 6 elements
            for (let i = 0; i < spawnCount; i++) {
                setTimeout(() => this.trySpawnElement(), i * 50); // Stagger slightly
            }
        }, 500); // Try every 0.5 seconds (much more frequent)
    }
    
    resize() {
        // Set canvas size to match viewport
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(dpr, dpr);
        this.updateContentBounds();
    }
    
    updateContentBounds() {
        // Get bounds of content elements to avoid
        this.contentBounds = [];
        
        // Get greeting text bounds
        const greeting = document.querySelector('.greeting');
        if (greeting) {
            const rect = greeting.getBoundingClientRect();
            this.contentBounds.push({
                x: rect.left - 50, // Add padding
                y: rect.top - 50,
                width: rect.width + 100,
                height: rect.height + 100
            });
        }
        
        // Get intro text bounds
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
        
        // Get stats section bounds
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
        
        // Get canvas container (picture) bounds
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
        
        // Get header bounds (includes navbar)
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
        
        // Get nav links individually for better coverage
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
        
        // Get CTA button
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
        
        // Get vertical line bounds (left side)
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
        
        // Define allowed spawn area (underneath texts only)
        // Get main content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const rect = mainContent.getBoundingClientRect();
            // Store allowed area for spawning
            this.allowedArea = {
                x: rect.left,
                y: rect.top + rect.height, // Start below the text content
                width: rect.width,
                height: window.innerHeight - (rect.top + rect.height) // Rest of viewport height
            };
        } else {
            // Fallback: use entire viewport
            this.allowedArea = {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        }
    }
    
    trySpawnElement() {
        // Try to spawn a new element
        const maxAttempts = 100; // Increased attempts
        
        // Use allowed area (underneath texts) if defined, otherwise use viewport
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
            // Random position within allowed area only (underneath texts)
            const x = spawnArea.x + Math.random() * spawnArea.width;
            const y = spawnArea.y + Math.random() * spawnArea.height;
            
            // Random lengths (70px to 230px)
            const length1 = 70 + Math.random() * 160;
            const length2 = 70 + Math.random() * 160;
            
            // Slightly thinner thickness (0.7px)
            const thickness1 = 0.7;
            const thickness2 = 0.7;
            
            // Angle can only be 0 or 90 degrees (straight horizontal/vertical)
            // 0 = horizontal/vertical, 90 = vertical/horizontal (rotated 90 degrees)
            const angle = Math.random() < 0.5 ? 0 : Math.PI / 2;
            
            // Intersection ratios: must be in 0-30% or 65-100% range
            // Choose random range for each line
            const useEarlyRange1 = Math.random() < 0.5;
            const intersectionRatio1 = useEarlyRange1 
                ? Math.random() * 0.3  // 0-30%
                : 0.65 + Math.random() * 0.35; // 65-100%
            
            const useEarlyRange2 = Math.random() < 0.5;
            const intersectionRatio2 = useEarlyRange2 
                ? Math.random() * 0.3  // 0-30%
                : 0.65 + Math.random() * 0.35; // 65-100%
            
            const newElement = new PlusElement(x, y, length1, length2, thickness1, thickness2, angle, intersectionRatio1, intersectionRatio2);
            
            // Check if it intersects with existing elements
            let intersects = false;
            for (const element of this.elements) {
                if (newElement.intersects(element)) {
                    intersects = true;
                    break;
                }
            }
            
            // Check if it intersects with content (text, navbar, etc.)
            if (!intersects && !newElement.intersectsContent(this.contentBounds)) {
                this.elements.push(newElement);
                console.log('Spawned element at', x, y, 'Total elements:', this.elements.length);
                return; // Successfully spawned
            }
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update content bounds periodically (in case content moves)
        if (Math.random() < 0.01) { // 1% chance per frame
            this.updateContentBounds();
        }
        
        // Update and draw elements
        const currentTime = Date.now();
        this.elements = this.elements.filter(element => {
            const stillActive = element.update(currentTime);
            if (stillActive) {
                element.draw(this.ctx);
            }
            return stillActive;
        });
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

