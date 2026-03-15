#!/usr/bin/env node
/**
 * topic-list.js
 * 列出 data/topics 下的 topic
 */

import fs from 'fs';
import path from 'path';

const dir = path.resolve('data', 'topics');
if (!fs.existsSync(dir)) {
  console.log('[]');
  process.exit(0);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const topics = files.map(f => {
  const p = path.join(dir, f);
  const j = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return {
    topicId: j.topicId,
    name: j.name,
    description: j.description,
    keywords: j.keywords || [],
    updatedAt: j.updatedAt,
    rules: j.rules || {}
  };
});

topics.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
console.log(JSON.stringify(topics, null, 2));
