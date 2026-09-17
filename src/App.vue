<script setup lang="ts">
import { computed, ref } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import { ar, fr } from 'date-fns/locale';
import { useDeclarationStore } from './stores/declaration.store';
import { formatTnd, parseMoney, safeFilename } from './utils/parsing';
import { generateDeclaration } from './infrastructure/xlsx/generateDeclaration';
import { convertWorkbookToPdf } from './infrastructure/pdf/localPdfConverter';

type Locale = 'fr' | 'ar';

const store = useDeclarationStore();
const locale = ref<Locale>('fr');
const step = ref(0);
const exporting = ref<'excel' | 'pdf' | null>(null);
const exportError = ref('');
const isDev = import.meta.env.DEV;
const today = new Date();
const copy = {
  fr: {
    local: 'Outil local · Données conservées sur cet appareil',
    newDeclaration: 'Nouvelle déclaration',
    demo: 'Charger le dossier Anis (test local)',
    steps: ['Éligibilité', 'Identité', 'Famille', 'Revenus', 'Déductions', 'Résultat'],
    eligibilityTitle: 'Votre situation est-elle prise en charge ?',
    eligibilityText: 'Cette version accompagne les revenus de traitements et salaires.',
    unsupported:
      'J’ai également des revenus professionnels, locatifs, agricoles, de placements à traitement distinct, étrangers ou une autre catégorie imposable.',
    unsupportedAlert:
      'Ce cas nécessite un traitement fiscal plus complet et n’est pas encore pris en charge. L’export est désactivé.',
    identity: 'Identité',
    cin: 'CIN',
    cinHelp: '8 chiffres, zéros initiaux conservés.',
    fullName: 'Nom et prénom',
    birthDate: 'Date de naissance',
    dateHint: 'Choisissez la date dans le calendrier.',
    postalCode: 'Code postal (facultatif)',
    address: 'Adresse',
    profession: 'Profession',
    family: 'Situation familiale',
    chef: 'Je remplis les conditions légales de chef de famille.',
    children: 'Enfants à charge',
    addChild: 'Ajouter un enfant',
    noChildren: 'Ajoutez uniquement les enfants susceptibles d’être à charge.',
    child: 'Enfant',
    childHint: 'Sélectionnez uniquement la situation fiscale applicable.',
    underTwenty: 'Moins de 20 ans',
    studentUnderTwentyFiveNoScholarship: 'Étudiant de moins de 25 ans, non boursier',
    ownIncome: 'Revenus propres',
    disabled: 'Enfant handicapé',
    remove: 'Retirer',
    income: 'Revenus et retenues',
    incomeHint: 'Saisissez les montants de votre attestation annuelle.',
    salary: 'Montant annuel imposable (DT)',
    abatement: 'Abattement professionnel (DT)',
    abatementHelp: '10 % au titre des frais professionnels, plafonné à 2 000 DT.',
    irppWithheld: 'IRPP déjà retenu (DT)',
    cssWithheld: 'CSS déjà retenue (DT)',
    deductions: 'Déductions facultatives',
    deductionsHint: 'Indiquez uniquement les montants réellement payés et applicables.',
    university: 'Remboursement de prêt universitaire admissible (DT)',
    social: 'Cotisations sociales non-salarié (DT)',
    socialHelp: 'Laissez vide si ce champ ne s’applique pas.',
    housing: 'J’ai des intérêts / commissions d’un prêt logement à examiner.',
    housingCost: 'Coût acquisition/construction HT (DT)',
    housingInterest: 'Intérêts/commissions annuels réellement payés (DT)',
    alreadyOwner: 'J’étais déjà propriétaire d’une autre résidence à la date concernée.',
    result: 'Calcul et déclaration',
    ready: 'Calcul prêt',
    verification: 'Vérification requise',
    taxable: 'Revenu imposable',
    rounded: 'Base arrondie fiscalement',
    irppDue: 'IRPP dû',
    cssDue: 'CSS due',
    balance: 'Solde IRPP + CSS',
    breakdown: 'Voir le calcul par tranche',
    from: 'De',
    to: 'À',
    base: 'Base',
    rate: 'Taux',
    noLimit: 'Au-delà',
    notice:
      'Le classeur conserve le modèle et ses deux feuilles. Le PDF est créé depuis ce même fichier par Microsoft Excel local.',
    excel: 'Télécharger Excel',
    pdf: 'Télécharger PDF',
    generatingExcel: 'Génération Excel…',
    generatingPdf: 'Conversion PDF…',
    previous: 'Précédent',
    next: 'Continuer',
    exportError: 'Impossible de générer le fichier Excel. Aucune donnée n’a été perdue.',
  },
  ar: {
    local: 'أداة محلية · تبقى البيانات على هذا الجهاز',
    newDeclaration: 'تصريح جديد',
    demo: 'تحميل ملف أنيس التجريبي',
    steps: ['الأهلية', 'الهوية', 'العائلة', 'المداخيل', 'الخصومات', 'النتيجة'],
    eligibilityTitle: 'هل حالتك مشمولة بالتطبيق؟',
    eligibilityText: 'هذه النسخة مخصصة لمداخيل الأجور والمرتبات.',
    unsupported:
      'لدي أيضاً مداخيل مهنية أو عقارية أو فلاحية أو استثمارات أو مداخيل أجنبية أو صنف آخر خاضع للضريبة.',
    unsupportedAlert: 'هذه الحالة تحتاج معالجة جبائية أوسع وغير مدعومة حالياً. تم إيقاف التصدير.',
    identity: 'الهوية',
    cin: 'رقم بطاقة التعريف',
    cinHelp: '8 أرقام مع الاحتفاظ بالأصفار في البداية.',
    fullName: 'الاسم واللقب',
    birthDate: 'تاريخ الولادة',
    dateHint: 'اختر التاريخ من التقويم.',
    postalCode: 'الترقيم البريدي (اختياري)',
    address: 'العنوان',
    profession: 'المهنة',
    family: 'الوضعية العائلية',
    chef: 'أستوفي الشروط القانونية لرب العائلة.',
    children: 'الأبناء في الكفالة',
    addChild: 'إضافة ابن',
    noChildren: 'أضف فقط الأبناء الذين يمكن اعتبارهم في الكفالة.',
    child: 'الابن',
    childHint: 'اختر فقط الوضعية الجبائية المنطبقة.',
    underTwenty: 'العمر أقل من 20 سنة',
    studentUnderTwentyFiveNoScholarship: 'طالب أقل من 25 سنة وغير متحصل على منحة',
    ownIncome: 'له مداخيل خاصة',
    disabled: 'ابن حامل لإعاقة',
    remove: 'حذف',
    income: 'المداخيل والخصم',
    incomeHint: 'أدخل المبالغ الواردة في الشهادة السنوية.',
    salary: 'المبلغ السنوي الخاضع للضريبة (د.ت)',
    abatement: 'الطرح بعنوان المصاريف المهنية (د.ت)',
    abatementHelp: 'طرح 10% بعنوان المصاريف المهنية، في حدود \u20662,000\u2069 دينار.',
    irppWithheld: 'ضريبة الدخل المحجوزة (د.ت)',
    cssWithheld: 'المساهمة الاجتماعية المحجوزة (د.ت)',
    deductions: 'الخصومات الاختيارية',
    deductionsHint: 'أدخل فقط المبالغ المدفوعة والمنطبقة على حالتك.',
    university: 'خلاص قرض جامعي مؤهل للطرح (د.ت)',
    social: 'اشتراكات اجتماعية لغير الأجراء (د.ت)',
    socialHelp: 'اترك الحقل فارغاً إن لم يكن منطبقاً.',
    housing: 'لدي فوائد أو عمولات قرض سكن يمكن دراستها.',
    housingCost: 'كلفة الاقتناء/البناء دون الأداءات (د.ت)',
    housingInterest: 'الفوائد/العمولات السنوية المدفوعة (د.ت)',
    alreadyOwner: 'كنت مالكاً لمسكن آخر في التاريخ المعني.',
    result: 'الحساب والتصريح',
    ready: 'الحساب جاهز',
    verification: 'يلزم التحقق',
    taxable: 'الدخل الخاضع للضريبة',
    rounded: 'القاعدة بعد التقريب الجبائي',
    irppDue: 'ضريبة الدخل المستوجبة',
    cssDue: 'المساهمة الاجتماعية المستوجبة',
    balance: 'الرصيد: ضريبة الدخل + المساهمة',
    breakdown: 'عرض الحساب حسب الشرائح',
    from: 'من',
    to: 'إلى',
    base: 'القاعدة',
    rate: 'النسبة',
    noLimit: 'فما فوق',
    notice:
      'يحافظ ملف Excel على النموذج وورقتيه. يتم إنشاء PDF من نفس الملف بواسطة Microsoft Excel المحلي.',
    excel: 'تحميل Excel',
    pdf: 'تحميل PDF',
    generatingExcel: 'جاري إنشاء Excel…',
    generatingPdf: 'جاري تحويل PDF…',
    previous: 'السابق',
    next: 'متابعة',
    exportError: 'تعذر إنشاء ملف Excel. لم يتم فقدان أي بيانات.',
  },
} as const;
const t = computed(() => copy[locale.value]);
const calendarLocale = computed(() => (locale.value === 'ar' ? ar : fr));
const calendarDayNames = computed<string[] | undefined>(() =>
  locale.value === 'ar' ? ['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب'] : undefined
);
const canAddChild = computed(() => store.data.family.children.length < 4);
const canNext = computed(
  () =>
    step.value !== 1 ||
    (/^\d{8}$/.test(store.data.identity.cin) &&
      !!store.data.identity.fullName &&
      !!store.data.identity.birthDate &&
      !!store.data.identity.address &&
      (!store.data.identity.postalCode || /^\d{4}$/.test(store.data.identity.postalCode)) &&
      !!store.data.identity.profession)
);

