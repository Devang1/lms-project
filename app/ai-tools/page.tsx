import { auth } from "@/lib/auth";
import AIToolsMobileClient from "./ai-tools-mobile-client";

export const dynamic = "force-dynamic";

export default async function AIToolsPage() {
  const session = await auth();

  return (
    <AIToolsMobileClient
      role={
        (session?.user.role as
          | "ADMIN"
          | "TEACHER"
          | "STUDENT") ?? "STUDENT"
      }
    />
  );
}