

import type { ReconciliationResult, ReconciliationSettings, FilterRule } from './reconciliation';
import type { ThemeConfig } from './themes';
import { COUNTRIES_DATA } from './countries-data';

export type Currency = "USD" | "IQD" | string;

export type Box = {
  id: string;
  name: string;
  openingBalanceUSD: number;
  openingBalanceIQD: number;
};

export type Debt = {
  id:string;
  clientId: string;
  clientName: string;
  amount: number;
  paidAmount: number;
  currency: Currency;
  dueDate: string;
  notes: string;
  status: PaymentStatus;
};

export type CompanyPaymentType = 'cash' | 'credit';

export type SegmentProfitType = 'fixed' | 'percentage';

export type SegmentServiceSetting = {
    type: SegmentProfitType;
    value: number; // Can be a fixed amount or a percentage
};

export type SegmentSettings = {
    tickets: SegmentServiceSetting;
    visas: SegmentServiceSetting;
    hotels: SegmentServiceSetting;
    groups: SegmentServiceSetting;
};

export type PartnerShareType = 'percentage' | 'fixed';

export type PartnerShareSetting = {
  type: PartnerShareType;
  value: number; // Percentage or fixed amount
};

export type ClientType = 'company' | 'individual';
export type RelationType = 'client' | 'supplier' | 'both';

export type CustomRelationField = {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'password';
  required: boolean;
  visible: boolean;
  deletable: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string;
  appliesTo?: ('individual' | 'company')[];
  aliases?: string[];
  dataType?: 'string' | 'number';
};

export type RelationSection = {
  id: string;
  title: string;
  description?: string;
  deletable: boolean;
  fields: CustomRelationField[];
};


export type Client = {
  id: string;
  name: string;
  type: ClientType;
  relationType: RelationType;
  phone: string;
  email?: string;
  password?: string;
  loginIdentifier?: string;
  otpLoginEnabled?: boolean;
  country?: string;
  province?: string;
  streetAddress?: string;
  details?: string;
  avatarUrl?: string;
  createdAt: string;
  createdBy: string;
  paymentType?: CompanyPaymentType;
  status?: 'active' | 'inactive';
  code?: string; // For companyId from companies collection
  balance?: { USD: number; IQD: number };
  lastTransaction?: string | null;
  segmentSettings?: SegmentSettings;
  partnerShareSettings?: PartnerShareSetting;
  useCount?: number;
  [key: string]: any; // Allow custom fields
};


export type Company = Client; // Company is just a Client with type 'company'
export type Supplier = Client; // Supplier is now also based on the Client type with a different relationType


export type PaymentType = 'debt_payment' | 'payment_voucher' | 'receipt_voucher' | 'journal_voucher' | 'expense_voucher';

export type Payment = {
  id: string;
  debtId?: string;
  subscriptionInstallmentId?: string;
  amount: number;
  currency: Currency;
  date: string;
  clientName?: string;
  payeeId?: string; // For suppliers or others
  payeeName?: string;
  boxId?: string;
  type: PaymentType;
  description?: string;
  fromAccountId?: string; // For journal entries
  toAccountId?: string;   // For journal entries
  clientId?: string;
  remittanceId?: string;
  journalVoucherId?: string;
  paidBy?: string;
  notes?: string;
  discount?: number;
};


export type AttendanceLog = {
    month: string; // e.g., '2024-05'
    actualWorkDays: number;
    officialWorkDays: number;
    absences: number;
    vacations: number;
    overtimeHours: number;
    deductions: number;
};


