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
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>linuxdo-kb</title>
  <link rel="stylesheet" href="/static/app.css"/>
  </head><body>

  <div class="topbar">
    <div class="inner">
      <div class="brand">linuxdo-kb <span class="badge">MVP</span></div>
      <div class="nav">
        <a class="active" href="/">Topics</a>
        <a href="/posts">Posts</a>
      </div>
      <div style="flex:1"></div>
      <div class="h2">Linux.do 知识库 / 控制面板</div>
    </div>
  </div>

  <div class="container">
    <div class="grid">
      <div class="card">
        <div class="hd">
          <div>
            <div class="h1">Topics</div>
            <div class="h2">数据源：data/topics/*.json</div>
          </div>
          <div class="kv"><span id="topicCount">loading...</span></div>
        </div>
        <div class="bd">
          <div id="topics" class="list"></div>
          <div class="footer">提示：点击 Topic 进入详情页；后续我们会把“关联帖子聚合/向量聚类结果”也放到这里。</div>
        </div>
      </div>

      <div class="card">
        <div class="hd">
          <div>
            <div class="h1">创建 / 更新 Topic</div>
            <div class="h2">topicId + name 必填</div>
          </div>
        </div>
        <div class="bd">
          <div class="help">Topic ID</div>
          <input class="inp" id="tid" placeholder="例如 grok2api"/>

          <div class="help">名称</div>
          <input class="inp" id="tname" placeholder="例如 Grok2API 部署与使用"/>

          <div class="help">关键词（逗号分隔）</div>
          <input class="inp" id="tkw" placeholder="例如 grok,grok2api,x.ai"/>

          <div class="help">描述（可选）</div>
          <input class="inp" id="tdesc" placeholder="一句话描述这个主题"/>

          <div class="help">Rules JSON</div>
          <div class="btnrow" style="margin:8px 0 10px">
            <button class="btn ghost" onclick="fillTemplate()">示例模板</button>
            <button class="btn" onclick="formatJson()">格式化 JSON</button>
            <button class="btn" onclick="validateJson()">校验 JSON</button>
            <button class="btn primary" onclick="createTopic()">创建/更新</button>
          </div>
          <textarea id="trules" placeholder='例如 {"match":{"keywords":["grok","grok2api"],"minScore":2},"seedPosts":["1613202"],"autoTag":true}'></textarea>
          <pre id="log" class="pre" style="margin-top:12px; display:none"></pre>
        </div>
      </div>
    </div>
  </div>

  <script>
    function showLog(obj){
      const el=document.getElementById('log');
      el.style.display='block';
      el.textContent = typeof obj==='string' ? obj : JSON.stringify(obj,null,2);
    }

    async function loadTopics(){
      const r=await fetch('/api/topics');
      const j=await r.json();
      const el=document.getElementById('topics');
      const cnt=document.getElementById('topicCount');
      if(!j.ok){ el.textContent='加载失败：'+(j.error||''); cnt.textContent='error'; return; }
      cnt.textContent = '共 ' + j.topics.length + ' 个';
      if(!j.topics.length){ el.innerHTML='<div class="help">暂无 topic，请先在右侧创建一个。</div>'; return; }
      el.innerHTML=j.topics.map(t=>{
        const kw=(t.keywords||[]).join(', ');
        return '<div class="item">'
          + '<div class="title">'
          +   '<div class="name"><a href="/topic/'+t.topicId+'">'+t.name+'</a> <span class="h2">('+t.topicId+')</span></div>'
          +   '<div class="h2">'+(t.updatedAt||'')+'</div>'
          + '</div>'
          + '<div class="meta">'+(t.description||'').replace(/</g,'&lt;')+'</div>'
          + '<div class="meta">关键词：'+(kw.replace(/</g,'&lt;') || '-')+'</div>'
        + '</div>';
      }).join('');
    }

    function fillTemplate(){
      const tpl={
        match:{ keywords:["grok","grok2api","x.ai"], minScore:2 },
        seedPosts:["1613202"],
        autoTag:true
      };
      document.getElementById('trules').value = JSON.stringify(tpl,null,2);
    }

    function formatJson(){
      const s=document.getElementById('trules').value.trim();
      if(!s) return;
      try{ document.getElementById('trules').value = JSON.stringify(JSON.parse(s),null,2); showLog('✅ 已格式化'); }
      catch(e){ showLog('❌ JSON 格式错误：'+e.message); }
    }

    function validateJson(){
      const s=document.getElementById('trules').value.trim();
      if(!s){ showLog('（rules 为空：允许）'); return; }
      try{ JSON.parse(s); showLog('✅ JSON 校验通过'); }
      catch(e){ showLog('❌ JSON 校验失败：'+e.message); }
    }

    async function createTopic(){
      const topicId=document.getElementById('tid').value.trim();
      const name=document.getElementById('tname').value.trim();
      const keywords=document.getElementById('tkw').value.trim();
      const description=document.getElementById('tdesc').value.trim();
      const rules=document.getElementById('trules').value.trim();
      if(!topicId||!name){ showLog('❌ topicId 和 name 必填'); return; }
      showLog('提交中...');
      const r=await fetch('/api/topic/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topicId,name,keywords,description,rules})});
      const j=await r.json();
      showLog(j);
      if(j.ok) loadTopics();
    }

    loadTopics();
  </script>

  </body></html>`;
}


function renderPost(id) {
  const p = path.join(POSTS_DIR, id, 'content.md');
  if (!fs.existsSync(p)) return null;
  const md = fs.readFileSync(p, 'utf-8');
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${id}</title>
  <link rel="stylesheet" href="/static/app.css"/>
  </head><body>
    <a href="/">← 返回 Topics</a> ｜ <a href="/posts">帖子列表</a>
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

function topicsDir(){
  return path.join(ROOT, 'data', 'topics');
}

function listTopics(){
  const dir = topicsDir();
  if(!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.json'));
  const topics = files.map(f=>{
    const j = JSON.parse(fs.readFileSync(path.join(dir,f),'utf-8'));
    return {
      topicId: j.topicId,
      name: j.name,
      description: j.description || '',
      keywords: j.keywords || [],
      updatedAt: j.updatedAt,
      rules: j.rules || {}
    };
  });
  topics.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  return topics;
}

function renderPostsList(){
  const items = listTopicIds()
    .map(id => ({ id, meta: readMeta(id) }))
    .sort((a, b) => ((b.meta?.fetchedAt) || '').localeCompare((a.meta?.fetchedAt) || ''));

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>posts</title>
  <link rel="stylesheet" href="/static/app.css"/>
  </head><body>
  <a href="/">← 返回 Topics</a>
  <h1>帖子列表（${items.length}）</h1>
  ${items.map(it=>{
    const meta=it.meta||{};
    const source=meta.source||`https://linux.do/t/topic/${it.id}`;
    const time=meta.fetchedAt||'';
    return `<div class="row"><div><a href="/post/${it.id}">${it.id}</a> <span class="muted">${escapeHtml(time)}</span></div>
      <div class="muted"><a href="${escapeHtml(source)}" target="_blank">source</a></div></div>`;
  }).join('')}
  </body></html>`;
}

function renderTopicDetail(topicId){
  const p = path.join(topicsDir(), `${topicId}.json`);
  if(!fs.existsSync(p)) return null;
  const t = JSON.parse(fs.readFileSync(p,'utf-8'));
  const rules = JSON.stringify(t.rules || {}, null, 2);
  const kw = (t.keywords||[]).join(', ');
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(t.name||topicId)}</title>
  <link rel="stylesheet" href="/static/app.css"/>
  </head><body>
    <a href="/">← 返回 Topics</a> ｜ <a href="/posts">帖子列表</a>
    <h1>${escapeHtml(t.name||topicId)} <span class="muted">(${topicId})</span></h1>
    <div class="muted">${escapeHtml(t.description||'')}</div>
    <div class="muted">关键词：${escapeHtml(kw)}</div>
    <h2>Rules</h2>
    <pre>${escapeHtml(rules)}</pre>
    <h2>Seed Posts</h2>
    <div class="muted">（下一步会做：根据 rules/seedPosts 自动把相关帖子聚合到该主题）</div>
    <ul>
      ${(t.rules?.seedPosts||[]).map(id=>`<li><a href="/post/${id}">${id}</a></li>`).join('') || '<li class="muted">暂无</li>'}
    </ul>
  </body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // static assets
  if (req.method === 'GET' && url.pathname === '/static/app.css') {
    const cssPath = path.join(ROOT, 'static', 'app.css');
    if (!fs.existsSync(cssPath)) return send(res, 404, 'not found');
    const css = fs.readFileSync(cssPath, 'utf-8');
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8' });
    return res.end(css);
  }

  if (req.method === 'GET' && url.pathname === '/') {
    return send(res, 200, renderIndex());
  }

  if (req.method === 'GET' && url.pathname === '/posts') {
    return send(res, 200, renderPostsList());
  }

  if (req.method === 'GET' && url.pathname.startsWith('/topic/')) {
    const tid = url.pathname.split('/')[2];
    const html = renderTopicDetail(tid);
    if(!html) return send(res, 404, 'not found');
    return send(res, 200, html);
  }

  if (req.method === 'GET' && url.pathname.startsWith('/post/')) {
    const id = url.pathname.split('/')[2];
    const html = renderPost(id);
    if (!html) return send(res, 404, 'not found');
    return send(res, 200, html);
  }

  if (req.method === 'GET' && url.pathname === '/api/topics') {
    try {
      return sendJson(res, 200, { ok:true, topics: listTopics() });
    } catch(e) {
      return sendJson(res, 200, { ok:false, error: e.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/topic/create') {
    const body = await readBody(req);
    let j;
    try { j = JSON.parse(body || '{}'); } catch { return sendJson(res, 400, { ok:false, error:'bad json' }); }

    const topicId = (j.topicId||'').trim();
    const name = (j.name||'').trim();
    const keywords = (j.keywords||'').trim();
    const description = (j.description||'').trim();
    const rules = (j.rules||'').trim();
    if(!topicId || !name) return sendJson(res, 400, { ok:false, error:'topicId and name required' });

    const args = ['scripts/topic-create.js', topicId, name, keywords, description];
    if(rules) args.push(rules);
    const p = spawn('node', args, { cwd: ROOT });
    let out=''; let err='';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => err += d.toString());
    p.on('close', code => {
      sendJson(res, 200, { ok: code===0, code, out, err });
    });
    return;
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
