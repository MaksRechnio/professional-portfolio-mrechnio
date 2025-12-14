// Hamburger Menu Toggle
// Controls the vertical navbar slide animation

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const verticalNavbar = document.getElementById('vertical-navbar');
    const closeMenu = document.getElementById('close-menu');
    
    if (!hamburgerMenu || !verticalNavbar) return;
    
    function openMenu() {
        verticalNavbar.classList.add('open');
        hamburgerMenu.classList.add('active');
    }
    
    function closeMenuFunc() {
        verticalNavbar.classList.remove('open');
        hamburgerMenu.classList.remove('active');
    }
    
    hamburgerMenu.addEventListener('click', () => {
        const isOpen = verticalNavbar.classList.contains('open');
        
        if (isOpen) {
            closeMenuFunc();
        } else {
            openMenu();
        }
    });
    
    // Close menu button
    if (closeMenu) {
        closeMenu.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMenuFunc();
        });
    }
    
    // Also close when clicking nav links
    const navLinks = document.querySelectorAll('.vertical-nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMenuFunc();
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (verticalNavbar.classList.contains('open') &&
            !verticalNavbar.contains(e.target) &&
            !hamburgerMenu.contains(e.target)) {
            closeMenuFunc();
        }
    });
});