export type User = {
    uid: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    password?: string;
    avatarUrl?: string;
    status: 'pending' | 'active' | 'rejected' | 'blocked';
    requestedAt: string; // ISO String
    lastLogin?: string; // ISO String
    role: string; // This will now be Role ID
    department?: string;
    position?: string;
    boxId?: string;
    otpLoginEnabled?: boolean;
    // HR Fields
    baseSalary?: number;
    bonuses?: number;
    deductions?: number;
    notes?: string;
    hrDataLastUpdated?: string;
    ticketProfit?: number;
    visaProfit?: number;
    groupProfit?: number;
    changeProfit?: number;
    segmentProfit?: number;
    attendance?: AttendanceLog[];
    permissions?: string[];
    preferences?: {
      dialogSettings?: {
        bookingDialog?: {
          step1: { width: string, height: string },
          step2: { width: string, height: string },
        }
      }
    }
};

export type Role = {
    id: string;
    name: string;
    description: string;
    permissions: string[];
};

export type Mastercard = {
    id: string;
    name: string;
    currency: Currency;
};

export type MastercardTransaction = {
  id: string;
  cardId: string;
  date: string;
  type: 'funding' | 'payment' | 'fee';
  description: string;
  amount: number; // positive for funding, negative for payment/fee
  employeeId?: string;
  employeeName?: string;
  receiptNumber?: string;
  currency: Currency;
};

export type WhatsappAccount = {
    id: string;
    name: string;
    provider: 'ultramsg' | 'green-api';
    idInstance: string;
    apiTokenInstance: string;
    isDefault: boolean;
}

export type WhatsappAccountStatus = {
    status: 'connected' | 'got qr code' | 'error' | string;
    message?: string;
    qrCode?: string;
    id?: string;
    name?: string;
    profile_picture?: string;
    is_md?: boolean;
    is_business?: boolean;
    is_enterprise?: boolean;
    battery?: string;
    battery_charging?: boolean;
    wa_version?: string;
    device?: {
        os_version?: string;
        platform?: string;
        manufacturer?: string;
        model?: string;
    };
    urlAvatar?: string;
}

export type WhatsappAccountWithStatus = WhatsappAccount & {
    status: WhatsappAccountStatus;
}


export type WhatsappContact = {
    id: string;
    name: string;
};

export type WhatsappGroup = {
    id: string;
    name: string;
    participantsCount: number;
    iAmAdmin: boolean;
};

export type WhatsappGroupParticipant = {
    id: string;
    name?: string;
};

export type AccountType = 'group' | 'box' | 'client' | 'supplier' | 'expense' | 'revenue' | 'account' | 'subscription' | 'company' | 'individual' | 'both' | 'exchange' | '';

export type StructuredDescription = {
    title: string;
    totalReceived: string | null;
    selfReceipt: string | null;
    distributions: { name: string; amount: string }[];
    notes: string;
};

export type ReportTransaction = {
  id: string;
  invoiceNumber: string;
  date: string;
  description: string | StructuredDescription;
  type: string;
  debit: number;
  credit: number;
  balance: number;
  currency: Currency;
  otherParty?: string;
  officer?: string;
};

export type ReportInfo = {
  title: string;
  transactions: ReportTransaction[];
  openingBalanceUSD: number;
  openingBalanceIQD: number;
  totalDebitUSD: number;
  totalCreditUSD: number;
  finalBalanceUSD: number;
  totalDebitIQD: number;
  totalCreditIQD: number;
  finalBalanceIQD: number;
  currency: Currency | 'both';
  accountType: AccountType;
  balanceMode: 'asset' | 'liability';
};


export interface TreeNode {
    id: string;
    name: string;
    code: string;
    type: AccountType;
    parentId: string | null;
    children: TreeNode[];
    debit: number;
    credit: number;
    currency?: Currency; // For leaf nodes that have a specific currency
}

// Updated SegmentEntry
export type SegmentEntry = {
  id: string;
  fromDate: string;
  toDate: string;
  companyName: string;
  clientId: string;
  partnerId: string;
  partnerName: string;
  
  // Counts of items
  tickets: number;
  visas: number;
  hotels: number;
  groups: number;

  // Sale amounts (only for percentage calculation)
  ticketsSaleAmount?: number;
  visasSaleAmount?: number;
  hotelsSaleAmount?: number;
  groupsSaleAmount?: number;

  // Calculated profits
  ticketProfits: number;
  otherProfits: number; // visa + hotel + group
  total: number;
  alrawdatainShare: number;
  partnerShare: number;

  // The settings used for this calculation
  clientSettingsUsed: SegmentSettings;
  partnerSettingsUsed: PartnerShareSetting;
};

