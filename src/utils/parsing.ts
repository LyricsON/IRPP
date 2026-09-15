export const parseMoney = (value: string) => value.trim().replace(/\s/g, '').replace(',', '.')
export const formatTnd = (value: string) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(value)) + ' DT'
export const safeFilename = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|\x00-\x1F]/g, '-').trim().replace(/\s+/g, '-').slice(0, 70) || 'declaration'
