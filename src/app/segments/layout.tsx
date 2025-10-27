
import { getCurrentUserFromSession } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import NoPermission from "@/components/NoPermission";

export default async function SegmentsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromSession();
  if (!user) {
    redirect("/login");
  }

  // Check if the logged-in entity is a client, not a user
  if ('isClient' in user) {
    return <NoPermission />;
  }

  // The user object from getCurrentUserFromSession contains the permissions array.
  const hasAccess = user.permissions?.includes('segment_access');

  if (!hasAccess) {
    return <NoPermission />;
  }

  return (
    <>{children}</>
  );
}
