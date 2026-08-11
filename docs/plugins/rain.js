(function () {
    'use strict';

    // 重复执行守卫
    if (window.__siteRainEffectLoaded) return;
    window.__siteRainEffectLoaded = true;

    // 尊重系统“减少动态效果”设置
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) {}

    if (!document.body) return;

    const MAX_DROPS = 90;          // 同屏雨滴上限，避免无限堆积
    const SPAWN_INTERVAL_MS = 80;  // 生成间隔

    // 样式只作用于雨效果自身的元素，不做任何全局重置
    const style = document.createElement('style');
    style.id = 'site-rain-style';
    style.textContent = `
        #rainBox {
            position: fixed;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
        }
        .rain-drop {
            position: absolute;
            top: -60px;
            width: 2px;
            height: 50px;
            background: linear-gradient(rgba(255, 255, 255, .3), rgba(255, 255, 255, .6));
            animation-name: site-rain-fall;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
            will-change: transform;
        }
        @keyframes site-rain-fall {
            to {
                transform: translate3d(0, calc(100vh + 120px), 0);
            }
        }
    `;
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.id = 'rainBox';
    box.setAttribute('aria-hidden', 'true');
    // 声明不参与 ThemeRuntime 玻璃外壳包裹，避免被 backdrop-filter 容器吞并
    box.setAttribute('data-outside-shell', '');
    document.body.appendChild(box);

    let dropCount = 0;
    let spawnTimer = 0;

    function spawnDrop() {
        if (dropCount >= MAX_DROPS) return;
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = (Math.random() * 100).toFixed(2) + '%';
        drop.style.opacity = (0.25 + Math.random() * 0.75).toFixed(2);
        drop.style.animationDuration = (0.9 + Math.random() * 1.4).toFixed(2) + 's';
        drop.addEventListener('animationend', function () {
            dropCount -= 1;
            drop.remove();
        }, { once: true });
        box.appendChild(drop);
        dropCount += 1;
    }

    function startRain() {
        if (spawnTimer || document.hidden) return;
        spawnTimer = setInterval(spawnDrop, SPAWN_INTERVAL_MS);
    }

    function stopRain() {
        if (!spawnTimer) return;
        clearInterval(spawnTimer);
        spawnTimer = 0;
    }

    // 页面切到后台时停止生成（CSS 动画在后台标签页本身也会暂停）
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            stopRain();
        } else {
            startRain();
        }
    });
    window.addEventListener('pagehide', stopRain);
    window.addEventListener('pageshow', startRain);

    startRain();
})();
