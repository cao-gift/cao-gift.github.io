# 项目说明（AGENTS）

## 1. 项目概览

这是一个基于 **Gmeek** 生成的个人静态博客仓库，仓库名对应 GitHub Pages 站点：

- GitHub 仓库：`cao-gift/cao-gift.github.io`
- 线上主站：[https://blog.freeblock.cn](https://blog.freeblock.cn)

博客内容主要来自 GitHub Issues，经 GitHub Actions 触发 Gmeek 生成静态页面，再将生成结果部署到多个平台。

当前站点名称与品牌信息：

- 站点标题：`星源笔记`
- 展示标题：`CJW`
- 副标题：`一位热爱探索互联网的大学生`
- 头像：`/img/avatar.webp`


## 2. 目录结构

仓库当前的核心目录如下：

- `backup/`
  - 文章备份目录
  - 里面是 Markdown 备份内容
  - 这是内容备份，不是前端运行时代码

- `docs/`
  - GitHub Action 生成后的静态站点输出目录
  - 也是当前网站部署根目录
  - 包含首页、文章页、单页、RSS、图片、插件脚本等实际部署文件

- `static/`
  - 静态资源源目录
  - 包含图片、插件 JS、CSS、验证文件等
  - 这里的很多内容会被复制/反映到 `docs/`

- `.github/workflows/`
  - GitHub Actions 工作流
  - 负责生成博客、部署、同步到其他平台

- `.github/refresh-dogecloud.py`
  - 多吉云 CDN 刷新脚本


## 3. 关键文件说明

### 3.1 站点配置

- `config.json`
  - Gmeek 的主配置文件
  - 定义站点标题、副标题、主题、脚本注入、单页、备案号、统计脚本等
  - `allHead` 中会注入 `/plugins/Theme.js` 和 Microsoft Clarity 脚本
  - `script` 中会注入：
    - `/plugins/ArticleTOC.js`
    - `/plugins/lightbox.js`
    - 一段图片链接修正脚本

- `blogBase.json`
  - Gmeek 生成后的站点元数据
  - 含文章列表、标签颜色、单页信息、文章描述、文章路径等
  - 可以把它看成当前生成结果的“站点索引”

- `README.md`
  - 当前主要是站点统计信息的展示页，不是维护文档

- `wrangler.jsonc`
  - Cloudflare/Wrangler 资产配置
  - 指向 `./docs` 作为静态资源目录

- `static/staticwebapp.config.json`
- `docs/staticwebapp.config.json`
  - Azure Static Web Apps 的 404 重写配置


### 3.2 前端插件与主题脚本

前端行为目前主要集中在 `static/plugins/` 与 `docs/plugins/`。

重点文件如下：

- `Theme.js`
  - 全站主题与页面布局核心脚本
  - 负责：
    - 首页、文章页、标签页的整体主题注入
    - 玻璃拟态外壳 `#glassShell`
    - 背景图/背景视频切换
    - 页脚赞助信息插入
    - 文章页加载 ESA 图片验证插件
  - 当前已改为：
    - 桌面端背景模式：`image`
    - 移动端背景模式：`image`
  - 即当前背景视频已关闭，改为图片背景

- `ArticleTOC.js`
  - 文章目录悬浮插件
  - 自动扫描 `.markdown-body` 中的标题并生成右下角目录

- `lightbox.js`
  - 图片灯箱插件
  - 点击文章图片可全屏查看、切换、关闭

- `ESAAIImageCaptcha.js`
  - 文章图片验证插件
  - 用于在文章页中先锁定正文图片，完成 ESA 验证后再懒加载图片
  - 当前已做过较多定制，包括：
    - 自定义卡片 UI
    - 使用头像替代默认占位图标
    - 更短的中文文案
    - `暂不查看 / 重新验证 / 已加载` 等状态切换
    - 验证成功后按需懒加载图片

- `primer.css`
  - 自定义样式文件，通过 `config.json` 注入

- `rain.js`
  - 当前不是这轮维护重点，属于附加视觉脚本


## 4. 内容来源与生成机制

这个博客不是典型“手写 HTML”项目，而是 **GitHub Issues -> Gmeek -> docs 静态页面** 的链路。

已知生成逻辑：

1. 仓库 Issue 变化时触发 `.github/workflows/Gmeek.yml`
2. Action 拉取 Gmeek 源码
3. 使用 `config.json` 和仓库数据生成站点
4. 生成后的内容输出为：
   - `docs/`
   - `backup/`
   - `blogBase.json`
5. 生成结果提交回当前仓库

因此：

- `docs/` 是部署产物
- `backup/` 是文章备份
- 日常维护不是“重写页面模板”，而是围绕 Gmeek 输出结果做定制


## 5. 部署链路

### 5.1 GitHub Pages

`Gmeek.yml` 会：

- 生成博客
- 上传 `docs` 作为 Pages artifact
- 部署到 GitHub Pages


### 5.2 又拍云

`.github/workflows/action.yml` 会在 `build Gmeek` 完成后执行：

- 将 `docs/` 上传到又拍云


### 5.3 多吉云 CDN 刷新

同一个工作流中还会：

- 等待 120 秒
- 运行 `.github/refresh-dogecloud.py`
- 调用多吉云 API 刷新 `https://blog.freeblock.cn/*`


### 5.4 服务器 SCP 部署

`.github/workflows/部署到服务器.yml` 会：

- 使用 `appleboy/scp-action`
- 将 `./docs` 拷贝到服务器目录：
  - `/www/wwwroot/blog.freeblock.cn`


### 5.5 Azure Static Web Apps

`.github/workflows/azure-static-web-apps-wonderful-wave-0ae3fbc00.yml` 会：

- 在 `main` 分支 push 后部署
- 使用 `./docs` 作为应用目录


## 6. 当前维护约束（非常重要）

这是用户已明确给出的维护规则，后续必须遵守：

1. `docs` 是 GitHub Action 输出文件夹，也是网站部署根目录
2. `backup` 是文章备份文件夹
3. `static` 是静态资源文件夹
4. **以后修改网站，只可以修改 JS 文件（添加或者修改）**

这意味着：

- 不应随意修改 HTML 内容结构
- 不应主动改 Markdown 备份内容来实现站点样式功能
- 不应优先改 CSS 文件或配置文件来做这类站点改造
- 对站点表现层的定制，应优先通过 JS 注入样式、结构、行为


## 7. 当前实际维护方式

结合仓库现状，实际工作方式应理解为：

- `static/plugins/*.js` 是“源插件脚本”
- `docs/plugins/*.js` 是当前线上部署实际会读取到的脚本

因为 `docs` 是部署根目录，而本地预览与线上部署常直接读取 `docs` 下的脚本，所以：

- **改动插件时，通常需要同时同步修改 `static/plugins/` 与 `docs/plugins/`**

本项目最近的实际维护就是按这个方式进行的，尤其是：

- `Theme.js`
- `ESAAIImageCaptcha.js`


## 8. 本地调试特点

本地调试时，常见访问地址为：

- `http://127.0.0.1:8080/`
- 例如文章页：
  - `http://127.0.0.1:8080/post/36.html`

当前已确认：

- 本地服务可以直接读取 `docs/` 作为站点内容
- 调试插件时，访问的是 `docs` 输出后的页面和脚本

因此前端行为修改后，建议本地验证以下页面：

- 首页：`/`
- 标签页：`/tag.html`
- 单页：`/about.html`、`/link.html`
- 文章页：`/post/*.html`


## 9. 文章与页面分布

目前仓库中已存在的文章页面包括：

- `docs/post/4.html`
- `docs/post/18.html`
- `docs/post/20.html`
- `docs/post/35.html`
- `docs/post/36.html`

其中：

- `post/36.html` 是近期前端插件调试重点页面
- `post/20.html` 含大量图片，是图片验证插件的重要测试对象

单页包括：

- `docs/about.html`
- `docs/link.html`


## 10. 近期已经确认的前端定制点

### 10.1 背景资源

当前主题脚本中使用的图片资源：

- 桌面端图片：`/img/电脑2.jpg`
- 移动端图片：`/img/手机1.jpg`

视频资源仍在仓库中，但主题已切换到图片模式：

- 桌面端视频：`/img/电脑1.mp4`
- 移动端视频：`/img/手机2.mp4`


### 10.2 图片验证插件

ESA 图片验证插件由 `Theme.js` 在文章页动态加载：

- 配置键：`window.ESAAIImageCaptchaConfig`
- 插件脚本：`/plugins/ESAAIImageCaptcha.js`

当前已知行为：

- 只处理正文图片：`.markdown-body img`
- 未验证时锁图
- 验证成功后带参数恢复真实图片地址
- 使用懒加载逻辑按需加载图片
- 已支持：
  - 就绪
  - 暂不查看
  - 验证失败
  - 验证取消
  - 已通过
  - 已加载


## 11. 修改建议

后续如果继续维护这个仓库，建议遵守以下原则：

1. 优先阅读 `Theme.js`，它是全站视觉和插件装配入口
2. 涉及图片保护逻辑时，优先阅读 `ESAAIImageCaptcha.js`
3. 只做前端展示/交互修改时，优先改 JS，不主动改 HTML 产物结构
4. 如果修改的是插件脚本，记得同步到：
   - `static/plugins/...`
   - `docs/plugins/...`
5. 本地验证优先在 `post/36.html` 和含图较多的文章页上完成
6. 不要把 `docs` 当作“可随意重构的源代码目录”，它本质上是生成结果和部署根目录


## 12. 给后续代理/维护者的简短结论

这是一个基于 Gmeek 的静态博客仓库，真正的站点交互定制主要靠 `Theme.js` 和若干插件 JS 完成。  
用户已经明确要求：**后续网站修改只动 JS 文件**。  
在当前仓库实践中，任何会影响前台实际展示的插件修改，都应同步更新 `static/plugins` 和 `docs/plugins`。