export type RemittanceDistributionColumn = {
  id: string; 
  label: string; 
};

export type RemittanceSettings = {
  offices: string[];
  methods: string[];
  distributionColumnsUsd: RemittanceDistributionColumn[];
  distributionColumnsIqd: RemittanceDistributionColumn[];
  headerColorUsd: string;
  headerColorIqd: string;
};

export type VoucherTableColumn = {
  id: string;
  label: string;
  visible: boolean;
  order?: number;
};

export type VoucherListSettings = {
  columns: VoucherTableColumn[];
  detailsMode: 'inline' | 'tooltip' | 'none';
};

export const defaultVoucherListSettings: VoucherListSettings = {
  columns: [
    { id: 'invoiceNumber', label: 'رقم الفاتورة', visible: true, order: 2 },
    { id: 'date', label: 'التاريخ', visible: true, order: 1 },
    { id: 'voucherType', label: 'نوع السند', visible: true, order: 3 },
    { id: 'companyName', label: 'الطرف المقابل', visible: true, order: 4 },
    { id: 'boxName', label: 'الصندوق', visible: false, order: 5 },
    { id: 'debit', label: 'مدين', visible: true, order: 6 },
    { id: 'credit', label: 'دائن', visible: true, order: 7 },
    { id: 'details', label: 'البيان', visible: true, order: 8 },
    { id: 'officer', label: 'الموظف', visible: true, order: 9 },
    { id: 'actions', label: 'الإجراءات', visible: true, order: 100 },
  ],
  detailsMode: 'inline',
};


type DistributedVoucherDistributionChannel = {
  id: string;
  label: string;
  accountId: string;
};

export type DistributedVoucherSettings = {
  mainCompanyAccountId: string;
  distributionChannels?: DistributedVoucherDistributionChannel[];
  dialogWidth?: string;
  dialogHeight?: string;
};


export type VoucherTypeSettings = {
  autoNumbering: boolean;
  prefix: string;
  allowManualEntry: boolean;
  defaultCurrency: Currency;
  useDialogMode: boolean;
  allowedBoxes: string[];
};

export type CurrencySetting = {
    code: string;
    name: string;
    symbol: string;
};

export type CurrencySettings = {
    defaultCurrency: string;
    exchangeRates: { [key: string]: number };
    currencies: CurrencySetting[];
};

export type SubscriptionSettings = {
  defaultSupplier?: string;
  defaultInstallments?: number;
  defaultProfitMargin?: number;
  defaultQuantity?: number;
  firstInstallmentAfterDays?: number;
  autoActivate?: boolean;
  installmentMethod?: 'automatic' | 'manual';
  maxInstallments?: number;
  minInstallmentAmount?: number;
  reminderDaysBefore?: number;
  reminderFrequency?: 'daily' | 'weekly';
  alertAdminOnDelay?: number;
  revenueAccountId?: string;
  costAccountId?: string;
  autoCreateJournalEntry?: boolean;
  allowEditingAfterPayment?: boolean;
};


export type VoucherSettings = {
  receiptInvoiceCounter: number;
  paymentInvoiceCounter: number;
  receiptTableColumns: VoucherTableColumn[];
  paymentTableColumns: VoucherTableColumn[];
  distributed?: DistributedVoucherSettings;
  standard?: VoucherTypeSettings;
  expenseAccounts?: { id: string; name: string }[];
  subscriptionSettings?: SubscriptionSettings;
};

export type InvoiceSequenceSettings = {
    ticketBookingCounter: number;
    visaBookingCounter: number;
    groupBookingCounter: number;
};

