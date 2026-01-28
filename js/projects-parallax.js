// Parallax scrolling effect and mouse movement for project tiles
// Left column scrolls 5% faster than right column
// Tiles move slightly based on mouse position (like first section elements)

(function() {
    const projectsSection = document.getElementById('projects-section');
    if (!projectsSection) return;

    const leftTiles = document.querySelectorAll('.project-tile-left');
    const rightTiles = document.querySelectorAll('.project-tile:not(.project-tile-left)');
    const allTiles = document.querySelectorAll('.project-tile');
    
    let ticking = false;
    
    // Mouse tracking for tile movement
    let globalMouseX = 0.5;
    let globalMouseY = 0.5;
    
    // Store tile movement state
    const tileStates = [];
    allTiles.forEach(tile => {
        tileStates.push({
            element: tile,
            mouseOffsetX: 0,
            mouseOffsetY: 0,
            targetMouseOffsetX: 0,
            targetMouseOffsetY: 0
        });
    });

    function updateParallax() {
        const rect = projectsSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY || window.pageYOffset;
        
        // Calculate parallax based on scroll position relative to section
        // Left column: 5% faster scroll movement
        const parallaxSpeed = 0.05; // 5% faster
        const parallaxOffset = scrollY * parallaxSpeed;

        // Calculate mouse-based movement offsets (similar to first section)
        const normalizedX = (globalMouseX - 0.5) * 2.0; // -1 to 1
        const normalizedY = (globalMouseY - 0.5) * 2.0; // -1 to 1
        
        // Update target mouse offsets for all tiles
        const mouseMovementStrength = 4.0; // Increased movement for better visibility
        tileStates.forEach(state => {
            state.targetMouseOffsetX = normalizedX * mouseMovementStrength;
            state.targetMouseOffsetY = normalizedY * mouseMovementStrength;
        });

        // Apply parallax offset and mouse movement using CSS custom properties
        // Only update if tile has already animated (to avoid conflicts)
        leftTiles.forEach((tile, index) => {
            if (tile.classList.contains('tile-animate')) {
                const state = tileStates.find(s => s.element === tile);
                if (state) {
                    // Smooth interpolation for mouse movement
                    const lerpFactor = 0.03;
                    state.mouseOffsetX += (state.targetMouseOffsetX - state.mouseOffsetX) * lerpFactor;
                    state.mouseOffsetY += (state.targetMouseOffsetY - state.mouseOffsetY) * lerpFactor;
                    
                    tile.style.setProperty('--parallax-offset', `${parallaxOffset}px`);
                    tile.style.setProperty('--mouse-offset-x', `${state.mouseOffsetX}px`);
                    tile.style.setProperty('--mouse-offset-y', `${state.mouseOffsetY}px`);
                }
            }
        });

        // Right column stays at normal speed (no parallax offset)
        rightTiles.forEach((tile, index) => {
            if (tile.classList.contains('tile-animate')) {
                const state = tileStates.find(s => s.element === tile);
                if (state) {
                    // Smooth interpolation for mouse movement
                    const lerpFactor = 0.03;
                    state.mouseOffsetX += (state.targetMouseOffsetX - state.mouseOffsetX) * lerpFactor;
                    state.mouseOffsetY += (state.targetMouseOffsetY - state.mouseOffsetY) * lerpFactor;
                    
                    tile.style.setProperty('--parallax-offset', '0px');
                    tile.style.setProperty('--mouse-offset-x', `${state.mouseOffsetX}px`);
                    tile.style.setProperty('--mouse-offset-y', `${state.mouseOffsetY}px`);
                }
            }
        });

        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    // Global mouse move handler for tile movement
    function onGlobalMouseMove(event) {
        globalMouseX = event.clientX / window.innerWidth;
        globalMouseY = event.clientY / window.innerHeight;
        requestTick();
    }

    // Listen to scroll events
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Listen to mouse move events
    window.addEventListener('mousemove', onGlobalMouseMove, { passive: true });
    
    // Initial call
    updateParallax();
    
    // Continuous animation loop for smooth mouse movement
    function animateMouseMovement() {
        requestTick();
        requestAnimationFrame(animateMouseMovement);
    }
    animateMouseMovement();
})();
