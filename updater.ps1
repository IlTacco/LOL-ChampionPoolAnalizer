# LoL Matchup Analyzer - Background Data Updater
param(
    [string]$Root = $PSScriptRoot
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
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    }
    try {
        [System.IO.File]::WriteAllText($statusFile, ($obj | ConvertTo-Json), [System.Text.Encoding]::UTF8)
    } catch {}
}

try {
    Write-Status -Status "running" -Percent 0 -Current "" -Done 0 -Total 59 -Message "Inizializzazione job di aggiornamento..."

    if (-not (Test-Path $metaPath)) {
        throw "bundled_meta.json non trovato"
    }
    $meta = Get-Content $metaPath -Raw | ConvertFrom-Json
    $topChamps = $meta.roles.top
    $total = $topChamps.Count

    # Load existing cache or create fresh
    if (Test-Path $cachePath) {
        $cache = Get-Content $cachePath -Raw | ConvertFrom-Json
    } else {
        $cache = New-Object PSObject
    }

    $ranks = @('17', '11', '12', '10', '8')
    $headers = @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }

    $done = 0
    foreach ($c in $topChamps) {
        $key = [string]$c.key
        $name = $c.name
        $pct = [int][math]::Floor(($done / $total) * 95) # 0 to 95% during fetch

        Write-Status -Status "running" -Percent $pct -Current $name -Done $done -Total $total -Message "Scaricamento dati per $name ($($done + 1)/$total)..."

        $url = "https://stats2.u.gg/lol/1.5/matchups/16_23/ranked_solo_5x5/$key/1.5.0.json"
        try {
            $res = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 10
            if (-not $cache.$key) {
                $cache | Add-Member -MemberType NoteProperty -Name $key -Value (New-Object PSObject)
            }
            $champObj = $cache.$key

            if ($res.'12') {
                $worldData = $res.'12'
                foreach ($rankId in $ranks) {
                    if ($worldData.$rankId) {
                        $rankData = $worldData.$rankId
                        if (-not $champObj.$rankId) {
                            $champObj | Add-Member -MemberType NoteProperty -Name $rankId -Value (New-Object PSObject)
                        }
                        $champRankObj = $champObj.$rankId

                        foreach ($roleId in @('1','2','3','4','5')) {
                            if ($rankData.$roleId -and $rankData.$roleId[0]) {
                                $tuples = $rankData.$roleId[0]
                                if (-not $champRankObj.$roleId) {
                                    $champRankObj | Add-Member -MemberType NoteProperty -Name $roleId -Value (New-Object PSObject)
                                }
                                $roleDict = $champRankObj.$roleId

                                foreach ($t in $tuples) {
                                    $enemyId = [string]$t[0]
                                    $enemyWins = [double]$t[1]
                                    $matches = [int]$t[2]
                                    if ($matches -gt 0) {
                                        $myWr = [math]::Round((( ($matches - $enemyWins) / $matches ) * 100.0), 2)
                                        $goldDiff = [int]$t[4]
                                        $csDiff = [double]$t[6]
                                        $xpDiff = [int]$t[3]
                                        $arr = @($myWr, $matches, $goldDiff, $csDiff, $xpDiff)
                                        if ($roleDict.$enemyId) {
                                            $roleDict.$enemyId = $arr
                                        } else {
                                            $roleDict | Add-Member -MemberType NoteProperty -Name $enemyId -Value $arr
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch {
            Write-Warning ("Could not fetch " + $name + ": " + $_)
        }

        $done++
    }

    # Save to temporary file first (atomicity: data is changed only once the job finishes)
    Write-Status -Status "running" -Percent 96 -Current "" -Done $done -Total $total -Message "Salvataggio e consolidamento database..."
    $cache | ConvertTo-Json -Depth 10 -Compress | Set-Content $tmpCachePath -Encoding utf8

    # Atomic swap: rename tmp to real cache file
    Move-Item -Path $tmpCachePath -Destination $cachePath -Force

    Write-Status -Status "completed" -Percent 100 -Current "" -Done $total -Total $total -Message "Aggiornamento completato con successo! Tutti i dati sono sincronizzati."
} catch {
    Write-Status -Status "error" -Percent 0 -Current "" -Done 0 -Total 0 -Message "Errore durante l'aggiornamento: $_"
}