export type CreditPolicySettings = {
    defaultCreditLimit: number;
    defaultGracePeriodDays: number;
};

export type RequiredFieldsSettings = {
    client: string[];
    supplier: string[];
};

export type DatabaseStatusSettings = {
    isDatabaseConnected: boolean;
};

export type ImportFieldSettings = {
    [key: string]: {
        label: string;
        aliases: string[];
    };
};

export type ImportLogicSettings = {
    creditKeywords: string[];
    cashKeywords: string[];
};

// Landing Page Specific Types
export type LandingPageFeature = {
    title: string;
    description: string;
    imageUrl: string;
};

export type LandingPageFaqItem = {
    question: string;
    answer: string;
};

export type LandingPagePartner = {
    name: string;
    logoUrl: string;
};

export type LandingPageSettings = {
    heroTitle: string;
    heroSubtitle: string;
    heroSubtitleColor: string;
    heroTitleColor?: string;
    heroFontFamily?: string;
    smartTickets: LandingPageFeature;
    sourceAuditing: LandingPageFeature;
    financialManagement: LandingPageFeature;
    servicesSection: { title: string; description: string };
    partnersSection: { title: string; description: string; partners: LandingPagePartner[] };
    faqSection: { title: string; description: string; faqs: LandingPageFaqItem[] };
    accountStatements: { title: string; description: string; imageUrl: string };
    financialAnalysis: { title: string; description: string; imageUrl: string };
    footerImageUrl: string;
};

export type GeneralThemeSettings = {
  appName?: string;
  appDescription?: string;
}

export type SidebarThemeSettings = {
    logoUrl?: string;
    landingImageUrl?: string;
    clientImageUrl?: string;
    supplierImageUrl?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    accentTextColor?: string;
    hoverBackgroundColor?: string;
    hoverTextColor?: string;
    activeItemBorderRadius?: number;
    activeItemShadow?: string;
    hoverItemBorderRadius?: number;
    hoverItemShadow?: string;
};

export type CardThemeSettings = {
  headerColor?: string;
  headerHeight: number;
  titleFontSize: number;
  bodyFontSize: number;
  footerColor: string;
  footerHeight: number;
  borderRadius: number;
  imageSize: number;
  headerClientColorFrom?: string;
  headerClientColorTo?: string;
  headerSupplierColorFrom?: string;
  headerSupplierColorTo?: string;
  headerBothColorFrom?: string;
  headerBothColorTo?: string;
};

export type InvoiceThemeSettings = {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyWeb?: string;
    logoUrl?: string;
    headerColor?: string;
    titleColor?: string;
    footerText?: string;
};

export type ThemeCustomizationSettings = ThemeConfig & {
  activeThemeId?: string;
  general?: GeneralThemeSettings;
  sidebar?: Partial<SidebarThemeSettings>;
  card?: Partial<CardThemeSettings>;
  invoice?: Partial<InvoiceThemeSettings>;
  landingPage?: Partial<LandingPageSettings>;
  assets?: {
      [key: string]: string | null;
  };
}


export type AppSettings = {
    currencySettings?: CurrencySettings;
    exchangeRateTemplate?: string;
    remittanceSettings: RemittanceSettings;
    voucherSettings?: VoucherSettings;
    invoiceSequenceSettings?: InvoiceSequenceSettings;
    creditPolicySettings?: CreditPolicySettings;
    databaseStatus?: DatabaseStatusSettings;
    theme?: ThemeCustomizationSettings;
    subscriptionSettings?: SubscriptionSettings;
    importFieldsSettings?: ImportFieldSettings;
    importLogicSettings?: ImportLogicSettings;
    relationSections?: RelationSection[];
};

export type ExchangeRateLog = {
  id: string;
  rate: number;
  changedAt: string; // ISO string
};

