const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// API Keys: 优先环境变量（Railway），其次 config.json（本地开发）
const KEYS = {
  deepseek: process.env.DEEPSEEK_API_KEY || '',
  gemini: process.env.GEMINI_API_KEY || '',
  kimi: process.env.KIMI_API_KEY || '',
};

// 如果环境变量未设置，尝试从 config.json 读取（本地开发模式）
if (!KEYS.deepseek && !KEYS.gemini && !KEYS.kimi) {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const CONFIG = require(configPath);
      KEYS.deepseek = CONFIG.deepseek || '';
      KEYS.gemini = CONFIG.gemini || '';
      KEYS.kimi = CONFIG.kimi || '';
      console.log('📁 已从 config.json 加载 API Keys');
    }
  } catch (e) {
    // 部署环境没有 config.json 是正常的
  }
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ---------- DeepSeek Proxy ----------
app.post('/api/deepseek', async (req, res) => {
  const { prompt, systemPrompt } = req.body;
  if (!KEYS.deepseek) return res.status(500).json({ error: '服务端未配置 DeepSeek API Key' });

  console.log('[DeepSeek] 发起请求...');
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => { console.log('[DeepSeek] 超时 25s'); controller.abort(); }, 25000);

  req.on('aborted', () => {
    clearTimeout(timer);
    controller.abort();
  });

  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEYS.deepseek}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    console.log(`[DeepSeek] 响应 ${resp.status} (${Date.now() - start}ms)`);
    if (!resp.ok) {
      const err = await resp.text();
      console.log(`[DeepSeek] 错误: ${err.slice(0, 200)}`);
      return res.status(resp.status).json({ error: `DeepSeek: ${err}` });
    }

    const data = await resp.json();
    console.log(`[DeepSeek] 成功 (${Date.now() - start}ms)`);
    res.json({ text: data.choices[0].message.content, model: 'DeepSeek' });
  } catch (e) {
    clearTimeout(timer);
    console.log(`[DeepSeek] 异常 (${Date.now() - start}ms): ${e.message}`);
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'DeepSeek 请求超时' });
    }
    res.status(500).json({ error: `DeepSeek: ${e.message}` });
  }
});

