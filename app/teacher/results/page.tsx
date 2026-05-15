"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  AlertTriangle,
  Eye,
  Trophy,
  ShieldAlert,
  ArrowLeft,
  Filter,
  X,
  ChevronDown,
  Users,
  TrendingUp,
  Award,
  FileText,
  UserCheck,
  AlertOctagon,
  ChevronRight,
  Activity,
  Clock,
  BookOpen,
  CheckCircle,
  XCircle
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TestItem {
  id: string;
  title: string;
  courseTitle?: string;
  submissions: number;
  averageScore: number;
  suspiciousCount: number;
  createdAt: string;
}

interface StudentResult {
  id: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  suspicionScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";

  user: {
    name: string;
    email: string;
  };

  suspiciousEvents: {
    id: string;
    event: string;
    severity?: number;
    createdAt: string;
  }[];

  review: {
    id: string;
    prompt: string;
    yourAnswer: string;
    correctAnswer: string;
    explanation: string;
    earned: number;
    marks: number;
  }[];
}

const riskStyles = {
  LOW: "bg-green-500/15 text-green-400 border border-green-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  HIGH: "bg-red-500/15 text-red-400 border border-red-500/30"
};

const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };

function formatEventLabel(event: string) {
  return event
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TeacherResultsPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StudentResult | null>(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "score" | "risk">("risk");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tests");
      const data = await res.json();
      setTests(data.tests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (test: TestItem) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tests/${test.id}/results`);
      const data = await res.json();
      setSelectedTest(test);
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionExpand = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const filteredAndSortedResults = useMemo(() => {
    let filtered = results.filter((result) => {
      const matchesSearch =
        result.user.name.toLowerCase().includes(search.toLowerCase()) ||
        result.user.email.toLowerCase().includes(search.toLowerCase());
      const matchesRisk = riskFilter === "ALL" || result.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    });

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.user.name.localeCompare(b.user.name);
      } else if (sortBy === "score") {
        return (b.score / b.maxScore) - (a.score / a.maxScore);
      } else {
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
    });

    return filtered;
  }, [results, search, riskFilter, sortBy]);

  const stats = useMemo(() => {
    if (!results.length)
      return {
        total: 0,
        avg: 0,
        highest: 0,
        lowest: 0,
        suspicious: 0,
        passRate: 0,
        avgSuspicion: 0
      };

    const scores = results.map((r) => (r.score / r.maxScore) * 100);
    const passCount = scores.filter(s => s >= 60).length;
    const avgSuspicion = results.reduce((a, b) => a + b.suspicionScore, 0) / results.length;

    return {
      total: results.length,
      avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      highest: Math.max(...scores).toFixed(1),
      lowest: Math.min(...scores).toFixed(1),
      suspicious: results.filter((r) => r.riskLevel !== "LOW").length,
      passRate: Math.round((passCount / results.length) * 100),
      avgSuspicion: avgSuspicion.toFixed(1)
    };
  }, [results]);

  if (loading) {
    return (
      <AppShell role="TEACHER">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading results...</p>
        </div>
      </AppShell>
    );
  }

  // ==========================================
  // TESTS PAGE
  // ==========================================

  if (!selectedTest) {
    return (
      <AppShell role="TEACHER" showMobileHeader={true} className="bg-gradient-to-b from-background to-muted/20">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-xs font-medium text-primary/80 sm:text-sm">Analytics Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-4xl">Test Results</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Monitor student performance and identify at-risk submissions</p>
          </div>

          {/* Compact Stats Overview */}
          {tests.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:grid-cols-4 sm:gap-4">
              <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground sm:text-sm">Total Tests</p>
                      <p className="text-lg font-bold sm:text-3xl">{tests.length}</p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-1.5 sm:p-3">
                      <FileText className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground sm:text-sm">Submissions</p>
                      <p className="text-lg font-bold sm:text-3xl">{tests.reduce((a, b) => a + b.submissions, 0)}</p>
                    </div>
                    <div className="rounded-full bg-blue-500/10 p-1.5 sm:p-3">
                      <Users className="h-3 w-3 sm:h-5 sm:w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground sm:text-sm">Avg. Score</p>
                      <p className="text-lg font-bold sm:text-3xl">
                        {(tests.reduce((a, b) => a + b.averageScore, 0) / tests.length).toFixed(0)}%
                      </p>
                    </div>
                    <div className="rounded-full bg-green-500/10 p-1.5 sm:p-3">
                      <TrendingUp className="h-3 w-3 sm:h-5 sm:w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground sm:text-sm">Suspicious</p>
                      <p className="text-lg font-bold text-red-400 sm:text-3xl">{tests.reduce((a, b) => a + b.suspiciousCount, 0)}</p>
                    </div>
                    <div className="rounded-full bg-red-500/10 p-1.5 sm:p-3">
                      <AlertOctagon className="h-3 w-3 sm:h-5 sm:w-5 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tests Grid */}
          {tests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/50 sm:h-12 sm:w-12" />
                <h3 className="text-base font-semibold sm:text-lg">No tests available</h3>
                <p className="text-xs text-muted-foreground sm:text-sm">Create a test to start collecting results</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map((test, idx) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -2 }}
                >
                  <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-lg">
                    <div className="h-1 w-full bg-gradient-to-r from-primary/50 to-primary"></div>
                    <CardContent className="space-y-3 p-3 sm:p-5">
                      <div>
                        <h2 className="line-clamp-1 text-base font-semibold sm:text-xl group-hover:text-primary transition-colors">
                          {test.title}
                        </h2>
                        <div className="flex items-center gap-1 mt-0.5">
                          <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground line-clamp-1 sm:text-sm">
                            {test.courseTitle || "Uncategorized"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-muted/30 p-1.5 text-center sm:p-2">
                          <p className="text-[9px] text-muted-foreground sm:text-xs">Submissions</p>
                          <p className="text-sm font-semibold sm:text-lg">{test.submissions}</p>
                        </div>
                        <div className="rounded-md bg-muted/30 p-1.5 text-center sm:p-2">
                          <p className="text-[9px] text-muted-foreground sm:text-xs">Average</p>
                          <p className="text-sm font-semibold sm:text-lg">{test.averageScore}%</p>
                        </div>
                        <div className="rounded-md bg-muted/30 p-1.5 text-center sm:p-2">
                          <p className="text-[9px] text-muted-foreground sm:text-xs">Suspicious</p>
                          <p className="text-sm font-semibold text-red-400 sm:text-lg">{test.suspiciousCount}</p>
                        </div>
                        <div className="rounded-md bg-muted/30 p-1.5 text-center sm:p-2">
                          <p className="text-[9px] text-muted-foreground sm:text-xs">Created</p>
                          <p className="text-[9px] font-medium sm:text-xs">{new Date(test.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <Button
                        className="w-full h-8 text-xs sm:h-10 sm:text-sm group relative overflow-hidden"
                        onClick={() => loadResults(test)}
                      >
                        <span className="relative z-10">View Results</span>
                        <ChevronRight className="relative z-10 ml-1 h-3 w-3 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // ==========================================
  // RESULTS PAGE
  // ==========================================

  return (
    <AppShell role="TEACHER" showMobileHeader={true} className="bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => {
            setSelectedTest(null);
            setResults([]);
          }}
          className="group mb-4 flex items-center gap-1 text-xs text-muted-foreground transition-all hover:text-primary sm:mb-6 sm:gap-2 sm:text-sm"
        >
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1 sm:h-4 sm:w-4" />
          Back to Tests
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <p className="text-xs font-medium text-primary/80 sm:text-sm">Results Dashboard</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-4xl line-clamp-1">{selectedTest.title}</h1>
          {selectedTest.courseTitle && (
            <div className="mt-0.5 flex items-center gap-1 sm:mt-1 sm:gap-2">
              <BookOpen className="h-2.5 w-2.5 text-muted-foreground sm:h-4 sm:w-4" />
              <p className="text-[10px] text-muted-foreground sm:text-sm">{selectedTest.courseTitle}</p>
            </div>
          )}
        </motion.div>

        {/* Compact Stats Grid - 2 rows on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4 grid grid-cols-2 gap-2 sm:mb-8 sm:grid-cols-7 sm:gap-4"
        >
          <div className="col-span-1">
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
              <CardContent className="p-2 text-center sm:p-4">
                <p className="text-[9px] text-muted-foreground sm:text-sm">Students</p>
                <p className="text-base font-bold sm:text-3xl">{stats.total}</p>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1">
            <Card>
              <CardContent className="p-2 text-center sm:p-4">
                <p className="text-[9px] text-muted-foreground sm:text-sm">Avg Score</p>
                <p className="text-base font-bold text-green-400 sm:text-3xl">{stats.avg}%</p>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1">
            <Card>
              <CardContent className="p-2 text-center sm:p-4">
                <p className="text-[9px] text-muted-foreground sm:text-sm">Pass Rate</p>
                <p className="text-base font-bold text-blue-400 sm:text-3xl">{stats.passRate}%</p>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1">
            <Card>
              <CardContent className="p-2 text-center sm:p-4">
                <p className="text-[9px] text-muted-foreground sm:text-sm">Highest</p>
                <p className="text-base font-bold text-yellow-400 sm:text-3xl">{stats.highest}%</p>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1">
            <Card>
              <CardContent className="p-2 text-center sm:p-4">
                <p className="text-[9px] text-muted-foreground sm:text-sm">Lowest</p>
                <p className="text-base font-bold text-red-400 sm:text-3xl">{stats.lowest}%</p>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1">
            <Card>
              <CardContent className="p-2 text-center sm:p-4">
                <p className="text-[9px] text-muted-foreground sm:text-sm">Suspicious</p>
                <p className="text-base font-bold text-orange-400 sm:text-3xl">{stats.suspicious}</p>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1">
            <Card>
              <CardContent className="p-2 text-center sm:p-4">
                <p className="text-[9px] text-muted-foreground sm:text-sm">Susp Score</p>
                <p className="text-base font-bold text-purple-400 sm:text-3xl">{stats.avgSuspicion}</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Filters Bar - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 sm:mb-6"
        >
          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground sm:h-4 sm:w-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-full rounded-md border bg-background pl-8 pr-7 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all sm:h-10 sm:pl-10 sm:pr-10 sm:text-sm"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className="flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium transition-all hover:bg-muted/50 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
                    >
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                      Filter
                      {riskFilter !== "ALL" && (
                        <span className="rounded-full bg-primary px-1 text-[8px] text-primary-foreground sm:px-1.5 sm:text-xs">
                          1
                        </span>
                      )}
                      <ChevronDown className={`h-3 w-3 transition-transform sm:h-4 sm:w-4 ${isFilterOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isFilterOpen && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md border bg-background p-1 shadow-lg sm:mt-2 sm:w-48 sm:p-2">
                        <button
                          onClick={() => {
                            setRiskFilter("ALL");
                            setIsFilterOpen(false);
                          }}
                          className={`w-full rounded px-2 py-1 text-left text-[10px] transition-colors hover:bg-muted sm:px-3 sm:py-2 sm:text-sm ${riskFilter === "ALL" ? "bg-primary/10 text-primary" : ""}`}
                        >
                          All Risks
                        </button>
                        <button
                          onClick={() => {
                            setRiskFilter("LOW");
                            setIsFilterOpen(false);
                          }}
                          className={`w-full rounded px-2 py-1 text-left text-[10px] transition-colors hover:bg-muted sm:px-3 sm:py-2 sm:text-sm ${riskFilter === "LOW" ? "bg-green-500/10 text-green-400" : ""}`}
                        >
                          Low Risk
                        </button>
                        <button
                          onClick={() => {
                            setRiskFilter("MEDIUM");
                            setIsFilterOpen(false);
                          }}
                          className={`w-full rounded px-2 py-1 text-left text-[10px] transition-colors hover:bg-muted sm:px-3 sm:py-2 sm:text-sm ${riskFilter === "MEDIUM" ? "bg-yellow-500/10 text-yellow-400" : ""}`}
                        >
                          Medium Risk
                        </button>
                        <button
                          onClick={() => {
                            setRiskFilter("HIGH");
                            setIsFilterOpen(false);
                          }}
                          className={`w-full rounded px-2 py-1 text-left text-[10px] transition-colors hover:bg-muted sm:px-3 sm:py-2 sm:text-sm ${riskFilter === "HIGH" ? "bg-red-500/10 text-red-400" : ""}`}
                        >
                          High Risk
                        </button>
                      </div>
                    )}
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:border-primary sm:h-10 sm:px-3 sm:text-sm"
                  >
                    <option value="risk">Sort: Risk</option>
                    <option value="score">Sort: Score</option>
                    <option value="name">Sort: Name</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results List - Compact */}
        {filteredAndSortedResults.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center sm:py-16">
              <UserCheck className="mb-3 h-8 w-8 text-muted-foreground/50 sm:h-12 sm:w-12" />
              <h3 className="text-sm font-semibold sm:text-lg">No students found</h3>
              <p className="text-xs text-muted-foreground sm:text-sm">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:gap-4">
            <p className="text-[10px] text-muted-foreground sm:text-sm">
              Showing {filteredAndSortedResults.length} of {results.length}
            </p>
            {filteredAndSortedResults.map((result, idx) => {
              const percentage = Math.round((result.score / result.maxScore) * 100);
              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="group overflow-hidden transition-all duration-300 hover:shadow-md">
                    <CardContent className="p-3 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        {/* Student Info */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold sm:h-10 sm:w-10 sm:text-sm">
                            {result.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h2 className="text-sm font-semibold group-hover:text-primary transition-colors sm:text-base">
                              {result.user.name}
                            </h2>
                            <p className="text-[10px] text-muted-foreground sm:text-sm line-clamp-1">{result.user.email}</p>
                          </div>
                        </div>

                        {/* Stats - Compact */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-center min-w-[55px] sm:min-w-[70px]">
                            <p className="text-[8px] text-muted-foreground sm:text-xs">Score</p>
                            <p className="text-xs font-bold sm:text-base">{result.score}/{result.maxScore}</p>
                          </div>
                          <div className="text-center min-w-[50px] sm:min-w-[60px]">
                            <p className="text-[8px] text-muted-foreground sm:text-xs">%</p>
                            <p className={`text-xs font-bold sm:text-base ${percentage >= 60 ? "text-green-400" : percentage >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                              {percentage}
                            </p>
                          </div>
                          <div className="text-center min-w-[55px] sm:min-w-[70px]">
                            <p className="text-[8px] text-muted-foreground sm:text-xs">Suspicion</p>
                            <p className="text-xs font-bold sm:text-base">{result.suspicionScore}</p>
                          </div>
                          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold sm:px-3 sm:py-1 sm:text-xs ${riskStyles[result.riskLevel]}`}>
                            {result.riskLevel}
                          </span>
                          <Button
                            onClick={() => setSelected(result)}
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs sm:h-9 sm:gap-2 sm:px-3"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            Details
                          </Button>
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="mt-2 h-1 w-full rounded-full bg-muted sm:mt-3 sm:h-1.5">
                        <div
                          className="h-1 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-500 sm:h-1.5"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL - Same as before but responsive */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-xl border bg-background shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-background/95 p-3 backdrop-blur-sm sm:p-6">
                <div>
                  <h2 className="text-base font-bold sm:text-2xl">{selected.user.name}</h2>
                  <p className="text-[10px] text-muted-foreground sm:text-sm">{selected.user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelected(null)}
                  className="h-7 w-7 rounded-full sm:h-9 sm:w-9"
                >
                  <X className="h-3 w-3 sm:h-5 sm:w-5" />
                </Button>
              </div>

              <div className="p-3 sm:p-6">
                {/* Compact Summary Cards */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-8 sm:grid-cols-4 sm:gap-4">
                  <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-2 sm:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="rounded-full bg-primary/10 p-1 sm:p-2">
                        <Trophy className="h-3 w-3 text-primary sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="text-[8px] text-muted-foreground sm:text-xs">Score</p>
                        <p className="text-xs font-bold sm:text-2xl">{selected.score}/{selected.maxScore}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-gradient-to-br from-purple-500/5 to-transparent p-2 sm:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="rounded-full bg-purple-500/10 p-1 sm:p-2">
                        <ShieldAlert className="h-3 w-3 text-purple-500 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="text-[8px] text-muted-foreground sm:text-xs">Suspicion</p>
                        <p className="text-xs font-bold sm:text-2xl">{selected.suspicionScore}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-gradient-to-br from-red-500/5 to-transparent p-2 sm:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="rounded-full bg-red-500/10 p-1 sm:p-2">
                        <AlertTriangle className="h-3 w-3 text-red-500 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="text-[8px] text-muted-foreground sm:text-xs">Risk</p>
                        <p className={`text-xs font-bold sm:text-xl ${riskStyles[selected.riskLevel].includes("text-red") ? "text-red-400" : riskStyles[selected.riskLevel].includes("text-yellow") ? "text-yellow-400" : "text-green-400"}`}>
                          {selected.riskLevel}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-gradient-to-br from-orange-500/5 to-transparent p-2 sm:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="rounded-full bg-orange-500/10 p-1 sm:p-2">
                        <Activity className="h-3 w-3 text-orange-500 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="text-[8px] text-muted-foreground sm:text-xs">Events</p>
                        <p className="text-xs font-bold sm:text-2xl">{selected.suspiciousEvents.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answer Review Section - Compact */}
                <div className="mb-4 sm:mb-8">
                  <h3 className="mb-2 text-sm font-semibold flex items-center gap-1 sm:mb-4 sm:text-xl sm:gap-2">
                    <FileText className="h-3 w-3 text-primary sm:h-5 sm:w-5" />
                    Answer Review
                  </h3>
                  <div className="grid gap-2 sm:gap-4">
                    {selected.review.map((question, index) => {
                      const isCorrect = question.earned === question.marks;
                      const isExpanded = expandedQuestions.has(question.id);
                      return (
                        <Card key={question.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div
                              className="flex cursor-pointer items-center justify-between p-2 transition-colors hover:bg-muted/30 sm:p-5"
                              onClick={() => toggleQuestionExpand(question.id)}
                            >
                              <div className="flex items-center gap-1.5 sm:gap-3">
                                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium sm:h-8 sm:w-8 ${isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                  {isCorrect ? <CheckCircle className="h-2.5 w-2.5 sm:h-4 sm:w-4" /> : <XCircle className="h-2.5 w-2.5 sm:h-4 sm:w-4" />}
                                </div>
                                <div>
                                  <p className="text-[9px] text-muted-foreground sm:text-sm">Q{index + 1}</p>
                                  <p className="text-[10px] font-medium line-clamp-1 sm:text-sm">{question.prompt}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-4">
                                <p className={`text-[9px] font-semibold sm:text-sm ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                                  {question.earned}/{question.marks}
                                </p>
                                <ChevronDown className={`h-2.5 w-2.5 transition-transform sm:h-4 sm:w-4 ${isExpanded ? "rotate-180" : ""}`} />
                              </div>
                            </div>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t p-2 space-y-2 sm:p-5 sm:space-y-3"
                              >
                                <div>
                                  <p className="text-[9px] font-medium text-muted-foreground sm:text-sm">Student's Answer:</p>
                                  <p className="mt-0.5 rounded-md bg-muted/30 p-2 text-[9px] sm:mt-1 sm:p-3 sm:text-sm">
                                    {String(question.yourAnswer || "Not answered")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-medium text-muted-foreground sm:text-sm">Correct Answer:</p>
                                  <p className="mt-0.5 rounded-md bg-green-500/5 p-2 text-[9px] sm:mt-1 sm:p-3 sm:text-sm">
                                    {String(question.correctAnswer)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-medium text-muted-foreground sm:text-sm">Explanation:</p>
                                  <p className="mt-0.5 text-[9px] text-muted-foreground sm:mt-1 sm:text-sm">
                                    {question.explanation}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Events Log Section - Compact */}
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:mb-4 sm:gap-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1 sm:text-xl sm:gap-2">
                      <AlertOctagon className="h-3 w-3 text-orange-500 sm:h-5 sm:w-5" />
                      Activity Log
                    </h3>
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold sm:px-3 sm:py-1.5 sm:text-xs ${riskStyles[selected.riskLevel]}`}>
                      {selected.riskLevel} RISK
                    </span>
                  </div>

                  {!selected.suspiciousEvents.length ? (
                    <Card>
                      <CardContent className="flex items-center gap-2 p-2 text-[10px] text-muted-foreground sm:gap-3 sm:p-5 sm:text-sm">
                        <ShieldAlert className="h-3 w-3 text-green-500 sm:h-5 sm:w-5" />
                        No suspicious activity detected.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="relative space-y-2 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border sm:space-y-3 sm:before:left-5 sm:before:top-3">
                      {selected.suspiciousEvents.map((event, index) => {
                        const severity = event.severity || 5;
                        const severityColor =
                          severity >= 20
                            ? "text-red-500"
                            : severity >= 10
                            ? "text-yellow-500"
                            : "text-green-500";
                        const formattedEvent = formatEventLabel(event.event);
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative pl-6 sm:pl-10"
                          >
                            <div className={`absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full sm:h-10 sm:w-10 ${severity >= 20 ? "bg-red-500/20" : severity >= 10 ? "bg-yellow-500/20" : "bg-green-500/20"}`}>
                              <AlertTriangle className={`h-2.5 w-2.5 ${severityColor} sm:h-4 sm:w-4`} />
                            </div>
                            <Card>
                              <CardContent className="flex items-center justify-between gap-2 p-2 sm:gap-4 sm:p-4">
                                <div className="flex-1">
                                  <p className="text-[10px] font-medium capitalize sm:text-sm">{formattedEvent}</p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[8px] text-muted-foreground sm:mt-1 sm:gap-3 sm:text-xs">
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="h-2 w-2 sm:h-3 sm:w-3" />
                                      {new Date(event.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-xs font-bold ${severityColor} sm:text-lg`}>+{severity}</p>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}