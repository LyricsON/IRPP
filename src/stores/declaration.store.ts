import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { calculateTax2026 } from '../domain/tax/calculateTax2026';
import type { TaxpayerInput } from '../domain/tax/types';

const blank = (): TaxpayerInput => ({
  year: 2026,
  unsupportedIncome: false,
  identity: { cin: '', fullName: '', birthDate: '', address: '', postalCode: '', profession: '' },
  salaryBase: '0',
  professionalAbatement: '0',
  irppWithheld: '0',
  cssWithheld: '0',
  family: { chefEligible: false, children: [], parents: [] },
  deductions: {},
});
const localValue = (key: keyof ImportMetaEnv, fallback: string) => import.meta.env[key] || fallback;

// Personal test values are kept in ignored .env.local, never in tracked source.
// The three dates are only eligibility placeholders: the reference workbook
// confirms three standard dependent-child deductions, not child birth dates.
const demo = (): TaxpayerInput => ({
  year: 2026,
  unsupportedIncome: false,
  identity: {
    cin: localValue('VITE_IRPP_TEST_CIN', '01234567'),
    fullName: localValue('VITE_IRPP_TEST_NAME', 'Test Utilisateur'),
    birthDate: localValue('VITE_IRPP_TEST_BIRTH_DATE', '1965-04-15'),
    address: localValue('VITE_IRPP_TEST_ADDRESS', '10 Rue de la Demonstration, Tunis'),
    postalCode: '',
    profession: localValue('VITE_IRPP_TEST_PROFESSION', 'Employe'),
  },
  salaryBase: localValue('VITE_IRPP_TEST_SALARY_BASE', '50000.000'),
  professionalAbatement: localValue('VITE_IRPP_TEST_PROFESSIONAL_ABATEMENT', '2000.000'),
  irppWithheld: localValue('VITE_IRPP_TEST_IRPP_WITHHELD', '10000.000'),
  cssWithheld: localValue('VITE_IRPP_TEST_CSS_WITHHELD', '200.000'),
  family: {
    chefEligible: true,
    children: ['2010-01-01', '2011-01-01', '2012-01-01'].map((birthDate, index) => ({
      id: `demo-child-${index + 1}`,
      birthDate,
      hasSeparateIncome: false,
      higherEducation: false,
      receivesScholarship: false,
      disabled: false,
    })),
    parents: [],
  },
  deductions: {
    nonSalariedSocialContributions:
      localValue('VITE_IRPP_TEST_NON_SALARIED_SOCIAL_CONTRIBUTIONS', '') || undefined,
  },
});

export const useDeclarationStore = defineStore('declaration', () => {
  const data = ref<TaxpayerInput>(blank());
  const result = computed(() => calculateTax2026(data.value));
  function reset() {
    data.value = blank();
  }
  function loadDemo() {
    data.value = demo();
  }
  return { data, result, reset, loadDemo };
});
