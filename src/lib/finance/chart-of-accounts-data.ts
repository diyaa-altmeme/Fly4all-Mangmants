/**
 * @fileoverview Source of truth for the initial Chart of Accounts structure.
 * This data is used by a seeding script to populate the 'chart_of_accounts' collection in Firestore.
 * It establishes a standard, hierarchical accounting structure tailored for the business.
 *
 * To seed the database, run: `npm run seed:accounts`
 */

// Define the structure for a seed account entry.
// We use `parentCode` here for easier definition and resolve it to `parentId` in the seeding script.
export interface ChartAccountSeed {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentCode: string | null;
  isLeaf: boolean; // Can transactions be posted directly to this account?
  description: string;
}

// The complete, hierarchical chart of accounts data.
export const chartOfAccountsData: ChartAccountSeed[] = [
  // 1. الأصول (Assets)
  { code: "1", name: "الأصول", type: "asset", parentCode: null, isLeaf: false, description: "جميع الموارد الاقتصادية التي تملكها الشركة." },
  { code: "1-1", name: "الأصول المتداولة", type: "asset", parentCode: "1", isLeaf: false, description: "الأصول التي يُتوقع تحويلها إلى نقد خلال عام." },
  { code: "1-1-1", name: "الصناديق والبنوك", type: "asset", parentCode: "1-1", isLeaf: true, description: "النقدية وما في حكمها." },
  { code: "1-1-2", name: "الذمم المدينة", type: "asset", parentCode: "1-1", isLeaf: true, description: "الأموال المستحقة على الآخرين." },
  { code: "1-1-3", name: "حسابات تسوية", type: "asset", parentCode: "1-1", isLeaf: true, description: "حسابات وسيطة للمعاملات المعلقة." },
  { code: "1-2", name: "الأصول الثابتة", type: "asset", parentCode: "1", isLeaf: false, description: "الأصول طويلة الأجل مثل الممتلكات والمعدات." },

  // 2. الالتزامات (Liabilities)
  { code: "2", name: "الالتزامات", type: "liability", parentCode: null, isLeaf: false, description: "الديون والالتزامات المالية على الشركة." },
  { code: "2-1", name: "الالتزامات المتداولة", type: "liability", parentCode: "2", isLeaf: false, description: "الالتزامات التي يجب سدادها خلال عام." },
  { code: "2-1-1", name: "الذمم الدائنة", type: "liability", parentCode: "2-1", isLeaf: true, description: "الأموال المستحقة للآخرين." },
  
  // 3. حقوق الملكية (Equity)
  { code: "3", name: "حقوق الملكية", type: "equity", parentCode: null, isLeaf: false, description: "صافي قيمة الشركة (الأصول - الالتزامات)." },
  { code: "3-1", name: "رأس المال", type: "equity", parentCode: "3", isLeaf: true, description: "رأس المال المستثمر." },
  { code: "3-2", name: "الأرباح المرحلة", type: "equity", parentCode: "3", isLeaf: true, description: "الأرباح المحتجزة من فترات سابقة." },
  { code: "3-3", name: "ملخص الدخل (حساب إغلاق)", type: "equity", parentCode: "3", isLeaf: true, description: "حساب وسيط لإغلاق الإيرادات والمصروفات." },

  // 4. الإيرادات (Revenue)
  { code: "4", name: "الإيرادات", type: "revenue", parentCode: null, isLeaf: false, description: "الدخل الناتج عن أنشطة الشركة." },
  { code: "4-1", name: "إيرادات النشاط الرئيسي", type: "revenue", parentCode: "4", isLeaf: false, description: "الإيرادات من العمليات الأساسية." },
  { code: "4-1-1", name: "إيرادات تذاكر الطيران", type: "revenue", parentCode: "4-1", isLeaf: true, description: "الإيرادات من مبيعات تذاكر الطيران." },
  { code: "4-1-2", name: "إيرادات الفيزا", type: "revenue", parentCode: "4-1", isLeaf: true, description: "الإيرادات من خدمات الفيزا." },
  { code: "4-1-3", name: "إيرادات الاشتراكات", type: "revenue", parentCode: "4-1", isLeaf: true, description: "الإيرادات من الاشتراكات الدورية." },
  { code: "4-1-4", name: "إيرادات السكمنت", type: "revenue", parentCode: "4-1", isLeaf: true, description: "الإيرادات من عمليات السكمنت." },
  { code: "4-2", name: "إيرادات أخرى", type: "revenue", parentCode: "4", isLeaf: false, description: "الإيرادات من مصادر غير تشغيلية." },
  { code: "4-2-1", name: "إيرادات توزيع الأرباح", type: "revenue", parentCode: "4-2", isLeaf: true, description: "حصة الشركة من توزيعات الأرباح اليدوية." },
  { code: "4-2-2", name: "إيرادات رسوم الاسترجاع والتغيير", type: "revenue", parentCode: "4-2", isLeaf: true, description: "الإيرادات من رسوم الخدمات الإضافية." },

  // 5. المصروفات (Expenses)
  { code: "5", name: "المصروفات", type: "expense", parentCode: null, isLeaf: false, description: "التكاليف والنفقات التي تتكبدها الشركة." },
  { code: "5-1", name: "تكاليف النشاط الرئيسي", type: "expense", parentCode: "5", isLeaf: false, description: "تكاليف مرتبطة مباشرة بالإيرادات." },
  { code: "5-1-1", name: "تكلفة تذاكر الطيران", type: "expense", parentCode: "5-1", isLeaf: true, description: "سعر شراء التذاكر من الموردين." },
  { code: "5-1-2", name: "تكلفة الفيزا", type: "expense", parentCode: "5-1", isLeaf: true, description: "تكلفة استخراج الفيزا من الموردين." },
  { code: "5-1-3", name: "تكلفة الاشتراكات", type: "expense", parentCode: "5-1", isLeaf: true, description: "تكلفة شراء الخدمات للاشتراكات." },
  { code: "5-2", name: "المصروفات التشغيلية", type: "expense", parentCode: "5", isLeaf: false, description: "المصاريف اللازمة لتشغيل الشركة." },
  { code: "5-2-1", name: "مصروفات الرواتب والأجور", type: "expense", parentCode: "5-2", isLeaf: true, description: "رواتب الموظفين." },
  { code: "5-2-2", name: "مصروفات الإيجار", type: "expense", parentCode: "5-2", isLeaf: true, description: "تكاليف إيجار المكتب." },
  { code: "5-2-3", name: "مصروفات فواتير وخدمات", type: "expense", parentCode: "5-2", isLeaf: true, description: "فواتير كهرباء، ماء، إنترنت." },
  { code: "5-2-4", name: "مصروفات التسويق والإعلان", type: "expense", parentCode: "5-2", isLeaf: true, description: "تكاليف الحملات الإعلانية." },
];
