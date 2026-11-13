import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ClaimCategory,
  ConfidenceLevel,
  ExtractedClaim,
  SourceFile,
  SourceFormat,
  SourcePage,
  TaskProgressStatus,
} from '../types/neash';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function detectFormat(filename: string): SourceFormat {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'pdf':
      return 'PDF';
    case 'txt':
      return 'TXT';
    case 'csv':
      return 'CSV';
    case 'md':
    case 'markdown':
      return 'MD';
    case 'json':
      return 'JSON';
    default:
      return 'UNSUPPORTED';
  }
}

export async function readUploadedFile(
  file: File,
  projectId: string
): Promise<SourceFile> {
  const format = detectFormat(file.name);
  const id = `src-up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const uploadedAt = new Date().toISOString();

  if (format === 'UNSUPPORTED') {
    return {
      id,
      projectId,
      name: file.name,
      format: 'UNSUPPORTED',
      sizeBytes: file.size,
      uploadedAt,
      status: 'Unsupported',
      origin: 'uploaded',
      content: '',
      extractionNote: `Unsupported file format (.${file.name.split('.').pop() || 'unknown'}). Supported formats: PDF, TXT, CSV, MD, JSON.`,
    };
  }

  try {
    if (format === 'PDF') {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const pages: SourcePage[] = [];
      const fullSections: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        pages.push({
          pageNumber: pageNum,
          title: `Page ${pageNum}`,
          text: pageText || '(No selectable text found on this page)',
        });
        fullSections.push(`--- Page ${pageNum} ---\n${pageText}`);
      }

      const combined = fullSections.join('\n\n').trim();
      const hasText = pages.some(
        (p) => p.text && p.text !== '(No selectable text found on this page)'
      );

      if (!hasText) {
        return {
          id,
          projectId,
          name: file.name,
          format: 'PDF',
          sizeBytes: file.size,
          uploadedAt,
          status: 'Error',
          origin: 'uploaded',
          content: '',
          pages,
          extractionNote:
            'PDF appears to be scanned/image-only with no extractable text layer.',
        };
      }

      return {
        id,
        projectId,
        name: file.name,
        format: 'PDF',
        sizeBytes: file.size,
        uploadedAt,
        status: 'Ready',
        origin: 'uploaded',
        content: combined,
        pages,
        extractionNote: `Uploaded PDF — Extracted ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} locally via PDF.js.`,
      };
    }

    const rawText = await file.text();
    if (!rawText.trim()) {
      return {
        id,
        projectId,
        name: file.name,
        format,
        sizeBytes: file.size,
        uploadedAt,
        status: 'Error',
        origin: 'uploaded',
        content: '',
        extractionNote: 'File is empty or contains no readable text.',
      };
    }

    let normalizedContent = rawText;
    let note = `Uploaded ${format} — Actual file contents read in browser.`;

    if (format === 'JSON') {
      try {
        const parsed = JSON.parse(rawText);
        normalizedContent = JSON.stringify(parsed, null, 2);
        note = 'Uploaded JSON — Parsed and formatted locally.';
      } catch {
        return {
          id,
          projectId,
          name: file.name,
          format: 'JSON',
          sizeBytes: file.size,
          uploadedAt,
          status: 'Error',
          origin: 'uploaded',
          content: rawText,
          extractionNote: 'Invalid JSON syntax — unable to parse structured records.',
        };
      }
    }

    return {
      id,
      projectId,
      name: file.name,
      format,
      sizeBytes: file.size,
      uploadedAt,
      status: 'Ready',
      origin: 'uploaded',
      content: normalizedContent,
      extractionNote: note,
    };
  } catch (err) {
    return {
      id,
      projectId,
      name: file.name,
      format,
      sizeBytes: file.size,
      uploadedAt,
      status: 'Error',
      origin: 'uploaded',
      content: '',
      extractionNote:
        err instanceof Error
          ? `Failed to read file: ${err.message}`
          : 'Failed to read uploaded file.',
    };
  }
}

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

function classifyTextLine(text: string): {
  category: ClaimCategory;
  confidence: ConfidenceLevel;
} {
  const lower = text.toLowerCase();
  if (
    /\b(block|blocker|blocked|waiting on|unavailable|cannot proceed|stuck)\b/.test(
      lower
    )
  ) {
    return { category: 'Blocker', confidence: 'High' };
  }
  if (
    /\b(decided|decision|selected|chosen|agreed|approved architecture|standardized)\b/.test(
      lower
    )
  ) {
    return { category: 'Decision', confidence: 'High' };
  }
  if (/\b(risk|threat|delay|latency|warning|vulnerable|dependency)\b/.test(lower)) {
    return { category: 'Risk', confidence: 'Medium' };
  }
  if (
    /\b(gap|missing|undocumented|unclear|unknown|unassigned|no owner)\b/.test(
      lower
    )
  ) {
    return { category: 'Knowledge Gap', confidence: 'Medium' };
  }
  if (/\b(completed|merged|launched|milestone|finished|delivered|shipped)\b/.test(lower)) {
    return { category: 'Milestone', confidence: 'High' };
  }
  if (/\b(next|follow up|contact|schedule|review|handover step|action)\b/.test(lower)) {
    return { category: 'Next Action', confidence: 'Medium' };
  }
  return { category: 'Task', confidence: 'Medium' };
}

function makeTitleFromLine(line: string): string {
  const cleaned = line
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/^(decision|blocker|risk|gap|task|milestone|next action)\s*:\s*/i, '')
    .trim();
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 69).trim()}...`;
}

