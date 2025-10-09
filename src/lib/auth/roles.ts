import type { Role, Permission } from '@/lib/types';
import { PERMISSIONS } from './permissions';

const allPermissions = Object.keys(PERMISSIONS) as Permission[];

export const ROLES_PERMISSIONS: Record<string, Permission[]> = {
  admin: allPermissions,
  editor: [
    'dashboard:read',
    'bookings:read', 'bookings:create', 'bookings:update', 'bookings:operations',
    'visas:read', 'visas:create', 'visas:update',
    'subscriptions:read', 'subscriptions:create', 'subscriptions:update', 'subscriptions:payments',
    'vouchers:read', 'vouchers:create', 'vouchers:update',
    'remittances:read', 'remittances:create',
    'relations:read', 'relations:create', 'relations:update',
    'reports:read:all',
  ],
  viewer: [
    'dashboard:read',
    'bookings:read',
    'visas:read',
    'subscriptions:read',
    'vouchers:read',
    'remittances:read',
    'relations:read',
    'reports:read:all',
  ],
  accountant: [
    'dashboard:read',
    'bookings:read', 'bookings:operations',
    'visas:read',
    'subscriptions:read', 'subscriptions:payments',
    'vouchers:read', 'vouchers:create', 'vouchers:update',
    'remittances:read', 'remittances:create', 'remittances:audit', 'remittances:receive',
    'relations:read',
    'reports:read:all', 'reports:account_statement', 'reports:debts',
  ],
};
