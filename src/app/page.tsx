

import { LandingPage } from "@/components/landing-page";
import { getSettings } from "@/app/settings/actions";
import { defaultSettingsData } from "@/lib/defaults";
import type { LandingPageSettings } from "@/lib/types";

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
