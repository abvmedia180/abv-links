// Scroll progress bar
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  const bar = document.getElementById('scrollProgress');
  if (bar) bar.style.width = progress + '%';
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) {
    if (window.scrollY > 50) { nav.classList.add('scrolled'); }
    else { nav.classList.remove('scrolled'); }
  }
});

// Scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

// FAQ toggle
function toggleFaq(btn) {
  const item = btn.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// Mobile menu
function toggleMobile() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// Smart floating Book button — hide when hero CTA is visible, show after scroll
(function() {
  function getCalButton() {
    // Cal.com renders the button inside an element with data-cal-namespace
    return document.querySelector('[data-cal-namespace="10min"]');
  }

  // Find the hero section or page-hero (inner pages use .page-hero)
  const hero = document.querySelector('.hero') || document.querySelector('.page-hero');
  if (!hero) return; // No hero on this page, always show button

  // Determine the threshold: bottom of hero section
  function getHeroBottom() {
    return hero.getBoundingClientRect().bottom + window.scrollY;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const btn = getCalButton();
      if (btn) {
        const heroBottom = getHeroBottom();
        if (window.scrollY < heroBottom - 200) {
          btn.classList.add('cal-hidden');
        } else {
          btn.classList.remove('cal-hidden');
        }
      }
      ticking = false;
    });
  }

  // Run on scroll + initially after a short delay (Cal.com loads async)
  window.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(() => {
    const btn = getCalButton();
    if (btn) btn.classList.add('cal-hidden'); // Start hidden if hero is visible
    onScroll();
  }, 1500);
})();
