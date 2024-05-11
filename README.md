# BLive Coyote
郊狼B站直播玩法：送礼物控制郊狼主机输出

## 项目简介
> [!TIP]
> 本项目仍在开发中，目前可体验基础功能。
> 
> 本项目为个人学习项目，如有错误敬请批评指正，欢迎 PR。

本项目以 [Bilibili 直播&互玩 JavaScript Demo](https://open-live.bilibili.com/document/a7bd5377-ad7d-a273-25ae-28caf37a7a85) 和 [DG-LAB SOCKET控制-控制端开源](https://github.com/DG-LAB-OPENSOURCE/DG-LAB-OPENSOURCE/tree/main/socket) 为基础，实现了直播间送礼物控制郊狼主机输出的功能。

- 郊狼 WebSocket 后端请参考：[DG-LAB-OPENSOURCE](https://github.com/DG-LAB-OPENSOURCE/DG-LAB-OPENSOURCE/tree/main/socket/BackEnd(Node))
- 哔哩哔哩直播互动玩法服务端请参考：[JavaScript Demo](https://open-live.bilibili.com/document/a7bd5377-ad7d-a273-25ae-28caf37a7a85)

## Demo
> [!NOTE]
> 使用Demo需要在本地启动 Node 服务端，请参考 [哔哩哔哩开放平台文档](https://open-live.bilibili.com/document/a7bd5377-ad7d-a273-25ae-28caf37a7a85)。
> 
> 本项目**不会**向服务端传递`access_key_id`和`access_key_secred`，请自行修改服务端代码（可参考[服务端本地搭建指南](https://github.com/klxf/BLive_Coyote/issues/1)）。

- [BLive Coyote Demo](https://blive-coyote.babyfang.cn/)
- [波形助手](https://blive-coyote.babyfang.cn/waveHelper.html)

## 目录结构
```
BLive_Coyote
├─public
│  └─css
└─src
    ├─assets
    ├─socket
    └─types
```

## 项目启动
```bash
cd Client
npm install
npm run dev
```
主播身份码及 app_id 获取请参考 [开放平台-直播&互玩接入文档：常见问题](https://open-live.bilibili.com/document/5dffc297-6fd2-41ff-bd45-6e8b89e2a68e)
