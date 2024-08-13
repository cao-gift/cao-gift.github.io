## 前言
ipv4与ipv6访问本质上都是需要中转服务器中转数据，本文介绍几种常见的情况和解决方法
## 一、客户端windows纯ipv4通过SSH访问ipv6服务器
SHH软件基本都支持代理加速,本文以xshell和finalshell为例
> 我以clash提供的socks5代理
> clash会自动在本机生成一个socks5代理，v2rayN似乎也一样
> 代理服务器必须为双栈ipv4+ipv6的哈

#### xshell：
`Gmeek-html<img src="https://tu.freeblock.cn/PicList/%E5%85%B6%E5%AE%83/202408131237666.webp">`
#### finalshell:
`Gmeek-html<img src="https://tu.freeblock.cn/PicList/%E5%85%B6%E5%AE%83/202408131238241.webp">`
## 二、客户端windows访问纯ipv6网站：
与上一个一样，挂代理访问
或者给纯ipv6网站套上双栈CDN，如cloudflare gcore等
## 三、客户端linux纯ipv4访问ipv6网络：
#### 法一：
可以通过WARP代理，推荐 [fscarmen大佬的一键脚本](https://gitlab.com/fscarmen/warp)
1 | wget -N https://gitlab.com/fscarmen/warp/-/raw/main/menu.sh && bash menu.sh -- | -- 
#### 法二：
可以使用HE提供的免费ipv6:[Hurricane Electric Free IPv6 Tunnel Broker](https://tunnelbroker.net/)
> HE提供的ipv6是可以装在网卡上的，相当于你的机器多了一个自己的ipv6地址，你可以主动用它访问ipv6网络，也可以通过ipv6网络访问你机器上HE的ipv6（例如你可以SSH链接HE提供的ipv6与服务器进行连接）
> HE的ipvIP被cloudflare拉黑了，所以该ipv6无法使用cloudflareCDN

具体可以看这两个大佬的教程：
[使用 HE Tunnel Broker 给 IPv4 VPS 免费添加公网 IPv6 支持 - P3TERX ZONE](https://p3terx.com/archives/use-he-tunnel-broker-to-add-public-network-ipv6-support-to-ipv4-vps-for-free.html)
[【IPv6隧道】用HE的TunnelBroker给服务器添加IPv6 – Luminous’ Home (luotianyi.vc)](https://luotianyi.vc/2603.html)
前言 ipv4与ipv6访问本质上都是需要中转服务器中转数据，本文介绍几种常见的情况和解决方法 
一、客户端windows纯ipv4通过SSH访问ipv6服务器
SHH软件基本都支持代理加速,本文以xshell和finalshell为例
我以clash提供的socks5代理
clash会自动在本机生成一个socks5代理，v2rayN似乎也一样
代理服务器必须为双栈ipv4+ipv6的哈
xshell：
image
finalshell:
image
二、客户端windows访问纯ipv6网站：
与上一个一样，挂代理访问
或者给纯ipv6网站套上双栈CDN，如cloudflare gcore等
三、客户端linux纯ipv4访问ipv6网络：
法一：
可以通过WARP代理，推荐 [fscarmen大佬的一键脚本](https://gitlab.com/fscarmen/warp)
wget -N [https://gitlab.com/fscarmen/warp/-/raw/main/menu.sh](https://gitlab.com/fscarmen/warp/-/raw/main/menu.sh) && bash menu.sh
法二：
可以使用HE提供的免费ipv6:[Hurricane Electric Free IPv6 Tunnel Broker](https://tunnelbroker.net/)
HE提供的ipv6是可以装在网卡上的，相当于你的机器多了一个自己的ipv6地址，你可以主动用它访问ipv6网络，也可以通过ipv6网络访问你机器上HE的ipv6（例如你可以SSH链接HE提供的ipv6与服务器进行连接）
HE的ipvIP被cloudflare拉黑了，所以该ipv6无法使用cloudflareCDN
具体可以看这两个大佬的教程：
[使用 HE Tunnel Broker 给 IPv4 VPS 免费添加公网 IPv6 支持 - P3TERX ZONE](https://p3terx.com/archives/use-he-tunnel-broker-to-add-public-network-ipv6-support-to-ipv4-vps-for-free.html)
[【IPv6隧道】用HE的TunnelBroker给服务器添加IPv6 – Luminous’ Home (luotianyi.vc)](https://luotianyi.vc/2603.html)


