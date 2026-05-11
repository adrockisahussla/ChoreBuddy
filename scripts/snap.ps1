param(
    [string]$Out = "C:\temp\phone.png",
    [int]$MaxSide = 1500
)

$ErrorActionPreference = 'Stop'
$adb = 'C:\Android\Sdk\platform-tools\adb.exe'
$raw = [System.IO.Path]::ChangeExtension($Out, $null) + '.raw.png'

New-Item -ItemType Directory -Force -Path (Split-Path $Out -Parent) | Out-Null

& cmd /c "`"$adb`" exec-out screencap -p > `"$raw`""

Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile($raw)
try {
    $w = $src.Width; $h = $src.Height
    $scale = [Math]::Min(1.0, $MaxSide / [Math]::Max($w, $h))
    $nw = [int]($w * $scale); $nh = [int]($h * $scale)

    if ($scale -lt 1.0) {
        $dst = New-Object System.Drawing.Bitmap $nw, $nh
        $g = [System.Drawing.Graphics]::FromImage($dst)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($src, 0, 0, $nw, $nh)
        $g.Dispose()
        $dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
        $dst.Dispose()
    } else {
        Copy-Item $raw $Out -Force
    }
} finally {
    $src.Dispose()
    Remove-Item $raw -ErrorAction SilentlyContinue
}

Write-Output "$Out  ($nw x $nh, from $w x $h)"