export type AuditLogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT' | 'BLOCK' | 'UNBLOCK';
export type AuditLogTargetType = 'CLIENT' | 'SUPPLIER' | 'USER' | 'BOOKING' | 'VOUCHER' | 'SUBSCRIPTION' | 'SETTINGS' | 'RECONCILIATION' | 'MASTERCARD' | 'MASTERCARD_TRANSACTION' | 'SEGMENT';

export type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  level: 'info' | 'warning' | 'error';
  action: AuditLogAction;
  targetType: AuditLogTargetType;
  description: string;
  createdAt: string; // ISO string
  targetId?: string;
};

export type SubscriptionInstallment = {
    id: string;
    subscriptionId: string;
    clientName: string;
    serviceName: string;
    amount: number;
    currency: Currency;
    dueDate: string;
    status: 'Paid' | 'Unpaid';
    paidAt?: string;
    paymentId?: string;
    paidAmount?: number;
    discount?: number;
};

export type SubscriptionStatus = 'Active' | 'Paid' | 'Cancelled' | 'Suspended';

export type Subscription = {
    id: string;
    invoiceNumber: string;
    supplierId: string;
    supplierName: string;
    serviceName: string;
    purchaseDate: string;
    purchasePrice: number;
    clientId: string;
    clientName: string;
    client?: Client;
    salePrice: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
    startDate: string;
    numberOfInstallments: number;
    currency: Currency;
    notes: string;
    profit: number;
    paidAmount: number;
    status: SubscriptionStatus;
    cancellationDate?: string | null;
    cancellationReason?: string | null;
    boxId?: string;
    updatedAt?: string;
    isDeleted?: boolean;
    deletedAt?: string;
};

export type ReconciliationLog = {
    id: string;
    runAt: string;
    userId: string;
    userName: string;
    settings: ReconciliationSettings;
    filters: FilterRule[];
    currency: Currency;
    summary: ReconciliationResult['summary'];
};

export type SiteAsset = {
  id: string; 
  name: string; // Display name
  url: string; // Download URL
  fileName: string; // Original file name
  fileType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  assignment: string | null;
  fullPath: string;
};

export type TicketType = 'Issue' | 'Change' | 'Refund' | 'Void';

export type Passenger = {
    id: string;
    name: string;
    passportNumber: string;
    ticketNumber: string;
    purchasePrice: number;
    salePrice: number;
    passengerType: 'Adult' | 'Child' | 'Infant';
    ticketType: TicketType;
    currency: Currency;
};

export type BookingEntry = {
    id: string;
    pnr: string;
    invoiceNumber: string;
    passengers: Passenger[];
    supplierId: string;
    clientId: string;
    route: string;
    currency: Currency;
    travelDate: string;
    issueDate: string;
    notes: string;
    boxId: string;
    isEntered: boolean;
    isAudited: boolean;
    status?: 'Issued' | 'Refunded' | 'Exchanged' | 'Voided';
    enteredBy?: string;
    enteredAt?: string;
    auditedBy?: string;
    auditedAt?: string;
    isDeleted?: boolean;
    deletedAt?: string;
    updatedAt?: string;
};

export type VisaPassenger = {
    id: string;
    name: string;
    passportNumber: string;
    applicationNumber: string;
    visaType: string;
    bk?: string;
    purchasePrice: number;
    salePrice: number;
};

export type VisaBookingEntry = {
    id: string;
    invoiceNumber: string;
    passengers: VisaPassenger[];
    supplierId: string;
    clientId: string;
    submissionDate: string;
    notes: string;
    boxId: string;
    currency: Currency;
    isEntered: boolean;
    isAudited: boolean;
    enteredBy?: string;
    enteredAt?: string;
    auditedBy?: string;
    auditedAt?: string;
    isDeleted?: boolean;
    deletedAt?: string;
    updatedAt?: string;
};


export type RemittanceStatus = 'pending_audit' | 'pending_reception' | 'received';

