## 关于 User-Agents 数据源

`fake-useragent` 项目所使用的 User-Agent 数据源来自于 [intoli/user-agents](https://github.com/intoli/user-agents) 项目，该项目保持稳定且频繁的更新节奏，能够及时反映最新的浏览器 UA 信息。

## 国内镜像加速

为了解决网络访问问题，我在 Gitea 上创建了 [bgspider/user-agents](https://gitea.bgspider.com/bgspider/user-agents/) 的镜像仓库。该镜像每 8 小时自动同步一次最新数据，确保数据的时效性。

## 直接下载地址

```
https://gitea.bgspider.com/bgspider/user-agents/raw/branch/main/src/user-agents.json.gz
```

网络不稳定的用户可直接从该地址下载最新的 User-Agents 数据文件。
