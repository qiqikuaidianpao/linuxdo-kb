#!/usr/bin/env python3
"""embed_worker.py

本地 embedding worker（Python）：
- stdin 读入 JSON：{"id": "1613202", "text": "..."}
- stdout 输出 JSON：{"id": "1613202", "dim": 384, "vector": [...]} 

默认模型：sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
（先跑通；后续可切换 bge-small-zh / bge-m3）

环境变量：
- EMBED_MODEL: 模型名
"""

import json
import os
import sys

MODEL = os.environ.get("EMBED_MODEL", "BAAI/bge-small-zh-v1.5")

# 延迟导入，减少启动干扰
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(MODEL)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req = json.loads(line)
    _id = req.get("id")
    text = req.get("text", "")
    vec = model.encode([text], normalize_embeddings=True)[0]
    out = {
        "id": _id,
        "dim": len(vec),
        "vector": [float(x) for x in vec],
    }
    sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
    sys.stdout.flush()
