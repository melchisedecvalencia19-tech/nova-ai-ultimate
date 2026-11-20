require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.GEMINI_API_KEY || "";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Jangan gunakan model Gemini 2.5 yang sudah dibatasi untuk banyak pengguna baru.
// Daftar fallback modern tetap ditambahkan meskipun file .env lama masih berisi model 2.5.
const LEGACY_MODELS = new Set(["gemini-2.5-flash", "gemini-2.5-pro"]);
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const MODEL_LIST = [...new Set([
  DEFAULT_MODEL,
  ...(process.env.GEMINI_MODELS || "")
    .split(",").map(x => x.trim()).filter(Boolean),
  ...FALLBACK_MODELS
])].filter(model => !LEGACY_MODELS.has(model));
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");
const USAGE_FILE = path.join(DATA_DIR, "usage.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, "[]");
if (!fs.existsSync(USAGE_FILE)) fs.writeFileSync(USAGE_FILE, JSON.stringify({ requests: 0, images: 0, errors: 0 }, null, 2));

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(express.static(PUBLIC_DIR));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}
function usage() {
  return readJson(USAGE_FILE, { requests: 0, images: 0, errors: 0 });
}
function bump(key) {
  const u = usage();
  u[key] = (u[key] || 0) + 1;
  writeJson(USAGE_FILE, u);
}
function fail(res, status, message) {
  return res.status(status).json({ error: message });
}
function readMemory() {
  const m = readJson(MEMORY_FILE, []);
  return Array.isArray(m) ? m : [];
}
function validText(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function convertMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(m => m && validText(m.content))
    .slice(-60)
    .map(m => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content.trim().slice(0, 100000) }]
    }));
}
function parseApiError(raw, status) {
  try {
    const j = JSON.parse(raw);
    return { code: Number(j.error?.code || status), message: j.error?.message || raw };
  } catch {
    return { code: status, message: raw || "Permintaan Gemini gagal." };
  }
}
async function callGemini(model, body, streaming = false) {
  const method = streaming ? "streamGenerateContent" : "generateContent";
  const query = streaming ? "?alt=sse" : "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${method}${query}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });
}
function parseSseEvent(eventText, onText) {
  for (const line of eventText.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;
    try {
      const obj = JSON.parse(raw);
      const parts = obj.candidates?.[0]?.content?.parts || [];
      for (const p of parts) if (typeof p.text === "string") onText(p.text);
      if (obj.error?.message) console.error("Gemini stream error:", obj.error.message);
    } catch (e) {
      console.error("SSE parse error:", e.message);
    }
  }
}
async function extractFileText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const plain = [".txt", ".md", ".csv", ".json", ".js", ".html", ".css", ".py", ".xml", ".log"];
  if (plain.includes(ext)) return file.buffer.toString("utf8");
  if (ext === ".pdf") {
    const result = await pdfParse(file.buffer);
    return result.text || "";
  }
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }
  throw new Error("Format belum didukung. Gunakan PDF, DOCX, TXT, MD, CSV, JSON, JS, HTML, CSS, PY, XML, atau LOG.");
}

app.get("/api/status", (req, res) => {
  res.json({ configured: Boolean(API_KEY), name: "Nova AI", status: "online" });
});
app.get("/api/models", (req, res) => {
  res.json({ default: DEFAULT_MODEL, models: MODEL_LIST });
});
app.get("/api/memory", (req, res) => res.json({ items: readMemory() }));
app.post("/api/memory", (req, res) => {
  const text = req.body?.text;
  if (!validText(text)) return fail(res, 400, "Isi memori tidak boleh kosong.");
  const items = readMemory();
  const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: text.trim().slice(0, 5000), createdAt: new Date().toISOString() };
  items.unshift(item);
  writeJson(MEMORY_FILE, items);
  res.json({ success: true, item, items });
});
app.delete("/api/memory/:id", (req, res) => {
  const items = readMemory().filter(x => x.id !== req.params.id);
  writeJson(MEMORY_FILE, items);
  res.json({ success: true, items });
});
app.get("/api/dashboard", (req, res) => {
  const u = usage();
  res.json({
    apiConfigured: Boolean(API_KEY),
    models: MODEL_LIST,
    availableModels: MODEL_LIST.length,
    memoryItems: readMemory().length,
    requests: u.requests,
    images: u.images,
    errors: u.errors,
    server: "online"
  });
});

app.post("/api/upload-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, "Pilih file terlebih dahulu.");
    const text = await extractFileText(req.file);
    if (!text.trim()) return fail(res, 400, "Tidak ada teks yang dapat dibaca dari file ini.");
    res.json({ success: true, name: req.file.originalname, text: text.slice(0, 100000) });
  } catch (e) {
    res.status(400).json({ error: e.message || "Gagal membaca dokumen." });
  }
});
// Kompatibilitas dengan app.js yang mengirim teks hasil ekstraksi.
app.post("/api/upload", (req, res) => {
  if (!validText(req.body?.text)) return fail(res, 400, "Dokumen kosong.");
  res.json({ success: true, name: req.body.name || "Dokumen", text: req.body.text.slice(0, 100000) });
});

