import { logout } from './auth.js';

document.getElementById('logout-btn')?.addEventListener('click', logout);
document.getElementById('logout-btn-mobile')?.addEventListener('click', logout);
document.getElementById('logout-btn-icon')?.addEventListener('click', logout);

const hamburger = document.getElementById('hamburger');
const navDrawer = document.getElementById('nav-drawer');
const navOverlay = document.getElementById('nav-overlay');

function toggleDrawer(open) {
  if (open) {
    navDrawer?.classList.add('open');
    hamburger?.classList.add('open');
    if (navOverlay) navOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  } else {
    navDrawer?.classList.remove('open');
    hamburger?.classList.remove('open');
    if (navOverlay) navOverlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
}

if (hamburger && navDrawer) {
  hamburger.addEventListener('click', () => toggleDrawer(!navDrawer.classList.contains('open')));
  if (navOverlay) navOverlay.addEventListener('click', () => toggleDrawer(false));
  navDrawer.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => toggleDrawer(false));
  });
}