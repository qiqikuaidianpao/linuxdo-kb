# linuxdo-kb

Linux.do 论坛内容采集 / 总结 / 关系图谱 / 部署引用管理 项目。

## 目标
- 采集帖子（支持 raw + 登录 Cookie）
- 下载并本地化图片（可选 OCR/描述）
- 主题聚类（如 grok2api 等）
- 帖子关系（引用/相似/同主题）
- 输出：Web 面板/静态站点/CLI

## 快速开始（规划）
- scripts/：采集与分析脚本
- data/：结构化元数据
- posts/：按帖子ID归档原文 + 图片

## 约定
- 一帖一目录：posts/<topicId>/
- meta.json + content.md + images/

