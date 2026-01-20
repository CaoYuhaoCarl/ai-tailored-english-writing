#!/usr/bin/env node
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";

const API_KEY = process.env.HANDWRITING_OCR_API_KEY;
const BASE_URL = process.env.HANDWRITING_OCR_BASE_URL || "https://www.handwritingocr.com/api/v3";
const OUTPUT_DIR = resolve(process.cwd(), process.env.OCR_RECOVERY_DIR || "ocr_logs/recovered");

const ids = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
if (!ids.length) {
  console.error("Usage: HANDWRITING_OCR_API_KEY=... node server/recover-ocr-docs.js <id1> [id2 id3...]");
  process.exit(1);
}

if (!API_KEY) {
  console.error("HANDWRITING_OCR_API_KEY is required to recover OCR documents.");
  process.exit(1);
}

const collectTranscript = (results = []) =>
  results
    .map((page) => page?.transcript || "")
    .filter(Boolean)
    .join("\n\n")
    .trim();

const fetchDocument = async (id) => {
  const response = await fetch(`${BASE_URL}/documents/${id}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    console.error(`Fetch failed for ${id}: ${response.status} ${response.statusText}`);
    return null;
  }

  const data = await response.json();
  if (data?.status !== "processed") {
    console.warn(`Document ${id} not ready (status: ${data?.status || "unknown"})`);
    return null;
  }

  const transcript = collectTranscript(data.results || []);
  if (!transcript) {
    console.warn(`Document ${id} returned empty transcript`);
    return null;
  }

  return transcript;
};

const saveMarkdown = async (id, transcript) => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const filename = `recovered_${id}.md`;
  const payload = `# OCR Transcript (Recovered ${id})\n\n${transcript}\n`;
  await writeFile(resolve(OUTPUT_DIR, filename), payload, "utf-8");
  return filename;
};

const run = async () => {
  for (const id of ids) {
    try {
      const transcript = await fetchDocument(id);
      if (!transcript) continue;
      const filename = await saveMarkdown(id, transcript);
      console.log(`Saved ${id} -> ${filename}`);
    } catch (err) {
      console.error(`Failed to recover ${id}:`, err?.message || err);
    }
  }
};

run();
