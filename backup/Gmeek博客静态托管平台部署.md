备案域名建议部署到EdgeOne Pages（选择全球加速区，有中国大陆节点），未备案域名优先选择Netlify或者Vercel。

### 部署到EdgeOne Pages

#### 1.打开EdgeOne Pages

打开[网址](https://console.cloud.tencent.com/edgeone/pages)，登录腾讯云账号

#### 2.部署项目

点击导入项目，授权GitHub账号

![1](https://t.freeblock.cn/2025/07/31/20250731141004703.png)

![img](https://t.freeblock.cn/2025/07/31/20250731141014767.jpg)

找到自己的博客仓库，备案域名可选择全球加速区（含中国大陆）

![2](https://t.freeblock.cn/2025/07/31/20250731141022054.png)

根目录填写**./docs** 然后点击开始部署。平台就开始构建部署了。稍等一会即提示部署成功！

![3](https://t.freeblock.cn/2025/07/31/20250731141026273.png)

![img](https://t.freeblock.cn/2025/07/31/20250731141212063.jpg)

#### 绑定域名

1.点击【自定义域名】，填写要绑定的域名，点击【下一步】

![img](https://t.freeblock.cn/2025/07/31/20250731141033343.jpg)

2.页面给出域名解析的记录信息，按提示完成解析即可！

![img](https://t.freeblock.cn/2025/07/31/20250731141040547.jpg)

### 部署到Vercel

#### 准备账号

注册登陆[Vercel](https://vercel.com/) ，这里推荐选择Github账号登录。

![Untitled](https://t.freeblock.cn/2025/10/01/20251001215701513.webp)

#### 导入仓库

点击[链接](https://vercel.com/new)创建新项目
在代码仓库列表中选择导入博客仓库

![QQ20250731-134919](https://t.freeblock.cn/2025/07/31/20250731141055422.png)

Root Directory配置如图

![8png](https://t.freeblock.cn/2025/07/31/20250731141312400.png)

![9](https://t.freeblock.cn/2025/07/31/20250731141102846.png)

#### 自定义域名

在Vercel控制面板中找到`Setting`→`Domains`→`Add`，在这里可以指定当前项目的绑定域名，一个项目可以绑定多个域名。

![Untitled (1)](https://t.freeblock.cn/2025/10/01/20251001214409924.webp)

输入域名,并Add之后，如果看到下图中的提示（Invalid Configuration）👇, 说明域名已经添加，但需要根据提示添加CNAME或Nameserver的方式激活它，图中所示是要在域名后台添加一条CNAME类型的解析，参数名`hexo`，值为`cname.vercel-dns.com`。

![img](https://t.freeblock.cn/2025/10/01/20251001214205286.webp)

这里推荐使用CNAME绑定。请按文档后续步骤配置对应的Cname解析。

#### Vercel域名加速

vercel.app因为被大量使用，自然而然被墙掉了，不过好在 Vercel 官方提供了单独的 IP 和 CNAME 地址给大家，对于国内的用户来说，配置一下单独的解析，依然可以享受 Vercel 提供的服务。

将上述步骤中用到的 ip和 cname地址替换成以下内容即可：

A记录地址：`76.223.126.88` 或 `76.76.21.98` 等

CNAME 记录地址：`cname-china.vercel-dns.com`

当然，想省事还有另外的解决方案，例如国人开放的CDN项目：

[提升部署在cloudflare、vercel或netlify的网站在中国国内的访问速度和稳定性](https://xingpingcn.top/enhanced-faas-in-cn.html)

### 部署到netlify或者cloudflare Pages

方法大同小异，只需把根目录换成***./docs***即可