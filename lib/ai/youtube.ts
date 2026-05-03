import { YoutubeTranscript } from "youtube-transcript";

export function extractVideoId(url: string) {
  const parsed = new URL(url);
  if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
  return parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).pop() ?? "";
}

export async function fetchTranscript(url: string) {
  const rows = await YoutubeTranscript.fetchTranscript(url);
  return rows.map((row) => row.text).join(" ");
}
