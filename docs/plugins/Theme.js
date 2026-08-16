(function defineSiteRuntimeConfig() {
    const assetVersion = '20260816-2';
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
        }
    };
    const current = window.SiteRuntimeConfig || {};

    window.SiteRuntimeConfig = Object.assign({}, defaults, current, {
        background: Object.assign({}, defaults.background, current.background || {})
    });
})();

(function earlySiteBoot() {
    if (window.__siteEarlyBootReady) return;
    window.__siteEarlyBootReady = true;

    const config = window.SiteRuntimeConfig;
    const mobileBreakpoint = config.mobileBreakpoint;
    const bgImageDesktop = config.background.desktopImage;
    const bgImageMobile = window.innerWidth <= config.background.mobileImageSmallMaxWidth
        ? config.background.mobileImageSmall
        : config.background.mobileImageLarge;

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
            #bgOverlay {
                position: fixed;
                inset: 0;
                z-index: 1;
                pointer-events: none;
                background:
                    radial-gradient(1100px 650px at 18% 8%, rgba(255, 255, 255, 0.16), transparent 60%),
                    radial-gradient(900px 600px at 82% 0%, rgba(99, 102, 241, 0.12), transparent 55%),
                    linear-gradient(180deg, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.18));
            }
            #glassShell {
                position: relative;
                z-index: 2;
                box-sizing: border-box;
                width: 100%;
                max-width: 900px;
                margin: 0 auto;
                padding: 44px;
                overflow: hidden;
                background: rgba(255, 255, 255, 0.14);
                border: 1px solid rgba(255, 255, 255, 0.26);
                border-radius: 18px;
                box-shadow:
                    0 28px 90px rgba(0, 0, 0, 0.36),
                    inset 0 1px 0 rgba(255, 255, 255, 0.18);
                backdrop-filter: blur(20px) saturate(1.35);
                -webkit-backdrop-filter: blur(20px) saturate(1.35);
            }
            @media (max-width: ${mobileBreakpoint}px), (hover: none) and (pointer: coarse) {
                body {
                    padding-left: calc(clamp(10px, 3.2vw, 14px) + env(safe-area-inset-left));
                    padding-right: calc(clamp(10px, 3.2vw, 14px) + env(safe-area-inset-right));
                    padding-top: calc(clamp(10px, 2.2vh, 14px) + env(safe-area-inset-top));
                    padding-bottom: calc(clamp(10px, 2.2vh, 14px) + env(safe-area-inset-bottom));
                }
                #glassShell {
                    padding: clamp(14px, 3.8vw, 18px);
                    border-radius: 16px;
                }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    appendEarlyStyle();
})();

(function loadThemeRuntime() {
    if (document.getElementById('site-theme-runtime')) return;

    const currentScript = document.currentScript;
    const themeSrc = currentScript && currentScript.src
        ? currentScript.src
        : '/plugins/Theme.js';
    const runtime = document.createElement('script');
    runtime.id = 'site-theme-runtime';
    // themeSrc 可能是 "/plugins/Theme.js" 这类纯路径，必须带 base 解析
    const themeUrl = new URL(themeSrc, window.location.href);
    const runtimeName = /\.min\.js$/i.test(themeUrl.pathname)
        ? 'ThemeRuntime.min.js'
        : 'ThemeRuntime.js';
    const runtimeUrl = new URL(runtimeName, themeUrl.href);
    runtimeUrl.searchParams.set('v', window.SiteRuntimeConfig.assetVersion);
    runtime.src = runtimeUrl.href;
    runtime.async = false;
    runtime.addEventListener('load', function () {
        document.documentElement.setAttribute('data-theme-runtime', 'loaded');
    }, { once: true });
    runtime.addEventListener('error', function () {
        document.documentElement.setAttribute('data-theme-runtime', 'error');
        console.error('[Theme] ThemeRuntime.js 加载失败。');
    }, { once: true });
    (document.head || document.documentElement).appendChild(runtime);
})();
