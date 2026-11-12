<#
.SYNOPSIS
  Backup database Supabase A (schema public + data public + data auth) lalu restore ke database Supabase B.

.DESCRIPTION
  - Backup  : pg_dump -> public_schema.sql, data.sql (public + auth, 1 snapshot konsisten)
  - Restore : psql dalam SATU transaksi (atomic). Jika ada error, B otomatis rollback.
  - Restore akan:
      1. DROP + CREATE ulang schema public di B (beserta grant default Supabase)
      2. TRUNCATE semua tabel auth di B (kecuali auth.schema_migrations)
      3. Load schema public, lalu data public + auth
      4. session_replication_role = replica -> trigger (mis. handle_new_user) & FK tidak aktif saat load

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\supabase-backup-restore.ps1
  powershell -ExecutionPolicy Bypass -File .\supabase-backup-restore.ps1 -Mode Backup
  powershell -ExecutionPolicy Bypass -File .\supabase-backup-restore.ps1 -Mode Restore -RestoreFrom .\backups\backup_20261110_101500
#>
[CmdletBinding()]
param(
    [ValidateSet('Backup', 'Restore', 'Both')]
    [string]$Mode = 'Both',

    [string]$BackupDir = (Join-Path (Get-Location) 'backups'),

    # Dipakai hanya untuk Mode Restore: folder hasil backup sebelumnya
    [string]$RestoreFrom
)

# ====================== KONFIGURASI (EDIT BAGIAN INI) ======================
# Gunakan Session Pooler (port 5432) atau Direct Connection. JANGAN pakai Transaction Pooler (6543) untuk pg_dump.
# Username pooler berformat: postgres.<project-ref>
$Source = @{
    Host = 'aws-0-ap-northeast-2.pooler.supabase.com'
    Port = 5432
    User = 'postgres.xdfwxvsgbopapwlrbzwj'
    Db   = 'postgres'
}
$Target = @{
    Host = 'aws-0-ap-northeast-2.pooler.supabase.com'
    Port = 5432
    User = 'postgres.jcxranezlwqxawnpzxub'
    Db   = 'postgres'
}

# Folder bin PostgreSQL client (kosongkan jika pg_dump & psql sudah ada di PATH)
$PgBin = 'C:\Program Files\PostgreSQL\17\bin'
# ============================================================================

$ErrorActionPreference = 'Stop'

function Get-PgTool([string]$Name) {
    if ($PgBin) {
        $p = Join-Path $PgBin "$Name.exe"
        if (Test-Path $p) { return $p }
    }
    $c = Get-Command "$Name.exe" -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    throw "$Name.exe tidak ditemukan. Install PostgreSQL client tools dan/atau set `$PgBin."
}

