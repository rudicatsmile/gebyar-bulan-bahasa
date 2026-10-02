# Panduan Migrasi Database: Supabase Cloud ke Self-Hosted VPS
**Aplikasi:** GebyarBulanBahasa  
**Target Arsitektur:** Hybrid Architecture (Frontend Next.js di Vercel + Backend Supabase Docker di VPS)  
**Status Dokumen:** Panduan Resmi Arsitektur & Operasional  

---

## 1. Ringkasan Eksekutif & Keputusan Arsitektur

Berdasarkan hasil analisis menyeluruh terhadap seluruh kode sumber sistem **Gebyar Bulan Bahasa**, aplikasi ini sangat bergantung pada ekosistem Supabase, meliputi:
- **Supabase Auth & Session** (`@supabase/ssr` dengan cookie-based middleware & role-based access control).
- **PostgreSQL Database & RLS** (Row Level Security berbasis `auth.uid()` dan schema migrations).
- **Supabase Realtime WebSockets** (`postgres_changes` untuk live monitoring juri dan rekap skor).
- **Supabase Storage** (Penyimpanan aset twibbon, foto baju daerah, dan bukti dokumen).

### Pilihan Arsitektur: **Self-Hosted Supabase di VPS via Docker Compose**
Memindahkan database ke VPS dengan cara **menjalankan full-stack Supabase Docker** adalah pendekatan terbaik karena:
1. **Zero Code Refactoring:** Seluruh kode Next.js, Server Actions, middleware, dan hooks realtime tetap **100% kompatibel** tanpa perlu penulisan ulang ke ORM lain.
2. **Kendali Penuh & Tanpa Batasan Kuota Cloud:** Bebas dari limitasi baris data, limit bandwidth, dan biaya langganan bulanan tier cloud.
3. **Kemandirian Data:** Seluruh data peserta, dewan juri, dan nilai tersimpan aman di server privat milik instansi/sekolah.

---

## 2. Diagram Arsitektur Sistem

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER (VERCEL)                         │
│  Next.js 15 App Router • Server Actions • Client Realtime Hooks        │
│  URL: https://gebyar-bulan-bahasa.vercel.app                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (API) & WSS (WebSockets)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EDGE / REVERSE PROXY                            │
│  Cloudflare (CDN & DDoS Guard) ──► Nginx + Let's Encrypt SSL           │
│  Domain: https://api.domainsekolah.sch.id                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Localhost Reverse Proxy (:8000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    SELF-HOSTED SUPABASE (VPS DOCKER)                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │  Kong Gateway │  │  GoTrue Auth  │  │   PostgREST   │               │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘               │
│          │                  │                  │                       │
│  ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐               │
│  │Realtime Server│  │  Storage API  │  │ PostgreSQL 15 │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spesifikasi Kebutuhan VPS

| Komponen | Spesifikasi Minimum | Spesifikasi Rekomendasi (Event Besar) |
|---|---|---|
| **Sistem Operasi** | Ubuntu 22.04 / 24.04 LTS (64-bit) | Ubuntu 24.04 LTS (64-bit) |
| **Processor (CPU)** | 2 vCPU Core | 4 vCPU Core |
| **Memori (RAM)** | 4 GB RAM *(+ 2 GB Swap)* | 8 GB RAM *(+ 4 GB Swap)* |
| **Penyimpanan (Disk)** | 40 GB SSD / NVMe | 80 GB NVMe |
| **Lokasi Datacenter** | Indonesia (Jakarta) / Singapura | Indonesia (Jakarta) |
| **Jaringan & IP** | 1 IP Publik Statis, Bandwidth 1 Gbps | 1 IP Publik Statis, Unmetered |
| **Domain & SSL** | 1 Subdomain (misal `api.domain.com`) | Domain aktif + Cloudflare Proxy |

