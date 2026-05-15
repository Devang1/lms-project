"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, GripVertical, Maximize2, Moon, Shield, Timer } from "lucide-react";
import { SecureCanvasText } from "@/app/weekly-tests/secure-canvas-text";
import { ResultAnalysisCard } from "@/app/weekly-tests/result-analysis-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { eventLabels, getRiskLevel, getSuspicionScore } from "@/lib/exams/anti-cheat";
import type { ExamQuestion } from "@/lib/exams/question-variants";

type ExamEvent = { event: string; createdAt: string };
type ExamResult = {
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  correctCount: number;
  totalQuestions: number;
  review: Array<{
    id: string;
    kind: string;
    prompt: string;
    yourAnswer: unknown;
    correctAnswer: string;
    explanation: string;
    earned: number;
    marks: number;
    isCorrect: boolean;
  }>;
  cheating: {
    score: number;
    risk: string;
    events: Array<{ event: string; label: string; createdAt: string }>;
  };
};

export function ExamClient({
  testId,
  title,
  durationMin,
  questions,
  existingEvents
}: {
  testId: string;
  title: string;
  durationMin: number;
  questions: ExamQuestion[];
  existingEvents: ExamEvent[];
}) {
  const storageKey = `secure-exam:${testId}`;
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [events, setEvents] = useState<ExamEvent[]>(existingEvents);
  const [secondsLeft, setSecondsLeft] = useState(durationMin * 60);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastFlagRef = useRef<Record<string, number>>({});

  const score = useMemo(() => getSuspicionScore(events), [events]);
  const question = questions[current];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;

  const flag = useCallback(async (event: string, urgent = false) => {
    const now = Date.now();
    if (now - (lastFlagRef.current[event] ?? 0) < 1200) return;
    lastFlagRef.current[event] = now;
    setEvents((value) => [...value, { event, createdAt: new Date().toISOString() }]);
    const body = JSON.stringify({ testId, event, device: navigator.userAgent });

    if (urgent && navigator.sendBeacon) {
      navigator.sendBeacon("/api/anti-cheat/flag", new Blob([body], { type: "application/json" }));
      return;
    }

    const response = await fetch("/api/anti-cheat/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: urgent
    });
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.events)) setEvents(payload.events);
    }
  }, [testId]);

  useEffect(() => {
    const cached = window.localStorage.getItem(storageKey);
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached) as { current?: number; answers?: Record<string, unknown>; secondsLeft?: number };
      setCurrent(parsed.current ?? 0);
      setAnswers(parsed.answers ?? {});
      setSecondsLeft(parsed.secondsLeft ?? durationMin * 60);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [durationMin, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ current, answers, secondsLeft }));
  }, [answers, current, secondsLeft, storageKey]);

  useEffect(() => {
    if (!started || submitted) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, submitted]);

  const submit = useCallback(() => {
    startTransition(async () => {
      const response = await fetch("/api/tests/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, answers })
      });
      if (response.ok) {
        setResult(await response.json() as ExamResult);
        setSubmitted(true);
        window.localStorage.removeItem(storageKey);
      } else if (response.status === 409) {
        setResult(await response.json() as ExamResult);
        setSubmitted(true);
        window.localStorage.removeItem(storageKey);
      }
    });
  }, [answers, storageKey, testId]);

  useEffect(() => {
    if (!started || submitted || secondsLeft > 0) return;
    submit();
  }, [secondsLeft, started, submitted, submit]);

  useEffect(() => {
    if (!started) return;

    const block = (event: Event, name: string) => {
      event.preventDefault();
      void flag(name);
    };
    const onVisibility = () => {
      if (document.hidden) void flag("TAB_SWITCH", true);
    };
    const onBlur = () => void flag("APP_SWITCH", true);
    const onPageHide = () => void flag("WINDOW_MINIMIZE", true);
    const onBeforeUnload = () => void flag("APP_SWITCH", true);
    const onFullscreen = () => {
      if (!document.fullscreenElement) void flag("FULLSCREEN_EXIT");
    };
    const onResize = () => {
      if (window.innerWidth < screen.width * 0.7 || window.innerHeight < screen.height * 0.55) void flag("SPLIT_SCREEN_SUSPECTED");
    };
    const onCopy = (event: Event) => block(event, "COPY_ATTEMPT");
    const onPaste = (event: Event) => block(event, "PASTE_ATTEMPT");
    const onContextMenu = (event: Event) => block(event, "CONTEXT_MENU");
    const onSelectStart = (event: Event) => block(event, "TEXT_SELECTION");
    const onTouchStart = () => {
      const timeout = window.setTimeout(() => void flag("LONG_PRESS"), 650);
      const clear = () => window.clearTimeout(timeout);
      window.addEventListener("touchend", clear, { once: true });
      window.addEventListener("touchmove", clear, { once: true });
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("resize", onResize);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("touchstart", onTouchStart, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, [flag, started]);

  function updateAnswer(value: unknown) {
    const previousTime = Number(window.localStorage.getItem(`${storageKey}:lastAnswer`) ?? 0);
    const now = Date.now();
    if (previousTime && now - previousTime < 2500) void flag("RAPID_ANSWERING");
    window.localStorage.setItem(`${storageKey}:lastAnswer`, String(now));
    setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: value }));
  }

  function moveStep(option: string, direction: -1 | 1) {
    const currentOrder = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : question.options;
    const index = currentOrder.indexOf(option);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= currentOrder.length) return;
    const next = [...currentOrder];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateAnswer(next);
  }

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  if (!questions.length) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground sm:p-5">
        No questions are available for this test yet.
      </div>
    );
  }

  if (!started) {
    return (
      <section className="exam-secure-surface space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:space-y-5 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary/15 text-secondary sm:h-11 sm:w-11">
            <Shield size={18} className="sm:h-[22px] sm:w-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground sm:text-sm">Mobile-first secure attempt</p>
            <h2 className="text-lg font-semibold tracking-normal line-clamp-2 sm:text-2xl">
              {title}
            </h2>
          </div>
        </div>
        
        <div className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-3 sm:gap-2 sm:text-sm">
          <span>{questions.length} personalized questions</span>
          <span>{durationMin} minute timer</span>
          <span>One question visible at a time</span>
        </div>
        
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground sm:text-sm">
          Press the button below when you are ready. The timer and anti-cheat monitoring start after this step.
        </p>
        
        <Button
          size="default"
          className="w-full gap-2 text-sm sm:w-fit"
          onClick={() => {
            setStarted(true);
            document.documentElement.requestFullscreen().catch(() => undefined);
          }}
        >
          <Maximize2 size={16} /> Start secure test
        </Button>
      </section>
    );
  }

  if (submitted) {
    return result ? <ResultAnalysisCard title={title} analysis={result} /> : null;
  }

  return (
    <section className="exam-secure-surface min-h-[calc(100vh-7rem)] rounded-lg border bg-card shadow-sm">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 p-3 backdrop-blur sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
              Q{current + 1} of {questions.length}
            </p>
            <Progress className="mt-1 h-1.5 w-32 sm:mt-2 sm:h-2 sm:w-44" value={progress} />
            <p className="mt-2 text-center text-[10px] font-medium tracking-wide text-muted-foreground/80">
              ← Swipe to see full question →
            </p>
            
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Badge variant="outline" className="gap-0.5 px-1.5 py-0.5 text-[10px] sm:gap-1 sm:px-2 sm:py-0.5 sm:text-xs">
              <Timer size={11} className="sm:h-[14px] sm:w-[14px]" /> 
              <span className="font-mono">{minutes}:{seconds}</span>
            </Badge>
            <Badge className={cn(
              "px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-0.5 sm:text-xs",
              score >= 45 ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"
            )}>
              {getRiskLevel(score)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content - Increased width for mobile */}
      <div className="space-y-4 p-2 sm:space-y-5 sm:p-5">
        {/* Question Prompt - Full width on mobile */}
        <div className="rounded-md border bg-background/70 p-2 sm:p-4">
          {question.scenario && (
            <p className="mb-2 rounded-md bg-muted p-2 text-xs text-muted-foreground sm:mb-3 sm:p-3 sm:text-sm">
              {question.scenario}
            </p>
          )}
          <div className="w-full overflow-x-auto">
            <SecureCanvasText
              text={question.prompt}
              seed={question.layoutSeed}
              className="block w-full min-w-[300px] rounded-md border bg-white text-sm dark:bg-slate-100 sm:min-w-0 sm:text-base"
            />
          </div>
        </div>

        {/* Hotspot Question */}
        {question.kind === "HOTSPOT" && question.diagram && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border bg-muted">
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground sm:text-sm">
              {question.diagram.label}
            </div>
            {question.diagram.hotspots.map((spot) => (
              <button
                key={spot.id}
                type="button"
                aria-label={spot.label}
                onClick={() => updateAnswer({ id: spot.id, label: spot.label })}
                className={cn(
                  "absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70 bg-primary/15 transition active:scale-95 hover:scale-110 sm:h-12 sm:w-12",
                  (answers[question.id] as { id?: string } | undefined)?.id === spot.id && "bg-secondary/40"
                )}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              />
            ))}
          </div>
        )}

        {/* Order Question */}
        {question.kind === "ORDER" && (
          <div className="space-y-2">
            {(Array.isArray(answers[question.id]) ? answers[question.id] as string[] : question.options).map((option, idx) => (
              <div key={option} className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2 sm:flex-nowrap sm:p-3">
                <GripVertical size={14} className="shrink-0 text-muted-foreground sm:h-[17px] sm:w-[17px]" />
                <span className="min-w-0 flex-1 text-xs sm:text-sm line-clamp-2">{option}</span>
                <div className="flex shrink-0 gap-1">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => moveStep(option, -1)}
                    className="h-7 px-2 text-xs sm:h-9 sm:px-3"
                  >
                    Up
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => moveStep(option, 1)}
                    className="h-7 px-2 text-xs sm:h-9 sm:px-3"
                  >
                    Down
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MCQ & Similar Questions - Full width options */}
        {["MCQ", "FIND_MISTAKE", "MISSING_STEP", "SCENARIO"].includes(question.kind) && (
          <div className="space-y-2">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateAnswer(option)}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-3 text-left text-sm transition active:scale-[0.99] hover:border-primary sm:min-h-12 sm:px-4 sm:py-3 sm:text-sm",
                  answers[question.id] === option && "border-secondary bg-secondary/10"
                )}
              >
                <span className="block leading-relaxed">{option}</span>
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Numeric Input */}
        {question.kind === "DYNAMIC_NUMERIC" && (
          <input
            inputMode="decimal"
            value={String(answers[question.id] ?? "")}
            onChange={(event) => updateAnswer(event.target.value)}
            className="h-12 w-full rounded-md border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring sm:h-12 sm:px-4 sm:text-base"
            placeholder="Enter numerical answer"
          />
        )}

        {/* Footer */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:gap-2 sm:text-xs">
            <AlertTriangle size={12} className="sm:h-[14px] sm:w-[14px]" />
            <span className="line-clamp-1">
              {events.length} event(s) logged. Latest: {events.at(-1) ? eventLabels[events.at(-1)!.event] ?? events.at(-1)!.event : "none"}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="default"
              disabled={current === 0} 
              onClick={() => setCurrent((value) => value - 1)}
              className="gap-2 text-sm sm:gap-2 sm:text-sm"
            >
              <ArrowLeft size={16} /> Back
            </Button>
            
            <span className="text-xs text-muted-foreground sm:text-xs">
              {answeredCount}/{questions.length}
            </span>
            
            {current === questions.length - 1 ? (
              <Button 
                type="button" 
                size="default"
                disabled={isPending} 
                onClick={submit}
                className="text-sm sm:text-sm"
              >
                Submit
              </Button>
            ) : (
              <Button 
                type="button" 
                size="default"
                onClick={() => setCurrent((value) => value + 1)}
                className="gap-2 text-sm sm:gap-2 sm:text-sm"
              >
                Next <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Decorative Moon */}
      <Moon className="pointer-events-none fixed bottom-20 right-4 hidden text-muted-foreground/20 sm:block" size={34} />
    </section>
  );
}