// Footer Title Animation - Scrolling marquee with looping variations

const titleVariations = [
    {
        text: "UX Designer | Creative Advertising Strategist",
        parts: [
            { text: "UX", weight: "semibold" },
            { text: " Designer | Creative", weight: "extrathin" },
            { text: " Advertising", weight: "bold" },
            { text: " Strategist", weight: "regular" }
        ]
    },
    {
        text: "UX Designer | Creative Advertising Strategist",
        parts: [
            { text: "UX", weight: "semibold" },
            { text: " Designer | Creative", weight: "extrathin" },
            { text: " Advertising", weight: "bold" },
            { text: " Strategist", weight: "regular" }
        ]
    },
    {
        text: "UX Designer | Creative Advertising Strategist",
        parts: [
            { text: "UX", weight: "semibold" },
            { text: " Designer | Creative", weight: "extrathin" },
            { text: " Advertising", weight: "bold" },
            { text: " Strategist", weight: "regular" }
        ]
    },
    {
        text: "UX Designer | Creative Advertising Strategist",
        parts: [
            { text: "UX", weight: "semibold" },
            { text: " Designer | Creative", weight: "extrathin" },
            { text: " Advertising", weight: "bold" },
            { text: " Strategist", weight: "regular" }
        ]
    }
];

let currentTitleIndex = 0;

function initFooterAnimation() {
    const footerTitle1 = document.getElementById('footer-title-1');
    const footerTitle2 = document.getElementById('footer-title-2');
    
    if (!footerTitle1 || !footerTitle2) return;
    
    // Initial display for both titles
    displayTitle(footerTitle1, titleVariations[currentTitleIndex]);
    displayTitle(footerTitle2, titleVariations[currentTitleIndex]);
    
    // Start cycling through variations
    setTimeout(() => {
        cycleTitle();
    }, 4000); // First change after 4 seconds
}

function displayTitle(element, variation) {
    element.innerHTML = '';
    
    variation.parts.forEach((part) => {
        const span = document.createElement('span');
        span.textContent = part.text;
        
        if (part.weight === 'semibold') {
            span.className = 'title-semibold';
        } else if (part.weight === 'extrathin') {
            span.className = 'title-extrathin';
        } else if (part.weight === 'bold') {
            span.className = 'title-bold';
        } else if (part.weight === 'regular') {
            span.className = 'title-regular';
        }
        
        element.appendChild(span);
    });
}

function cycleTitle() {
    const footerTitle1 = document.getElementById('footer-title-1');
    const footerTitle2 = document.getElementById('footer-title-2');
    
    if (!footerTitle1 || !footerTitle2) return;
    
    // Move to next variation
    currentTitleIndex = (currentTitleIndex + 1) % titleVariations.length;
    
    // Update both titles simultaneously
    displayTitle(footerTitle1, titleVariations[currentTitleIndex]);
    displayTitle(footerTitle2, titleVariations[currentTitleIndex]);
    
    // Schedule next change
    setTimeout(() => {
        cycleTitle();
    }, 4000); // Change every 4 seconds
}

// Email copy to clipboard functionality
function initEmailCopy() {
    const emailLink = document.getElementById('footer-email');
    if (!emailLink) return;
    
    emailLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailLink.getAttribute('data-email');
        
        try {
            await navigator.clipboard.writeText(email);
            
            // Visual feedback
            const originalText = emailLink.textContent;
            emailLink.textContent = 'Copied!';
            emailLink.style.opacity = '0.7';
            
            setTimeout(() => {
                emailLink.textContent = originalText;
                emailLink.style.opacity = '1';
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = email;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                const originalText = emailLink.textContent;
                emailLink.textContent = 'Copied!';
                emailLink.style.opacity = '0.7';
                
                setTimeout(() => {
                    emailLink.textContent = originalText;
                    emailLink.style.opacity = '1';
                }, 2000);
            } catch (fallbackErr) {
                console.error('Failed to copy email:', fallbackErr);
            }
            
            document.body.removeChild(textArea);
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initFooterAnimation();
            initEmailCopy();
        }, 100);
    });
} else {
    setTimeout(() => {
        initFooterAnimation();
        initEmailCopy();
    }, 100);
}
