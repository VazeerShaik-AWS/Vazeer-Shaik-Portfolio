/* ================================
   PRODUCTION PORTFOLIO JAVASCRIPT
   Optimized for Performance & UX
   ================================ */

// Scroll layout cache + idle scheduling
let sectionBounds = [];
let scrollDocHeight = 0;
let navOffsetCached = 64;

// Initialize animations on DOM ready
document.addEventListener('DOMContentLoaded', initPortfolio, { once: true });

function initPortfolio() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
    revealAllAnimatedElements();
  }

  document.documentElement.classList.add('perf-unified-scroll');

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-ready');
    });
  } else {
    document.documentElement.classList.add('fonts-ready');
  }

  setupInstantReveal();
  setupPlatformClasses();
  refreshNavMetrics();
  setupMobileNav(); // before setupNavigation so mobileMenu API is ready
  setupNavigation();
  setupFooterVsEasterEgg();
  setupModals();
  setupAnimationPausing();
  setupDeployFlowLive();
  setupRipples();
  setupImageLayoutRefresh();
  setupHeavyImageWarmup();
  setupFastTouch();
  setupProjectFilters();
  setupScrollPerf();

  window.addEventListener('load', () => {
    refreshNavMetrics();
    cacheScrollLayout(document.querySelectorAll('section[id]'));
    navSpyApi?.refreshSpy?.();
    mobileMenu?.updateNavMenuAnchor?.();
    handleInitialHashScroll();
  }, { once: true });

  // Safety: reveal content if scroll observer never fires
  setTimeout(() => {
    document.documentElement.classList.add('fonts-ready');
    document.querySelectorAll('[data-animate]:not(.animate-in)').forEach((el) => {
      el.classList.add('animate-in');
    });
    document.querySelectorAll('.hero-intro > .hero-identity, .hero-content > .hero-credential-card').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }, 800);
}

function revealAllAnimatedElements() {
  document.querySelectorAll(
    '[data-animate], .featured-project-card, .additional-project-card, ' +
    '.achievement-card, .skill-card, .badge-item, ' +
    '.section-title, .deploy-card, .deploy-node, .deploy-step-item'
  ).forEach((el) => {
    el.classList.add('animate-in');
  });
}

function setupPlatformClasses() {
  const root = document.documentElement;
  const apply = () => {
    const mobile = isMobileNavLayout();
    root.classList.toggle('platform-mobile', mobile);
    root.classList.toggle('platform-desktop', !mobile);
  };

  apply();

  window.matchMedia('(max-width: 768px)').addEventListener('change', () => {
    apply();
    refreshNavMetrics(true);
    cacheScrollLayout(document.querySelectorAll('section[id]'));
    navSpyApi?.refreshSpy?.();
    navIndicatorApi?.refreshMetrics?.();
    mobileMenu?.updateNavMenuAnchor?.();
    if (!isMobileNavLayout()) mobileMenu?.closeMenu?.();
  });
}

// ===== INSTANT REVEAL — no scroll-triggered card motion (prevents scroll jank) =====
function setupInstantReveal() {
  document.querySelectorAll(
    '.featured-project-card, .additional-project-card, .achievement-card, ' +
    '.skill-card, .badge-item, .deploy-card, .deploy-node, ' +
    '.deploy-step-item, .section-title'
  ).forEach((el) => {
    el.classList.add('animate-in');
  });
}

// ===== SMOOTH NAVIGATION WITH ACTIVE STATE =====
function getNavOffset() {
  return navOffsetCached;
}

function resolveSection(target) {
  if (!target) return null;
  if (target.matches?.('section[id]')) return target;
  return target.closest?.('section[id]') || target;
}

function getScrollGap() {
  /* Visual breathing room between nav pill bottom and section header */
  return isMobileNavLayout() ? 16 : 14;
}

function measureNavBottom() {
  const nav = document.getElementById('mainNav');
  const inner = nav?.querySelector('.nav-inner');
  const rect = (inner || nav)?.getBoundingClientRect();
  return rect?.bottom ?? (isMobileNavLayout() ? 70 : 64);
}

function refreshNavMetrics(force = false) {
  const nextBottom = measureNavBottom();
  const clearance = Math.round(nextBottom + getScrollGap());
  const prevClearance = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--scroll-clearance'),
    10
  ) || 0;

  if (
    !force &&
    Math.abs(nextBottom - navOffsetCached) < 0.5 &&
    Math.abs(clearance - prevClearance) < 1
  ) {
    navOffsetCached = nextBottom;
    return;
  }

  navOffsetCached = nextBottom;
  document.documentElement.style.setProperty('--scroll-clearance', `${clearance}px`);
}

function getNavScrollClearance() {
  return navOffsetCached + getScrollGap();
}

function cacheScrollLayout(sections) {
  scrollDocHeight = document.documentElement.scrollHeight;
  if (!sections) return;
  const scrollY = window.scrollY;
  sectionBounds = Array.from(sections).map((section) => {
    const anchor = getSectionScrollAnchor(section) || section;
    const anchorTop = anchor.getBoundingClientRect().top + scrollY;
    const sectionRect = section.getBoundingClientRect();
    const sectionBottom = sectionRect.top + scrollY + section.offsetHeight;
    return {
      id: section.id,
      top: anchorTop,
      bottom: sectionBottom,
    };
  });
}

function getSectionScrollAnchor(section) {
  if (!section || section.id === 'top') return null;
  return section.querySelector('.section-header') || section;
}

function getSectionScrollTop(target) {
  const section = resolveSection(target);
  if (!section || section.id === 'top') return 0;

  const anchor = getSectionScrollAnchor(section);
  // Live nav measure ONLY — never write --scroll-clearance here
  // (writing CSS mid-calc shifts hero padding and causes pyki/kindaki bounce)
  const clearance = measureNavBottom() + getScrollGap();
  const scrollY = window.scrollY;
  const anchorTop = anchor.getBoundingClientRect().top + scrollY;
  const top = anchorTop - clearance;

  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(0, top), maxScroll);
}

/* ===== APPLE NEXT² SILK SCROLL — manual + nav + back-to-top =====
   Ambient always on. Short / medium / long travel tiers.
*/

function getTravelMode(distance) {
  if (distance > 1800) return 'long';   // back-to-top / far jumps
  if (distance > 700) return 'medium';  // projects → contact zone
  return 'short';                     // hero → nearby sections
}

function easeAppleSuperior(t, mode = 'short') {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  if (mode === 'long' || mode === 'medium') {
    // Smootherstep — butter mid-glide, soft engage + velvet land
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Short hops: Apple site ease-out (cubic-bezier 0.16, 1, 0.3, 1 feel)
  return 1 - Math.pow(1 - t, 3.85);
}

function getNavPillDuration(delta) {
  const distance = Math.abs(delta);
  const scrollMs = getScrollDuration(delta);
  const mobile = isMobileNavLayout();
  const ratio = mobile ? 0.44 : 0.46;
  const min = mobile ? 480 : 540;
  const max = mobile ? 780 : 920;
  return Math.min(max, Math.max(min, Math.round(scrollMs * ratio)));
}

function applyNavTravelTiming(distance) {
  const mode = getTravelMode(distance);
  const pillMs = getNavPillDuration(distance);
  const root = document.documentElement;

  root.classList.remove('nav-travel-short', 'nav-travel-medium', 'nav-travel-long');
  root.classList.add(`nav-travel-${mode}`);
  root.style.setProperty('--nav-pill-duration', `${pillMs}ms`);

  return { mode, pillMs };
}

function clearNavTravelTiming() {
  const root = document.documentElement;
  root.classList.remove('nav-travel-short', 'nav-travel-medium', 'nav-travel-long');
  root.style.removeProperty('--nav-pill-duration');
}

function getNavPillDurationMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--nav-pill-duration').trim();
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 620;
}

