#!/usr/bin/env node
/**
 * add-post.js
 * 入口脚本：拉取 raw 内容、（后续）解析图片、生成摘要/标签、写入索引。
 *
 * 现在先实现 P0：归档 raw 内容。
 */

import { spawnSync } from 'child_process';

const arg = process.argv[2];
if (!arg) {
  console.error('用法: node scripts/add-post.js <topicUrl|topicId>');
  process.exit(1);
}

const r = spawnSync('node', ['scripts/fetch-topic-raw.js', arg], { stdio: 'inherit' });
process.exit(r.status ?? 0);
