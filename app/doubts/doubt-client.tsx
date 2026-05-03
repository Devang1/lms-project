"use client";

import { useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AIStep =
  | string
  | {
      step_number?: number;
      explanation?: string;
      example?: string;
    };

type AIResponse = {
  answer?: string;
  explanation?: string;
  steps?: AIStep[];
  summary?: string;
  error?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function DoubtClient() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [answer, setAnswer] = useState<AIResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function askAi(currentQuestion: string) {
    try {
      setLoading(true);
      setAnswer(null);

      const updatedHistory = [
        ...chatHistory,
        {
          role: "user" as const,
          content: currentQuestion,
        },
      ];

      const response = await fetch("/api/ai/doubt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentQuestion,
          subject,
          history: updatedHistory,
        }),
      });

      const data: AIResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch AI response."
        );
      }

      setAnswer(data);

      const assistantReply =
        data.answer ||
        data.explanation ||
        data.summary ||
        "No response generated.";

      setChatHistory([
        ...updatedHistory,
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);

      setQuestion("");
      setFollowUp("");
    } catch (error) {
      setAnswer({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch AI response.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleInitialAsk() {
    if (question.trim().length < 8) return;
    await askAi(question.trim());
  }

  async function handleFollowUp() {
    if (followUp.trim().length < 3) return;
    await askAi(followUp.trim());
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI doubt assistant</CardTitle>
        <CardDescription>
          Ask doubts, get detailed explanations, and continue
          learning with follow-up questions.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* Subject */}
        <Input
          value={subject}
          onChange={(event) =>
            setSubject(event.target.value)
          }
          placeholder="Subject or topic"
        />

        {/* Main Question */}
        <Textarea
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          placeholder="Write your doubt"
          minLength={8}
        />

        <Button
          onClick={handleInitialAsk}
          disabled={loading || question.trim().length < 8}
        >
          {loading ? (
            <Loader2
              className="animate-spin"
              size={16}
            />
          ) : (
            <Bot size={16} />
          )}
          Ask AI
        </Button>

        {/* Chat History */}
        {chatHistory.length > 0 ? (
          <div className="max-h-[500px] space-y-3 overflow-y-auto rounded-md border bg-muted/30 p-4">
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`rounded-md p-3 text-sm ${
                  message.role === "user"
                    ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                    : "mr-auto max-w-[85%] border bg-background"
                }`}
              >
                <p className="mb-1 text-xs font-semibold opacity-70">
                  {message.role === "user" ? "You" : "AI"}
                </p>

                <p className="whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            ))}

            {/* Detailed AI Response */}
            {answer && !answer.error ? (
              <div className="mr-auto max-w-[85%] rounded-md border bg-background p-4 text-sm space-y-4">
                {answer.explanation ? (
                  <div>
                    <h3 className="font-semibold">
                      Explanation
                    </h3>
                    <p>{answer.explanation}</p>
                  </div>
                ) : null}

                {answer.steps?.length ? (
                  <div>
                    <h3 className="font-semibold">
                      Step-by-step solution
                    </h3>

                    <ol className="list-decimal pl-5 space-y-3">
                      {answer.steps.map(
                        (step, index) => (
                          <li key={index}>
                            {typeof step ===
                            "string" ? (
                              <p>{step}</p>
                            ) : (
                              <div className="space-y-1">
                                {step.step_number ? (
                                  <p className="font-medium">
                                    Step{" "}
                                    {
                                      step.step_number
                                    }
                                  </p>
                                ) : null}

                                {step.explanation ? (
                                  <p>
                                    {
                                      step.explanation
                                    }
                                  </p>
                                ) : null}

                                {step.example ? (
                                  <p className="text-sm text-muted-foreground">
                                    Example:{" "}
                                    {step.example}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </li>
                        )
                      )}
                    </ol>
                  </div>
                ) : null}

                {answer.summary ? (
                  <div>
                    <h3 className="font-semibold">
                      Quick summary
                    </h3>
                    <p>{answer.summary}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Error */}
        {answer?.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {answer.error}
          </p>
        ) : null}

        {/* Follow-up Section */}
        {chatHistory.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Textarea
              value={followUp}
              onChange={(event) =>
                setFollowUp(event.target.value)
              }
              placeholder="Ask a follow-up question..."
              className="min-h-20"
            />

            <Button
              onClick={handleFollowUp}
              disabled={
                loading || followUp.trim().length < 3
              }
            >
              {loading ? (
                <Loader2
                  className="animate-spin"
                  size={16}
                />
              ) : (
                <Send size={16} />
              )}
              Follow Up
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}