function getScrollDuration(delta) {
  const distance = Math.abs(delta);
  const mobile = isMobileNavLayout();
  const mode = getTravelMode(distance);

  /* Mobile: snappy Apple iOS feel | Desktop: silkier Pro glide */
  if (mode === 'long') {
    if (distance > 3200) return mobile ? 1680 : 2180;
    if (distance > 2200) return mobile ? 1520 : 1980;
    return mobile ? 1380 : 1820;
  }

  if (mode === 'medium') {
    if (distance > 1200) return mobile ? 1220 : 1620;
    return mobile ? 1120 : 1480;
  }

  const perceptual =
    Math.sqrt(distance) * (mobile ? 18.5 : 22.4) +
    Math.pow(distance, 0.38) * (mobile ? 8.8 : 11.2);

  const base = mobile ? 520 : 640;
  const min = mobile ? 640 : 860;
  const max = mobile ? 980 : 1280;

  if (distance < 40) return mobile ? 520 : 720;
  if (distance < 100) return mobile ? 620 : 860;
  if (distance < 240) return mobile ? 720 : 980;

  return Math.min(max, Math.max(min, base + perceptual));
}

function scrollWindowTo(y, options = {}) {
  const { snap = false, coarse = false } = options;
  const top = Math.max(0, y);
  const next = snap || coarse ? Math.round(top) : top;
  const epsilon = snap || coarse ? 0.5 : 0.08;
  if (Math.abs(window.scrollY - next) < epsilon) return;
  window.scrollTo(0, next);
}

/* --- Native scroll momentum + nav-click ease --- */
let pageScrollApi = null;
let scrollIntentY = null;

function getScrollbarWidth() {
  const diff = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  if (diff > 0) return diff;

  const root = document.documentElement;
  const prev = root.style.overflow;
  const before = root.clientWidth;
  root.style.overflow = 'hidden';
  const after = root.clientWidth;
  root.style.overflow = prev;
  return Math.max(0, after - before);
}

const pageScrollLock = { depth: 0, scrollY: 0 };

