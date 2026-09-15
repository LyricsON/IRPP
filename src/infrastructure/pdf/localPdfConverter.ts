const helperUrl = 'http://127.0.0.1:4318/convert'

export async function convertWorkbookToPdf(workbook: Blob): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(helperUrl, { method: 'POST', headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: workbook })
  } catch {
    throw new Error('Le service PDF local est indisponible. Lancez « npm.cmd run pdf-helper » puis réessayez.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: '' })) as { error?: string }
    throw new Error(body.error || 'Impossible de convertir le classeur Excel en PDF.')
  }
  return response.blob()
}
