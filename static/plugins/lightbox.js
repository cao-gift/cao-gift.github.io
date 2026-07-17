(function() {
  'use strict';

  if (window.__siteLightboxScriptLoaded) return;
  window.__siteLightboxScriptLoaded = true;

  class Lightbox {
    constructor(options = {}) {
      const reduceMotion = !!(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );

      this.options = Object.assign({
        animationDuration: reduceMotion ? 0 : 240,
        closeOnOverlayClick: true,
        minZoom: 1,
        maxZoom: 4,
        zoomStep: 0.25,
        swipeThreshold: 56,
        wheelNavigation: true,
        onOpen: null,
        onClose: null,
        onNavigate: null
      }, options);

      this.images = [];
      this.currentIndex = -1;
      this.isOpen = false;
      this.isZoomed = false;
      this.uiReady = false;
      this.zoomLevel = this.options.minZoom;
      this.panX = 0;
      this.panY = 0;
      this.pointerState = null;
      this.wheelTimer = null;
      this.closeTimer = null;
      this.resizeFrame = null;
      this.focusFrame = null;
      this.focusTimer = null;
      this.imageRequestId = 0;
      this.imageCache = new Map();
      this.previousBodyOverflow = '';
      this.previousActiveElement = null;
      this.inertStates = [];

      this.bound = {
        documentClick: this.handleImageClick.bind(this),
        documentKeyDown: this.handleDocumentKeyDown.bind(this),
        overlayClick: this.handleOverlayClick.bind(this),
        previous: this.showPreviousImage.bind(this),
        next: this.showNextImage.bind(this),
        close: this.close.bind(this),
        wheel: this.handleWheel.bind(this),
        pointerDown: this.handlePointerDown.bind(this),
        pointerMove: this.handlePointerMove.bind(this),
        pointerUp: this.handlePointerUp.bind(this),
        doubleClick: this.handleDoubleClick.bind(this),
        dragStart: (event) => event.preventDefault(),
        zoomOut: () => this.setZoom(this.zoomLevel - this.options.zoomStep),
        zoomIn: () => this.setZoom(this.zoomLevel + this.options.zoomStep),
        resetZoom: () => this.resetView(),
        resize: this.handleResize.bind(this)
      };

      this.init();
    }

    init() {
      document.addEventListener('click', this.bound.documentClick, true);
      document.addEventListener('keydown', this.bound.documentKeyDown, true);
    }

    ensureUI() {
      if (this.uiReady) return;
      this.createStyles();
      this.createLightbox();
      this.bindUIEvents();
      this.uiReady = true;
    }

    createStyles() {
      if (document.getElementById('site-lightbox-styles')) return;

      this.styleElement = document.createElement('style');
      this.styleElement.id = 'site-lightbox-styles';
      this.styleElement.textContent = `
        .lb-lightbox-overlay {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          overscroll-behavior: contain;
          background: rgba(8, 13, 22, 0.94);
          color: #f6f8fa;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          contain: layout style paint;
          transition:
            opacity ${this.options.animationDuration}ms ease,
            visibility 0s linear ${this.options.animationDuration}ms;
        }
        .lb-lightbox-overlay.active {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transition-delay: 0s;
        }
        .lb-lightbox-content-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 72px 76px 118px;
          box-sizing: border-box;
        }
        .lb-lightbox-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: min(90vw, 1600px);
          height: min(76vh, 1100px);
          overflow: hidden;
          border-radius: 12px;
          touch-action: pan-y;
        }
        .lb-lightbox-overlay.is-zoomed .lb-lightbox-container {
          touch-action: none;
        }
        .lb-lightbox-image {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
          border-radius: 10px;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.42);
          opacity: 0;
          cursor: zoom-in;
          transform-origin: center center;
          transition:
            opacity ${this.options.animationDuration}ms ease,
            transform ${this.options.animationDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .lb-lightbox-image.is-ready {
          opacity: 1;
        }
        .lb-lightbox-overlay.is-zoomed .lb-lightbox-image {
          cursor: grab;
          will-change: transform;
          transition: opacity ${this.options.animationDuration}ms ease;
        }
        .lb-lightbox-overlay.is-dragging .lb-lightbox-image {
          cursor: grabbing;
        }
        .lb-lightbox-control {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          height: 44px;
          padding: 0 12px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          background: rgba(31, 41, 55, 0.88);
          color: #f6f8fa;
          font: inherit;
          font-size: 19px;
          line-height: 1;
          text-decoration: none;
          cursor: pointer;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.22);
          transition: background-color 160ms ease, transform 160ms ease, opacity 160ms ease;
        }
        .lb-lightbox-control:hover:not(:disabled) {
          background: rgba(55, 65, 81, 0.98);
          transform: translateY(-1px);
        }
        .lb-lightbox-control:active:not(:disabled) {
          transform: translateY(0) scale(0.96);
        }
        .lb-lightbox-control:focus-visible {
          outline: 3px solid #58a6ff;
          outline-offset: 3px;
        }
        .lb-lightbox-control:disabled {
          cursor: default;
          opacity: 0.38;
        }
        .lb-lightbox-control[hidden] {
          display: none !important;
        }
        .lb-lightbox-nav,
        .lb-lightbox-close {
          position: absolute;
          z-index: 3;
          padding: 0;
          font-size: 28px;
        }
        .lb-lightbox-prev {
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
        }
        .lb-lightbox-next {
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
        }
        .lb-lightbox-prev:hover:not(:disabled),
        .lb-lightbox-next:hover:not(:disabled) {
          transform: translateY(-50%) scale(1.05);
        }
        .lb-lightbox-close {
          top: 18px;
          right: 18px;
        }
        .lb-lightbox-toolbar {
          position: absolute;
          left: 50%;
          bottom: 20px;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 8px;
          transform: translateX(-50%);
        }
        .lb-lightbox-zoom-level {
          min-width: 72px;
          font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .lb-lightbox-original {
          font-size: 20px;
        }
        .lb-lightbox-info {
          position: absolute;
          left: 50%;
          bottom: 76px;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: min(82vw, 900px);
          min-height: 28px;
          transform: translateX(-50%);
          color: rgba(246, 248, 250, 0.9);
          font-size: 14px;
          line-height: 1.45;
          text-align: center;
          pointer-events: none;
        }
        .lb-lightbox-counter {
          flex: 0 0 auto;
          padding: 3px 9px;
          border-radius: 999px;
          background: rgba(31, 41, 55, 0.78);
          font-variant-numeric: tabular-nums;
        }
        .lb-lightbox-caption {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lb-lightbox-status,
        .lb-lightbox-error {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          max-width: min(78vw, 460px);
          padding: 10px 14px;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          background: rgba(31, 41, 55, 0.9);
          color: #f6f8fa;
          font-size: 14px;
          text-align: center;
        }
        .lb-lightbox-status::before {
          content: '';
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lb-lightbox-spin 720ms linear infinite;
        }
        .lb-lightbox-error {
          border-radius: 10px;
          background: rgba(140, 32, 32, 0.92);
        }
        .lb-lightbox-status[hidden],
        .lb-lightbox-error[hidden],
        .lb-lightbox-caption[hidden] {
          display: none !important;
        }
        .lb-lightbox-live {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }
        @keyframes lb-lightbox-spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .lb-lightbox-content-wrapper {
            padding: 58px 10px 132px;
          }
          .lb-lightbox-container {
            width: calc(100vw - 20px);
            height: calc(100vh - 190px);
            height: calc(100dvh - 190px);
          }
          .lb-lightbox-nav {
            top: auto;
            bottom: 18px;
            transform: none;
          }
          .lb-lightbox-prev {
            left: 12px;
          }
          .lb-lightbox-next {
            right: 12px;
          }
          .lb-lightbox-prev:hover:not(:disabled),
          .lb-lightbox-next:hover:not(:disabled) {
            transform: scale(1.05);
          }
          .lb-lightbox-close {
            top: 10px;
            right: 10px;
          }
          .lb-lightbox-toolbar {
            bottom: 18px;
          }
          .lb-lightbox-info {
            bottom: 74px;
            width: calc(100vw - 24px);
          }
          .lb-lightbox-caption {
            max-width: 60vw;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lb-lightbox-overlay,
          .lb-lightbox-image,
          .lb-lightbox-control {
            transition-duration: 0.01ms !important;
          }
          .lb-lightbox-status::before {
            animation-duration: 1.4s;
          }
        }
      `;
      document.head.appendChild(this.styleElement);
    }

    createButton(className, label, content) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `lb-lightbox-control ${className}`;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.textContent = content;
      return button;
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
      this.image.decoding = 'async';
      this.image.draggable = false;

      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'lb-lightbox-status';
      this.loadingIndicator.setAttribute('role', 'status');
      this.loadingIndicator.textContent = '正在加载图片';
      this.loadingIndicator.hidden = true;

      this.errorMessage = document.createElement('div');
      this.errorMessage.className = 'lb-lightbox-error';
      this.errorMessage.setAttribute('role', 'alert');
      this.errorMessage.textContent = '图片加载失败，请打开原图重试';
      this.errorMessage.hidden = true;

      this.prevButton = this.createButton('lb-lightbox-nav lb-lightbox-prev', '上一张图片', '‹');
      this.nextButton = this.createButton('lb-lightbox-nav lb-lightbox-next', '下一张图片', '›');
      this.closeButton = this.createButton('lb-lightbox-close', '关闭图片预览', '×');

      this.info = document.createElement('div');
      this.info.className = 'lb-lightbox-info';

      this.counter = document.createElement('span');
      this.counter.className = 'lb-lightbox-counter';

      this.caption = document.createElement('span');
      this.caption.className = 'lb-lightbox-caption';

      this.toolbar = document.createElement('div');
      this.toolbar.className = 'lb-lightbox-toolbar';
      this.toolbar.setAttribute('role', 'toolbar');
      this.toolbar.setAttribute('aria-label', '图片缩放工具');

      this.zoomOutButton = this.createButton('lb-lightbox-zoom-out', '缩小图片', '−');
      this.zoomResetButton = this.createButton('lb-lightbox-zoom-level', '重置缩放', '100%');
      this.zoomInButton = this.createButton('lb-lightbox-zoom-in', '放大图片', '+');

      this.originalLink = document.createElement('a');
      this.originalLink.className = 'lb-lightbox-control lb-lightbox-original';
      this.originalLink.setAttribute('aria-label', '在新窗口打开原图');
      this.originalLink.title = '在新窗口打开原图';
      this.originalLink.target = '_blank';
      this.originalLink.rel = 'noopener noreferrer';
      this.originalLink.textContent = '↗';

      this.liveRegion = document.createElement('span');
      this.liveRegion.className = 'lb-lightbox-live';
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');

      this.container.appendChild(this.image);
      this.container.appendChild(this.loadingIndicator);
      this.container.appendChild(this.errorMessage);

      this.info.appendChild(this.counter);
      this.info.appendChild(this.caption);

      this.toolbar.appendChild(this.zoomOutButton);
      this.toolbar.appendChild(this.zoomResetButton);
      this.toolbar.appendChild(this.zoomInButton);
      this.toolbar.appendChild(this.originalLink);

      this.contentWrapper.appendChild(this.container);
      this.contentWrapper.appendChild(this.prevButton);
      this.contentWrapper.appendChild(this.nextButton);
      this.contentWrapper.appendChild(this.closeButton);
      this.contentWrapper.appendChild(this.info);
      this.contentWrapper.appendChild(this.toolbar);
      this.contentWrapper.appendChild(this.liveRegion);
      this.overlay.appendChild(this.contentWrapper);
      document.body.appendChild(this.overlay);
    }

    bindUIEvents() {
      this.overlay.addEventListener('click', this.bound.overlayClick);
      this.prevButton.addEventListener('click', this.bound.previous);
      this.nextButton.addEventListener('click', this.bound.next);
      this.closeButton.addEventListener('click', this.bound.close);
      this.zoomOutButton.addEventListener('click', this.bound.zoomOut);
      this.zoomInButton.addEventListener('click', this.bound.zoomIn);
      this.zoomResetButton.addEventListener('click', this.bound.resetZoom);
      this.container.addEventListener('wheel', this.bound.wheel, { passive: false });
      this.image.addEventListener('pointerdown', this.bound.pointerDown);
      this.image.addEventListener('pointermove', this.bound.pointerMove);
      this.image.addEventListener('pointerup', this.bound.pointerUp);
      this.image.addEventListener('pointercancel', this.bound.pointerUp);
      this.image.addEventListener('dblclick', this.bound.doubleClick);
      this.image.addEventListener('dragstart', this.bound.dragStart);
      window.addEventListener('resize', this.bound.resize, { passive: true });
    }

    isPreviewableImage(img) {
      if (!img || !img.closest || !img.closest('.markdown-body')) return false;
      if (img.closest('#esa-img-captcha-banner, .lb-lightbox-overlay')) return false;
      if (img.getAttribute('data-esa-img-locked') === '1') return false;

      const src = this.getImageSource(img);
      if (!src || src.startsWith('data:image/gif;base64,R0lGODlhAQABA')) return false;
      return true;
    }

    getImageSource(img) {
      return (img && (img.currentSrc || img.getAttribute('src'))) || '';
    }

    handleImageClick(event) {
      if (this.isOpen || !event.target || !event.target.closest) return;
      const clickedImage = event.target.closest('.markdown-body img');
      if (!this.isPreviewableImage(clickedImage)) return;

      event.preventDefault();
      event.stopPropagation();
      this.openFromImage(clickedImage);
    }

    handleDocumentKeyDown(event) {
      if (this.isOpen) {
        this.handleKeyDown(event);
        return;
      }
      this.handleImageKeyDown(event);
    }

    handleImageKeyDown(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!event.target || !event.target.closest) return;

      const link = event.target.closest('.markdown-body a[href]');
      if (!link || link.textContent.trim()) return;
      const images = link.querySelectorAll('img');
      if (images.length !== 1 || !this.isPreviewableImage(images[0])) return;

      event.preventDefault();
      this.openFromImage(images[0]);
    }

    openFromImage(image) {
      const article = image.closest('.markdown-body');
      if (!article) return;

      this.images = Array.from(article.querySelectorAll('img'))
        .filter((img) => this.isPreviewableImage(img));
      this.currentIndex = this.images.indexOf(image);
      if (this.currentIndex < 0) return;

      this.ensureUI();
      this.open();
    }

    handleOverlayClick(event) {
      if (event.target.closest('.lb-lightbox-control')) return;
      if (
        this.options.closeOnOverlayClick &&
        (event.target === this.overlay || event.target === this.contentWrapper)
      ) {
        this.close();
      }
    }

    handleKeyDown(event) {
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
        case 'Home':
          event.preventDefault();
          this.showImageAt(0);
          break;
        case 'End':
          event.preventDefault();
          this.showImageAt(this.images.length - 1);
          break;
        case '+':
        case '=':
          event.preventDefault();
          this.setZoom(this.zoomLevel + this.options.zoomStep);
          break;
        case '-':
        case '_':
          event.preventDefault();
          this.setZoom(this.zoomLevel - this.options.zoomStep);
          break;
        case '0':
          event.preventDefault();
          this.resetView();
          break;
        case 'Escape':
          event.preventDefault();
          this.close();
          break;
      }
    }

    trapFocus(event) {
      const focusable = [
        this.prevButton,
        this.nextButton,
        this.zoomOutButton,
        this.zoomResetButton,
        this.zoomInButton,
        this.originalLink,
        this.closeButton
      ].filter((element) => element && !element.hidden && !element.disabled);

      if (!focusable.length) return;
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex < 0 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);

      event.preventDefault();
      focusable[nextIndex].focus();
    }

    handleWheel(event) {
      if (!this.isOpen) return;

      const shouldZoom = event.ctrlKey || event.metaKey || this.isZoomed;
      if (shouldZoom) {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        this.setZoom(this.zoomLevel + (direction * this.options.zoomStep));
        return;
      }

      if (!this.options.wheelNavigation || Math.abs(event.deltaY) < 12) return;
      event.preventDefault();
      clearTimeout(this.wheelTimer);
      const direction = Math.sign(event.deltaY);
      this.wheelTimer = setTimeout(() => {
        if (direction > 0) this.showNextImage();
        else this.showPreviousImage();
      }, 70);
    }

    handlePointerDown(event) {
      if (!this.isOpen || !event.isPrimary || (event.button !== undefined && event.button !== 0)) return;

      this.pointerState = {
        id: event.pointerId,
        mode: this.isZoomed ? 'pan' : 'swipe',
        startX: event.clientX,
        startY: event.clientY,
        endX: event.clientX,
        endY: event.clientY,
        originPanX: this.panX,
        originPanY: this.panY
      };

      if (this.isZoomed) {
        event.preventDefault();
        this.overlay.classList.add('is-dragging');
      }

      if (this.image.setPointerCapture) {
        try {
          this.image.setPointerCapture(event.pointerId);
        } catch (e) {
          // 某些浏览器会在指针已释放时抛错，不影响交互。
        }
      }
    }

    handlePointerMove(event) {
      if (!this.pointerState || this.pointerState.id !== event.pointerId) return;

      this.pointerState.endX = event.clientX;
      this.pointerState.endY = event.clientY;
      if (this.pointerState.mode !== 'pan') return;

      event.preventDefault();
      this.panX = this.pointerState.originPanX + (event.clientX - this.pointerState.startX);
      this.panY = this.pointerState.originPanY + (event.clientY - this.pointerState.startY);
      this.constrainPan();
      this.applyTransform();
    }

    handlePointerUp(event) {
      if (!this.pointerState || this.pointerState.id !== event.pointerId) return;

      const state = this.pointerState;
      this.pointerState = null;
      this.overlay.classList.remove('is-dragging');

      if (this.image.releasePointerCapture && this.image.hasPointerCapture && this.image.hasPointerCapture(event.pointerId)) {
        this.image.releasePointerCapture(event.pointerId);
      }

      if (state.mode !== 'swipe') return;
      const deltaX = state.endX - state.startX;
      const deltaY = state.endY - state.startY;
      if (Math.abs(deltaX) < this.options.swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;

      if (deltaX < 0) this.showNextImage();
      else this.showPreviousImage();
    }

    handleDoubleClick(event) {
      event.preventDefault();
      this.setZoom(this.isZoomed ? this.options.minZoom : Math.min(2, this.options.maxZoom));
    }

    handleResize() {
      if (!this.isOpen || !this.isZoomed) return;
      if (this.resizeFrame) window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = window.requestAnimationFrame(() => {
        this.constrainPan();
        this.applyTransform();
      });
    }

    open() {
      if (this.isOpen || !this.uiReady) return;

      this.isOpen = true;
      clearTimeout(this.closeTimer);
      this.previousActiveElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      this.previousBodyOverflow = document.body.style.overflow;
      if (!this.inertStates.length) this.setBackgroundInert(true);

      this.overlay.style.zIndex = '10000';
      this.overlay.setAttribute('aria-hidden', 'false');
      this.overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.showImage();

      const focusCloseButton = () => {
        if (this.isOpen && !this.overlay.contains(document.activeElement)) {
          try {
            this.closeButton.focus({ preventScroll: true });
          } catch (e) {
            this.closeButton.focus();
          }
        }
      };
      focusCloseButton();
      this.focusFrame = window.requestAnimationFrame(focusCloseButton);
      this.focusTimer = setTimeout(focusCloseButton, 80);

      if (typeof this.options.onOpen === 'function') this.options.onOpen();
    }

    close() {
      if (!this.isOpen || !this.uiReady) return;

      this.isOpen = false;
      this.imageRequestId++;
      clearTimeout(this.wheelTimer);
      clearTimeout(this.focusTimer);
      if (this.focusFrame) window.cancelAnimationFrame(this.focusFrame);
      this.pointerState = null;
      this.overlay.classList.remove('active', 'is-dragging');
      this.overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = this.previousBodyOverflow || '';

      this.closeTimer = setTimeout(() => {
        this.resetView();
        this.image.classList.remove('is-ready');
        this.loadingIndicator.hidden = true;
        this.errorMessage.hidden = true;
        this.overlay.style.zIndex = '-1';
        this.setBackgroundInert(false);
        this.imageCache.clear();

        if (this.previousActiveElement && this.previousActiveElement.isConnected) {
          this.previousActiveElement.focus();
        }
      }, this.options.animationDuration);

      if (typeof this.options.onClose === 'function') this.options.onClose();
    }

    showPreviousImage() {
      this.showImageAt(this.currentIndex - 1);
    }

    showNextImage() {
      this.showImageAt(this.currentIndex + 1);
    }

    showImageAt(index) {
      if (!this.isOpen || index < 0 || index >= this.images.length || index === this.currentIndex) return;
      this.currentIndex = index;
      this.showImage();
    }

    showImage() {
      const sourceImage = this.images[this.currentIndex];
      const imgSrc = this.getImageSource(sourceImage);
      if (!sourceImage || !imgSrc) return;

      const requestId = ++this.imageRequestId;
      const caption = (sourceImage.getAttribute('alt') || sourceImage.getAttribute('title') || '').trim();
      const positionText = `第 ${this.currentIndex + 1} 张，共 ${this.images.length} 张`;

      this.resetView();
      this.image.classList.remove('is-ready');
      this.image.alt = caption || '图片预览';
      this.container.setAttribute('aria-busy', 'true');
      this.loadingIndicator.hidden = false;
      this.errorMessage.hidden = true;
      this.counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
      this.caption.textContent = caption;
      this.caption.hidden = !caption;
      this.originalLink.href = imgSrc;
      this.overlay.setAttribute('aria-label', `图片预览，${positionText}`);
      this.liveRegion.textContent = positionText + (caption ? `，${caption}` : '');

      this.prevButton.hidden = this.currentIndex <= 0;
      this.nextButton.hidden = this.currentIndex >= this.images.length - 1;

      if (typeof this.options.onNavigate === 'function') {
        this.options.onNavigate(this.currentIndex);
      }

      this.requestImage(imgSrc)
        .then(() => {
          if (!this.isOpen || requestId !== this.imageRequestId) return;
          this.image.src = imgSrc;
          const decode = typeof this.image.decode === 'function'
            ? this.image.decode().catch(() => undefined)
            : Promise.resolve();

          return decode.then(() => {
            if (!this.isOpen || requestId !== this.imageRequestId) return;
            this.loadingIndicator.hidden = true;
            this.container.setAttribute('aria-busy', 'false');
            this.image.classList.add('is-ready');
          });
        })
        .catch(() => {
          if (!this.isOpen || requestId !== this.imageRequestId) return;
          this.loadingIndicator.hidden = true;
          this.container.setAttribute('aria-busy', 'false');
          this.errorMessage.hidden = false;
          this.liveRegion.textContent = `${positionText}，图片加载失败`;
        });

      this.preloadImages();
    }

    requestImage(src) {
      const cached = this.imageCache.get(src);
      if (cached) return cached.promise;

      const image = new Image();
      image.decoding = 'async';
      const promise = new Promise((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = () => {
          this.imageCache.delete(src);
          reject(new Error('image-load-failed'));
        };
        image.src = src;
      });

      this.imageCache.set(src, { image, promise });
      return promise;
    }

    preloadImages() {
      const adjacent = [this.currentIndex - 1, this.currentIndex + 1]
        .filter((index) => index >= 0 && index < this.images.length);
      const keepSources = new Set();
      const currentSource = this.getImageSource(this.images[this.currentIndex]);
      if (currentSource) keepSources.add(currentSource);

      adjacent.forEach((index) => {
        const src = this.getImageSource(this.images[index]);
        if (!src) return;
        keepSources.add(src);
        this.requestImage(src).catch(() => undefined);
      });

      this.imageCache.forEach((entry, src) => {
        if (!keepSources.has(src)) this.imageCache.delete(src);
      });
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

    setZoom(value) {
      if (!this.uiReady) return;
      const clamped = Math.max(this.options.minZoom, Math.min(value, this.options.maxZoom));
      this.zoomLevel = Math.round(clamped * 100) / 100;
      this.isZoomed = this.zoomLevel > this.options.minZoom;

      if (!this.isZoomed) {
        this.panX = 0;
        this.panY = 0;
      } else {
        this.constrainPan();
      }

      this.overlay.classList.toggle('is-zoomed', this.isZoomed);
      this.zoomOutButton.disabled = this.zoomLevel <= this.options.minZoom;
      this.zoomInButton.disabled = this.zoomLevel >= this.options.maxZoom;
      this.zoomResetButton.textContent = `${Math.round(this.zoomLevel * 100)}%`;
      this.zoomResetButton.setAttribute(
        'aria-label',
        `重置缩放，当前 ${Math.round(this.zoomLevel * 100)}%`
      );
      this.applyTransform();
    }

    resetView() {
      this.panX = 0;
      this.panY = 0;
      this.zoomLevel = this.options.minZoom;
      this.isZoomed = false;
      if (!this.uiReady) return;

      this.overlay.classList.remove('is-zoomed', 'is-dragging');
      this.zoomOutButton.disabled = true;
      this.zoomInButton.disabled = this.options.minZoom >= this.options.maxZoom;
      this.zoomResetButton.textContent = `${Math.round(this.options.minZoom * 100)}%`;
      this.zoomResetButton.setAttribute(
        'aria-label',
        `重置缩放，当前 ${Math.round(this.options.minZoom * 100)}%`
      );
      this.applyTransform();
    }

    constrainPan() {
      if (!this.uiReady || !this.isZoomed) {
        this.panX = 0;
        this.panY = 0;
        return;
      }

      const maxX = Math.max(0, ((this.image.clientWidth * this.zoomLevel) - this.container.clientWidth) / 2);
      const maxY = Math.max(0, ((this.image.clientHeight * this.zoomLevel) - this.container.clientHeight) / 2);
      this.panX = Math.max(-maxX, Math.min(this.panX, maxX));
      this.panY = Math.max(-maxY, Math.min(this.panY, maxY));
    }

    applyTransform() {
      if (!this.image) return;
      this.image.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.zoomLevel})`;
    }

    destroy() {
      document.removeEventListener('click', this.bound.documentClick, true);
      document.removeEventListener('keydown', this.bound.documentKeyDown, true);
      clearTimeout(this.wheelTimer);
      clearTimeout(this.closeTimer);
      clearTimeout(this.focusTimer);
      if (this.resizeFrame) window.cancelAnimationFrame(this.resizeFrame);
      if (this.focusFrame) window.cancelAnimationFrame(this.focusFrame);

      if (this.uiReady) {
        window.removeEventListener('resize', this.bound.resize);
        this.setBackgroundInert(false);
        document.body.style.overflow = this.previousBodyOverflow || '';
        this.overlay.remove();
        if (this.styleElement && this.styleElement.isConnected) this.styleElement.remove();
      }

      this.imageCache.clear();
      this.uiReady = false;
      this.isOpen = false;
    }
  }

  window.Lightbox = Lightbox;

  const initLightbox = () => {
    if (!document.querySelector('.markdown-body')) return;
    if (window.__siteLightboxReady) return;
    window.__siteLightboxReady = true;
    window.__siteLightboxInstance = new Lightbox();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox, { once: true });
  } else {
    initLightbox();
  }
})();