export type Remittance = {
    id: string;
    companyName: string;
    officeName: string;
    method: string;
    totalAmountUsd: number;
    totalAmountIqd: number;
    
    distribution: { [key: string]: number };

    boxId: string;
    createdBy: string; // User name
    assignedToUid: string; // User ID
    status: RemittanceStatus;
    createdAt: string; // ISO String
    isAudited: boolean;
    auditedBy?: string;
    auditedAt?: string;
    auditNotes?: string;
    receivedBy?: string; // User name
    receivedAt?: string; // ISO String
    notes?: string;
    proofUrl?: string;
};

export type HealthCheckResult = {
  service: 'Firebase' | 'Google Drive';
  success: boolean;
  message: string;
};


export type DebtsReportEntry = {
  id: string;
  name: string;
  phone: string;
  accountType: 'client' | 'supplier' | 'both';
  balanceUSD: number;
  balanceIQD: number;
  lastTransaction: string | null;
};

export type DebtsReportData = {
  entries: DebtsReportEntry[];
  summary: {
    totalDebitUSD: number;
    totalCreditUSD: number;
    balanceUSD: number;
    totalDebitIQD: number;
    totalCreditIQD: number;
    balanceIQD: number;
  };
};

// This is a Zod-like declaration, it can't be imported directly.
// This is a placeholder for the schema type.
export type DistributedReceiptInput = any;

export type JournalEntry = {
    accountId: string;
    amount: number;
    description: string;
}

export type JournalVoucher = {
    id: string;
    invoiceNumber: string;
    date: string; // ISO string
    currency: Currency;
    exchangeRate: number | null;
    notes: string;
    createdBy: string;
    officer: string;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    voucherType: string;
    voucherTypeLabel?: string;
    debitEntries: JournalEntry[];
    creditEntries: JournalEntry[];
    isAudited: boolean;
    isConfirmed: boolean;
    originalData?: any; // To store original form data if needed for display
};

export type ReceiptVoucher = JournalVoucher; // Now a JournalVoucher
export type PaymentVoucher = JournalVoucher; // Now a JournalVoucher
export type ExpenseVoucher = JournalVoucher; // Now a JournalVoucher


export type FlyChangeEntry = {
  id: string;
  invoiceNumber: string;
  pnr: string;
  supplierId: string;
  beneficiaryId: string;
  purchasePrice: number;
  salePrice: number;
  issueDate: string;
  notes: string;
  isEntered: boolean;
  isAudited: boolean;
};

export type BaggagePurchaseEntry = {
  id: string;
  invoiceNumber: string;
  pnr: string;
  supplierId: string;
  beneficiaryId: string;
  purchasePrice: number;
  salePrice: number;
  issueDate: string;
  notes: string;
  isEntered: boolean;
  isAudited: boolean;
};

export type CompanyGroup = {
  id: string;
  name: string;
  type: 'client' | 'supplier' | 'both';
  color: string;
  description?: string;
};

export type WorkType = {
    id: string;
    name: string;
    appliesTo: ('client' | 'supplier')[];
};

export type VoucherSequence = {
  id: string; // This will be the prefix ID, e.g., 'RC', 'PV'
  label: string; // e.g., 'سند قبض'
  prefix: string; // e.g., 'RC'
  value: number; // The current sequence number
};

export type NotificationType = 'booking' | 'payment' | 'voucher' | 'remittance' | 'system' | 'user' | 'error' | 'warning';

export type Notification = {
    id: string;
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    link?: string;
    isRead: boolean;
    createdAt: string; // ISO String
};


export const defaultVoucherTypeSettings = {
  autoNumbering: true,
  prefix: "VCHR-",
  allowManualEntry: false,
  defaultCurrency: "USD" as Currency,
  useDialogMode: true,
  allowedBoxes: [] as string[],
};



export interface InvoiceReportItem {
  id: string;
  createDate: string;
  user: string;
  note: string;
  pnr: string;
  date: string;
  credit: number;
  debit: number;
  balance: number;
  details: string;
  type: string;
}

