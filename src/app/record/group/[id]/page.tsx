import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicRecordView } from "@/components/records/public-record";
import { getPublicRecord } from "@/server/queries/records";
import { getAppContext } from "@/server/next/context";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const record = await getPublicRecord(await getAppContext(), "group", id);
  return { title: record ? `${record.name} record` : "Record not found" };
}

export default async function GroupRecordPage({ params }: Params) {
  const { id } = await params;
  const record = await getPublicRecord(await getAppContext(), "group", id);
  if (!record) notFound();
  return <PublicRecordView record={record} />;
}
