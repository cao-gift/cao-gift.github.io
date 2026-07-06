function loadResource(type, attributes) {
    if (type === 'style') {
        const style = document.createElement('style');
        style.textContent = attributes.css;
        document.head.appendChild(style);
    }
}

function createTOC() {
    const tocElement = document.createElement('div');
    tocElement.className = 'toc';
    tocElement.id = 'articleTOC';
    tocElement.setAttribute('role', 'navigation');
    tocElement.setAttribute('aria-label', '文章目录');
        
    const contentContainer = document.querySelector('.markdown-body');
    if (!contentContainer) return;

    const headings = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingNodes = Array.from(headings);
    const usedIds = new Set(
        Array.from(document.querySelectorAll('[id]'))
            .filter(node => !headingNodes.includes(node))
            .map(node => node.id)
            .filter(Boolean)
    );
    const makeHeadingId = (heading, index) => {
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
        usedIds.add(id);
        return id;
    };

    headingNodes.forEach((heading, index) => {
        if (!heading.id || usedIds.has(heading.id)) {
            heading.id = makeHeadingId(heading, index);
        } else {
            usedIds.add(heading.id);
        }
        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;
        
        link.setAttribute('data-id', heading.id);
        
        link.className = 'toc-link';
        link.style.paddingLeft = `${(parseInt(heading.tagName.charAt(1)) - 1) * 10}px`;
        tocElement.appendChild(link);
    });

    
    const backToTop = document.createElement('a');
    backToTop.className = 'toc-end';
    backToTop.href = '#top';
    backToTop.textContent = '返回顶部';
    backToTop.addEventListener('click', function (event) {
        event.preventDefault();
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
    tocElement.appendChild(backToTop);
    // 放到 body 顶层，避免被玻璃容器(backdrop-filter)影响 fixed 定位
    document.body.appendChild(tocElement);
}

function highlightTOC() {
    const tocLinks = document.querySelectorAll('.toc-link');
    const tocElement = document.querySelector('.toc');
    const fromTop = window.scrollY + 10;

    let currentHeading = null;

    tocLinks.forEach(link => {
        const section = document.getElementById(link.getAttribute('data-id'));
        if (section && section.offsetTop <= fromTop) {
            currentHeading = link;
        }
    });

    tocLinks.forEach(link => {
        link.classList.remove('active-toc');
        link.removeAttribute('aria-current');
    });

    if (currentHeading) {
        currentHeading.classList.add('active-toc');
        currentHeading.setAttribute('aria-current', 'true');

        // 只滚动目录自身，避免 scrollIntoView 影响页面滚动（某些环境会导致滚动跳跃/锁死）
        if (tocElement) {
            const linkTop = currentHeading.offsetTop;
            const linkHeight = currentHeading.offsetHeight || 0;
            const targetTop = linkTop - (tocElement.clientHeight / 2) + (linkHeight / 2);
            tocElement.scrollTo({ top: targetTop, behavior: 'auto' });
        }
    }
}

function toggleTOC() {
    const tocElement = document.querySelector('.toc');
    const tocIcon = document.querySelector('.toc-icon');
    if (tocElement && tocIcon) {
        tocElement.classList.toggle('show');
        tocIcon.classList.toggle('active');
        tocIcon.textContent = tocElement.classList.contains('show') ? '✖' : '☰';
        tocIcon.setAttribute('aria-expanded', tocElement.classList.contains('show') ? 'true' : 'false');
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const contentContainer = document.querySelector('.markdown-body');
    if (!contentContainer) return;

    const headingCount = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    if (!headingCount) return;

    createTOC();
    const css = `
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
            background-color: var(--toc-bg);
            border: 1px solid var(--toc-border);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow-y: auto;
            z-index: 1000;
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
            border-radius: 8px;
            color: var(--toc-text);
            text-decoration: none;
            padding: 5px 0;
            font-size: 14px;
            line-height: 1.5;
            border-bottom: 1px solid var(--toc-border);
            transition: background-color 0.2s ease, padding-left 0.2s ease;
        }
        .toc a:last-child {
            border-bottom: none;
        }
        .toc a:hover {
            background-color: var(--toc-hover);
            padding-left: 5px;
            border-radius: 8px;
        }
        .toc a:focus-visible {
            outline: 2px solid var(--toc-icon-active-bg);
            outline-offset: 2px;
        }
        .toc-icon {
            position: fixed;
            bottom: calc(20px + env(safe-area-inset-bottom));
            right: calc(20px + env(safe-area-inset-right));
            cursor: pointer;
            font-size: 24px;
            background-color: var(--toc-icon-bg);
            color: var(--toc-icon-color);
            border: 2px solid var(--toc-icon-color);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            z-index: 1001;
            transition: all 0.3s ease;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            outline: none;
        }
        .toc-icon:focus-visible {
            box-shadow: 0 0 0 4px rgba(129, 60, 133, 0.2), 0 1px 3px rgba(0,0,0,0.12);
        }
        .toc-icon:hover {
            transform: scale(0.9);
        }
        .toc-icon:active {
            transform: scale(0.9);
        }
        .toc-icon.active {
            background-color: var(--toc-icon-active-bg);
            color: var(--toc-icon-active-color);
            border-color: var(--toc-icon-active-bg);
            transform: rotate(90deg);
        }

        .toc-end {
            font-weight: bold;
            text-align: center;
            cursor: pointer;
            visibility: hidden;
            opacity: 0;
            background-color: white;
            padding: 10px;                            /* 可选：增加一些内边距，使按钮更易点击 */
            border-radius: 8px;                       /* 可选：使按钮有圆角 */
            border: 1px solid var(--toc-border);      /* 可选：增加边框，使其更明显 */
        }
        .toc-end.is-visible {
            visibility: visible;
            opacity: 1;
        }
        
        .active-toc {
            font-weight: bold;
            border-radius: 8px;
            background-color: var(--toc-hover);  /* 根据你的设计，可以定制高亮颜色 */
            padding-left: 5px;  /* 可选：增加左边距以突出当前项目 */
        }
    `;
    loadResource('style', {css: css});

    const tocIcon = document.createElement('div');
    tocIcon.className = 'toc-icon';
    tocIcon.setAttribute('role', 'button');
    tocIcon.setAttribute('tabindex', '0');
    tocIcon.setAttribute('aria-label', '展开文章目录');
    tocIcon.setAttribute('aria-controls', 'articleTOC');
    tocIcon.setAttribute('aria-expanded', 'false');
    tocIcon.setAttribute('title', '文章目录');
    tocIcon.textContent = '☰';
    tocIcon.onclick = (e) => {
        e.stopPropagation();
        toggleTOC();
        tocIcon.setAttribute(
            'aria-label',
            tocIcon.classList.contains('active') ? '收起文章目录' : '展开文章目录'
        );
    };
    tocIcon.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        tocIcon.click();
    });
    document.body.appendChild(tocIcon);

    const updateBackToTop = function() {
        const backToTopButton = document.querySelector('.toc-end');
        if (!backToTopButton) return;
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            backToTopButton.classList.add('is-visible');
        } else {
            backToTopButton.classList.remove('is-visible');
        }
    };

    let ticking = false;
    document.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
            updateBackToTop();
            highlightTOC();
            ticking = false;
        });
    }, { passive: true });
    
    document.addEventListener('click', (e) => {
        const tocElement = document.querySelector('.toc');
        if (tocElement && tocElement.classList.contains('show') && !tocElement.contains(e.target) && !e.target.classList.contains('toc-icon')) {
            toggleTOC();
            const tocIcon = document.querySelector('.toc-icon');
            if (tocIcon) tocIcon.setAttribute('aria-label', '展开文章目录');
        }
    });
});
