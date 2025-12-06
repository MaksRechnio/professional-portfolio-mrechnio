// Letter-by-Letter Reveal Animation
// Letters appear one by one quickly to form the new word

const greetings = ["Hey!", "Cześć!", "Hoi!"];
let currentIndex = 0;
let isAnimating = false;
let animationTimeout = null;

function initGreetingAnimation() {
    const greetingElement = document.getElementById('greeting-text');
    if (!greetingElement) return;
    
    // Set initial text with letter-by-letter reveal
    displayTextWithAnimation(greetingElement, greetings[currentIndex]);
    
    // Start the cycle
    animationTimeout = setTimeout(() => {
        cycleGreeting();
    }, 10000); // First change after 10 seconds
}

function displayTextWithAnimation(element, text) {
    // Clear existing content
    element.innerHTML = '';
    
    // Split text into characters (including spaces and punctuation)
    const characters = text.split('');
    
    // Create a span for each character
    characters.forEach((char, index) => {
        const span = document.createElement('span');
        span.className = 'greeting-letter';
        span.textContent = char === ' ' ? '\u00A0' : char; // Non-breaking space for spaces
        
        // Stagger animation delay for each letter
        span.style.animationDelay = `${index * 0.08}s`; // 80ms between each letter
        
        element.appendChild(span);
    });
}

function cycleGreeting() {
    if (isAnimating) return;
    
    const greetingElement = document.getElementById('greeting-text');
    if (!greetingElement) return;
    
    isAnimating = true;
    
    // Move to next greeting
    currentIndex = (currentIndex + 1) % greetings.length;
    const newText = greetings[currentIndex];
    
    // Display new text with letter-by-letter animation
    displayTextWithAnimation(greetingElement, newText);
    
    // Calculate total animation duration
    // Last letter starts at (length - 1) * 80ms, then takes 400ms to animate
    const animationDuration = (newText.length - 1) * 80 + 400; // Correct: last letter delay + animation duration
    
    // After animation completes, schedule next change
    setTimeout(() => {
        isAnimating = false;
        
        // Schedule next change
        animationTimeout = setTimeout(() => {
            cycleGreeting();
        }, 10000); // Change every 10 seconds
    }, animationDuration);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initGreetingAnimation();
        }, 100);
    });
} else {
    setTimeout(() => {
        initGreetingAnimation();
    }, 100);
}
