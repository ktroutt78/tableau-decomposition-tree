/**
 * MAIN JAVASCRIPT FILE
 *
 * Handles:
 * - Navigation (sticky header, active links, mobile menu)
 * - Smooth scrolling
 * - Scroll animations
 * - Back to top functionality
 */

// ========== NAVIGATION ==========

// Get elements
const header = document.getElementById('header');
const navLinks = document.querySelectorAll('.nav-link');
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
const sections = document.querySelectorAll('section[id]');

// Sticky header on scroll
window.addEventListener('scroll', () => {
  if (window.scrollY > 100) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Mobile menu toggle
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');

    // Animate hamburger icon
    const spans = menuToggle.querySelectorAll('span');
    if (navMenu.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });
}

// Close mobile menu when clicking a link
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');

    // Reset hamburger icon
    const spans = menuToggle.querySelectorAll('span');
    spans[0].style.transform = 'none';
    spans[1].style.opacity = '1';
    spans[2].style.transform = 'none';
  });
});

// ========== ACTIVE NAVIGATION LINK ==========

// Highlight active section in navigation
function highlightActiveSection() {
  const scrollY = window.pageYOffset;

  sections.forEach(section => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 100; // Offset for header height
    const sectionId = section.getAttribute('id');
    const correspondingLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      // Remove active class from all links
      navLinks.forEach(link => link.classList.remove('active'));
      // Add active class to current section link
      if (correspondingLink) {
        correspondingLink.classList.add('active');
      }
    }
  });
}

// Listen for scroll events
window.addEventListener('scroll', highlightActiveSection);

// ========== SMOOTH SCROLLING ==========

// Already handled by CSS scroll-behavior: smooth,
// but adding JS for better browser support

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');

    // Only handle anchor links
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        const headerHeight = header.offsetHeight;
        const targetPosition = targetSection.offsetTop - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    }
  });
});

// ========== BACK TO TOP BUTTON ==========

const backToTopButton = document.querySelector('.back-to-top');

if (backToTopButton) {
  backToTopButton.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// ========== SCROLL ANIMATIONS ==========

/**
 * Fade in elements as they scroll into view
 * This is a lightweight alternative to AOS library
 */

// Function to check if element is in viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 200 &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Elements to animate
const animateElements = document.querySelectorAll(
  '.timeline-item, .cert-card, .skill-category, .project-card, .about-content'
);

// Add initial state
animateElements.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
});

// Function to animate elements
function animateOnScroll() {
  animateElements.forEach(el => {
    if (isInViewport(el)) {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }
  });
}

// Listen for scroll events
window.addEventListener('scroll', animateOnScroll);
// Run once on page load
window.addEventListener('load', animateOnScroll);

// ========== SKILL BAR ANIMATIONS ==========

/**
 * Animate skill bars when they come into view
 */

const skillBars = document.querySelectorAll('.skill-bar-fill');

function animateSkillBars() {
  skillBars.forEach(bar => {
    if (isInViewport(bar)) {
      const targetWidth = bar.style.width;
      bar.style.width = '0%';
      setTimeout(() => {
        bar.style.width = targetWidth;
      }, 100);
    }
  });
}

// Run skill bar animation once when skills section is visible
let skillsAnimated = false;
window.addEventListener('scroll', () => {
  const skillsSection = document.getElementById('skills');
  if (!skillsAnimated && skillsSection && isInViewport(skillsSection)) {
    animateSkillBars();
    skillsAnimated = true;
  }
});

// ========== SCROLL INDICATOR ==========

/**
 * Hide scroll indicator after user scrolls down
 */

const scrollIndicator = document.querySelector('.scroll-indicator');

if (scrollIndicator) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollIndicator.style.opacity = '0';
      scrollIndicator.style.pointerEvents = 'none';
    } else {
      scrollIndicator.style.opacity = '1';
      scrollIndicator.style.pointerEvents = 'auto';
    }
  });
}

// ========== LAZY LOADING IMAGES ==========

/**
 * Lazy load images for better performance
 * (Modern browsers support this natively with loading="lazy")
 */

if ('loading' in HTMLImageElement.prototype) {
  const images = document.querySelectorAll('img[loading="lazy"]');
  images.forEach(img => {
    img.src = img.dataset.src;
  });
} else {
  // Fallback for older browsers
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
  document.body.appendChild(script);
}

// ========== CONSOLE MESSAGE ==========

console.log('%c👋 Welcome to Keith Troutt\'s Portfolio!', 'color: #10B981; font-size: 20px; font-weight: bold;');
console.log('%cInterested in the code? Check out the GitHub repo!', 'color: #3B82F6; font-size: 14px;');
