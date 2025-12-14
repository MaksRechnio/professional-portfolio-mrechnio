// UX Label Scroll Animation
// Animates the orange "UX / UI Designer" label to slide down the white line as user scrolls

function initUXLabelScrollAnimation() {
    const uxLabel = document.querySelector('.ux-label');
    const container = document.querySelector('.container');
    const quoteSection = document.getElementById('quote-section');
    
    if (!uxLabel || !container || !quoteSection) return;
    
    // Initial positions
    const startTop = 240; // Initial position of UX label
    const endTop = 840; // Final position (where year label is - updated to match extended line)
    const distance = endTop - startTop; // 600px distance to travel
    
    function updateUXLabelPosition() {
        const containerRect = container.getBoundingClientRect();
        const quoteRect = quoteSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const scrollPosition = window.scrollY;
        
        // Get container's document position and dimensions
        const containerTop = container.offsetTop;
        const containerHeight = container.offsetHeight;
        const containerBottom = containerTop + containerHeight;
        
        // Animation should start as soon as user starts scrolling (scrollPosition > 0)
        // Animation should complete when container is fully scrolled past viewport
        // Reduced extension for faster movement
        const animationStartScroll = 0; // Start immediately when scrolling begins
        
        // Extend the end point slightly for smoother animation feel
        const baseEndScroll = containerBottom - windowHeight;
        const animationEndScroll = baseEndScroll + (containerHeight * 0.4); // Reduced extension for faster movement
        
        // Calculate scroll progress (0 to 1)
        let progress = 0;
        
        if (scrollPosition >= animationStartScroll && scrollPosition <= animationEndScroll) {
            // Normalize progress: 0 at scroll start, 1 when extended scroll range completes
            progress = (scrollPosition - animationStartScroll) / (animationEndScroll - animationStartScroll);
            progress = Math.max(0, Math.min(1, progress));
        } else if (scrollPosition > animationEndScroll) {
            progress = 1; // Fully scrolled past extended range
        }
        
        // Calculate new top position - slide from startTop (240px) to endTop (840px)
        const newTop = startTop + (distance * progress);
        
        // Apply position with smooth transition
        uxLabel.style.top = `${newTop}px`;
        uxLabel.style.transition = 'top 0.08s ease-out'; // Smooth transition for natural feel
        
        // Hide label only at the very end of the line (when it reaches endTop)
        // Don't fade until the label has reached the end position (840px)
        const labelReachedEnd = newTop >= endTop - 20; // Allow 20px tolerance for smooth fade
        
        const quoteSectionTop = quoteRect.top;
        const fadeStart = windowHeight * 0.15; // Start fading only when quote section is very close (15% from top)
        const fadeEnd = windowHeight * 0.05; // Fully faded when quote section is at 5% from top
        
        // Only fade out when label has reached the end of the line AND quote section is approaching
        if (labelReachedEnd && quoteSectionTop < fadeStart && quoteSectionTop > fadeEnd) {
            // Calculate fade progress - only fade when label is at end
            const fadeProgress = (fadeStart - quoteSectionTop) / (fadeStart - fadeEnd);
            uxLabel.style.opacity = Math.max(0, 1 - fadeProgress);
            uxLabel.style.visibility = 'visible';
        } else if (labelReachedEnd && quoteSectionTop <= fadeEnd) {
            // Fully hidden when quote section is past fade point
            uxLabel.style.opacity = 0;
            uxLabel.style.visibility = 'hidden';
        } else {
            // Always visible until label reaches the end of the line
            uxLabel.style.opacity = 1;
            uxLabel.style.visibility = 'visible';
        }
    }
    
    // Update on scroll with throttling for better performance
    let ticking = false;
    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateUXLabelPosition();
                ticking = false;
            });
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateUXLabelPosition, { passive: true });
    
    // Initial update
    updateUXLabelPosition();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUXLabelScrollAnimation);
} else {
    initUXLabelScrollAnimation();
}

