param(
    [string]$Out = "C:\temp\snaps\fullpage.png",
    [int]$MaxSegments = 12,
    [int]$ScrollAmount = 1500,
    [int]$HeaderHeight = 250,
    [int]$BottomMargin = 200,
    [int]$FingerprintBand = 200
)

$ErrorActionPreference = 'Stop'
$adb = 'C:\Android\Sdk\platform-tools\adb.exe'
$tmpDir = [System.IO.Path]::GetDirectoryName($Out) + '\_segments'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
Get-ChildItem $tmpDir -Filter "seg-*.png" -ErrorAction SilentlyContinue | Remove-Item

Add-Type -AssemblyName System.Drawing

function Get-Screen {
    param([string]$Path)
    $tmp = [System.IO.Path]::ChangeExtension($Path, '.tmp.png')
    & cmd /c "`"$adb`" exec-out screencap -p > `"$tmp`""
    Move-Item -Force $tmp $Path
}

function Get-RowSamples {
    param($Bitmap, [int]$Y, [int]$NumSamples = 60)
    $w = $Bitmap.Width
    $samples = New-Object int[] ($NumSamples * 3)
    for ($i = 0; $i -lt $NumSamples; $i++) {
        $x = [int]($i * $w / $NumSamples)
        $px = $Bitmap.GetPixel($x, $Y)
        $samples[$i * 3] = $px.R
        $samples[$i * 3 + 1] = $px.G
        $samples[$i * 3 + 2] = $px.B
    }
    return $samples
}

function Compare-Samples {
    param([int[]]$A, [int[]]$B)
    $sum = 0
    for ($i = 0; $i -lt $A.Length; $i++) {
        $d = $A[$i] - $B[$i]
        $sum += $d * $d
    }
    return $sum
}

function Find-OverlapY {
    # Find the y in NewBitmap where OldBitmap's row at OldY appears
    param($OldBitmap, $NewBitmap, [int]$OldY, [int]$SearchFromY, [int]$SearchToY)
    $target = Get-RowSamples -Bitmap $OldBitmap -Y $OldY
    $best = [int]::MaxValue
    $bestY = -1
    for ($y = $SearchFromY; $y -le $SearchToY; $y++) {
        $candidate = Get-RowSamples -Bitmap $NewBitmap -Y $y
        $score = Compare-Samples -A $target -B $candidate
        if ($score -lt $best) {
            $best = $score
            $bestY = $y
        }
    }
    return @{ Y = $bestY; Score = $best }
}

# Scroll to top
for ($i = 0; $i -lt 8; $i++) {
    & $adb shell input swipe 540 600 540 2000 80 | Out-Null
    Start-Sleep -Milliseconds 200
}
Start-Sleep -Milliseconds 600

$segPaths = @()
$prevHash = ""
for ($i = 1; $i -le $MaxSegments; $i++) {
    $segPath = "$tmpDir\seg-$($i.ToString('00')).png"
    Get-Screen -Path $segPath
    $bytes = [System.IO.File]::ReadAllBytes($segPath)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = [BitConverter]::ToString($sha.ComputeHash($bytes))
    $sha.Dispose()
    if ($hash -eq $prevHash) {
        Remove-Item $segPath
        Write-Output "stopped: identical hash to previous"
        break
    }
    $prevHash = $hash
    $segPaths += $segPath
    Write-Output "segment $i captured"
    if ($i -lt $MaxSegments) {
        & $adb shell input swipe 540 1900 540 (1900 - $ScrollAmount) 250 | Out-Null
        Start-Sleep -Milliseconds 700
    }
}

if ($segPaths.Count -eq 0) {
    Write-Output "ERROR: no segments captured"
    exit 1
}

# Load all
$bmps = $segPaths | ForEach-Object { [System.Drawing.Image]::FromFile($_) }
$w = $bmps[0].Width
$h = $bmps[0].Height

if ($bmps.Count -eq 1) {
    $bmps[0].Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "$Out  ($w x $h, 1 segment)"
    $bmps | ForEach-Object { $_.Dispose() }
    Get-ChildItem $tmpDir -Filter "seg-*.png" | Remove-Item -ErrorAction SilentlyContinue
    Remove-Item $tmpDir -ErrorAction SilentlyContinue
    exit 0
}

# Detect overlap between consecutive segments
# For each pair, find where the bottom-fingerprint of segN appears in segN+1
$prevYInOld = $h - $BottomMargin - $FingerprintBand
$starts = @(0)  # the y in each segment where its "new" content begins (overlap end)
for ($i = 1; $i -lt $bmps.Count; $i++) {
    $old = $bmps[$i - 1]
    $new = $bmps[$i]
    # Search range in new image: from header to (h - 100)
    $searchFrom = $HeaderHeight
    $searchTo = $h - $BottomMargin - 50
    $match = Find-OverlapY -OldBitmap $old -NewBitmap $new -OldY $prevYInOld -SearchFromY $searchFrom -SearchToY $searchTo
    Write-Output "seg $i overlap: row $prevYInOld in seg $($i-1) matches row $($match.Y) in seg $i  (score $($match.Score))"
    # The new segment's content starts being NEW from $match.Y + 1 onwards
    $starts += ($match.Y + ($h - $BottomMargin - $prevYInOld))
}

# Compute output height
$totalH = ($h - $BottomMargin)  # first segment usable
for ($i = 1; $i -lt $bmps.Count; $i++) {
    $contributed = ($h - $BottomMargin) - $starts[$i]
    $totalH += $contributed
}

Write-Output "stitching to $w x $totalH"

$canvas = New-Object System.Drawing.Bitmap $w, $totalH
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.Clear([System.Drawing.Color]::Black)

# First seg: rows 0..(h - BottomMargin)
$dst1 = New-Object System.Drawing.Rectangle 0, 0, $w, ($h - $BottomMargin)
$src1 = New-Object System.Drawing.Rectangle 0, 0, $w, ($h - $BottomMargin)
$g.DrawImage($bmps[0], $dst1, $src1, [System.Drawing.GraphicsUnit]::Pixel)
$y = $h - $BottomMargin

for ($i = 1; $i -lt $bmps.Count; $i++) {
    $startY = $starts[$i]
    $segH = ($h - $BottomMargin) - $startY
    if ($segH -le 0) { continue }
    $dst = New-Object System.Drawing.Rectangle 0, $y, $w, $segH
    $src = New-Object System.Drawing.Rectangle 0, $startY, $w, $segH
    $g.DrawImage($bmps[$i], $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
    $y += $segH
}
$g.Dispose()

# Trim
$final = New-Object System.Drawing.Bitmap $w, $y
$g2 = [System.Drawing.Graphics]::FromImage($final)
$g2.DrawImage($canvas, 0, 0, (New-Object System.Drawing.Rectangle 0, 0, $w, $y), [System.Drawing.GraphicsUnit]::Pixel)
$g2.Dispose()
$canvas.Dispose()
$final.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$fw = $final.Width
$fh = $final.Height
$final.Dispose()
$bmps | ForEach-Object { $_.Dispose() }
Get-ChildItem $tmpDir -Filter "seg-*.png" | Remove-Item -ErrorAction SilentlyContinue
Remove-Item $tmpDir -ErrorAction SilentlyContinue

Write-Output "$Out  ($fw x $fh, stitched from $($segPaths.Count) segments)"
