param(
    [Parameter(Mandatory=$true)][string]$Text
)
$adb = 'C:\Android\Sdk\platform-tools\adb.exe'
& $adb shell uiautomator dump | Out-Null
& $adb pull /sdcard/window_dump.xml C:\temp\ui.xml | Out-Null
$xml = Get-Content C:\temp\ui.xml -Raw
$pattern = 'text="' + [regex]::Escape($Text) + '"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
$m = [regex]::Match($xml, $pattern)
if (-not $m.Success) {
    Write-Output "NOT_FOUND: $Text"
    exit 1
}
$x1 = [int]$m.Groups[1].Value
$y1 = [int]$m.Groups[2].Value
$x2 = [int]$m.Groups[3].Value
$y2 = [int]$m.Groups[4].Value
$cx = [int](($x1 + $x2) / 2)
$cy = [int](($y1 + $y2) / 2)
& $adb shell input tap $cx $cy
Write-Output "tapped '$Text' at ($cx,$cy)"
