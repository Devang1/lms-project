import Link from "next/link";
import { ArrowRight, BrainCircuit, Flame, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const pillars = [
  ["AI Tutor", "Gemini notes, doubts, and daily topic questions with fair-use controls.", BrainCircuit],
  ["Hero Progression", "XP, streaks, superhero ranks, seasonal rewards, and badges.", Flame],
  ["Competitive Tests", "Weekly randomized tests, auto grading, rank reports, and anti-cheat flags.", ShieldCheck],
  ["Social Momentum", "Progress posts, peer doubt solving, verified answers, and mentor status.", Trophy]
] as const;

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="hero-grid relative overflow-hidden">
        <div className="mx-auto grid min-h-[88vh] max-w-7xl content-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="accent">Star Study Point</Badge>
            <h1 className="mt-5 text-4xl font-bold tracking-normal sm:text-6xl">
              AI-powered competitive exam LMS with heroic student momentum.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Courses, ranks, streaks, AI notes, weekly tests, anti-cheat controls, and a social study network built for serious coaching teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Open platform <ArrowRight size={18} /></Link>
              </Button>
            </div>
          </div>
          <div className="grid content-center gap-4">
            {pillars.map(([title, text, Icon]) => (
              <Card key={title} className="glass">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <Icon size={21} />
                  </div>
                  <div>
                    <h2 className="font-semibold">{title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
