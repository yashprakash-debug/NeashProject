import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {
  SourceFile,
  SourceFormat,
  SourcePage,
} from '../types/neash';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB guard

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

  if (file.size > MAX_FILE_BYTES) {
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
      extractionNote: `File exceeds the 4 MB browser ingestion limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please split or trim the document.`,
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
        extractionNote: `Uploaded PDF — Extracted ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} via PDF.js; ready for server-side Gemini AI extraction.`,
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
    let note = `Uploaded ${format} — Ready for server-side Gemini AI extraction & citation verification.`;

    if (format === 'JSON') {
      try {
        const parsed = JSON.parse(rawText) as unknown;
        normalizedContent = JSON.stringify(parsed, null, 2);
        note = 'Uploaded JSON — Parsed cleanly; ready for server-side Gemini AI extraction.';
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
