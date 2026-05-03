"use client";

import { useState } from "react";
import {
  BrainCircuit,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { NotesClient } from "@/app/ai-notes/notes-client";
import { DoubtClient } from "@/app/doubts/doubt-client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

type AIToolsMobileClientProps = {
  role: string;
};

export default function AIToolsMobileClient({
  role,
}: AIToolsMobileClientProps) {
  const [activeTool, setActiveTool] = useState<
    "notes" | "doubt"
  >("notes");

  return (
    <AppShell role={(role as "ADMIN" | "TEACHER" | "STUDENT") ?? "STUDENT"}>
      <div className="mx-auto w-full max-w-4xl px-3 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-5">
          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_35%)]" />

            <div className="relative z-10">
              <div className="mb-3 flex items-center gap-2 text-slate-300">
                <Sparkles size={15} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  AI Study Hub
                </span>
              </div>

              <h1 className="text-2xl font-bold leading-tight">
                Smart Notes & Doubt Solver
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Learn faster with structured notes and instant AI
                doubt support.
              </p>
            </div>
          </section>

          {/* Toggle Buttons */}
          <section className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={() => setActiveTool("notes")}
              variant={
                activeTool === "notes"
                  ? "default"
                  : "outline"
              }
              className="h-11 rounded-xl text-sm font-semibold"
            >
              <BrainCircuit size={18} />
              Notes
            </Button>

            <Button
              type="button"
              onClick={() => setActiveTool("doubt")}
              variant={
                activeTool === "doubt"
                  ? "default"
                  : "outline"
              }
              className="h-11 rounded-xl text-sm font-semibold"
            >
              <MessageCircle size={18} />
              Doubts
            </Button>
          </section>

          {/* Active Tool */}
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-card shadow-md">
            <div className="border-b border-slate-800 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {activeTool === "notes" ? (
                    <BrainCircuit size={20} />
                  ) : (
                    <MessageCircle size={20} />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="font-semibold text-base">
                    {activeTool === "notes"
                      ? "AI Notes Generator"
                      : "AI Doubt Assistant"}
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    {activeTool === "notes"
                      ? "Generate revision-ready notes"
                      : "Solve doubts step-by-step"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tool Content */}
            {/* Replace your entire active tool content block with this */}

<div className="p-2 sm:p-5">
  {activeTool === "notes" ? (
    <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30 p-3 sm:p-5">
      <div className="w-full max-w-full
        [&>*]:w-full
        [&_.w-\[600px\]]:w-full
        [&_.max-w-md]:max-w-full
        [&_.max-w-lg]:max-w-full
        [&_.max-w-xl]:max-w-full
        [&_.grid]:grid-cols-1
        [&_.sm\:grid-cols-2]:grid-cols-1
        [&_.md\:grid-cols-2]:grid-cols-1
        [&_.flex]:flex-wrap
        [&_button]:w-full
        [&_input]:w-full
        [&_textarea]:w-full
        [&_select]:w-full
        [&_.rounded-md]:w-full
      ">
        <NotesClient />
      </div>
    </div>
  ) : (
    <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30 p-3 sm:p-5">
      <DoubtClient />
    </div>
  )}
</div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}