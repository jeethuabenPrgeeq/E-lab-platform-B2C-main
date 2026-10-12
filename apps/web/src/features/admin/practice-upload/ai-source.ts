export const SOURCE_TYPES = ["pdf", "docx", "html", "url", "text", "prompt"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const MIN_TEXT_CHARS = 100;
export const MAX_CONTENT_CHARS = 50000;
export const MAX_PDF_PAGES = 60;

export interface SourceMeta {
  label: string;
  description: string;
  accept?: string;
  extensions?: string[];
}

export const SOURCE_META: Record<SourceType, SourceMeta> = {
  pdf: { label: "PDF", description: "Notes, slides or a book chapter", accept: ".pdf,application/pdf", extensions: ["pdf"] },
  docx: {
    label: "Word",
    description: "DOC or DOCX lesson material",
    accept: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: ["doc", "docx"],
  },
  html: { label: "HTML", description: "A saved web page or tutorial", accept: ".html,.htm,text/html", extensions: ["html", "htm"] },
  url: { label: "URL", description: "A public link to a tutorial or doc" },
  text: { label: "Text", description: "Paste content directly" },
  prompt: { label: "Prompt", description: "Topic and instructions only" },
};

export interface FileMeta {
  name: string;
  size: number;
}

export interface ExtractedSection {
  id: string;
  title: string;
  body: string;
  included: boolean;
}

export interface ExtractedContent {
  sections: ExtractedSection[];
  simulated: boolean;
}

export function isFileSource(type: SourceType | null) {
  return type === "pdf" || type === "docx" || type === "html";
}

export function checkFile(type: SourceType, file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const meta = SOURCE_META[type];
  if (meta.extensions && !meta.extensions.includes(extension)) {
    return `Choose a ${meta.extensions.map((ext) => `.${ext}`).join(" or ")} file`;
  }
  if (file.size === 0) return "This file is empty";
  if (file.size > MAX_SOURCE_BYTES) return "File is larger than 10 MB";
  return null;
}

export function checkUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? null : "Use an http or https link";
  } catch {
    return "Enter a full link, for example https://example.com/arrays";
  }
}

export function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const HEADING_PATTERN = /^(#{1,3}\s+\S|\d+(\.\d+)*[.)]?\s+\S|[A-Z][^.!?]*$)/;

function isHeading(line: string) {
  return line.length >= 3 && line.length <= 60 && !/[.,;:]$/.test(line) && HEADING_PATTERN.test(line);
}

function cleanHeading(line: string) {
  return line
    .replace(/^#{1,3}\s+/, "")
    .replace(/^\d+(\.\d+)*[.)]?\s+/, "")
    .trim();
}

let sectionCounter = 0;

function makeSection(title: string, lines: string[]): ExtractedSection {
  sectionCounter += 1;
  return {
    id: `s${Date.now().toString(36)}${sectionCounter.toString(36)}`,
    title,
    body: lines.join("\n").trim(),
    included: true,
  };
}

function buildSections(blocks: { text: string; heading: boolean }[]) {
  const sections: ExtractedSection[] = [];
  let title = "";
  let lines: string[] = [];

  const flush = () => {
    if (title || lines.length > 0) sections.push(makeSection(title || "Introduction", lines));
  };

  blocks.forEach((block) => {
    if (block.heading) {
      flush();
      title = block.text;
      lines = [];
    } else {
      lines.push(block.text);
    }
  });
  flush();

  return sections.filter((section) => section.body.length > 0).slice(0, 40);
}

function textToSections(text: string) {
  const blocks = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (isHeading(line) ? { text: cleanHeading(line), heading: true } : { text: line, heading: false }));
  return buildSections(blocks);
}

function htmlToSections(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, nav, footer, header, iframe, svg").forEach((node) => node.remove());
  const blocks: { text: string; heading: boolean }[] = [];
  doc.body.querySelectorAll("h1, h2, h3, h4, p, li, pre, td, th, blockquote").forEach((node) => {
    const value = node.textContent?.replace(/\s+/g, " ").trim();
    if (!value) return;
    const heading = /^H[1-4]$/.test(node.tagName);
    blocks.push({ text: node.tagName === "LI" ? `• ${value}` : value, heading });
  });
  if (blocks.length === 0) {
    const fallback = (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
    return fallback ? [makeSection("Content", [fallback])] : [];
  }
  return buildSections(blocks);
}

export function joinSections(sections: ExtractedSection[]) {
  return sections
    .filter((section) => section.included)
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n")
    .slice(0, MAX_CONTENT_CHARS);
}

async function readPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_PDF_PAGES); pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      }
    }
    if (line) lines.push(line);
  }
  await doc.destroy();
  return lines.join("\n");
}

async function readDocxHtml(file: File) {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

export async function extractContent(type: SourceType, input: { file?: File | null; url?: string; text?: string }): Promise<ExtractedContent> {
  if (type === "text") {
    return { sections: textToSections((input.text ?? "").slice(0, MAX_CONTENT_CHARS)), simulated: false };
  }

  if (type === "html" && input.file) {
    return { sections: htmlToSections((await input.file.text()).slice(0, MAX_CONTENT_CHARS * 4)), simulated: false };
  }

  if (type === "pdf" && input.file) {
    const text = await readPdfText(input.file);
    if (!text.trim()) throw new Error("This PDF has no selectable text. Scanned PDFs need OCR on the server.");
    return { sections: textToSections(text.slice(0, MAX_CONTENT_CHARS)), simulated: false };
  }

  if (type === "docx" && input.file) {
    if (input.file.name.toLowerCase().endsWith(".doc")) {
      throw new Error("Old .doc files cannot be read. Open it in Word and save as .docx.");
    }
    return { sections: htmlToSections(await readDocxHtml(input.file)), simulated: false };
  }

  if (type === "url" && input.url) {
    let response: Response;
    try {
      response = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.url }),
      });
    } catch {
      throw new Error("Could not reach the app server. Check that it is running and try again.");
    }
    const raw = await response.text();
    let data: { html?: string; error?: string };
    try {
      data = JSON.parse(raw) as { html?: string; error?: string };
    } catch {
      throw new Error(response.status === 404 ? "URL reader not found. Add the route at src/app/api/extract-url/route.ts and restart the dev server." : `URL reader failed on the server (${response.status}). Check the terminal running the app.`);
    }
    if (!response.ok || !data.html) throw new Error(data.error ?? "Could not read this page");
    return { sections: htmlToSections(data.html), simulated: false };
  }

  throw new Error("Choose a source to extract");
}