// ---------- Gemini Proxy ----------
app.post('/api/gemini', async (req, res) => {
  const { prompt, systemPrompt } = req.body;
  if (!KEYS.gemini) return res.status(500).json({ error: '服务端未配置 Gemini API Key' });

  console.log('[Gemini] 发起请求...');
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => { console.log('[Gemini] 超时 25s'); controller.abort(); }, 25000);

  req.on('aborted', () => {
    clearTimeout(timer);
    controller.abort();
  });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(KEYS.gemini)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }], role: 'user' }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    console.log(`[Gemini] 响应 ${resp.status} (${Date.now() - start}ms)`);
    if (!resp.ok) {
      const err = await resp.text();
      console.log(`[Gemini] 错误: ${err.slice(0, 200)}`);
      return res.status(resp.status).json({ error: `Gemini: ${err}` });
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[Gemini] 成功 (${Date.now() - start}ms)`);
    res.json({ text, model: 'Gemini' });
  } catch (e) {
    clearTimeout(timer);
    console.log(`[Gemini] 异常 (${Date.now() - start}ms): ${e.message}`);
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'Gemini 请求超时' });
    }
    res.status(500).json({ error: `Gemini: ${e.message}` });
  }
});

// ---------- Kimi (Moonshot) Proxy ----------
app.post('/api/kimi', async (req, res) => {
  const { prompt, systemPrompt } = req.body;
  if (!KEYS.kimi) return res.status(500).json({ error: '服务端未配置 Kimi API Key' });

  console.log('[Kimi] 发起请求...');
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => { console.log('[Kimi] 超时 25s'); controller.abort(); }, 25000);

  req.on('aborted', () => {
    clearTimeout(timer);
    controller.abort();
  });

  try {
    const resp = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEYS.kimi}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    console.log(`[Kimi] 响应 ${resp.status} (${Date.now() - start}ms)`);
    if (!resp.ok) {
      const err = await resp.text();
      console.log(`[Kimi] 错误: ${err.slice(0, 200)}`);
      return res.status(resp.status).json({ error: `Kimi: ${err}` });
    }

    const data = await resp.json();
    console.log(`[Kimi] 成功 (${Date.now() - start}ms)`);
    res.json({ text: data.choices[0].message.content, model: 'Kimi' });
  } catch (e) {
    clearTimeout(timer);
    console.log(`[Kimi] 异常 (${Date.now() - start}ms): ${e.message}`);
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'Kimi 请求超时' });
    }
    res.status(500).json({ error: `Kimi: ${e.message}` });
  }
});

// ---------- API 连通性测试 ----------
app.get('/api/test/:provider', async (req, res) => {
  const { provider } = req.params;
  const keyMap = {
    deepseek: { key: KEYS.deepseek, url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat', name: 'DeepSeek' },
    gemini: { key: KEYS.gemini, url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(KEYS.gemini)}`, model: null, name: 'Gemini' },
    kimi: { key: KEYS.kimi, url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k', name: 'Kimi' },
  };

  const cfg = keyMap[provider];
  if (!cfg) return res.status(400).json({ error: '未知 provider' });
  if (!cfg.key) return res.status(500).json({ error: `未配置 ${cfg.name} API Key` });

  const start = Date.now();
  try {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cfg.key.startsWith('AIza') && provider === 'gemini'
        ? JSON.stringify({ systemInstruction: { parts: [{ text: 'Hi' }] }, contents: [{ parts: [{ text: 'Hello' }], role: 'user' }] })
        : JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 10 }),
      signal: AbortSignal.timeout(10000),
    };
    if (!cfg.key.startsWith('AIza') || provider !== 'gemini') {
      opts.headers.Authorization = `Bearer ${cfg.key}`;
    }

    const resp = await fetch(cfg.url, opts);
    const ms = Date.now() - start;
    if (resp.ok) {
      res.json({ provider: cfg.name, status: 'OK', time: `${ms}ms` });
    } else {
      const err = await resp.text().catch(() => '');
      res.json({ provider: cfg.name, status: 'FAIL', code: resp.status, detail: err.slice(0, 300), time: `${ms}ms` });
    }
  } catch (e) {
    res.json({ provider: cfg.name, status: 'ERROR', detail: e.message, time: `${Date.now() - start}ms` });
  }
});

// ---------- Health Check ----------
app.get('/api/health', (req, res) => {
  const available = [];
  if (KEYS.deepseek) available.push('DeepSeek');
  if (KEYS.gemini) available.push('Gemini');
  if (KEYS.kimi) available.push('Kimi');
  res.json({ ok: true, available, total: available.length });
});

// ---------- 调试端点（部署排查问题用） ----------
app.get('/api/debug', (req, res) => {
  res.json({
    keys: {
      deepseek: KEYS.deepseek ? `已设置 (${KEYS.deepseek.slice(0, 10)}...)` : '未设置',
      gemini: KEYS.gemini ? `已设置 (${KEYS.gemini.slice(0, 10)}...)` : '未设置',
      kimi: KEYS.kimi ? `已设置 (${KEYS.kimi.slice(0, 10)}...)` : '未设置',
    },
    rawEnv: {
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? `存在 (长度 ${process.env.DEEPSEEK_API_KEY.length})` : '不存在',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `存在 (长度 ${process.env.GEMINI_API_KEY.length})` : '不存在',
      KIMI_API_KEY: process.env.KIMI_API_KEY ? `存在 (长度 ${process.env.KIMI_API_KEY.length})` : '不存在',
    }
  });
});

app.listen(PORT, () => {
  const count = [KEYS.deepseek, KEYS.gemini, KEYS.kimi].filter(Boolean).length;
  const names = ['DeepSeek','Gemini','Kimi'].filter((_,i) => [KEYS.deepseek,KEYS.gemini,KEYS.kimi][i]);
  console.log(`⚖️  AI 辩论模拟器已启动`);
  console.log(`   端口: ${PORT}`);
  console.log(`   API: ${count}/3 (${names.join(', ') || '无'})`);
  if (PORT === 3001) console.log(`   地址: http://localhost:${PORT}`);
});
