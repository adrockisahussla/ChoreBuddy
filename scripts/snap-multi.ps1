param(
    [Parameter(Mandatory=$true)][string]$Name,
    [string]$Dir = "C:\temp\snaps",
    [int]$MaxSegments = 12,
    [int]$ScrollAmount = 1500
)

$ErrorActionPreference = 'Stop'
$adb = 'C:\Android\Sdk\platform-tools\adb.exe'
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
Get-ChildItem $Dir -Filter "$Name-*.png" -ErrorAction SilentlyContinue | Remove-Item

# Scroll to top
for ($i = 0; $i -lt 8; $i++) {
    & $adb shell input swipe 540 600 540 2000 80 | Out-Null
    Start-Sleep -Milliseconds 200
}
Start-Sleep -Milliseconds 600

$prevHash = ""
$count = 0
for ($i = 1; $i -le $MaxSegments; $i++) {
    $path = "$Dir\$Name-$($i.ToString('00')).png"
    & cmd /c "`"$adb`" exec-out screencap -p > `"$path`""
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = [BitConverter]::ToString($sha.ComputeHash($bytes))
    $sha.Dispose()
    if ($hash -eq $prevHash) {
        Remove-Item $path
        Write-Output "stopped at segment $i (no change)"
        break
    }
    $prevHash = $hash
    $count = $i
    Write-Output "$path"
    if ($i -lt $MaxSegments) {
        & $adb shell input swipe 540 1900 540 (1900 - $ScrollAmount) 250 | Out-Null
        Start-Sleep -Milliseconds 700
    }
}

Write-Output "captured $count segment(s)"
