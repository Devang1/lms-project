"use client";

import { useMemo, useState, useRef } from "react";
import { BookOpen, Download, FileText, Loader2, Printer, Sparkles, WandSparkles, Palette, ChevronRight, Target, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Question = {
  prompt: string;
  answer: string;
};

type Notes = {
  youtubeUrl: string;
  shortNotes: string;
  detailNotes: string;
  concepts: unknown;
  revision: unknown;
  questions: unknown;
};

type NoteBlock = {
  title?: string;
  body: string;
  items?: string[];
};

type Flashcard = {
  front: string;
  back: string;
};

type Theme = "handwritten" | "modern" | "minimal";

export function NotesClient() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>("modern");
  const [isExporting, setIsExporting] = useState(false);
  const notesRef = useRef<HTMLDivElement>(null);

  const formatted = useMemo(() => (notes ? formatNotes(notes) : null), [notes]);

  async function generate() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/ai/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtubeUrl: url })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not generate notes.");
      return;
    }
    setNotes(data);
  }

  async function exportAsPDF() {
    if (!notesRef.current || isExporting) return;

    setIsExporting(true);
    
    try {
      const element = notesRef.current;
      
      // Get the actual content
      element.style.display = "block";
      
      // Use html2canvas with better settings
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          // Increase font sizes in cloned document
          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              font-size: 16px !important;
              line-height: 1.6 !important;
            }
            h1 { font-size: 32px !important; margin: 20px 0 !important; }
            h2 { font-size: 24px !important; margin: 18px 0 12px 0 !important; }
            h3 { font-size: 20px !important; margin: 15px 0 10px 0 !important; }
            p, li, .text-sm { font-size: 16px !important; }
            .stat-card { padding: 15px !important; }
            .stat-number { font-size: 28px !important; }
            .concept-badge, .badge { font-size: 14px !important; padding: 6px 12px !important; }
            .revision-item { padding: 12px !important; margin: 8px 0 !important; }
            .detailed-card { padding: 20px !important; margin: 15px 0 !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      // Add additional pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`study-notes-${Date.now()}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsExporting(false);
    }
  }

  function exportDoc() {
    if (!formatted) return;
    const blob = new Blob([buildExportHtml(formatted, theme)], { type: "application/msword;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "star-study-point-notes.doc";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>AI YouTube notes generator</CardTitle>
          <CardDescription>One generation per student per day. Choose your preferred style for notes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input 
              value={url} 
              onChange={(event) => setUrl(event.target.value)} 
              placeholder="Paste a YouTube URL" 
              className="flex-1"
            />
            <Button onClick={generate} disabled={loading || !url}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
              Generate
            </Button>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <Palette size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Note style:</span>
            <ToggleGroup type="single" value={theme} onValueChange={(v) => v && setTheme(v as Theme)}>
              <ToggleGroupItem value="handwritten" aria-label="Handwritten style">
                ✍️ Handwritten
              </ToggleGroupItem>
              <ToggleGroupItem value="modern" aria-label="Modern style">
                💻 Modern
              </ToggleGroupItem>
              <ToggleGroupItem value="minimal" aria-label="Minimal style">
                📄 Minimal
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {formatted ? (
        <div className="grid gap-5">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Download your notes</p>
                <p className="text-sm text-muted-foreground">Export as high-quality  DOC file.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* <Button onClick={exportAsPDF} size="lg" disabled={isExporting}>
                  <Printer size={18} className="mr-2" /> 
                  {isExporting ? "Generating PDF..." : "Download PDF"}
                </Button> */}
                <Button onClick={exportDoc} size="lg" variant="secondary">
                  <Download size={18} className="mr-2" /> Download DOC
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attractive Notes Content */}
          <div ref={notesRef} className="pdf-export-container" style={{ background: "#ffffff", padding: "20px" }}>
            <AttractiveNotes formatted={formatted} theme={theme} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============ ATTRACTIVE NOTES COMPONENT ============
function AttractiveNotes({ formatted, theme }: { formatted: ReturnType<typeof formatNotes>; theme: Theme }) {
  const getThemeStyles = () => {
    switch (theme) {
      case "handwritten":
        return {
          containerBg: "bg-amber-50",
          cardBg: "bg-white",
          cardBorder: "border-amber-200",
          titleColor: "text-amber-900",
          textColor: "text-gray-800",
          accentBg: "bg-amber-100",
          accentColor: "text-amber-700",
          iconBg: "bg-amber-600",
          badgeBg: "bg-amber-100 text-amber-800",
          shadow: "shadow-md"
        };
      case "modern":
        return {
          containerBg: "bg-gradient-to-br from-slate-50 via-white to-blue-50",
          cardBg: "bg-white",
          cardBorder: "border-slate-200",
          titleColor: "text-slate-900",
          textColor: "text-slate-700",
          accentBg: "bg-blue-50",
          accentColor: "text-blue-700",
          iconBg: "bg-gradient-to-r from-blue-600 to-indigo-600",
          badgeBg: "bg-blue-100 text-blue-800",
          shadow: "shadow-lg shadow-slate-200/50"
        };
      default:
        return {
          containerBg: "bg-white",
          cardBg: "bg-white",
          cardBorder: "border-gray-200",
          titleColor: "text-gray-900",
          textColor: "text-gray-700",
          accentBg: "bg-gray-50",
          accentColor: "text-gray-700",
          iconBg: "bg-gray-800",
          badgeBg: "bg-gray-100 text-gray-800",
          shadow: "shadow-sm"
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className={`rounded-2xl overflow-hidden ${styles.containerBg} transition-all duration-300`}>
      {/* Hero Header */}
      <div className={`p-6 md:p-8 text-center border-b ${styles.cardBorder} bg-gradient-to-r from-white via-transparent to-transparent`}>
        <Badge className={`${styles.badgeBg} border-0 px-4 py-1.5 text-sm mb-4`}>
          <Sparkles className="w-3 h-3 inline mr-1" />
          Star Study Point
        </Badge>
        <h1 className={`text-2xl md:text-4xl font-bold mb-2 ${styles.titleColor}`}>
          AI Study Notes
        </h1>
        <p className={`text-xs md:text-sm ${styles.textColor} opacity-70 max-w-2xl mx-auto break-all`}>
          {formatted.source}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-4 md:p-6">
        <div className={`p-3 md:p-4 rounded-xl text-center ${styles.cardBg} ${styles.cardBorder} border ${styles.shadow}`}>
          <Clock className={`w-4 h-4 md:w-5 md:h-5 mx-auto mb-2 ${styles.accentColor}`} />
          <div className={`text-lg md:text-2xl font-bold ${styles.titleColor}`}>
            {Math.ceil(formatted.shortBlocks.length * 0.3)} min
          </div>
          <div className={`text-xs ${styles.textColor}`}>Quick read</div>
        </div>
        <div className={`p-3 md:p-4 rounded-xl text-center ${styles.cardBg} ${styles.cardBorder} border ${styles.shadow}`}>
          <Target className={`w-4 h-4 md:w-5 md:h-5 mx-auto mb-2 ${styles.accentColor}`} />
          <div className={`text-lg md:text-2xl font-bold ${styles.titleColor}`}>
            {formatted.concepts.length}
          </div>
          <div className={`text-xs ${styles.textColor}`}>Key concepts</div>
        </div>
        <div className={`p-3 md:p-4 rounded-xl text-center ${styles.cardBg} ${styles.cardBorder} border ${styles.shadow}`}>
          <BookOpen className={`w-4 h-4 md:w-5 md:h-5 mx-auto mb-2 ${styles.accentColor}`} />
          <div className={`text-lg md:text-2xl font-bold ${styles.titleColor}`}>
            {formatted.detailBlocks.length}
          </div>
          <div className={`text-xs ${styles.textColor}`}>Topics</div>
        </div>
        <div className={`p-3 md:p-4 rounded-xl text-center ${styles.cardBg} ${styles.cardBorder} border ${styles.shadow}`}>
          <FileText className={`w-4 h-4 md:w-5 md:h-5 mx-auto mb-2 ${styles.accentColor}`} />
          <div className={`text-lg md:text-2xl font-bold ${styles.titleColor}`}>
            {formatted.revision.length}
          </div>
          <div className={`text-xs ${styles.textColor}`}>Key points</div>
        </div>
      </div>

      {/* Short Notes Section */}
      <div className="px-4 md:px-6 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${styles.iconBg}`}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className={`text-lg md:text-2xl font-bold ${styles.titleColor}`}>Quick Summary</h2>
            <p className={`text-xs ${styles.textColor}`}>Bite-sized points for fast revision</p>
          </div>
        </div>
        <div className="grid gap-3">
          {formatted.shortBlocks.slice(0, 6).map((block: NoteBlock, idx: number) => (
            <div key={idx} className={`p-3 md:p-4 rounded-xl ${styles.cardBg} border ${styles.cardBorder} ${styles.shadow} transition-all hover:shadow-lg hover:translate-x-1 duration-300`}>
              <div className="flex gap-3">
                <div className={`w-6 h-6 rounded-full ${styles.iconBg} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>
                  {idx + 1}
                </div>
                <p className={`text-sm md:text-base leading-relaxed ${styles.textColor}`}>{block.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Concepts */}
      <div className="px-4 md:px-6 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${styles.iconBg}`}>
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className={`text-lg md:text-2xl font-bold ${styles.titleColor}`}>Key Concepts</h2>
            <p className={`text-xs ${styles.textColor}`}>Essential terms to remember</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {formatted.concepts.map((concept: string, idx: number) => (
            <Badge key={idx} className={`${styles.badgeBg} border-0 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-normal hover:scale-105 transition-transform cursor-default`}>
              {concept}
            </Badge>
          ))}
        </div>
      </div>

      {/* Detailed Notes Section */}
      <div className="px-4 md:px-6 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${styles.iconBg}`}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className={`text-lg md:text-2xl font-bold ${styles.titleColor}`}>Detailed Notes</h2>
            <p className={`text-xs ${styles.textColor}`}>In-depth explanation with examples</p>
          </div>
        </div>
        <div className="space-y-4">
          {formatted.detailBlocks.map((block: NoteBlock, idx: number) => (
            <div key={idx} className={`p-4 md:p-5 rounded-xl ${styles.cardBg} border ${styles.cardBorder} ${styles.shadow}`}>
              {block.title && (
                <h3 className={`text-base md:text-xl font-semibold mb-3 pb-2 border-b ${styles.cardBorder} ${styles.titleColor}`}>
                  {humanizeLabel(block.title)}
                </h3>
              )}
              <p className={`text-sm md:text-base leading-relaxed ${styles.textColor}`}>{block.body}</p>
              {block.items && block.items.length > 0 && (
                <div className={`mt-4 p-3 rounded-lg ${styles.accentBg}`}>
                  <p className={`text-xs md:text-sm font-semibold mb-2 ${styles.accentColor}`}>Key takeaways:</p>
                  <ul className="space-y-1">
                    {block.items.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs md:text-sm">
                        <ChevronRight className={`w-3 h-3 mt-0.5 shrink-0 ${styles.accentColor}`} />
                        <span className={styles.textColor}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Revision Checklist */}
      <div className="px-4 md:px-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${styles.iconBg}`}>
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className={`text-lg md:text-2xl font-bold ${styles.titleColor}`}>Revision Checklist</h2>
            <p className={`text-xs ${styles.textColor}`}>Quick review before exams</p>
          </div>
        </div>
        <div className="space-y-2">
          {formatted.revision.slice(0, 8).map((item: string, idx: number) => (
            <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${styles.cardBg} border ${styles.cardBorder} transition-all hover:translate-x-1 duration-300`}>
              <div className={`w-5 h-5 rounded-full ${styles.iconBg} flex items-center justify-center text-white text-xs font-bold`}>
                {idx + 1}
              </div>
              <p className={`text-sm md:text-base flex-1 ${styles.textColor}`}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={`p-4 text-center border-t ${styles.cardBorder} ${styles.accentBg}`}>
        <p className={`text-xs ${styles.textColor}`}>
          Generated with AI • Study smart, not hard
        </p>
      </div>
    </div>
  );
}

// Helper functions
function formatNotes(notes: Notes) {
  return {
    source: notes.youtubeUrl,
    shortBlocks: toBlocks(notes.shortNotes),
    detailBlocks: toBlocks(notes.detailNotes),
    concepts: toStringArray(notes.concepts),
    revision: toStringArray(notes.revision),
    questions: toQuestions(notes.questions),
    flashcards: toFlashcards(notes)
  };
}

function toFlashcards(notes: Notes): Flashcard[] {
  const concepts = toStringArray(notes.concepts).slice(0, 8);
  const revision = toStringArray(notes.revision).slice(0, 8);
  const questions = toQuestions(notes.questions).slice(0, 6);
  const detailBlocks = toBlocks(notes.detailNotes).slice(0, 6);

  const conceptCards = concepts.map((concept, index) => ({
    front: `What should you remember about ${concept}?`,
    back: revision[index] ?? "Explain the concept, formula, and one example in your own words."
  }));

  const detailCards = detailBlocks
    .filter((block) => block.title || block.body)
    .map((block) => ({
      front: block.title ? humanizeLabel(block.title) : block.body.slice(0, 90),
      back: block.items?.length ? block.items.join("\n") : block.body
    }));

  const questionCards = questions.map((question) => ({
    front: question.prompt,
    back: question.answer
  }));

  return [...conceptCards, ...detailCards, ...questionCards]
    .filter((card) => card.front && card.back)
    .slice(0, 12);
}

function toBlocks(value: unknown): NoteBlock[] {
  const parsed = parseMaybeJson(value);

  if (Array.isArray(parsed)) {
    return parsed.map((item) => objectToBlock(item));
  }

  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed as Record<string, unknown>).map(([title, content]) => {
      if (Array.isArray(content)) return { title, body: "", items: content.map(stringifyValue) };
      if (content && typeof content === "object") return objectToBlock({ title, ...(content as Record<string, unknown>) });
      return { title, body: stringifyValue(content) };
    });
  }

  return String(parsed ?? "")
    .split(/\n{2,}/)
    .map((body) => ({ body: body.trim() }))
    .filter((block) => block.body);
}

function objectToBlock(value: unknown): NoteBlock {
  if (typeof value === "string") return { body: value };
  if (!value || typeof value !== "object") return { body: stringifyValue(value) };
  const record = value as Record<string, unknown>;
  const title = typeof record.heading === "string" ? record.heading : typeof record.title === "string" ? record.title : undefined;
  const body = stringifyValue(record.content ?? record.body ?? record.answer ?? "");
  const items = Array.isArray(record.items) ? record.items.map(stringifyValue) : undefined;
  return { title, body, items };
}

function toStringArray(value: unknown): string[] {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed.map(stringifyValue);
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed as Record<string, unknown>).map(([key, item]) => `${humanizeLabel(key)}: ${stringifyValue(item)}`);
  }
  return String(parsed ?? "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toQuestions(value: unknown): Question[] {
  const parsed = parseMaybeJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return {
        prompt: stringifyValue(record.prompt ?? record.question ?? ""),
        answer: stringifyValue(record.answer ?? record.solution ?? "")
      };
    }
    return { prompt: stringifyValue(item), answer: "" };
  });
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(stringifyValue).join("\n");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value ?? "");
}

function humanizeLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildExportHtml(notes: ReturnType<typeof formatNotes>, theme: Theme) {
  const isHandwritten = theme === "handwritten";
  
  const section = (title: string, blocks: NoteBlock[]) => `
    <section>
      <h2>${escapeHtml(title)}</h2>
      ${blocks
        .map(
          (block) => `
            <article>
              ${block.title ? `<h3>${escapeHtml(humanizeLabel(block.title))}</h3>` : ""}
              ${block.body ? `<p>${escapeHtml(block.body).replace(/\n/g, "<br>")}</p>` : ""}
              ${block.items?.length ? `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
            </article>`
        )
        .join("")}
    </section>`;

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Star Study Point Notes</title>
      <style>
        body { 
          font-family: ${isHandwritten ? "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive" : theme === "modern" ? "'Inter', 'Segoe UI', sans-serif" : "'Georgia', 'Times New Roman', serif"}; 
          color: #172033; 
          line-height: 1.6; 
          margin: 40px;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: ${isHandwritten ? "#fef9e8" : "#ffffff"};
          font-size: 16px;
        }
        .cover { 
          background: ${isHandwritten ? "#d2691e" : "#1d4ed8"}; 
          color: white; 
          padding: 30px; 
          border-radius: ${isHandwritten ? "4px" : "8px"};
          border: ${isHandwritten ? "2px dashed #8b4513" : "none"};
          margin-bottom: 30px;
        }
        .cover p { color: ${isHandwritten ? "#fff3e0" : "#dbeafe"}; }
        h1 { margin: 0; font-size: 32px; }
        h2 { 
          color: ${isHandwritten ? "#d2691e" : "#1d4ed8"}; 
          border-bottom: ${isHandwritten ? "2px dashed #d2691e" : "2px solid #dbeafe"}; 
          padding-bottom: 8px; 
          margin-top: 30px;
          margin-bottom: 20px;
          font-size: 24px;
        }
        h3 { color: ${isHandwritten ? "#8b4513" : "#0f766e"}; margin-bottom: 10px; font-size: 20px; }
        p, li { font-size: 16px; line-height: 1.6; }
        article { 
          border: ${isHandwritten ? "2px dashed #d2691e" : "1px solid #d8dee9"}; 
          border-radius: ${isHandwritten ? "4px" : "8px"}; 
          padding: 20px; 
          margin: 16px 0;
          background: ${isHandwritten ? "#fffaf0" : "transparent"};
          box-shadow: ${isHandwritten ? "4px 4px 0 rgba(139, 69, 19, 0.1)" : "none"};
        }
        .chip { 
          display: inline-block; 
          border: ${isHandwritten ? "1px dashed #d2691e" : "1px solid #99f6e4"}; 
          background: ${isHandwritten ? "#fff3e0" : "#f0fdfa"}; 
          border-radius: 8px; 
          padding: 6px 12px; 
          margin: 4px;
          font-size: 14px;
          color: ${isHandwritten ? "#8b4513" : "inherit"};
        }
        @media print {
          body { margin: 0; padding: 20px; }
          article { break-inside: avoid; page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="cover">
        <h1>Star Study Point AI Study Notes</h1>
        <p>${escapeHtml(notes.source)}</p>
      </div>
      ${section("Quick Revision", notes.shortBlocks)}
      <section>
        <h2>Key Concepts</h2>
        ${notes.concepts.map((concept) => `<span class="chip">${escapeHtml(concept)}</span>`).join("")}
      </section>
      ${section("Detailed Notes", notes.detailBlocks)}
      <section>
        <h2>Revision Points</h2>
        <ol>${notes.revision.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </section>
    </body>
  </html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
