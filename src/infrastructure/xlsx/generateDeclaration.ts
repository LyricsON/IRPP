import JSZip from 'jszip';
import { declarationPatches, type CellPatch } from './mapping';
import type { TaxpayerInput, TaxResult } from '../../domain/tax/types';
const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relationshipsNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function requireValidXml(document: Document, label: string) {
  if (document.documentElement.localName === 'parsererror')
    throw new Error(`XML invalide : ${label}`);
  return document;
}
function sheetPath(workbook: Document, relationships: Document, name: string) {
  const sheet = [...workbook.getElementsByTagNameNS(ns, 'sheet')].find(
    (item) => item.getAttribute('name') === name
  );
  const id = sheet?.getAttributeNS(relationshipsNs, 'id') || sheet?.getAttribute('r:id');
  const relationship = id
    ? [
        ...relationships.getElementsByTagNameNS(
          'http://schemas.openxmlformats.org/package/2006/relationships',
          'Relationship'
        ),
      ].find((item) => item.getAttribute('Id') === id)
    : undefined;
  const target = relationship?.getAttribute('Target');
  if (!target) throw new Error(`Feuille introuvable : ${name}`);
  return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
}
const xmlEscape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!
  );
function requestFullRecalculation(workbookXml: string) {
  const calcPr = /<calcPr\b([^>]*)\/>/i;
  if (calcPr.test(workbookXml)) {
    return workbookXml.replace(calcPr, (_match, attributes: string) => {
      const cleaned = attributes.replace(/\s+(?:fullCalcOnLoad|forceFullCalc)="[^"]*"/gi, '');
      return `<calcPr${cleaned} fullCalcOnLoad="1" forceFullCalc="1"/>`;
    });
  }
  return workbookXml.replace(
    '</workbook>',
    '<calcPr fullCalcOnLoad="1" forceFullCalc="1"/></workbook>'
  );
}
function setCell(
  xml: string,
  cellRef: string,
  value: string,
  kind: 'string' | 'number',
  replaceFormula = false
) {
  // Directly patch the existing cell node. This retains every original cell
  // attribute (especially the style index) and avoids browser XML namespace
  // lookup inconsistencies in SpreadsheetML documents.
  const reference = cellRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // A template cell may be either a normal element (<c ...>...</c>) or an
  // empty self-closing one (<c ... />). Locate its opening tag first: the
  // former regexp combined both forms and could skip empty cells such as D23.
  const openingTag = new RegExp(`<c\\b(?=[^>]*\\br="${reference}")([^>]*)>`, 'i').exec(xml);
  if (!openingTag || openingTag.index === undefined)
    throw new Error(`Cellule cible absente : ${cellRef}`);
  const isSelfClosing = /\/\s*>$/.test(openingTag[0]);
  const originalAttributes = openingTag[1].replace(/\/\s*$/, '').replace(/\s+t="[^"]*"/i, '');
  const openingEnd = openingTag.index + openingTag[0].length;
  const closingStart = isSelfClosing ? openingEnd : xml.indexOf('</c>', openingEnd);
  if (closingStart < 0) throw new Error(`Cellule Excel invalide : ${cellRef}`);
  const replaceEnd = isSelfClosing ? openingEnd : closingStart + '</c>'.length;
  if (!replaceFormula && !isSelfClosing && /<f(?:\s|>)/i.test(xml.slice(openingEnd, closingStart)))
    throw new Error(`Formule protégée : ${cellRef}`);
  const body =
    kind === 'number' ? `<v>${xmlEscape(value)}</v>` : `<is><t>${xmlEscape(value)}</t></is>`;
  const type = kind === 'string' ? ' t="inlineStr"' : '';
  return `${xml.slice(0, openingTag.index)}<c${originalAttributes}${type}>${body}</c>${xml.slice(replaceEnd)}`;
}
export async function generateDeclaration(input: TaxpayerInput, result: TaxResult) {
  if (result.status !== 'ready')
    throw new Error('Export indisponible tant que le calcul nécessite une vérification.');
  const response = await fetch('/templates/irpp-2025-reference-sanitized.xlsx');
  if (!response.ok) throw new Error('Modèle Excel introuvable.');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relationshipsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !relationshipsXml) throw new Error('Classeur Excel invalide.');
  const workbook = requireValidXml(
    new DOMParser().parseFromString(workbookXml, 'application/xml'),
    'classeur'
  );
  const relationships = requireValidXml(
    new DOMParser().parseFromString(relationshipsXml, 'application/xml'),
    'relations'
  );
  const bySheet = new Map<string, CellPatch[]>();
  for (const patch of declarationPatches(input, result))
    bySheet.set(patch.sheet, [...(bySheet.get(patch.sheet) ?? []), patch]);
  for (const [sheet, patches] of bySheet) {
    const path = sheetPath(workbook, relationships, sheet);
    let xml = await zip.file(path)?.async('string');
    if (!xml) throw new Error(`XML absent : ${sheet}`);
    for (const patch of patches)
      if (patch.value !== null)
        xml = setCell(xml, patch.cell, patch.value, patch.kind, patch.replaceFormula);
    zip.file(path, xml);
  }
  zip.file('xl/workbook.xml', requestFullRecalculation(workbookXml));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
