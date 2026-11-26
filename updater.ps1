# LoL Matchup Analyzer - Background Data Updater (OP.GG API)
param(
    [string]$Root = $PSScriptRoot,
    [switch]$DryRun
)

if (-not $Root) {
    $Root = "C:\Users\gallon\.gemini\antigravity\scratch\lol-matchup-analyzer"
}

$statusFile = Join-Path $Root "update_status.json"
$cachePath = Join-Path $Root "matchups_lane_compact.json"
$tmpCachePath = Join-Path $Root "matchups_lane_compact.tmp.json"
$metaPath = Join-Path $Root "bundled_meta.json"

function Write-Status {
    param(
        [string]$Status,
        [int]$Percent,
        [string]$Current,
        [int]$Done,
        [int]$Total,
        [string]$Message
    )
    $obj = @{
        status = $Status
        percent = $Percent
        current = $Current
        done = $Done
        total = $Total
        message = $Message
        timestamp = [int][double]::Parse((Get-Date -UFormat %s))
    }
    $json = $obj | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($statusFile, $json, [System.Text.Encoding]::UTF8)
}

try {
    Write-Status -Status "running" -Percent 0 -Current "" -Done 0 -Total 51 -Message "Inizializzazione job di aggiornamento..."

    if (-not (Test-Path $metaPath)) {
        throw "bundled_meta.json non trovato"
    }
    $meta = Get-Content $metaPath -Raw | ConvertFrom-Json
    $topChamps = $meta.roles.top
    $total = $topChamps.Count

    $cache = New-Object PSObject
    $headers = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    $rankMap = @{
        "17" = "emerald_plus"
        "11" = "diamond_plus"
        "12" = "master_plus"
        "10" = "platinum_plus"
        "8"  = "all"
    }
    $roleDefs = @(
        @{ name = "top";    code = "4"; opPos = "top" },
        @{ name = "jungle"; code = "1"; opPos = "jungle" },
        @{ name = "mid";    code = "5"; opPos = "mid" },
        @{ name = "adc";    code = "3"; opPos = "adc" },
        @{ name = "supp";   code = "2"; opPos = "support" }
    )

    $total = 0
    foreach ($rd in $roleDefs) {
        $rName = $rd.name
        if ($meta.roles.$rName) { $total += $meta.roles.$rName.Count }
    }

    $done = 0
    foreach ($rd in $roleDefs) {
        $rName = $rd.name
        $rCode = $rd.code
        $opPos = $rd.opPos
        $roleChamps = $meta.roles.$rName
        if (-not $roleChamps) { continue }

        foreach ($key in $roleChamps) {
            $keyStr = if ($key.key) { [string]$key.key } else { [string]$key }
            $cInfo = $meta.champions.$keyStr
            $name = if ($cInfo) { $cInfo.name } else { $keyStr }
            $pct = [int][math]::Floor(($done / [Math]::Max(1, $total)) * 95)

            Write-Status -Status "running" -Percent $pct -Current $name -Done $done -Total $total -Message "Scaricamento dati per $name ($rName) ($($done + 1)/$total)..."

            if (-not $cache.$keyStr) {
                $cache | Add-Member -MemberType NoteProperty -Name $keyStr -Value (New-Object PSObject)
            }
            $champObj = $cache.$keyStr

            # Fetch all ranks: Emerald+ (17), Diamond+ (11), Master+ (12), Platinum+ (10), Overall (8)
            foreach ($rankId in @("17", "11", "12", "10", "8")) {
                $tier = $rankMap[$rankId]
                $url = "https://lol-api-champion.op.gg/api/global/champions/ranked/$keyStr/matchups?tier=$tier&position=$opPos"
                try {
                    $res = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 10
                    if ($res.data -and $res.data.counters) {
                        if (-not $champObj.$rankId) {
                            $champObj | Add-Member -MemberType NoteProperty -Name $rankId -Value (New-Object PSObject)
                        }
                        $champRankObj = $champObj.$rankId

                        $roleDict = New-Object PSObject
                        foreach ($m in $res.data.counters) {
                            $play = [int]$m.play
                            $win = [int]$m.win
                            if ($play -gt 0) {
                                $wr = [math]::Round(($win / $play) * 100.0, 2)
                                $oppKey = [string]$m.champion_id
                                $roleDict | Add-Member -MemberType NoteProperty -Name $oppKey -Value @($wr, $play, 0, 0, 0) -Force
                            }
                        }

                        $champRankObj | Add-Member -MemberType NoteProperty -Name $rCode -Value $roleDict -Force
                    }
                } catch {
                    Write-Warning "Could not fetch $name ($rName / $tier): $_"
                }
            }

            $done++
            Start-Sleep -Milliseconds 60
        }
    }

    Write-Status -Status "running" -Percent 96 -Current "Salvataggio" -Done $total -Total $total -Message "Scrittura sicura su disco della cache aggiornata..."

    $jsonOut = $cache | ConvertTo-Json -Depth 10 -Compress
    if ($cache.PSObject.Properties.Count -gt 0 -and $jsonOut.Length -gt 1000) {
        if ($DryRun) {
            $testPath = Join-Path $Root "test_opgg_matchups.json"
            [System.IO.File]::WriteAllText($testPath, $jsonOut, [System.Text.Encoding]::UTF8)
            Write-Host "DRY-RUN SUCCESS! Champions fetched: $($cache.PSObject.Properties.Count), JSON size: $($jsonOut.Length) bytes -> saved to $testPath (main files untouched)."
        } else {
            [System.IO.File]::WriteAllText($tmpCachePath, $jsonOut, [System.Text.Encoding]::UTF8)
            if (Test-Path $tmpCachePath) {
                Move-Item -Path $tmpCachePath -Destination $cachePath -Force
            }
            Write-Status -Status "completed" -Percent 100 -Current "" -Done $total -Total $total -Message "Aggiornamento completato con successo! Tutti i dati sono sincronizzati."
        }
    } else {
        Write-Host "DRY-RUN/UPDATE ABORTED: empty data."
        if (-not $DryRun) {
            Write-Status -Status "error" -Percent 0 -Current "" -Done 0 -Total 0 -Message "Aggiornamento annullato: dati scaricati vuoti. Mantenuto il backup precedente."
        }
    }
} catch {
    Write-Status -Status "error" -Percent 0 -Current "" -Done 0 -Total 0 -Message "Errore durante l'aggiornamento: $_"
}
