# Локальний перегляд сайту Академії. Запускається з файлу Open-site-Windows.bat
# Нічого не встановлює: використовує вбудований у Windows PowerShell.
$ErrorActionPreference = 'Stop'
$sep = [IO.Path]::DirectorySeparatorChar
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $root.EndsWith([string]$sep)) { $root += $sep }

$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'
  '.json'='application/json; charset=utf-8'; '.yml'='text/yaml; charset=utf-8'; '.yaml'='text/yaml; charset=utf-8'
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.webp'='image/webp'
  '.gif'='image/gif'; '.ico'='image/x-icon'; '.pdf'='application/pdf'; '.txt'='text/plain; charset=utf-8'
  '.md'='text/markdown; charset=utf-8'; '.woff2'='font/woff2'; '.mp4'='video/mp4'
}

$listener = $null; $port = 0
foreach ($p in 8080..8099) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    $l.Start(); $listener = $l; $port = $p; break
  } catch { }
}
if (-not $listener) { Write-Host 'Не вдалося запустити: порти 8080-8099 зайняті.'; exit 1 }

$url = "http://localhost:$port/"
Write-Host ''
Write-Host '  Сайт Академії працює:' -ForegroundColor Green
Write-Host "    сайт     $url"
Write-Host "    адмінка  ${url}admin/   (Chrome або Edge, кнопка Work with Local Repository)"
Write-Host ''
Write-Host '  Не закривайте це вікно, поки дивитесь сайт. Щоб зупинити - просто закрийте його.'
try { Start-Process $url } catch { }

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/').Replace('/', [string]$sep)
    $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and ($file + $sep) -ne $root) {
      $res.StatusCode = 403
    } elseif (Test-Path -LiteralPath $file -PathType Container) {
      if (-not $ctx.Request.Url.AbsolutePath.EndsWith('/')) {
        $res.StatusCode = 301; $res.RedirectLocation = $ctx.Request.Url.AbsolutePath + '/'
      } else { $file = Join-Path $file 'index.html' }
    }
    if ($res.StatusCode -eq 200) {
      if (Test-Path -LiteralPath $file -PathType Leaf) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $res.AddHeader('Cache-Control', 'no-cache')
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $b = [Text.Encoding]::UTF8.GetBytes('404'); $res.OutputStream.Write($b, 0, $b.Length)
      }
    }
  } catch {
    try { $res.StatusCode = 500 } catch { }
  } finally {
    try { $res.Close() } catch { }
  }
}
