import { JournalAccountDetailClient } from "./journal-account-detail-client";

export default async function JournalAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <JournalAccountDetailClient accountId={accountId ?? ""} />;
}
