/**
 * CLI runner for cron-job/background WA reminder.
 * Dipakai oleh GitHub Actions / Railway scheduler:
 *   npm run cron:reminders
 */
import { processDueReminders } from "@/lib/reminders";
import { expireDuePoints } from "@/lib/loyalty";

async function main() {
  const startedAt = new Date();
  console.log(`[reminders] start ${startedAt.toISOString()}`);
  const reminders = await processDueReminders();
  const expiry = await expireDuePoints();
  console.log("[reminders] done", { reminders, expiry });
}

main().catch((err) => {
  console.error("[reminders] fatal", err);
  process.exit(1);
});
