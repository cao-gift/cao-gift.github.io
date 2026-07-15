(function() {
  'use strict';

  if (window.__siteLightboxScriptLoaded) return;
  window.__siteLightboxScriptLoaded = true;

  // 灯箱插件
  class Lightbox {
    constructor(options = {}) {
      const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.options = Object.assign({
        animationDuration: reduceMotion ? 0 : 300,
        closeOnOverlayClick: true,
        onOpen: null,
        onClose: null,
        onNavigate: null
      }, options);

      this.images = [];
      this.currentIndex = 0;
      this.isOpen = false;
      this.isZoomed = false;
      this.zoomLevel = 1;
      this.touchStartX = 0;
      this.touchEndX = 0;
      this.wheelTimer = null;
      this.previousBodyOverflow = '';
      this.previousActiveElement = null;
      this.inertStates = [];
      this.closeTimer = null;

      this.init();
    }

    init() {
      this.createStyles();
      this.createLightbox();
      this.bindEvents();
    }

    createStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .lb-lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          transition: opacity ${this.options.animationDuration}ms ease;
          pointer-events: none;
        }
        .lb-lightbox-overlay.active {
          pointer-events: auto;
        }
        .lb-lightbox-content-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        .lb-lightbox-container {
          max-width: 90%;
          max-height: 90%;
          position: relative;
          transition: transform ${this.options.animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1);
        }
        .lb-lightbox-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: transform ${this.options.animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity ${this.options.animationDuration}ms ease;
        }
        .lb-lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(255, 255, 255, 0.8);
          color: #333;
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          font-size: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: transform 0.3s ease, background-color 0.3s ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .lb-lightbox-nav:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: translateY(-50%) scale(1.1);
        }
        .lb-lightbox-nav:active {
          transform: translateY(-50%) scale(0.9);
        }
        .lb-lightbox-prev {
          left: 20px;
        }
        .lb-lightbox-next {
          right: 20px;
        }
        .lb-lightbox-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background-color: rgba(255, 255, 255, 0.8);
          color: #333;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: transform 0.3s ease, background-color 0.3s ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .lb-lightbox-close:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }
        .lb-lightbox-close:active {
          transform: scale(0.9);
        }
        @media (max-width: 768px) {
          .lb-lightbox-nav {
            width: 40px;
            height: 40px;
            font-size: 20px;
          }
          .lb-lightbox-close {
            width: 35px;
            height: 35px;
            font-size: 20px;
          }
        }
        @media (prefers-color-scheme: dark) {
          .lb-lightbox-overlay {
            background-color: rgba(0, 0, 0, 0.9);
          }
          .lb-lightbox-nav,
          .lb-lightbox-close {
            background-color: rgba(50, 50, 50, 0.8);
            color: #fff;
          }
          .lb-lightbox-nav:hover,
          .lb-lightbox-close:hover {
            background-color: rgba(70, 70, 70, 1);
          }
          .lb-lightbox-image {
            box-shadow: 0 10px 30px rgba(255, 255, 255, 0.1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lb-lightbox-overlay,
          .lb-lightbox-container,
          .lb-lightbox-image,
          .lb-lightbox-nav,
          .lb-lightbox-close {
            transition-duration: 0.01ms !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    createLightbox() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'lb-lightbox-overlay';
      this.overlay.style.zIndex = '-1';
      this.overlay.setAttribute('role', 'dialog');
      this.overlay.setAttribute('aria-modal', 'true');
      this.overlay.setAttribute('aria-label', '图片预览');
      this.overlay.setAttribute('aria-hidden', 'true');
      this.overlay.setAttribute('tabindex', '-1');

      this.contentWrapper = document.createElement('div');
      this.contentWrapper.className = 'lb-lightbox-content-wrapper';

      this.container = document.createElement('div');
      this.container.className = 'lb-lightbox-container';

      this.image = document.createElement('img');
      this.image.className = 'lb-lightbox-image';
      this.image.alt = '';

      this.prevButton = document.createElement('button');
      this.prevButton.type = 'button';
      this.prevButton.className = 'lb-lightbox-nav lb-lightbox-prev';
      this.prevButton.setAttribute('aria-label', '上一张图片');
      this.prevButton.innerHTML = '&#10094;';

      this.nextButton = document.createElement('button');
      this.nextButton.type = 'button';
      this.nextButton.className = 'lb-lightbox-nav lb-lightbox-next';
      this.nextButton.setAttribute('aria-label', '下一张图片');
      this.nextButton.innerHTML = '&#10095;';

      this.closeButton = document.createElement('button');
      this.closeButton.type = 'button';
      this.closeButton.className = 'lb-lightbox-close';
      this.closeButton.setAttribute('aria-label', '关闭图片预览');
      this.closeButton.innerHTML = '&times;';

      this.container.appendChild(this.image);
      this.contentWrapper.appendChild(this.container);
      this.contentWrapper.appendChild(this.prevButton);
      this.contentWrapper.appendChild(this.nextButton);
      this.contentWrapper.appendChild(this.closeButton);

      this.overlay.appendChild(this.contentWrapper);

      document.body.appendChild(this.overlay);
    }

    bindEvents() {
      document.addEventListener('click', this.handleImageClick.bind(this), true);
      document.addEventListener('keydown', this.handleImageKeyDown.bind(this), true);
      this.overlay.addEventListener('click', this.handleOverlayClick.bind(this));
      this.prevButton.addEventListener('click', this.showPreviousImage.bind(this));
      this.nextButton.addEventListener('click', this.showNextImage.bind(this));
      this.closeButton.addEventListener('click', this.close.bind(this));
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.overlay.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
      this.overlay.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      this.overlay.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
      this.overlay.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    isPreviewableImage(img) {
      if (!img) return false;
      if (img.closest && img.closest('#esa-img-captcha-banner')) return false;
      if (img.getAttribute('data-esa-img-locked') === '1') return false;

      const src = img.currentSrc || img.getAttribute('src') || '';
      if (!src || src.startsWith('data:image/gif;base64,R0lGODlhAQABA')) return false;
      return true;
    }

    handleImageClick(event) {
      const clickedImage = event.target.closest('.markdown-body img');
      if (clickedImage && !this.isOpen && this.isPreviewableImage(clickedImage)) {
        event.preventDefault();
        event.stopPropagation();
        this.openFromImage(clickedImage);
      }
    }

    handleImageKeyDown(event) {
      if (this.isOpen || (event.key !== 'Enter' && event.key !== ' ')) return;
      if (!event.target || !event.target.closest) return;
      const link = event.target.closest('.markdown-body a[href]');
      if (!link || link.textContent.trim()) return;
      const images = link.querySelectorAll('img');
      if (images.length !== 1 || !this.isPreviewableImage(images[0])) return;
      event.preventDefault();
      this.openFromImage(images[0]);
    }

    openFromImage(image) {
      this.images = Array.from(document.querySelectorAll('.markdown-body img'))
        .filter((img) => this.isPreviewableImage(img));
      this.currentIndex = this.images.indexOf(image);
      if (this.currentIndex < 0) return;
      this.open();
    }

    handleOverlayClick(event) {
      if (event.target.closest('.lb-lightbox-nav, .lb-lightbox-close')) return;
      if ((event.target === this.overlay || event.target === this.contentWrapper) && this.options.closeOnOverlayClick) {
        this.close();
      }
    }

    handleKeyDown(event) {
      if (!this.isOpen) return;

      if (event.key === 'Tab') {
        this.trapFocus(event);
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          this.showPreviousImage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.showNextImage();
          break;
        case 'Escape':
          event.preventDefault();
          this.close();
          break;
      }
    }

    trapFocus(event) {
      const focusable = [this.prevButton, this.nextButton, this.closeButton]
        .filter((element) => element && element.style.display !== 'none' && !element.disabled);
      if (!focusable.length) return;

      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex < 0 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
      event.preventDefault();
      focusable[nextIndex].focus();
    }

    handleWheel(event) {
      event.preventDefault();
      clearTimeout(this.wheelTimer);

      this.wheelTimer = setTimeout(() => {
        const delta = Math.sign(event.deltaY);
        if (delta > 0) {
          this.showNextImage();
        } else {
          this.showPreviousImage();
        }
      }, 50);
    }

    handleTouchStart(event) {
      this.touchStartX = event.touches[0].clientX;
      this.touchEndX = this.touchStartX;
    }

    handleTouchMove(event) {
      this.touchEndX = event.touches[0].clientX;
    }

    handleTouchEnd() {
      const difference = this.touchStartX - this.touchEndX;
      if (Math.abs(difference) > 50) {
        if (difference > 0) {
          this.showNextImage();
        } else {
          this.showPreviousImage();
        }
      }
    }

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      clearTimeout(this.closeTimer);
      this.previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.previousBodyOverflow = document.body.style.overflow;
      this.setBackgroundInert(true);
      this.overlay.style.zIndex = '10000';
      this.overlay.setAttribute('aria-hidden', 'false');
      this.overlay.classList.add('active');
      this.showImage();
      this.overlay.style.opacity = '1';
      document.body.style.overflow = 'hidden';
      try {
        this.closeButton.focus({ preventScroll: true });
      } catch (e) {
        this.closeButton.focus();
      }
      window.requestAnimationFrame(() => {
        if (this.isOpen && !this.overlay.contains(document.activeElement)) {
          this.closeButton.focus();
        }
      });
      if (typeof this.options.onOpen === 'function') {
        this.options.onOpen();
      }
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.overlay.style.opacity = '0';
      this.overlay.classList.remove('active');
      document.body.style.overflow = this.previousBodyOverflow || '';
      this.closeTimer = setTimeout(() => {
        this.image.style.transform = '';
        this.zoomLevel = 1;
        this.isZoomed = false;
        this.overlay.style.zIndex = '-1';
        this.overlay.setAttribute('aria-hidden', 'true');
        this.setBackgroundInert(false);
        if (this.previousActiveElement && this.previousActiveElement.isConnected) {
          this.previousActiveElement.focus();
        }
      }, this.options.animationDuration);
      if (typeof this.options.onClose === 'function') {
        this.options.onClose();
      }
    }

    showPreviousImage() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.showImage();
      }
    }

    showNextImage() {
      if (this.currentIndex < this.images.length - 1) {
        this.currentIndex++;
        this.showImage();
      }
    }

    showImage() {
      const sourceImage = this.images[this.currentIndex];
      if (!sourceImage) return;
      const imgSrc = sourceImage.currentSrc || sourceImage.src;
      if (!imgSrc) return;
      this.image.style.opacity = '0';
      this.image.alt = sourceImage.alt || '图片预览';
      this.overlay.setAttribute('aria-label', `图片预览，第 ${this.currentIndex + 1} 张，共 ${this.images.length} 张`);
      
      const newImage = new Image();
      newImage.src = imgSrc;
      newImage.onload = () => {
        this.image.src = imgSrc;
        this.image.style.opacity = '1';
      };

      this.prevButton.style.display = this.currentIndex > 0 ? '' : 'none';
      this.nextButton.style.display = this.currentIndex < this.images.length - 1 ? '' : 'none';

      if (typeof this.options.onNavigate === 'function') {
        this.options.onNavigate(this.currentIndex);
      }

      this.preloadImages();
    }

    setBackgroundInert(inert) {
      if (inert) {
        this.inertStates = Array.from(document.body.children)
          .filter((element) => element !== this.overlay && element.id !== 'bgVideo' && element.id !== 'bgOverlay')
          .map((element) => ({
            element,
            hadInert: element.hasAttribute('inert'),
            ariaHidden: element.getAttribute('aria-hidden')
          }));
        this.inertStates.forEach(({ element }) => {
          element.setAttribute('inert', '');
          element.setAttribute('aria-hidden', 'true');
        });
        return;
      }

      this.inertStates.forEach(({ element, hadInert, ariaHidden }) => {
        if (!element.isConnected) return;
        if (!hadInert) element.removeAttribute('inert');
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
      this.inertStates = [];
    }

    zoom(factor) {
      this.zoomLevel += factor;
      this.zoomLevel = Math.max(1, Math.min(this.zoomLevel, 3));
      this.image.style.transform = `scale(${this.zoomLevel})`;
      this.isZoomed = this.zoomLevel !== 1;
    }

    preloadImages() {
      if (!this.images || this.images.length < 2 || this.currentIndex < 0) return;
      const preloadNext = (this.currentIndex + 1) % this.images.length;
      const preloadPrev = (this.currentIndex - 1 + this.images.length) % this.images.length;
      const nextSrc = this.images[preloadNext] && (this.images[preloadNext].currentSrc || this.images[preloadNext].src);
      const prevSrc = this.images[preloadPrev] && (this.images[preloadPrev].currentSrc || this.images[preloadPrev].src);
      if (nextSrc) new Image().src = nextSrc;
      if (prevSrc) new Image().src = prevSrc;
    }
  }

  // 将 Lightbox 类添加到全局对象
  window.Lightbox = Lightbox;

  // 自动初始化
  const initLightbox = () => {
    if (!document.querySelector('.markdown-body img')) return;
    if (window.__siteLightboxReady) return;
    window.__siteLightboxReady = true;
    new Lightbox();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox, { once: true });
  } else {
    initLightbox();
  }
})();
