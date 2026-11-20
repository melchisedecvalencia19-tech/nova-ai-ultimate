# NOVA AI UPGRADE 3.0

Pembaruan besar untuk project Nova AI berbasis Node.js, Express, SQLite, dan Google Gemini API. Tampilan dibuat minimalis dan tanpa emoji.

## Fitur yang tersedia

1. **Web Search** — pencarian web melalui Google Search grounding Gemini; tautan sumber ditampilkan di bawah jawaban jika API mengirim metadata sumber.
2. **Streaming jawaban** — teks muncul bertahap melalui `streamGenerateContent` (SSE), bukan menunggu seluruh jawaban selesai.
3. **Manajemen percakapan** — riwayat lokal, pencarian, ganti nama, sematkan, hapus, ekspor/cetak, dan bagikan.
4. **Voice Assistant** — dikte suara melalui Web Speech Recognition dan pembacaan jawaban melalui Speech Synthesis. Dukungan dikte bergantung browser/perangkat; Chrome biasanya paling sesuai.
5. **Coding Assistant** — mode Coding dengan instruksi pemrograman khusus dan dukungan upload file kode.
6. **Analisis dokumen** — upload gambar, PDF, DOCX, TXT, MD, CSV, JSON, dan beberapa format kode. PDF/DOCX diekstrak menjadi teks sebelum dikirim ke Gemini.
7. **Image Generator** — endpoint siap digunakan jika `GEMINI_IMAGE_MODEL` diisi dengan model gambar yang benar-benar tersedia pada akun Gemini API Anda.
8. **Memori jangka panjang** — disimpan di SQLite berdasarkan ID browser lokal, lalu disertakan sebagai konteks saat chat.
9. **Pengaturan model** — pemilih model dan slider kreativitas (temperature).
10. **Dashboard penggunaan & keamanan dasar** — statistik token dari metadata Gemini, jumlah request, pencarian web, cache, pembatasan request sederhana, batas ukuran file, dan API key tetap berada di server.

Fitur tambahan: cache jawaban 24 jam untuk pertanyaan tanpa Web Search dan tanpa lampiran.

## Persiapan Windows

1. Buat salinan/backup folder Nova AI lama terlebih dahulu.
2. Ekstrak ZIP ini.
3. Salin file `.env` lama Anda ke folder hasil ekstrak. **Jangan mengganti API key dan jangan mengunggah `.env` ke mana pun.** Jika belum punya `.env`, salin `.env.example` menjadi `.env`, lalu isi `GEMINI_API_KEY`.
4. Buka folder hasil ekstrak di VS Code.
5. Buka Terminal > New Terminal.
6. Jalankan:

```bat
npm.cmd install
```

7. Jalankan:

```bat
npm.cmd start
```

8. Buka `http://localhost:3000`.

## Pengaturan .env

Contoh:

```env
GEMINI_API_KEY=API_KEY_ANDA
GEMINI_MODEL=gemini-3.8-flash
GEMINI_MODELS=gemini-3.8-flash,gemini-2.5-flash,gemini-2.5-pro
GEMINI_IMAGE_MODEL=
PORT=3000
RATE_LIMIT_PER_MINUTE=45
```

- Gunakan nama model yang benar-benar tersedia untuk API key Anda. Daftar `GEMINI_MODELS` hanya mengatur pilihan yang terlihat; itu tidak mengaktifkan model yang belum tersedia di akun.
- `GEMINI_IMAGE_MODEL` opsional. Fitur gambar tidak akan bekerja sampai model gambar yang mendukung output gambar dikonfigurasi dan tersedia di akun Anda.
- Jika model `gemini-3.8-flash` sedang sibuk atau mengembalikan 503, coba model lain yang tersedia di AI Studio atau tunggu beberapa saat.

## Penyimpanan dan privasi

- Riwayat chat dan prompt tersimpan berada di `localStorage` browser.
- Memori jangka panjang, cache jawaban, dan statistik penggunaan berada di `data/nova.db`.
- API key dibaca dari `.env` server dan tidak dikirim ke JavaScript browser.
- ID browser lokal digunakan untuk memisahkan memori/statistik antar-browser. Ini **bukan sistem akun atau autentikasi**.
- Pembatasan request bawaan hanya perlindungan dasar untuk penggunaan lokal. Jangan membuka server ini ke internet publik sebelum menambahkan autentikasi, HTTPS, pengamanan sesi, dan pembatasan akses yang lebih kuat.
- Jangan menghapus folder `data` jika ingin mempertahankan memori, cache, dan statistik.

## Jika terjadi error

- `API key Gemini belum diisi`: pastikan `.env` berada satu folder dengan `server.js`.
- `503 UNAVAILABLE`: layanan/model sedang padat atau tidak tersedia; coba model lain atau ulangi beberapa saat kemudian.
- `Model tidak mengembalikan gambar`: periksa model gambar pada `GEMINI_IMAGE_MODEL` dan ketersediaannya di akun Anda.
- `better-sqlite3` gagal dipasang: gunakan versi Node.js LTS yang didukung, lalu ulangi `npm.cmd install`.
- Tombol dikte suara tidak merespons: izinkan akses mikrofon dan gunakan browser yang mendukung Web Speech Recognition.

## Struktur folder

```text
Nova-AI-Ultimate/
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── data/                 # dibuat otomatis saat server dijalankan
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```
