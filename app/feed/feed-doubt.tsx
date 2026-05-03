"use client";

import { useState, useTransition } from "react";
import { HelpCircle, MessageCircle, ShieldCheck, Smile, Sparkles } from "lucide-react";
import { answerDoubtAction } from "@/app/actions/social";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FeedDoubtProps = {
  doubt: {
    id: string;
    subject: string;
    title: string;
    body: string;
    imageUrl: string | null;
    isResolved: boolean;
    createdAt: string;
    user: {
      name: string;
      image: string | null;
      heroTag: string;
    };
    answers: {
      id: string;
      body: string;
      createdAt: string;
      verified: boolean;
      user: { name: string; image: string | null };
    }[];
  };
};

export function FeedDoubt({ doubt }: FeedDoubtProps) {
  const [answerText, setAnswerText] = useState("");
  const [isAnswerPending, startAnswerTransition] = useTransition();

  function submitAnswer(formData: FormData) {
    if (!answerText.trim()) return;
    startAnswerTransition(async () => {
      await answerDoubtAction(doubt.id, formData);
      setAnswerText("");
    });
  }

  return (
    <article id={`doubt-${doubt.id}`} className="overflow-hidden rounded-md border border-primary/40 bg-card shadow-sm ring-1 ring-primary/10">
      <div className="border-b bg-primary/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={doubt.user.name} image={doubt.user.image} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground"><HelpCircle size={13} /> Peer doubt</Badge>
                <Badge variant="outline">{doubt.subject}</Badge>
                {doubt.isResolved ? <Badge variant="secondary"><ShieldCheck size={13} /> Resolved</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Asked by <span className="font-medium text-foreground">{doubt.user.name}</span> · {new Date(doubt.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <Badge variant="accent"><Sparkles size={13} /> Priority</Badge>
        </div>
      </div>

      {doubt.imageUrl ? (
        <div className="aspect-square bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- User uploaded doubt images are remote Cloudinary URLs. */}
          <img src={doubt.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div className="grid gap-4 p-4">
        <div className="rounded-md border bg-muted/40 p-4">
          <h2 className="font-semibold leading-6">{doubt.title}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{doubt.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{doubt.answers.length} peer answers</span>
          <Badge variant="secondary"><MessageCircle size={14} /> Help needed</Badge>
          <Badge variant="outline">{doubt.user.heroTag}</Badge>
        </div>

        {doubt.answers.length ? (
          <details className="rounded-md border bg-background">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold">
              View answers <span className="text-muted-foreground">({doubt.answers.length})</span>
            </summary>
            <div className="grid max-h-52 gap-2 overflow-y-auto border-t p-3">
              {doubt.answers.map((answer) => (
                <div className="flex gap-2 text-sm" key={answer.id}>
                  <Avatar name={answer.user.name} image={answer.user.image} size="sm" />
                  <div className="min-w-0 flex-1 rounded-md bg-muted/50 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{answer.user.name}</p>
                      {answer.verified ? <Badge variant="secondary">Verified</Badge> : null}
                    </div>
                    <p className="break-words text-muted-foreground">{answer.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <form action={submitAnswer} className="flex items-center gap-2 border-t pt-3">
          <Smile size={18} className="text-muted-foreground" />
          <Input
            id={`answer-${doubt.id}`}
            name="body"
            value={answerText}
            onChange={(event) => setAnswerText(event.target.value)}
            placeholder="Answer this doubt..."
            className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
            disabled={isAnswerPending}
          />
          <Button type="submit" variant="ghost" size="sm" disabled={!answerText.trim() || isAnswerPending}>Post</Button>
        </form>
      </div>
    </article>
  );
}

function Avatar({ name, image, size = "default" }: { name: string; image?: string | null; size?: "default" | "sm" }) {
  return (
    <div className={`${size === "sm" ? "size-8" : "size-11"} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-accent via-primary to-secondary p-0.5`}>
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-background text-sm font-semibold">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Auth avatars may come from arbitrary configured providers.
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : name.charAt(0)}
      </div>
    </div>
  );
}
