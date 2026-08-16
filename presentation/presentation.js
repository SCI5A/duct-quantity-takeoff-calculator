(() => {
  'use strict';

  const slideImage = document.getElementById('slideImage');
  const slideCounter = document.getElementById('slideCounter');
  const progressBar = document.getElementById('progressBar');
  const progressTrack = document.getElementById('progressTrack');
  const thumbnails = document.getElementById('thumbnails');
  const stage = document.getElementById('stage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const fullscreenButton = document.getElementById('fullscreenButton');
  const autoplayButton = document.getElementById('autoplayButton');
  const stopButton = document.getElementById('stopButton');
  const previousButtons = [document.getElementById('previousButton'), document.getElementById('previousButtonBottom')];
  const nextButtons = [document.getElementById('nextButton'), document.getElementById('nextButtonBottom')];
  const MANIFEST_PATH = 'slides/manifest.json';
  let slideFiles = [];
  let currentSlide = 1;
  let autoplayTimer = null;
  let touchStartX = null;
  const preloadCache = new Map();

  function totalSlides() {
    return slideFiles.length;
  }

  function slidePath(index) {
    return `slides/${encodeURIComponent(slideFiles[index - 1])}`;
  }

  function setLoading(isLoading) {
    loadingIndicator.classList.toggle('visible', isLoading);
  }

  function setProgress() {
    const total = totalSlides();
    const value = total ? Math.round((currentSlide / total) * 100) : 0;
    progressBar.style.width = `${value}%`;
    progressTrack.setAttribute('aria-valuemax', String(total));
    progressTrack.setAttribute('aria-valuenow', String(currentSlide));
    progressTrack.setAttribute('aria-valuetext', total ? `الشريحة ${currentSlide} من ${total}` : 'لا توجد شرائح');
  }

  function preload(index) {
    if (index < 1 || index > totalSlides() || preloadCache.has(index)) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = slidePath(index);
    preloadCache.set(index, image);
    while (preloadCache.size > 3) {
      preloadCache.delete(preloadCache.keys().next().value);
    }
  }

  function updateThumbnails() {
    thumbnails.querySelectorAll('.thumbnail').forEach(button => {
      const active = Number(button.dataset.slide) === currentSlide;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'true' : 'false');
    });
    const active = thumbnails.querySelector(`[data-slide="${currentSlide}"]`);
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function updateSlide(index) {
    const total = totalSlides();
    if (!total) return;
    currentSlide = Math.max(1, Math.min(total, index));
    const nextSource = slidePath(currentSlide);
    setLoading(true);
    slideImage.alt = `الشريحة ${currentSlide} من العرض التعليمي`;
    slideImage.onload = () => setLoading(false);
    slideImage.onerror = () => {
      setLoading(false);
      slideImage.alt = `تعذر تحميل الشريحة ${currentSlide}`;
      slideCounter.textContent = `تعذر تحميل الشريحة ${currentSlide} من ${total}`;
    };
    if (slideImage.getAttribute('src') !== nextSource) slideImage.src = nextSource;
    else setLoading(false);
    slideCounter.textContent = `الشريحة ${currentSlide} من ${total}`;
    setProgress();
    updateThumbnails();
    preload(currentSlide + 1);
    preload(currentSlide - 1);
  }

  function goNext() {
    if (!totalSlides()) return;
    updateSlide(currentSlide === totalSlides() ? 1 : currentSlide + 1);
  }

  function goPrevious() {
    if (!totalSlides()) return;
    updateSlide(currentSlide === 1 ? totalSlides() : currentSlide - 1);
  }

  function stopAutoplay() {
    if (autoplayTimer) window.clearInterval(autoplayTimer);
    autoplayTimer = null;
    autoplayButton.disabled = false;
    autoplayButton.setAttribute('aria-pressed', 'false');
    stopButton.disabled = true;
  }

  function startAutoplay() {
    if (totalSlides() < 2) return;
    stopAutoplay();
    autoplayTimer = window.setInterval(goNext, 5000);
    autoplayButton.disabled = true;
    autoplayButton.setAttribute('aria-pressed', 'true');
    stopButton.disabled = false;
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (!stage.requestFullscreen) throw new Error('Fullscreen is not supported.');
        await stage.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen was not available:', error);
      slideCounter.textContent = 'تعذر تفعيل ملء الشاشة في هذا المتصفح';
      window.setTimeout(() => updateSlide(currentSlide), 1800);
    }
  }

  function renderThumbnails() {
    const fragment = document.createDocumentFragment();
    slideFiles.forEach((file, index) => {
      const slideNumber = index + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumbnail';
      button.dataset.slide = String(slideNumber);
      button.setAttribute('aria-label', `الانتقال إلى الشريحة ${slideNumber}`);
      const image = document.createElement('img');
      image.src = slidePath(slideNumber);
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      const label = document.createElement('span');
      label.className = 'thumbnail-label';
      label.textContent = `الشريحة ${slideNumber}`;
      button.append(image, label);
      button.addEventListener('click', () => {
        stopAutoplay();
        updateSlide(slideNumber);
      });
      fragment.appendChild(button);
    });
    thumbnails.replaceChildren(fragment);
  }

  async function loadManifest() {
    try {
      const response = await fetch(MANIFEST_PATH, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
      const manifest = await response.json();
      if (!Array.isArray(manifest.slides) || !manifest.slides.length) throw new Error('Manifest has no slides.');
      slideFiles = manifest.slides.filter(file => typeof file === 'string' && /^[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g)$/i.test(file));
      if (!slideFiles.length) throw new Error('Manifest has no valid image files.');
      renderThumbnails();
      updateSlide(1);
    } catch (error) {
      console.error('Unable to load presentation manifest:', error);
      stopAutoplay();
      slideCounter.textContent = 'تعذر تحميل قائمة الشرائح';
      loadingIndicator.textContent = 'تعذر تحميل العرض التعليمي.';
      loadingIndicator.classList.add('visible');
      fullscreenButton.disabled = true;
      autoplayButton.disabled = true;
      stopButton.disabled = true;
    }
  }

  previousButtons.forEach(button => button.addEventListener('click', () => { stopAutoplay(); goPrevious(); }));
  nextButtons.forEach(button => button.addEventListener('click', () => { stopAutoplay(); goNext(); }));
  fullscreenButton.addEventListener('click', toggleFullscreen);
  autoplayButton.addEventListener('click', startAutoplay);
  stopButton.addEventListener('click', stopAutoplay);
  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.textContent = document.fullscreenElement ? 'إنهاء ملء الشاشة' : 'ملء الشاشة';
  });

  document.addEventListener('keydown', event => {
    const active = document.activeElement;
    const tag = active && active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || active?.isContentEditable) return;
    if (event.key === 'ArrowLeft' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      stopAutoplay();
      goNext();
    } else if (event.key === 'ArrowRight' || event.key === 'PageUp') {
      event.preventDefault();
      stopAutoplay();
      goPrevious();
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleFullscreen();
    } else if (event.key === 'Escape') {
      stopAutoplay();
    }
  });

  stage.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) {
      touchStartX = null;
      return;
    }
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (touchStartX === null || event.changedTouches.length !== 1) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) < 45) return;
    stopAutoplay();
    if (distance < 0) goNext();
    else goPrevious();
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
  });
  window.addEventListener('pagehide', stopAutoplay, { once: true });

  loadManifest();
})();
