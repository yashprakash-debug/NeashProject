import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { parseCsvRows, readUploadedFile } from '../utils/fileExtractor';
import type { NavRoute, Project, SourceFile } from '../types/neash';

export interface ExtractionRunSummary {
  extractedCount: number;
  verifiedCitations: number;
  unverifiedCitations: number;
  conflictsDetected: number;
  modelUsed: string;
}

interface SourcesPageProps {
  activeProject: Project | undefined;
  projectSources: SourceFile[];
  onAddSources: (sources: SourceFile[]) => void;
  onRemoveSource: (sourceId: string) => void;
  onLoadSampleProjectData: () => void;
  onSourceInspected?: () => void;
  onRunIntelligenceExtraction: (
    onStageChange: (stageIndex: number, label: string) => void
  ) => Promise<ExtractionRunSummary | void>;
  onNavigate: (route: NavRoute) => void;
}

const EXTRACTION_STAGES = [
  'Preparing readable documents & checking payload limits...',
  'Extracting structured claims via Express + Gemini 4 Hydrogen...',
  'Programmatically verifying every quote against source text...',
  'Reconciling cross-source contradictions, deadlines & owners...',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SourcesPage: React.FC<SourcesPageProps> = ({
  activeProject,
  projectSources,
  onAddSources,
  onRemoveSource,
  onLoadSampleProjectData,
  onSourceInspected,
  onRunIntelligenceExtraction,
  onNavigate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [previewSource, setPreviewSource] = useState<SourceFile | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStage, setExtractionStage] = useState<{
    index: number;
    label: string;
  } | null>(null);
  const [extractionSummary, setExtractionSummary] =
    useState<ExtractionRunSummary | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !activeProject) return;
    setIsReadingFiles(true);
    setExtractionError(null);
    try {
      const filesArray = Array.from(fileList);
      const parsed = await Promise.all(
        filesArray.map((f) => readUploadedFile(f, activeProject.id))
      );
      onAddSources(parsed);
    } finally {
      setIsReadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerateIntelligence = async () => {
    if (!activeProject || projectSources.length === 0 || isExtracting) return;
    setIsExtracting(true);
    setExtractionSummary(null);
    setExtractionError(null);
    try {
      const result = await onRunIntelligenceExtraction((index, label) => {
        setExtractionStage({ index, label });
      });
      if (result) {
        setExtractionSummary(result);
      } else {
        setExtractionSummary({
          extractedCount: 0,
          verifiedCitations: 0,
          unverifiedCitations: 0,
          conflictsDetected: 0,
          modelUsed: 'gemini-4-hydrogen',
        });
      }
    } catch (err) {
      setExtractionError(
        err instanceof Error
          ? err.message
          : 'Server-side AI extraction failed. Please check your connection and try again.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadSampleUploadFile = () => {
    const content = [
      'SPRINT HANDOVER ADDENDUM (2026-11-11)',
      '- Decision: Agreed to enforce rate limiting of 120 requests/minute on /api/v1/orders before Black Friday launch.',
      '- Blocker: Waiting on CDN SSL certificate renewal from Infrastructure team (ticket #INF-209).',
      '- Risk: Unmonitored memory spike in PDF invoice worker under >50 concurrent exports.',
      '- Next Action: Schedule 30-minute walkthrough with Priya Nair on 2026-11-15 to review webhook retry logs.',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Sprint_Handover_Addendum.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvPreviewRows = useMemo(() => {
    if (!previewSource || previewSource.format !== 'CSV') return [];
    return parseCsvRows(previewSource.content);
  }, [previewSource]);

  const getFormatIcon = (format: SourceFile['format']) => {
    switch (format) {
      case 'CSV':
        return <FileSpreadsheet className="w-4 h-4 text-[#22C55E]" />;
      case 'JSON':
      case 'MD':
        return <FileCode className="w-4 h-4 text-[#60A5FA]" />;
      default:
        return <FileText className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 rounded-xl bg-[#111D30] border border-white/[0.07] text-center">
        <p className="text-sm text-[#94A3B8]">
          Select a project first to ingest sources.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span>{activeProject.name}</span>
            <span aria-hidden="true">·</span>
            <span>Server-Verified Extraction &amp; Ingestion</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC] mt-1">
            Project Sources
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Upload PDF, TXT, CSV, MD, or JSON files. Uploaded &amp; staged documents are analyzed by Express + Gemini 4 Hydrogen with programmatic verbatim citation verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onLoadSampleProjectData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#111D30] hover:bg-[#16243B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Load Sample Project Data</span>
          </button>

          <button
            type="button"
            onClick={() => void handleGenerateIntelligence()}
            disabled={projectSources.length === 0 || isExtracting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            {isExtracting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {isExtracting
                ? 'Running AI Extraction...'
                : 'Generate Project Intelligence'}
            </span>
          </button>
        </div>
      </div>

      {/* Explicit Server Error Alert (Never Silently Masked) */}
      {extractionError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs text-[#F8FAFC]">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-[#EF4444]">
                Server-Side AI Extraction Error
              </p>
              <p className="text-[#F8FAFC]/90 leading-relaxed">{extractionError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleGenerateIntelligence()}
            className="px-3.5 py-1.5 rounded-lg bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-xs font-semibold text-[#F8FAFC] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Retry Extraction
          </button>
        </div>
      )}

      {/* Processing Progress Panel */}
      {(isExtracting || extractionSummary) && (
        <section
          aria-live="polite"
          className="p-5 rounded-xl bg-[#111D30] border border-[#3B82F6]/40 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isExtracting ? (
                <Loader2 className="w-4 h-4 text-[#60A5FA] animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              )}
              <div>
                <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
                  {isExtracting
                    ? 'Server-Side AI Extraction & Citation Verification Running'
                    : 'Extraction & Cross-Source Reconciliation Complete'}
                </h2>
                {extractionSummary && !isExtracting && (
                  <p className="text-xs text-[#94A3B8] mt-0.5 font-mono tabular-nums">
                    {extractionSummary.extractedCount} new claims ·{' '}
                    {extractionSummary.verifiedCitations} verbatim quotes verified ·{' '}
                    {extractionSummary.unverifiedCitations > 0
                      ? `${extractionSummary.unverifiedCitations} unverified quotes flagged · `
                      : ''}
                    {extractionSummary.conflictsDetected} cross-source alerts active
                  </p>
                )}
              </div>
            </div>

            {extractionSummary && !isExtracting && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('knowledge')}
                  className="text-xs font-semibold text-[#60A5FA] hover:underline cursor-pointer"
                >
                  Open Knowledge Hub
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('verification')}
                  className="text-xs font-semibold text-[#22C55E] hover:underline cursor-pointer"
                >
                  Review in Verification Center
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {EXTRACTION_STAGES.map((stageLabel, idx) => {
              const currentIdx = extractionStage?.index ?? 0;
              const done = Boolean(extractionSummary) && !isExtracting ? true : currentIdx > idx;
              const active = isExtracting && currentIdx === idx;
              return (
                <div
                  key={stageLabel}
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    done
                      ? 'bg-[#22C55E]/[0.06] border-[#22C55E]/30 text-[#F8FAFC]'
                      : active
                      ? 'bg-[#3B82F6]/[0.1] border-[#3B82F6]/40 text-[#F8FAFC]'
                      : 'bg-[#080D19] border-white/[0.06] text-[#94A3B8]'
                  }`}
                >
                  <p className="font-mono text-[11px] mb-1 tabular-nums">
                    Step 0{idx + 1}
                  </p>
                  <p className="leading-snug">{stageLabel}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`p-8 rounded-xl border-2 border-dashed transition-colors text-center ${
          isDragging
            ? 'border-[#3B82F6] bg-[#3B82F6]/10'
            : 'border-white/[0.12] bg-[#111D30]/60 hover:border-white/[0.22]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.csv,.md,.markdown,.json"
          onChange={(e) => void handleFiles(e.target.files)}
          className="hidden"
          id="source-file-input"
        />
        <UploadCloud className="w-8 h-8 text-[#60A5FA] mx-auto mb-3" />
        <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
          Drag and drop project files here, or browse from your computer
        </h2>
        <p className="text-xs text-[#94A3B8] mt-1">
          Supports multiple files up to 4 MB each: PDF (PDF.js text layer), TXT, CSV, MD, and JSON.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadingFiles}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium text-[#F8FAFC] transition-colors cursor-pointer"
          >
            {isReadingFiles ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Reading files...</span>
              </>
            ) : (
              <span>Select Files</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadSampleUploadFile}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#080D19] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Download Sample File (.txt) to Test Upload</span>
          </button>
        </div>
      </div>

      {/* File List */}
      <section className="rounded-xl bg-[#111D30] border border-white/[0.07] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Ingested Documents
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5 tabular-nums">
              {projectSources.length} source{projectSources.length === 1 ? '' : 's'} attached to {activeProject.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('knowledge')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#60A5FA] hover:underline whitespace-nowrap cursor-pointer"
          >
            <span>Next: Explore Knowledge Hub &amp; Conflicts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {projectSources.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-[#94A3B8]">
              No source files attached to this project yet.
            </p>
            <button
              type="button"
              onClick={onLoadSampleProjectData}
              className="px-3.5 py-2 rounded-lg bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-xs font-medium text-[#60A5FA] cursor-pointer"
            >
              Load Sample Project Data
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {projectSources.map((src) => (
              <div
                key={src.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02]"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{getFormatIcon(src.format)}</div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[#F8FAFC] truncate">
                        {src.name}
                      </span>
                      <span className="text-xs font-mono text-[#94A3B8]">
                        {src.format}
                      </span>
                      <span aria-hidden="true" className="text-[#94A3B8]">
                        ·
                      </span>
                      <span className="text-xs font-mono text-[#94A3B8] tabular-nums">
                        {formatBytes(src.sizeBytes)}
                      </span>
                      <span aria-hidden="true" className="text-[#94A3B8]">
                        ·
                      </span>
                      <span
                        className={`text-xs font-mono ${
                          src.origin === 'demo'
                            ? 'text-[#60A5FA]'
                            : 'text-[#22C55E]'
                        }`}
                      >
                        {src.origin === 'demo' ? 'DEMO DATA' : 'Uploaded File'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      {src.extractionNote}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${
                      src.status === 'Processed'
                        ? 'text-[#22C55E]'
                        : src.status === 'Ready'
                        ? 'text-[#60A5FA]'
                        : 'text-[#EF4444]'
                    }`}
                  >
                    {src.status === 'Unsupported' || src.status === 'Error' ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {src.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSource(src);
                      onSourceInspected?.();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (previewSource?.id === src.id) {
                        setPreviewSource(null);
                      }
                      onRemoveSource(src.id);
                    }}
                    aria-label={`Remove ${src.name}`}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Source Content Preview Modal */}
      {previewSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl max-h-[85vh] bg-[#0C1424] border border-white/[0.1] rounded-xl flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">
                  {previewSource.origin === 'demo'
                    ? 'DEMO DATA · Sample Document'
                    : 'Uploaded File · Extracted Content'}{' '}
                  · {previewSource.format}
                </p>
                <h3 className="font-display text-base font-semibold text-[#F8FAFC] truncate mt-0.5">
                  {previewSource.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSource(null)}
                aria-label="Close preview"
                className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-white/[0.05] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {previewSource.status === 'Unsupported' ||
              previewSource.status === 'Error' ? (
                <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-sm text-[#EF4444]">
                  {previewSource.extractionNote}
                </div>
              ) : previewSource.format === 'CSV' && csvPreviewRows.length > 0 ? (
                <div className="overflow-x-auto border border-white/[0.08] rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#111D30] border-b border-white/[0.08] text-[#94A3B8]">
                        <th className="py-2.5 px-3 font-mono">#</th>
                        {csvPreviewRows[0].map((col, idx) => (
                          <th key={idx} className="py-2.5 px-3 font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {csvPreviewRows.slice(1).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-mono text-[#94A3B8] tabular-nums">
                            {rIdx + 2}
                          </td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 text-[#F8FAFC]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : previewSource.pages && previewSource.pages.length > 0 ? (
                <div className="space-y-4">
                  {previewSource.pages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="p-4 rounded-xl bg-[#080D19] border border-white/[0.08] space-y-2"
                    >
                      <p className="text-xs font-mono text-[#60A5FA]">
                        Page {page.pageNumber}
                        {page.title ? ` — ${page.title}` : ''}
                      </p>
                      <pre className="text-xs font-mono text-[#F8FAFC]/90 whitespace-pre-wrap leading-relaxed">
                        {page.text}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="p-4 rounded-xl bg-[#080D19] border border-white/[0.08] text-xs font-mono text-[#F8FAFC]/90 whitespace-pre-wrap leading-relaxed">
                  {previewSource.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
