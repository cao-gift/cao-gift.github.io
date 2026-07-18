(function themeRuntimeBoot() {
function applyThemeRuntime() {
    let currentUrl = window.location.pathname;
    //let currentHost = window.location.hostname;

    // 背景配置：支持图片/视频/自动（桌面端/手机端可单独配置）
    // - video: 优先视频（图片作为加载/失败兜底）
    // - image: 仅图片背景
    // - auto : 若“省流量/减少动态效果”则用图片，否则用视频
    const siteConfig = window.SiteRuntimeConfig || {};
    const backgroundConfig = siteConfig.background || {};
    const MOBILE_BREAKPOINT_PX = siteConfig.mobileBreakpoint || 720;
    const THEME_BG_MODE_DESKTOP = backgroundConfig.desktopMode || 'image'; // 'video' | 'image' | 'auto'
    const THEME_BG_MODE_MOBILE = backgroundConfig.mobileMode || 'image';  // 'video' | 'image' | 'auto'

    // 资源路径（相对 docs/）
    const THEME_BG_IMAGE_DESKTOP = backgroundConfig.desktopImage || '/img/电脑2.jpg';
    const THEME_BG_VIDEO_DESKTOP = backgroundConfig.desktopVideo || '/img/电脑1.mp4';
    const THEME_BG_IMAGE_MOBILE_SMALL = backgroundConfig.mobileImageSmall || '/img/手机1-720.webp';
    const THEME_BG_IMAGE_MOBILE_LARGE = backgroundConfig.mobileImageLarge || backgroundConfig.mobileImage || '/img/手机1-1080.webp';
    const THEME_BG_IMAGE_MOBILE_SMALL_MAX_WIDTH = backgroundConfig.mobileImageSmallMaxWidth || 480;
    const THEME_BG_IMAGE_MOBILE = window.innerWidth <= THEME_BG_IMAGE_MOBILE_SMALL_MAX_WIDTH
        ? THEME_BG_IMAGE_MOBILE_SMALL
        : THEME_BG_IMAGE_MOBILE_LARGE;
    const THEME_BG_VIDEO_MOBILE = backgroundConfig.mobileVideo || '/img/手机2.mp4';

    // 更稳：优先使用当前脚本标签，兼容部署在子路径下的站点
    const themeScriptSrc = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src
        : (function () {
            try {
                const s = document.querySelector('script[src*="/plugins/Theme.js"],script[src*="Theme.js"],script[src*="RonanTheme.js"]');
                return s ? s.src : '';
            } catch (e) {
                return '';
            }
        })();
    const siteRoot = themeScriptSrc ? new URL('..', themeScriptSrc).href : window.location.href;

    function absUrl(relPath) {
        return new URL(relPath, siteRoot).href;
    }

    function loadScriptOnce(id, src) {
        try {
            if (document.getElementById(id)) return;
            const s = document.createElement('script');
            s.id = id;
            s.src = src;
            s.async = true;
            document.head.appendChild(s);
        } catch (e) {}
    }

    function prefersReducedMotion() {
        try {
            return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) {
            return false;
        }
    }

    function runWhenIdle(tasks) {
        const run = function () {
            tasks.forEach(function (task) {
                try { task(); } catch (e) {}
            });
        };
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(run, { timeout: 1200 });
        } else {
            window.setTimeout(run, 0);
        }
    }

    function markCurrentPageClass() {
        const root = document.documentElement;
        root.classList.toggle('site-page-home', currentUrl == '/' || currentUrl.includes('/index.html') || currentUrl.includes('/page'));
        root.classList.toggle('site-page-article', currentUrl.includes('/post/'));
        root.classList.toggle('site-page-single', currentUrl.includes('/link.html') || currentUrl.includes('/about.html'));
        root.classList.toggle('site-page-tag', currentUrl.includes('/tag'));
    }

    function normalizeHomeButton() {
        const homeButton = document.getElementById('buttonHome');
        if (!homeButton) return;
        const sameOriginHome = new URL('/', window.location.origin).href;
        homeButton.href = sameOriginHome;
        homeButton.addEventListener('click', function (event) {
            event.preventDefault();
            window.location.href = sameOriginHome;
        });
    }

    function normalizeHeaderLocalNavLinks() {
        const localHosts = ['blog.freeblock.cn', 'www.blog.freeblock.cn', 'cao-gift.github.io'];
        document.querySelectorAll('#header .title-right a[href]').forEach(function (link) {
            try {
                const originalUrl = new URL(link.getAttribute('href'), window.location.href);
                if (!localHosts.includes(originalUrl.hostname)) return;

                const sameOriginUrl = new URL(originalUrl.pathname + originalUrl.search + originalUrl.hash, window.location.origin).href;
                link.href = sameOriginUrl;
                link.removeAttribute('target');
                link.removeAttribute('rel');

                if (link.dataset.sameOriginNavReady === '1') return;
                link.dataset.sameOriginNavReady = '1';
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    window.location.href = sameOriginUrl;
                });
            } catch (e) {}
        });
    }

    const bgImageDesktopUrl = absUrl(THEME_BG_IMAGE_DESKTOP);
    const bgVideoDesktopUrl = absUrl(THEME_BG_VIDEO_DESKTOP);
    const bgImageMobileUrl = absUrl(THEME_BG_IMAGE_MOBILE);
    const bgVideoMobileUrl = absUrl(THEME_BG_VIDEO_MOBILE);
    const sponsorLogoUrl = absUrl('../img/logo.png');

    function addHeadLinkOnce(id, attrs) {
        try {
            if (document.getElementById(id)) return;
            const link = document.createElement('link');
            link.id = id;
            Object.keys(attrs).forEach(function (key) {
                if (key in link) {
                    link[key] = attrs[key];
                } else {
                    link.setAttribute(key, attrs[key]);
                }
            });
            document.head.appendChild(link);
        } catch (e) {}
    }

    function ensureHeadPerformanceHints() {
        const bgImageUrl = isMobileViewport() ? bgImageMobileUrl : bgImageDesktopUrl;

        addHeadLinkOnce('site-bg-preload', {
            rel: 'preload',
            as: 'image',
            href: bgImageUrl,
            fetchPriority: 'high'
        });
        addHeadLinkOnce('site-avatar-preload', {
            rel: 'preload',
            as: 'image',
            href: absUrl('../img/avatar.webp'),
            fetchPriority: 'high'
        });
        addHeadLinkOnce('site-reading-font-preload', {
            rel: 'preload',
            as: 'font',
            href: absUrl('../fonts/lxgwwenkaiscreen-subset-118.woff2'),
            type: 'font/woff2',
            crossOrigin: 'anonymous'
        });
        addHeadLinkOnce('site-upyun-dns-prefetch', {
            rel: 'dns-prefetch',
            href: 'https://www.upyun.com'
        });
    }

    function ensureSiteTypography() {
        const fontStylesheet = absUrl(`../fonts/lxgw-wenkai-screen-subset.css?v=${siteConfig.assetVersion || '20260717-1'}`);

        if (!document.getElementById('site-font-lxgw-wenkai')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'site-font-lxgw-wenkai';
            fontLink.rel = 'stylesheet';
            fontLink.href = fontStylesheet;
            document.head.appendChild(fontLink);
        }

        if (document.getElementById('site-typography-style')) return;

        const style = document.createElement('style');
        style.id = 'site-typography-style';
        style.innerHTML = `
        :root {
            --site-font-ui: "HarmonyOS Sans SC", "MiSans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --site-font-reading: "LXGW WenKai Screen", "LXGW WenKai", "霞鹜文楷屏幕阅读版", "霞鹜文楷", "HarmonyOS Sans SC", "MiSans", "PingFang SC", "Microsoft YaHei", sans-serif;
            --site-font-display: "HarmonyOS Sans SC", "MiSans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif;
            --site-font-mono: "JetBrains Mono", "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        html,
        body,
        button,
        input,
        select,
        textarea,
        #glassShell,
        #header,
        #footer,
        .SideNav,
        .subnav-search-input,
        .sponsor-info,
        .esa-img-captcha-card,
        .article-toc,
        #articleTOC {
            font-family: var(--site-font-ui) !important;
            letter-spacing: 0;
        }

        .blogTitle,
        #header .title-left a.blogTitle,
        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4,
        .markdown-body h5,
        .markdown-body h6 {
            font-family: var(--site-font-display) !important;
            font-weight: 750;
            letter-spacing: 0 !important;
        }

        .markdown-body {
            font-family: var(--site-font-reading) !important;
            font-size: 17px;
            line-height: 1.78;
            letter-spacing: 0;
            word-break: break-word;
            overflow-wrap: break-word;
        }

        .markdown-body p,
        .markdown-body li,
        .markdown-body blockquote,
        .markdown-body table {
            line-height: 1.82;
        }

        .markdown-body strong,
        .markdown-body b,
        .markdown-body th {
            font-weight: 700;
        }

        .markdown-body code,
        .markdown-body tt,
        .markdown-body pre,
        .markdown-body kbd,
        .markdown-body samp {
            font-family: var(--site-font-mono) !important;
            font-size: 0.94em;
            letter-spacing: 0;
        }

        .SideNav-item {
            font-size: 15.5px;
            line-height: 1.55;
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            .markdown-body {
                font-size: 16px;
                line-height: 1.76;
            }

            .markdown-body p,
            .markdown-body li,
            .markdown-body blockquote,
            .markdown-body table {
                line-height: 1.78;
            }
        }
        `;
        document.head.appendChild(style);
    }

    function ensureSponsorFooterStyle() {
        if (document.getElementById('sponsor-footer-style')) return;

        const style = document.createElement('style');
        style.id = 'sponsor-footer-style';
        style.innerHTML = `
        .sponsor-info {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 20px;
            font-size: 13px;
            line-height: 1.6;
            color: #666;
            text-align: center;
        }

        .sponsor-info a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
        }

        .sponsor-info .sponsor-logo {
            display: block;
            width: 48px;
            height: auto;
            max-height: 24px;
            object-fit: contain;
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            .sponsor-info .sponsor-logo {
                width: 42px;
                max-height: 21px;
            }
        }
        `;
        document.head.appendChild(style);
    }

    function insertSponsorInfo() {
        let footer = document.getElementById('footer');
        if (!footer || footer.querySelector('.sponsor-info')) return;

        ensureSponsorFooterStyle();

        let sponsorInfo = document.createElement('div');
        sponsorInfo.className = 'sponsor-info';
        sponsorInfo.innerHTML = `本站由 <a target="_blank" rel="noopener" href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral"><img class="sponsor-logo" src="${sponsorLogoUrl}" alt="又拍云"></a> 提供 CDN 加速/云存储服务`;
        footer.insertBefore(sponsorInfo, footer.firstChild);
    }

    function ensureGlobalPolishStyle() {
        if (document.getElementById('site-polish-style')) return;

        const style = document.createElement('style');
        style.id = 'site-polish-style';
        style.innerHTML = `
        :root {
            --site-space-1: 4px;
            --site-space-2: 8px;
            --site-space-3: 12px;
            --site-space-4: 16px;
            --site-space-5: 20px;
            --site-space-6: 24px;
            --site-space-8: 32px;
            --site-space-11: 44px;
            --site-radius-sm: 8px;
            --site-radius-md: 12px;
            --site-radius-lg: 18px;
            --site-radius-pill: 999px;
            --site-control-size: 44px;
            --site-reading-measure: 72ch;
            --site-shadow-sm: 0 8px 18px rgba(15, 23, 42, 0.10);
            --site-shadow-md: 0 18px 48px rgba(15, 23, 42, 0.14);
            --site-shadow-lg: 0 30px 90px rgba(16, 24, 40, 0.34);
            --site-ink: rgba(18, 25, 38, 0.92);
            --site-muted: rgba(61, 72, 88, 0.74);
            --site-line: rgba(255, 255, 255, 0.34);
            --site-panel: rgba(255, 255, 255, 0.18);
            --site-panel-strong: rgba(255, 255, 255, 0.28);
            --site-accent: #256f82;
            --site-accent-2: #b86f52;
            --site-accent-3: #6f8f65;
            --site-link: #0969da;
            --site-link-hover: #0757b8;
            --site-control-ink: rgba(44, 69, 86, 0.90);
            --site-control-bg: rgba(255, 255, 255, 0.14);
            --site-control-bg-hover: rgba(255, 255, 255, 0.30);
            --site-input-bg: rgba(255, 255, 255, 0.28);
            --site-glass-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.10) 42%, rgba(70, 62, 74, 0.16)), rgba(255, 255, 255, 0.13);
            --site-list-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.08)), rgba(255, 255, 255, 0.10);
            --site-item-hover-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.38), rgba(230, 244, 236, 0.22), rgba(255, 225, 183, 0.20));
            --site-blockquote-bg: rgba(255, 255, 255, 0.20);
            --site-table-bg: rgba(255, 255, 255, 0.14);
            --site-code-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(243, 247, 248, 0.92));
            --site-code-inline-bg: rgba(211, 232, 236, 0.76);
            --site-code-ink: #0f4e64;
            color-scheme: light;
        }

        html[data-color-mode="dark"] {
            --site-ink: rgba(241, 245, 249, 0.94);
            --site-muted: rgba(203, 213, 225, 0.78);
            --site-line: rgba(226, 232, 240, 0.18);
            --site-panel: rgba(15, 23, 42, 0.46);
            --site-panel-strong: rgba(15, 23, 42, 0.64);
            --site-accent: #7dd3fc;
            --site-accent-2: #fdba74;
            --site-accent-3: #a7d78b;
            --site-link: #8bd5ff;
            --site-link-hover: #c4efff;
            --site-control-ink: rgba(226, 232, 240, 0.94);
            --site-control-bg: rgba(15, 23, 42, 0.44);
            --site-control-bg-hover: rgba(30, 41, 59, 0.68);
            --site-input-bg: rgba(15, 23, 42, 0.56);
            --site-glass-bg: linear-gradient(145deg, rgba(30, 41, 59, 0.72), rgba(15, 23, 42, 0.50) 46%, rgba(7, 16, 31, 0.66)), rgba(15, 23, 42, 0.58);
            --site-list-bg: linear-gradient(145deg, rgba(30, 41, 59, 0.64), rgba(15, 23, 42, 0.42)), rgba(15, 23, 42, 0.44);
            --site-item-hover-bg: linear-gradient(135deg, rgba(51, 65, 85, 0.82), rgba(22, 78, 99, 0.34), rgba(120, 53, 15, 0.22));
            --site-blockquote-bg: rgba(15, 23, 42, 0.46);
            --site-table-bg: rgba(15, 23, 42, 0.42);
            --site-code-bg: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.94));
            --site-code-inline-bg: rgba(30, 58, 68, 0.88);
            --site-code-ink: #bae6fd;
            --site-shadow-sm: 0 8px 18px rgba(0, 0, 0, 0.26);
            --site-shadow-md: 0 18px 48px rgba(0, 0, 0, 0.32);
            --site-shadow-lg: 0 30px 90px rgba(0, 0, 0, 0.48);
            color-scheme: dark;
        }

        @media (prefers-color-scheme: dark) {
            html[data-color-mode="auto"] {
                --site-ink: rgba(241, 245, 249, 0.94);
                --site-muted: rgba(203, 213, 225, 0.78);
                --site-line: rgba(226, 232, 240, 0.18);
                --site-panel: rgba(15, 23, 42, 0.46);
                --site-panel-strong: rgba(15, 23, 42, 0.64);
                --site-accent: #7dd3fc;
                --site-accent-2: #fdba74;
                --site-accent-3: #a7d78b;
                --site-link: #8bd5ff;
                --site-link-hover: #c4efff;
                --site-control-ink: rgba(226, 232, 240, 0.94);
                --site-control-bg: rgba(15, 23, 42, 0.44);
                --site-control-bg-hover: rgba(30, 41, 59, 0.68);
                --site-input-bg: rgba(15, 23, 42, 0.56);
                --site-glass-bg: linear-gradient(145deg, rgba(30, 41, 59, 0.72), rgba(15, 23, 42, 0.50) 46%, rgba(7, 16, 31, 0.66)), rgba(15, 23, 42, 0.58);
                --site-list-bg: linear-gradient(145deg, rgba(30, 41, 59, 0.64), rgba(15, 23, 42, 0.42)), rgba(15, 23, 42, 0.44);
                --site-item-hover-bg: linear-gradient(135deg, rgba(51, 65, 85, 0.82), rgba(22, 78, 99, 0.34), rgba(120, 53, 15, 0.22));
                --site-blockquote-bg: rgba(15, 23, 42, 0.46);
                --site-table-bg: rgba(15, 23, 42, 0.42);
                --site-code-bg: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.94));
                --site-code-inline-bg: rgba(30, 58, 68, 0.88);
                --site-code-ink: #bae6fd;
                --site-shadow-sm: 0 8px 18px rgba(0, 0, 0, 0.26);
                --site-shadow-md: 0 18px 48px rgba(0, 0, 0, 0.32);
                --site-shadow-lg: 0 30px 90px rgba(0, 0, 0, 0.48);
                color-scheme: dark;
            }
        }

        html[data-color-mode="dark"] #bgOverlay {
            background:
                radial-gradient(1100px 650px at 18% 8%, rgba(125, 211, 252, 0.10), transparent 60%),
                radial-gradient(900px 600px at 82% 0%, rgba(129, 140, 248, 0.10), transparent 55%),
                linear-gradient(180deg, rgba(2, 6, 23, 0.68), rgba(2, 6, 23, 0.42));
        }

        @media (prefers-color-scheme: dark) {
            html[data-color-mode="auto"] #bgOverlay {
                background:
                    radial-gradient(1100px 650px at 18% 8%, rgba(125, 211, 252, 0.10), transparent 60%),
                    radial-gradient(900px 600px at 82% 0%, rgba(129, 140, 248, 0.10), transparent 55%),
                    linear-gradient(180deg, rgba(2, 6, 23, 0.68), rgba(2, 6, 23, 0.42));
            }
        }

        html {
            scroll-behavior: smooth;
            overflow-x: hidden;
        }

        body {
            color: var(--site-ink);
            overflow-x: hidden;
        }

        ::selection {
            color: #102033;
            background: rgba(255, 216, 128, 0.58);
        }

        #glassShell {
            box-sizing: border-box;
            overflow: hidden;
            background: var(--site-glass-bg) !important;
            border-color: var(--site-line) !important;
            border-radius: var(--site-radius-lg) !important;
            box-shadow:
                var(--site-shadow-lg),
                0 1px 0 rgba(255, 255, 255, 0.32) inset,
                0 -1px 0 rgba(30, 41, 59, 0.10) inset !important;
        }

        #glassShell::before {
            content: "";
            position: absolute;
            inset: 0 0 auto;
            height: 90px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0));
            pointer-events: none;
            z-index: -1;
        }

        #header {
            border-bottom-color: var(--site-line) !important;
        }

        #header .title-right a.btn,
        #header .title-right button,
        #header a.btn.circle {
            width: var(--site-control-size);
            height: var(--site-control-size);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            border-radius: var(--site-radius-pill) !important;
            color: var(--site-control-ink) !important;
            background: var(--site-control-bg) !important;
            border: 1px solid var(--site-line) !important;
            box-shadow: var(--site-shadow-sm);
            transition: transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
            -webkit-tap-highlight-color: transparent;
        }

        #header .title-right a.btn:hover,
        #header .title-right button:hover,
        #header a.btn.circle:hover {
            color: var(--site-accent) !important;
            background: var(--site-control-bg-hover) !important;
            box-shadow: var(--site-shadow-md);
            transform: translateY(-2px);
        }

        #content > div:first-child:not(.markdown-body) {
            color: var(--site-ink);
            font-size: 17px;
            line-height: 1.65;
            text-shadow: 0 1px 0 rgba(255, 255, 255, 0.46);
        }

        .SideNav {
            box-sizing: border-box;
            width: 100%;
            overflow: hidden;
            border-radius: var(--site-radius-lg) !important;
            background: var(--site-list-bg) !important;
            border-color: var(--site-line) !important;
            box-shadow:
                var(--site-shadow-md),
                inset 0 1px 0 rgba(255, 255, 255, 0.30);
        }

        .SideNav-item {
            box-sizing: border-box;
            min-height: 64px;
            padding: 14px 18px !important;
            gap: var(--site-space-3);
            color: var(--site-ink) !important;
            background: transparent !important;
            border-bottom: 1px solid var(--site-line) !important;
            transition: transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
        }

        .SideNav-item:last-child {
            border-bottom: 0 !important;
        }

        .SideNav-item:hover,
        .SideNav-item:focus-visible {
            background: var(--site-item-hover-bg) !important;
            border-radius: 0 !important;
            transform: translateY(-1px);
            box-shadow: inset 4px 0 0 rgba(37, 111, 130, 0.58);
            outline: none;
        }

        .SideNav-icon {
            flex: 0 0 auto;
            color: var(--site-muted);
            opacity: 0.96;
        }

        .listTitle {
            font-size: 17px;
            font-weight: 650;
            letter-spacing: 0;
        }

        .listLabels {
            align-items: center;
            gap: var(--site-space-2);
            margin-left: var(--site-space-3);
        }

        .Label {
            height: 27px;
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            padding: 0 10px !important;
            border-radius: var(--site-radius-pill) !important;
            border: 1px solid rgba(255, 255, 255, 0.62);
            box-shadow: var(--site-shadow-sm);
            font-size: 13px !important;
            font-weight: 750;
            line-height: 1 !important;
        }

        .Label object,
        .Label object a {
            display: inline-flex;
            align-items: center;
            line-height: 1;
            pointer-events: none;
        }

        #taglabel button.Label {
            min-height: var(--site-control-size);
            height: auto;
            padding: 0 var(--site-space-3) !important;
            cursor: pointer;
        }

        .Counter {
            color: inherit !important;
        }

        .pagination a,
        .pagination span,
        .pagination em {
            min-height: var(--site-control-size);
            border-radius: var(--site-radius-pill) !important;
            background: var(--site-panel) !important;
            border-color: var(--site-line) !important;
        }

        .subnav-search {
            width: 100% !important;
            max-width: 540px;
            min-height: var(--site-control-size);
            display: flex;
            align-items: stretch;
            position: relative;
            margin: 0 var(--site-space-2) 0 0 !important;
        }

        .subnav-search-input {
            width: auto !important;
            min-width: 0;
            min-height: var(--site-control-size);
            flex: 1 1 auto;
            padding-left: 42px !important;
            color: var(--site-ink) !important;
            background: var(--site-input-bg) !important;
            border: 1px solid var(--site-line) !important;
            border-radius: var(--site-radius-pill) 0 0 var(--site-radius-pill) !important;
            box-shadow: var(--site-shadow-sm);
            float: none !important;
        }

        .subnav-search .search-submit {
            min-width: 72px;
            min-height: var(--site-control-size);
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            padding: 0 var(--site-space-4) !important;
            color: var(--site-control-ink) !important;
            background: var(--site-control-bg) !important;
            border-color: var(--site-line) !important;
            border-left: 0 !important;
            border-radius: 0 var(--site-radius-pill) var(--site-radius-pill) 0 !important;
            float: none !important;
        }

        .subnav-search-icon {
            top: 14px !important;
            left: 14px !important;
            color: var(--site-muted) !important;
        }

        .markdown-body {
            color: var(--site-ink);
        }

        .site-page-article #postBody,
        .site-page-single #postBody {
            width: 100%;
            max-width: var(--site-reading-measure);
            margin-inline: auto;
        }

        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3 {
            color: var(--site-ink);
            scroll-margin-top: 22px;
        }

        .markdown-body h2 {
            padding-bottom: 0.34em;
            border-bottom: 1px solid var(--site-line);
        }

        .markdown-body h2::before,
        .markdown-body h3::before {
            content: "";
            display: inline-block;
            width: 0.62em;
            height: 0.62em;
            margin-right: 0.48em;
            border-radius: 999px;
            background: linear-gradient(135deg, var(--site-accent), var(--site-accent-2));
            box-shadow: 0 6px 14px rgba(37, 111, 130, 0.20);
            vertical-align: 0.03em;
        }

        .markdown-body h3::before {
            width: 0.48em;
            height: 0.48em;
            background: linear-gradient(135deg, var(--site-accent-3), var(--site-accent-2));
        }

        .markdown-body p,
        .markdown-body li {
            color: var(--site-ink);
        }

        .markdown-body p {
            margin-block: 0 1.15em;
        }

        .markdown-body a {
            color: var(--site-link);
            text-decoration: none;
            border-bottom: 1px solid rgba(9, 105, 218, 0.26);
        }

        .markdown-body a:hover {
            color: var(--site-link-hover);
            border-bottom-color: rgba(9, 105, 218, 0.58);
        }

        .markdown-body blockquote {
            color: var(--site-muted);
            background: var(--site-blockquote-bg);
            border-left: 4px solid rgba(37, 111, 130, 0.52);
            border-radius: 0 var(--site-radius-md) var(--site-radius-md) 0;
            padding: 0.8em 1em;
        }

        .markdown-body table {
            display: block;
            width: 100%;
            overflow-x: auto;
            border-radius: var(--site-radius-md);
            background: var(--site-table-bg);
            box-shadow: var(--site-shadow-sm);
        }

        .markdown-body table th {
            background: var(--site-panel-strong);
        }

        .markdown-body pre,
        .markdown-body .highlight pre {
            position: relative;
            overflow: auto;
            color: var(--site-ink) !important;
            background: var(--site-code-bg) !important;
            border-radius: var(--site-radius-md) !important;
        }

        .markdown-body code,
        .markdown-body tt {
            color: var(--site-code-ink);
            background: var(--site-code-inline-bg) !important;
            border-radius: 6px;
            padding: 0.16em 0.34em;
        }

        .markdown-body pre code,
        .markdown-body .highlight pre code {
            color: inherit;
            background: transparent !important;
            padding: 0;
        }

        .markdown-body img {
            box-shadow: var(--site-shadow-md);
        }

        .ClipboardButton {
            min-width: var(--site-control-size);
            min-height: var(--site-control-size);
            align-items: center;
            justify-content: center;
        }

        :where(a, button, input, [role="button"]):focus-visible {
            outline: 3px solid var(--site-accent) !important;
            outline-offset: 3px !important;
        }

        #footer {
            width: fit-content;
            max-width: min(680px, 100%);
            box-sizing: border-box;
            margin-left: auto !important;
            margin-right: auto !important;
            padding: 4px 8px;
            color: rgba(247, 250, 252, 0.92);
            line-height: 1.7;
            background: transparent !important;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            text-shadow:
                0 1px 2px rgba(0, 0, 0, 0.72),
                0 0 8px rgba(0, 0, 0, 0.34);
        }

        #footer a {
            color: #76d7ff;
            font-weight: 800;
            text-decoration: none;
            text-shadow:
                0 1px 2px rgba(0, 0, 0, 0.78),
                0 0 10px rgba(11, 132, 189, 0.32);
        }

        #footer a:hover {
            color: #b8ecff;
            text-decoration: underline;
            text-underline-offset: 3px;
        }

        .sponsor-info {
            color: rgba(247, 250, 252, 0.82) !important;
            font-weight: 600;
        }

        #siteBackTop {
            position: fixed;
            right: calc(22px + env(safe-area-inset-right));
            bottom: calc(22px + env(safe-area-inset-bottom));
            z-index: 1002;
            width: var(--site-control-size);
            height: var(--site-control-size);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.42);
            border-radius: 999px;
            color: rgba(24, 46, 58, 0.88);
            background: rgba(255, 255, 255, 0.24);
            box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18);
            backdrop-filter: blur(16px) saturate(1.2);
            -webkit-backdrop-filter: blur(16px) saturate(1.2);
            opacity: 0;
            visibility: hidden;
            transform: translateY(12px);
            transition: opacity 0.18s ease, visibility 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }

        #siteBackTop.is-visible {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        #siteBackTop:hover {
            background: rgba(255, 255, 255, 0.36);
            transform: translateY(-2px);
        }

        .toc-icon {
            right: calc(22px + env(safe-area-inset-right)) !important;
            bottom: calc(76px + env(safe-area-inset-bottom)) !important;
            width: var(--site-control-size) !important;
            height: var(--site-control-size) !important;
            background: rgba(255, 255, 255, 0.24) !important;
            border-color: rgba(255, 255, 255, 0.44) !important;
            color: rgba(46, 70, 86, 0.88) !important;
            backdrop-filter: blur(16px) saturate(1.2);
            -webkit-backdrop-filter: blur(16px) saturate(1.2);
        }

        .toc {
            right: calc(22px + env(safe-area-inset-right)) !important;
            bottom: calc(128px + env(safe-area-inset-bottom)) !important;
            width: min(280px, calc(100vw - 44px)) !important;
            background: rgba(255, 255, 255, 0.28) !important;
            border-color: rgba(255, 255, 255, 0.44) !important;
            border-radius: 14px !important;
            backdrop-filter: blur(18px) saturate(1.25);
            -webkit-backdrop-filter: blur(18px) saturate(1.25);
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            #glassShell {
                width: min(100%, calc(100vw - 28px)) !important;
                max-width: calc(100vw - 28px) !important;
                border-radius: 16px !important;
            }

            body {
                background-attachment: scroll !important;
                box-sizing: border-box;
                width: 100%;
                max-width: 100vw;
                overflow-x: hidden !important;
            }

            html,
            #glassShell,
            #header,
            #content,
            .markdown-body {
                max-width: 100vw;
                overflow-x: hidden;
            }

            #content > div:first-child:not(.markdown-body) {
                font-size: 15.5px;
                margin-bottom: 14px !important;
            }

            .SideNav-item {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                align-items: center;
                min-height: 58px;
                padding: 12px 14px !important;
                gap: 10px;
            }

            .SideNav-item > .d-flex:first-child {
                width: 100%;
                min-width: 0;
                overflow: hidden;
            }

            .listTitle {
                font-size: 15.5px;
                min-width: 0;
            }

            .listLabels {
                display: none !important;
            }

            .LabelTime {
                display: none !important;
            }

            .listLabels .LabelName:not(:first-child) {
                display: none !important;
            }

            .Label {
                height: 25px;
                padding: 0 8px !important;
                font-size: 12px !important;
            }

            .markdown-body {
                font-size: 16px !important;
            }

            .markdown-body h1 {
                font-size: 1.22rem !important;
            }

            .markdown-body table {
                font-size: 14px;
            }

            #footer {
                width: calc(100% - 20px);
                max-width: calc(100% - 20px);
                box-sizing: border-box;
                margin-top: 34px !important;
                padding: 0 8px;
                font-size: 12.5px !important;
                overflow-wrap: anywhere;
                word-break: normal;
            }

            #footer1,
            #footer2,
            .sponsor-info {
                width: 100%;
                max-width: 100%;
            }

            #footer2 {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
            }

            #footer2 > span {
                display: block;
                max-width: 100%;
            }

            #siteBackTop {
                right: calc(14px + env(safe-area-inset-right));
                bottom: calc(14px + env(safe-area-inset-bottom));
                width: var(--site-control-size);
                height: var(--site-control-size);
            }

            .toc-icon {
                right: calc(14px + env(safe-area-inset-right)) !important;
                bottom: calc(66px + env(safe-area-inset-bottom)) !important;
            }

            .toc {
                right: calc(14px + env(safe-area-inset-right)) !important;
                bottom: calc(118px + env(safe-area-inset-bottom)) !important;
                max-height: 52vh !important;
            }

            .site-page-article #header,
            .site-page-single #header,
            .site-page-tag #header {
                min-width: 0 !important;
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                row-gap: 12px;
            }

            .site-page-article body,
            .site-page-single body {
                padding-left: calc(14px + env(safe-area-inset-left)) !important;
                padding-right: calc(14px + env(safe-area-inset-right)) !important;
            }

            .site-page-article #glassShell,
            .site-page-single #glassShell {
                width: 100% !important;
                max-width: 100% !important;
                margin-left: auto !important;
                margin-right: auto !important;
                box-sizing: border-box;
            }

            .site-page-article #content,
            .site-page-single #content,
            .site-page-article #postBody,
            .site-page-single #postBody {
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
                overflow-x: hidden;
            }

            .site-page-article #header .title-left,
            .site-page-single #header .title-left,
            .site-page-tag #header .title-left {
                min-width: 0 !important;
            }

            .site-page-article #header .title-right,
            .site-page-single #header .title-right,
            .site-page-tag #header .title-right {
                width: 100%;
                max-width: 100%;
                margin: 0 !important;
                justify-content: center;
                flex-wrap: wrap;
            }

            #header .title-right a.btn,
            #header .title-right button,
            #header a.btn.circle {
                width: var(--site-control-size);
                height: var(--site-control-size);
                flex: 0 0 var(--site-control-size);
            }

            .site-page-article #header .title-left,
            .site-page-single #header .title-left {
                display: flex !important;
                align-items: flex-start !important;
                justify-content: space-between !important;
                gap: 12px;
            }

            .site-page-article #header .title-left > :first-child,
            .site-page-single #header .title-left > :first-child {
                min-width: 0;
            }

            .markdown-body {
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
                overflow-wrap: anywhere;
                word-break: normal;
            }

            .markdown-body h1,
            .markdown-body h2,
            .markdown-body h3 {
                max-width: 100%;
                line-height: 1.35;
                white-space: normal;
                overflow-wrap: anywhere;
            }

            .markdown-body p,
            .markdown-body li {
                line-height: 1.82;
            }

            .markdown-body p,
            .markdown-body li,
            .markdown-body div,
            .markdown-body span,
            .markdown-body a,
            .markdown-body strong,
            .markdown-body em {
                max-width: 100%;
                overflow-wrap: anywhere;
                word-break: normal;
            }

            .markdown-body pre {
                max-width: 100%;
                -webkit-overflow-scrolling: touch;
            }

            [class*="esa"],
            [id*="esa"],
            .markdown-body > div {
                max-width: 100%;
                box-sizing: border-box;
            }

            .markdown-body button,
            .markdown-body .btn {
                max-width: 100%;
                white-space: normal;
            }

            .markdown-body button {
                min-height: 40px;
            }

            .markdown-body > div button {
                width: 100%;
            }

            .subnav-search {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                margin: 0 0 var(--site-space-3) !important;
                display: flex;
                position: relative;
                float: none !important;
            }

            .subnav-search-input {
                min-width: 0;
                min-height: var(--site-control-size);
                padding-right: var(--site-space-3) !important;
                border-radius: var(--site-radius-pill) 0 0 var(--site-radius-pill) !important;
                float: none !important;
                box-sizing: border-box;
            }

            .subnav-search-icon {
                top: 14px !important;
            }

            .site-page-tag #header .title-right {
                display: flex !important;
                align-items: center;
                justify-content: center;
                gap: var(--site-space-2);
            }

            .site-page-tag #header .title-right .subnav-search {
                flex: 1 0 100%;
            }

            .site-page-tag #buttonHome {
                margin: 0 !important;
            }

            #taglabel {
                display: flex;
                flex-wrap: wrap;
                gap: var(--site-space-2);
                max-width: 100%;
                overflow: visible;
                padding: 0;
                margin-bottom: 10px !important;
            }

            #taglabel + .SideNav,
            #taglabel ~ .SideNav {
                margin-top: 6px;
            }

            #taglabel::-webkit-scrollbar {
                display: none;
            }

            #taglabel .Label {
                flex: 0 1 auto;
                min-height: var(--site-control-size);
                height: auto;
                padding: 0 var(--site-space-3) !important;
                margin-bottom: 0 !important;
            }

            .toc-icon,
            #siteBackTop {
                width: var(--site-control-size) !important;
                height: var(--site-control-size) !important;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            html {
                scroll-behavior: auto !important;
            }

            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
        `;
        document.head.appendChild(style);
    }

    function ensureBackToTopButton() {
        if (document.getElementById('siteBackTop')) return;

        const button = document.createElement('button');
        button.id = 'siteBackTop';
        button.type = 'button';
        button.title = '返回顶部';
        button.setAttribute('aria-label', '返回顶部');
        button.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M12 5.5 5.6 12l1.4 1.4 4-4V20h2V9.4l4 4 1.4-1.4L12 5.5Z"></path>
            </svg>`;
        button.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        });
        document.body.appendChild(button);

        const update = function () {
            const y = window.scrollY || document.documentElement.scrollTop || 0;
            button.classList.toggle('is-visible', y > 360);
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
    }

    function improveExternalLinks() {
        document.querySelectorAll('.markdown-body a[href^="http"]').forEach(function (link) {
            try {
                if (new URL(link.href).origin !== window.location.origin) {
                    link.target = '_blank';
                    const relTokens = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
                    relTokens.add('noopener');
                    relTokens.add('noreferrer');
                    link.setAttribute('rel', Array.from(relTokens).join(' '));
                }
            } catch (e) {}
        });
    }

    function optimizeArticleImages() {
        document.querySelectorAll('.markdown-body img').forEach(function (img, index) {
            const canonicalSrc = img.getAttribute('data-canonical-src');
            if (canonicalSrc) {
                const parentLink = img.closest('a[href]');
                if (parentLink) parentLink.href = canonicalSrc;
                if (!img.getAttribute('data-esa-img-locked')) {
                    img.src = canonicalSrc;
                }
            }
            if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
            if (!img.hasAttribute('loading')) img.setAttribute('loading', index === 0 ? 'eager' : 'lazy');
            if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
            try {
                img.fetchPriority = index === 0 ? 'high' : 'low';
            } catch (e) {}
        });
    }

    function relativeLuminance(rgb) {
        const channels = rgb.map(function (channel) {
            const value = channel / 255;
            return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function accessibleTextColor(backgroundColor) {
        const channels = String(backgroundColor).match(/[\d.]+/g);
        if (!channels || channels.length < 3) return '#111827';
        const backgroundLuminance = relativeLuminance(channels.slice(0, 3).map(Number));
        const darkLuminance = relativeLuminance([17, 24, 39]);
        const darkContrast = (backgroundLuminance + 0.05) / (darkLuminance + 0.05);
        const lightContrast = 1.05 / (backgroundLuminance + 0.05);
        return darkContrast >= lightContrast ? '#111827' : '#ffffff';
    }

    function applyAccessibleLabelColors(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('.Label').forEach(function (label) {
            const textColor = accessibleTextColor(window.getComputedStyle(label).backgroundColor);
            label.style.setProperty('color', textColor, 'important');
            label.querySelectorAll('a, object, .Counter').forEach(function (child) {
                child.style.setProperty('color', 'inherit', 'important');
            });
        });
    }

    function watchAccessibleLabelColors() {
        applyAccessibleLabelColors(document);
        const content = document.getElementById('content');
        if (!content || !('MutationObserver' in window)) return;
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (!node || node.nodeType !== 1) return;
                    if (node.matches && node.matches('.Label')) {
                        applyAccessibleLabelColors(node.parentElement || document);
                    } else {
                        applyAccessibleLabelColors(node);
                    }
                });
            });
        });
        observer.observe(content, { childList: true, subtree: true });
    }

    markCurrentPageClass();
    ensureSiteTypography();
    ensureHeadPerformanceHints();
    runWhenIdle([normalizeHomeButton, normalizeHeaderLocalNavLinks, watchAccessibleLabelColors]);

    function isMobileViewport() {
        try {
            if (!window.matchMedia) return false;
            const byWidth = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
            // 处理“请求桌面版站点/视口被放大”的手机：用触屏特征兜底
            const byTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
            return byWidth || byTouch;
        } catch (e) {
            return false;
        }
    }

    function currentBgMode() {
        return isMobileViewport() ? THEME_BG_MODE_MOBILE : THEME_BG_MODE_DESKTOP;
    }

    function shouldUseVideoBackground() {
        const mode = currentBgMode();
        if (mode === 'video') return true;
        if (mode === 'image') return false;
        // auto
        try {
            const reduceMotion = prefersReducedMotion();
            const saveData = navigator.connection && navigator.connection.saveData;
            return !(reduceMotion || saveData);
        } catch (e) {
            return true;
        }
    }

    function ensureBackgroundOverlay() {
        if (document.getElementById('bgOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'bgOverlay';

        const bgVideo = document.getElementById('bgVideo');
        if (bgVideo && bgVideo.parentNode) {
            bgVideo.insertAdjacentElement('afterend', overlay);
        } else {
            document.body.insertBefore(overlay, document.body.firstChild);
        }
    }

    function ensureGlassShell() {
        if (document.getElementById('glassShell')) return;
        const shell = document.createElement('div');
        shell.id = 'glassShell';
        const outsideShellIds = new Set(['bgVideo', 'bgOverlay', 'siteBackTop']);

        const nodes = Array.from(document.body.childNodes);
        for (const node of nodes) {
            if (node && node.nodeType === 1) {
                const el = node;
                if (outsideShellIds.has(el.id)) continue;
                if (el.matches('.toc, .toc-icon, .lb-lightbox-overlay')) continue;
            }
            shell.appendChild(node);
        }
        document.body.appendChild(shell);
    }

    function ensureBackgroundVideo() {
        if (!shouldUseVideoBackground()) return;
        if (document.getElementById('bgVideo')) return;

        let bgVideo = document.createElement('video');
        bgVideo.id = 'bgVideo';
        bgVideo.src = isMobileViewport() ? bgVideoMobileUrl : bgVideoDesktopUrl;
        bgVideo.autoplay = true;
        bgVideo.loop = true;
        bgVideo.muted = true;
        bgVideo.playsInline = true;
        bgVideo.controls = false;
        bgVideo.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');
        bgVideo.disablePictureInPicture = true;
        // 右键菜单屏蔽（即使某些浏览器仍可触发）
        bgVideo.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        // 视频未就绪前先显示图片背景；如果失败则移除视频，让图片背景露出来
        bgVideo.addEventListener('loadeddata', function () {
            bgVideo.classList.add('is-ready');
        });
        bgVideo.addEventListener('error', function () {
            try { bgVideo.remove(); } catch (e) {}
        });

        document.body.insertBefore(bgVideo, document.body.firstChild);

        // 某些环境下 autoplay 仍可能被阻止，失败就移除视频（回退到图片）
        try {
            const p = bgVideo.play && bgVideo.play();
            if (p && typeof p.catch === 'function') {
                p.catch(function () {
                    try { bgVideo.remove(); } catch (e) {}
                });
            }
        } catch (e) {}
    }

    function sharedPageShellCss(lineHeight) {
        return `
        html {
            background: url('${bgImageDesktopUrl}') no-repeat center center fixed;
            background-size: cover;
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            html {
                background-image: url('${bgImageMobileUrl}');
                background-attachment: scroll;
            }
        }

        #bgVideo {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            object-fit: cover;
            background: #000;
            opacity: 0;
            transition: opacity 0.6s ease;
            pointer-events: none;
        }

        #bgVideo.is-ready {
            opacity: 1;
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

        body {
            box-sizing: border-box;
            min-height: 100vh;
            margin: 0;
            padding: 28px 16px;
            width: 100%;
            max-width: none;
            font-size: 16px;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            line-height: ${lineHeight || '1.35'};
            color: rgba(15, 23, 42, 0.92);
            background: transparent;
            overflow-x: hidden;
        }

        #glassShell {
            position: relative;
            z-index: 2;
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 44px;
            background: rgba(255, 255, 255, 0.14);
            border: 1px solid rgba(255, 255, 255, 0.26);
            border-radius: 18px;
            box-shadow:
                0 28px 90px rgba(0, 0, 0, 0.36),
                inset 0 1px 0 rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(20px) saturate(1.35);
            -webkit-backdrop-filter: blur(20px) saturate(1.35);
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            body {
                padding-left: calc(clamp(10px, 3.2vw, 14px) + env(safe-area-inset-left));
                padding-right: calc(clamp(10px, 3.2vw, 14px) + env(safe-area-inset-right));
                padding-top: calc(clamp(10px, 2.2vh, 14px) + env(safe-area-inset-top));
                padding-bottom: calc(clamp(10px, 2.2vh, 14px) + env(safe-area-inset-bottom));
                font-size: 15px;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                touch-action: pan-y;
            }
            #glassShell {
                padding: clamp(14px, 3.8vw, 18px);
                border-radius: 16px;
            }
        }
        `;
    }

    //主页主题------------------------------------------------------------------------------
    
    if (currentUrl == '/' || currentUrl.includes('/index.html') || currentUrl.includes('/page')) {
        console.log('应用主页主题');
        let style = document.createElement("style");
        style.innerHTML = `
        .blogTitle {
            display: unset;
        }

        /* 头部：头像居中在上，名字居中在下，图标在名字右侧（参考你截图）
           说明：为避免部分浏览器对 display: contents 的兼容问题，这里配合 JS
           把头像 img 从 h1 里挪到 header 的直接子节点。 */
        #header {
            height: 300px;
            position: relative;
            display: grid !important;
            grid-template-columns: 1fr auto 1fr;
            grid-template-rows: auto auto;
            align-items: center;
            padding: 10px 6px 0;
            text-align: center;
        }

        /* 适配当前首页结构：
           #header
            ├─ .title-left (img.avatar + a.blogTitle)
            └─ .title-right (buttons)
         */
        #header .title-left {
            grid-column: 2;
            grid-row: 1 / span 2;
            justify-self: center;
            align-self: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 0;
            min-width: 0;
        }

        /* 头像（在 title-left 内） */
        #header .title-left .avatar {
            width: 150px;
            height: 150px;
            display: block;
            margin: 0;
            border-radius: 50%;
            border: 4px solid rgba(255, 255, 255, 0.72);
            box-shadow: 0 18px 45px rgba(0, 0, 0, 0.22);
        }

        /* 名字（大字居中） */
        #header .title-left a.blogTitle {
            position: relative;
            display: inline-block;
            margin: 2px 0 0 !important;
            padding: 2px 12px 8px;
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            font-weight: 820 !important;
            letter-spacing: 0;
            font-size: 46px !important;
            line-height: 1;
            text-decoration: none;
            color: #f5f0df !important;
            background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 224, 178, 0.96) 46%, rgba(112, 185, 191, 0.92) 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            -webkit-text-stroke: 1px rgba(31, 92, 100, 0.34);
            filter: none !important;
            text-shadow:
                0 1px 0 rgba(255, 255, 255, 0.72),
                0 3px 9px rgba(28, 55, 66, 0.24),
                0 14px 34px rgba(217, 147, 105, 0.24);
            transition: text-shadow 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
        }

        #header .title-left a.blogTitle::after {
            content: "";
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 1px;
            height: 8px;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(75, 137, 127, 0), rgba(239, 180, 128, 0.62), rgba(75, 137, 127, 0));
            box-shadow: 0 8px 20px rgba(205, 139, 112, 0.18);
            opacity: 0.88;
            pointer-events: none;
        }

        #header .title-left a.blogTitle:hover {
            transform: translateY(-1px);
            text-shadow:
                0 1px 0 rgba(255, 255, 255, 0.82),
                0 4px 12px rgba(28, 55, 66, 0.28),
                0 16px 38px rgba(232, 165, 106, 0.34);
        }

        /* 图标：放在名字这一行的右侧 */
        #header .title-right {
            grid-column: 3;
            grid-row: 2;
            justify-self: end;
            align-self: center;
            margin: 0 !important;
            display: flex;
            gap: 10px;
            align-items: center;
            opacity: 0.9;
        }

        html {    
            background: url('${bgImageDesktopUrl}') no-repeat center center fixed;
            background-size: cover;
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            html {
                background-image: url('${bgImageMobileUrl}');
                background-attachment: scroll;
            }
        }

        /* 背景视频 */
        #bgVideo {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            object-fit: cover;
            background: #000;
            opacity: 0;
            transition: opacity 0.6s ease;
            pointer-events: none; /* 避免悬浮出现任何控件/交互 */
        }

        #bgVideo.is-ready {
            opacity: 1;
        }

        /* 背景遮罩（简洁 + 强玻璃拟态基础） */
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

        body {
            box-sizing: border-box;
            min-height: 100vh;
            margin: 0;
            padding: 28px 16px;
            width: 100%;
            max-width: none;
            font-size: 16px;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            line-height: 1.35;
            color: rgba(15, 23, 42, 0.92);
            background: transparent;
            overflow-x: hidden;
            /* 用 margin: 0 auto 居中容器，避免 fixed 元素参与 flex 布局导致偏移 */
        }

        /* 强玻璃拟态容器（避免影响 fixed 背景） */
        #glassShell {
            position: relative;
            z-index: 2;
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 44px;
            background: rgba(255, 255, 255, 0.14);
            border: 1px solid rgba(255, 255, 255, 0.26);
            border-radius: 18px;
            box-shadow:
                0 28px 90px rgba(0, 0, 0, 0.36),
                inset 0 1px 0 rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(20px) saturate(1.35);
            -webkit-backdrop-filter: blur(20px) saturate(1.35);
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            body {
                /* 不同手机高度差异大：用流体间距 + 安全区 */
                padding-left: calc(clamp(10px, 3.2vw, 14px) + env(safe-area-inset-left));
                padding-right: calc(clamp(10px, 3.2vw, 14px) + env(safe-area-inset-right));
                padding-top: calc(clamp(10px, 2.2vh, 14px) + env(safe-area-inset-top));
                padding-bottom: calc(clamp(10px, 2.2vh, 14px) + env(safe-area-inset-bottom));
                font-size: 15px;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                touch-action: pan-y;
            }
            #glassShell {
                padding: clamp(14px, 3.8vw, 18px);
                border-radius: 16px;
            }
            /* 手机端：图标下移居中，整体更紧凑 */
            #header {
                height: auto;
                grid-template-columns: 1fr;
                grid-template-rows: auto auto auto;
                padding: 8px 2px 0;
            }
            #header .title-left {
                grid-column: 1;
                grid-row: 1 / span 2;
                gap: 8px;
            }
            #header .title-left .avatar {
                width: clamp(92px, 24vw, 120px);
                height: clamp(92px, 24vw, 120px);
                border-width: 3px;
            }
            #header .title-left a.blogTitle {
                font-size: 38px !important;
                padding: 1px 10px 8px;
                background:
                    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 229, 155, 0.97) 48%, rgba(112, 159, 119, 0.94) 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                -webkit-text-stroke: 1px rgba(42, 58, 39, 0.46);
                text-shadow:
                    0 1px 0 rgba(255, 255, 255, 0.72),
                    0 3px 10px rgba(39, 45, 29, 0.34),
                    0 14px 30px rgba(225, 167, 63, 0.28);
            }
            #header .title-left a.blogTitle::after {
                left: 9px;
                right: 9px;
                bottom: 1px;
                height: 7px;
                background: linear-gradient(90deg, rgba(98, 130, 76, 0), rgba(250, 211, 94, 0.66), rgba(98, 130, 76, 0));
                box-shadow: 0 7px 18px rgba(222, 163, 58, 0.22);
            }
            #header .title-left a.blogTitle:hover {
                text-shadow:
                    0 1px 0 rgba(255, 255, 255, 0.78),
                    0 4px 12px rgba(39, 45, 29, 0.36),
                    0 16px 34px rgba(235, 180, 74, 0.36);
            }
            #header .title-right {
                grid-column: 1;
                grid-row: 3;
                justify-self: center;
                margin-top: 8px !important;
            }
        }

        @media (max-width: 380px) {
            #header .title-left a.blogTitle {
                font-size: 34px !important;
            }
        }

        /* 主页博客列表圆角边框 */
        .SideNav {
            background: rgba(255, 255, 255, 0.10);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 16px;
            min-width: unset;
            backdrop-filter: blur(10px) saturate(1.15);
            -webkit-backdrop-filter: blur(10px) saturate(1.15);
        }

        /* 鼠标放到博客标题后会高亮 */
        .SideNav-item:hover {
            background: linear-gradient(135deg, rgba(195, 228, 227, 0.72), rgba(255, 255, 255, 0.55));
            border-radius: 12px;
            transform: translateY(-1px) scale(1.01);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.16);
        }

        .SideNav-item {
            transition: 0.18s ease;
        }

        /* 分页条 */
        .pagination a:hover, .pagination a:focus, .pagination span:hover, .pagination span:focus, .pagination em:hover, .pagination em:focus {
            border-color: rebeccapurple;
        }

        /* 赞助商信息样式 */
        .sponsor-info {
            text-align: center;
            margin-top: 20px;
            font-size: small;
            color: #666;
        }
        `;
        document.head.appendChild(style);
        ensureBackgroundVideo();
        ensureBackgroundOverlay();
        ensureGlassShell();
        ensureGlobalPolishStyle();
        runWhenIdle([ensureBackToTopButton, insertSponsorInfo]);
    }


    //文章页主题------------------------------------------------------------------------------
    
    else if (currentUrl.includes('/post/') || currentUrl.includes('/link.html') || currentUrl.includes('/about.html')) {
        console.log('文章页主题');

        let style = document.createElement("style");
        style.innerHTML = `
        ${sharedPageShellCss('1.55')}

        /* markdown内容 */
        /* 图片圆角 */
        .markdown-body img {
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.78); 
        }
        
        /* notice、caution、warning等提示信息的圆角 */
        .markdown-alert {
            border-radius: 8px;
        }
        
        /* 代码块 */
        .markdown-body .highlight pre, .markdown-body pre {
            color: rgb(0, 0, 0);          /* 代码块内代码颜色 */
            background-color: rgba(245, 246, 248, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.45);
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
            padding-top: 20px; 
            border-radius: 8px;
        }

        /* 行内代码 */
        .markdown-body code, .markdown-body tt {
            background-color: #c9daf8;
        }
        
        /* 标题橙色包裹 */
        .markdown-body h1{
            display: inline-block;
            font-size: 1.3rem;
            font-weight: bold;
            background: rgb(239, 112, 96);
            color: #ffffff;
            padding: 3px 10px 1px;
            border-top-right-radius: 8px;
            border-top-left-radius: 8px;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
            margin-right: 2px;
            margin-top: 1.8rem; 
        }   
        `;
        document.head.appendChild(style);
        ensureBackgroundVideo();
        ensureBackgroundOverlay();
        ensureGlassShell();
        ensureGlobalPolishStyle();
        optimizeArticleImages();
        runWhenIdle([ensureBackToTopButton, improveExternalLinks, insertSponsorInfo]);

        // ESA AI 验证码：仅保护“文章正文图片”，验证成功才加载（本篇一次即可）
        if (currentUrl.includes('/post/')) {
            window.ESAAIImageCaptchaConfig = Object.assign(
                {},
                siteConfig.esa || {},
                window.ESAAIImageCaptchaConfig || {}
            );
            // 注意：这里用相对路径，兼容站点部署在子路径（例如 /docs/）的情况
            const esaImgPluginUrl = absUrl('../plugins/ESAAIImageCaptcha.js');
            loadScriptOnce('esa-ai-image-captcha', esaImgPluginUrl);

            // 可视化排障：1.5s 内没看到插件标记，直接在正文顶部提示“脚本未加载/路径错误”
            setTimeout(function () {
                try {
                    const flag = document.documentElement.getAttribute('data-esa-img-plugin');
                    if (flag) return;
                    const md = document.querySelector('.markdown-body');
                    if (!md) return;
                    const warn = document.createElement('div');
                    warn.style.cssText = 'border:1px solid rgba(220,38,38,.35);background:rgba(254,226,226,.8);border-radius:12px;padding:10px 12px;margin:10px 0 16px;color:#7f1d1d;font-size:13px;';
                    warn.innerHTML = 'ESA图片验证插件未加载成功。请检查脚本路径是否可访问：<br><code style="word-break:break-all;">' + esaImgPluginUrl + '</code>';
                    md.insertBefore(warn, md.firstChild);
                } catch (e) {}
            }, 1500);
        }
    } 


    // 搜索页主题--------------------------------------------------------------------
    
    else if (currentUrl.includes('/tag')) {
        console.log('应用搜索页主题');
        let style = document.createElement("style");
        style.innerHTML = `
        ${sharedPageShellCss('1.35')}
        
        .SideNav {
            background: rgba(255, 255, 255, 0.10);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 16px;
            min-width: unset;
            backdrop-filter: blur(10px) saturate(1.15);
            -webkit-backdrop-filter: blur(10px) saturate(1.15);
        }
        
        .SideNav-item:hover {
            background: linear-gradient(135deg, rgba(195, 228, 227, 0.72), rgba(255, 255, 255, 0.55));
            border-radius: 12px;
            transform: translateY(-1px) scale(1.01);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.16);
        }
        
        .SideNav-item {
            transition: 0.18s ease;
        }
        
        .subnav-search-input {
            border-radius: var(--site-radius-pill) 0 0 var(--site-radius-pill) !important;
            float: unset !important;
        }
        
        .subnav-search-icon {
            top: 9px;
        }
        
        .subnav-search {
            width: min(100%, 540px);
            height: var(--site-control-size);
            display: flex;
        }

        .subnav-search .search-submit {
            display: inline-flex !important;
        }
        `;
        document.head.appendChild(style);
        ensureBackgroundVideo();
        ensureBackgroundOverlay();
        ensureGlassShell();
        ensureGlobalPolishStyle();
        runWhenIdle([ensureBackToTopButton, insertSponsorInfo]);
    }

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyThemeRuntime, { once: true });
} else {
    applyThemeRuntime();
}
})();
