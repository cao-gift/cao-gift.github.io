(function articleTOCPlugin() {
    'use strict';

    if (window.__articleTOCScriptLoaded) return;
    window.__articleTOCScriptLoaded = true;

    function prefersReducedMotion() {
        try {
            return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) {
            return false;
        }
    }

    function ensureStyle() {
        if (document.getElementById('article-toc-style')) return;
        const style = document.createElement('style');
        style.id = 'article-toc-style';
        style.textContent = `
            :root {
                --toc-bg: rgba(237, 239, 233, 0.84);
                --toc-border: #e1e4e8;
                --toc-text: #24292e;
                --toc-hover: #8ae9c4;
                --toc-icon-bg: #fff;
                --toc-icon-color: #ad6598;
                --toc-icon-active-bg: #813c85;
                --toc-icon-active-color: #fff;
            }

            .toc {
                position: fixed;
                bottom: calc(60px + env(safe-area-inset-bottom));
                right: calc(20px + env(safe-area-inset-right));
                width: 250px;
                max-width: calc(100vw - 40px - env(safe-area-inset-left) - env(safe-area-inset-right));
                max-height: 70vh;
                padding: 10px;
                overflow-y: auto;
                z-index: 1000;
                color: var(--toc-text);
                background-color: var(--toc-bg);
                border: 1px solid var(--toc-border);
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                opacity: 0;
                visibility: hidden;
                transform: translateY(20px) scale(0.9);
                transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
            }

            .toc.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }

            .toc a {
                display: block;
                padding: 5px 0;
                color: var(--toc-text);
                font-size: 14px;
                line-height: 1.5;
                text-decoration: none;
                border-bottom: 1px solid var(--toc-border);
                border-radius: 8px;
                transition: background-color 0.2s ease, padding-left 0.2s ease;
            }

            .toc a:last-child {
                border-bottom: 0;
            }

            .toc a:hover,
            .toc a.active-toc {
                padding-left: 5px;
                background-color: var(--toc-hover);
            }

            .toc a.active-toc {
                font-weight: 700;
            }

            .toc a:focus-visible {
                outline: 2px solid var(--toc-icon-active-bg);
                outline-offset: 2px;
            }

            .toc-icon {
                position: fixed;
                bottom: calc(20px + env(safe-area-inset-bottom));
                right: calc(20px + env(safe-area-inset-right));
                z-index: 1001;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                color: var(--toc-icon-color);
                font: inherit;
                font-size: 24px;
                line-height: 1;
                background-color: var(--toc-icon-bg);
                border: 2px solid var(--toc-icon-color);
                border-radius: 50%;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
                cursor: pointer;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                transition: transform 0.3s ease, background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
            }

            .toc-icon:focus-visible {
                outline: none;
                box-shadow: 0 0 0 4px rgba(129, 60, 133, 0.2), 0 1px 3px rgba(0, 0, 0, 0.12);
            }

            .toc-icon:hover,
            .toc-icon:active {
                transform: scale(0.9);
            }

            .toc-icon.active {
                color: var(--toc-icon-active-color);
                background-color: var(--toc-icon-active-bg);
                border-color: var(--toc-icon-active-bg);
                transform: rotate(90deg);
            }

            .toc-end {
                padding: 10px !important;
                font-weight: 700;
                text-align: center;
                background-color: #fff;
                border: 1px solid var(--toc-border) !important;
                border-radius: 8px;
                opacity: 0;
                visibility: hidden;
            }

            .toc-end.is-visible {
                opacity: 1;
                visibility: visible;
            }

            @media (prefers-reduced-motion: reduce) {
                .toc,
                .toc a,
                .toc-icon {
                    transition-duration: 0.01ms !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function assignHeadingIds(headings) {
        const headingSet = new Set(headings);
        const usedIds = new Set(
            Array.from(document.querySelectorAll('[id]'))
                .filter((node) => !headingSet.has(node))
                .map((node) => node.id)
                .filter(Boolean)
        );

        headings.forEach((heading, index) => {
            const existingId = heading.id;
            if (existingId && !usedIds.has(existingId)) {
                usedIds.add(existingId);
                return;
            }

            const base = heading.textContent.trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w\u4e00-\u9fa5-]/g, '')
                .replace(/^-+|-+$/g, '')
                .toLowerCase() || `heading-${index + 1}`;
            let id = base;
            let count = 2;
            while (usedIds.has(id)) {
                id = `${base}-${count}`;
                count += 1;
            }
            heading.id = id;
            usedIds.add(id);
        });
    }

    function initArticleTOC() {
        if (window.__siteArticleTOCReady) return;

        const content = document.querySelector('.markdown-body');
        if (!content) return;
        const headings = Array.from(content.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        if (!headings.length) return;

        window.__siteArticleTOCReady = true;
        ensureStyle();
        assignHeadingIds(headings);

        const toc = document.createElement('nav');
        toc.className = 'toc';
        toc.id = 'articleTOC';
        toc.setAttribute('aria-label', '文章目录');
        toc.setAttribute('aria-hidden', 'true');

        const links = headings.map((heading) => {
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent;
            link.dataset.id = heading.id;
            link.className = 'toc-link';
            link.style.paddingLeft = `${(Number(heading.tagName.slice(1)) - 1) * 10}px`;
            toc.appendChild(link);
            return link;
        });

        const backToTop = document.createElement('a');
        backToTop.className = 'toc-end';
        backToTop.href = '#top';
        backToTop.textContent = '返回顶部';
        backToTop.addEventListener('click', function (event) {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        });
        toc.appendChild(backToTop);
        document.body.appendChild(toc);

        const tocButton = document.createElement('button');
        tocButton.type = 'button';
        tocButton.className = 'toc-icon';
        tocButton.setAttribute('aria-label', '展开文章目录');
        tocButton.setAttribute('aria-controls', 'articleTOC');
        tocButton.setAttribute('aria-expanded', 'false');
        tocButton.title = '文章目录';
        tocButton.textContent = '☰';
        document.body.appendChild(tocButton);

        let headingPositions = [];
        let activeIndex = -1;
        let scrollTicking = false;
        let layoutTicking = false;

        function setTOCOpen(open) {
            toc.classList.toggle('show', open);
            toc.setAttribute('aria-hidden', open ? 'false' : 'true');
            tocButton.classList.toggle('active', open);
            tocButton.textContent = open ? '✖' : '☰';
            tocButton.setAttribute('aria-expanded', open ? 'true' : 'false');
            tocButton.setAttribute('aria-label', open ? '收起文章目录' : '展开文章目录');
        }

        function findActiveIndex(scrollTop) {
            let low = 0;
            let high = headingPositions.length - 1;
            let result = -1;
            while (low <= high) {
                const middle = (low + high) >> 1;
                if (headingPositions[middle] <= scrollTop) {
                    result = middle;
                    low = middle + 1;
                } else {
                    high = middle - 1;
                }
            }
            return result;
        }

        function setActiveIndex(nextIndex) {
            if (nextIndex === activeIndex) return;

            if (activeIndex >= 0 && links[activeIndex]) {
                links[activeIndex].classList.remove('active-toc');
                links[activeIndex].removeAttribute('aria-current');
            }

            activeIndex = nextIndex;
            if (activeIndex < 0 || !links[activeIndex]) return;

            const activeLink = links[activeIndex];
            activeLink.classList.add('active-toc');
            activeLink.setAttribute('aria-current', 'true');
            const targetTop = activeLink.offsetTop - (toc.clientHeight / 2) + (activeLink.offsetHeight / 2);
            toc.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
        }

        function updateScrollState() {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            backToTop.classList.toggle('is-visible', scrollTop > 20);
            setActiveIndex(findActiveIndex(scrollTop + 24));
        }

        function measureHeadings() {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            headingPositions = headings.map((heading) => heading.getBoundingClientRect().top + scrollTop);
            updateScrollState();
        }

        function scheduleMeasure() {
            if (layoutTicking) return;
            layoutTicking = true;
            window.requestAnimationFrame(function () {
                layoutTicking = false;
                measureHeadings();
            });
        }

        tocButton.addEventListener('click', function (event) {
            event.stopPropagation();
            setTOCOpen(!toc.classList.contains('show'));
        });

        document.addEventListener('click', function (event) {
            if (!toc.classList.contains('show')) return;
            if (toc.contains(event.target) || tocButton.contains(event.target)) return;
            setTOCOpen(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' || !toc.classList.contains('show')) return;
            setTOCOpen(false);
            tocButton.focus();
        });

        document.addEventListener('scroll', function () {
            if (scrollTicking) return;
            scrollTicking = true;
            window.requestAnimationFrame(function () {
                scrollTicking = false;
                updateScrollState();
            });
        }, { passive: true });

        window.addEventListener('resize', scheduleMeasure, { passive: true });
        window.addEventListener('load', scheduleMeasure, { once: true });

        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(scheduleMeasure);
            resizeObserver.observe(content);
        } else {
            content.querySelectorAll('img').forEach((img) => {
                img.addEventListener('load', scheduleMeasure, { once: true });
                img.addEventListener('error', scheduleMeasure, { once: true });
            });
        }

        measureHeadings();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArticleTOC, { once: true });
    } else {
        initArticleTOC();
    }
})();
