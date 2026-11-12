<#
.SYNOPSIS
  Backup Supabase Storage project A (bucket + semua file) lalu restore ke project B.

.DESCRIPTION
  Memakai Storage REST API (bukan SQL), karena file asli tersimpan di object storage, bukan di tabel Postgres.
  - Backup  : ambil daftar bucket + konfigurasinya, lalu download semua file (rekursif, semua folder).
              Hasil: manifest.json + folder files\ (file disimpan dengan nama berurutan supaya aman di Windows).
  - Restore : buat/update bucket di B sesuai konfigurasi A, lalu upload semua file ke path yang sama (upsert).
  Butuh key service_role / secret key tiap project (diminta lewat prompt tersembunyi, tidak disimpan).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\supabase-storage-backup-restore.ps1
  powershell -ExecutionPolicy Bypass -File .\supabase-storage-backup-restore.ps1 -Mode Backup
  powershell -ExecutionPolicy Bypass -File .\supabase-storage-backup-restore.ps1 -Mode Restore -RestoreFrom .\storage_backups\storage_20261110_101500
  powershell -ExecutionPolicy Bypass -File .\supabase-storage-backup-restore.ps1 -Buckets avatars,documents
#>
[CmdletBinding()]
param(
    [ValidateSet('Backup', 'Restore', 'Both')]
    [string]$Mode = 'Both',

    [string]$BackupDir = (Join-Path (Get-Location) 'storage_backups'),

    # Hanya untuk Mode Restore: folder hasil backup storage sebelumnya
    [string]$RestoreFrom,

    # Opsional: batasi ke bucket tertentu (default: semua bucket)
    [string[]]$Buckets
)

# ====================== KONFIGURASI (EDIT BAGIAN INI) ======================
# Project ID / project ref (kode 20 karakter), BUKAN user pooler dan tanpa tanda kurung siku.
$Source = @{ ProjectRef = 'xdfwxvsgbopapwlrbzwj' }
$Target = @{ ProjectRef = 'jcxranezlwqxawnpzxub' }
# ============================================================================

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # mempercepat Invoke-WebRequest di PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ------------------------------ HELPER --------------------------------------
function Read-Plain([string]$Prompt) {
    $s = Read-Host $Prompt -AsSecureString
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    [IO.File]::WriteAllText($Path, $Text, (New-Object Text.UTF8Encoding($false)))
}

function New-Api([string]$Ref, [string]$Key) {
    $h = @{ apikey = $Key }
    # Key lama (JWT, diawali eyJ) juga perlu dikirim sebagai Bearer. Secret key baru (sb_secret_...) cukup lewat apikey.
    if ($Key -like 'eyJ*') { $h['Authorization'] = "Bearer $Key" }
    return @{ Base = "https://$Ref.supabase.co/storage/v1"; Headers = $h }
}

