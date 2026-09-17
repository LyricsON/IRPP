import type { TaxpayerInput, TaxResult } from '../../domain/tax/types';

export interface CellPatch {
  sheet: string;
  cell: string;
  value: string | null;
  kind: 'string' | 'number';
  /** Deliberate override for an engine-owned formula cell when the template requires a manual value. */
  replaceFormula?: boolean;
}

const split = (value: string) => value.split('');

/**
 * Only fields that are entered manually in the reference workbook are patched.
 * All calculation/result cells remain formulas in the workbook and are
 * recalculated by Excel before the local PDF export.
 */
export function declarationPatches(input: TaxpayerInput, result: TaxResult): CellPatch[] {
  const declaration = 'IRPP  2025';
  const detail = 'detail 2025';
  const birth = input.identity.birthDate.split('-');
  const cinCells = ['E8', 'F8', 'G8', 'H8', 'I8', 'J8', 'K8', 'L8'];
  const childFlagCells = ['G3', 'G4', 'G7', 'G8'];
  const childAmountCells = ['H3', 'H4', 'H7', 'H8'];
  const out: CellPatch[] = [
    { sheet: declaration, cell: 'D4', value: '2026', kind: 'number' },
    { sheet: declaration, cell: 'T16', value: 'X', kind: 'string' },
    { sheet: declaration, cell: 'O19', value: input.identity.fullName, kind: 'string' },
    { sheet: declaration, cell: 'F22', value: input.identity.address, kind: 'string' },
    { sheet: declaration, cell: 'J24', value: input.identity.profession, kind: 'string' },

    // Manual inputs on "detail 2025".
    { sheet: detail, cell: 'B3', value: input.salaryBase, kind: 'number' },
    { sheet: detail, cell: 'D16', value: input.professionalAbatement, kind: 'number' },
    { sheet: detail, cell: 'G2', value: input.family.chefEligible ? '1' : null, kind: 'number' },

    // Manual deductions on the declaration sheet. A non-applicable field is
    // intentionally not touched, preserving the blank source-template cell.
    ...(result.parentDeductions === '0.000'
      ? []
      : [
          {
            sheet: declaration,
            cell: 'C263',
            value: result.parentDeductions,
            kind: 'number' as const,
          },
        ]),
    ...(input.deductions.universityLoanPaid === undefined
      ? []
      : [
          {
            sheet: declaration,
            cell: 'C264',
            value: input.deductions.universityLoanPaid,
            kind: 'number' as const,
          },
        ]),
    ...(input.deductions.nonSalariedSocialContributions === undefined
      ? []
      : [
          {
            sheet: declaration,
            cell: 'C265',
            value: input.deductions.nonSalariedSocialContributions,
            kind: 'number' as const,
          },
        ]),
    ...(input.deductions.housing &&
    result.warnings.every((warning) => !warning.includes('Prêt logement'))
      ? [
          {
            sheet: declaration,
            cell: 'C266',
            value: input.deductions.housing.annualInterest,
            kind: 'number' as const,
          },
        ]
      : []),
    { sheet: declaration, cell: 'N357', value: input.irppWithheld, kind: 'number' },
    { sheet: declaration, cell: 'N359', value: input.cssWithheld, kind: 'number' },
  ];

  input.family.children.slice(0, 4).forEach((_, index) => {
    out.push({
      sheet: detail,
      cell: childFlagCells[index],
      // The template's child fields are presence flags ("1 si oui").
      // Each declared child must therefore be marked as present independently
      // of the frontend deduction amount.
      value: '1',
      kind: 'number',
    });
    out.push({
      sheet: detail,
      cell: childAmountCells[index],
      // The reference template hard-codes 100 DT with a formula. These cells
      // deliberately become manual values so student, disabled, and
      // non-eligible child statuses match the frontend calculation.
      value: result.childDeductionBreakdown[index] ?? '0.000',
      kind: 'number',
      replaceFormula: true,
    });
  });
  split(input.identity.cin).forEach((digit, index) =>
    out.push({ sheet: declaration, cell: cinCells[index], value: digit, kind: 'string' })
  );
  split(input.identity.postalCode).forEach((digit, index) =>
    out.push({
      sheet: declaration,
      cell: ['C23', 'D23', 'E23', 'F23'][index],
      value: digit,
      kind: 'string',
    })
  );
  if (birth.length === 3) {
    split(birth[0]).forEach((digit, index) =>
      out.push({
        sheet: declaration,
        cell: ['O21', 'P21', 'Q21', 'R21'][index],
        value: digit,
        kind: 'string',
      })
    );
    split(birth[1]).forEach((digit, index) =>
      out.push({ sheet: declaration, cell: ['T21', 'U21'][index], value: digit, kind: 'string' })
    );
    split(birth[2]).forEach((digit, index) =>
      out.push({ sheet: declaration, cell: ['W21', 'X21'][index], value: digit, kind: 'string' })
    );
  }
  return out;
}
