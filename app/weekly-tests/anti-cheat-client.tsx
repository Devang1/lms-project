"use client";

import { useEffect, useState } from "react";
import { Maximize2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AntiCheatClient({ testId }: { testId?: string }) {
  const [events, setEvents] = useState(0);

  useEffect(() => {
    async function flag(event: string) {
      setEvents((value) => value + 1);
      await fetch("/api/anti-cheat/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, event, device: navigator.userAgent })
      });
    }

    const onVisibility = () => {
      if (document.hidden) void flag("TAB_SWITCH");
    };
    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      void flag("PASTE_ATTEMPT");
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste);
    };
  }, [testId]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-4">
      <ShieldAlert className="text-accent" size={20} />
      <span className="text-sm text-muted-foreground">{events} suspicious events detected in this session.</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => document.documentElement.requestFullscreen().catch(() => undefined)}
      >
        <Maximize2 size={16} /> Fullscreen
      </Button>
    </div>
  );
}