function lockPageScroll() {
  if (pageScrollLock.depth++ > 0) return;

  pageScrollLock.scrollY = window.scrollY;
  const body = document.body;
  const root = document.documentElement;
  const preWidth = root.clientWidth;

  body.style.position = 'fixed';
  body.style.top = `-${pageScrollLock.scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = `${preWidth}px`;

  root.classList.add('modal-open');

  const pad = Math.max(getScrollbarWidth(), root.clientWidth - preWidth);
  if (pad > 0) {
    body.style.paddingRight = `${pad}px`;
    const nav = document.getElementById('mainNav');
    if (nav) {
      nav.style.paddingRight = `calc(max(var(--page-x), env(safe-area-inset-right)) + ${pad}px)`;
    }
  }
}

function unlockPageScroll() {
  if (--pageScrollLock.depth > 0) return;

  const y = pageScrollLock.scrollY;
  pageScrollLock.depth = 0;
  pageScrollLock.scrollY = 0;

  const body = document.body;
  const root = document.documentElement;

  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.paddingRight = '';

  const nav = document.getElementById('mainNav');
  if (nav) nav.style.paddingRight = '';

  root.classList.remove('modal-open');
  root.style.paddingRight = '';
  root.style.removeProperty('--scroll-lock-pad');

  window.scrollTo(0, y);
}

function pausePageScroll() {
  pageScrollApi?.pause?.();
}

function resumePageScroll() {
  pageScrollApi?.resume?.();
}

function setPageScrollingClass(on) {
  const root = document.documentElement;
  root.classList.toggle('is-page-scrolling', !!on);
  root.classList.toggle('is-scroll-momentum', !!on);
}

const scrollIdleCallbacks = new Set();

function onScrollIdle(callback) {
  scrollIdleCallbacks.add(callback);
  return () => scrollIdleCallbacks.delete(callback);
}

function notifyScrollIdle() {
  scrollIdleCallbacks.forEach((callback) => {
    try {
      callback();
    } catch (_) {
      /* ignore subscriber errors */
    }
  });
}

/* Native momentum scroll hub — zero layout work during travel; idle work on scrollend only */
function setupApplePageScroll() {
  const reduced = document.documentElement.classList.contains('reduced-motion');
  const hasScrollEnd = 'onscrollend' in window;
  let moving = false;
  let settleTimer = null;
  let rafGate = 0;
  let paused = false;
  let lastScrollY = window.scrollY;

  function endMoving() {
    if (!moving) return;
    moving = false;
    requestAnimationFrame(() => {
      setPageScrollingClass(false);
      document.getElementById('navIndicator')?.classList.remove('is-live-tracking');
      scheduleNavScrollSettle(notifyScrollIdle);
    });
  }

  function beginMoving() {
    if (paused || navScrollAnimating) return;
    cancelNavScrollSettle();
    if (!moving) {
      moving = true;
      setPageScrollingClass(true);
    }
  }

  function scheduleFallbackEnd() {
    if (hasScrollEnd) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(endMoving, reduced ? 140 : 190);
  }

  function onScroll() {
    if (rafGate) return;
    rafGate = requestAnimationFrame(() => {
      rafGate = 0;
      if (paused || navScrollAnimating) return;

      const y = window.scrollY;
      if (Math.abs(y - lastScrollY) < 0.5) return;
      lastScrollY = y;
      beginMoving();
      navSpyApi?.tickLive?.();
      scheduleFallbackEnd();
    });
  }

  function onScrollEnd() {
    if (paused || navScrollAnimating) return;
    clearTimeout(settleTimer);
    lastScrollY = window.scrollY;
    endMoving();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  if (hasScrollEnd) {
    window.addEventListener('scrollend', onScrollEnd, { passive: true });
  }

  return {
    sync() {},
    onIdle: onScrollIdle,
    pause() {
      paused = true;
      moving = false;
      setPageScrollingClass(false);
      clearTimeout(settleTimer);
    },
    resume() {
      paused = false;
      lastScrollY = window.scrollY;
    },
    isMoving() {
      return moving;
    },
    destroy() {
      window.removeEventListener('scroll', onScroll);
      if (hasScrollEnd) {
        window.removeEventListener('scrollend', onScrollEnd);
      }
      if (rafGate) cancelAnimationFrame(rafGate);
      clearTimeout(settleTimer);
      setPageScrollingClass(false);
    },
  };
}

function runProgrammaticScroll(targetY) {
  if (navScrollAnimating && smoothScrollCancel) smoothScrollCancel();
  cancelNavScrollSettle();
  pausePageScroll();

  const gen = ++scrollGeneration;
  const reduced = document.documentElement.classList.contains('reduced-motion');
  const clampedY = Math.max(0, targetY);
  const distance = Math.abs(window.scrollY - clampedY);
  const mode = getTravelMode(distance);
  const { pillMs } = applyNavTravelTiming(distance);
  const longHaul = mode !== 'short';

  scrollIntentY = clampedY;
  lockNavSpyDuringScroll(longHaul);
  navScrollAnimating = true;
  document.documentElement.classList.add('is-scrolling', 'is-nav-travel');
  document.documentElement.classList.toggle('is-long-travel', longHaul);
  if (!shouldPreserveNavPillAnim()) {
    navIndicatorApi?.stopAnim?.();
  }

  const done = () => {
    if (gen !== scrollGeneration) return;
    finishProgrammaticScroll();
  };

  if (reduced || distance < 2) {
    scrollWindowTo(clampedY, { snap: true });
    requestAnimationFrame(done);
    return;
  }

  // One frame — compositor settles, then nav ease starts
  requestAnimationFrame(() => {
    if (gen !== scrollGeneration || !navScrollAnimating) return;
    smoothScrollToExact(clampedY, { mode, longHaul }).then(done);
  });
}

function getCurrentSectionFromCache() {
  const scrollY = window.scrollY;
  if (scrollY < 90) return 'top';

  const marker = scrollY + getNavScrollClearance() + 8;
  let current = '';

  for (let i = 0; i < sectionBounds.length; i++) {
    const section = sectionBounds[i];
    if (section.id === 'top') continue;
    if (marker >= section.top && marker < section.bottom) {
      current = section.id;
      break;
    }
  }

  if (!current) {
    for (let i = sectionBounds.length - 1; i >= 0; i--) {
      const section = sectionBounds[i];
      if (section.id === 'top') continue;
      if (marker >= section.top) {
        current = section.id;
        break;
      }
    }
  }

  if (window.innerHeight + scrollY >= scrollDocHeight - 48) {
    const last = sectionBounds[sectionBounds.length - 1];
    if (last && last.id !== 'top') current = last.id;
  }

  return current || null;
}

function getLiveSectionId(sectionNodes) {
  const scrollY = window.scrollY;
  if (scrollY < 90) return 'top';

  const doc = document.documentElement;
  if (window.innerHeight + scrollY >= doc.scrollHeight - 40) {
    const last = sectionNodes[sectionNodes.length - 1];
    return last?.id || null;
  }

  const marker = scrollY + getNavScrollClearance() + 8;

  let current = null;
  for (let i = 0; i < sectionNodes.length; i++) {
    const section = sectionNodes[i];
    if (!section.id || section.id === 'top') continue;
    const anchor = getSectionScrollAnchor(section) || section;
    const top = anchor.getBoundingClientRect().top + scrollY;
    const bottom = section.getBoundingClientRect().top + scrollY + section.offsetHeight;
    if (marker >= top && marker < bottom) {
      current = section.id;
      break;
    }
  }

  if (!current) {
    for (let i = sectionNodes.length - 1; i >= 0; i--) {
      const section = sectionNodes[i];
    if (!section.id || section.id === 'top') continue;
      const anchor = getSectionScrollAnchor(section) || section;
      const top = anchor.getBoundingClientRect().top + scrollY;
      if (marker >= top) {
        current = section.id;
        break;
      }
    }
  }

  return current;
}

let navScrollSettleTimer = null;
const NAV_SETTLE_MS_DESKTOP = 200;
const NAV_SETTLE_MS_MOBILE = 160;

function getNavSettleMs() {
  return isMobileNavLayout() ? NAV_SETTLE_MS_MOBILE : NAV_SETTLE_MS_DESKTOP;
}

function scheduleNavScrollSettle(callback) {
  clearTimeout(navScrollSettleTimer);
  navScrollSettleTimer = setTimeout(callback, getNavSettleMs());
}

function cancelNavScrollSettle() {
  clearTimeout(navScrollSettleTimer);
  navScrollSettleTimer = null;
}

let navClickLockUntil = 0;
let navSpyPaused = false;
let navScrollUnlockTimer = null;
let userNavTarget = null;
let navScrollAnimating = false;
let smoothScrollCancel = null;
let scrollInterruptCleanup = null;
let scrollGeneration = 0;
let desktopNavPillActive = false;
let desktopNavPillTimer = null;
let navSelectingTimer = null;

function pulseNavSelecting() {
  if (isMobileNavLayout()) return;
  const root = document.documentElement;
  root.classList.add('nav-selecting');
  clearTimeout(navSelectingTimer);
  navSelectingTimer = setTimeout(() => {
    root.classList.remove('nav-selecting');
  }, 460);
}

function beginDesktopNavPill(pillMs) {
  if (isMobileNavLayout()) return;
  desktopNavPillActive = true;
  document.documentElement.classList.add('nav-pill-sliding');
  clearTimeout(desktopNavPillTimer);
  const duration = pillMs || getNavPillDurationMs();
  desktopNavPillTimer = setTimeout(endDesktopNavPill, duration + 90);
}

function endDesktopNavPill() {
  if (!desktopNavPillActive) return;
  desktopNavPillActive = false;
  document.documentElement.classList.remove('nav-pill-sliding');
  clearTimeout(desktopNavPillTimer);
  desktopNavPillTimer = null;
}

function shouldPreserveNavPillAnim() {
  return desktopNavPillActive && !isMobileNavLayout();
}

function endPageScrolling() {
  if (!navScrollAnimating) {
    document.documentElement.classList.remove('is-scrolling', 'is-long-travel', 'is-nav-travel');
  }
}


function detachScrollInterrupt() {
  if (!scrollInterruptCleanup) return;
  scrollInterruptCleanup();
  scrollInterruptCleanup = null;
}

function attachScrollInterrupt(onInterrupt) {
  detachScrollInterrupt();

  let armed = false;
  const armTimer = setTimeout(() => {
    armed = true;
  }, 56);

  const handle = (event) => {
    if (!armed || !navScrollAnimating) return;
    if (event.type === 'wheel' && Math.abs(event.deltaY) < 1.4 && Math.abs(event.deltaX) < 1.4) {
      return;
    }
    if (event.type === 'keydown') {
      const key = event.key;
      if (
        key !== 'ArrowUp' &&
        key !== 'ArrowDown' &&
        key !== 'PageUp' &&
        key !== 'PageDown' &&
        key !== 'Home' &&
        key !== 'End' &&
        key !== ' ' &&
        key !== 'Spacebar'
      ) {
        return;
      }
    }
    onInterrupt();
  };

  const opts = { passive: true, capture: true };
  window.addEventListener('wheel', handle, opts);
  window.addEventListener('touchstart', handle, opts);
  window.addEventListener('keydown', handle, opts);

  scrollInterruptCleanup = () => {
    clearTimeout(armTimer);
    window.removeEventListener('wheel', handle, opts);
    window.removeEventListener('touchstart', handle, opts);
    window.removeEventListener('keydown', handle, opts);
  };
}

function smoothScrollToExact(targetY, options = {}) {
  const { mode = 'short', longHaul = false } = options;
  if (smoothScrollCancel) smoothScrollCancel();
  detachScrollInterrupt();

  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) return Promise.resolve();

  const duration = getScrollDuration(delta);
  let cancelled = false;
  let interrupted = false;
  let rafId = 0;
  let startTime = 0;

  smoothScrollCancel = () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
    detachScrollInterrupt();
    smoothScrollCancel = null;
  };

  return new Promise((resolve) => {
    const finish = () => {
      detachScrollInterrupt();
      smoothScrollCancel = null;
      resolve();
    };

    attachScrollInterrupt(() => {
      if (cancelled || interrupted) return;
      interrupted = true;
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      finish();
    });

    function frame(now) {
      if (cancelled) {
        finish();
        return;
      }

      if (!startTime) startTime = now;

      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeAppleSuperior(progress, mode);
      scrollWindowTo(startY + delta * eased, { snap: false, coarse: true });

      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      scrollWindowTo(targetY, { snap: true });
      finish();
    }

    rafId = requestAnimationFrame(frame);
  });
}

function finishProgrammaticScroll() {
  navScrollAnimating = false;
  detachScrollInterrupt();

  const targetId =
    userNavTarget && userNavTarget !== 'top'
      ? userNavTarget
      : null;

  scrollIntentY = null;
  resumePageScroll();

  requestAnimationFrame(() => {
    endPageScrolling();
    clearNavTravelTiming();
    clearNavScrollLock();

    if (targetId) {
      const section = document.getElementById(targetId);
      if (section) {
        refreshNavMetrics(true);
        scrollWindowTo(getSectionScrollTop(section), { snap: true });
      }
    }

    const afterScrollWork = () => {
      if (navScrollAnimating) return;
      refreshNavMetrics(true);
      cacheScrollLayout(document.querySelectorAll('section[id]'));
      navSpyApi?.sync?.();
      if (!isMobileNavLayout()) {
        navIndicatorApi?.refreshMetrics?.();
        if (!shouldPreserveNavPillAnim() && targetId) {
          navIndicatorApi?.snapToActive?.();
        }
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(afterScrollWork, { timeout: 180 });
    } else {
      setTimeout(afterScrollWork, 64);
    }
  });
}

function clearNavScrollLock() {
  navClickLockUntil = 0;
  navSpyPaused = false;
  if (navScrollUnlockTimer) {
    clearTimeout(navScrollUnlockTimer);
    navScrollUnlockTimer = null;
  }
}

function lockNavSpyDuringScroll(longHaul = false) {
  navSpyPaused = true;
  const lockMs = longHaul
    ? (isMobileNavLayout() ? 1850 : 1950)
    : (isMobileNavLayout() ? 1250 : 1350);
  navClickLockUntil = Date.now() + lockMs;
  if (navScrollUnlockTimer) clearTimeout(navScrollUnlockTimer);
  if (!('onscrollend' in window)) {
    navScrollUnlockTimer = setTimeout(clearNavScrollLock, lockMs - 40);
  }
}

function scrollToY(targetY) {
  if (targetY <= 0) userNavTarget = 'top';
  runProgrammaticScroll(Math.max(0, targetY));
}

function scrollToSection(target) {
  if (!target) return;
  const sectionId = target.getAttribute?.('id');
  if (sectionId && sectionId !== 'top') userNavTarget = sectionId;
  refreshNavMetrics();
  void document.documentElement.offsetHeight;
  runProgrammaticScroll(getSectionScrollTop(target));
}

function handleInitialHashScroll() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return;

  const target = document.querySelector(hash);
  if (!target) return;

  const sectionId = target.getAttribute?.('id');
  if (sectionId === 'top') {
    scrollToY(0);
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      refreshNavMetrics();
      if (sectionId) userNavTarget = sectionId;
      scrollToSection(target);
    });
  });
}

// Shared mobile-menu API — setupMobileNav registers, setupNavigation consumes.
let mobileMenu = null;
let navIndicatorApi = null;
let navSpyApi = null;
let lastNavSection = '';

function isMobileNavLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function isNavMenuOpen() {
  return document.getElementById('navLinks')?.classList.contains('is-open') ?? false;
}

function canSpringNavIndicator() {
  return !document.documentElement.classList.contains('reduced-motion');
}

function shouldShowNavIndicator() {
  return !isMobileNavLayout();
}

function setupNavIndicator(navLinksContainer) {
  const indicator = document.getElementById('navIndicator');
  if (!indicator || !navLinksContainer) return null;

  const navLinks = navLinksContainer.querySelectorAll('a[href^="#"]:not(.cta-nav)');
  let metricsCache = new Map();
  let indicatorVisible = false;
  let springEndHandler = null;
  let springTimeout = null;

  function clearSpringListeners() {
    if (springEndHandler) {
      indicator.removeEventListener('transitionend', springEndHandler);
      springEndHandler = null;
    }
    if (springTimeout) {
      clearTimeout(springTimeout);
      springTimeout = null;
    }
  }

  function clearSpringEnd() {
    clearSpringListeners();
    indicator.classList.remove('is-springing', 'is-sliding');
    endDesktopNavPill();
  }

  function watchSpringEnd() {
    clearSpringListeners();
    indicator.classList.add('is-springing');
    const springMs = getNavPillDurationMs() + 80;
    springTimeout = setTimeout(clearSpringEnd, springMs);
    springEndHandler = (e) => {
      if (e.target !== indicator) return;
      if (e.propertyName !== 'transform' && e.propertyName !== 'width' && e.propertyName !== 'height') {
        return;
      }
      clearSpringEnd();
    };
    indicator.addEventListener('transitionend', springEndHandler);
  }

  function refreshMetrics() {
    metricsCache.clear();
    const containerRect = navLinksContainer.getBoundingClientRect();
    navLinks.forEach((link) => {
      const linkRect = link.getBoundingClientRect();
      metricsCache.set(link, {
        x: linkRect.left - containerRect.left,
        y: linkRect.top - containerRect.top,
        w: linkRect.width,
        h: linkRect.height,
      });
    });
  }

  function getMetrics(link) {
    if (metricsCache.has(link)) return metricsCache.get(link);
    const containerRect = navLinksContainer.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const m = {
      x: linkRect.left - containerRect.left,
      y: linkRect.top - containerRect.top,
      w: linkRect.width,
      h: linkRect.height,
    };
    metricsCache.set(link, m);
    return m;
  }

  function applyMetrics(x, y, w, h) {
    indicator.style.width = `${w}px`;
    indicator.style.height = `${h}px`;
    indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function freezeToVisualPosition() {
    indicator.classList.add('is-instant');
    const cr = navLinksContainer.getBoundingClientRect();
    const ir = indicator.getBoundingClientRect();
    applyMetrics(
      ir.left - cr.left,
      ir.top - cr.top,
      ir.width,
      ir.height
    );
    void indicator.offsetHeight;
  }

  function show() {
    indicator.style.opacity = '1';
    indicatorVisible = true;
  }

  function hide() {
    indicator.classList.add('is-instant');
    indicator.style.opacity = '0';
    indicatorVisible = false;
    void indicator.offsetHeight;
    indicator.classList.remove('is-instant');
  }

  function canSpring() {
    return !document.documentElement.classList.contains('reduced-motion');
  }

  function moveTo(link, instant = false) {
    if (
      !link ||
      link.classList.contains('cta-nav') ||
      !navLinksContainer.contains(link) ||
      !shouldShowNavIndicator()
    ) {
      clearSpringEnd();
      indicator.classList.remove('is-sliding');
      freezeToVisualPosition();
      hide();
      return;
    }

    const isFirstShow = !indicatorVisible;
    const desktopSpring = !isMobileNavLayout() && !instant && canSpring();
    const useInstant = instant || !canSpring();

    clearSpringListeners();
    indicator.classList.toggle('is-sliding', desktopSpring && !useInstant);

    const applyMove = () => {
      refreshMetrics();
      const { x, y, w, h } = getMetrics(link);

      if (useInstant) {
        const liveTrack =
          document.documentElement.classList.contains('is-page-scrolling') ||
          document.documentElement.classList.contains('is-scroll-momentum');

        if (liveTrack) {
          indicator.classList.remove('is-instant', 'is-sliding', 'is-springing');
          indicator.classList.add('is-live-tracking');
          applyMetrics(x, y, w, h);
          show();
          return;
        }

        indicator.classList.add('is-instant');
        applyMetrics(x, y, w, h);
        show();
        void indicator.offsetHeight;
        indicator.classList.remove('is-instant', 'is-sliding', 'is-live-tracking');
        return;
      }

      if (indicatorVisible) {
        freezeToVisualPosition();
        indicator.classList.remove('is-instant');
        void indicator.offsetHeight;
        applyMetrics(x, y, w, h);
        show();
        watchSpringEnd();
        return;
      }

      // First reveal from hero — fade in at target, then slide on later clicks
      indicator.classList.add('is-instant');
      applyMetrics(x, y, w, h);
      indicator.style.opacity = '0';
      indicatorVisible = false;
      void indicator.offsetHeight;
      indicator.classList.remove('is-instant');
      applyMetrics(x, y, w, h);
      show();
      if (isFirstShow) watchSpringEnd();
    };

    if (desktopSpring && !useInstant) {
      requestAnimationFrame(() => requestAnimationFrame(applyMove));
      return;
    }

    applyMove();
  }

  function stopAnim() {
    if (!indicatorVisible) return;
    clearSpringEnd();
    indicator.classList.add('is-instant');
    const cr = navLinksContainer.getBoundingClientRect();
    const ir = indicator.getBoundingClientRect();
    applyMetrics(
      ir.left - cr.left,
      ir.top - cr.top,
      ir.width,
      ir.height
    );
    void indicator.offsetHeight;
    indicator.classList.remove('is-instant');
  }

  function snapToActive() {
    clearSpringEnd();
    refreshMetrics();
    const active = navLinksContainer.querySelector('a.active:not(.cta-nav)');
    if (!active) {
      hide();
      return;
    }
    const { x, y, w, h } = getMetrics(active);
    indicator.classList.add('is-instant');
    applyMetrics(x, y, w, h);
    show();
    void indicator.offsetHeight;
    indicator.classList.remove('is-instant', 'is-sliding', 'is-springing');
  }

  function finalizeAfterScroll() {
    snapToActive();
  }

  function reposition(instant = true) {
    refreshMetrics();
    const active = navLinksContainer.querySelector('a.active:not(.cta-nav)');
    if (active) moveTo(active, instant);
    else hide();
  }

  function commitToActive(spring = false) {
    if (spring && canSpring() && shouldShowNavIndicator()) {
      refreshMetrics();
      const active = navLinksContainer.querySelector('a.active:not(.cta-nav)');
      if (active) moveTo(active, false);
      else hide();
      return;
    }
    snapToActive();
  }

  refreshMetrics();

  window.addEventListener('resize', () => {
    refreshMetrics();
    if (shouldShowNavIndicator()) {
      reposition(true);
    } else {
      endDesktopNavPill();
      clearSpringEnd();
      hide();
    }
  }, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-ready');
      refreshMetrics();
    });
  }

  return { moveTo, reposition, stopAnim, refreshMetrics, commitToActive, finalizeAfterScroll, snapToActive };
}

/** Nav scroll spy — live sync while scrolling + settle confirm (no IO flicker) */
function setupIntersectionNavSpy(sections, mainNav, indicatorApi, setActiveSection, setHomeNav) {
  const sectionList = Array.from(sections).filter((s) => s.id && s.id !== 'top');
  let lastLiveTick = 0;
  const LIVE_THROTTLE_MS = 96;

  function applyNavSync(mode = 'settle') {
    if (navScrollAnimating || document.documentElement.classList.contains('is-nav-travel')) {
      return;
    }
    if (mode === 'live') {
      if (navSpyPaused || Date.now() < navClickLockUntil) return;
    }

    if (mode === 'settle') {
      refreshNavMetrics(true);
      cacheScrollLayout(sections);
    }

    const current = getLiveSectionId(sectionList);

    if (current === 'top') {
      if (lastNavSection !== 'top') {
        setHomeNav({ moveIndicator: !isMobileNavLayout() });
      }
      if (userNavTarget === 'top') userNavTarget = null;
      return;
    }

    if (!current) return;

    if (
      mode === 'settle' &&
      userNavTarget &&
      lastNavSection === userNavTarget &&
      current !== userNavTarget
    ) {
      return;
    }

    if (userNavTarget && current === userNavTarget) {
      userNavTarget = null;
    }

    if (current === lastNavSection) return;

    const spring =
      mode === 'click' &&
      !isMobileNavLayout() &&
      canSpringNavIndicator() &&
      !navScrollAnimating;

    if (spring) {
      beginDesktopNavPill(getNavPillDurationMs());
    }

    setActiveSection(current, {
      animate: spring,
      moveIndicator: !isMobileNavLayout(),
    });
  }

  function tickLiveNavSpy() {
    if (navScrollAnimating || document.documentElement.classList.contains('is-nav-travel')) {
      return;
    }
    if (navSpyPaused || Date.now() < navClickLockUntil) return;
    if (
      !document.documentElement.classList.contains('is-page-scrolling') &&
      !document.documentElement.classList.contains('is-scroll-momentum')
    ) {
      return;
    }

    const now = performance.now();
    if (now - lastLiveTick < LIVE_THROTTLE_MS) return;
    lastLiveTick = now;

    applyNavSync('live');
  }

  const hero = document.getElementById('top');
  if (hero && mainNav) {
    const heroObs = new IntersectionObserver(
      ([entry]) => {
        mainNav.classList.toggle('scrolled', !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px' }
    );
    heroObs.observe(hero);
  }

  function finishPassiveScroll() {
    if (navScrollAnimating) return;
    if (
      document.documentElement.classList.contains('is-page-scrolling') ||
      document.documentElement.classList.contains('is-scroll-momentum')
    ) {
      return;
    }

    if (Date.now() >= navClickLockUntil) {
      navSpyPaused = false;
    }

    applyNavSync('settle');
  }

  function refreshSpy() {
    refreshNavMetrics(true);
    cacheScrollLayout(sections);
  }

  window.addEventListener(
    'resize',
    () => {
      refreshSpy();
      applyNavSync('settle');
    },
    { passive: true }
  );

  window.addEventListener(
    'orientationchange',
    () => {
      setTimeout(() => {
        refreshSpy();
        applyNavSync('settle');
      }, 120);
    },
    { passive: true }
  );

  refreshSpy();
  applyNavSync('settle');

  return {
    sync: () => applyNavSync('settle'),
    refreshSpy,
    finishPassiveScroll,
    tickLive: tickLiveNavSpy,
  };
}

function setupNavigation() {
  const navLinksContainer = document.getElementById('navLinks');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = document.querySelectorAll('section[id]');
  const indicatorApi = setupNavIndicator(navLinksContainer);
  navIndicatorApi = indicatorApi;

  function setHomeNav(options = {}) {
    const { moveIndicator = true } = options;
    navLinks.forEach((link) => link.classList.remove('active'));
    lastNavSection = 'top';
    // Bubble exists on desktop only — mobile uses hamburger menu
    if (moveIndicator && !isMobileNavLayout()) indicatorApi?.moveTo(null);
  }

  function setActiveSection(sectionId, options = {}) {
    const { animate = false, moveIndicator = true } = options;

    if (sectionId === 'top') {
      setHomeNav({ moveIndicator: options.moveIndicator !== false });
      return;
    }

    let navLink = null;

    navLinks.forEach((link) => {
      const href = link.getAttribute('href').slice(1);
      const isActive = href === sectionId;
      link.classList.toggle('active', isActive);
      if (isActive) navLink = link;
    });

    lastNavSection = sectionId;

    if (!moveIndicator || isMobileNavLayout()) return;

    if (sectionId === 'contact' || (navLink && navLink.classList.contains('cta-nav'))) {
      indicatorApi?.moveTo(null);
    } else if (navLink) {
      indicatorApi?.moveTo(navLink, !animate);
    }
  }

  function getCurrentSection() {
    return getCurrentSectionFromCache();
  }

  function isDesktopNavClick() {
    return !isMobileNavLayout() && !mobileMenu?.isOpen?.();
  }

  function handleDesktopNavClick(sectionId, target) {
    userNavTarget = sectionId;
    navIndicatorApi?.refreshMetrics?.();

    refreshNavMetrics();
    const targetY = sectionId === 'top' ? 0 : getSectionScrollTop(target);
    const distance = Math.abs(window.scrollY - targetY);
    applyNavTravelTiming(distance);

    const isCta = sectionId === 'contact';
    const shouldSlideBubble = !isCta && canSpringNavIndicator();

    if (shouldSlideBubble) {
      beginDesktopNavPill(getNavPillDuration(distance));
      pulseNavSelecting();
    } else {
      endDesktopNavPill();
    }

    setActiveSection(sectionId, {
      animate: shouldSlideBubble,
      moveIndicator: true,
    });

    // One frame only — bubble starts, scroll follows without double-delay hitch
    requestAnimationFrame(() => {
      if (sectionId === 'top') scrollToY(0);
      else scrollToSection(target);
    });
  }

  const mainNav = document.getElementById('mainNav');
  navSpyApi = setupIntersectionNavSpy(
    sections,
    mainNav,
    indicatorApi,
    setActiveSection,
    setHomeNav
  );

  cacheScrollLayout(sections);
  navSpyApi?.refreshSpy?.();

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-ready');
      cacheScrollLayout(sections);
      navSpyApi?.refreshSpy?.();
      indicatorApi?.refreshMetrics?.();
      navSpyApi?.sync?.();
      if (!navScrollAnimating && lastNavSection && lastNavSection !== 'top') {
        const section = document.getElementById(lastNavSection);
        if (section) scrollWindowTo(getSectionScrollTop(section), { snap: true });
      }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const target = href && href !== '#' ? document.querySelector(href) : null;
      if (!target) return;

      e.preventDefault();

      const sectionId = target.getAttribute('id');
      if (!sectionId) return;

      if (isNavMenuOpen()) {
        userNavTarget = sectionId;
        setActiveSection(sectionId, {
          animate: false,
          moveIndicator: false,
        });
        mobileMenu.navigateTo(target);
        return;
      }

      if (isDesktopNavClick()) {
        handleDesktopNavClick(sectionId, target);
        return;
      }

      userNavTarget = sectionId;
      setActiveSection(sectionId, {
        animate: false,
        moveIndicator: false,
      });

      if (sectionId === 'top') {
        scrollToY(0);
      } else {
        scrollToSection(target);
      }
    });
  });

  function updateActiveNavNow(moveIndicator = true) {
    const current = getCurrentSection();

    if (current === 'top') {
      if (lastNavSection !== 'top') setHomeNav();
      return;
    }

    if (current) {
      setActiveSection(current, { animate: false, moveIndicator });
    }
  }

  const logo = document.getElementById('logo-vs-btn');
  if (logo) {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      mobileMenu?.closeMenu?.();
      setHomeNav();
      userNavTarget = 'top';
      scrollToY(0);
    });
  }

  updateActiveNavNow(true);
}

function setupFooterVsEasterEgg() {
  const footerVs = document.getElementById('footer-vs-btn');
  if (!footerVs) return;

  footerVs.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    footerVs.classList.remove('is-easter-glow');
    void footerVs.offsetWidth;
    footerVs.classList.add('is-easter-glow');

    const cleanup = () => footerVs.classList.remove('is-easter-glow');

    if (document.documentElement.classList.contains('reduced-motion')) {
      window.setTimeout(cleanup, 420);
      return;
    }

    footerVs.addEventListener('animationend', cleanup, { once: true });
    window.setTimeout(cleanup, 1100);
  });
}

// ===== MOBILE NAVIGATION =====
function setupMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  const mainNav = document.getElementById('mainNav');
  const root = document.documentElement;

  if (!toggle || !links) return;

  function isOpen() {
    return links.classList.contains('is-open');
  }

  function updateNavMenuAnchor() {
    const inner = mainNav?.querySelector('.nav-inner');
    const rect = inner?.getBoundingClientRect();
    if (!rect) return;
    const menuTop = Math.round(rect.bottom + 8);
    root.style.setProperty('--nav-menu-top', `${menuTop}px`);
  }

  function unlockBody() {
    root.classList.remove('menu-open');
    mainNav?.classList.remove('menu-is-open');
    links.setAttribute('aria-hidden', 'true');
  }

  function lockBody() {
    root.classList.add('menu-open');
    mainNav?.classList.add('menu-is-open');
    links.setAttribute('aria-hidden', 'false');
  }

  function closeMenuUI() {
    links.classList.remove('is-open');
    links.style.willChange = '';
    overlay?.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    const icon = toggle.querySelector('i');
    if (icon) icon.className = 'fas fa-bars';
  }

  function closeMenu() {
    if (!isOpen()) return;
    closeMenuUI();
    unlockBody();
  }

  function runAfterMenuClose(wasOpen, callback) {
    if (!isMobileNavLayout() || !wasOpen) {
      requestAnimationFrame(() => requestAnimationFrame(callback));
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      links.removeEventListener('transitionend', onTransitionEnd);
      callback();
    };

    const onTransitionEnd = (e) => {
      if (e.target !== links) return;
      if (e.propertyName === 'opacity' || e.propertyName === 'transform') finish();
    };

    links.addEventListener('transitionend', onTransitionEnd);
    setTimeout(finish, 300);
  }

  function navigateTo(targetEl) {
    const wasOpen = isOpen();
    if (wasOpen) closeMenu();

    runAfterMenuClose(wasOpen, () => {
      refreshNavMetrics();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const sectionId = targetEl?.getAttribute?.('id') || null;
          if (sectionId) userNavTarget = sectionId;
          if (sectionId === 'top') {
            scrollToY(0);
            return;
          }
          if (targetEl) scrollToSection(targetEl);
        });
      });
    });
  }

  function openMenu() {
    if (!isMobileNavLayout()) return;
    updateNavMenuAnchor();
    lockBody();
    links.style.willChange = 'transform, opacity';
    links.classList.add('is-open');
    overlay?.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    const icon = toggle.querySelector('i');
    if (icon) icon.className = 'fas fa-times';
    requestAnimationFrame(() => {
      updateNavMenuAnchor();
      setTimeout(() => {
        links.style.willChange = '';
      }, 380);
    });
  }

  mobileMenu = { isOpen, navigateTo, closeMenu, updateNavMenuAnchor };

  if (isMobileNavLayout()) {
    links.setAttribute('aria-hidden', 'true');
    updateNavMenuAnchor();
  } else {
    links.classList.remove('is-open');
    overlay?.classList.remove('is-open');
    root.classList.remove('menu-open');
    mainNav?.classList.remove('menu-is-open');
    links.removeAttribute('aria-hidden');
  }

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isOpen() ? closeMenu() : openMenu();
  });

  overlay?.addEventListener('click', closeMenu);

  mainNav?.querySelector('.nav-live-badge')?.addEventListener('click', () => {
    if (isOpen()) closeMenu();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeMenu();
  });

  window.addEventListener('resize', () => {
    updateNavMenuAnchor();
    navIndicatorApi?.refreshMetrics?.();
    if (window.innerWidth > 768) {
      closeMenu();
      links.removeAttribute('aria-hidden');
    } else if (!isOpen()) {
      links.setAttribute('aria-hidden', 'true');
    }
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateNavMenuAnchor();
      closeMenu();
    }, 100);
  }, { passive: true });
}

// ===== IMAGE MODAL WITH ACCESSIBILITY =====
function setupModals() {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalCaption = document.getElementById('modalCaption');
  const closeBtn = modal?.querySelector('.modal-close');
  let lastActive = null;
  let imageLoadToken = 0;

  if (modal) document.body.appendChild(modal);

  function resolveImageSrc(triggerEl, preferredSrc) {
    if (preferredSrc) return preferredSrc;
    if (!triggerEl) return '';
    const img = triggerEl.querySelector('img');
    if (img) {
      const resolved = img.currentSrc || img.getAttribute('src');
      if (resolved) return resolved;
    }
    return '';
  }

  function resolveModalCaption(triggerEl, fallbackAlt) {
    const card = triggerEl?.closest('.featured-project-card');
    if (card) {
      const title = card.querySelector('.featured-project-content h3');
      const name = title?.textContent?.trim();
      if (name) return name;
    }
    return fallbackAlt || '';
  }

  function openModal(src, alt, triggerEl) {
    const resolvedSrc = resolveImageSrc(triggerEl, src);
    const resolvedAlt = resolveModalCaption(triggerEl, alt);
    if (!resolvedSrc || !modal || !modalImage) return;

    lastActive = document.activeElement;
    const token = ++imageLoadToken;

    modalImage.alt = resolvedAlt || 'Image preview';

    if (modalCaption) {
      if (resolvedAlt) {
        modalCaption.textContent = resolvedAlt;
        modalCaption.hidden = false;
      } else {
        modalCaption.textContent = '';
        modalCaption.hidden = true;
      }
    }

    const finishLoad = () => {
      if (token !== imageLoadToken) return;
      modalImage.classList.remove('is-loading');
    };

    modalImage.classList.add('is-loading');
    modalImage.onload = finishLoad;
    modalImage.onerror = finishLoad;

    if (modalImage.src !== resolvedSrc) {
      modalImage.src = resolvedSrc;
    } else {
      modalImage.src = '';
      modalImage.src = resolvedSrc;
    }

    if (modalImage.complete && modalImage.naturalWidth > 0) {
      modalImage.classList.remove('is-loading');
    }

    lockPageScroll();

    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => closeBtn?.focus());
    });
  }

  function closeModal() {
    if (!modal || !modal.classList.contains('is-open')) return;

    imageLoadToken++;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    unlockPageScroll();

    if (modalImage) {
      modalImage.onload = null;
      modalImage.onerror = null;
      modalImage.classList.remove('is-loading');
      modalImage.removeAttribute('src');
      modalImage.alt = '';
    }

    if (modalCaption) {
      modalCaption.textContent = '';
      modalCaption.hidden = true;
    }

    if (lastActive && typeof lastActive.focus === 'function') {
      lastActive.focus();
    }
  }

  if (modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.documentElement.classList.remove('modal-open');

  document.querySelectorAll('.clickable-image').forEach((el) => {
    const dataSrc = el.dataset.image;
    if (!dataSrc) return;

    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    el.style.cursor = 'pointer';

    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal(dataSrc, el.dataset.alt, el);
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(dataSrc, el.dataset.alt, el);
      }
    });
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  modal?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) {
      closeModal();
    }
  });
}

// Prefetch + decode ALL project architecture diagrams before scroll (zero half-image flash)
function setupHeavyImageWarmup() {
  const diagramImgs = Array.from(
    document.querySelectorAll('#projects img[src*="architecture/"]')
  );
  const badgeImgs = Array.from(
    document.querySelectorAll('#certifications .badge-image-actual')
  );
  const heavyImgs = [...diagramImgs, ...badgeImgs];
  if (!heavyImgs.length) return;

  function markDiagramReady(img) {
    img.classList.add('is-diagram-ready');
    img.closest('.featured-project-image, .work-grid-thumb')?.classList.add('is-diagram-ready');
  }

  function decodeOne(img) {
    const finish = () => markDiagramReady(img);
    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
      return;
    }
    img.addEventListener('load', () => {
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    }, { once: true });
    const src = img.currentSrc || img.getAttribute('src');
    if (src && !img.complete) {
      const probe = new Image();
      probe.src = src;
    }
  }

  function warmAll() {
    heavyImgs.forEach(decodeOne);
  }

  warmAll();
  requestAnimationFrame(() => requestAnimationFrame(warmAll));

  if (document.fonts?.ready) {
    document.fonts.ready.then(warmAll);
  }

  window.addEventListener('load', warmAll, { once: true });

  const projects = document.getElementById('projects');
  if (projects && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          warmAll();
          obs.disconnect();
        }
      },
      { rootMargin: '2400px 0px', threshold: 0 }
    );
    obs.observe(projects);
  }
}

// Recalculate scroll anchors after images paint — NEVER mid-scroll (was causing projects lag)
function setupImageLayoutRefresh() {
  const sections = document.querySelectorAll('section[id]');
  let refreshRaf = null;
  let refreshTimer = null;
  let pendingWhileScrolling = false;

  function applyRefresh() {
    if (navScrollAnimating || pageScrollApi?.isMoving?.()) {
      pendingWhileScrolling = true;
      return;
    }
    pendingWhileScrolling = false;
    if (refreshRaf) cancelAnimationFrame(refreshRaf);
    refreshRaf = requestAnimationFrame(() => {
      refreshRaf = null;
      cacheScrollLayout(sections);
      navSpyApi?.refreshSpy?.();
    });
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    // Batch many image loads into one quiet refresh
    refreshTimer = setTimeout(applyRefresh, 420);
  }

  document.querySelectorAll(
    '#projects img[src*="architecture/"], #certifications .badge-image-actual, img[src^="assets/images/"]'
  ).forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', scheduleRefresh, { once: true });
  });

  window.addEventListener('load', () => {
    applyRefresh();
  }, { once: true });

  window.addEventListener('orientationchange', () => {
    setTimeout(applyRefresh, 200);
  }, { passive: true });

  // If images finished while we were scrolling, refresh once motion settles
  window.addEventListener(
    'scrollend',
    () => {
      if (pendingWhileScrolling && !navScrollAnimating) applyRefresh();
    },
    { passive: true }
  );

  // Fallback when scrollend is unavailable
  let settleTimer = null;
  window.addEventListener(
    'scroll',
    () => {
      if (!pendingWhileScrolling) return;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (pendingWhileScrolling && !navScrollAnimating && !pageScrollApi?.isMoving?.()) {
          applyRefresh();
        }
      }, 180);
    },
    { passive: true }
  );
}

// Selected Work category filters (Apple-style segmented control)
function setupProjectFilters() {
  const stage = document.querySelector('.projects-stage');
  if (!stage) return;

  const filterTrack = stage.querySelector('.project-filters');
  const filters = stage.querySelectorAll('.project-filter');
  const indicator = filterTrack?.querySelector('.project-filter-indicator');
  const workItems = stage.querySelectorAll('[data-work-category]');
  const primaryGrid = stage.querySelector('.projects-primary-grid');
  const secondarySection = stage.querySelector('.projects-secondary-section');
  const moreGroups = stage.querySelectorAll('.more-work-group');

  if (!filters.length || !workItems.length) return;

  function syncFilterIndicator() {
    if (!filterTrack || !indicator) return;
    const active = filterTrack.querySelector('.project-filter.is-active');
    if (!active) return;

    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translate3d(${active.offsetLeft}px, 0, 0)`;
  }

  function scrollActiveFilterIntoView() {
    if (!filterTrack) return;
    const active = filterTrack.querySelector('.project-filter.is-active');
    if (!active || filterTrack.scrollWidth <= filterTrack.clientWidth + 1) return;

    const trackRect = filterTrack.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const activeCenter = activeRect.left + activeRect.width / 2;
    const trackCenter = trackRect.left + trackRect.width / 2;
    filterTrack.scrollLeft += activeCenter - trackCenter;
  }

  let indicatorRaf = 0;
  function queueFilterIndicator() {
    if (indicatorRaf) return;
    indicatorRaf = requestAnimationFrame(() => {
      indicatorRaf = 0;
      syncFilterIndicator();
      scrollActiveFilterIntoView();
    });
  }

  queueFilterIndicator();
  window.addEventListener('resize', queueFilterIndicator, { passive: true });
  filterTrack?.addEventListener('scroll', queueFilterIndicator, { passive: true });

  function syncFilteredLayout(filter) {
    stage.classList.toggle('is-filter-active', filter !== 'all');
    stage.dataset.activeFilter = filter;
  }

  function isVisible(item) {
    return !item.classList.contains('is-work-hidden');
  }

  function syncSectionHeadings() {
    const hasPrimary = primaryGrid
      && [...primaryGrid.querySelectorAll('[data-work-category]')].some(isVisible);
    const hasSecondary = secondarySection
      && [...secondarySection.querySelectorAll('[data-work-category]')].some(isVisible);

    primaryGrid?.classList.toggle('is-work-hidden', !hasPrimary);
    secondarySection?.classList.toggle('is-work-hidden', !hasSecondary);

    moreGroups.forEach((group) => {
      const hasGroupItems = [...group.querySelectorAll('[data-work-category]')].some(isVisible);
      group.classList.toggle('is-work-hidden', !hasGroupItems);
    });
  }

  function applyFilter(filter) {
    workItems.forEach((item) => {
      const category = item.getAttribute('data-work-category');
      const show = filter === 'all' || category === filter;
      item.classList.toggle('is-work-hidden', !show);
    });
    syncSectionHeadings();
    syncFilteredLayout(filter);
  }

  applyFilter('all');

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      if (!filter) return;

      filters.forEach((tab) => {
        const active = tab === btn;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      applyFilter(filter);
      queueFilterIndicator();
      requestAnimationFrame(scrollActiveFilterIntoView);
    });
  });
}

