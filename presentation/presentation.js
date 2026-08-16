(() => {
  'use strict';

  const TOTAL_SLIDES = 11;
  const slideImage = document.getElementById('slideImage');
  const slideCounter = document.getElementById('slideCounter');
  const progressBar = document.getElementById('progressBar');
  const thumbnails = document.getElementById('thumbnails');
  const stage = document.getElementById('stage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const fullscreenButton = document.getElementById('fullscreenButton');
  const autoplayButton = document.getElementById('autoplayButton');
  const stopButton = document.getElementById('stopButton');
  const previousButtons = [document.getElementById('previousButton'), document.getElementById('previousButtonBottom')];
  const nextButtons = [document.getElementById('nextButton'), document.getElementById('nextButtonBottom')];
  const slidePath = index => `slides/${String(index).padStart(2, '0')}.webp`;
  let currentSlide = 1;
  let autoplayTimer = null;
  let touchStartX = null;

  function setLoading(isLoading) {
    loadingIndicator.classList.toggle('visible', isLoading);
  }

  function preload(index) {
    if (index < 1 || index > TOTAL_SLIDES) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = slidePath(index);
  }

  function updateThumbnails() {
    thumbnails.querySelectorAll('.thumbnail').forEach(button => {
      const active = Number(button.dataset.slide) === currentSlide;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'true' : 'false');
    });
    const active = thumbnails.querySelector(`[data-slide="${currentSlide}"]`);
    if (active) active.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }

  function updateSlide(index) {
    currentSlide = Math.max(1, Math.min(TOTAL_SLIDES, index));
    const nextSource = slidePath(currentSlide);
    setLoading(true);
    slideImage.alt = `الشريحة ${currentSlide} من العرض التعليمي`;
    slideImage.onload = () => setLoading(false);
    slideImage.onerror = () => {
      setLoading(false);
      slideImage.alt = `تعذر تحميل الشريحة ${currentSlide}`;
    };
    if (slideImage.getAttribute('src') !== nextSource) slideImage.src = nextSource;
    else setLoading(false);
    slideCounter.textContent = `الشريحة ${currentSlide} من ${TOTAL_SLIDES}`;
    progressBar.style.width = `${(currentSlide / TOTAL_SLIDES) * 100}%`;
    updateThumbnails();
    preload(currentSlide + 1);
  }

  function goNext() {
    updateSlide(currentSlide === TOTAL_SLIDES ? 1 : currentSlide + 1);
  }

  function goPrevious() {
    updateSlide(currentSlide === 1 ? TOTAL_SLIDES : currentSlide - 1);
  }

  function stopAutoplay() {
    if (autoplayTimer) window.clearInterval(autoplayTimer);
    autoplayTimer = null;
    autoplayButton.disabled = false;
    stopButton.disabled = true;
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = window.setInterval(goNext, 5000);
    autoplayButton.disabled = true;
    stopButton.disabled = false;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (stage.requestFullscreen) stage.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function renderThumbnails() {
    const fragment = document.createDocumentFragment();
    for (let index = 1; index <= TOTAL_SLIDES; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumbnail';
      button.dataset.slide = String(index);
      button.setAttribute('aria-label', `الانتقال إلى الشريحة ${index}`);
      button.innerHTML = `<img src="${slidePath(index)}" alt="" loading="lazy" decoding="async"><span class="thumbnail-label">الشريحة ${index}</span>`;
      button.addEventListener('click', () => {
        stopAutoplay();
        updateSlide(index);
      });
      fragment.appendChild(button);
    }
    thumbnails.appendChild(fragment);
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
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
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
    touchStartX = event.changedTouches[0].clientX;
  }, {passive: true});
  stage.addEventListener('touchend', event => {
    if (touchStartX === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) < 45) return;
    stopAutoplay();
    if (distance < 0) goNext();
    else goPrevious();
  }, {passive: true});

  renderThumbnails();
  updateSlide(1);
})();
