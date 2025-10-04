import type { AppSettings, RelationSection, LandingPageSettings, CurrencySettings, VoucherSettings, InvoiceSequenceSettings, ImportFieldSettings, ImportLogicSettings, CustomRelationField, SegmentSettings, PartnerShareSetting } from './types';

export const defaultRelationSections: RelationSection[] = [
    { 
        id: 'sec_basic', 
        title: 'المعلومات الأساسية', 
        deletable: false,
        description: "الحقول الأساسية لتعريف العميل أو المورد.",
        fields: [
            { id: 'name', label: 'الاسم الكامل', type: 'text', required: true, visible: true, deletable: false, placeholder: 'اسم العميل أو المورد', appliesTo: ['individual', 'company'], aliases: ['name', 'الاسم', 'اسم العميل', 'اسم الشركة', 'company name', 'supplier name', 'اسم المورد'] },
            { id: 'type', label: 'نوع الجهة', type: 'select', required: true, visible: true, deletable: false, options: [{value: 'individual', label: 'فرد'}, {value: 'company', label: 'شركة'}], appliesTo: ['individual', 'company'], aliases: ['type', 'النوع', 'entity type'] },
            { id: 'relationType', label: 'نوع العلاقة', type: 'select', required: true, visible: true, deletable: false, options: [{value: 'client', label: 'عميل'}, {value: 'supplier', label: 'مورد'}, {value: 'both', label: 'كلاهما'}], appliesTo: ['individual', 'company'], aliases: ['relationtype', 'relation type', 'نوع العلاقة', 'العميل او المورد', 'client or supplier'] },
            { id: 'status', label: 'الحالة', type: 'select', required: true, visible: true, deletable: false, options: [{value: 'active', label: 'نشط'}, {value: 'inactive', label: 'غير نشط'}], appliesTo: ['individual', 'company'], aliases: ['status', 'الحالة'] },
        ]
    },
     { 
        id: 'sec_contact', 
        title: 'معلومات الاتصال والعنوان', 
        deletable: false,
        description: 'بيانات الاتصال والتواصل والتفاصيل الجغرافية.',
        fields: [
            { id: 'phone', label: 'رقم الهاتف', type: 'text', required: false, visible: true, deletable: false, placeholder: '07700000000', appliesTo: ['individual', 'company'], aliases: ['phone', 'الهاتف', 'رقم الهاتف', 'mobile', 'رقم الجوال'] },
            { id: 'email', label: 'البريد الإلكتروني', type: 'email', required: false, visible: true, deletable: true, placeholder: 'example@mail.com', appliesTo: ['individual', 'company'], aliases: ['email', 'البريد الالكتروني', 'بريد الكتروني'] },
            { id: 'country', label: 'الدولة', type: 'select', required: false, visible: true, deletable: false, appliesTo: ['individual', 'company'], aliases: ['country', 'البلد', 'دولة'] },
            { id: 'province', label: 'المحافظة/الولاية', type: 'select', required: false, visible: true, deletable: false, appliesTo: ['individual', 'company'], aliases: ['province', 'state', 'المحافظة', 'الولاية'] },
            { id: 'streetAddress', label: 'تفاصيل العنوان', type: 'text', required: false, visible: true, deletable: false, placeholder: 'المنطقة، الشارع، رقم المبنى...', appliesTo: ['individual', 'company'], aliases: ['address', 'العنوان', 'streetaddress', 'street address'] },
        ]
    },
    { 
        id: 'sec_company', 
        title: 'تفاصيل الشركة وتسجيل الدخول', 
        deletable: false,
        description: 'الحقول الخاصة بالشركات وإدارة الوصول للنظام.',
        fields: [
            { id: 'code', label: 'معرف الشركة (يوزر فلاي)', type: 'text', required: false, visible: true, deletable: true, appliesTo: ['company'], aliases: ['code', 'companyid', 'company id', 'معرف الشركة', 'يوزر فلاي'] },
            { id: 'paymentType', label: 'نوع التعامل', type: 'select', required: true, visible: true, deletable: true, options: [{value: 'cash', label: 'نقدي'}, {value: 'credit', label: 'آجل'}], appliesTo: ['company', 'individual'], aliases: ['paymenttype', 'payment type', 'نوع التعامل', 'التعامل', 'نوع الدفع'] },
        ]
    },
    { 
        id: 'sec_login', 
        title: 'إدارة تسجيل الدخول', 
        deletable: false,
        description: 'إدارة الوصول للنظام لهذه العلاقة.',
        fields: [
             { id: 'loginIdentifier', label: 'معرف تسجيل الدخول', type: 'text', required: false, visible: true, deletable: false, placeholder: 'اختر معرفًا فريدًا لتسجيل الدخول', appliesTo: ['individual', 'company'], aliases: ['login id', 'login identifier', 'username', 'معرف الدخول', 'اسم المستخدم'] },
             { id: 'password', label: 'كلمة المرور', type: 'password', required: false, visible: true, deletable: false, placeholder: 'اتركه فارغًا لعدم التغيير', appliesTo: ['individual', 'company'], aliases: ['password', 'كلمة المرور'] },
        ]
    },
    { 
        id: 'sec_other', 
        title: 'تفاصيل أخرى', 
        deletable: true,
        description: 'حقول إضافية وتفاصيل.',
        fields: [
            { id: 'details', label: 'التفاصيل', type: 'textarea', required: false, visible: true, deletable: true, appliesTo: ['individual', 'company'], aliases: ['details', 'notes', 'ملاحظات', 'تفاصيل'] },
        ]
    }
];

