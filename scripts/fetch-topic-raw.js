#!/usr/bin/env node
/**
 * fetch-topic-raw.js
 *
 * 读取 Linux.do 的 /raw/<topicId> 内容（需要 Cookie，走 FlareSolverr），并把内容归档到 posts/<topicId>/content.md
 *
 * 用法：
 *   node scripts/fetch-topic-raw.js https://linux.do/t/topic/1613202
 *   node scripts/fetch-topic-raw.js 1613202
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';

const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || 'http://192.168.31.6:8191/v1';
const COOKIE_FILE = process.env.LINUXDO_COOKIE_FILE || '/root/.openclaw/workspace/.secrets/linuxdo_cookies.txt';

function readCookies() {
  if (!fs.existsSync(COOKIE_FILE)) throw new Error(`Cookie 文件不存在: ${COOKIE_FILE}`);
  const cookieStr = fs.readFileSync(COOKIE_FILE, 'utf-8').trim();
  if (!cookieStr) throw new Error('Cookie 文件为空');
  return cookieStr;
}

function parseCookies(cookieStr) {
  return cookieStr.split('; ').map(c => {
    const [name, ...valueParts] = c.split('=');
    return { name: name.trim(), value: valueParts.join('=').trim(), domain: '.linux.do' };
  });
}

function extractTopicId(input) {
  if (/^\d+$/.test(input)) return input;
  const m = input.match(/linux\.do\/t\/topic\/(\d+)/);
  return m ? m[1] : null;
}

function chromePreUnwrap(html) {
  const m = html.match(/^<html><head><meta name="color-scheme"[^>]*><\/head><body><pre[^>]*>([\s\S]*)<\/pre><\/body><\/html>$/);
  return m ? m[1] : null;
}

async function fetchRaw(topicId) {
  const rawUrl = `https://linux.do/raw/${topicId}`;
  const cookies = parseCookies(readCookies());

  const res = await axios.post(
    FLARESOLVERR_URL,
    {
      cmd: 'request.get',
      url: rawUrl,
      cookies,
      maxTimeout: 60000
    },
    { timeout: 120000 }
  );

  if (res.data.status !== 'ok' || !res.data.solution) {
    throw new Error(`FlareSolverr 返回错误: ${res.data.message || 'unknown'}`);
  }

  const response = res.data.solution.response;
  const unwrapped = chromePreUnwrap(response);
  const content = unwrapped ?? response;

  // 简单判定：如果还是 HTML，说明可能是挑战页/登录页
  if (content.includes('<html') || content.includes('<!DOCTYPE html>')) {
    throw new Error('raw 返回 HTML（可能是 CF 挑战页或登录页），请更新 Cookie 或检查 FlareSolverr');
  }

  return { topicId, rawUrl, content };
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('用法: node scripts/fetch-topic-raw.js <topicUrl|topicId>');
    process.exit(1);
  }

  const topicId = extractTopicId(arg);
  if (!topicId) {
    console.error('无法解析 topicId:', arg);
    process.exit(1);
  }

  const { content } = await fetchRaw(topicId);

  const postDir = path.resolve('posts', topicId);
  ensureDir(postDir);
  fs.writeFileSync(path.join(postDir, 'content.md'), content);

  const meta = {
    topicId,
    fetchedAt: new Date().toISOString(),
    source: `https://linux.do/t/topic/${topicId}`
  };
  fs.writeFileSync(path.join(postDir, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log(`✅ 已归档 posts/${topicId}/content.md`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
