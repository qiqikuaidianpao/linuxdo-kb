#!/usr/bin/env node
/**
 * topic-create.js
 * 创建/更新 topic 配置文件 data/topics/<topicId>.json
 *
 * 用法:
 *  node scripts/topic-create.js grok2api "Grok2API 部署与使用" "grok,grok2api,x.ai,token" "Grok 相关部署与工具" \
 *    '{"match":{"keywords":["grok","grok2api"],"minScore":2},"seedPosts":["1613202"],"autoTag":true}'
 */

import fs from 'fs';
import path from 'path';

const [topicId, name, keywordsCsv, description, rulesJson] = process.argv.slice(2);
if (!topicId || !name) {
  console.error('用法: node scripts/topic-create.js <topicId> <name> [keywordsCsv] [description] [rulesJson]');
  process.exit(1);
}

const dir = path.resolve('data', 'topics');
fs.mkdirSync(dir, { recursive: true });

const keywords = (keywordsCsv || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

let rules = {
  match: {
    keywords,
    minScore: Math.max(1, Math.min(10, keywords.length ? 2 : 1))
  },
  seedPosts: [],
  autoTag: true
};

if (rulesJson) {
  try {
    const patch = JSON.parse(rulesJson);
    rules = { ...rules, ...patch, match: { ...rules.match, ...(patch.match || {}) } };
  } catch (e) {
    console.error('rulesJson 不是合法 JSON');
    process.exit(1);
  }
}

const topic = {
  topicId,
  name,
  description: description || '',
  keywords,
  rules,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const out = path.join(dir, `${topicId}.json`);
if (fs.existsSync(out)) {
  const old = JSON.parse(fs.readFileSync(out, 'utf-8'));
  topic.createdAt = old.createdAt || topic.createdAt;
}
fs.writeFileSync(out, JSON.stringify(topic, null, 2));
console.log(`✅ 写入 ${out}`);
