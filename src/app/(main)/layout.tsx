
import { MainLayout } from "@/components/layout/main-layout";

// This layout is intentionally simple. 
// The main layout logic is handled by the Providers and MainLayout components.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