const defaultLandingPageSettings: LandingPageSettings = {
    heroTitle: 'نظام Mudarib المحاسبي',
    heroSubtitle: 'الحل المتكامل لإدارة شركات السفر والسياحة بكفاءة ودقة.',
    heroSubtitleColor: '#52525b', // zinc-600
    heroTitleColor: '#1e293b',
    smartTickets: {
        title: 'إدخال ذكي للتذاكر والفواتير',
        description: 'وداعًا للإدخال اليدوي. نظامنا يقرأ ملفات PDF ويستخرج البيانات تلقائيًا، مما يوفر وقتك ويزيد من دقة بياناتك.',
        imageUrl: 'https://images.unsplash.com/photo-1517999348311-5bc38e05b1c6?q=80&w=2070&auto=format&fit=crop',
    },
    sourceAuditing: {
        title: 'مطابقة الكشوفات بذكاء',
        description: 'أداة مبتكرة لمقارنة كشف حسابك مع كشف حساب الموردين، وتحديد الفروقات والاختلافات تلقائيًا بدقة تصل إلى 99%.',
        imageUrl: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=2070&auto=format&fit=crop',
    },
    financialManagement: {
        title: 'إدارة مالية شاملة',
        description: 'من سندات القبض والصرف إلى شجرة الحسابات والتقارير المتقدمة، كل ما تحتاجه لإدارة مالية شركتك في مكان واحد.',
        imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop',
    },
     servicesSection: {
        title: 'خدماتنا المحاسبية',
        description: 'نظام متكامل يغطي جميع احتياجات شركات السياحة والسفر، مصمم خصيصًا ليتوافق مع طبيعة عملكم.'
    },
    partnersSection: {
        title: 'شركاء النجاح',
        description: 'نفخر بالتعاون مع نخبة من شركات السياحة والسفر الرائدة التي وثقت في نظامنا لتحقيق أهدافها.',
        partners: [
            { name: 'FlyBaghdad', logoUrl: 'https://assets.sindibad.iq/logos/FQ.png' },
            { name: 'UR Airlines', logoUrl: 'https://assets.sindibad.iq/logos/UD.png' },
            { name: 'Iraqi Airways', logoUrl: 'https://assets.sindibad.iq/logos/IA.png' },
            { name: 'Anadolujet', logoUrl: 'https://assets.sindibad.iq/logos/TK1.png' },
            { name: 'Turkish Airlines', logoUrl: 'https://assets.sindibad.iq/logos/TK.png' },
        ]
    },
    faqSection: {
        title: 'الأسئلة الشائعة',
        description: 'هل لديك سؤال؟ قد تجد إجابتك هنا.',
        faqs: [
            { question: 'ما هو نظام Mudarib؟', answer: 'هو نظام محاسبي متكامل مصمم خصيصًا لشركات السياحة والسفر.' },
            { question: 'هل يدعم النظام اللغة العربية؟', answer: 'نعم، النظام يدعم اللغة العربية بشكل كامل مع واجهات RTL.' },
            { question: 'هل يمكن تخصيص مظهر النظام؟', answer: 'بالتأكيد، يمكنك تخصيص الألوان والخطوط والشعارات من صفحة الإعدادات.' },
        ]
    },
    accountStatements: {
        title: 'إدارة ومتابعة الديون بسهولة',
        description: 'نظام متكامل لمتابعة ديون العملاء والموردين، مع كشوفات حسابات تفصيلية وتنبيهات آلية للمدفوعات المستحقة.',
        imageUrl: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1974&auto=format&fit=crop',
    },
    financialAnalysis: {
        title: 'تحليلات مالية دقيقة لاتخاذ القرارات',
        description: 'احصل على رؤية عميقة لأداء شركتك المالي. تتبع الأرباح، حلل التكاليف، وادرس هيكل حساباتك بسهولة عبر شجرة الحسابات التفاعلية.',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
    },
    footerImageUrl: 'https://images.unsplash.com/photo-1549492423-400259a5e5a4?q=80&w=2148&auto=format&fit=crop'
};

