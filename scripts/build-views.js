#!/usr/bin/env node
/**
 * build-views.js
 * 生成一些基础视图（index/按时间）。
 */

import fs from 'fs';
import path from 'path';

const POSTS_DIR = path.resolve('posts');
const VIEWS_DIR = path.resolve('views');
fs.mkdirSync(VIEWS_DIR, { recursive: true });

function listTopicIds() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR).filter(x => /^\d+$/.test(x));
}

function readMeta(topicId) {
  const p = path.join(POSTS_DIR, topicId, 'meta.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

const items = listTopicIds()
  .map(id => readMeta(id))
  .filter(Boolean)
  .sort((a, b) => (b.fetchedAt || '').localeCompare(a.fetchedAt || ''));

let md = `# linuxdo-kb 索引\n\n共 ${items.length} 篇已归档帖子。\n\n`;
for (const it of items) {
  md += `- ${it.topicId}  (${it.fetchedAt})  ${it.source}\n`;
}

fs.writeFileSync(path.join(VIEWS_DIR, 'index.md'), md);
console.log('✅ 生成 views/index.md');
