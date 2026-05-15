"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormAction = (formData: FormData) => void | Promise<void>;

export function ManualTestBuilder({
  action,
  defaultTopic
}: {
  action: FormAction;
  defaultTopic: string;
}) {
  const [questionCount, setQuestionCount] = useState(1);
  const questionIndexes = Array.from({ length: questionCount }, (_, index) => index);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="questionCount" value={questionCount} />
      <Input name="title" placeholder="Full test title, e.g. Newton's Laws Concept Check" required />
      <Input name="topic" placeholder="Topic, e.g. Laws of Motion" defaultValue={defaultTopic} required />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input name="durationMin" type="number" min={5} max={240} defaultValue={45} placeholder="Duration in minutes, e.g. 45" required />
        <select name="status" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="ACTIVE">
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ACTIVE">Active now</option>
        </select>
      </div>

      <div className="grid gap-3">
        {questionIndexes.map((index) => (
          <div className="grid gap-3 rounded-md border bg-muted/30 p-3" key={index}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Question {index + 1}</p>
              {questionCount > 1 ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setQuestionCount((value) => Math.max(1, value - 1))}>
                  <Trash2 size={15} /> Remove last
                </Button>
              ) : null}
            </div>
            <select name={`questions.${index}.kind`} className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="MCQ">
              <option value="MCQ">MCQ</option>
              <option value="FIND_MISTAKE">Find the Mistake</option>
              <option value="MISSING_STEP">Missing Step</option>
              <option value="ORDER">Arrange in Correct Order</option>
              <option value="SCENARIO">Scenario Reasoning</option>
            </select>
            <Textarea
              name={`questions.${index}.scenario`}
              placeholder="Optional scenario/context, e.g. A student is solving a pulley problem and makes a claim..."
            />
            <Textarea
              name={`questions.${index}.prompt`}
              placeholder="Question prompt, e.g. Find the mistake in this solution step..."
              required
            />
            <Textarea
              name={`questions.${index}.options`}
              placeholder="Options or ordered steps, one per line. For arrange-order, enter the correct order here."
              required
            />
            <Input
              name={`questions.${index}.answer`}
              placeholder="Correct answer exactly as written above. Leave blank for arrange-order."
            />
            <Textarea
              name={`questions.${index}.explanation`}
              placeholder="Short explanation students will see after submission"
              required
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name={`questions.${index}.marks`} type="number" min={1} max={20} defaultValue={4} placeholder="Marks, e.g. 4" required />
              <Input name={`questions.${index}.negative`} type="number" min={0} max={10} defaultValue={0} placeholder="Negative marks, e.g. 0" required />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setQuestionCount((value) => value + 1)}>
          <Plus size={16} /> Add question
        </Button>
        <Button type="submit">Create manual test</Button>
      </div>
    </form>
  );
}
