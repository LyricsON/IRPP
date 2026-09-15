param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$excel = $null
$workbook = $null
$irpp = $null
$detail = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $false
  $excel.EnableEvents = $false
  $excel.AskToUpdateLinks = $false
  # msoAutomationSecurityForceDisable: never run document VBA while opening.
  $excel.AutomationSecurity = 3

  # UpdateLinks = 0; ReadOnly = true. No macros, links, or workbook events run.
  $workbook = $excel.Workbooks.Open($InputPath, 0, $true)
  foreach ($worksheet in $workbook.Worksheets) {
    if ($worksheet.Name -replace '\s+', ' ' -eq 'IRPP 2025') { $irpp = $worksheet }
    if ($worksheet.Name -eq 'detail 2025') { $detail = $worksheet }
  }
  if ($null -eq $irpp -or $null -eq $detail) { throw 'Les feuilles IRPP 2025 et detail 2025 sont requises.' }

  # Rebuild formula caches from the manual-input cells before rendering. This
  # prevents stale cached values from the sanitized template appearing in PDF.
  $excel.CalculateFullRebuild()

  # Export exactly these two existing worksheets. Excel applies their existing
  # print areas, page setup, formatting, dimensions and page breaks.
  $irpp.Select()
  $detail.Select($false)
  # xlTypePDF = 0, xlQualityStandard = 0, IgnorePrintAreas = false.
  $workbook.ExportAsFixedFormat(0, $OutputPath, 0, $true, $false)
} finally {
  if ($workbook) { $workbook.Close($false) }
  if ($excel) { $excel.Quit() }
  foreach ($object in @($detail, $irpp, $workbook, $excel)) {
    if ($null -ne $object) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($object) }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