export interface ReportSettings {
    display: {
        sortBy: 'invoiceDate' | 'saveDate';
        showCreationDate: boolean;
        showPassport: boolean;
        showPassenger: boolean;
        showVisaType: boolean;
        showRoute: boolean;
        showAccountInPrint: boolean;
        showVL: boolean;
        showFare: boolean;
        fields: { id: string; label: string; visible: boolean }[];
    };
    print: {
        showSalePrice: boolean;
        showPurchasePrice: boolean;
        sequenceField: 'list' | 'general' | 'voucher';
        convertToCurrency: 'USD' | 'IQD' | null;
    };
    dimensions: {
        width: string;
        height: string;
    };
}


export const defaultReportSettings: ReportSettings = {
    display: {
        sortBy: 'invoiceDate',
        showCreationDate: true,
        showPassport: true,
        showPassenger: true,
        showVisaType: true,
        showRoute: true,
        showAccountInPrint: true,
        showVL: false,
        showFare: false,
        fields: [
            { id: "createDate", label: "تاريخ الإنشاء", visible: true },
            { id: "user", label: "المستخدم", visible: true },
            { id: "note", label: "ملاحظة", visible: true },
            { id: "pnr", label: "PNR", visible: true },
            { id: "date", label: "التاريخ", visible: true },
            { id: "credit", label: "دائن", visible: true },
            { id: "debit", label: "مدين", visible: true },
            { id: "details", label: "التفاصيل", visible: true },
            { id: "type", label: "النوع", visible: true },
        ]
    },
    print: {
        showSalePrice: true,
        showPurchasePrice: false,
        sequenceField: 'list',
        convertToCurrency: null
    },
    dimensions: {
        width: '95vw',
        height: '95vh'
    },
};

export type PaymentStatus = "Paid" | "Unpaid" | "Partially Paid" | "Overdue";

export type OperationType = "REFUND" | "REISSUE" | "REVALIDATION" | "VOID";

export interface TicketQuoteBreakdown {
  base: number;
  tax: number;
  penalty: number;
  fees: number;
  adc: number;
  residualEmd: number;
}


export type TicketOperationType = 'Refund' | 'Exchange' | 'Void' | 'Revalidate';

export type TicketOperation = {
    id: string;
    bookingId: string;
    passengerTicketNumber: string;
    type: TicketOperationType;
    airlineFee: number;
    officeFee: number;
    priceDifference: number; // For exchanges
    notes?: string;
    createdAt: string;
    createdBy: string;
};
    

export type ClientTransactionSummary = {
    totalSales: number;
    paidAmount: number;
    dueAmount: number;
    totalProfit: number;
    currency: Currency;
    transactions: ReportTransaction[];
}

export type DataAuditIssue = {
  id: string;
  type: 'DUPLICATE_PNR' | 'NEGATIVE_PROFIT' | 'ZERO_PRICE' | 'COMMISSION_ERROR' | 'INVOICE_ERROR' | 'SAVE_ERROR' | 'COST_MISMATCH' | 'UNMATCHED_RETURN' | 'DUPLICATE_FILE';
  pnr?: string;
  description: string;
  link: string;
  details?: any;
};

export type MessageTemplate = {
  id: string;
  name: string;
  content: string;
};

export interface MonthlyProfit {
  id: string; // Format: "YYYY-MM"
  totalProfit: number;
  createdAt: string; // ISO string
  fromSystem: boolean;
  notes?: string;
  currency?: Currency;
  partners?: ProfitShare[]; // For manual entries
}

export interface ProfitShare {
  id: string;
  profitMonthId: string;
  partnerId: string;
  partnerName: string;
  percentage: number;
  amount: number;
  notes?: string;
}

