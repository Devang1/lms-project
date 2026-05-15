"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, FileText, ShieldAlert, UserCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

type Analysis = {
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: Date | string;
  correctCount: number;
  totalQuestions: number;
  review: Array<{
    id: string;
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
    events: Array<{ event: string; label: string; createdAt: Date | string }>;
  };
};

export function ResultAnalysisCard({ title, analysis }: { title: string; analysis: Analysis }) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedCheating, setExpandedCheating] = useState(false);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const riskColor = {
    LOW: "bg-green-500/10 text-green-500 border-green-500/20",
    MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    HIGH: "bg-red-500/10 text-red-500 border-red-500/20"
  }[analysis.cheating.risk] || "bg-muted text-muted-foreground";

  const riskIcon = {
    LOW: <CheckCircle2 size={12} />,
    MEDIUM: <AlertTriangle size={12} />,
    HIGH: <ShieldAlert size={12} />
  }[analysis.cheating.risk];

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 rounded-lg border bg-card p-3 shadow-sm sm:p-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide sm:text-xs">
            Result Analysis
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-normal sm:text-lg">
            {title}
          </h2>
          <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground sm:text-[10px]">
            <Clock size={10} />
            <span>{new Date(analysis.submittedAt).toLocaleString()}</span>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs sm:text-sm">
          {analysis.score}/{analysis.maxScore}
        </Badge>
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-background p-2 text-center sm:p-3">
          <p className="text-[8px] text-muted-foreground uppercase tracking-wide sm:text-[10px]">Score</p>
          <p className="mt-0.5 text-base font-bold sm:text-lg">{analysis.percentage}%</p>
          <Progress className="mt-1 h-1" value={analysis.percentage} />
        </div>
        
        <div className="rounded-lg border bg-background p-2 text-center sm:p-3">
          <p className="text-[8px] text-muted-foreground uppercase tracking-wide sm:text-[10px]">Correct</p>
          <p className="mt-0.5 text-base font-bold sm:text-lg">
            {analysis.correctCount}/{analysis.totalQuestions}
          </p>
          <div className="mt-1 flex justify-center gap-0.5">
            {Array.from({ length: Math.min(analysis.totalQuestions, 5) }).map((_, i) => (
              <div
                key={i}
                className={`h-1 w-3 rounded-full ${i < analysis.correctCount ? 'bg-secondary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>
        
        <div className={`rounded-lg border p-2 text-center sm:p-3 ${riskColor}`}>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wide sm:text-[10px]">Risk</p>
          <div className="mt-0.5 flex items-center justify-center gap-1">
            {riskIcon}
            <p className="text-xs font-bold sm:text-sm">{analysis.cheating.risk}</p>
          </div>
          <p className="mt-0.5 text-[8px] opacity-70 sm:text-[9px]">{analysis.cheating.score} pts</p>
        </div>
      </div>

      {/* Questions Review - Full questions visible */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Question Review ({analysis.correctCount}/{analysis.totalQuestions} correct)
          </p>
          <FileText size={12} className="text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          {analysis.review.map((item, index) => {
            const isExpanded = expandedQuestions.has(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-md border bg-background/50 overflow-hidden"
              >
                <button
                  onClick={() => toggleQuestion(item.id)}
                  className="w-full p-3 text-left transition-colors hover:bg-muted/20 sm:p-4"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {item.isCorrect ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Question {index + 1}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed break-words">
                            {item.prompt}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={item.isCorrect ? "secondary" : "outline"} className="text-xs">
                          {item.earned}/{item.marks}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t bg-muted/10"
                    >
                      <div className="space-y-3 p-3 text-xs sm:p-4">
                        <div className="rounded-lg bg-red-500/5 p-3">
                          <p className="text-xs font-medium text-muted-foreground">Your answer:</p>
                          <p className="mt-1 text-xs break-words">
                            {formatAnswer(item.yourAnswer)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-green-500/5 p-3">
                          <p className="text-xs font-medium text-green-600 dark:text-green-400">Correct answer:</p>
                          <p className="mt-1 text-xs break-words">{item.correctAnswer}</p>
                        </div>
                        {item.explanation && (
                          <div className="rounded-lg bg-muted/30 p-3">
                            <p className="text-xs font-medium text-muted-foreground">Explanation:</p>
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Cheating Log */}
      <div className="rounded-lg border overflow-hidden">
        <button
          onClick={() => setExpandedCheating(!expandedCheating)}
          className="flex w-full items-center justify-between p-3 transition-colors hover:bg-muted/20 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-accent" />
            <p className="text-sm font-medium">Security Log</p>
            {analysis.cheating.events.length > 0 && (
              <Badge variant="accent" className="text-xs">
                {analysis.cheating.events.length}
              </Badge>
            )}
          </div>
          {expandedCheating ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        <AnimatePresence>
          {expandedCheating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t"
            >
              <div className="p-3 sm:p-4">
                {analysis.cheating.events.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-yellow-500" />
                        <span className="text-xs font-medium">Suspicion Score</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-muted">
                          <div 
                            className="h-1.5 rounded-full bg-yellow-500"
                            style={{ width: `${Math.min(100, (analysis.cheating.score / 100) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold">{analysis.cheating.score}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {analysis.cheating.events.map((event, idx) => (
                        <motion.div
                          key={`${event.event}-${event.createdAt}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="flex items-start gap-2 rounded-lg bg-red-500/5 p-3"
                        >
                          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-red-500" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight">{event.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(event.createdAt).toLocaleTimeString("en-IN", { 
                                hour: "2-digit", 
                                minute: "2-digit",
                                second: "2-digit",
                                day: "2-digit",
                                month: "short"
                              })}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            #{idx + 1}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3"
                  >
                    <UserCheck size={14} className="shrink-0 text-green-500" />
                    <p className="text-sm text-green-600 dark:text-green-400">No suspicious activity detected</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.join(" → ");
  if (answer && typeof answer === "object" && "label" in answer) return String(answer.label);
  if (answer === undefined || answer === null || answer === "") return "Not answered";
  return String(answer);
}