// Parallax scrolling effect for project tiles
// Left column scrolls 20% faster than right column

(function() {
    const projectsSection = document.getElementById('projects-section');
    if (!projectsSection) return;

    const leftTiles = document.querySelectorAll('.project-tile-left');
    const rightTiles = document.querySelectorAll('.project-tile:not(.project-tile-left)');
    
    let ticking = false;

    function updateParallax() {
        const rect = projectsSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY || window.pageYOffset;
        
        // Calculate parallax based on scroll position relative to section
        // Left column: 5% faster scroll movement
        const parallaxSpeed = 0.05; // 5% faster
        const parallaxOffset = scrollY * parallaxSpeed;

        // Apply parallax offset using CSS custom properties
        // Only update if tile has already animated (to avoid conflicts)
        leftTiles.forEach(tile => {
            if (tile.classList.contains('tile-animate')) {
                tile.style.setProperty('--parallax-offset', `${parallaxOffset}px`);
            }
        });

        // Right column stays at normal speed (no parallax offset)
        rightTiles.forEach(tile => {
            if (tile.classList.contains('tile-animate')) {
                tile.style.setProperty('--parallax-offset', '0px');
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

    // Listen to scroll events
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Initial call
    updateParallax();
})();