/**
 * Deterministic, transparent client-side parser for REAL user-uploaded files.
 * Only produces claims directly backed by verbatim text in the uploaded file.
 */
export function extractClaimsFromUploadedSource(
  source: SourceFile
): ExtractedClaim[] {
  if (
    source.origin !== 'uploaded' ||
    !source.content.trim() ||
    source.status === 'Unsupported' ||
    source.status === 'Error'
  ) {
    return [];
  }

  const results: ExtractedClaim[] = [];
  const makeClaim = (
    idx: number,
    category: ClaimCategory,
    title: string,
    description: string,
    location: string,
    excerpt: string,
    confidence: ConfidenceLevel,
    extra?: {
      owner?: string;
      priority?: string;
      date?: string;
      taskStatus?: TaskProgressStatus;
    }
  ): ExtractedClaim => ({
    id: `claim-up-${source.id}-${idx}`,
    projectId: source.projectId,
    category,
    originalTitle: title,
    originalDescription: description,
    editedTitle: null,
    editedDescription: null,
    sourceFilename: source.name,
    sourceId: source.id,
    sourceLocation: location,
    evidenceExcerpt: excerpt,
    confidence,
    reviewStatus: 'Pending Review',
    reviewedBy: null,
    reviewedAt: null,
    reviewerNote: null,
    date: extra?.date,
    owner: extra?.owner,
    priority: extra?.priority,
    taskStatus: extra?.taskStatus,
    origin: 'uploaded',
  });

  if (source.format === 'CSV') {
    const rawLines = source.content
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    const rows = parseCsvRows(source.content);
    if (rows.length > 1) {
      const headers = rows[0].map((h) => h.toLowerCase());
      const nameIdx = headers.findIndex((h) =>
        /task|title|name|item|summary/.test(h)
      );
      const statusIdx = headers.findIndex((h) => /status|state/.test(h));
      const ownerIdx = headers.findIndex((h) => /owner|assignee|lead/.test(h));
      const priorityIdx = headers.findIndex((h) => /priority|severity/.test(h));
      const dateIdx = headers.findIndex((h) => /date|deadline|due/.test(h));

      rows.slice(1, 25).forEach((row, i) => {
        const rawLine = rawLines[i + 1] ?? row.join(',');
        const title =
          (nameIdx >= 0 ? row[nameIdx] : row[0]) || `CSV Record #${i + 1}`;
        const statusRaw = statusIdx >= 0 ? row[statusIdx] : '';
        const owner = ownerIdx >= 0 ? row[ownerIdx] : undefined;
        const priority = priorityIdx >= 0 ? row[priorityIdx] : undefined;
        const dateVal = dateIdx >= 0 ? row[dateIdx] : undefined;
        const validDate =
          dateVal && /^\d{4}-\d{2}-\d{2}$/.test(dateVal) ? dateVal : undefined;

        let taskStatus: TaskProgressStatus = 'Pending';
        let category: ClaimCategory = 'Task';
        if (/block/i.test(statusRaw)) {
          taskStatus = 'Blocked';
          category = 'Blocker';
        } else if (/done|complete|closed/i.test(statusRaw)) {
          taskStatus = 'Completed';
        } else if (/progress|active|wip/i.test(statusRaw)) {
          taskStatus = 'In Progress';
        }

        results.push(
          makeClaim(
            i + 1,
            category,
            title,
            `Parsed from uploaded CSV row ${i + 2}: ${row.join(' | ')}`,
            `Row ${i + 2}`,
            rawLine,
            'High',
            { owner, priority, date: validDate, taskStatus }
          )
        );
      });
    }
    return results;
  }

  if (source.format === 'JSON') {
    try {
      const parsed: unknown = JSON.parse(source.content);
      const parsedObj =
        typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)
          : null;
      const items: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsedObj && Array.isArray(parsedObj.messages)
        ? parsedObj.messages
        : parsedObj && Array.isArray(parsedObj.items)
        ? parsedObj.items
        : [parsed];

      items.slice(0, 20).forEach((entry: unknown, idx: number) => {
        const record =
          typeof entry === 'object' && entry !== null
            ? (entry as Record<string, unknown>)
            : null;
        const textVal =
          typeof entry === 'string'
            ? entry
            : record?.message ||
              record?.text ||
              record?.description ||
              record?.title ||
              JSON.stringify(entry);
        const excerpt =
          typeof textVal === 'string' ? textVal : JSON.stringify(entry);
        const { category, confidence } = classifyTextLine(excerpt);
        const ownerRaw = record?.author ?? record?.owner;
        const owner = typeof ownerRaw === 'string' ? ownerRaw : undefined;
        const rawTs = record?.timestamp ?? record?.date;
        const dateMatch =
          typeof rawTs === 'string'
            ? rawTs.match(/\d{4}-\d{2}-\d{2}/)?.[0]
            : undefined;

        results.push(
          makeClaim(
            idx + 1,
            category,
            makeTitleFromLine(excerpt),
            excerpt,
            `JSON Entry #${idx + 1}`,
            excerpt,
            confidence,
            { owner, date: dateMatch }
          )
        );
      });
      return results;
    } catch {
      return [];
    }
  }

  // TXT, MD, or PDF extracted text
  const lines = source.content.split(/\r?\n/);
  let count = 0;
  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (
      !trimmed ||
      trimmed.startsWith('--- Page ') ||
      trimmed.startsWith('#') ||
      trimmed.length < 18
    ) {
      return;
    }
    // Look for meaningful bullet points or signal keywords
    const isBullet = /^[-*•]/.test(trimmed);
    const hasSignal =
      /\b(decided|decision|selected|agreed|block|blocker|risk|missing|undocumented|unclear|pending|completed|milestone|next|todo|action|owner|deadline)\b/i.test(
        trimmed
      );
    if ((isBullet || hasSignal) && count < 15) {
      count += 1;
      const { category, confidence } = classifyTextLine(trimmed);
      const dateMatch = trimmed.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
      results.push(
        makeClaim(
          count,
          category,
          makeTitleFromLine(trimmed),
          trimmed.replace(/^[-*•]\s*/, ''),
          `Line ${idx + 1}`,
          trimmed,
          confidence,
          { date: dateMatch }
        )
      );
    }
  });

  // If a plain file had no bullet/signal matches, extract up to 3 top sentences transparently
  if (results.length === 0) {
    const sentences = source.content
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 25);

    sentences.slice(0, 4).forEach((sentence, i) => {
      const { category, confidence } = classifyTextLine(sentence);
      results.push(
        makeClaim(
          i + 1,
          category,
          makeTitleFromLine(sentence),
          sentence,
          `Paragraph excerpt #${i + 1}`,
          sentence,
          confidence
        )
      );
    });
  }

  return results;
}
