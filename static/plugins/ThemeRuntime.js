(function themeRuntimeBoot() {
function applyThemeRuntime() {
    // 重复执行守卫：脚本被多次引入时只应用一次
    if (window.__siteThemeRuntimeApplied) return;
    window.__siteThemeRuntimeApplied = true;
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
    const THEME_BG_IMAGE_DESKTOP_SMALL = backgroundConfig.desktopImageSmall || '/img/电脑2-1280.webp';
    const THEME_BG_IMAGE_DESKTOP_LARGE = backgroundConfig.desktopImageLarge || backgroundConfig.desktopImage || '/img/电脑2-1920.webp';
    const THEME_BG_IMAGE_DESKTOP_SMALL_MAX_WIDTH = backgroundConfig.desktopImageSmallMaxWidth || 1280;
    const THEME_BG_IMAGE_DESKTOP = window.innerWidth <= THEME_BG_IMAGE_DESKTOP_SMALL_MAX_WIDTH
        ? THEME_BG_IMAGE_DESKTOP_SMALL
        : THEME_BG_IMAGE_DESKTOP_LARGE;
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
        root.classList.toggle('site-page-link', currentUrl.includes('/link.html'));
        root.classList.toggle('site-page-about', currentUrl.includes('/about.html'));
        root.classList.toggle('site-page-tag', currentUrl.includes('/tag'));
        root.classList.toggle('site-page-archive', currentUrl.includes('/archive.html'));
    }

    function normalizeArticleHeadingLevels() {
        const article = document.getElementById('postBody');
        if (!article) return;
        let previousLevel = 1;
        Array.from(article.querySelectorAll('h1,h2,h3,h4,h5,h6')).forEach(function (heading) {
            const originalLevel = Number(heading.tagName.slice(1));
            const nextLevel = Math.max(2, Math.min(originalLevel, previousLevel + 1));
            previousLevel = nextLevel;
            if (nextLevel === originalLevel) return;
            const replacement = document.createElement(`h${nextLevel}`);
            Array.from(heading.attributes).forEach(function (attribute) {
                replacement.setAttribute(attribute.name, attribute.value);
            });
            while (heading.firstChild) replacement.appendChild(heading.firstChild);
            heading.replaceWith(replacement);
        });
    }

    function enhanceSinglePageLinks() {
        if (!document.documentElement.classList.contains('site-page-single')) return;
        const article = document.getElementById('postBody');
        if (!article) return;
        article.querySelectorAll('li > a[href]').forEach(function (link) {
            link.classList.add('single-page-card-link');
            const item = link.closest('li');
            if (item) item.classList.add('single-page-link-item');
            const list = item && item.parentElement;
            if (list && document.documentElement.classList.contains('site-page-link')) {
                list.classList.add('friend-link-list');
            }
        });
    }

    function ensureSkipLink() {
        if (document.querySelector('.skip-link')) return;
        const link = document.createElement('a');
        link.className = 'skip-link';
        link.href = '#content';
        link.textContent = '跳转到正文';
        document.body.insertBefore(link, document.body.firstChild);
    }

    function enhanceDocumentLinks() {
        document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
            const values = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
            values.add('noopener');
            values.add('noreferrer');
            link.setAttribute('rel', Array.from(values).join(' '));
        });
    }

    function ensureImageDimensions() {
        const avatar = document.getElementById('avatarImg');
        if (!avatar) return;
        if (!avatar.hasAttribute('width')) avatar.setAttribute('width', '150');
        if (!avatar.hasAttribute('height')) avatar.setAttribute('height', '150');
        avatar.setAttribute('loading', 'eager');
        avatar.setAttribute('decoding', 'async');
        avatar.setAttribute('fetchpriority', 'high');
    }

    function moveRssToFooter() {
        const footer = document.getElementById('footer');
        if (!footer) return;
        const headerRss = document.getElementById('buttonRSS');
        let footerLink = footer.querySelector('.footer-rss');
        if (!footerLink) {
            const container = document.createElement('div');
            container.className = 'footer-subscribe';
            footerLink = document.createElement('a');
            footerLink.className = 'footer-rss';
            footerLink.href = new URL('/rss.xml', window.location.origin).href;
            footerLink.target = '_blank';
            footerLink.rel = 'noopener noreferrer';
            footerLink.setAttribute('aria-label', 'RSS 订阅');
            footerLink.innerHTML = '<svg class="octicon" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd"></path></svg><span>RSS 订阅</span>';
            const path = footerLink.querySelector('path');
            if (path) {
                const rssPath = 'M2.002 2.725a.75.75 0 0 1 .797-.699C8.79 2.42 13.58 7.21 13.974 13.201a.75.75 0 0 1-1.497.098 10.502 10.502 0 0 0-9.776-9.776.747.747 0 0 1-.7-.798ZM2.84 7.05h-.002a7.002 7.002 0 0 1 6.113 6.111.75.75 0 0 1-1.49.178 5.503 5.503 0 0 0-4.8-4.8.75.75 0 0 1 .179-1.489ZM2 13a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z';
                path.setAttribute('d', (window.IconList && window.IconList.rss) || rssPath);
            }
            container.appendChild(footerLink);
            footer.insertBefore(container, footer.firstChild);
        }
        if (headerRss) headerRss.remove();
    }

    function repairAboutPage() {
        if (!document.documentElement.classList.contains('site-page-about')) return;
        const article = document.getElementById('postBody');
        if (!article || article.dataset.aboutRepaired === '1') return;
        const email = article.querySelector('a[href^="mailto:"]');
        const emailHref = email ? email.href : 'mailto:161688830@qq.com';
        const emailText = email ? email.textContent.trim() : '161688830@qq.com';
        const grid = document.createElement('div');
        grid.className = 'about-info-grid';

        const cards = [
            ['建站时间', '2018 年秋'],
            ['托管平台', '本站内容由 GitHub Issues 管理，使用 Gmeek 生成静态页面，并通过 EdgeOne Pages 从 GitHub 仓库自动部署。']
        ];
        cards.forEach(function (item) {
            const section = document.createElement('section');
            section.className = 'about-info-card';
            const heading = document.createElement('h2');
            heading.textContent = item[0];
            const paragraph = document.createElement('p');
            paragraph.textContent = item[1];
            section.append(heading, paragraph);
            grid.appendChild(section);
        });

        const contact = document.createElement('section');
        contact.className = 'about-info-card about-contact-card';
        const contactHeading = document.createElement('h2');
        contactHeading.textContent = '联系';
        const contactText = document.createElement('p');
        contactText.append('需要联系时，可以发送邮件至 ');
        const contactLink = document.createElement('a');
        contactLink.href = emailHref;
        contactLink.textContent = emailText;
        contactText.append(contactLink, '。');
        contact.append(contactHeading, contactText);
        grid.appendChild(contact);
        article.replaceChildren(grid);
        article.dataset.aboutRepaired = '1';

        const description = '星源笔记始建于 2018 年秋，使用 Gmeek 生成静态页面，并通过 EdgeOne Pages 自动部署。';
        document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').forEach(function (meta) {
            meta.setAttribute('content', description);
        });
    }

    function localizeTagPage() {
        if (!document.documentElement.classList.contains('site-page-tag')) return;
        const heading = document.querySelector('.tagTitle');
        const input = document.getElementById('siteSearch');
        const labels = document.getElementById('taglabel');
        if (heading && /^Loading/i.test(heading.textContent.trim())) heading.textContent = '正在加载文章索引…';
        if (input) input.placeholder = '搜索标题、摘要或标签…';

        function updateAllLabel() {
            if (!labels) return;
            labels.querySelectorAll('button[data-label="All"]').forEach(function (button) {
                const textNode = Array.from(button.childNodes).find(function (node) { return node.nodeType === Node.TEXT_NODE; });
                if (textNode) textNode.nodeValue = '全部 ';
            });
            if (heading && heading.textContent.trim() === '全部文章') document.title = `全部文章 - ${document.title.split(' - ').pop()}`;
        }

        updateAllLabel();
        if ('MutationObserver' in window) {
            const observer = new MutationObserver(updateAllLabel);
            if (labels) observer.observe(labels, { childList: true, subtree: true });
            if (heading) observer.observe(heading, { childList: true, subtree: true, characterData: true });
        }
    }

    function syncThemeColor() {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;
        const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
        function update() {
            const mode = document.documentElement.getAttribute('data-color-mode');
            const dark = mode === 'dark' || (mode === 'auto' && media && media.matches);
            meta.setAttribute('content', dark ? '#0f172a' : '#0969da');
        }
        update();
        if ('MutationObserver' in window) {
            new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] });
        }
        if (media && media.addEventListener) media.addEventListener('change', update);
    }

    function manageMobileFloatingControls() {
        const comments = document.getElementById('comments');
        let ticking = false;
        function update() {
            ticking = false;
            const hide = !!(isMobileViewport() && comments && comments.getBoundingClientRect().top < window.innerHeight * 0.88);
            document.querySelectorAll('.toc-icon, #siteBackTop').forEach(function (control) {
                control.classList.toggle('is-content-obscuring', hide);
            });
        }
        function schedule() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }
        update();
        document.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
    }

    function enhanceListDates() {
        document.querySelectorAll('.LabelTime').forEach(function (label) {
            const match = label.textContent.trim().match(/^(?:\d{4}-)?(\d{2}-\d{2})$/);
            if (match) label.dataset.shortDate = match[1];
        });
    }

    function enhanceArchiveCounts() {
        if (!document.documentElement.classList.contains('site-page-archive')) return;
        document.querySelectorAll('section[aria-labelledby]').forEach(function (section) {
            const heading = section.querySelector('.archiveYear');
            const list = section.querySelector('.archiveList');
            if (!heading || !list || heading.querySelector('.archiveCount')) return;
            const count = document.createElement('span');
            count.className = 'archiveCount';
            count.textContent = `${list.querySelectorAll(':scope > li').length} 篇`;
            heading.appendChild(count);
        });
    }

    function ensureMobileImprovementsStyle() {
        if (document.getElementById('site-mobile-improvements')) return;
        const style = document.createElement('style');
        style.id = 'site-mobile-improvements';
        style.textContent = `
        .listLead,.listMain{min-width:0}
        .listMain{display:grid;gap:4px}
        .listExcerpt{overflow:hidden;color:var(--site-muted);font-size:13px;font-weight:450;line-height:1.45;text-overflow:ellipsis;white-space:nowrap}
        .SideNav-item{border-bottom-color:color-mix(in srgb,var(--site-line) 58%,transparent)!important}
        .Label{border-color:color-mix(in srgb,var(--site-line) 76%,transparent)!important;box-shadow:none!important}
        #taglabel{display:flex;flex-wrap:wrap;gap:8px}
        #taglabel .Label{position:relative;gap:6px;margin:0!important;color:var(--site-ink)!important;background:var(--site-panel)!important;filter:none}
        #taglabel .Label::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--tag-color,#57606a)}
        #taglabel .Label[aria-pressed="true"]{color:var(--site-ink)!important;background:color-mix(in srgb,var(--site-accent) 18%,var(--site-panel-strong))!important;border-color:color-mix(in srgb,var(--site-accent) 58%,transparent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--site-accent) 16%,transparent)!important}
        .listLabels .LabelName,.listLabels .LabelTime{color:var(--site-muted)!important;background:transparent!important;border-color:color-mix(in srgb,var(--site-muted) 28%,transparent)!important;filter:none}
        .site-page-article #glassShell,.site-page-single #glassShell{background:color-mix(in srgb,var(--site-panel-strong) 82%,transparent)!important}
        .postMeta{align-items:center;color:var(--site-muted)!important}
        .postMetaPrimary{color:var(--site-ink);font-weight:650}
        .postMetaReading{padding:3px 9px;border-radius:var(--site-radius-pill);background:var(--site-panel)}
        :where(#comments,#twikoo,.comments,.tk-comments) :where(input,textarea,button,.tk-input,.tk-submit,.el-input__inner,.el-textarea__inner,.el-button){min-height:var(--site-control-size)!important;box-sizing:border-box;font-size:16px}
        .twikoo-load-button{min-width:150px;min-height:var(--site-control-size);display:block;margin:0 auto;border-radius:var(--site-radius-pill)!important}
        .twikoo-load-status{color:var(--site-muted);text-align:center}
        .friend-link-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0!important;list-style:none!important}
        .single-page-link-item{min-width:0;margin:0!important;list-style:none!important}
        .single-page-card-link{box-sizing:border-box;width:100%;min-height:var(--site-control-size);display:flex;align-items:center;padding:10px 12px;border:1px solid color-mix(in srgb,var(--site-line) 76%,transparent)!important;border-radius:12px;background:var(--site-panel);text-decoration:none!important}
        .single-page-card-link:hover,.single-page-card-link:focus-visible{background:var(--site-item-hover-bg)}
        .about-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .about-info-card{padding:18px;border:1px solid color-mix(in srgb,var(--site-line) 80%,transparent);border-radius:14px;background:var(--site-panel)}
        .about-info-card h2{margin:0 0 10px!important;padding:0!important;border:0!important;font-size:20px!important}
        .about-info-card p{margin:0!important}
        .about-contact-card{grid-column:1/-1}
        .footer-subscribe{display:flex;justify-content:center;margin:0 0 8px}
        .footer-rss{min-height:36px;display:inline-flex!important;align-items:center;gap:7px;padding:0 12px;border:1px solid color-mix(in srgb,var(--site-line) 82%,transparent);border-radius:999px;background:var(--site-panel);text-decoration:none!important}
        #footer1,#footer2,.sponsor-info{margin-block:2px!important}
        #siteBackTop,.toc-icon{color:#f7fbff!important;background:rgba(29,78,96,.86)!important;border-color:rgba(255,255,255,.72)!important;box-shadow:0 8px 24px rgba(8,31,42,.28)!important}
        .archiveList{position:relative;border-color:color-mix(in srgb,var(--site-line) 72%,transparent)!important}
        .archiveList li{position:relative;border-bottom-color:color-mix(in srgb,var(--site-line) 54%,transparent)!important}
        @media (min-width:721px){.listExcerpt{display:block}}
        @media (max-width:${MOBILE_BREAKPOINT_PX}px),(hover:none) and (pointer:coarse){
            .friend-link-list,.about-info-grid{grid-template-columns:minmax(0,1fr)}
            .about-contact-card{grid-column:auto}
            .listTitle{display:-webkit-box;overflow:hidden;line-height:1.35;white-space:normal!important;-webkit-box-orient:vertical;-webkit-line-clamp:2}
            .listExcerpt{display:-webkit-box;overflow:hidden;white-space:normal;-webkit-box-orient:vertical;-webkit-line-clamp:1}
            .site-page-article .postMeta{gap:5px 10px;margin:-2px 0 16px;font-size:13px;line-height:1.45}
            .site-page-article .postMetaSecondary{font-size:12.5px}
            #footer{margin-top:24px!important;font-size:12px!important;line-height:1.45!important}
            #footer .sponsor-info{display:none!important}
            .toc-icon.is-content-obscuring,#siteBackTop.is-content-obscuring{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
            .archiveList::before{content:"";position:absolute;top:18px;bottom:18px;left:11px;width:2px;background:color-mix(in srgb,var(--site-accent) 38%,transparent)}
            .archiveList li{grid-template-columns:88px minmax(0,1fr)!important;gap:8px!important;min-height:58px;padding:10px 10px 10px 20px!important}
            .archiveList li::before{content:"";position:absolute;left:7px;top:50%;width:8px;height:8px;border:2px solid var(--site-panel-strong);border-radius:50%;background:var(--site-accent);transform:translateY(-50%)}
            .archivePost{min-height:44px;display:-webkit-box;align-items:center;overflow:hidden;white-space:normal!important;-webkit-box-orient:vertical;-webkit-line-clamp:2}
            .archiveDate{white-space:nowrap!important;font-size:12.5px!important}
        }
        @media (max-width:380px){
            .site-page-home #buttonHome{display:none!important}
            .site-page-home #header .avatar{width:78px!important;height:78px!important}
            .site-page-home #header .blogTitle{font-size:30px!important}
            .site-page-home #header .title-right{margin-top:2px!important}
            .site-page-home #content>div:first-child:not(.markdown-body){margin-bottom:10px!important;font-size:14px;line-height:1.45}
            :is(.site-page-home,.site-page-tag) .LabelTime{font-size:0!important}
            :is(.site-page-home,.site-page-tag) .LabelTime::after{content:attr(data-short-date);font-size:12px}
        }`;
        document.head.appendChild(style);
    }

    function normalizeHomeButton() {
        const homeButton = document.getElementById('buttonHome');
        if (!homeButton) return;
        const sameOriginHome = new URL('/', window.location.origin).href;
        homeButton.href = sameOriginHome;
        homeButton.addEventListener('click', function (event) {
            // 修饰键/非左键点击交给浏览器默认行为（新标签页打开等）
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            window.location.href = sameOriginHome;
        });
    }

    function removeUnusedNavigationControls() {
        const homeButton = document.getElementById('buttonHome');
        if (homeButton && document.documentElement.classList.contains('site-page-home')) {
            homeButton.remove();
        }

        document.querySelectorAll('#header .site-navigation button').forEach(function (button) {
            const clickHandler = button.getAttribute('onclick') || '';
            if (button.querySelector('#themeSwitch') || clickHandler.includes('modeSwitch')) {
                button.remove();
            }
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

                if (link.dataset.sameOriginNavReady === '1') return;
                link.dataset.sameOriginNavReady = '1';
                link.addEventListener('click', function (event) {
                    // 修饰键/非左键点击交给浏览器默认行为（新标签页打开等）
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
            font-family: var(--site-font-ui) !important;
            font-size: 17px;
            line-height: 1.78;
            letter-spacing: 0;
            word-break: break-word;
            overflow-wrap: break-word;
        }

        .site-page-article .markdown-body {
            font-family: var(--site-font-reading) !important;
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

        const kuocaiLogoUrl = 'https://jg.kuocai.net/public/assets/aurora/kuocai.svg';
        const kuocaiHref = 'https://yun.kuocai.net/league?ref=fd4f051a4d2445348b60b689788adf4f';

        let sponsorInfo = document.createElement('div');
        sponsorInfo.className = 'sponsor-info';
        sponsorInfo.innerHTML = `本站由 <a target="_blank" rel="noopener" href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral"><img class="sponsor-logo" src="${sponsorLogoUrl}" alt="又拍云"></a> <a target="_blank" rel="noopener" href="${kuocaiHref}"><img class="sponsor-logo" src="${kuocaiLogoUrl}" alt="括彩云"></a> 提供 CDN 加速/云存储服务`;
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

        html.site-page-home {
            --site-line: rgba(255, 255, 255, 0.25);
            --site-glass-bg:
                linear-gradient(145deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.035) 44%, rgba(45, 52, 64, 0.12)),
                rgba(255, 255, 255, 0.055);
            --site-list-bg:
                linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.055)),
                rgba(255, 255, 255, 0.11);
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

        .skip-link {
            position: fixed;
            left: 16px;
            top: 12px;
            z-index: 2147483647;
            padding: 10px 14px;
            color: #ffffff;
            background: #0f4e64;
            border-radius: 10px;
            box-shadow: var(--site-shadow-md);
            transform: translateY(-160%);
            transition: transform 0.16s ease;
        }

        .skip-link:focus {
            color: #ffffff;
            transform: translateY(0);
        }

        html.site-page-home #glassShell,
        html.site-page-tag #glassShell {
            max-width: 1040px;
        }

        html.site-page-archive #glassShell,
        html.site-page-link #glassShell {
            max-width: 1000px;
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

        html.site-page-home #glassShell::before {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0));
        }

        #header {
            border-bottom-color: var(--site-line) !important;
        }

        .site-page-tag #header {
            align-items: center;
            gap: 20px;
        }

        .site-page-tag #header .tagTitle {
            position: relative;
            flex: 0 0 auto;
            min-width: max-content;
            margin: 0 !important;
            padding-left: 16px;
            color: var(--site-ink);
            line-height: 1.08;
            letter-spacing: 0;
            overflow: visible;
            text-overflow: clip;
        }

        .site-page-tag #header .tagTitle::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0.12em;
            width: 5px;
            height: 0.76em;
            border-radius: 3px;
            background: var(--site-accent);
            box-shadow: 0 4px 12px rgba(37, 111, 130, 0.28);
        }

        .site-page-tag #header .title-right {
            min-width: 0;
            align-items: center;
            gap: 8px;
        }

        #header .site-navigation {
            min-width: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 8px;
        }

        #header .site-navigation > .circle {
            margin: 0 !important;
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

        #header .site-navigation > [aria-current="page"] {
            position: relative;
            box-shadow:
                inset 0 0 0 2px var(--site-accent),
                var(--site-shadow-sm) !important;
            transform: translateY(-1px);
        }

        #header .site-navigation > [aria-current="page"]::after {
            content: "";
            position: absolute;
            left: 50%;
            bottom: 4px;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--site-accent);
            transform: translateX(-50%);
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

        .site-page-tag #header .title-right .subnav-search {
            width: min(34vw, 360px) !important;
            min-width: 220px;
            flex: 1 1 320px;
            margin-right: 0 !important;
            height: var(--site-control-size);
            box-sizing: border-box;
            overflow: hidden;
            border: 1px solid var(--site-line);
            border-radius: var(--site-radius-pill);
            background: var(--site-input-bg);
            box-shadow: var(--site-shadow-sm);
        }

        .site-page-tag #header .subnav-search-input {
            width: auto !important;
            min-width: 0;
            min-height: var(--site-control-size);
            flex: 1 1 auto;
            padding-left: 42px !important;
            color: var(--site-ink) !important;
            background: transparent !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            float: none !important;
        }

        .site-page-tag #header .subnav-search .search-submit {
            min-width: 72px;
            min-height: var(--site-control-size);
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            padding: 0 var(--site-space-4) !important;
            color: var(--site-control-ink) !important;
            background: var(--site-control-bg-hover) !important;
            border: 0 !important;
            border-left: 1px solid var(--site-line) !important;
            border-radius: 0 !important;
            float: none !important;
        }

        .site-page-tag #header .site-navigation > .circle {
            flex: 0 0 var(--site-control-size);
            margin: 0 !important;
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
            height: auto;
            max-width: 100%;
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
            min-height: 32px;
            display: inline-flex;
            align-items: center;
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

        #footer .footer-rss {
            color: rgba(247, 250, 252, 0.94) !important;
        }

        #footer .footer-rss:hover,
        #footer .footer-rss:focus-visible {
            color: #b8ecff !important;
            background: rgba(255, 255, 255, 0.14);
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
                width: 100%;
                min-width: 0;
                display: flex !important;
                align-items: center;
                gap: 6px;
                margin-left: 0;
                overflow: hidden;
            }

            .listLabels > .Label:not(.LabelName):not(.LabelTime) {
                display: none !important;
            }

            .listLabels .LabelName {
                max-width: min(58vw, 220px);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .listLabels .LabelName ~ .LabelName {
                display: none !important;
            }

            .LabelTime {
                display: inline-flex !important;
                flex: 0 0 auto;
                margin-left: auto;
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
            .site-page-tag #header,
            .site-page-archive #header {
                min-width: 0 !important;
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                row-gap: 12px;
            }

            .site-page-article body,
            .site-page-single body,
            .site-page-archive body {
                padding-left: calc(14px + env(safe-area-inset-left)) !important;
                padding-right: calc(14px + env(safe-area-inset-right)) !important;
            }

            .site-page-article #glassShell,
            .site-page-single #glassShell,
            .site-page-archive #glassShell {
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
            .site-page-tag #header .title-right,
            .site-page-archive #header .title-right {
                width: 100%;
                max-width: 100%;
                margin: 0 !important;
                justify-content: center;
                flex-wrap: wrap;
            }

            #header .title-right .site-navigation {
                width: 100%;
                justify-content: center;
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
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0;
            }

            .site-page-tag #header .title-right .site-navigation {
                flex: 1 0 100%;
            }

            .site-page-tag #header .tagTitle {
                min-width: 0;
                width: 100%;
                font-size: 30px;
                line-height: 1.1;
                white-space: nowrap;
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

        @media (min-width: ${MOBILE_BREAKPOINT_PX + 1}px) and (max-width: 920px) {
            .site-page-tag #header {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                row-gap: 14px;
            }

            .site-page-tag #header .tagTitle {
                min-width: 0;
                white-space: nowrap;
            }

            .site-page-tag #header .title-right {
                display: grid;
                grid-template-columns: minmax(260px, 360px) auto;
                width: 100%;
                max-width: 100%;
                margin: 0 !important;
                justify-content: end;
                gap: 8px;
            }

            .site-page-tag #header .title-right .subnav-search {
                width: min(360px, 100%) !important;
                min-width: 0;
                margin: 0 !important;
            }

            .site-page-tag #header .title-right > .site-navigation {
                justify-content: end;
                flex-wrap: nowrap;
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
            // 先设置懒加载/解码属性，再写入 src，避免请求先于属性生效
            if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
            if (!img.hasAttribute('loading')) img.setAttribute('loading', index === 0 ? 'eager' : 'lazy');
            if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
            try {
                img.fetchPriority = index === 0 ? 'high' : 'low';
            } catch (e) {}
            const canonicalSrc = img.getAttribute('data-canonical-src');
            if (canonicalSrc) {
                const parentLink = img.closest('a[href]');
                if (parentLink) parentLink.href = canonicalSrc;
                img.src = canonicalSrc;
            }
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
        const rgba = channels.slice(0, 4).map(Number);
        // 半透明背景色先按 alpha 叠加到白色页面底上，再计算对比度
        const alpha = rgba.length > 3 ? Math.max(0, Math.min(1, rgba[3])) : 1;
        const composited = rgba.slice(0, 3).map(function (channel) {
            return channel * alpha + 255 * (1 - alpha);
        });
        const backgroundLuminance = relativeLuminance(composited);
        const darkLuminance = relativeLuminance([17, 24, 39]);
        const darkContrast = (backgroundLuminance + 0.05) / (darkLuminance + 0.05);
        const lightContrast = 1.05 / (backgroundLuminance + 0.05);
        return darkContrast >= lightContrast ? '#111827' : '#ffffff';
    }

    function applyAccessibleLabelColors(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('.Label').forEach(function (label) {
            if (label.closest('#taglabel') || label.matches('.LabelName,.LabelTime')) return;
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
            enhanceListDates();
        });
        enhanceListDates();
        observer.observe(content, { childList: true, subtree: true });
    }

    markCurrentPageClass();
    removeUnusedNavigationControls();
    normalizeArticleHeadingLevels();
    enhanceSinglePageLinks();
    enhanceListDates();
    enhanceArchiveCounts();
    ensureSkipLink();
    ensureImageDimensions();
    moveRssToFooter();
    repairAboutPage();
    localizeTagPage();
    enhanceDocumentLinks();
    syncThemeColor();
    ensureSiteTypography();
    ensureMobileImprovementsStyle();
    runWhenIdle([normalizeHomeButton, normalizeHeaderLocalNavLinks, watchAccessibleLabelColors, manageMobileFloatingControls]);

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
                // 声明式排除：插件元素可用 data-outside-shell 标记自己不入壳
                if (el.hasAttribute && el.hasAttribute('data-outside-shell')) continue;
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
            height: 230px;
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
            width: 120px;
            height: 120px;
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
            font-size: 40px !important;
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

        ${sharedPageShellCss('1.35')}

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
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
                gap: 5px;
            }
            #header .title-left .avatar {
                width: clamp(72px, 20vw, 84px);
                height: clamp(72px, 20vw, 84px);
                border-width: 3px;
            }
            #header .title-left a.blogTitle {
                font-size: clamp(30px, 8vw, 32px) !important;
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
                margin-top: 4px !important;
            }

            #header .site-navigation {
                flex-wrap: nowrap !important;
            }

            .site-page-home #buttonHome {
                display: none !important;
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
            transition: transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
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

    } 


    // 归档页主题--------------------------------------------------------------------

    else if (currentUrl.includes('/archive.html')) {
        console.log('应用归档页主题');
        const style = document.createElement('style');
        style.innerHTML = `
        ${sharedPageShellCss('1.45')}

        .archiveTitle {
            position: relative;
            padding-left: 16px;
            color: var(--site-ink);
            line-height: 1.08;
        }

        .archiveTitle::before,
        .archiveYear::before {
            content: "";
            position: absolute;
            left: 0;
            border-radius: 999px;
            background: linear-gradient(180deg, var(--site-accent), var(--site-accent-2));
            box-shadow: 0 6px 16px rgba(37, 111, 130, 0.22);
        }

        .archiveTitle::before {
            top: 0.12em;
            width: 5px;
            height: 0.76em;
        }

        .archiveYear {
            position: relative;
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin: 32px 0 12px;
            padding-left: 15px;
            color: var(--site-ink);
            font-size: 24px;
            line-height: 1.2;
        }

        .archiveCount {
            color: var(--site-muted);
            font-size: 13px;
            font-weight: 500;
        }

        .archiveYear::before {
            top: 0.16em;
            width: 4px;
            height: 0.72em;
        }

        .archiveList {
            position: relative;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: var(--site-list-bg);
            border: 1px solid var(--site-line);
            border-radius: var(--site-radius-lg);
            box-shadow: var(--site-shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .archiveList::before {
            content: "";
            position: absolute;
            top: 18px;
            bottom: 18px;
            left: 15px;
            width: 2px;
            background: color-mix(in srgb, var(--site-accent) 28%, transparent);
        }

        .archiveList li {
            position: relative;
            min-height: 54px;
            box-sizing: border-box;
            padding: 12px 16px 12px 38px;
            border-bottom: 1px solid var(--site-line);
            transition: background-color 0.18s ease, box-shadow 0.18s ease;
        }

        .archiveList li::before {
            content: "";
            position: absolute;
            left: 11px;
            top: 50%;
            width: 8px;
            height: 8px;
            border: 2px solid var(--site-panel-strong);
            border-radius: 50%;
            background: var(--site-accent);
            transform: translateY(-50%);
        }

        .archiveList li:last-child {
            border-bottom: 0;
        }

        .archiveList li:hover,
        .archiveList li:focus-within {
            background: var(--site-item-hover-bg);
            box-shadow: inset 4px 0 0 rgba(37, 111, 130, 0.58);
        }

        .archivePost {
            color: var(--site-ink);
            font-weight: 650;
            text-decoration: none;
        }

        .archivePost:hover {
            color: var(--site-link-hover);
            text-decoration: underline;
            text-underline-offset: 3px;
        }

        .archiveDate,
        .archiveMeta {
            color: var(--site-muted);
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            .archiveTitle {
                font-size: 30px;
            }

            .archiveYear {
                margin-top: 26px;
                font-size: 22px;
            }

            .archiveList li {
                grid-template-columns: 80px minmax(0, 1fr);
                gap: 10px;
                padding: 12px;
            }

            .archiveMeta {
                display: none;
            }
        }
        `;
        document.head.appendChild(style);
        ensureBackgroundVideo();
        ensureBackgroundOverlay();
        ensureGlassShell();
        ensureGlobalPolishStyle();
        runWhenIdle([ensureBackToTopButton, insertSponsorInfo]);
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
            transition: transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
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
