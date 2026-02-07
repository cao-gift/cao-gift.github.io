document.addEventListener('DOMContentLoaded', function() {    
    let currentUrl = window.location.pathname;
    //let currentHost = window.location.hostname;

    // 背景配置：支持图片/视频/自动（桌面端/手机端可单独配置）
    // - video: 优先视频（图片作为加载/失败兜底）
    // - image: 仅图片背景
    // - auto : 若“省流量/减少动态效果”则用图片，否则用视频
    const MOBILE_BREAKPOINT_PX = 720;
    const THEME_BG_MODE_DESKTOP = 'video'; // 'video' | 'image' | 'auto'
    const THEME_BG_MODE_MOBILE = 'video';  // 'video' | 'image' | 'auto'

    // 资源路径（相对 docs/）
    const THEME_BG_IMAGE_DESKTOP = '/img/电脑2.jpg';
    const THEME_BG_VIDEO_DESKTOP = '/img/电脑1.mp4';
    const THEME_BG_IMAGE_MOBILE = '/img/手机1.jpg'; // 建议换更小体积的图片
    const THEME_BG_VIDEO_MOBILE = '/img/手机2.mp4'; // 手机端如需视频可换更小体积

    const themeScript = document.querySelector('script[src*="RonanTheme.js"]');
    const siteRoot = themeScript ? new URL('..', themeScript.src).href : window.location.href;

    function absUrl(relPath) {
        return new URL(relPath, siteRoot).href;
    }

    const bgImageDesktopUrl = absUrl(THEME_BG_IMAGE_DESKTOP);
    const bgVideoDesktopUrl = absUrl(THEME_BG_VIDEO_DESKTOP);
    const bgImageMobileUrl = absUrl(THEME_BG_IMAGE_MOBILE);
    const bgVideoMobileUrl = absUrl(THEME_BG_VIDEO_MOBILE);

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
            const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const saveData = navigator.connection && navigator.connection.saveData;
            return !(prefersReducedMotion || saveData);
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

        const nodes = Array.from(document.body.childNodes);
        for (const node of nodes) {
            if (node && node.nodeType === 1) {
                const el = node;
                if (el.id === 'bgVideo' || el.id === 'bgOverlay') continue;
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

    //主页主题------------------------------------------------------------------------------
    
    if (currentUrl == '/' || currentUrl.includes('/index.html') || currentUrl.includes('/page')) {
        console.log('应用主页主题');
        let style = document.createElement("style");
        style.innerHTML = `
        .blogTitle {
            display: unset;
        }

        #header {
            height: 300px;
        }

        #header h1 {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .avatar {
            width: 200px;
            height: 200px;
        }

        #header h1 a {
            margin-top: 30px;
            font-family: fantasy;
            margin-left: unset;
        }

        html {    
            background: url('${bgImageDesktopUrl}') no-repeat center center fixed;
            background-size: cover;
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            html {
                background-image: url('${bgImageMobileUrl}');
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
            #header { height: clamp(170px, 26vh, 220px); }
            .avatar { width: clamp(96px, 22vw, 120px); height: clamp(96px, 22vw, 120px); }
            #header h1 a { margin-top: clamp(10px, 1.8vh, 14px); font-size: clamp(26px, 8vw, 32px); }
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

        // 添加赞助商信息到页脚
        let footer = document.getElementById('footer');
        let sponsorInfo = document.createElement('div');
        sponsorInfo.className = 'sponsor-info';
        sponsorInfo.innerHTML = '本站由 <a target="_blank" href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral"><img src="../img/logo.png" width="45" height="13" style="fill: currentColor;"></a> 提供 CDN 加速/云存储服务';
        footer.insertBefore(sponsorInfo, footer.firstChild);
    }


    //文章页主题------------------------------------------------------------------------------
    
    else if (currentUrl.includes('/post/') || currentUrl.includes('/link.html') || currentUrl.includes('/about.html')) {
        console.log('文章页主题');

        let style = document.createElement("style");
        style.innerHTML = `

        html {    
            background: url('${bgImageDesktopUrl}') no-repeat center center fixed;
            background-size: cover;
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            html {
                background-image: url('${bgImageMobileUrl}');
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
            line-height: 1.55;
            color: rgba(15, 23, 42, 0.92);
            background: transparent;
            overflow-x: hidden;
            /* 用 margin: 0 auto 居中容器，避免 fixed 元素参与 flex 布局导致偏移 */
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
            #glassShell { padding: clamp(14px, 3.8vw, 18px); border-radius: 16px; }
        }

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
        // 添加赞助商信息到页脚
        let footer = document.getElementById('footer');
        let sponsorInfo = document.createElement('div');
        sponsorInfo.className = 'sponsor-info';
        sponsorInfo.innerHTML = '本站由 <a target="_blank" href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral"><img src="../img/logo.png" width="45" height="13" style="fill: currentColor;"></a> 提供 CDN 加速/云存储服务';
        footer.insertBefore(sponsorInfo, footer.firstChild);
    } 


    // 搜索页主题--------------------------------------------------------------------
    
    else if (currentUrl.includes('/tag')) {
        console.log('应用搜索页主题');
        let style = document.createElement("style");
        style.innerHTML = `
        
        html {    
            background: url('${bgImageDesktopUrl}') no-repeat center center fixed;
            background-size: cover;
        }

        @media (max-width: ${MOBILE_BREAKPOINT_PX}px), (hover: none) and (pointer: coarse) {
            html {
                background-image: url('${bgImageMobileUrl}');
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
            line-height: 1.35;
            color: rgba(15, 23, 42, 0.92);
            background: transparent;
            overflow-x: hidden;
            /* 用 margin: 0 auto 居中容器，避免 fixed 元素参与 flex 布局导致偏移 */
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
            #glassShell { padding: clamp(14px, 3.8vw, 18px); border-radius: 16px; }
        }
        
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
            border-radius: 2em;
            float: unset !important;
        }
        
        .subnav-search-icon {
            top: 9px;
        }
        
        button.btn.float-left {
            display: none;
        }
        
        .subnav-search {
            width: unset; 
            height: 36px;
        }
        `;
        document.head.appendChild(style);
        ensureBackgroundVideo();
        ensureBackgroundOverlay();
        ensureGlassShell();
        // 添加赞助商信息到页脚
        let footer = document.getElementById('footer');
        let sponsorInfo = document.createElement('div');
        sponsorInfo.className = 'sponsor-info';
        sponsorInfo.innerHTML = '本站由 <a target="_blank" href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral"><img src="../img/logo.png" width="45" height="13" style="fill: currentColor;"></a> 提供 CDN 加速/云存储服务';
        footer.insertBefore(sponsorInfo, footer.firstChild);
    
        // 搜索框回车触发
        let input = document.getElementsByClassName("form-control subnav-search-input float-left")[0];
        let button = document.getElementsByClassName("btn float-left")[0];
        input.addEventListener("keyup", function(event) {
            event.preventDefault();
            if (event.keyCode === 13) {
                button.click();
            }
        });
    }
})
