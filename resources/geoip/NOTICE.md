# IP 国家库

数据：DB-IP IP to Country Lite，2026 年 11 月版。
来源：https://db-ip.com/db/download/ip-to-country-lite
下载：https://download.db-ip.com/free/dbip-country-lite-2026-11.mmdb.gz
许可：Creative Commons Attribution 4.0 International（https://creativecommons.org/licenses/by/4.0/）。
原文件解压后保存为 `country.mmdb`，未修改内容。
SHA-256：`145ce5dfb812d8de28547e6289bb5c5f8b3df2f1dea21d324d5b575e0431311f`

使用结果的前台个人设置和后台页面均包含 DB-IP 署名链接。
免费库按月更新，覆盖与准确率有限。升级时从官方页面获取新版本，核对发布信息并更新本说明与文件摘要；不应把推测结果当作国籍或确定居住地。

应用在本地查询，不发送访客 IP 给数据供应方；仅持久化国家代码及来源。网络入口服务自身的日志政策应单独确认。
`HAN_GEOIP_DB` 可指定本地 MMDB 的绝对路径；未配置时加载本目录的文件。
缺失或损坏时记录启动警告并返回 UNKNOWN，正常学习和身份创建继续可用。
