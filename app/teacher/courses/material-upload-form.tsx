"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";
import { uploadLessonMaterialAction } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export function MaterialUploadForm({ courseId }: { courseId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [materialUrl, setMaterialUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function uploadFile(file: File) {
    const signatureResponse = await fetch("/api/uploads/cloudinary-signature", { method: "POST" });
    const signature = await signatureResponse.json() as CloudinarySignature & { error?: string };
    if (!signatureResponse.ok) throw new Error(signature.error ?? "Could not prepare upload.");

    const body = new FormData();
    body.set("file", file);
    body.set("api_key", signature.apiKey);
    body.set("timestamp", String(signature.timestamp));
    body.set("folder", signature.folder);
    body.set("signature", signature.signature);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`, {
      method: "POST",
      body
    });
    const uploaded = await uploadResponse.json() as { secure_url?: string; error?: { message?: string } };
    if (!uploadResponse.ok || !uploaded.secure_url) {
      throw new Error(uploaded.error?.message ?? "File upload failed.");
    }
    return uploaded.secure_url;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const file = fileRef.current?.files?.[0];
    if (!file || materialUrl) return;

    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const url = await uploadFile(file);
        setMaterialUrl(url);
        window.setTimeout(() => formRef.current?.requestSubmit(), 0);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "File upload failed.");
      }
    });
  }

  async function saveMaterial(formData: FormData) {
    await uploadLessonMaterialAction(courseId, formData);
    formRef.current?.reset();
    setMaterialUrl("");
    setFileName("");
  }

  return (
    <form ref={formRef} action={saveMaterial} onSubmit={onSubmit} className="mt-3 grid gap-2">
      <input type="hidden" name="materialUrl" value={materialUrl} />
      <Input name="title" placeholder="Chapter / module title" required />
      <Textarea name="content" placeholder="Lesson notes, assignment, or practice instructions" required />
      <Input name="videoUrl" placeholder="Optional video URL" />
      <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted">
        <FileUp size={16} />
        <span className="truncate">{fileName || "Upload PDF, image, document, or slides"}</span>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setMaterialUrl("");
            setFileName(file?.name ?? "");
          }}
        />
      </label>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
        Add module
      </Button>
      {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
