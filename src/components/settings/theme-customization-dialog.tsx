
import { redirect } from 'next/navigation';

// This component is deprecated. The Theme Customization content is now displayed directly
// in the appearance settings tab. This file will be removed in a future cleanup.
export default function DeprecatedThemeCustomizationDialog() {
    redirect('/settings');
    return null;
}
