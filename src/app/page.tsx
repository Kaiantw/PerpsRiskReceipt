import { DashboardClient } from "./dashboard-client";
import { listFixtureAccounts } from "@/lib/perps/fixtures.ts";
import { getFixtureReceipts } from "@/lib/receipts/receipt.ts";

export default async function Home() {
  const [snapshots, receipts] = await Promise.all([
    listFixtureAccounts(),
    getFixtureReceipts(),
  ]);
  const receiptPathsByAccount = Object.fromEntries(
    receipts.map((receipt) => [
      receipt.snapshot.account,
      `/receipt/${receipt.id}`,
    ]),
  );

  return (
    <DashboardClient
      snapshots={snapshots}
      receiptPathsByAccount={receiptPathsByAccount}
    />
  );
}
