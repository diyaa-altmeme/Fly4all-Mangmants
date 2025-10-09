import { PERMISSIONS } from "./permissions";

export type Role = {
  id: string;
  name: string;
  permissions: (keyof typeof PERMISSIONS)[];
};

// قائمة بجميع الصلاحيات المتاحة
const allPermissions = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[];

// قائمة بصلاحيات القراءة فقط
const readOnlyPermissions = allPermissions.filter(p => p.endsWith(':read') || p.endsWith(':read:all'));

export const ROLES: Role[] = [
  {
    id: "admin",
    name: "مدير النظام",
    permissions: allPermissions,
  },
  {
    id: "viewer",
    name: "مشاهد فقط",
    permissions: [
      'dashboard:read',
      'bookings:read',
      'visas:read',
      'subscriptions:read',
      'vouchers:read',
      'remittances:read',
      'segments:read',
      'relations:read',
      'users:read',
      'hr:read',
      'reports:read:all',
      'settings:read',
      'system:audit_log:read',
      'system:error_log:read',
    ],
  },
  {
      id: 'accountant',
      name: 'محاسب',
      permissions: [
        // Inherits viewer permissions
        ...readOnlyPermissions,
        // Core accounting
        'bookings:create', 'bookings:update', 'bookings:operations',
        'visas:create', 'visas:update',
        'subscriptions:create', 'subscriptions:update', 'subscriptions:payments',
        'vouchers:create', 'vouchers:update',
        'remittances:create', 'remittances:audit', 'remittances:receive',
        'segments:create', 'segments:update',
        // Client management
        'relations:create', 'relations:update',
        // Reports
        'reports:account_statement',
        'reports:debts',
      ]
  }
];
