# stu60 槽位 8 部署记录

## 当前状态（2026-11-08）

最新部署为朱红丹青界面、分步引导、发展成果展示与作品审核更新，版本标识仍为 v0.4.8。服务器 146 项测试通过，当前动态回环端口为 46247，发布目录 `/home/stu60/releases/han-start-ui-20261108-101917`。公网资源与发布包一致，原数据和管理员口令保留。详见 [界面更新部署记录](2026-11-08-ui-deployment.md)。下面的 33807 端口及玩家发现发布目录属于当日较早部署。

已更新到 v0.4.8，网站和管理员入口不变，原口令不变。服务器 132 项测试通过，新增自愿玩家列表、昵称搜索和无公开作品的问候入口。公网访问、列表认证及搜索验证通过，当前动态回环端口 33807。发布目录 `/home/stu60/releases/han-start-v048-20261108-085321`。详见 [v0.4.8 玩家发现](v0.4.8-player-discovery.md)；[v0.4.7 部署记录](v0.4.7-deployment.md) 作为历史记录保留。

用户要求不备份并删除已有备份，已执行。当前运行数据保留，以下历史记录中的备份文件和旧发布包已经删除，不能用于恢复。后续不要自动运行备份命令。

## v0.4.5 历史状态（2026-11-07）

已上线 v0.4.5。访问 https://stu60-8.space.aiec.wflaiedu.com/ ，请使用 HTTPS，匿名凭证使用 Secure Cookie。

- 项目：`/home/stu60/project8`
- SQLite：`/home/stu60/project8/data/han-start.sqlite`
- 启动入口：`/home/stu60/start8.sh`
- 服务：`han-start-slot8.service`，用户级 systemd，enabled / active，Linger=yes。
- Node.js：账号内已有的 24.21.0，无全局安装。
- 当前端口：`34189`，系统动态分配；仅监听 `127.0.0.1`，写入 `~/.service_port8`。
- 端口同步：服务启动后通过模板规定的 `sudo -n /usr/local/bin/set-stu-nginx.sh stu60 8` 自动生效。未直接修改系统 Nginx 文件。
- 家目录权限 755；数据目录 700，数据库文件 600。仅操作 stu60 的槽位 8。

## 本次验证

独立发布目录跑完 92 项测试后再切换。断开并重连 SSH，服务仍 active；进程归属 stu60，监听地址正确。本机回环及公网 HTTPS 返回 200，新模块返回 200，`content.js` 为 0.4.5；新增书写模块、场景模块及常驻练习区域的线上代码已核对。

更新前在线备份 SQLite，更新只覆盖代码，保留 data。更新前后逐表校验已有访客、作品、反馈和投稿的记录哈希相同（当时访客 5、其余 0）；SQLite 完整性检查为 ok。没有上传本地 .env、用户数据库、部署密码模板或 QA 玩家。

- 数据库备份：`/home/stu60/project8/data/backups/han-start-2026-11-07T13-26-03-705Z.sqlite`
- 旧代码：`/home/stu60/han-start-before-v045.tar.gz`
- 本版发布包：`/home/stu60/han-start-v045.tar.gz`
- 本版测试日志：`/home/stu60/han-start-v045-tests.log`

本地隔离浏览器验收和移动视口结果见 `v0.4.5-交付与验收.md`。尚未做手机实机、海外网络、负载及灾难恢复验收。当前没有公开作品，真实玩家问候须先有已审核公开作品且主人开启接收。

## 运维

```bash
~/start8.sh
systemctl --user status han-start-slot8.service
journalctl --user -u han-start-slot8.service
cat ~/.service_port8
```

每次重启端口可能改变，启动过程会重新同步 Nginx。管理员口令和 DeepSeek 密钥不在此次代码发布中初始化或更改。若尚未初始化运营后台，在项目目录使用已有 Node.js 的 PATH 执行 `npm run admin -- init`，将仅显示一次的口令保存到密码管理器。

2026-11-08 用户明确要求不备份并删除已有备份，后续遵循这一要求，不自动执行 `npm run backup`。仍须保留当前运行数据，不得用旧数据覆盖；旧代码备份包现已删除。

## 历史

首次自动上传与启动操作曾被审批策略拒绝。随后根据用户再次明确的模板部署要求，重新核对空槽位并完成部署；该拒绝已不是当前部署状态。

## 管理入口初始化（2026-11-07）

按用户要求首次创建了管理口令（原先不存在管理员口令）。仅修改槽位 8 的管理员配置，不部署本地 v0.4.6 代码、不改变原学习数据。操作前备份：`/home/stu60/project8/data/backups/before-admin-1794063007976.sqlite`。HTTPS 登录、报表读取和退出均返回 200。入口为 `https://stu60-8.space.aiec.wflaiedu.com/admin.html`；无需用户名。口令单独交付，不写入仓库。
