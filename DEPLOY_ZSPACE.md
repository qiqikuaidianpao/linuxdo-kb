# linuxdo-kb 在极空间（ZSpace）前台部署指南

> 目标：**所有数据在前台可见**、可备份、可迁移。不要在容器里“偷偷 compose”。

## 一、建议的宿主机持久化目录（前台可见）

在极空间前台文件管理器里创建：

- **项目根目录**：`/SATA存储11/docker/share/linuxdo-kb/`
  - `posts/`：帖子归档（content + images）
  - `data/`：topics、topic_index、索引等结构化数据
  - `views/`：生成的视图/导出文件
  - `secrets/`：Cookie（注意权限）

- **向量目录**（你指定的 share）：
  - `vectors/`：`/SATA存储11/docker/share/linuxdo-kb-vectors/`

目录结构示例：

```
/SATA存储11/docker/share/linuxdo-kb/
  ├── posts/
  ├── data/
  ├── views/
  └── secrets/

/SATA存储11/docker/share/linuxdo-kb-vectors/
  ├── 1613202.json
  └── ...
```

## 二、极空间前台 Compose 配置（推荐）

### 1) 镜像/构建

- 代码仓库：`qiqikuaidianpao/linuxdo-kb`（Private）
- 使用仓库内 `Dockerfile` 构建

> 如果极空间前台不支持拉取私有仓库：改用“手动上传源码”或“先在本地 build 镜像再导入”。

### 2) 端口映射

- 容器内：`3000`
- 宿主机（前台暴露）：建议 `3010:3000`

### 3) 目录挂载（关键：确保前台可见 + 持久化）

把容器内目录映射到前台路径：

- `posts`：
  - host：`/SATA存储11/docker/share/linuxdo-kb/posts`
  - container：`/app/posts`

- `data`：
  - host：`/SATA存储11/docker/share/linuxdo-kb/data`
  - container：`/app/data`

- `views`：
  - host：`/SATA存储11/docker/share/linuxdo-kb/views`
  - container：`/app/views`

- `secrets`（只读）：
  - host：`/SATA存储11/docker/share/linuxdo-kb/secrets`
  - container：`/secrets`（ro）

- `vectors`（向量外部挂载）：
  - host：`/SATA存储11/docker/share/linuxdo-kb-vectors`
  - container：`/vectors`

### 4) 环境变量（前台照填）

- `PORT=3000`
- `FLARESOLVERR_URL=http://192.168.31.6:8191/v1`
- `LINUXDO_COOKIE_FILE=/secrets/linuxdo_cookies.txt`
- `VECTOR_DIR=/vectors`
- `EMBED_MODEL=BAAI/bge-small-zh-v1.5`

## 三、Cookie 文件准备

在前台路径创建文件：

- `/SATA存储11/docker/share/linuxdo-kb/secrets/linuxdo_cookies.txt`

内容为浏览器 Network 里复制的完整 Cookie 字符串。

## 四、部署后验证

1) 打开 Web 面板：
- `http://<极空间IP>:3010`

2) 在首页创建一个 Topic（可先用示例）：
- topicId：`grok2api`
- name：`Grok2API 部署与使用`
- keywords：`grok,grok2api,x.ai,token`
- rules：
```json
{"match":{"keywords":["grok","grok2api","x.ai"],"minScore":2,"threshold":0.55},"seedPosts":["1613202"],"autoTag":true}
```

3) 添加帖子（topicId 或 URL）
- 例如：`1613202`

4) 进入容器执行初始化 embedding（如果 UI 里暂时没按钮）：
```bash
docker exec -it linuxdo-kb bash
node scripts/embed-post.js 1613202
node scripts/topic-build.js
```

## 五、常见坑

- **不要在容器里跑 compose**：前台看不到，后续无法管理。
- **端口视角混淆**：容器内是 3000，宿主暴露建议 3010。
- **Cookie 过期**：raw 抓取失败多半是 cookie 需要更新。
- **向量目录权限**：确保 host 目录容器可写（必要时 chmod）。
