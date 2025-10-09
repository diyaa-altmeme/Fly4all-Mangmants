import type { User, Permission } from '@/lib/types';
import { ROLES_PERMISSIONS } from './roles';

// This is the source of truth for all permissions in the system.
export const PERMISSIONS = {
    // Dashboard
    'dashboard:read': 'عرض لوحة التحكم',
    
    // Bookings
    'bookings:read': 'عرض حجوزات الطيران',
    'bookings:create': 'إنشاء حجوزات الطيران',
    'bookings:update': 'تعديل حجوزات الطيران',
    'bookings:delete': 'حذف حجوزات الطيران',
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


// Function to check if a user has a specific permission
export function hasPermission(user: User | null, requiredPermission: keyof typeof PERMISSIONS): boolean {
  if (!user) return false;
  // Admins have all permissions
  if (user.role === 'admin') return true;

  const userPermissions = user.permissions || [];
  return userPermissions.includes(requiredPermission);
}