> [!IMPORTANT]
> **Penting Mengenai Lokasi Datacenter:**
> Karena frontend Next.js berada di Vercel (kawasan regional Asia Tenggara), pilihlah VPS dengan lokasi **Jakarta** atau **Singapura** (contoh provider: IDCloudHost, BiznetGio, DigitalOcean SG, Linode SG). Hindari server di kawasan Amerika Serikat atau Eropa agar latensi koneksi database tetap sangat rendah (< 30 ms).

---

## 4. Analisis 5 Fitur Kritis & Solusi Optimalisasi

### 1. Realtime WebSockets (Live Monitoring & Penilaian Juri)
* **File Terdampak:** `src/hooks/useRealtimeMonitoring.ts`, `src/hooks/useRealtimeScoringRecap.ts`, `src/hooks/useRealtime.ts`.
* **Potensi Masalah:** Koneksi WebSocket (`wss://`) akan putus/gagal terhubung (*status error atau loop reconnect*) jika Nginx reverse proxy tidak meneruskan header `Upgrade` dan `Connection`.
* **Solusi Wajib:** Tambahkan direktif WebSocket pada konfigurasi Nginx:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_http_version 1.1;
  proxy_read_timeout 86400s;
  ```

### 2. Pengiriman Email Autentikasi (GoTrue Auth)
* **File Terdampak:** Registrasi peserta baru, reset password, dan aktivasi akun panitia/juri.
* **Potensi Masalah:** Di Supabase Cloud, email ditangani otomatis oleh cloud mailer. Di VPS, container `gotrue` **tidak menyediakan mail server internal**. Jika variabel SMTP kosong, pengiriman email verifikasi atau reset sandi akan gagal.
* **Solusi Wajib:** Daftarkan akun SMTP eksternal (misal: **Resend**, **Brevo**, **Mailgun**, atau **Gmail App Password**), lalu isikan kredensialnya ke file `.env` Supabase Docker:
  ```env
  SMTP_ADMIN_EMAIL=panitia@sekolah.sch.id
  SMTP_HOST=smtp.resend.com
  SMTP_PORT=465
  SMTP_USER=resend
  SMTP_PASS=re_xxxxxxxxx
  SMTP_SENDER_NAME="Gebyar Bulan Bahasa"
  ENABLE_EMAIL_AUTOCONFIRM=true # (Opsional: aktifkan jika ingin peserta langsung aktif tanpa verifikasi email)
  ```

### 3. Latensi Jaringan Vercel-to-VPS
* **File Terdampak:** Kecepatan respon Server Actions (input nilai juri, klaim poin, verifikasi berkas).
* **Potensi Masalah:** Setiap Server Action di Vercel akan mengirim HTTP request ke VPS Anda melalui internet publik. Jika jalur jaringan lambat, tombol "Simpan" atau "Submit" di dashboard terasa lambat merespons.
* **Solusi Wajib:** 
  - Gunakan datacenter VPS di Jakarta/Singapura.
  - Aktifkan fitur connection pooling Supabase (Supavisor) pada port 6543 jika traffic konkurensi juri sangat tinggi.

### 4. Storage & Bandwidth Aset Media
* **File Terdampak:** Upload & download twibbon, foto baju daerah (`src/app/actions/puzzle.ts`), dan foto dokumen lomba.
* **Potensi Masalah:** Seluruh unduhan gambar akan dibebankan langsung ke interface jaringan VPS lokal. Bila ratusan peserta mengakses halaman twibbon secara simultan, bandwidth VPS dapat penuh.
* **Solusi Wajib:** Aktifkan **Cloudflare CDN (Proxy Awan Jingga)** untuk subdomain API Anda. Cloudflare akan menyimpan cache gambar statis di server edge mereka, memangkas beban bandwidth VPS hingga 80%.

### 5. Keamanan & Backup Otomatis (Disaster Recovery)
* **File Terdampak:** Seluruh tabel database lomba (`assessments`, `participants`, `competitions`, `puzzle_items`, dll.).
* **Potensi Masalah:** Di VPS tidak ada automated snapshot seperti di cloud. Kerusakan disk atau kesalahan eksekusi query bisa menghilangkan data permanen.
* **Solusi Wajib:** Buat script cron job otomatis setiap malam untuk melakukan `pg_dump` dan mengunggah salinan file backup ke penyimpanan terpisah (Google Drive / S3 / server cadangan).

---

## 5. Panduan Instalasi Self-Hosted Supabase di VPS (Step-by-Step)

### Langkah 1: Persiapan Server VPS
Login ke server VPS menggunakan SSH, lalu lakukan update sistem dan instalasi dependensi:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx
```

