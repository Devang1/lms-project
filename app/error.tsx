"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Something needs attention</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The platform hit an unexpected error. Try again after a quick refresh.
        </p>
        <Button className="mt-5" onClick={reset}>Retry</Button>
      </div>
    </main>
  );
}