function Convert-PathForUrl([string]$Path) {
    return (($Path -split '/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
}

function Invoke-Retry([scriptblock]$Action, [int]$MaxTry = 3) {
    for ($attempt = 1; $attempt -le $MaxTry; $attempt++) {
        try { return (& $Action) }
        catch {
            if ($attempt -eq $MaxTry) { throw }
            Start-Sleep -Seconds (2 * $attempt)
        }
    }
}

function Get-ErrDetail($Err) {
    if ($Err.ErrorDetails -and $Err.ErrorDetails.Message) { return $Err.ErrorDetails.Message }
    return $Err.Exception.Message
}

# ConvertTo-Json bawaan PowerShell 5.1 bisa error "Argument types do not match" pada objek hasil REST.
# Helper ini memakai JavaScriptSerializer di PS 5.1 (input harus hashtable/array/tipe polos, bukan pscustomobject).
function ConvertTo-JsonSafe($Obj) {
    if ($PSVersionTable.PSVersion.Major -le 5) {
        Add-Type -AssemblyName System.Web.Extensions
        $ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
        $ser.MaxJsonLength = [int]::MaxValue
        return $ser.Serialize($Obj)
    }
    return ($Obj | ConvertTo-Json -Depth 8 -Compress)
}

function Get-BucketPayload($B) {
    $limit = $null
    if ($null -ne $B.file_size_limit) { $limit = [long]$B.file_size_limit }
    $mimes = $null
    if ($B.allowed_mime_types -and @($B.allowed_mime_types).Count -gt 0) { $mimes = [string[]]@($B.allowed_mime_types) }
    return @{ public = [bool]$B.public; file_size_limit = $limit; allowed_mime_types = $mimes }
}

function Get-RemoteBuckets($Api) {
    return @(Invoke-Retry { Invoke-RestMethod -Method Get -Uri "$($Api.Base)/bucket" -Headers $Api.Headers })
}

# Daftar semua file di sebuah bucket (rekursif lewat semua folder)
function Get-BucketObjects($Api, [string]$Bucket) {
    $result = New-Object System.Collections.Generic.List[object]
    $queue = New-Object System.Collections.Generic.Queue[string]
    $queue.Enqueue('')
    $limit = 100
    $uri = "$($Api.Base)/object/list/$([Uri]::EscapeDataString($Bucket))"

    while ($queue.Count -gt 0) {
        $prefix = $queue.Dequeue()
        $offset = 0
        do {
            $body = @{ prefix = $prefix; limit = $limit; offset = $offset; sortBy = @{ column = 'name'; order = 'asc' } } | ConvertTo-Json -Compress
            $bytes = [Text.Encoding]::UTF8.GetBytes($body)
            $items = @(Invoke-Retry { Invoke-RestMethod -Method Post -Uri $uri -Headers $Api.Headers -ContentType 'application/json; charset=utf-8' -Body $bytes })

            foreach ($it in $items) {
                if (-not $it.name) { continue }
                $full = if ($prefix) { "$prefix/$($it.name)" } else { [string]$it.name }
                if ($null -eq $it.id) {
                    # id kosong = folder
                    $queue.Enqueue($full)
                }
                else {
                    $size = $null; $ct = $null
                    if ($it.metadata) { $size = $it.metadata.size; $ct = $it.metadata.mimetype }
                    $result.Add([pscustomobject]@{ Path = $full; Size = $size; ContentType = $ct })
                }
            }
            $offset += $limit
        } while ($items.Count -eq $limit)
    }
    return , $result
}

# ------------------------------- BACKUP -------------------------------------
function Backup-Storage {
    $key = Read-Plain "Service role / secret key project SOURCE (A) [$($Source.ProjectRef)]"
    $api = New-Api $Source.ProjectRef $key

    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $dir = Join-Path $BackupDir "storage_$stamp"
    $filesDir = Join-Path $dir 'files'
    New-Item -ItemType Directory -Path $filesDir -Force | Out-Null

    Write-Host "[1/3] Mengambil daftar bucket ..." -ForegroundColor Cyan
    $remote = Get-RemoteBuckets $api
    if ($Buckets) { $remote = @($remote | Where-Object { $Buckets -contains $_.name }) }
    if ($remote.Count -eq 0) { throw "Tidak ada bucket yang ditemukan (cek key / nama bucket)." }

    $bucketCfg = New-Object System.Collections.Generic.List[object]
    foreach ($b in $remote) {
        $cfg = Get-BucketPayload $b
        $cfg['name'] = [string]$b.name
        $bucketCfg.Add($cfg)
    }

    Write-Host "[2/3] Mendata semua file ..." -ForegroundColor Cyan
    $inventory = New-Object System.Collections.Generic.List[object]
    foreach ($b in $bucketCfg) {
        $objs = Get-BucketObjects $api $b.name
        foreach ($o in $objs) {
            $inventory.Add([pscustomobject]@{ bucket = $b.name; path = $o.Path; size = $o.Size; contentType = $o.ContentType })
        }
        Write-Host ("  {0} : {1} file" -f $b.name, $objs.Count)
    }

    Write-Host "[3/3] Download file ($($inventory.Count) file) ..." -ForegroundColor Cyan
    $fileList = New-Object System.Collections.Generic.List[object]
    $failures = New-Object System.Collections.Generic.List[string]
    $seq = 0
    $totalBytes = 0

    foreach ($o in $inventory) {
        $seq++
        $localName = '{0:D8}.bin' -f $seq
        $local = Join-Path $filesDir $localName
        $uri = "$($api.Base)/object/authenticated/$([Uri]::EscapeDataString($o.bucket))/$(Convert-PathForUrl $o.path)"
        Write-Host ("[{0}/{1}] {2}/{3}" -f $seq, $inventory.Count, $o.bucket, $o.path)
        try {
            Invoke-Retry { Invoke-WebRequest -Method Get -Uri $uri -Headers $api.Headers -OutFile $local -UseBasicParsing | Out-Null }
            $len = (Get-Item -LiteralPath $local).Length
            $totalBytes += $len
            $ctVal = $null
            if ($o.contentType) { $ctVal = [string]$o.contentType }
            $fileList.Add(@{ bucket = [string]$o.bucket; path = [string]$o.path; contentType = $ctVal; size = [long]$len; local = $localName })
        }
        catch {
            $msg = "GAGAL download $($o.bucket)/$($o.path): $(Get-ErrDetail $_)"
            Write-Host $msg -ForegroundColor Red
            $failures.Add($msg)
            if (Test-Path -LiteralPath $local) { Remove-Item -LiteralPath $local -Force }
        }
    }

    $manifest = @{
        sourceRef = [string]$Source.ProjectRef
        createdAt = (Get-Date).ToString('s')
        buckets   = $bucketCfg.ToArray()
        files     = $fileList.ToArray()
    }
    Write-Utf8NoBom (Join-Path $dir 'manifest.json') (ConvertTo-JsonSafe $manifest)
    if ($failures.Count -gt 0) { Write-Utf8NoBom (Join-Path $dir 'backup_failures.txt') ($failures -join "`r`n") }

    Write-Host ""
    Write-Host ("Backup selesai: {0}" -f $dir) -ForegroundColor Green
    Write-Host ("Bucket: {0} | File berhasil: {1}/{2} | Ukuran: {3:N1} MB" -f $bucketCfg.Count, $fileList.Count, $inventory.Count, ($totalBytes / 1MB))
    if ($failures.Count -gt 0) { Write-Host "Ada $($failures.Count) file gagal. Lihat backup_failures.txt" -ForegroundColor Yellow }
    return @{ Dir = $dir; Failed = $failures.Count }
}

# ------------------------------- RESTORE ------------------------------------
function Restore-Storage([string]$Dir) {
    $manifestPath = Join-Path $Dir 'manifest.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { throw "manifest.json tidak ditemukan di: $Dir" }
    if ($Source.ProjectRef -eq $Target.ProjectRef) { throw "Source dan Target identik. Restore dibatalkan." }

    $manifest = [IO.File]::ReadAllText($manifestPath) | ConvertFrom-Json
    $bucketCfg = @($manifest.buckets)
    $files = @($manifest.files)
    if ($Buckets) {
        $bucketCfg = @($bucketCfg | Where-Object { $Buckets -contains $_.name })
        $files = @($files | Where-Object { $Buckets -contains $_.bucket })
    }

    Write-Host ""
    Write-Host "PERINGATAN: restore akan membuat/mengubah bucket dan MENIMPA file dengan path sama di TARGET:" -ForegroundColor Yellow
    Write-Host "  Project ID target : $($Target.ProjectRef)"
    Write-Host "  Bucket            : $($bucketCfg.Count) | File: $($files.Count)"
    $confirm = Read-Host "Ketik Project ID target persis ($($Target.ProjectRef)) untuk lanjut"
    if ($confirm -ne $Target.ProjectRef) { throw "Konfirmasi tidak cocok. Restore dibatalkan." }

    $key = Read-Plain "Service role / secret key project TARGET (B) [$($Target.ProjectRef)]"
    $api = New-Api $Target.ProjectRef $key
    $jsonType = 'application/json; charset=utf-8'

    Write-Host "[1/3] Menyiapkan bucket di target ..." -ForegroundColor Cyan
    $existing = @(Get-RemoteBuckets $api | ForEach-Object { $_.name })
    foreach ($b in $bucketCfg) {
        if ($existing -contains $b.name) {
            $payload = ConvertTo-JsonSafe (Get-BucketPayload $b)
            $uri = "$($api.Base)/bucket/$([Uri]::EscapeDataString($b.name))"
            Invoke-Retry { Invoke-RestMethod -Method Put -Uri $uri -Headers $api.Headers -ContentType $jsonType -Body ([Text.Encoding]::UTF8.GetBytes($payload)) | Out-Null }
            Write-Host "  update bucket : $($b.name)"
        }
        else {
            $createBody = Get-BucketPayload $b
            $createBody['id'] = [string]$b.name
            $createBody['name'] = [string]$b.name
            $payload = ConvertTo-JsonSafe $createBody
            $uri = "$($api.Base)/bucket"
            Invoke-Retry { Invoke-RestMethod -Method Post -Uri $uri -Headers $api.Headers -ContentType $jsonType -Body ([Text.Encoding]::UTF8.GetBytes($payload)) | Out-Null }
            Write-Host "  buat bucket   : $($b.name)"
        }
    }

    Write-Host "[2/3] Upload file ($($files.Count) file) ..." -ForegroundColor Cyan
    $failures = New-Object System.Collections.Generic.List[string]
    $ok = 0
    $i = 0
    $upHeaders = @{}
    foreach ($k in $api.Headers.Keys) { $upHeaders[$k] = $api.Headers[$k] }
    $upHeaders['x-upsert'] = 'true'

    foreach ($f in $files) {
        $i++
        $local = Join-Path (Join-Path $Dir 'files') $f.local
        $uri = "$($api.Base)/object/$([Uri]::EscapeDataString($f.bucket))/$(Convert-PathForUrl $f.path)"
        $ct = if ($f.contentType) { [string]$f.contentType } else { 'application/octet-stream' }
        Write-Host ("[{0}/{1}] {2}/{3}" -f $i, $files.Count, $f.bucket, $f.path)
        try {
            if (-not (Test-Path -LiteralPath $local)) { throw "File lokal hilang: $($f.local)" }
            Invoke-Retry { Invoke-RestMethod -Method Post -Uri $uri -Headers $upHeaders -InFile $local -ContentType $ct | Out-Null }
            $ok++
        }
        catch {
            $msg = "GAGAL upload $($f.bucket)/$($f.path): $(Get-ErrDetail $_)"
            Write-Host $msg -ForegroundColor Red
            $failures.Add($msg)
        }
    }
    if ($failures.Count -gt 0) { Write-Utf8NoBom (Join-Path $Dir 'restore_failures.txt') ($failures -join "`r`n") }

    Write-Host "[3/3] Verifikasi jumlah file per bucket ..." -ForegroundColor Cyan
    foreach ($b in $bucketCfg) {
        $expected = @($files | Where-Object { $_.bucket -eq $b.name }).Count
        $actual = (Get-BucketObjects $api $b.name).Count
        $color = if ($actual -ge $expected) { 'Green' } else { 'Yellow' }
        Write-Host ("  {0,-30} manifest: {1,6} | target: {2,6}" -f $b.name, $expected, $actual) -ForegroundColor $color
    }

    Write-Host ""
    Write-Host ("Restore selesai. Berhasil: {0}/{1}" -f $ok, $files.Count) -ForegroundColor Green
    if ($failures.Count -gt 0) { Write-Host "Ada $($failures.Count) file gagal. Lihat restore_failures.txt" -ForegroundColor Yellow }
    return @{ Failed = $failures.Count }
}

# --------------------------------- MAIN -------------------------------------
$failed = 0
try {
    $dir = $null
    if ($Mode -in 'Backup', 'Both') {
        $r = Backup-Storage
        $dir = $r.Dir
        $failed += $r.Failed
        if ($Mode -eq 'Both' -and $r.Failed -gt 0) {
            $go = Read-Host "Ada file yang gagal di-backup. Lanjut restore tetap? (y/N)"
            if ($go -ne 'y') { throw "Restore dibatalkan karena backup tidak lengkap." }
        }
    }
    if ($Mode -in 'Restore', 'Both') {
        if ($Mode -eq 'Restore') {
            if (-not $RestoreFrom) { throw "Mode Restore butuh parameter -RestoreFrom <folder backup storage>." }
            $dir = (Resolve-Path $RestoreFrom).Path
        }
        $r = Restore-Storage -Dir $dir
        $failed += $r.Failed
    }
}
catch {
    Write-Host "ERROR: $(Get-ErrDetail $_)" -ForegroundColor Red
    exit 1
}
if ($failed -gt 0) { exit 2 }
