这 Bash 脚本用于监测服务器的网络流量使用情况，并根据预设的阈值进行操作。它首先显示当前的接收和发送流量，然后询问用户是否设置流量阈值。用户可以选择设置阈值，并输入所需的阈值（以GB为单位）。一旦设置了阈值，脚本将每分钟检测一次流量是否超过了该阈值。如果超过了阈值，脚本将触发关闭服务器的操作。这个脚本可用于限制流量使用，或在流量达到预定阈值时自动关闭服务器以防止不必要的费用或其他问题。



## 使用方法
安装curl
Debian/Ubuntu

apt update -y  && apt install -y curl

CentOS

yum update && yum install -y curl

Alpine Linux

apk update && apk add curl

## 运行脚本
官网版

curl -sS -O https://kejilion.pro/kejilion.sh && chmod +x kejilion.sh && ./kejilion.sh

GitHub版 部分小伙伴会遇到官网版出现大段乱码！就用GitHub版本吧！

curl -sS -O https://raw.githubusercontent.com/kejilion/sh/main/kejilion.sh && chmod +x kejilion.sh && ./kejilion.sh

国内服务器版

curl -sS -O https://raw.gitmirror.com/kejilion/sh/main/cn/kejilion.sh && chmod +x kejilion.sh && ./kejilion.sh
`Gmeek-html<img src="https://bu.dusays.com/2024/07/01/66828891cb9e5.jpg">`
`Gmeek-html<img src="https://bu.dusays.com/2024/07/01/66828891c673b.jpg">`
`Gmeek-html<img src="https://bu.dusays.com/2024/07/01/66828891cc558.jpg">`










之后还会加入每月自动重启，清零流量计算。