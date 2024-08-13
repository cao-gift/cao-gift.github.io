ipv6访问纯ipv4站点基本是一些纯ipv4小鸡需要，主要方法和ipv4访问ipv6差不多
## 法一：
最简单好用的是使用WARP，推荐 [fscarmen大佬的一键脚本](https://gitlab.com/fscarmen/warp)
1 | wget -N https://gitlab.com/fscarmen/warp/-/raw/main/menu.sh && bash menu.sh -- | -- 
## 杂谈：
DNS64 NAT64原理可以看看这两篇文章：
[NAT64与DNS64基本原理概述_mb5fdb1266ce6df的技术博客_51CTO博客](https://blog.51cto.com/u_15060531/4174902?articleABtest=0)
[昔我往矣 » DNSv6和DNS64简单配置 杨柳依依 (xnow.me)](https://xnow.me/ops/dnsv6-and-dns64.html)
ipv6访问纯ipv4站点基本是一些纯ipv4小鸡需要，主要方法和ipv4访问ipv6差不多 
法一：
最简单好用的是使用WARP，推荐 [fscarmen大佬的一键脚本](https://gitlab.com/fscarmen/warp)
wget -N [https://gitlab.com/fscarmen/warp/-/raw/main/menu.sh](https://gitlab.com/fscarmen/warp/-/raw/main/menu.sh) && bash menu.sh
法二：
DNS64+NAT64
nat64服务器参考的：[https://nat64.net/](https://nat64.net/) 和 [https://nat64.xyz/](https://nat64.xyz/)
直接修改DNS服务器即可，以Debian为例
临时更改dns服务器：
编辑 vim /etc/resolv.conf ，改成DNS64地址即可（此方法重启会失效）
nameserver 2a00:1098:2b::1
nameserver 2001:67c:2b0::4
永久更改dns服务器：
修改 /etc/resolvconf/resolv.conf.d 文件夹的 base 文件，添加以下内容后保存重启
不同linux系统永久修改DNS的文件不一样，可以自己搜索看看
nameserver 2a00:1098:2b::1
nameserver 2001:67c:2b0::4
测试是否可以连接github(纯ipv4网络)：
wget [https://github.com/icret/EasyImages2.0/archive/refs/tags/2.8.3.zip](https://github.com/icret/EasyImages2.0/archive/refs/tags/2.8.3.zip)
杂谈：
DNS64 NAT64原理可以看看这两篇文章：
[NAT64与DNS64基本原理概述_mb5fdb1266ce6df的技术博客_51CTO博客](https://blog.51cto.com/u_15060531/4174902?articleABtest=0)
[昔我往矣 » DNSv6和DNS64简单配置 杨柳依依 (xnow.me)](https://xnow.me/ops/dnsv6-and-dns64.html)


