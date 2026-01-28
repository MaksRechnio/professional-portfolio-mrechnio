// Scroll-triggered animation for project tiles
// Tiles slide and pop in from the right when they enter viewport
// Tiles slide out when they leave viewport

(function() {
    const projectTiles = document.querySelectorAll('.project-tile');
    
    if (projectTiles.length === 0) return;

    // Set up Intersection Observer
    const observerOptions = {
        threshold: 0.2, // Trigger when 20% of tile is visible
        rootMargin: '0px 0px -50px 0px' // Start animation slightly before fully in view
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add animation class when tile enters viewport
                entry.target.classList.add('tile-animate');
                entry.target.classList.remove('tile-animate-out');
            } else {
                // Remove animation class and add fade-out when tile leaves viewport
                if (entry.target.classList.contains('tile-animate')) {
                    entry.target.classList.remove('tile-animate');
                    entry.target.classList.add('tile-animate-out');
                }
            }
        });
    }, observerOptions);

    // Observe all tiles
    projectTiles.forEach(tile => {
        observer.observe(tile);
    });
})();