export type ExtractedPassenger = {
    bookingReference: string;
    pnrClass: string;
    name: string;
    payable: number;
    route: string;
    flightDate: string;
    flightTime: string;
    gender: string;
    passportNumber?: string;
    passengerType?: 'Adult' | 'Child' | 'Infant';
    firstName: string;
    lastName: string;
    tripType?: 'DEPARTURE' | 'RETURN' | 'SINGLE' | 'ROUND_TRIP';
    actualPrice?: number;
    departureDate?: string;
};

export type PnrGroup = {
    pnr: string;
    bookingReference: string;
    paxCount: number;
    totalPayable: number;
    passengers: ExtractedPassenger[];
};

export type TripTypeCounts = {
    oneWay: number;
    roundTrip: number;
};

export type ManualDiscount = {
    type: 'fixed' | 'per_passenger';
    value?: number;
    perAdult?: number;
    perChild?: number;
    perInfant?: number;
};

export type FlightReport = {
    id: string;
    fileName: string;
    flightDate: string;
    flightTime: string;
    route: string;
    supplierName: string;
    paxCount: number;
    totalRevenue: number;
    filteredRevenue: number;
    totalDiscount: number;
    manualDiscount?: ManualDiscount;
    manualDiscountValue?: number;
    manualDiscountNotes?: string;
    passengers: ExtractedPassenger[];
    payDistribution: { amount: number; count: number; subtotal: number; }[];
    tripTypeCounts: TripTypeCounts;
    pnrGroups: PnrGroup[];
    issues?: {
        tripAnalysis: DataAuditIssue[];
        duplicatePnr: DataAuditIssue[];
        fileAnalysis: DataAuditIssue[];
        dataIntegrity: DataAuditIssue[];
    };
    isSelectedForReconciliation?: boolean;
};

export type FlightReportWithId = FlightReport & { id: string };

export type Exchange = {
    id: string;
    name: string;
    currencyDefault: Currency;
    createdAt: string;
    thresholdAlertUSD: number;
};

export type ExchangeTransaction = {
    id: string;
    exchangeId: string;
    batchId: string;
    partyName: string;
    type: 'debt' | 'credit';
    originalCurrency: Currency;
    originalAmount: number;
    rate: number;
    amountInUSD: number;
    date: string; // YYYY-MM-DD
    createdAt: string; // ISO Timestamp
    createdBy: string; // UID
    userName: string;
    remainingUSD: number;
    status: 'open' | 'partially_paid' | 'paid' | 'adjusted';
    note?: string;
    linkedPaymentIds?: string[]; // Array of payment IDs
    audit?: { action: string; by: string; at: string; reason?: string }[];
};

export type ExchangePayment = {
    id: string;
    exchangeId: string;
    batchId: string;
    paidTo: string;
    type: 'payment' | 'receipt';
    intermediary?: string;
    originalCurrency: Currency;
    originalAmount: number;
    rate: number;
    amountInUSD: number;
    date: string; // YYYY-MM-DD
    createdAt: string; // ISO Timestamp
    createdBy: string; // UID
    userName: string;
    appliedTxns?: { txnId: string; appliedUSD: number }[];
    note?: string;
    audit?: { action: string; by: string; at: string; reason?: string }[];
};

export type UnifiedLedgerEntry = {
    id: string;
    invoiceNumber?: string;
    exchangeId: string;
    createdAt: string;
    date: string;
    userName: string;
    entryType: 'transaction' | 'payment';
    description: string;
    totalAmount?: number;
    balance?: number;
    isConfirmed?: boolean;
    details: (ExchangeTransaction | ExchangePayment)[];
};

export type Airport = {
    code: string;
    name: string;
    city: string;
    country: string;
    arabicName: string;
    arabicCountry: string;
    useCount?: number;
};

export type FirebaseConfig = {
    id?: string;
    projectId: string;
    apiKey: string;
    appId: string;
    authDomain: string;
    storageBucket: string;
    messagingSenderId: string;
    measurementId?: string;
    isActive: boolean;
};

    