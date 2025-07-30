### 原理：

关闭VBS，大部分新windows电脑都是跑在hyperv虚拟机上的，但是如果关闭了其实可以提升性能，理论上性能低一些的设备效果更显著

应微软要求，笔记本预装Win11 镜像出货的机型会默认打开“Virtualization-based Security（VBS）基于虚拟化的安全性”（以下简称VBS）功能，此功能打开可能会导致部分游戏性能下降卡顿等情况。有关VBS的介绍，详情请参考: https://learn.microsoft.com/zh-cn/windows-hardware/design/device-experiences/oem-vbs?view=windows-11

### 检测方法：

参考下面方法查看该功能是否打开(注意，并非所有机型支持VBS，是否已开启功能以下面查询结果为准)
Win键+R调出运行窗口，输入msinfo32

![img](https://t.freeblock.cn/2025/07/30/20250730111943347.png)

然后找到基于虚拟化的安全性（Virtualization based security）值为“正在运行（running）”表示该功能已打开， “未启用”表示该功能已关闭）。

![img](https://t.freeblock.cn/2025/07/30/20250730112002341.png)

### 关闭VBS解决方案：

1.点击下载压缩包[tool.rar](https://consumer-tkbdownload.huawei.com/ctkbfm/servlet/download/downloadServlet/H4sIAAAAAAAAAD2PzU7DMBCE38Xngtb2-mc5YTeNygVxKA_gJA61FJLKTUAU8e44KOI4szP6dr7Zco359HWJ7IFxtmPd9DluUhbZpyE-h_dVztM03OeQN_clzOfiNtFo0ZlAvW1QG2qUBOwFomkjtFKXdJNuT12JHt3j7XzXjlxZJYxaT22OYU7TeEorgmsgLHXgALBj1_Q2hnnJK1wbd7Ag0IBEJwjAIdZkPAkSXBiypNFjhft6b1WtNQgnta-855XjJF1hfYQhda__a-e8xL_ftrVHx35-AebenPsOAQAA.rar)，解压文件后找到tool.bat

![img](https://t.freeblock.cn/2025/07/30/20250730112124997.png)

2.右键选择以管理员身份运行

![img](https://t.freeblock.cn/2025/07/30/20250730112141377.png)

3.工具完成自动操作后，手动重启

![img](https://t.freeblock.cn/2025/07/30/20250730112226606.png)

4.重启出现英文页面后，按界面提示点按**4次F3**键则表示同意关闭，等待电脑启动后完成操作。

![img](https://t.freeblock.cn/2025/07/30/20250730112254201.png)