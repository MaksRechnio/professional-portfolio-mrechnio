// Custom Cursor Animation
document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');
    
    if (!cursor) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    
    // Get the canvas container and canvas element
    const canvasContainer = document.getElementById('canvas-container');
    let canvas = null;
    let profileImage = null;
    
    // Wait for canvas to be available
    function findCanvas() {
        if (canvasContainer) {
            canvas = canvasContainer.querySelector('canvas');
            if (canvas) {
                // Load the profile image to check pixel data
                profileImage = new Image();
                profileImage.crossOrigin = 'anonymous';
                profileImage.src = 'mrech.png';
                profileImage.onload = () => {
                    console.log('Profile image loaded for cursor detection:', profileImage.width, 'x', profileImage.height);
                };
                profileImage.onerror = (error) => {
                    console.error('Error loading mrech.png for cursor detection:', error);
                };
            }
        }
        if (!canvas) {
            setTimeout(findCanvas, 100);
        }
    }
    findCanvas();
    
    // Check if mouse is over silhouette pixels by reading the rendered canvas
    function isOverSilhouette(x, y) {
        if (!canvasContainer || !canvas) return false;
        
        const rect = canvasContainer.getBoundingClientRect();
        
        // Check if mouse is within canvas bounds
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            return false;
        }
        
        // Get relative position within canvas container
        const containerX = x - rect.left;
        const containerY = y - rect.top;
        
        // Convert to canvas coordinates (accounting for device pixel ratio)
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        
        const canvasX = Math.floor(containerX * scaleX);
        const canvasY = Math.floor(containerY * scaleY);
        
        // Check bounds
        if (canvasX < 0 || canvasX >= canvas.width || canvasY < 0 || canvasY >= canvas.height) {
            return false;
        }
        
        try {
            // Read pixel data from the rendered canvas
            const ctx = canvas.getContext('webgl') || canvas.getContext('webgl2');
            if (!ctx) {
                // Fallback: use 2d context if WebGL not available
                const ctx2d = canvas.getContext('2d');
                if (!ctx2d) return false;
                const imageData = ctx2d.getImageData(canvasX, canvasY, 1, 1);
                const alpha = imageData.data[3];
                return alpha > 10; // Threshold for silhouette detection
            }
            
            // For WebGL, we need to read from the framebuffer
            // This is more complex, so we'll use a simpler approach:
            // Check the source image at the corresponding UV coordinates
            if (profileImage) {
                const normalizedX = containerX / rect.width;
                const normalizedY = containerY / rect.height;
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = profileImage.width;
                tempCanvas.height = profileImage.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(profileImage, 0, 0);
                
                const imageX = Math.floor(normalizedX * profileImage.width);
                const imageY = Math.floor(normalizedY * profileImage.height);
                
                if (imageX >= 0 && imageX < profileImage.width && imageY >= 0 && imageY < profileImage.height) {
                    const imageData = tempCtx.getImageData(imageX, imageY, 1, 1);
                    const alpha = imageData.data[3];
                    return alpha > 5; // Threshold for silhouette detection
                }
            }
        } catch (e) {
            console.error('Error reading pixel data:', e);
        }
        
        return false;
    }
    
    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Check if mouse is over silhouette pixels
        const overSilhouette = isOverSilhouette(mouseX, mouseY);
        
        // Hide cursor when over silhouette
        if (overSilhouette) {
            cursor.classList.add('hidden');
        } else {
            cursor.classList.remove('hidden');
        }
    });
    
    // Smooth cursor animation
    function animateCursor() {
        // Smooth interpolation for smooth movement
        cursorX += (mouseX - cursorX) * 0.15;
        cursorY += (mouseY - cursorY) * 0.15;
        
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        
        requestAnimationFrame(animateCursor);
    }
    
    // Hide cursor on mouse leave
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
    });
    
    // Show cursor on mouse enter
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
    });
    
    // Start animation
    animateCursor();
    
    // Hide default cursor using CSS only (no inline styles)
    // The CSS file already handles cursor: none !important for all elements
});

