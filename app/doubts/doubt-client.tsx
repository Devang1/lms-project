"use client";

import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function DoubtClient() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [answer, setAnswer] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function askAi() {
    setLoading(true);
    const response = await fetch("/api/ai/doubt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, subject })
    });
    setAnswer(await response.json());
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI doubt assistant</CardTitle>
        <CardDescription>Step-by-step help with throttling and daily fair-use limits.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject or topic" />
        <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Write your doubt" />
        <Button onClick={askAi} disabled={loading || question.length < 8}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
          Ask AI
        </Button>
        {answer ? <pre className="overflow-auto rounded-md bg-muted p-3 text-sm">{JSON.stringify(answer, null, 2)}</pre> : null}
      </CardContent>
    </Card>
  );
}
