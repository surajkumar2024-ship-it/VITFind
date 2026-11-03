import Workspace from "@/components/workspace";
import { authReady, authOrigin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { localDemoEnabled } from "@/lib/local-demo";
export const dynamic = "force-dynamic";
export default async function Home() {
  const requestHeaders = await headers();
  const localDemo = localDemoEnabled(`http://${requestHeaders.get("host") || "invalid"}/`, requestHeaders);
  const origin=authOrigin();
  if(!localDemo&&origin&&requestHeaders.get("host")!==new URL(origin).host)redirect(origin);
  return <Workspace authReady={localDemo || authReady()} localDemo={localDemo} />;
}
