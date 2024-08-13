# 方案一：官方优选
## 食用方法
将原来解析至** cname.vercel.com** 改为 **vercel.cdn.yt-blog.top**
## 加速原理
Vercel 在大陆周围还有很多节点，其中包含中国台湾、韩国、日本、新加坡等，这些节点的访问延迟在接受范围，且相对香港节点来说带宽更充足。
Vercel 的 Anycast 会自动将节点解析至距离最近的香港服务器，但如果手动解析则太过麻烦。
vercel.cdn.yt-blog.top 是 Fgaoxing 小朋友手动解析，并通过 D 监控检查状态，无法访问时会及时暂停节点。使用时自动解析至附近可用节点，尽可能的选择优质节点。
最终数据会回源至自己的 Vercel，所以不用担心数据安全。
# 方案二：反代优选
节点: vercel.cdn.domaincdn.cn
结果来自全网扫描,有国内节点，但是不稳定。
如果需要v6的话 需要和cloudflare 混合使用
v6.vercel.cdn.domaincdn.cn
使用腾讯云DNSPod 尊享版 套餐提供解析服务开启了递归加速
>来源：[https://www.ayao.ltd/19.html](https://www.ayao.ltd/19.html)
