# 遇 · Yu — MuFriends

[打开工具 / Open the app](https://xiaoyug.github.io/yu/)

为 2026 年 11 月 6 日 MuFriends 准备的中英双语话题卡。活动分支：`mufriends-2026-11-06`；本版同时发布到 `main`。
A bilingual conversation card for MuFriends on 6 November 2026. This release is available on both the event branch and `main`.

## 使用 / Use

1. 写下你是谁，以及「你可以找我聊 / Talk to me about」和「我想要聊 / I’d love to talk about」。都可选填，可用中文、英文或两种语言；不会自动翻译填写内容。
2. 话题卡即时生成，**不用先拍照**。把屏幕给对方看，从共同话题开始聊。
3. 可上传联系方式二维码、加合影、记下对方称呼和聊到的一句话。
4. 保存、分享调用系统菜单；保存时选择「存储图像」。网页不能确认你选择了哪个操作。
5. 「换一张照片」保留本次备注；「下一位朋友」清除照片、对方称呼和本次备注，保留你自己的话题和联系方式。

Fill in your name and conversation topics, then show your card. A photo is optional. Add a contact QR code, photo or memory if you like. Save or share through the system menu. “Next person” clears the encounter, while keeping your profile and topics.

活动默认 MuFriends，日期默认 2026-11-06，均可修改；老用户已保存的活动名保留。原来的「对什么感兴趣」自动延续到「我想要聊」。
The default event and date are editable. Existing profiles, QR codes and event names are preserved; your previous interest becomes “I’d love to talk about”.

## 离线与数据 / Offline & data

纯客户端，无账号、业务服务器、第三方运行依赖或构建步骤。信息保存在当前浏览器；照片仅在内存，未导出就离开会丢失。清除浏览器数据会清除设置。
No account or backend. Your details stay in this browser; photos stay in memory until you export a card. Clearing browser data removes your settings.

iPhone 建议 Safari 添加到主屏幕，再从主屏幕打开、填写资料。活动前联网打开，确认页脚「已准备好离线使用」。旧版用户联网打开后关闭、重新打开一次以加载新版。不同浏览器或安装模式的数据可能不共享，出发前确认二维码与话题。
On iPhone, add to Home Screen from Safari, open that app and set up your profile there. Before the event, open online and check “Ready to use offline”. After an update, reopen to load the new version. Verify your details in the browser or installed app you will use.

GitHub Pages 在部分网络下可能不稳定；首次访问与更新需要联网。iPhone 原生相机、系统分享和微信识码仍应在活动用机上验收。
Initial access and updates need a connection. Check the camera, share menu and QR recognition on the actual event phone.

## 开发与发布 / Development & deployment

源码在私有工作区 `sunny-projects/tools/yu/`，公开仓库 `xiaoyug/yu` 是发布副本。仅同步此子目录，不发布工作区内其他内容。

- `index.html`: 双语界面 / bilingual interface
- `app.js`: 本机设置、照片和分享 / local settings, photos and sharing
- `card.js`, `config.js`: 话题卡排版与样式 / card rendering and styling
- `sw.js`: 离线缓存（当前 `yu-v4`）/ offline cache
- `dev/`: 测试与预览素材 / tests and preview fixtures

```bash
npm test --prefix tools/yu
python3 -m http.server 8732 --directory tools/yu
node tools/yu/dev/build-preview.mjs tools/yu/dev/fixtures /tmp/yu-preview.html
```

修改缓存资源后递增 `sw.js` 中的 CACHE 版本（本版为 `yu-v4-mufriends-20261106`）。先测试并提交私有源码，再通过 GitHub Git Data API 将此目录内变更写入基于公开仓库当前 main 的新提交，使用 expected head 校验依次更新活动分支与 main。两个分支指向同一提交。

历史 README 的 subtree 推送命令依赖旧分支的提交关系；当前主工作区是恢复源码目录后接续，不应直接假设 subtree push 可以快进。后续默认继续用上述 API 发布流程，或先在独立公开仓库 checkout 中同步子目录再正常提交推送。

Pages 从 `main` 根目录发布；活动分支用于保留活动版本，没有另配 Pages 地址。发布后检查 workflow、线上资源与手机缓存更新。仅发布此工具子目录，不把共享工作区其他文件带入公开仓库。
