这是给正常付费并且跑业务的看的

虽然打一折，该用不起的人还是用不起，流量费原价照收

你需要做好每月0-1次的每次大约五分钟强制中断服务器的准备，必须接受，不能避免

三种计费开机方式：
1，原价，不打折
2，承诺X年，按月付款，类似于包月，大约6折
3，现成(抢占,SPOT)，1折(AWS,GCP和阿里云开SPOT都没他便宜)
什么是SPOT？看阿里云的介绍：https://help.aliyun.com/document_detail/52088.html


原价150刀一个月的F4S现在打1折只需15刀，简直屌爆了

被关后IP会变的问题，请自己设置DDNS或者用Azure自带的DDNS


Azure的SPOT的国际三大厂里实打实最便宜的，而且性能给的够，而且还有100G免费流量

开机方面都一样，就是要多打一个勾，这样大部分配置就会是一折(90%OFF)，可用性区域一定要选择“无需基础结构冗余”
逐出策略必须选择“停止/解除分配”(只关机，不删数据)，选“删除”关机的时候什么都不留，直接给你删了
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/66814ff8a297c.png">`
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/66814ff8970f8.png">`

这些都是很正常的，但是难题是如何被系统中断后让它自动重新启动
在搜索栏搜索“自动化帐户”并创建，必须保证和虚拟机在一个订阅里，地区不敏感，其他的下一步一直到创建
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d34b8dc.png">`

然后打开创建的自动化账户，打开标识栏目，这个时候“系统分配”应该已经打开了，并且显示了对象ID。如果没有，那就手动打开它
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d394623.png">`

复制给你的"对象主体(ID)，打开你的订阅，访问控制→添加→添加角色分配"
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d36af61.png">`
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d3839b5.png">`

!
托管标识选择你创建的那个自动化账户，并且添加，把整个订阅的权限交给自动化。审阅并分配，授权完成
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d392c98.png">`
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d3a7664.png">`
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d348ee7.png">`
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d387342.png">`



——————————————————————————————————
回到自动化，选择Runbook，导入Runbook，注意选择要一样


——————————————————————————————————
选择导入的Runbook，点击编辑并且发布，你什么都不用修改

——————————————————————————————————
现在前置已经完成，开始设置关机后自动开机的监视
——————————————————————————————————
选择你那个SPOT的虚拟机，对它打标签.
标签可以是唯一，也可以不是唯一。比如几个虚拟机使用了同一个标签，那么会同时把所有同标签的启动
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d390e07.png">`
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d36457a.png">`


——————————————————————————————————
选择下面的（监视、警报），然后开始创建预警规则

不要看下拉栏，直接选择“See all signals”并搜索“VM Availability Metric (Preview)”
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d4f37b8.png">`


条件照抄，意思是，每一分钟检查一次，如果虚拟机可用小于1(说明被关机了)，然后会触发警报。现在只是触发，后面还有操作需要设置
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d52695c.png">`
然后下一步进行创建操作组，注意，必须和你的服务器是在同一个订阅，不可以跨订阅
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d55a827.png">`



甚至可以给你发短信，告诉你服务器被关了
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d57d117.png">`


上一步设置不设置无所谓，反正发短信是要掏钱的，一条一毛钱
然后开始设置开机操作，选择我给你的那个runbook，在我这里，我设置的名字是“startpw”
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d637361.png">`
`Gmeek-html<img src="https://bu.dusays.com/2024/06/30/668150d5a7bac.png">`


设置参数，第一个填“Start”，第二个框填你自己给服务器打的标签的第一个(看上面我填的是114)，第三个框填你自己给服务器打的标签的第二个(看上面我填的是514)

审阅并创建，好了，操作组创建完毕。回到上一层报警规则选择你刚刚创建的操作组。然后给你的报警规则设置一个名字。然后创建，现在整个流程走完了。
现在可以自行测试了，先自己把服务器关了，稍等一会你的警报里就会出现一条新的警报，然后你的服务器就会开机，大约需要不到5分钟

按照现在的Azure的容量，大约是1-2个月被关机一次，多台机的MJJ，配合自动化，极限降低成本，开关机基本无感
那个要导入到Runbook的PowerShell文件在这
[start.zip](https://github.com/user-attachments/files/16044623/start.zip)