const defaultVoucherSettings: VoucherSettings = {
  receiptInvoiceCounter: 1000,
  paymentInvoiceCounter: 1000,
  receiptTableColumns: [], // Deprecated
  paymentTableColumns: [], // Deprecated
  expenseAccounts: [
      { id: 'expense_salaries', name: 'رواتب' },
      { id: 'expense_rent', name: 'إيجار' },
  ]
};

const defaultInvoiceSequenceSettings: InvoiceSequenceSettings = {
    ticketBookingCounter: 0,
    visaBookingCounter: 0,
    groupBookingCounter: 0,
};

// This is populated dynamically based on relationSections, but we can keep some defaults.
export const defaultImportFieldsSettings: ImportFieldSettings = {
    'name': { label: 'الاسم الكامل', aliases: ['name', 'الاسم', 'اسم العميل', 'اسم الشركة', 'company name', 'supplier name', 'اسم المورد'] },
    'phone': { label: 'رقم الهاتف', aliases: ['phone', 'الهاتف', 'رقم الهاتف', 'mobile', 'رقم الجوال'] },
    'email': { label: 'البريد الإلكتروني', aliases: ['email', 'البريد الالكتروني', 'بريد الكتروني'] },
    'type': { label: 'نوع الجهة', aliases: ['type', 'النوع', 'entity type'] },
    'relationType': { label: 'نوع العلاقة', aliases: ['relationtype', 'relation type', 'نوع العلاقة'] },
    'status': { label: 'الحالة', aliases: ['status', 'الحالة'] },
    'code': { label: 'معرف الشركة (يوزر فلاي)', aliases: ['code', 'companyid', 'company id', 'معرف الشركة', 'يوزر فلاي'] },
    'paymentType': { label: 'نوع التعامل', aliases: ['paymenttype', 'payment type', 'نوع التعامل', 'التعامل', 'نوع الدفع'] },
    'details': { label: 'التفاصيل', aliases: ['details', 'notes', 'ملاحظات', 'تفاصيل'] },
    'country': { label: 'الدولة', aliases: ['country', 'البلد', 'دولة'] },
    'province': { label: 'المحافظة', aliases: ['province', 'state', 'المحافظة', 'الولاية'] },
    'streetAddress': { label: 'تفاصيل العنوان', aliases: ['address', 'العنوان', 'streetaddress', 'street address'] },
};

const defaultImportLogicSettings: ImportLogicSettings = {
    creditKeywords: ['credit', 'آجل', 'debit', 'دبت'],
    cashKeywords: ['cash', 'كاش', 'نقد', 'نقدي'],
};

const defaultCurrencySettings: CurrencySettings = {
    defaultCurrency: 'USD',
    exchangeRates: {
        'USD_IQD': 1480,
    },
    currencies: [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' },
    ],
};

const defaultSegmentSettings: SegmentSettings = {
  tickets: { type: 'fixed', value: 1 },
  visas: { type: 'fixed', value: 1 },
  hotels: { type: 'fixed', value: 1 },
  groups: { type: 'fixed', value: 1 },
};

const defaultPartnerShareSetting: PartnerShareSetting = {
  type: 'percentage',
  value: 50,
};

export const defaultSettingsData: AppSettings = {
    currencySettings: defaultCurrencySettings,
    exchangeRateTemplate: "*تحديث سعر الصرف*\\n\\n 1 دولار أمريكي = *{rate}* دينار عراقي\\n\\nتاريخ التحديث: {date}",
    remittanceSettings: {
        offices: ["الريان", "الطيف", "ماستر", "عطاء الغري"],
        methods: ["زين كاش", "ماستر كارد", "حوالة مصرفية", "نقدي"],
        distributionColumnsUsd: [
            { id: 'externalAmount', label: 'خارجي' },
        ],
        distributionColumnsIqd: [
            { id: 'flyAmount', label: 'فلاي' },
            { id: 'internalAmount', label: 'داخلي' },
        ],
        headerColorUsd: '#1e40af', // blue-800
        headerColorIqd: '#166534', // green-800
    },
    voucherSettings: defaultVoucherSettings,
    invoiceSequenceSettings: defaultInvoiceSequenceSettings,
    creditPolicySettings: { defaultCreditLimit: 10000, defaultGracePeriodDays: 30 },
    databaseStatus: { isDatabaseConnected: true },
    theme: { 
        landingPage: defaultLandingPageSettings,
        invoice: {
            companyName: 'Mudarib',
            companyAddress: 'Iraq - Holy Karbala - Silo St.',
            companyPhone: '+964 781 000 3377',
            companyWeb: 'codescope.dev',
            headerColor: '#e0f2f1',
            titleColor: '#663399',
            footerText: 'شكرًا لتعاملكم معنا!'
        }
    },
    importFieldsSettings: defaultImportFieldsSettings,
    importLogicSettings: defaultImportLogicSettings,
    relationSections: defaultRelationSections,
};
