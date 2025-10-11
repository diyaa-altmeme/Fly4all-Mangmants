

import { LandingPage } from "@/components/landing-page";
import { getSettings } from "@/app/settings/actions";
import { defaultSettingsData } from "@/lib/defaults";
import type { LandingPageSettings } from "@/lib/types";

// This component is now rendered directly by MainLayout for unauthenticated users,
// but we keep the data fetching logic here.
export default async function IndexPage() {
  let settings: LandingPageSettings;
  try {
    const appSettings = await getSettings();
    settings = appSettings.theme?.landingPage || defaultSettingsData.theme.landingPage;
  } catch (error) {
    console.error("Failed to fetch settings, using default landing page settings.");
    settings = defaultSettingsData.theme.landingPage;
  }

  return <LandingPage settings={settings} />;
}