Instal Docker & Docker Compose:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

Konfigurasi Firewall (UFW):
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

### Langkah 2: Unduh Repositori Resmi Supabase Docker
Buat direktori kerja di VPS:
```bash
mkdir -p /opt/supabase
cd /opt/supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

---

### Langkah 3: Konfigurasi Kunci Keamanan (.env)
Buka file `.env` menggunakan nano atau vim:
```bash
nano .env
```

Lakukan penyesuaian pada variabel-variabel kunci berikut:
1. **Password Database:**
   ```env
   POSTGRES_PASSWORD=GantiDenganPasswordDatabaseYangSangatKuat123!
   ```
2. **Kunci Rahasia JWT & API Keys:**
   Buat string acak 40+ karakter untuk `JWT_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Gunakan [jwt.io](https://jwt.io) atau generator resmi Supabase untuk membuat `ANON_KEY` dan `SERVICE_ROLE_KEY` baru berbasis `JWT_SECRET` tersebut.
3. **URL API Publik:**
   ```env
   API_EXTERNAL_URL=https://api.domainsekolah.sch.id
   SUPABASE_PUBLIC_URL=https://api.domainsekolah.sch.id
   ```
4. **Konfigurasi SMTP Email:**
   Isikan data server SMTP Anda pada bagian `SMTP_*`.

---

### Langkah 4: Menjalankan Container Supabase
Jalankan seluruh service Supabase di latar belakang:
```bash
docker compose pull
docker compose up -d
```

Periksa status container:
```bash
docker compose ps
```
Pastikan seluruh container (Kong, GoTrue, PostgREST, Realtime, Storage, Postgres, Studio) berada dalam status `running / healthy`.

---

### Langkah 5: Setup Nginx Reverse Proxy & SSL Let's Encrypt
Buat file konfigurasi Nginx untuk subdomain API Supabase:
```bash
sudo nano /etc/nginx/sites-available/supabase-api.conf
```

Tempelkan konfigurasi berikut:
```nginx
server {
    server_name api.domainsekolah.sch.id;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeout for Realtime WebSockets
        proxy_connect_timeout 60s;
        proxy_send_timeout 86400s;
        proxy_read_timeout 86400s;
    }
}
```

Aktifkan situs dan pasang sertifikat SSL gratis:
```bash
sudo ln -s /etc/nginx/sites-available/supabase-api.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.domainsekolah.sch.id
```

---

## 6. Prosedur Migrasi Data dari Supabase Cloud ke VPS

### Langkah 1: Ekspor Database dari Supabase Cloud
Buka terminal komputer lokal yang memiliki koneksi internet baik:
```bash
# Export skema & data menggunakan pg_dump
pg_dump -h db.lumrqtxmdcrjxjxzrqau.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -b -v \
        -f backup_gebyar_bulan_bahasa.dump
```
*(Masukkan password database Supabase Cloud saat diminta).*

### Langkah 2: Transfer File Backup ke VPS
```bash
scp backup_gebyar_bulan_bahasa.dump user@ip_vps_anda:/home/user/
```

### Langkah 3: Pulihkan (Restore) Data ke PostgreSQL VPS
Di dalam VPS, jalankan perintah restore ke container PostgreSQL:
```bash
docker exec -i supabase-db pg_restore -U postgres -d postgres -v < /home/user/backup_gebyar_bulan_bahasa.dump
```

Jika database baru masih kosong dan ingin menjalankan migrasi schema lokal proyek:
```bash
# Alternatif: Jalankan file migrasi yang ada di folder supabase/migrations/
cat supabase/migrations/0001_initial_schema.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/0002_puzzle_challenge.sql | docker exec -i supabase-db psql -U postgres -d postgres
```

---

## 7. Pembaruan Konfigurasi di Vercel Dashboard

Setelah server VPS aktif dan data selesai dipulihkan, Anda tidak perlu mengubah satu baris pun kode Next.js. Cukup perbarui **Environment Variables** di Vercel:

1. Buka [Vercel Dashboard](https://vercel.com/) ➔ Pilih Proyek **gebyar-bulan-bahasa**.
2. Masuk ke tab **Settings** ➔ **Environment Variables**.
3. Perbarui variabel-variabel berikut untuk environment *Production* dan *Preview*:

| Variable Name | Nilai Baru | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://api.domainsekolah.sch.id` | Alamat API gateway VPS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh... (Anon Key Baru VPS)` | Kunci anon dari file `.env` VPS |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh... (Service Key Baru VPS)` | Kunci admin dari file `.env` VPS |

4. Klik **Save**, lalu lakukan **Redeploy** pada deployment aktif di Vercel.

---

## 8. Skrip Pemeliharaan: Backup Harian Otomatis

Buat skrip backup berkala di server VPS:
```bash
sudo nano /usr/local/bin/backup-supabase.sh
```

Isikan skrip bash berikut:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/supabase"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

# Dump database dari container
docker exec supabase-db pg_dump -U postgres -d postgres -F c -b -f /tmp/backup_$TIMESTAMP.dump

# Pindahkan ke folder backup
docker cp supabase-db:/tmp/backup_$TIMESTAMP.dump $BACKUP_DIR/db_$TIMESTAMP.dump
docker exec supabase-db rm /tmp/backup_$TIMESTAMP.dump

# Hapus backup yang lebih tua dari 7 hari
find $BACKUP_DIR -type f -name "*.dump" -mtime +$RETENTION_DAYS -exec rm {} \;

echo "Backup selesai: db_$TIMESTAMP.dump"
```

Beri izin eksekusi:
```bash
sudo chmod +x /usr/local/bin/backup-supabase.sh
```

Daftarkan ke cron job harian (berjalan setiap jam 02:00 pagi):
```bash
sudo crontab -e
```
Tambahkan baris:
```cron
0 2 * * * /usr/local/bin/backup-supabase.sh >> /var/log/supabase-backup.log 2>&1
```

---

## 9. Checklist Uji Kelayakan Pasca Migrasi (*Smoke Test Checklist*)

Setelah proses migrasi selesai, lakukan pengujian fungsional berikut sebelum hari pelaksanaan acara:

- [ ] **Koneksi Dashboard:** Halaman `/dashboard` dapat dibuka tanpa pesan error koneksi Supabase.
- [ ] **Login & Role:** Akun panitia (`seksi_acara`), juri, dan media dapat login dengan session cookie aktif.
- [ ] **Live Monitoring (WebSocket):** Buka halaman `/dashboard/penilaian` dan pantau indikator realtime (harus berstatus *"Connected"*).
- [ ] **Input Skor Juri:** Juri memasukkan nilai draft dan final, pastikan nilai langsung muncul di rekapitulasi tanpa reload manual.
- [ ] **Storage Upload:** Coba upload gambar baru pada form *Challenge Puzzle Baju Daerah* (`/dashboard/challenge/puzzle`) dan pastikan thumbnail muncul.
- [ ] **Backup Test:** Jalankan `/usr/local/bin/backup-supabase.sh` dan pastikan file `.dump` terbuat dengan ukuran yang valid.
