import Workspace from "@/components/workspace";
import { chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default function Home() {
  return <Workspace signInPath={chatGPTSignInPath("/")} signOutPath={chatGPTSignOutPath("/")} />;
}
