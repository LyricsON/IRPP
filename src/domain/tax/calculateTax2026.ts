import Decimal from 'decimal.js';
import { TAX_RULES_2026 as R } from './rules/2026';
import type { Child, TaxpayerInput, TaxResult, BracketResult } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
const d = (value: string | undefined) => new Decimal(value ?? '0');
const money = (value: Decimal) => value.toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3);
const childDeduction = (child: Child) => {
  if (child.hasSeparateIncome) return d('0');
  if (child.disabled) return d(R.disabledChildDeduction);
  if (child.studentUnderTwentyFiveNoScholarship)
    return d(R.studentDeduction);
  return child.underTwenty ? d(R.childDeduction) : d('0');
};

export function calculateTax2026(input: TaxpayerInput): TaxResult {
  if (input.unsupportedIncome)
    return {
      status: 'blocked',
      professionalExpenses: '0.000',
      chefDeduction: '0.000',
      childDeductionBreakdown: [],
      childrenDeductions: '0.000',
      familyDeductions: '0.000',
      parentDeductions: '0.000',
      commonDeductions: '0.000',
      totalDeductions: '0.000',
      taxableIncome: '0.000',
      roundedTaxableIncome: '0.000',
      irppDue: '0.000',
      cssDue: '0.000',
      irppBalance: '0.000',
      cssBalance: '0.000',
      totalBalance: '0.000',
      brackets: [],
      warnings: [
        'Ce cas nécessite un traitement fiscal plus complet et n’est pas encore pris en charge par cette version.',
      ],
    };

  const warnings: string[] = [];
  const salary = d(input.salaryBase);
  const professionalCeiling = Decimal.min(
    salary.mul(R.professionalExpenseRate),
    d(R.professionalExpenseCap)
  );
  const requestedAbatement = d(input.professionalAbatement);
  const professional = Decimal.min(requestedAbatement, professionalCeiling);
  if (requestedAbatement.gt(professionalCeiling))
    warnings.push(
      `Abattement limité à ${money(professionalCeiling)} DT (10 %, plafond annuel 2 000 DT).`
    );
  const childDeductionBreakdown = input.family.children
    .slice(0, 4)
    .map((child) => childDeduction(child));
  const children = childDeductionBreakdown.reduce((sum, amount) => sum.plus(amount), d('0'));
  const chef = input.family.chefEligible ? d(R.chefDeduction) : d('0');
  const family = chef.plus(children);
  const beforeParents = Decimal.max(salary.minus(professional).minus(family), 0);

  let parents = d('0');
  for (const parent of input.family.parents) {
    if (parent.eligible && parent.incomeBelowThreshold && parent.supportShare > 0) {
      parents = parents.plus(
        Decimal.min(beforeParents.mul(R.parentRate).mul(parent.supportShare), d(R.parentCap))
      );
    }
  }

  let optional = d(input.deductions.universityLoanPaid).plus(
    d(input.deductions.nonSalariedSocialContributions)
  );
  const housing = input.deductions.housing;
  if (housing) {
    if (d(housing.costExVat).lte(R.housingCostCap) && !housing.alreadyOwnedResidence)
      optional = optional.plus(d(housing.annualInterest));
    else warnings.push('Prêt logement non déduit : conditions déclarées non satisfaites.');
  }
  const life = input.deductions.lifeInsurance;
  if (life) {
    if (life.qualifyingDurationYears >= 8)
      warnings.push(
        'Assurance-vie : avantage désactivé, vérification juridique du minimum d’impôt requise.'
      );
    else warnings.push('Assurance-vie non déduite : durée minimale non satisfaite.');
  }

  const totalDeductions = family.plus(parents).plus(optional);
  const taxable = Decimal.max(salary.minus(professional).minus(totalDeductions), 0);
  const rounded = taxable.ceil();
  let remaining = rounded;
  let from = d('0');
  let irpp = d('0');
  const brackets: BracketResult[] = [];
  for (const bracket of R.brackets) {
    const to = bracket.upTo ? d(bracket.upTo) : null;
    const amount = to
      ? Decimal.max(Decimal.min(remaining, to.minus(from)), 0)
      : Decimal.max(remaining, 0);
    const tax = amount.mul(bracket.rate);
    brackets.push({
      from: money(from),
      to: to ? money(to) : null,
      taxableAmount: money(amount),
      rate: bracket.rate,
      tax: money(tax),
    });
    irpp = irpp.plus(tax);
    remaining = remaining.minus(amount);
    if (to) from = to;
    if (remaining.lte(0)) break;
  }
  const cssBase = taxable;
  const css = cssBase.lte(R.cssExemptionThreshold) ? d('0') : cssBase.mul(R.cssRate);
  const irppBalance = irpp.minus(d(input.irppWithheld));
  const cssBalance = css.minus(d(input.cssWithheld));

  return {
    status: warnings.some((warning) => warning.includes('vérification'))
      ? 'verification-required'
      : 'ready',
    professionalExpenses: money(professional),
    chefDeduction: money(chef),
    childDeductionBreakdown: childDeductionBreakdown.map(money),
    childrenDeductions: money(children),
    familyDeductions: money(family),
    parentDeductions: money(parents),
    commonDeductions: money(optional),
    totalDeductions: money(totalDeductions),
    taxableIncome: money(taxable),
    roundedTaxableIncome: money(rounded),
    irppDue: money(irpp),
    cssDue: money(css),
    irppBalance: money(irppBalance),
    cssBalance: money(cssBalance),
    totalBalance: money(irppBalance.plus(cssBalance)),
    brackets,
    warnings,
  };
}