app.post("/api/chat", async (req, res) => {
  if (!API_KEY) return fail(res, 500, "API key Gemini belum diisi di file .env.");
  const contents = convertMessages(req.body?.messages);
  if (!contents.length) return fail(res, 400, "Pesan kosong. Tulis pesan atau lampirkan file.");

  const requested = req.body?.model;
  const selected = typeof requested === "string" && MODEL_LIST.includes(requested) ? requested : DEFAULT_MODEL;
  const models = [...new Set([selected, ...MODEL_LIST])];
  const savedMemory = readMemory().map(item => item.text).filter(Boolean).slice(0, 30);
  const memoryInstruction = savedMemory.length
    ? "\n\nCatatan memori pengguna yang boleh digunakan sebagai konteks bila relevan:\n- " + savedMemory.join("\n- ")
    : "";
  const body = {
    contents,
    systemInstruction: {
      parts: [{ text: "Kamu adalah Nova AI, asisten AI yang ramah, cerdas, profesional, dan membantu. Jawab dengan bahasa pengguna. Berikan jawaban jelas, akurat, dan terstruktur. Jika diminta kode, berikan kode lengkap yang dapat digunakan." + memoryInstruction }]
    },
    generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 8192 }
  };
  if (req.body?.webSearch === true) body.tools = [{ google_search: {} }];

  let upstream = null;
  let activeModel = "";
  let lastMessage = "Semua model gagal memberikan jawaban.";
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    console.log(`Nova: percobaan ${i + 1}/${models.length} - ${model}`);
    try {
      const attempt = await callGemini(model, body, true);
      if (attempt.ok) {
        upstream = attempt;
        activeModel = model;
        break;
      }
      const raw = await attempt.text();
      const parsed = parseApiError(raw, attempt.status);
      lastMessage = parsed.message;
      console.error(`Nova: ${model} gagal (${parsed.code}): ${parsed.message}`);
      const retryable = [404, 429, 500, 502, 503, 504].includes(parsed.code);
      if (!retryable) return fail(res, parsed.code, parsed.message);
    } catch (e) {
      lastMessage = e.message;
      console.error(`Nova: koneksi ${model} gagal: ${e.message}`);
    }
    if (i < models.length - 1) await new Promise(r => setTimeout(r, 900));
  }
  if (!upstream) {
    bump("errors");
    return fail(res, 503, `Semua model Gemini gagal atau tidak tersedia. Detail terakhir: ${lastMessage}`);
  }

  bump("requests");
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let disconnected = false;
  req.on("aborted", () => { disconnected = true; });
  res.on("close", () => { if (!res.writableEnded) disconnected = true; });

  try {
    while (!disconnected) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";
      for (const event of events) {
        parseSseEvent(event, text => {
          if (!disconnected && !res.writableEnded) res.write(`data: ${JSON.stringify({ text, model: activeModel })}\n\n`);
        });
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) parseSseEvent(buffer, text => {
      if (!disconnected && !res.writableEnded) res.write(`data: ${JSON.stringify({ text, model: activeModel })}\n\n`);
    });
    if (!disconnected && !res.writableEnded) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
    console.log(`Nova: streaming selesai (${activeModel})`);
  } catch (e) {
    console.error("Streaming error:", e);
    if (!disconnected && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: "Streaming terputus: " + e.message })}\n\n`);
      res.end();
    }
  }
});

app.post("/api/image", async (req, res) => {
  if (!API_KEY) return fail(res, 500, "API key Gemini belum diisi di file .env.");
  const prompt = req.body?.prompt;
  if (!validText(prompt)) return fail(res, 400, "Tuliskan deskripsi gambar terlebih dahulu.");
  try {
    const response = await callGemini(IMAGE_MODEL, {
      contents: [{ role: "user", parts: [{ text: prompt.trim() }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
    }, false);
    const raw = await response.text();
    if (!response.ok) {
      const parsed = parseApiError(raw, response.status);
      bump("errors");
      return fail(res, parsed.code, parsed.message);
    }
    const json = JSON.parse(raw);
    const parts = json.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.data);
    const textPart = parts.find(p => p.text)?.text || "";
    if (!imagePart) return fail(res, 502, textPart || "Model tidak mengembalikan gambar. Periksa dukungan model image di akun Anda.");
    bump("images");
    res.json({
      success: true,
      mimeType: imagePart.inlineData.mimeType || "image/png",
      image: imagePart.inlineData.data,
      text: textPart
    });
  } catch (e) {
    bump("errors");
    fail(res, 500, e.message || "Gagal membuat gambar.");
  }
});

app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.use((req, res) => res.status(404).json({ error: "Endpoint tidak ditemukan." }));
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Terjadi kesalahan internal pada server." });
});

app.listen(PORT, () => {
  console.log("\n====================================");
  console.log("          NOVA AI ULTIMATE          ");
  console.log("====================================");
  console.log(`Server       : http://localhost:${PORT}`);
  console.log(`Default model: ${DEFAULT_MODEL}`);
  console.log(`Models       : ${MODEL_LIST.join(", ")}`);
  console.log(`Gemini API   : ${API_KEY ? "Configured" : "Not configured"}`);
  console.log("Auto fallback: aktif");
  console.log("====================================\n");
});
