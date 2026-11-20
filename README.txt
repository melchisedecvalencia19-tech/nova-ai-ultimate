NOVA AI ULTIMATE — PANDUAN INSTALASI
====================================

FITUR YANG TERSEDIA
-------------------
1. Chat AI Gemini dengan jawaban streaming.
2. Pilihan model Gemini dari file .env dan auto-fallback.
3. Google Search grounding melalui tombol Cari web (bergantung dukungan model/akun).
4. Riwayat chat lokal: chat baru, buka, hapus satu, dan hapus semua.
5. Upload dan analisis teks dokumen: PDF, DOCX, TXT, MD, CSV, JSON, JS, HTML, CSS, PY, XML, LOG.
6. Memori AI tersimpan di folder data dan disertakan sebagai konteks chat.
7. Voice input melalui Web Speech API browser yang mendukung.
8. Text-to-speech untuk membacakan jawaban.
9. Pembuatan gambar melalui model Gemini image yang dikonfigurasi.
10. Dashboard penggunaan, status API, dan daftar model.
11. Tema terang/gelap, logo Nova AI, desain biru-putih responsif desktop dan ponsel.

PERSYARATAN
-----------
- Node.js 18 atau lebih baru.
- API key Google Gemini dari Google AI Studio.
- Koneksi internet.

CARA MENJALANKAN DI WINDOWS
---------------------------
1. Ekstrak file ZIP.
2. Buka folder hasil ekstrak di VS Code.
3. Salin .env.example lalu ubah nama salinannya menjadi .env.
4. Buka .env dan isi GEMINI_API_KEY dengan API key milik sendiri.
5. Simpan file .env.
6. Buka Terminal di VS Code, pastikan lokasinya di folder project.
7. Jalankan perintah: npm.cmd install
8. Setelah selesai, jalankan: npm.cmd start
9. Buka browser: http://localhost:3000

CONTOH ISI FILE .env
--------------------
GEMINI_API_KEY=ISI_API_KEY_ANDA
GEMINI_MODEL=gemini-3.8-flash
GEMINI_MODELS=gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
PORT=3000

PENTING
-------
- Ganti ISI_API_KEY_ANDA dengan API key Anda sendiri. Jangan kirim API key ke siapa pun.
- Model yang dapat dipakai bergantung ketersediaan dan akses API key Google Anda.
- Bila model gambar tidak tersedia untuk akun Anda, ubah GEMINI_IMAGE_MODEL ke model image generation yang tersedia di Google AI Studio.
- Google Search grounding juga bergantung dukungan model dan akses akun.
- Voice input bergantung browser dan izin mikrofon; umumnya lebih baik di Chrome.
- PDF/DOCX diekstrak sebagai teks. Dokumen hasil scan/gambar tidak otomatis di-OCR.
- Riwayat chat disimpan di browser yang digunakan. Memori dan statistik disimpan lokal di folder data.
- Statistik dashboard adalah hitungan aplikasi lokal, bukan tagihan resmi Google.
- Project ini untuk penggunaan lokal/pengembangan. Belum dilengkapi login multi-user atau hardening keamanan untuk dipublikasikan ke internet.

TROUBLESHOOTING
---------------
- Jika PowerShell menolak npm, gunakan npm.cmd seperti contoh di atas.
- Jika muncul API key belum diisi, periksa nama file harus .env (bukan .env.txt).
- Jika model tidak tersedia, periksa nama model di Google AI Studio lalu sesuaikan GEMINI_MODEL dan GEMINI_MODELS.
- Setelah mengubah .env, hentikan server dengan Ctrl+C lalu jalankan npm.cmd start kembali.


PERBAIKAN FALLBACK MODEL
------------------------
Server versi ini otomatis mengabaikan gemini-2.5-flash dan gemini-2.5-pro
meskipun file .env lama masih mencantumkannya. Jika Gemini 3.8 Flash sedang
mengalami 503, Nova akan mencoba Gemini 3.5 Flash-Lite dan Gemini 3.1 Flash-Lite.
Jika semua model memberikan 503, berarti layanan/kuota/kapasitas API sedang
tidak tersedia untuk sementara; coba lagi setelah beberapa saat.
