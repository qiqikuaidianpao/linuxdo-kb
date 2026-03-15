#!/usr/bin/env node
/**
 * 简易 Web 控制面板（MVP）
 * - GET /            首页：帖子列表
 * - GET /post/:id    查看帖子 content.md
 * - POST /api/add    body: { urlOrId }
 * - 静态访问 /posts  直接浏览归档文件
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = path.resolve('.');
const POSTS_DIR = path.join(ROOT, 'posts');

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function listTopicIds() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR).filter(x => /^\d+$/.test(x));
}

function readMeta(id) {
  const p = path.join(POSTS_DIR, id, 'meta.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

function renderIndex() {
  const items = listTopicIds()
    .map(id => ({ id, meta: readMeta(id) }))
    .sort((a, b) => ((b.meta?.fetchedAt) || '').localeCompare((a.meta?.fetchedAt) || ''));

  let html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>linuxdo-kb</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Arial; margin:24px;}
    .muted{color:#666;font-size:12px}
    .row{padding:10px 0;border-bottom:1px solid #eee}
    input{padding:8px;width:380px;max-width:100%}
    button{padding:8px 12px;margin-left:8px}
    a{color:#0b65c2;text-decoration:none}
  </style>
  </head><body>
  <h1>linuxdo-kb 控制面板（MVP）</h1>
  <div class="muted">POST /api/add 可添加帖子；当前只做 raw 归档 + 浏览。</div>
  <h2>添加帖子</h2>
  <input id="u" placeholder="topic url 或 topicId，例如 1613202"/>
  <button onclick="add()">添加</button>
  <pre id="log" class="muted"></pre>
  <script>
    async function add(){
      const urlOrId=document.getElementById('u').value.trim();
      if(!urlOrId) return;
      document.getElementById('log').textContent='添加中...';
      const r=await fetch('/api/add',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({urlOrId})});
      const j=await r.json();
      document.getElementById('log').textContent=JSON.stringify(j,null,2);
      if(j.ok) location.reload();
    }
  </script>

  <h2>已归档帖子（${items.length}）</h2>
  ${items.map(it=>{
    const meta=it.meta||{};
    const source=meta.source||`https://linux.do/t/topic/${it.id}`;
    const t=meta.title?escapeHtml(meta.title):'';
    const time=meta.fetchedAt||'';
    return `<div class="row"><div><a href="/post/${it.id}">${it.id}</a> <span class="muted">${escapeHtml(time)}</span></div>
      <div class="muted"><a href="${escapeHtml(source)}" target="_blank">source</a></div></div>`;
  }).join('')}

  </body></html>`;
  return html;
}

function renderPost(id) {
  const p = path.join(POSTS_DIR, id, 'content.md');
  if (!fs.existsSync(p)) return null;
  const md = fs.readFileSync(p, 'utf-8');
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${id}</title>
    <style>body{font-family:system-ui; margin:24px;} pre{white-space:pre-wrap; word-break:break-word;}</style>
  </head><body>
    <a href="/">← 返回</a>
    <h1>帖子 ${id}</h1>
    <pre>${escapeHtml(md)}</pre>
  </body></html>`;
  return html;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf='';
    req.on('data', d => buf += d);
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });
}

function runAdd(urlOrId) {
  return new Promise((resolve) => {
    const p = spawn('node', ['scripts/add-post.js', urlOrId], { cwd: ROOT });
    let out='';
    let err='';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => err += d.toString());
    p.on('close', code => {
      resolve({ code, out, err });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') {
    return send(res, 200, renderIndex());
  }

  if (req.method === 'GET' && url.pathname.startsWith('/post/')) {
    const id = url.pathname.split('/')[2];
    const html = renderPost(id);
    if (!html) return send(res, 404, 'not found');
    return send(res, 200, html);
  }

  if (req.method === 'POST' && url.pathname === '/api/add') {
    const body = await readBody(req);
    let j;
    try { j = JSON.parse(body || '{}'); } catch { return sendJson(res, 400, { ok:false, error:'bad json' }); }
    const urlOrId = (j.urlOrId || '').trim();
    if (!urlOrId) return sendJson(res, 400, { ok:false, error:'missing urlOrId' });
    const r = await runAdd(urlOrId);
    return sendJson(res, 200, { ok: r.code === 0, ...r });
  }

  return send(res, 404, 'not found');
});

server.listen(PORT, () => {
  console.log(`✅ linuxdo-kb web ui listening on http://0.0.0.0:${PORT}`);
});
