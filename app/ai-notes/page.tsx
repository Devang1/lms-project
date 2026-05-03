import { AppShell } from "@/components/app-shell";
import { NotesClient } from "@/app/ai-notes/notes-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AINotesPage() {
  const session = await auth();
  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <NotesClient />
    </AppShell>
  );
}
