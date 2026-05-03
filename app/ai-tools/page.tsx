import { BrainCircuit, MessageCircle } from "lucide-react";
import { NotesClient } from "@/app/ai-notes/notes-client";
import { DoubtClient } from "@/app/doubts/doubt-client";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AIToolsPage() {
  const session = await auth();

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="grid gap-5 pb-20 lg:pb-0">
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-primary">AI tools</p>
          <h1 className="mt-1 text-2xl font-semibold">Notes and doubt assistant</h1>
          <p className="mt-2 text-sm text-muted-foreground">Generate YouTube notes or ask AI for step-by-step doubt help in one place.</p>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="grid gap-3">
            <div className="flex items-center gap-2 font-semibold"><BrainCircuit size={18} /> AI notes</div>
            <NotesClient />
          </section>
          <section className="grid content-start gap-3">
            <div className="flex items-center gap-2 font-semibold"><MessageCircle size={18} /> AI doubt</div>
            <DoubtClient />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
