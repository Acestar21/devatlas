import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Profile } from "@/types";
import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default async function ActivityPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const cookie = (await cookies()).get("devcard_session");
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/${username}`, { cache: "no-store", headers: cookie ? { Cookie: `devcard_session=${cookie.value}` } : {} });
  if (response.status === 404) notFound();
  if (!response.ok) return null;
  return <SectionPlaceholder profile={await response.json() as Profile} title="Activity" />;
}