
import { checkAuth } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";
import NoPermission from "@/components/NoPermission";

export default async function SegmentsLayout({ children }: { children: React.ReactNode }) {
  const session = await checkAuth();
  if (!session) {
    redirect("/login");
  }

  const permissions = await getUserPermissions(session.user.id);
  const hasAccess = permissions.some(p => p.name === 'segment_access');

  if (!hasAccess) {
    return <NoPermission />;
  }

  return (
    <>{children}</>
  );
}
