
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
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.46);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(244, 247, 251, 0.76)),
          radial-gradient(560px 180px at 8% 0%, rgba(99, 102, 241, 0.18), transparent 62%);
        border-radius: 18px;
        padding: 16px 18px;
        margin: 12px 0 22px;
        box-shadow:
          0 18px 48px rgba(15, 23, 42, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.65);
        color: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(16px) saturate(1.18);
        -webkit-backdrop-filter: blur(16px) saturate(1.18);
        transition: background 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      }
      .esa-img-captcha-banner::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 5px;
        background: linear-gradient(180deg, #4f46e5, #06b6d4);
      }
      .esa-img-captcha-banner::after {
        content: "";
        position: absolute;
        inset: auto -40px -48px auto;
        width: 180px;
        height: 180px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(79, 70, 229, 0.16), transparent 68%);
        pointer-events: none;
        opacity: 0.9;
      }
      .esa-img-captcha-content {
        position: relative;
        display: grid;
        grid-template-columns: 52px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
        max-width: 100%;
        box-sizing: border-box;
      }
      .esa-img-captcha-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        overflow: hidden;
        display: grid;
        place-items: center;
        border: 1px solid rgba(79, 70, 229, 0.20);
        background: linear-gradient(135deg, rgba(79, 70, 229, 0.13), rgba(6, 182, 212, 0.15));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
        position: relative;
      }
      .esa-img-captcha-icon::after {
        content: "";
        position: absolute;
        right: -3px;
        bottom: -3px;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 2px solid rgba(255, 255, 255, 0.88);
        background: linear-gradient(135deg, #6366f1, #06b6d4);
        box-shadow: 0 6px 14px rgba(79, 70, 229, 0.22);
      }
      .esa-img-captcha-avatar {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      .esa-img-captcha-main {
        min-width: 0;
        max-width: 100%;
        display: grid;
        gap: 10px;
      }
      .esa-img-captcha-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0;
      }
      .esa-img-captcha-banner-title {
        font-weight: 700;
        margin: 0;
        font-size: 15px;
        line-height: 1.35;
      }
      .esa-img-captcha-banner-desc {
        margin: 0;
        color: rgba(55, 65, 81, 0.92);
        font-size: 14px;
        line-height: 1.55;
      }
      .esa-img-captcha-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }
      #esa-img-captcha-button {
        min-height: 40px;
        padding: 9px 16px;
        border-radius: 12px;
        border: 1px solid rgba(15, 23, 42, 0.06);
        background: linear-gradient(135deg, #111827, #1f2937);
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(17, 24, 39, 0.20);
        transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
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
        min-height: 40px;
        padding: 9px 15px;
        border-radius: 12px;
        border: 1px solid rgba(15, 23, 42, 0.12);
        background: rgba(255, 255, 255, 0.72);
        color: rgba(17, 24, 39, 0.92);
        cursor: pointer;
        font-size: 14px;
        font-weight: 650;
        transition: background 0.16s ease, transform 0.16s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      #esa-img-captcha-skip:hover {
        background: rgba(255, 255, 255, 0.94);
        transform: translateY(-1px);
      }
      #esa-img-captcha-skip[disabled] {
        opacity: 0.58;
        cursor: not-allowed;
        transform: none;
      }
      #esa-img-captcha-skip[disabled]:hover {
        background: rgba(255, 255, 255, 0.72);
        transform: none;
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
      .esa-img-captcha-banner[data-state="success"],
      .esa-img-captcha-banner[data-state="loaded"] {
        border-color: rgba(148, 230, 181, 0.54);
        background:
          linear-gradient(135deg, rgba(244, 255, 249, 0.94), rgba(231, 248, 242, 0.82)),
          radial-gradient(520px 180px at 0% 0%, rgba(34, 197, 94, 0.10), transparent 58%);
        box-shadow:
          0 16px 40px rgba(15, 23, 42, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.72);
      }
      .esa-img-captcha-banner[data-state="success"]::before,
      .esa-img-captcha-banner[data-state="loaded"]::before {
        background: linear-gradient(180deg, #16a34a, #34d399);
      }
      .esa-img-captcha-banner[data-state="success"]::after,
      .esa-img-captcha-banner[data-state="loaded"]::after {
        background: radial-gradient(circle, rgba(34, 197, 94, 0.18), transparent 68%);
      }
      .esa-img-captcha-banner[data-state="paused"] #esa-img-captcha-debug,
      .esa-img-captcha-banner[data-state="cancelled"] #esa-img-captcha-debug {
        border-color: rgba(180, 83, 9, 0.22);
        background: rgba(245, 158, 11, 0.12);
        color: #92400e;
      }
      .esa-img-captcha-banner[data-state="paused"]::before,
      .esa-img-captcha-banner[data-state="cancelled"]::before {
        background: linear-gradient(180deg, #d97706, #f59e0b);
      }
      .esa-img-captcha-banner[data-state="failed"] #esa-img-captcha-debug,
      .esa-img-captcha-banner[data-state="error"] #esa-img-captcha-debug {
        border-color: rgba(220, 38, 38, 0.18);
        background: rgba(239, 68, 68, 0.10);
        color: #b91c1c;
      }
      .esa-img-captcha-banner[data-state="failed"]::before,
      .esa-img-captcha-banner[data-state="error"]::before {
        background: linear-gradient(180deg, #dc2626, #f97316);
      }
      .esa-img-captcha-banner[data-state="success"] #esa-img-captcha-debug {
        border-color: rgba(22, 163, 74, 0.18);
        background: rgba(34, 197, 94, 0.10);
        color: #166534;
      }
      .esa-img-captcha-banner[data-state="loaded"] #esa-img-captcha-debug {
        border-color: rgba(22, 163, 74, 0.18);
        background: rgba(34, 197, 94, 0.10);
        color: #166534;
      }
      .esa-img-captcha-banner[data-state="success"] .esa-img-captcha-main,
      .esa-img-captcha-banner[data-state="loaded"] .esa-img-captcha-main {
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas:
          "heading actions"
          "desc actions";
        column-gap: 14px;
        row-gap: 6px;
        align-items: center;
      }
      .esa-img-captcha-banner[data-state="success"] .esa-img-captcha-heading,
      .esa-img-captcha-banner[data-state="loaded"] .esa-img-captcha-heading {
        grid-area: heading;
      }
      .esa-img-captcha-banner[data-state="success"] .esa-img-captcha-banner-desc,
      .esa-img-captcha-banner[data-state="loaded"] .esa-img-captcha-banner-desc {
        grid-area: desc;
      }
      .esa-img-captcha-banner[data-state="success"] .esa-img-captcha-actions,
      .esa-img-captcha-banner[data-state="loaded"] .esa-img-captcha-actions {
        grid-area: actions;
        justify-self: end;
        align-self: center;
      }
      .esa-img-captcha-banner[data-state="success"] #esa-img-captcha-button[disabled],
      .esa-img-captcha-banner[data-state="loaded"] #esa-img-captcha-button[disabled] {
        opacity: 1;
        cursor: default;
        color: #166534;
        border-color: rgba(34, 197, 94, 0.18);
        background: linear-gradient(135deg, rgba(220, 252, 231, 0.98), rgba(209, 250, 229, 0.92));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
      }
      .esa-img-captcha-banner[data-state="success"] .esa-img-captcha-icon::after,
      .esa-img-captcha-banner[data-state="loaded"] .esa-img-captcha-icon::after {
        background: linear-gradient(135deg, #16a34a, #34d399);
      }
      .esa-img-captcha-banner[data-state="paused"] .esa-img-captcha-icon::after,
      .esa-img-captcha-banner[data-state="cancelled"] .esa-img-captcha-icon::after {
        background: linear-gradient(135deg, #d97706, #f59e0b);
      }
      .esa-img-captcha-banner[data-state="failed"] .esa-img-captcha-icon::after,
      .esa-img-captcha-banner[data-state="error"] .esa-img-captcha-icon::after {
        background: linear-gradient(135deg, #dc2626, #f97316);
      }
      #esa-img-captcha-skip[hidden] {
        display: none !important;
      }
      #esa-img-captcha-element {
        min-height: 1px;
      }
      @media (max-width: 640px) {
        .esa-img-captcha-banner {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          border-radius: 16px;
          padding: 14px 15px;
          margin-left: 0;
          margin-right: 0;
        }
        .esa-img-captcha-content {
          grid-template-columns: 1fr;
          gap: 10px;
          min-width: 0;
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
          width: 100%;
          gap: 8px;
        }
        .esa-img-captcha-banner[data-state="success"] .esa-img-captcha-main,
        .esa-img-captcha-banner[data-state="loaded"] .esa-img-captcha-main {
          grid-template-columns: 1fr;
          grid-template-areas:
            "heading"
            "desc"
            "actions";
        }
        .esa-img-captcha-banner[data-state="success"] .esa-img-captcha-actions,
        .esa-img-captcha-banner[data-state="loaded"] .esa-img-captcha-actions {
          justify-self: stretch;
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
    banner.setAttribute('data-state', 'ready');

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
    title.textContent = '本页图片需验证后查看';

    const debug = document.createElement('div');
    debug.id = 'esa-img-captcha-debug';
    debug.textContent = '准备中';

    const desc = document.createElement('div');
    desc.className = 'esa-img-captcha-banner-desc';
    desc.id = 'esa-img-captcha-desc';
    desc.textContent = '验证后自动加载图片';

    const actions = document.createElement('div');
    actions.className = 'esa-img-captcha-actions';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'esa-img-captcha-button';
    btn.textContent = '验证后查看';
    btn.disabled = true;

    // popup 模式需要用户手势点击触发；这里不做异步“模拟点击”
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      // 不在这里跳转，只由验证码 success 回调统一“解锁并加载图片”
    });

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.id = 'esa-img-captcha-skip';
    skip.textContent = '暂不查看';
    skip.addEventListener('click', function () {
      if (skip.disabled || pendingParam) return;
      setBannerState('paused');
      setTitle('已暂停图片加载');
      setSkipVisible(true);
      setDesc('图片暂不加载，需要时可再查看');
      setDebug('已跳过');
      setButtonState(false, '立即查看');
      setSkipState('暂不查看', true);
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

  function setTitle(text) {
    const t = document.querySelector('#esa-img-captcha-banner .esa-img-captcha-banner-title');
    if (t) t.textContent = text;
  }

  function setBannerState(state) {
    const banner = document.getElementById('esa-img-captcha-banner');
    if (banner) banner.setAttribute('data-state', state || 'ready');
  }

  function setButtonState(disabled, text) {
    const btn = document.getElementById('esa-img-captcha-button');
    if (!btn) return;
    btn.disabled = disabled;
    if (typeof text === 'string') btn.textContent = text;
  }

  function setSkipState(text, disabled) {
    const skip = document.getElementById('esa-img-captcha-skip');
    if (!skip) return;
    if (typeof text === 'string') skip.textContent = text;
    if (typeof disabled === 'boolean') skip.disabled = disabled;
  }

  function setSkipVisible(visible) {
    const skip = document.getElementById('esa-img-captcha-skip');
    if (!skip) return;
    skip.hidden = !visible;
  }

  function applyVerifiedState() {
    setBannerState('success');
    setTitle('图片验证已通过');
    setDesc('验证通过，图片按需显示');
    setDebug('已通过');
    setButtonState(true, '已验证');
    setSkipState('已完成', true);
    setSkipVisible(false);
  }

  function refreshLoadedState() {
    const body = getMarkdownBody();
    if (!body || !pendingParam) return;
    const pendingLazyCount = body.querySelectorAll('img[data-esa-final-src], img[data-esa-final-srcset]').length;
    const loadingCount = Array.from(body.querySelectorAll('img'))
      .filter(isProbablyRealImage)
      .filter((img) => img.getAttribute('data-esa-img-locked') !== '1')
      .filter((img) => {
        const current = img.currentSrc || img.getAttribute('src') || '';
        return current && current !== DEFAULT_TINY_PIXEL && !img.complete;
      }).length;

    if (pendingLazyCount > 0) {
      applyVerifiedState();
      return;
    }
    if (loadingCount > 0) {
      setBannerState('success');
      setTitle('图片验证已通过');
      setDesc('图片正在加载');
      setDebug('已通过');
      setButtonState(true, '已验证');
      setSkipState('已完成', true);
      setSkipVisible(false);
      return;
    }

    setBannerState('loaded');
    setTitle('图片已准备完成');
    setDesc('图片已可查看');
    setDebug('已加载');
    setButtonState(true, '已验证');
    setSkipState('已完成', true);
    setSkipVisible(false);
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
    if (!imgs || imgs.length === 0) {
      refreshLoadedState();
      return;
    }
    disconnectLazyObserver();

    const loadOne = (img) => {
      const finalSrc = img.getAttribute('data-esa-final-src') || '';
      const finalSrcset = img.getAttribute('data-esa-final-srcset') || '';
      if (finalSrc) img.setAttribute('src', finalSrc);
      if (finalSrcset) img.setAttribute('srcset', finalSrcset);
      img.removeAttribute('data-esa-final-src');
      img.removeAttribute('data-esa-final-srcset');
      try {
        img.addEventListener('load', refreshLoadedState, { once: true });
        img.addEventListener('error', refreshLoadedState, { once: true });
      } catch (e) {}
      refreshLoadedState();
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
    refreshLoadedState();
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

    setBannerState('loading');
    setTitle('本页图片需验证后查看');
    setSkipVisible(true);
    setSkipState('暂不查看', true);

    setDesc('正在加载验证组件');
    setDebug('加载中');
    await loadAliyunCaptchaJsOnce();

    if (!window.initAliyunCaptcha) throw new Error('initAliyunCaptcha 不存在');

    // 确保 element 容器在 init 之前就存在
    ensureCaptchaDomScaffold();
    if (!document.getElementById('esa-img-captcha-element')) {
      throw new Error('esa-img-captcha-element 不存在（DOM 未就绪或被移除）');
    }

    setDesc('正在初始化验证');
    setTitle('本页图片需验证后查看');
    setDebug('初始化中');
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
        applyVerifiedState();
        unlockAndLoadAll(captchaVerifyParam);
      },
      fail: function (result) {
        // eslint-disable-next-line no-console
        console.warn('[ESAAIImageCaptcha] 验证失败：', result);
        setBannerState('failed');
        setTitle('验证未通过');
        setSkipVisible(true);
        setDesc('验证未通过，请重试');
        setDebug('未通过');
        setButtonState(false, '重试验证');
        setSkipState('暂不查看', false);
      },
      onError: function (errorInfo) {
        // eslint-disable-next-line no-console
        console.error('[ESAAIImageCaptcha] 初始化错误：', errorInfo);
        setBannerState('error');
        setTitle('图片验证暂不可用');
        setSkipVisible(true);
        setDesc('验证码初始化失败（请检查 ESA 配置/网络/CSP）。');
        setDebug('不可用');
        setButtonState(true, '不可用');
        setSkipState('暂不查看', false);
      },
      onClose: function () {
        // 用户关闭弹窗：不解锁
        if (!pendingParam) {
          setBannerState('cancelled');
          setTitle('验证已取消');
          setSkipVisible(true);
          setDesc('验证已取消');
          setDebug('已取消');
          setButtonState(false, '重新验证');
          setSkipState('暂不查看', false);
        }
      },
    });

    // 满足文档建议的 >2s 间隔后再允许点击
    const waitMs = Math.max(0, (allowVerifyAt || 0) - now());
    if (waitMs > 0) {
      setButtonState(true, `${Math.ceil(waitMs / 100) / 10}s 后可用`);
      await sleep(waitMs);
    }
    ready = true;
    setTitle('本页图片需验证后查看');
    setDesc('验证后自动加载图片');
    setBannerState('ready');
    setSkipVisible(true);
    setDebug('就绪');
    setButtonState(false, '验证后查看');
    setSkipState('暂不查看', false);
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
      ensureBanner();
      document.body.setAttribute('data-esa-img-locked', '1');
      internalUpdate = true;
      try {
        lockImagesOnce();
      } finally {
        internalUpdate = false;
      }
      pendingParam = reused;
      document.body.removeAttribute('data-esa-img-locked');
      applyVerifiedState();
      unlockAndLoadAll(reused);
      refreshLoadedState();
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
      setBannerState('error');
      setTitle('图片验证暂不可用');
      setSkipVisible(true);
      setDesc('验证码组件加载失败，请稍后刷新重试。');
      setDebug('不可用');
      setButtonState(true, '不可用');
      setSkipState('暂不查看', false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

