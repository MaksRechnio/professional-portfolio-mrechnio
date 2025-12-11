// Tab Visibility Handler - Change title when user switches tabs
(function() {
    const originalTitle = document.title || 'Maksymilian Rechnio - UX/UI Designer';
    let timeoutId = null;
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // User switched to another tab - set timeout to change title after 2 seconds
            timeoutId = setTimeout(() => {
                document.title = 'Come back! 🥺🥺';
            }, 2000);
        } else {
            // User came back to the tab
            // Clear the timeout if it hasn't fired yet
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            // Restore original title immediately
            document.title = originalTitle;
        }
    });
    
    // Also handle window blur/focus as fallback
    window.addEventListener('blur', () => {
        timeoutId = setTimeout(() => {
            document.title = 'Come back!🥺';
        }, 2000);
    });
    
    window.addEventListener('focus', () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        document.title = originalTitle;
    });
})();

