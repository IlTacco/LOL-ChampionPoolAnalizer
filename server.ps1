param(
    [int]$Port = 8080
)

$root = $PSScriptRoot
if (-not $root) { $root = "C:\Users\gallon\.gemini\antigravity\scratch\lol-matchup-analyzer" }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
    $listener.Start()
    Write-Host "LoL Matchup Analyzer Web Server running at http://localhost:$Port/"
    Write-Host "Press Ctrl+C to stop."
} catch {
    Write-Error "Failed to start listener: $_"
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

$statusFile = [System.IO.Path]::Combine($root, "update_status.json")
$updaterScript = [System.IO.Path]::Combine($root, "updater.ps1")
$adminConfigFile = [System.IO.Path]::Combine($root, "admin_config.json")

function Get-AdminPassword {
    if (Test-Path $adminConfigFile) {
        try {
            $conf = Get-Content $adminConfigFile -Raw | ConvertFrom-Json
            if ($conf.adminPassword) { return $conf.adminPassword }
        } catch {}
    }
    return "ADMIN"
}

function Set-AdminPassword($newPwd) {
    $conf = @{ adminPassword = $newPwd } | ConvertTo-Json
    [System.IO.File]::WriteAllText($adminConfigFile, $conf, [System.Text.Encoding]::UTF8)
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath

    # Handle CORS preflight
    if ($request.HttpMethod -eq "OPTIONS") {
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password")
        $response.StatusCode = 200
        $response.Close()
        continue
    }

    # API: Verify Admin Password
    if ($path -eq "/api/verify-admin") {
        $response.ContentType = "application/json; charset=utf-8"
        $response.Headers.Add("Access-Control-Allow-Origin", "*")

        $body = ""
        if ($request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()
        }

        $expectedPwd = Get-AdminPassword
        $providedPwd = ""
        if ($body) {
            try {
                $parsed = $body | ConvertFrom-Json
                $providedPwd = $parsed.password
            } catch {}
        }
        if (-not $providedPwd) {
            $providedPwd = $request.Headers["X-Admin-Password"]
        }

        if ($providedPwd -ne $expectedPwd) {
            $response.StatusCode = 401
            $json = '{"valid":false,"error":"Password admin non corretta"}'
        } else {
            $response.StatusCode = 200
            $json = '{"valid":true,"message":"Password corretta"}'
        }

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
        continue
    }

    # API: Start Update (Requires Admin Password)
    if ($path -eq "/api/start-update") {
        $response.ContentType = "application/json; charset=utf-8"
        $response.Headers.Add("Access-Control-Allow-Origin", "*")

        $body = ""
        if ($request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()
        }

        $expectedPwd = Get-AdminPassword
        $providedPwd = ""
        if ($body) {
            try {
                $parsed = $body | ConvertFrom-Json
                $providedPwd = $parsed.password
            } catch {}
        }
        if (-not $providedPwd) {
            $providedPwd = $request.Headers["X-Admin-Password"]
        }

        if ($providedPwd -ne $expectedPwd) {
            $response.StatusCode = 401
            $json = '{"started":false,"error":"Password admin non corretta"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        $isRunning = $false
        if (Test-Path $statusFile) {
            try {
                $currentStatus = Get-Content $statusFile -Raw | ConvertFrom-Json
                if ($currentStatus.status -eq "running") {
                    $isRunning = $true
                }
            } catch {}
        }

        if (-not $isRunning) {
            Start-Process powershell -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $updaterScript) -WindowStyle Hidden
            $json = '{"started":true,"message":"Job avviato in background"}'
        } else {
            $json = '{"started":false,"message":"Un aggiornamento è già in corso"}'
        }

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.StatusCode = 200
        $response.Close()
        continue
    }

    # API: Change Admin Password
    if ($path -eq "/api/change-admin-password") {
        $response.ContentType = "application/json; charset=utf-8"
        $response.Headers.Add("Access-Control-Allow-Origin", "*")

        $body = ""
        if ($request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()
        }

        $oldPwd = ""
        $newPwd = ""
        if ($body) {
            try {
                $parsed = $body | ConvertFrom-Json
                $oldPwd = $parsed.oldPassword
                $newPwd = $parsed.newPassword
            } catch {}
        }

        $expectedPwd = Get-AdminPassword
        if ($oldPwd -ne $expectedPwd) {
            $response.StatusCode = 401
            $json = '{"success":false,"error":"Password attuale non corretta"}'
        } elseif (-not $newPwd -or $newPwd.Length -lt 3) {
            $response.StatusCode = 400
            $json = '{"success":false,"error":"La nuova password deve contenere almeno 3 caratteri"}'
        } else {
            Set-AdminPassword $newPwd
            $json = '{"success":true,"message":"Password admin aggiornata con successo"}'
        }

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
        continue
    }

    # API: Get Update Status
    if ($path -eq "/api/update-status") {
        $response.ContentType = "application/json; charset=utf-8"
        $response.Headers.Add("Access-Control-Allow-Origin", "*")

        $json = '{"status":"idle","percent":0,"message":"Pronto"}'
        if (Test-Path $statusFile) {
            try {
                $json = [System.IO.File]::ReadAllText($statusFile, [System.Text.Encoding]::UTF8)
            } catch {}
        }

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.StatusCode = 200
        $response.Close()
        continue
    }

    # Static Files
    $urlPath = $path.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($urlPath)) {
        $urlPath = "index.html"
    }

    $filePath = [System.IO.Path]::Combine($root, $urlPath)
    $fullPath = [System.IO.Path]::GetFullPath($filePath)
    if (-not $fullPath.StartsWith([System.IO.Path]::GetFullPath($root))) {
        $response.StatusCode = 403
        $response.Close()
        continue
    }

    if (Test-Path $fullPath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
        $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
        $response.ContentType = $contentType
        $response.Headers.Add("Access-Control-Allow-Origin", "*")

        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.StatusCode = 200
    } else {
        $response.StatusCode = 404
        $notFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.OutputStream.Write($notFoundMsg, 0, $notFoundMsg.Length)
    }

    $response.Close()
}
