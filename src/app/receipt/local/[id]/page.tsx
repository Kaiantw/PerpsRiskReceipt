import { LocalReceiptClient } from "./local-receipt-client.tsx";

export default async function LocalReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <LocalReceiptClient receiptId={id} />;
}
