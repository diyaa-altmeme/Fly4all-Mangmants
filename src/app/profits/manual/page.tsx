

import { redirect } from "next/navigation";

// This page has been deprecated. All manual profit entry is now handled
// through a dialog on the /profit-sharing page.
export default function ManualProfitsPage() {
    redirect('/profit-sharing');
}
