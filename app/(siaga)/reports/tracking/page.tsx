import { redirect } from "next/navigation";

/**
 * Backward compatibility for existing tracking bookmarks and notifications.
 * Report detail now contains the lifecycle, PIC, target and history.
 */
export default function LegacyTrackingPage() {
  redirect("/reports");
}
