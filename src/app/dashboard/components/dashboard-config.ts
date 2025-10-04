
import {
    LayoutDashboard,
    PlusCircle,
    Ticket,
    CreditCard,
    Repeat,
    ArrowRightLeft,
    Layers3,
    Package,
    FileText,
    Wallet,
    Boxes,
    BarChart3,
    Share2,
    Wand2,
    AreaChart,
    Users,
    Briefcase,
    MessageSquare,
    Settings,
    ListChecks,
    Plane,
} from 'lucide-react';

import AddBookingDialog from '@/app/bookings/components/add-booking-dialog';
import AddVisaDialog from '@/app/visas/components/add-visa-dialog';
import AddSubscriptionDialog from '@/app/subscriptions/components/add-subscription-dialog';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import UserFormDialog from '@/app/users/components/user-form-dialog';
import AddEditBoxDialog from '@/app/boxes/components/add-edit-box-dialog';
import NewStandardReceiptDialog from "@/app/accounts/vouchers/components/new-standard-receipt-dialog";
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/components/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/components/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";

export type DashboardItem = {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    href?: string;
    dialog?: React.ElementType;
    isVisible: boolean;
};

export type DashboardSection = {
    id: string;
    title: string;
    icon?: React.ElementType;
    items: DashboardItem[];
};

export const defaultSections: DashboardSection[] = [
    {
        id: 'main_ops',
        title: 'العمليات الرئيسية',
        icon: LayoutDashboard,
        items: [
            { id: 'add_booking', title: 'إضافة حجز', description: 'تسجيل حجز طيران جديد.', icon: Ticket, dialog: AddBookingDialog, isVisible: true },
            { id: 'add_visa', title: 'إضافة فيزا', description: 'تسجيل طلب فيزا جديد.', icon: CreditCard, dialog: AddVisaDialog, isVisible: true },
            { id: 'add_subscription', title: 'إضافة اشتراك', description: 'تسجيل اشتراك دوري لعميل.', icon: Repeat, dialog: AddSubscriptionDialog, isVisible: true },
            { id: 'add_remittance', title: 'إضافة حوالة', description: 'تسجيل حوالة واردة.', icon: ArrowRightLeft, href: '/accounts/remittances', isVisible: true },
            { id: 'add_client', title: 'إضافة علاقة', description: 'إضافة عميل أو مورد جديد.', icon: Users, dialog: AddClientDialog, isVisible: true },
        ]
    },
    {
        id: 'vouchers',
        title: 'إنشاء السندات',
        icon: FileText,
        items: [
            { id: 'standard_receipt', title: 'سند قبض عادي', description: 'استلام دفعة نقدية.', icon: FileText, dialog: NewStandardReceiptDialog, isVisible: true },
            { id: 'distributed_receipt', title: 'سند قبض مخصص', description: 'توزيع دفعة مستلمة.', icon: FileText, dialog: NewDistributedReceiptDialog, isVisible: true },
            { id: 'payment_voucher', title: 'سند دفع', description: 'صرف مبلغ لجهة معينة.', icon: FileText, dialog: NewPaymentVoucherDialog, isVisible: true },
            { id: 'expense_voucher', title: 'سند مصاريف', description: 'تسجيل المصروفات اليومية.', icon: FileText, dialog: NewExpenseVoucherDialog, isVisible: true },
            { id: 'journal_voucher', title: 'قيد محاسبي', description: 'تسجيل قيد يدوي.', icon: FileText, dialog: NewJournalVoucherDialog, isVisible: true },
            { id: 'vouchers_list', title: 'عرض كل السندات', description: 'الانتقال لسجل السندات.', icon: ListChecks, href: '/accounts/vouchers/list', isVisible: true },
        ]
    },
    {
        id: 'reports',
        title: 'التقارير والأدوات',
        icon: BarChart3,
        items: [
            { id: 'account_statement', title: 'كشف حساب', description: 'عرض حركات حساب معين.', icon: Wallet, href: '/reports/account-statement', isVisible: true },
            { id: 'debts_report', title: 'تقرير الأرصدة', description: 'عرض ديون العملاء والموردين.', icon: Wallet, href: '/reports/debts', isVisible: true },
            { id: 'reconciliation', title: 'التدقيق الذكي', description: 'مطابقة الكشوفات آليًا.', icon: Wand2, href: '/reconciliation', isVisible: true },
            { id: 'advanced_reports', title: 'تقارير متقدمة', description: 'تقارير الأرباح والمبيعات.', icon: AreaChart, href: '/reports/advanced', isVisible: true },
            { id: 'profit_sharing', title: 'توزيع الأرباح', description: 'إدارة حصص الشركاء.', icon: Share2, href: '/profit-sharing', isVisible: true },
            { id: 'flight_analysis', title: 'تحليل بيانات الطيران', description: 'تحليل ملفات رحلات الطيران.', icon: Plane, href: '/reports/flight-analysis', isVisible: true },
        ]
    },
    {
        id: 'management',
        title: 'الإدارة والنظام',
        icon: Settings,
        items: [
            { id: 'users', title: 'المستخدمون', description: 'إدارة الموظفين وصلاحياتهم.', icon: Users, href: '/users', isVisible: true },
            { id: 'hr', title: 'الموارد البشرية', description: 'إدارة الرواتب والحوافز.', icon: Briefcase, href: '/hr', isVisible: true },
            { id: 'boxes', title: 'الصناديق', description: 'إدارة الصناديق المالية.', icon: Boxes, href: '/boxes', isVisible: true },
            { id: 'campaigns', title: 'الحملات الإعلانية', description: 'إدارة حملات واتساب.', icon: MessageSquare, href: '/campaigns', isVisible: true },
            { id: 'settings', title: 'الإعدادات العامة', description: 'التحكم بإعدادات النظام.', icon: Settings, href: '/settings', isVisible: true },
        ]
    }
];

    