function Read-Plain([string]$Prompt) {
    $s = Read-Host $Prompt -AsSecureString
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

function Invoke-Native([string]$Exe, [string[]]$ArgList) {
    & $Exe @ArgList
    if ($LASTEXITCODE -ne 0) {
        throw "Perintah gagal (exit code $LASTEXITCODE): $(Split-Path $Exe -Leaf)"
    }
}

function Set-PgEnv([hashtable]$Conn, [string]$Password) {
    $env:PGPASSWORD = $Password
    $env:PGSSLMODE = 'require'
    $env:PGCONNECT_TIMEOUT = '30'
}

function Write-Utf8NoBom([string]$Path, [string[]]$Lines) {
    [IO.File]::WriteAllLines($Path, $Lines, (New-Object Text.UTF8Encoding($false)))
}

function Get-Summary([hashtable]$Conn, [string]$Psql) {
    $sql = "SELECT 'auth.users=' || (SELECT count(*) FROM auth.users) || ', tabel_public=' || (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE');"
    & $Psql -h $Conn.Host -p $Conn.Port -U $Conn.User -d $Conn.Db -t -A -c $sql
}

# ------------------------------- BACKUP -------------------------------------
function Backup-Source {
    param([string]$PgDump, [string]$Psql)

    $pw = Read-Plain "Password database SOURCE (A) [$($Source.Host)]"
    Set-PgEnv $Source $pw

    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $dir = Join-Path $BackupDir "backup_$stamp"
    New-Item -ItemType Directory -Path $dir -Force | Out-Null

    $common = @('-h', $Source.Host, '-p', $Source.Port, '-U', $Source.User, '-d', $Source.Db,
        '--no-owner', '--no-privileges')

    # Gunakan --file (BUKAN redirect ">") supaya tidak jadi UTF-16 di Windows PowerShell 5.1
    $schemaFile = Join-Path $dir 'public_schema.sql'
    $dataFile = Join-Path $dir 'data.sql'

    Write-Host "[1/2] Dump schema public ..." -ForegroundColor Cyan
    Invoke-Native $PgDump ($common + @('--schema=public', '--schema-only', '--file', $schemaFile))

    # Hapus 'CREATE SCHEMA public;' bila ada (schema dibuat di langkah prep)
    $lines = [IO.File]::ReadAllLines($schemaFile) | Where-Object { $_ -ne 'CREATE SCHEMA public;' }
    Write-Utf8NoBom $schemaFile $lines

    Write-Host "[2/2] Dump data public + auth ..." -ForegroundColor Cyan
    Invoke-Native $PgDump ($common + @(
            '--schema=public', '--schema=auth', '--data-only',
            '--exclude-table=auth.schema_migrations',
            '--file', $dataFile))

    $src = Get-Summary $Source $Psql
    Set-Content -Path (Join-Path $dir 'source_summary.txt') -Value $src -Encoding ASCII

    Write-Host "Backup selesai: $dir" -ForegroundColor Green
    Write-Host "Ringkasan source: $src"
    return $dir
}

# ------------------------------- RESTORE ------------------------------------
function Restore-Target {
    param([string]$Dir, [string]$Psql)

    $schemaFile = Join-Path $Dir 'public_schema.sql'
    $dataFile = Join-Path $Dir 'data.sql'
    foreach ($f in @($schemaFile, $dataFile)) {
        if (-not (Test-Path $f)) { throw "File backup tidak ditemukan: $f" }
    }

    if ($Source.Host -eq $Target.Host -and $Source.User -eq $Target.User -and $Source.Db -eq $Target.Db) {
        throw "Source dan Target identik. Restore dibatalkan."
    }

    Write-Host ""
    Write-Host "PERINGATAN: restore akan MENGHAPUS schema public dan SEMUA data auth di TARGET:" -ForegroundColor Yellow
    Write-Host "  Host : $($Target.Host)"
    Write-Host "  User : $($Target.User)   (project ref ada di bagian setelah 'postgres.')"
    Write-Host "  DB   : $($Target.Db)"
    $confirm = Read-Host "Ketik project ref/user target persis ($($Target.User)) untuk lanjut"
    if ($confirm -ne $Target.User) { throw "Konfirmasi tidak cocok. Restore dibatalkan." }

    $pw = Read-Plain "Password database TARGET (B) [$($Target.Host)]"
    Set-PgEnv $Target $pw

    # SQL persiapan: reset schema public + kosongkan tabel auth
    $prepFile = Join-Path $Dir '_prep_target.sql'
    $prep = @'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables
           WHERE schemaname = 'auth' AND tablename <> 'schema_migrations'
  LOOP
    EXECUTE format('TRUNCATE TABLE auth.%I CASCADE', r.tablename);
  END LOOP;
END $$;
'@
    Write-Utf8NoBom $prepFile ($prep -split "`r?`n")

    Write-Host "Restore ke target (1 transaksi) ... bisa memakan waktu." -ForegroundColor Cyan
    Invoke-Native $Psql @(
        '-h', $Target.Host, '-p', $Target.Port, '-U', $Target.User, '-d', $Target.Db,
        '--single-transaction',
        '-v', 'ON_ERROR_STOP=1',
        '-c', 'SET session_replication_role = replica',
        '-f', $prepFile,
        '-f', $schemaFile,
        '-f', $dataFile
    )

    Remove-Item $prepFile -ErrorAction SilentlyContinue

    $tgt = Get-Summary $Target $Psql
    Write-Host "Restore selesai." -ForegroundColor Green
    Write-Host "Ringkasan target: $tgt"
    $srcFile = Join-Path $Dir 'source_summary.txt'
    if (Test-Path $srcFile) {
        Write-Host "Ringkasan source: $((Get-Content $srcFile -Raw).Trim())"
    }
}

# --------------------------------- MAIN -------------------------------------
try {
    $pgDump = Get-PgTool 'pg_dump'
    $psql = Get-PgTool 'psql'

    Write-Host "pg_dump : $(& $pgDump --version)"
    Write-Host "psql    : $(& $psql --version)"

    $dir = $null
    if ($Mode -in 'Backup', 'Both') {
        $dir = Backup-Source -PgDump $pgDump -Psql $psql
    }
    if ($Mode -in 'Restore', 'Both') {
        if ($Mode -eq 'Restore') {
            if (-not $RestoreFrom) { throw "Mode Restore butuh parameter -RestoreFrom <folder backup>." }
            $dir = (Resolve-Path $RestoreFrom).Path
        }
        Restore-Target -Dir $dir -Psql $psql
    }
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
