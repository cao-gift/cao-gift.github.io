
(function () {
  'use strict';

  if (window.__ESAAIImageCaptchaLoaded) return;
  window.__ESAAIImageCaptchaLoaded = true;

  // 简单可视化标记：方便排查“脚本是否加载/是否早退”
  try {
    document.documentElement.setAttribute('data-esa-img-plugin', 'loaded');
  } catch (e) {}

  function clearPluginLoadWarnings() {
    try {
      const nodes = Array.from(document.querySelectorAll('#postBody > div, .markdown-body > div'));
      for (const node of nodes) {
        const text = node.textContent || '';
        if (
          text.includes('ESA图片验证插件未加载成功') ||
          text.includes('/plugins/ESAAIImageCaptcha.js')
        ) {
          node.remove();
        }
      }
    } catch (e) {}
  }

  clearPluginLoadWarnings();
  setTimeout(clearPluginLoadWarnings, 1800);

  const DEFAULT_TINY_PIXEL =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

  const cfg = Object.assign(
    {
      prefix: 'esa-pgrds6as5i',
      sceneId: '1nux88n8',
      region: 'cn',
      paramName: 'captcha_verify_param',
      reuseMs: 80000,
      minDelayMs: 1000,
      // ESA 文档示例固定值（一般无需改）
      server: ['captcha-esa-open.aliyuncs.com', 'captcha-esa-open-b.aliyuncs.com'],
      slideStyle: { width: 360, height: 40 },
      // 只保护文章正文内图片
      imageSelector: '.markdown-body img',
    },
    window.ESAAIImageCaptchaConfig || {}
  );

  if (!cfg.prefix || !cfg.sceneId) {
    // eslint-disable-next-line no-console
    console.warn('[ESAAIImageCaptcha] 未配置 prefix/sceneId，插件未启用。');
    try {
      document.documentElement.setAttribute('data-esa-img-plugin', 'disabled');
    } catch (e) {}
    return;
  }

  // AliyunCaptcha.js 读取该全局变量（必须在加载 AliyunCaptcha.js 之前设置）
  window.AliyunCaptchaConfig = {
    region: cfg.region,
    prefix: cfg.prefix,
  };

  const ALIYUN_CAPTCHA_JS = 'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js';

  const storageKey = `esa_img_verified:${cfg.sceneId}:${location.pathname}`;

  let allowVerifyAt = 0;
  let initStarted = false;
  let ready = false;
  let observer = null;
  let pendingParam = null;
  let internalUpdate = false;
  let lockScheduled = false;
  let imgLazyObserver = null;

  function now() {
    return Date.now();
  }

  function readReuse() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.param || !obj.at) return null;
      if (now() - obj.at > cfg.reuseMs) return null;
      return obj.param;
    } catch (e) {
      return null;
    }
  }

  function writeReuse(param) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ param, at: now() }));
    } catch (e) {
      // ignore
    }
  }

  function ensureStyle() {
    if (document.getElementById('esa-img-captcha-style')) return;
    const style = document.createElement('style');
    style.id = 'esa-img-captcha-style';
    style.textContent = `
      /* 未验证时：隐藏正文图片（避免“先加载后隐藏”的闪烁） */
      body[data-esa-img-locked="1"] ${cfg.imageSelector} {
        visibility: hidden !important;
      }
      body[data-esa-img-locked="1"] .esa-img-captcha-banner img {
        visibility: visible !important;
      }
      .esa-img-captcha-banner {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.46);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(244, 247, 251, 0.76)),
          radial-gradient(560px 180px at 8% 0%, rgba(99, 102, 241, 0.18), transparent 62%);
        border-radius: 18px;
        padding: 18px;
        margin: 12px 0 24px;
        box-shadow:
          0 18px 48px rgba(15, 23, 42, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.65);
        color: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(16px) saturate(1.18);
        -webkit-backdrop-filter: blur(16px) saturate(1.18);
      }
      .esa-img-captcha-banner::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 5px;
        background: linear-gradient(180deg, #4f46e5, #06b6d4);
      }
      .esa-img-captcha-content {
        position: relative;
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }
      .esa-img-captcha-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        overflow: hidden;
        display: grid;
        place-items: center;
        border: 1px solid rgba(79, 70, 229, 0.20);
        background: linear-gradient(135deg, rgba(79, 70, 229, 0.13), rgba(6, 182, 212, 0.15));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
      }
      .esa-img-captcha-avatar {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      .esa-img-captcha-main {
        min-width: 0;
      }
      .esa-img-captcha-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 6px;
      }
      .esa-img-captcha-banner-title {
        font-weight: 700;
        margin: 0;
        font-size: 16px;
        line-height: 1.35;
      }
      .esa-img-captcha-banner-desc {
        margin: 0 0 14px 0;
        color: rgba(55, 65, 81, 0.92);
        font-size: 14px;
        line-height: 1.6;
      }
      .esa-img-captcha-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      #esa-img-captcha-button {
        min-height: 42px;
        padding: 10px 16px;
        border-radius: 12px;
        border: 1px solid rgba(15, 23, 42, 0.06);
        background: linear-gradient(135deg, #111827, #1f2937);
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(17, 24, 39, 0.20);
        transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
      }
      #esa-img-captcha-button:not([disabled]):hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 30px rgba(17, 24, 39, 0.24);
      }
      #esa-img-captcha-button[disabled]{
        opacity: 0.6;
        cursor: not-allowed;
        box-shadow: none;
      }
      #esa-img-captcha-skip {
        min-height: 42px;
        padding: 10px 16px;
        border-radius: 12px;
        border: 1px solid rgba(15, 23, 42, 0.12);
        background: rgba(255, 255, 255, 0.72);
        color: rgba(17, 24, 39, 0.92);
        cursor: pointer;
        font-size: 14px;
        font-weight: 650;
        transition: background 0.16s ease, transform 0.16s ease;
      }
      #esa-img-captcha-skip:hover {
        background: rgba(255, 255, 255, 0.94);
        transform: translateY(-1px);
      }
      #esa-img-captcha-debug {
        flex: 0 0 auto;
        max-width: 100%;
        border: 1px solid rgba(79, 70, 229, 0.18);
        background: rgba(79, 70, 229, 0.08);
        color: #3730a3;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
        word-break: break-word;
      }
      #esa-img-captcha-element {
        min-height: 1px;
      }
      @media (max-width: 640px) {
        .esa-img-captcha-banner {
          border-radius: 16px;
          padding: 15px;
        }
        .esa-img-captcha-content {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .esa-img-captcha-icon {
          display: none;
        }
        .esa-img-captcha-heading {
          align-items: flex-start;
          flex-direction: column;
          gap: 8px;
        }
        .esa-img-captcha-actions {
          gap: 8px;
        }
        #esa-img-captcha-button,
        #esa-img-captcha-skip {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getMarkdownBody() {
    return document.querySelector('.markdown-body');
  }

  function ensureBanner() {
    ensureStyle();
    const body = getMarkdownBody();
    if (!body) return;
    if (document.getElementById('esa-img-captcha-banner')) return;

    const banner = document.createElement('div');
    banner.className = 'esa-img-captcha-banner';
    banner.id = 'esa-img-captcha-banner';

    const content = document.createElement('div');
    content.className = 'esa-img-captcha-content';

    const icon = document.createElement('div');
    icon.className = 'esa-img-captcha-icon';

    const avatar = document.createElement('img');
    avatar.className = 'esa-img-captcha-avatar';
    avatar.src = '/img/avatar.webp';
    avatar.alt = '';
    icon.appendChild(avatar);

    const main = document.createElement('div');
    main.className = 'esa-img-captcha-main';

    const heading = document.createElement('div');
    heading.className = 'esa-img-captcha-heading';

    const title = document.createElement('div');
    title.className = 'esa-img-captcha-banner-title';
    title.textContent = '本篇文章包含图片，需要验证后加载';

    const debug = document.createElement('div');
    debug.id = 'esa-img-captcha-debug';
    debug.textContent = '状态：准备中';

    const desc = document.createElement('div');
    desc.className = 'esa-img-captcha-banner-desc';
    desc.id = 'esa-img-captcha-desc';
    desc.textContent = '正在准备验证码组件…';

    const actions = document.createElement('div');
    actions.className = 'esa-img-captcha-actions';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'esa-img-captcha-button';
    btn.textContent = '加载图片（验证）';
    btn.disabled = true;

    // popup 模式需要用户手势点击触发；这里不做异步“模拟点击”
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      // 不在这里跳转，只由验证码 success 回调统一“解锁并加载图片”
    });

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.id = 'esa-img-captcha-skip';
    skip.textContent = '暂不加载图片';
    skip.addEventListener('click', function () {
      // 继续保持锁定
      const d = document.getElementById('esa-img-captcha-desc');
      if (d) d.textContent = '已选择不加载图片（可随时点击上方按钮验证加载）。';
    });

    actions.appendChild(btn);
    actions.appendChild(skip);

    heading.appendChild(title);
    heading.appendChild(debug);
    main.appendChild(heading);
    main.appendChild(desc);
    main.appendChild(actions);
    content.appendChild(icon);
    content.appendChild(main);
    banner.appendChild(content);

    body.insertBefore(banner, body.firstChild);
  }

  function setDesc(text) {
    const d = document.getElementById('esa-img-captcha-desc');
    if (d) d.textContent = text;
  }

  function setButtonState(disabled, text) {
    const btn = document.getElementById('esa-img-captcha-button');
    if (!btn) return;
    btn.disabled = disabled;
    if (typeof text === 'string') btn.textContent = text;
  }

  function setDebug(text) {
    const banner = document.getElementById('esa-img-captcha-banner');
    if (!banner) return;
    let d = document.getElementById('esa-img-captcha-debug');
    if (!d) {
      d = document.createElement('div');
      d.id = 'esa-img-captcha-debug';
      banner.appendChild(d);
    }
    d.textContent = text || '';
  }

  function isProbablyRealImage(img) {
    if (!img) return false;
    if (img.closest && img.closest('#esa-img-captcha-banner')) return false;
    // 过滤 1x1 像素、站内图标等：只拦正文图片，已通过 selector 限制范围
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w && h && w <= 24 && h <= 24) return false;
    return true;
  }

  function getOrig(img) {
    return img.getAttribute('data-esa-orig-src') || '';
  }

  function setOrig(img, src) {
    img.setAttribute('data-esa-orig-src', src || '');
  }

  function getOrigSrcset(img) {
    return img.getAttribute('data-esa-orig-srcset') || '';
  }

  function setOrigSrcset(img, srcset) {
    if (srcset) img.setAttribute('data-esa-orig-srcset', srcset);
  }

  function withParam(urlLike, param) {
    const u = new URL(urlLike, location.href);
    u.searchParams.set(cfg.paramName, param);
    return u.toString();
  }

  function withParamSrcset(srcset, param) {
    // srcset: "url1 1x, url2 2x"
    return srcset
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((item) => {
        const segs = item.split(/\s+/);
        const url = segs[0];
        const rest = segs.slice(1).join(' ');
        const fixed = withParam(url, param);
        return rest ? `${fixed} ${rest}` : fixed;
      })
      .join(', ');
  }

  function lockImagesOnce() {
    const body = getMarkdownBody();
    if (!body) return 0;
    const imgs = Array.from(body.querySelectorAll('img'));
    let locked = 0;
    for (const img of imgs) {
      if (!isProbablyRealImage(img)) continue;

      // 已锁定且已是占位图：跳过，避免触发 MutationObserver 自循环导致内存增长
      const alreadyLocked = img.getAttribute('data-esa-img-locked') === '1';
      const curSrcAttr0 = img.getAttribute('src') || '';
      if (alreadyLocked && curSrcAttr0 === DEFAULT_TINY_PIXEL) continue;

      // 记录原始 src/srcset（若后续脚本修改 src，我们用 observer 继续更新原始值）
      const curSrcAttr = img.getAttribute('src');
      const curSrcset = img.getAttribute('srcset');
      if (curSrcAttr && curSrcAttr !== DEFAULT_TINY_PIXEL) {
        setOrig(img, curSrcAttr);
      } else if (!getOrig(img) && img.src && img.src !== DEFAULT_TINY_PIXEL) {
        setOrig(img, img.src);
      }
      if (curSrcset) setOrigSrcset(img, curSrcset);

      // 未验证：移除真正的 src/srcset，避免继续加载
      img.setAttribute('src', DEFAULT_TINY_PIXEL);
      img.removeAttribute('srcset');
      img.setAttribute('data-esa-img-locked', '1');
      // 提前给 lazy 字段（解锁后仍然可用）
      try {
        img.loading = 'lazy';
        img.decoding = 'async';
        img.fetchPriority = 'low';
      } catch (e) {}
      locked++;
    }
    return locked;
  }

  function disconnectLazyObserver() {
    if (imgLazyObserver) {
      try {
        imgLazyObserver.disconnect();
      } catch (e) {}
      imgLazyObserver = null;
    }
  }

  function startLazyLoadFor(imgs) {
    if (!imgs || imgs.length === 0) return;
    disconnectLazyObserver();

    const loadOne = (img) => {
      const finalSrc = img.getAttribute('data-esa-final-src') || '';
      const finalSrcset = img.getAttribute('data-esa-final-srcset') || '';
      if (finalSrc) img.setAttribute('src', finalSrc);
      if (finalSrcset) img.setAttribute('srcset', finalSrcset);
      img.removeAttribute('data-esa-final-src');
      img.removeAttribute('data-esa-final-srcset');
    };

    if (!('IntersectionObserver' in window)) {
      for (const img of imgs) loadOne(img);
      return;
    }

    imgLazyObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const img = entry.target;
          try {
            imgLazyObserver.unobserve(img);
          } catch (e) {}
          loadOne(img);
        }
      },
      { root: null, rootMargin: '300px 0px', threshold: 0.01 }
    );

    for (const img of imgs) {
      imgLazyObserver.observe(img);
    }
  }

  function unlockAndLoadAll(param) {
    const body = getMarkdownBody();
    if (!body) return;
    const imgs = Array.from(body.querySelectorAll('img[data-esa-img-locked="1"]'));
    const lazyList = [];
    for (const img of imgs) {
      const orig = getOrig(img);
      const origSrcset = getOrigSrcset(img);
      // 验证成功后再启用懒加载：先写入 data-esa-final-*，进入视口再真正发起请求
      if (orig) img.setAttribute('data-esa-final-src', withParam(orig, param));
      if (origSrcset) img.setAttribute('data-esa-final-srcset', withParamSrcset(origSrcset, param));
      img.removeAttribute('data-esa-img-locked');
      lazyList.push(img);
    }
    // 开始懒加载（视口内图片会很快触发加载）
    startLazyLoadFor(lazyList);
  }

  function disconnectObserver() {
    if (observer) {
      try {
        observer.disconnect();
      } catch (e) {}
      observer = null;
    }
  }

  function observeImageMutations() {
    const root = getMarkdownBody() || document.body;
    if (!root) return;
    observer = new MutationObserver(function (mutations) {
      if (pendingParam) return; // 已解锁就不再处理
      if (internalUpdate) return;

      // 节流：合并多次变更，避免反复锁图造成内存/CPU上升
      let needLock = false;
      for (const m of mutations) {
        if (m.type === 'childList') {
          needLock = true;
          break;
        }
        if (m.type === 'attributes' && m.target && m.target.tagName === 'IMG') {
          needLock = true;
          break;
        }
      }
      if (!needLock) return;
      if (lockScheduled) return;
      lockScheduled = true;
      requestAnimationFrame(function () {
        lockScheduled = false;
        if (pendingParam || internalUpdate) return;
        internalUpdate = true;
        try {
          document.body.setAttribute('data-esa-img-locked', '1');
          lockImagesOnce();
        } finally {
          internalUpdate = false;
        }
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'data-canonical-src'],
    });
  }

  function loadAliyunCaptchaJsOnce() {
    if (window.__ESAAIImageCaptchaAliyunPromise) return window.__ESAAIImageCaptchaAliyunPromise;
    window.__ESAAIImageCaptchaAliyunPromise = new Promise(function (resolve, reject) {
      if (window.initAliyunCaptcha) {
        if (!allowVerifyAt) allowVerifyAt = now() + cfg.minDelayMs;
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = ALIYUN_CAPTCHA_JS;
      s.async = true;
      s.onload = function () {
        allowVerifyAt = now() + cfg.minDelayMs;
        resolve();
      };
      s.onerror = function () {
        reject(new Error('AliyunCaptcha.js 加载失败'));
      };
      document.head.appendChild(s);
    });
    return window.__ESAAIImageCaptchaAliyunPromise;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function ensureCaptchaReady() {
    if (ready) return;
    if (initStarted) {
      while (!ready) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(50);
      }
      return;
    }
    initStarted = true;

    setDesc('正在加载验证码组件…');
    setDebug(`状态：加载中（${new Date().toLocaleTimeString()}）`);
    await loadAliyunCaptchaJsOnce();

    if (!window.initAliyunCaptcha) throw new Error('initAliyunCaptcha 不存在');

    // 确保 element 容器在 init 之前就存在
    ensureCaptchaDomScaffold();
    if (!document.getElementById('esa-img-captcha-element')) {
      throw new Error('esa-img-captcha-element 不存在（DOM 未就绪或被移除）');
    }

    setDesc('正在初始化验证码…');
    setDebug('状态：初始化中…');
    window.initAliyunCaptcha({
      SceneId: cfg.sceneId,
      mode: 'popup',
      element: '#esa-img-captcha-element',
      button: '#esa-img-captcha-button',
      server: cfg.server,
      slideStyle: cfg.slideStyle,
      getInstance: function () {},
      success: function (captchaVerifyParam) {
        pendingParam = captchaVerifyParam;
        writeReuse(captchaVerifyParam);
        disconnectObserver();
        disconnectLazyObserver();
        document.body.removeAttribute('data-esa-img-locked');
        setDesc('验证成功，正在加载图片…');
        setDebug('状态：验证成功');
        setButtonState(true, '已验证');
        unlockAndLoadAll(captchaVerifyParam);
      },
      fail: function (result) {
        // eslint-disable-next-line no-console
        console.warn('[ESAAIImageCaptcha] 验证失败：', result);
        setDesc('验证未通过，请重试（图片仍不会加载）。');
        try {
          setDebug('失败信息：' + JSON.stringify(result));
        } catch (e) {
          setDebug('失败信息：' + String(result));
        }
        setButtonState(false, '重试验证并加载图片');
      },
      onError: function (errorInfo) {
        // eslint-disable-next-line no-console
        console.error('[ESAAIImageCaptcha] 初始化错误：', errorInfo);
        setDesc('验证码初始化失败（请检查 ESA 配置/网络/CSP）。');
        try {
          setDebug('错误信息：' + JSON.stringify(errorInfo));
        } catch (e) {
          setDebug('错误信息：' + String(errorInfo));
        }
        setButtonState(true, '不可用');
      },
      onClose: function () {
        // 用户关闭弹窗：不解锁
        if (!pendingParam) {
          setDesc('已关闭验证窗口（图片仍不会加载）。');
          setDebug('状态：已关闭验证窗口');
          setButtonState(false, '验证并加载图片');
        }
      },
    });

    // 满足文档建议的 >2s 间隔后再允许点击
    const waitMs = Math.max(0, (allowVerifyAt || 0) - now());
    if (waitMs > 0) {
      setButtonState(true, `请稍候 ${Math.ceil(waitMs / 100) / 10}s…`);
      await sleep(waitMs);
    }

    ready = true;
    setDesc('点击按钮完成验证后，将以懒加载方式加载本篇图片');
    setDebug('状态：就绪');
    setButtonState(false, '验证并加载图片');
  }

  function ensureCaptchaDomScaffold() {
    // initAliyunCaptcha 的 element 需要存在（即使 popup 也建议预留）
    const banner = document.getElementById('esa-img-captcha-banner');
    if (!banner) return;
    if (document.getElementById('esa-img-captcha-element')) return;
    const holder = document.createElement('div');
    holder.id = 'esa-img-captcha-element';
    holder.style.cssText = 'min-height: 1px;';
    banner.appendChild(holder);
  }

  async function boot() {
    const body = getMarkdownBody();
    if (!body) return;

    const imgs = Array.from(body.querySelectorAll('img')).filter(isProbablyRealImage);
    if (imgs.length === 0) {
      try {
        document.documentElement.setAttribute('data-esa-img-plugin', 'no-images');
      } catch (e) {}
      return;
    }

    // session 复用：已验证则直接恢复图片（避免重复验证）
    const reused = readReuse();
    if (reused) {
      pendingParam = reused;
      document.body.removeAttribute('data-esa-img-locked');
      unlockAndLoadAll(reused);
      try {
        document.documentElement.setAttribute('data-esa-img-plugin', 'reused');
      } catch (e) {}
      return;
    }

    // 未验证：锁定并隐藏图片
    document.body.setAttribute('data-esa-img-locked', '1');
    try {
      document.documentElement.setAttribute('data-esa-img-plugin', 'locked');
    } catch (e) {}
    ensureBanner();
    ensureCaptchaDomScaffold();
    internalUpdate = true;
    try {
      lockImagesOnce();
    } finally {
      internalUpdate = false;
    }
    observeImageMutations();

    // 预加载验证码组件，用户点击按钮即可弹出
    try {
      await ensureCaptchaReady();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ESAAIImageCaptcha] 启动失败：', e);
      setDesc('验证码组件加载失败，请稍后刷新重试。');
      setButtonState(true, '不可用');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

