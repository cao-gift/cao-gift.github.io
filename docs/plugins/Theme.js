(function defineSiteRuntimeConfig() {
    const assetVersion = '20260717-3';
    const defaults = {
        assetVersion,
        mobileBreakpoint: 720,
        background: {
            desktopMode: 'image',
            mobileMode: 'image',
            desktopImage: '/img/电脑2.jpg',
            mobileImage: '/img/手机1-1080.webp',
            mobileImageSmall: '/img/手机1-720.webp',
            mobileImageLarge: '/img/手机1-1080.webp',
            mobileImageSmallMaxWidth: 480,
            desktopVideo: '/img/电脑1.mp4',
            mobileVideo: '/img/手机2.mp4'
        },
        esa: {
            prefix: 'esa-pgrds6as5i',
            sceneId: '1nux88n8',
            region: 'cn',
            reuseMs: 80000,
            minDelayMs: 1000
        }
    };
    const current = window.SiteRuntimeConfig || {};

    window.SiteRuntimeConfig = Object.assign({}, defaults, current, {
        background: Object.assign({}, defaults.background, current.background || {}),
        esa: Object.assign({}, defaults.esa, current.esa || {})
    });
})();

(function earlySiteBoot() {
    if (window.__siteEarlyBootReady) return;
    window.__siteEarlyBootReady = true;

    const config = window.SiteRuntimeConfig;
    const path = window.location.pathname;
    const mobileBreakpoint = config.mobileBreakpoint;
    const bgImageDesktop = config.background.desktopImage;
    const bgImageMobile = window.innerWidth <= config.background.mobileImageSmallMaxWidth
        ? config.background.mobileImageSmall
        : config.background.mobileImageLarge;
    const tinyPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    function appendEarlyStyle() {
        if (document.getElementById('site-early-theme-style')) return;
        const style = document.createElement('style');
        style.id = 'site-early-theme-style';
        style.textContent = `
            html {
                min-height: 100%;
                overflow-x: hidden;
                background: url("${bgImageDesktop}") no-repeat center center fixed;
                background-size: cover;
            }
            @media (max-width: ${mobileBreakpoint}px), (hover: none) and (pointer: coarse) {
                html {
                    background-image: url("${bgImageMobile}");
                    background-attachment: scroll;
                }
            }
            body {
                box-sizing: border-box;
                min-height: 100vh;
                margin: 0;
                padding: 28px 16px;
                width: 100%;
                max-width: none;
                background: transparent;
                overflow-x: hidden;
            }
            html[data-site-early-img-lock="1"] .markdown-body img {
                visibility: hidden !important;
            }
            html[data-site-early-img-lock="1"] .esa-img-captcha-banner img {
                visibility: visible !important;
            }
            @media (max-width: ${mobileBreakpoint}px), (hover: none) and (pointer: coarse) {
                body {
                    padding-left: calc(clamp(10px, 3.2vw, 14px) + env(safe-area-inset-left));
                    padding-right: calc(clamp(10px, 3.2vw, 14px) + env(safe-area-inset-right));
                    padding-top: calc(clamp(10px, 2.2vh, 14px) + env(safe-area-inset-top));
                    padding-bottom: calc(clamp(10px, 2.2vh, 14px) + env(safe-area-inset-bottom));
                }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function hasRecentImageVerifyReuse() {
        try {
            const esa = config.esa;
            const raw = sessionStorage.getItem(`esa_img_verified:${esa.sceneId}:${path}`);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return !!(parsed && parsed.param && parsed.at && Date.now() - parsed.at <= esa.reuseMs);
        } catch (e) {
            return false;
        }
    }

    function lockImageEarly(img) {
        if (!img || img.nodeType !== 1 || img.tagName !== 'IMG') return;
        if (!img.closest || !img.closest('.markdown-body')) return;
        if (img.closest('#esa-img-captcha-banner')) return;

        const canonicalSrc = img.getAttribute('data-canonical-src');
        const currentSrc = img.getAttribute('src') || '';
        const src = canonicalSrc || currentSrc;
        const srcset = img.getAttribute('srcset') || '';
        const alreadyLocked = img.getAttribute('data-esa-img-locked') === '1';
        if (!src || (alreadyLocked && currentSrc === tinyPixel && !srcset)) return;

        const parentLink = img.closest('a[href]');
        if (parentLink && canonicalSrc) parentLink.href = canonicalSrc;
        if (src !== tinyPixel) img.setAttribute('data-esa-orig-src', src);
        if (srcset && !img.getAttribute('data-esa-orig-srcset')) img.setAttribute('data-esa-orig-srcset', srcset);
        img.setAttribute('src', tinyPixel);
        img.removeAttribute('srcset');
        img.setAttribute('data-esa-img-locked', '1');
        try {
            const isPriority = document.querySelector('.markdown-body img') === img;
            img.loading = isPriority ? 'eager' : 'lazy';
            img.decoding = 'async';
            img.fetchPriority = isPriority ? 'high' : 'low';
        } catch (e) {}
    }

    function startEarlyArticleImageLock() {
        if (!path.includes('/post/') || hasRecentImageVerifyReuse() || !('MutationObserver' in window)) return;
        document.documentElement.setAttribute('data-site-early-img-lock', '1');

        const scanNode = function (node) {
            if (!node || node.nodeType !== 1) return;
            if (node.tagName === 'IMG') lockImageEarly(node);
            if (node.querySelectorAll) node.querySelectorAll('.markdown-body img').forEach(lockImageEarly);
        };

        const observer = new MutationObserver(function (mutations) {
            if (document.documentElement.getAttribute('data-site-early-img-lock') !== '1') return;
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(scanNode);
                } else if (mutation.type === 'attributes') {
                    lockImageEarly(mutation.target);
                }
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'srcset', 'data-canonical-src']
        });

        const stop = function () {
            setTimeout(function () {
                try { observer.disconnect(); } catch (e) {}
            }, 8000);
        };
        if (document.readyState === 'complete') {
            stop();
        } else {
            window.addEventListener('load', stop, { once: true });
        }
    }

    appendEarlyStyle();
    startEarlyArticleImageLock();
})();

(function loadThemeRuntime() {
    if (document.getElementById('site-theme-runtime')) return;

    const currentScript = document.currentScript;
    const themeSrc = currentScript && currentScript.src
        ? currentScript.src
        : '/plugins/Theme.js';
    const runtime = document.createElement('script');
    runtime.id = 'site-theme-runtime';
    const runtimeUrl = new URL('ThemeRuntime.js', themeSrc);
    runtimeUrl.searchParams.set('v', window.SiteRuntimeConfig.assetVersion);
    runtime.src = runtimeUrl.href;
    runtime.async = true;
    runtime.addEventListener('load', function () {
        document.documentElement.setAttribute('data-theme-runtime', 'loaded');
    }, { once: true });
    runtime.addEventListener('error', function () {
        document.documentElement.setAttribute('data-theme-runtime', 'error');
        console.error('[Theme] ThemeRuntime.js 加载失败。');
    }, { once: true });
    (document.head || document.documentElement).appendChild(runtime);
})();