function addChild() {
  if (!canAddChild.value) return;
  store.data.family.children.push({
    id: crypto.randomUUID(),
    underTwenty: false,
    studentUnderTwentyFiveNoScholarship: false,
    hasSeparateIncome: false,
    disabled: false,
  });
}
function optionalMoney(value: string) {
  return value.trim() ? parseMoney(value) : undefined;
}
function downloadBlob(blob: Blob, extension: 'xlsx' | 'pdf') {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `IRPP-Revenus-2026-${safeFilename(store.data.identity.fullName)}.${extension}`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
async function downloadExcel() {
  exportError.value = '';
  exporting.value = 'excel';
  try {
    downloadBlob(await generateDeclaration(store.data, store.result), 'xlsx');
  } catch (error) {
    exportError.value = t.value.exportError;
    if (import.meta.env.DEV) console.error(error);
  } finally {
    exporting.value = null;
  }
}
async function downloadPdf() {
  exportError.value = '';
  exporting.value = 'pdf';
  try {
    downloadBlob(
      await convertWorkbookToPdf(await generateDeclaration(store.data, store.result)),
      'pdf'
    );
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : t.value.exportError;
    if (import.meta.env.DEV) console.error(error);
  } finally {
    exporting.value = null;
  }
}
</script>

<template>
  <main class="app-shell" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">
    <header class="topbar">
      <div class="brand">
        <p class="eyebrow">{{ t.local }}</p>
        <h1>IRPP <span>Tunisie</span><em>2026</em></h1>
      </div>
      <div class="top-actions">
        <div class="language-switch" aria-label="Choix de langue">
          <button :class="{ selected: locale === 'fr' }" @click="locale = 'fr'">FR</button
          ><button :class="{ selected: locale === 'ar' }" @click="locale = 'ar'">العربية</button>
        </div>
        <button
          class="text-button"
          @click="
            store.reset();
            step = 0;
          "
        >
          {{ t.newDeclaration }}
        </button>
      </div>
    </header>

    <nav
      class="stepper"
      :aria-label="locale === 'ar' ? 'مراحل التصريح' : 'Étapes de la déclaration'"
    >
      <ol>
        <li
          v-for="(name, index) in t.steps"
          :key="index"
          :class="{ active: index === step, done: index < step }"
        >
          <span>{{ index + 1 }}</span
          ><b>{{ name }}</b>
        </li>
      </ol>
    </nav>
    <div v-if="isDev" class="demo-row">
      <button
        class="demo-button"
        @click="
          store.loadDemo();
          step = 0;
        "
      >
        {{ t.demo }}
      </button>
    </div>

    <section class="content-card">
      <template v-if="step === 0"
        ><h2>{{ t.eligibilityTitle }}</h2>
        <p class="lead">{{ t.eligibilityText }}</p>
        <label class="choice-card"
          ><input v-model="store.data.unsupportedIncome" type="checkbox" /><span>{{
            t.unsupported
          }}</span></label
        >
        <p v-if="store.data.unsupportedIncome" class="alert danger">
          {{ t.unsupportedAlert }}
        </p></template
      >

      <template v-else-if="step === 1"
        ><h2>{{ t.identity }}</h2>
        <div class="form-grid">
          <label
            >{{ t.cin
            }}<input v-model="store.data.identity.cin" inputmode="numeric" maxlength="8" /><small>{{
              t.cinHelp
            }}</small></label
          ><label
            >{{ t.fullName
            }}<input v-model="store.data.identity.fullName" autocomplete="name" /></label
          ><label class="date-field"
            >{{ t.birthDate
            }}<VueDatePicker
              v-model="store.data.identity.birthDate"
              class="app-date-picker"
              model-type="yyyy-MM-dd"
              :formats="{ input: 'dd/MM/yyyy' }"
              :locale="calendarLocale"
              :day-names="calendarDayNames"
              :week-start="locale === 'ar' ? 6 : 1"
              :max-date="today"
              :time-picker="false"
              :time-config="{ enableTimePicker: false }"
              :clearable="false"
              :teleport="false"
              auto-apply
            /><small>{{ t.dateHint }}</small></label
          ><label
            >{{ t.postalCode
            }}<input
              v-model="store.data.identity.postalCode"
              inputmode="numeric"
              maxlength="4" /></label
          ><label
            >{{ t.address
            }}<input v-model="store.data.identity.address" autocomplete="street-address" /></label
          ><label>{{ t.profession }}<input v-model="store.data.identity.profession" /></label></div
      ></template>

      <template v-else-if="step === 2"
        ><h2>{{ t.family }}</h2>
        <label class="choice-card"
          ><input v-model="store.data.family.chefEligible" type="checkbox" /><span>{{
            t.chef
          }}</span></label
        >
        <div class="section-heading">
          <h3>{{ t.children }}</h3>
          <button class="text-button" :disabled="!canAddChild" @click="addChild">
            + {{ t.addChild }}
          </button>
        </div>
        <p v-if="!store.data.family.children.length" class="muted">{{ t.noChildren }}</p>
        <article
          v-for="(child, index) in store.data.family.children"
          :key="child.id"
          class="child-card"
        >
          <div class="child-summary">
            <strong>{{ t.child }} {{ index + 1 }}</strong>
            <span>{{ t.childHint }}</span>
          </div>
          <div class="checks child-eligibility">
            <label><input v-model="child.underTwenty" type="checkbox" /> {{ t.underTwenty }}</label>
            <label
              ><input v-model="child.studentUnderTwentyFiveNoScholarship" type="checkbox" />
              {{ t.studentUnderTwentyFiveNoScholarship }}</label
            >
            <label><input v-model="child.disabled" type="checkbox" /> {{ t.disabled }}</label>
            <label
              ><input v-model="child.hasSeparateIncome" type="checkbox" /> {{ t.ownIncome }}</label
            >
          </div>
          <button class="remove-button" @click="store.data.family.children.splice(index, 1)">
            {{ t.remove }}
          </button>
        </article></template
      >

      <template v-else-if="step === 3"
        ><h2>{{ t.income }}</h2>
        <p class="lead">{{ t.incomeHint }}</p>
        <div class="form-grid">
          <label class="span-two"
            >{{ t.salary
            }}<input
              :value="store.data.salaryBase"
              inputmode="decimal"
              @input="
                store.data.salaryBase = parseMoney(($event.target as HTMLInputElement).value)
              " /></label
          ><label
            >{{ t.irppWithheld
            }}<input
              :value="store.data.irppWithheld"
              inputmode="decimal"
              @input="
                store.data.irppWithheld = parseMoney(($event.target as HTMLInputElement).value)
              " /></label
          ><label
            >{{ t.cssWithheld
            }}<input
              :value="store.data.cssWithheld"
              inputmode="decimal"
              @input="
                store.data.cssWithheld = parseMoney(($event.target as HTMLInputElement).value)
              " /></label
          ><label class="span-two"
            >{{ t.abatement
            }}<input
              :value="store.data.professionalAbatement"
              inputmode="decimal"
              @input="
                store.data.professionalAbatement = parseMoney(
                  ($event.target as HTMLInputElement).value
                )
              "
            /><small>{{ t.abatementHelp }}</small></label
          >
        </div></template
      >

      <template v-else-if="step === 4"
        ><h2>{{ t.deductions }}</h2>
        <p class="lead">{{ t.deductionsHint }}</p>
        <div class="form-grid">
          <label
            >{{ t.university
            }}<input
              :value="store.data.deductions.universityLoanPaid ?? ''"
              inputmode="decimal"
              @input="
                store.data.deductions.universityLoanPaid = optionalMoney(
                  ($event.target as HTMLInputElement).value
                )
              " /></label
          ><label
            >{{ t.social
            }}<input
              :value="store.data.deductions.nonSalariedSocialContributions ?? ''"
              inputmode="decimal"
              @input="
                store.data.deductions.nonSalariedSocialContributions = optionalMoney(
                  ($event.target as HTMLInputElement).value
                )
              "
            /><small>{{ t.socialHelp }}</small></label
          ><label class="choice-card span-two"
            ><input
              v-model="store.data.deductions.housing"
              :true-value="{
                costExVat: '0',
                alreadyOwnedResidence: false,
                annualInterest: '0',
                financing: 'loan',
              }"
              :false-value="undefined"
              type="checkbox"
            /><span>{{ t.housing }}</span></label
          ><template v-if="store.data.deductions.housing"
            ><label
              >{{ t.housingCost
              }}<input
                v-model="store.data.deductions.housing.costExVat"
                inputmode="decimal" /></label
            ><label
              >{{ t.housingInterest
              }}<input
                v-model="store.data.deductions.housing.annualInterest"
                inputmode="decimal" /></label
            ><label class="choice-card span-two"
              ><input
                v-model="store.data.deductions.housing.alreadyOwnedResidence"
                type="checkbox"
              /><span>{{ t.alreadyOwner }}</span></label
            ></template
          >
        </div></template
      >

      <template v-else
        ><h2>{{ t.result }}</h2>
        <p v-if="store.result.status === 'blocked'" class="alert danger">
          {{ store.result.warnings[0] }}
        </p>
        <template v-else
          ><p :class="['status-pill', store.result.status]">
            {{ store.result.status === 'ready' ? t.ready : t.verification }}
          </p>
          <div class="results-grid">
            <div>
              <span>{{ t.taxable }}</span
              ><strong>{{ formatTnd(store.result.taxableIncome) }}</strong>
            </div>
            <div>
              <span>{{ t.rounded }}</span
              ><strong>{{ formatTnd(store.result.roundedTaxableIncome) }}</strong>
            </div>
            <div>
              <span>{{ t.irppDue }}</span
              ><strong>{{ formatTnd(store.result.irppDue) }}</strong>
            </div>
            <div>
              <span>{{ t.cssDue }}</span
              ><strong>{{ formatTnd(store.result.cssDue) }}</strong>
            </div>
            <div class="total">
              <span>{{ t.balance }}</span
              ><strong>{{ formatTnd(store.result.totalBalance) }}</strong>
            </div>
          </div>
          <details>
            <summary>{{ t.breakdown }}</summary>
            <table>
              <thead>
                <tr>
                  <th>{{ t.from }}</th>
                  <th>{{ t.to }}</th>
                  <th>{{ t.base }}</th>
                  <th>{{ t.rate }}</th>
                  <th>IRPP</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="bracket in store.result.brackets" :key="bracket.from">
                  <td>{{ bracket.from }}</td>
                  <td>{{ bracket.to ?? t.noLimit }}</td>
                  <td>{{ bracket.taxableAmount }}</td>
                  <td>{{ bracket.rate }}</td>
                  <td>{{ bracket.tax }}</td>
                </tr>
              </tbody>
            </table>
          </details>
          <p v-for="warning in store.result.warnings" :key="warning" class="alert">{{ warning }}</p>
          <p class="notice">{{ t.notice }}</p>
          <div class="download-actions">
            <button
              class="primary-button"
              :disabled="store.result.status !== 'ready' || exporting !== null"
              @click="downloadExcel"
            >
              {{ exporting === 'excel' ? t.generatingExcel : t.excel }}</button
            ><button
              class="secondary-button"
              :disabled="store.result.status !== 'ready' || exporting !== null"
              @click="downloadPdf"
            >
              {{ exporting === 'pdf' ? t.generatingPdf : t.pdf }}
            </button>
          </div>
          <p v-if="exportError" class="alert danger">{{ exportError }}</p></template
        ></template
      >
    </section>
    <footer class="page-footer">
      <button v-if="step" class="text-button" @click="step--">{{ t.previous }}</button
      ><button
        v-if="step < t.steps.length - 1"
        class="primary-button"
        :disabled="!canNext"
        @click="step++"
      >
        {{ t.next }} <span aria-hidden="true">{{ locale === 'ar' ? '←' : '→' }}</span>
      </button>
    </footer>
  </main>
</template>
