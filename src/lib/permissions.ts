
import type { User, Client } from './types';

export const PERMISSIONS = {
    // Dashboard
    'dashboard:read': 'عرض لوحة التحكم',
    // Bookings
    'bookings:read': 'عرض الحجوزات',
    'bookings:create': 'إنشاء الحجوزات',
    'bookings:update': 'تعديل الحجوزات',
    'bookings:delete': 'حذف الحجوزات',
    'bookings:operations': 'إجراء عمليات (استرجاع، تغيير)',
    // Visas
    'visas:read': 'عرض طلبات الفيزا',
    'visas:create': 'إنشاء طلبات فيزا',
    'visas:update': 'تعديل طلبات الفيزا',
    'visas:delete': 'حذف طلبات الفيزا',
    // Subscriptions
    'subscriptions:read': 'عرض الاشتراكات',
    'subscriptions:create': 'إنشاء الاشتراكات',
    'subscriptions:update': 'تعديل الاشتراكات',
    'subscriptions:delete': 'حذف الاشتراكات',
    'subscriptions:payments': 'إدارة دفعات الأقساط',
    // Vouchers
    'vouchers:read': 'عرض السندات',
    'vouchers:create': 'إنشاء السندات',
    'vouchers:update': 'تعديل السندات',
    'vouchers:delete': 'حذف السندات',
    // Remittances
    'remittances:read': 'عرض الحوالات',
    'remittances:create': 'إنشاء الحوالات',
    'remittances:audit': 'تدقيق الحوالات',
    'remittances:receive': 'استلام الحوالات',
    // Segments
    'segments:read': 'عرض السكمنت',
    'segments:create': 'إنشاء سجلات سكمنت',
    'segments:update': 'تعديل سجلات سكمنت',
    'segments:delete': 'حذف سجلات سكمنت',
    // Relations (Clients/Suppliers)
    'relations:read': 'عرض العملاء والموردين',
    'relations:create': 'إنشاء العملاء والموردين',
    'relations:update': 'تعديل العملاء والموردين',
    'relations:delete': 'حذف العملاء والموردين',
    'relations:credentials': 'إدارة بيانات الدخول للعملاء',
    // Users
    'users:read': 'عرض المستخدمين والأدوار',
    'users:create': 'إنشاء المستخدمين والأدوار',
    'users:update': 'تعديل المستخدمين والأدوار',
    'users:delete': 'حذف المستخدمين والأدوار',
    'users:permissions': 'إدارة صلاحيات الأدوار',
    // HR
    'hr:read': 'عرض بيانات الموارد البشرية',
    'hr:update': 'تعديل بيانات الرواتب والأرباح',
    // Reports
    'reports:read:all': 'عرض جميع التقارير',
    'reports:account_statement': 'عرض كشف الحساب',
    'reports:debts': 'عرض تقرير الأرصدة',
    'reports:profits': 'عرض تقارير الأرباح',
    'reports:flight_analysis': 'عرض تحليل الرحلات',
    // Settings
    'settings:read': 'عرض الإعدادات',
    'settings:update': 'تعديل الإعدادات',
    // System
    'system:audit_log:read': 'عرض سجل النشاطات',
    'system:error_log:read': 'عرض سجل الأخطاء',
    'system:data_audit:run': 'تشغيل فحص البيانات',
};

export const PERMISSION_MODULES = [
    {
        id: 'dashboard', name: 'لوحة التحكم',
        permissions: [{ id: 'dashboard:read', name: 'عرض' }]
    },
    {
        id: 'bookings', name: 'حجوزات الطيران',
        permissions: [
            { id: 'bookings:read', name: 'عرض' }, { id: 'bookings:create', name: 'إنشاء' },
            { id: 'bookings:update', name: 'تعديل' }, { id: 'bookings:delete', name: 'حذف' },
            { id: 'bookings:operations', name: 'عمليات' },
        ]
    },
     {
        id: 'visas', name: 'طلبات الفيزا',
        permissions: [
            { id: 'visas:read', name: 'عرض' }, { id: 'visas:create', name: 'إنشاء' },
            { id: 'visas:update', name: 'تعديل' }, { id: 'visas:delete', name: 'حذف' },
        ]
    },
    {
        id: 'subscriptions', name: 'الاشتراكات',
        permissions: [
            { id: 'subscriptions:read', name: 'عرض' }, { id: 'subscriptions:create', name: 'إنشاء' },
            { id: 'subscriptions:update', name: 'تعديل' }, { id: 'subscriptions:delete', name: 'حذف' },
            { id: 'subscriptions:payments', name: 'دفع الأقساط' },
        ]
    },
    {
        id: 'vouchers', name: 'السندات والقيود',
        permissions: [
            { id: 'vouchers:read', name: 'عرض' }, { id: 'vouchers:create', name: 'إنشاء' },
            { id: 'vouchers:update', name: 'تعديل' }, { id: 'vouchers:delete', name: 'حذف' },
        ]
    },
    {
        id: 'remittances', name: 'الحوالات',
        permissions: [
            { id: 'remittances:read', name: 'عرض' }, { id: 'remittances:create', name: 'إنشاء' },
            { id: 'remittances:audit', name: 'تدقيق' }, { id: 'remittances:receive', name: 'استلام' },
        ]
    },
    {
        id: 'relations', name: 'العلاقات (العملاء والموردين)',
        permissions: [
            { id: 'relations:read', name: 'عرض' }, { id: 'relations:create', name: 'إنشاء' },
            { id: 'relations:update', name: 'تعديل' }, { id: 'relations:delete', name: 'حذف' },
            { id: 'relations:credentials', name: 'إدارة الدخول' },
        ]
    },
    {
        id: 'users', name: 'المستخدمون والأدوار',
        permissions: [
            { id: 'users:read', name: 'عرض' }, { id: 'users:create', name: 'إنشاء' },
            { id: 'users:update', name: 'تعديل' }, { id: 'users:delete', name: 'حذف' },
            { id: 'users:permissions', name: 'إدارة الصلاحيات' },
        ]
    },
    {
        id: 'reports', name: 'التقارير',
        permissions: [
            { id: 'reports:read:all', name: 'عرض الكل' },
            { id: 'reports:account_statement', name: 'كشف حساب' },
            { id: 'reports:debts', name: 'الأرصدة' },
            { id: 'reports:profits', name: 'الأرباح' },
            { id: 'reports:flight_analysis', name: 'تحليل الرحلات' },
        ]
    },
    {
        id: 'settings', name: 'الإعدادات العامة',
        permissions: [
            { id: 'settings:read', name: 'عرض' },
            { id: 'settings:update', name: 'تعديل' },
        ]
    },
     {
        id: 'system', name: 'أدوات النظام',
        permissions: [
            { id: 'system:audit_log:read', name: 'سجل النشاطات' },
            { id: 'system:error_log:read', name: 'سجل الأخطاء' },
            { id: 'system:data_audit:run', name: 'فحص البيانات' },
        ]
    }
];

// In a real app, this would be more complex and likely involve fetching role permissions
export const hasPermission = (user: (User & { permissions?: string[] }) | (Client & { permissions?: string[] }) | null, permission: keyof typeof PERMISSIONS): boolean => {
    if (!user) return false;
    
    // Admins have all permissions
    if ('role' in user && user.role === 'admin') return true;
    
    // For other roles, check if the permission exists in their permissions array
    if (user.permissions && Array.isArray(user.permissions)) {
        // Handle wildcard permissions
        if (user.permissions.includes('reports:read:all') && permission.startsWith('reports:')) {
            return true;
        }
        return user.permissions.includes(permission);
    }
    
    return false;
}
