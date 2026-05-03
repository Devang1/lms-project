"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { createPostAction } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FeedComposerProps = {
  userName: string;
};

type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export function FeedComposer({ userName }: FeedComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function onFileChange(file?: File) {
    setError("");
    setImageUrl("");
    if (!file) {
      setPreviewUrl("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      fileRef.current!.value = "";
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadImage(file: File) {
    const signatureResponse = await fetch("/api/uploads/cloudinary-signature", { method: "POST" });
    const signature = await signatureResponse.json() as CloudinarySignature & { error?: string };
    if (!signatureResponse.ok) throw new Error(signature.error ?? "Could not prepare image upload.");

    const body = new FormData();
    body.set("file", file);
    body.set("api_key", signature.apiKey);
    body.set("timestamp", String(signature.timestamp));
    body.set("folder", signature.folder);
    body.set("signature", signature.signature);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: "POST",
      body
    });
    const uploaded = await uploadResponse.json() as { secure_url?: string; error?: { message?: string } };
    if (!uploadResponse.ok || !uploaded.secure_url) {
      throw new Error(uploaded.error?.message ?? "Image upload failed.");
    }
    return uploaded.secure_url;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const file = fileRef.current?.files?.[0];
    if (!file || imageUrl) return;

    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const uploadedUrl = await uploadImage(file);
        setImageUrl(uploadedUrl);
        window.setTimeout(() => formRef.current?.requestSubmit(), 0);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
      }
    });
  }

  function clearImage() {
    setImageUrl("");
    setPreviewUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function publishPost(formData: FormData) {
    await createPostAction(formData);
    formRef.current?.reset();
    clearImage();
    router.push("/feed");
    router.refresh();
  }

  return (
    <form ref={formRef} action={publishPost} onSubmit={handleSubmit} className="grid gap-3 p-4">
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <div className="flex gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {userName.charAt(0)}
        </div>
        <Textarea
          name="content"
          placeholder="Post your study win, score, notes, streak, or goal..."
          required
          className="min-h-24 resize-none border-0 bg-muted/60 focus-visible:ring-1"
        />
      </div>
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-md border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- Local selected-file previews are browser object URLs. */}
          <img src={previewUrl} alt="" className="max-h-80 w-full object-cover" />
          <Button type="button" variant="secondary" size="icon" className="absolute right-3 top-3" onClick={clearImage} aria-label="Remove selected image">
            <X size={17} />
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="studyHours" type="number" step="0.5" placeholder="Study hours" />
        <Input name="mockScore" type="number" step="0.1" placeholder="Test score %" />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition hover:bg-muted">
          <ImagePlus size={16} />
          {previewUrl ? "Change image" : "Upload image"}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => onFileChange(event.target.files?.[0])} />
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Share
        </Button>
      </div>
      {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
