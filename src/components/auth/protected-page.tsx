
import { getCurrentUser } from '@/lib/auth/actions';
import type { Permission } from '@/lib/types';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface ProtectedPageProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

/**
 * A server-side component to protect pages based on authentication and permissions.
 * It checks the user's session on the server and redirects if necessary, preventing page flicker.
 * 
 * @param {React.ReactNode} children The content to render if the user is authenticated and has permission.
 * @param {Permission} [requiredPermission] The specific permission required to access the page.
 */
export default async function ProtectedPage({ children, requiredPermission }: ProtectedPageProps) {
  const { user, hasPermission } = await getCurrentUser();

  // 1. Check for user authentication
  if (!user) {
    // Redirect to login page if not authenticated
    redirect('/auth/login');
  }

  // 2. Check for required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Render an access denied message if the user lacks the required permission
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
            <Terminal className="h-4 w-4" />
            <AlertTitle>وصول مرفوض!</AlertTitle>
            <AlertDescription>
              ليس لديك الصلاحية المطلوبة للوصول إلى هذه الصفحة. يرجى التواصل مع مدير النظام.
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 3. Render the page content if checks pass
  return <>{children}</>;
}