// Touch targets + native scroll momentum (mobile + desktop) + nav ease on click
function setupScrollPerf() {
  document.documentElement.style.scrollBehavior = 'auto';

  document.querySelectorAll(
    '.featured-project-image.clickable-image, .work-grid-thumb.clickable-image, .badge-image-wrap.clickable-image'
  ).forEach((el) => {
    el.style.touchAction = 'pan-y';
  });

  const siteContent = document.querySelector('.site-content');
  if (siteContent) {
    siteContent.style.touchAction = 'pan-y';
  }

  pageScrollApi?.destroy?.();
  pageScrollApi = setupApplePageScroll();

  if (navSpyApi?.finishPassiveScroll) {
    pageScrollApi.onIdle(navSpyApi.finishPassiveScroll);
  }
}

// Instant tap feedback on mobile — no ripple delay, links open immediately
function setupFastTouch() {
  if (window.matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll(
    'a[href^="http"], a[href^="mailto:"], a[href$=".pdf"], .github-link, .additional-github-link, .verify-link, .hero-verify-credly, .cta-nav, .contact-buttons a, .contact-info-row, .project-filter'
  ).forEach((el) => {
    el.style.touchAction = 'manipulation';
  });
}

// CI/CD pipeline — always animate when visible (never paused during scroll)
function setupDeployFlowLive() {
  if (document.documentElement.classList.contains('reduced-motion')) return;

  const section = document.getElementById('portfolio-deployment');
  if (!section) return;

  const targets = section.querySelectorAll(
    '.deploy-line, .deploy-connector i, .deploy-phase-bridge-bubble i'
  );
  if (!targets.length) return;

  const setState = (state) => {
    targets.forEach((el) => {
      el.style.animationPlayState = state;
    });
  };

  setState('running');

  const obs = new IntersectionObserver(
    (entries) => {
      setState(entries[0]?.isIntersecting ? 'running' : 'paused');
    },
    { rootMargin: '160px 0px', threshold: 0 }
  );
  obs.observe(section);
}

// Pause off-screen micro-animations only (not pipeline flow)
function setupAnimationPausing() {
  function watchSection(sectionId, selector) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const els = section.querySelectorAll(selector);
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      const state = entries[0].isIntersecting ? 'running' : 'paused';
      els.forEach((el) => { el.style.animationPlayState = state; });
    }, { threshold: 0.05 });
    obs.observe(section);
    els.forEach((el) => { el.style.animationPlayState = 'paused'; });
  }

  watchSection('portfolio-deployment', '.deploy-line, .deploy-connector i');
  watchSection('contact', '.contact-status-dot, .contact-eyebrow i');

  const nav = document.getElementById('mainNav');
  const liveDot = nav?.querySelector('.nav-live-dot');
  if (liveDot) {
    const obs = new IntersectionObserver((entries) => {
      liveDot.style.animationPlayState = entries[0].isIntersecting ? 'running' : 'paused';
    }, { threshold: 0 });
    obs.observe(nav);
    liveDot.style.animationPlayState = 'paused';
    requestAnimationFrame(() => {
      liveDot.style.animationPlayState = 'running';
    });
  }
}

// ===== RIPPLE EFFECT ON BUTTONS =====
function setupRipples() {
  if (document.documentElement.classList.contains('reduced-motion')) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll(
    '.contact-buttons a, .verify-link, .hero-verify-credly, .cta-nav, .github-link, .additional-github-link'
  ).forEach((button) => {
    button.addEventListener('click', function(e) {
      if (e.clientX === 0 && e.clientY === 0) return;

      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');

      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}
