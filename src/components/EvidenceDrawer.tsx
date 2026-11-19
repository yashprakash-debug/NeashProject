import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  MapPin,
  RotateCcw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import type { ExtractedClaim, SourceFile } from '../types/neash';
import {
  CategoryLabel,
  ConfidenceIndicator,
  ReviewStatusIndicator,
} from './StatusSignals';

interface EvidenceDrawerProps {
  claim: ExtractedClaim | null;
  sources: SourceFile[];
  onClose: () => void;
  onAccept: (claimId: string) => void;
  onReject: (claimId: string) => void;
  onReopen: (claimId: string) => void;
  onOpenInVerification: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  claim,
  sources,
  onClose,
  onAccept,
  onReject,
  onReopen,
  onOpenInVerification,
}) => {
  const matchedSource = useMemo(() => {
    if (!claim) return undefined;
    return (
      sources.find((s) => s.id === claim.sourceId) ||
      sources.find((s) => s.name === claim.sourceFilename)
    );
  }, [claim, sources]);

  const highlightedContext = useMemo(() => {
    if (!claim) return null;
    const excerpt = claim.evidenceExcerpt?.trim();
    if (!excerpt || excerpt === 'No supporting evidence found.') {
      return { found: false as const, before: '', match: '', after: '' };
    }
    if (!matchedSource || !matchedSource.content) {
      return { found: false as const, before: '', match: excerpt, after: '' };
    }

    const idx = matchedSource.content.indexOf(excerpt);
    if (idx === -1) {
      return { found: false as const, before: '', match: excerpt, after: '' };
    }

    const start = Math.max(0, idx - 260);
    const end = Math.min(
      matchedSource.content.length,
      idx + excerpt.length + 260
    );
    const prefix = start > 0 ? '...\n' : '';
    const suffix = end < matchedSource.content.length ? '\n...' : '';

    return {
      found: true as const,
      before: prefix + matchedSource.content.slice(start, idx),
      match: matchedSource.content.slice(idx, idx + excerpt.length),
      after: matchedSource.content.slice(idx + excerpt.length, end) + suffix,
    };
  }, [claim, matchedSource]);

  if (!claim) return null;

  const hasHumanEdit =
    claim.editedTitle !== null || claim.editedDescription !== null;
  const hasEvidence =
    Boolean(claim.evidenceExcerpt?.trim()) &&
    claim.evidenceExcerpt.trim() !== 'No supporting evidence found.';
  const isProgrammaticallyVerified = claim.citationVerified !== false && hasEvidence;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-2xl bg-[#0C1424] border-l border-white/[0.1] h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2 text-xs text-[#94A3B8]">
              <CategoryLabel category={claim.category} />
              <span aria-hidden="true">·</span>
              <ReviewStatusIndicator status={claim.reviewStatus} />
              <span aria-hidden="true">·</span>
              <ConfidenceIndicator confidence={claim.confidence} />
            </div>
            <h2
              id="evidence-drawer-title"
              className="font-display text-lg font-semibold text-[#F8FAFC] mt-1.5"
            >
              Evidence Traceability
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence drawer"
            className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-white/[0.05] shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Programmatic Citation Verification Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              isProgrammaticallyVerified
                ? 'bg-[#22C55E]/[0.06] border-[#22C55E]/30 text-[#22C55E]'
                : 'bg-[#EF4444]/[0.08] border-[#EF4444]/35 text-[#EF4444]'
            }`}
          >
            {isProgrammaticallyVerified ? (
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold">
                {isProgrammaticallyVerified
                  ? `Citation Programmatically Verified (${
                      claim.citationMatchType === 'normalized'
                        ? 'Normalized Substring Match'
                        : 'Exact Verbatim Match'
                    })`
                  : 'Unverified Quote — Exact Excerpt Not Found in Source'}
              </p>
              <p className="text-[#94A3B8]">
                {isProgrammaticallyVerified
                  ? `Substring verified character-for-character inside ${claim.sourceFilename}${
                      claim.extractedByModel ? ` (extracted via ${claim.extractedByModel})` : ''
                    }.`
                  : 'Server-side verification rejected the proposed quote because it could not be matched verbatim against the uploaded document.'}
              </p>
            </div>
          </div>

          {/* Extracted Interpretation */}
          <section>
            <p className="text-xs font-medium text-[#94A3B8] mb-2">
              {claim.origin === 'demo'
                ? 'Extracted Interpretation (DEMO DATA)'
                : `Extracted Interpretation (${claim.extractedByModel || 'Server AI'})`}
            </p>
            <div className="p-4 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-2">
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                {claim.originalTitle}
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {claim.originalDescription}
              </p>
            </div>
          </section>

          {/* Human Edited Version if present */}
          {hasHumanEdit && (
            <section>
              <p className="text-xs font-medium text-[#60A5FA] mb-2">
                Human-Edited Claim (Used in Approved Handover)
              </p>
              <div className="p-4 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 space-y-2">
                <h3 className="text-sm font-semibold text-[#F8FAFC]">
                  {claim.editedTitle ?? claim.originalTitle}
                </h3>
                <p className="text-sm text-[#F8FAFC]/90 leading-relaxed">
                  {claim.editedDescription ?? claim.originalDescription}
                </p>
              </div>
            </section>
          )}

          {/* Source Metadata */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.07]">
            <div>
              <p className="text-xs text-[#94A3B8] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#60A5FA]" />
                Original Source File
              </p>
              <p className="mt-1 font-mono text-xs text-[#F8FAFC] break-all">
                {claim.sourceFilename}
              </p>
              {matchedSource && (
                <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                  {matchedSource.origin === 'demo'
                    ? 'DEMO DATA · Preloaded source'
                    : 'Uploaded source document'}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-[#94A3B8] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#60A5FA]" />
                Source Location
              </p>
              <p className="mt-1 font-mono text-xs text-[#F8FAFC]">
                {claim.sourceLocation}
              </p>
              {claim.date && (
                <p className="mt-0.5 text-[11px] text-[#94A3B8] font-mono tabular-nums">
                  Recorded date: {claim.date}
                </p>
              )}
            </div>
          </section>

          {/* Supporting Excerpt */}
          <section className="space-y-2">
            <p className="text-xs font-medium text-[#94A3B8]">
              Exact Supporting Excerpt
            </p>
            {!hasEvidence ? (
              <div className="p-4 rounded-xl bg-[#111D30] border border-[#EF4444]/30 space-y-2 text-sm text-[#94A3B8]">
                <p className="font-medium text-[#EF4444]">No supporting evidence found.</p>
                {claim.unverifiedQuote && (
                  <p className="text-xs font-mono text-[#94A3B8]">
                    Rejected AI quote: &ldquo;{claim.unverifiedQuote}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#111D30] border border-[#3B82F6]/35">
                <blockquote className="text-sm text-[#F8FAFC] leading-relaxed font-mono">
                  &ldquo;{claim.evidenceExcerpt}&rdquo;
                </blockquote>
              </div>
            )}
          </section>

          {/* Document Context Preview */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#94A3B8]">
                Source Document Context Preview
              </p>
              {matchedSource && (
                <span className="text-[11px] font-mono text-[#94A3B8]">
                  {matchedSource.format}
                </span>
              )}
            </div>

            {!matchedSource ? (
              <div className="p-4 rounded-xl bg-[#080D19] border border-white/[0.07] text-xs text-[#94A3B8]">
                Source file is no longer present in the workspace, or no supporting evidence found.
              </div>
            ) : highlightedContext?.found ? (
              <pre className="p-4 rounded-xl bg-[#080D19] border border-white/[0.08] text-xs font-mono text-[#94A3B8] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {highlightedContext.before}
                <mark className="bg-[#3B82F6]/30 text-[#F8FAFC] px-1 py-0.5 rounded-xs ring-1 ring-[#60A5FA]/50">
                  {highlightedContext.match}
                </mark>
                {highlightedContext.after}
              </pre>
            ) : (
              <pre className="p-4 rounded-xl bg-[#080D19] border border-white/[0.08] text-xs font-mono text-[#94A3B8] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {matchedSource.content || 'No text content available.'}
              </pre>
            )}
          </section>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#080D19]/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {claim.reviewStatus !== 'Verified' && (
              <button
                type="button"
                onClick={() => onAccept(claim.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] text-xs font-semibold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Accept Claim
              </button>
            )}
            {claim.reviewStatus !== 'Rejected' && (
              <button
                type="button"
                onClick={() => onReject(claim.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] text-xs font-semibold transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            )}
            {claim.reviewStatus !== 'Pending Review' && (
              <button
                type="button"
                onClick={() => onReopen(claim.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[#F8FAFC] text-xs font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reopen
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenInVerification();
            }}
            className="px-3.5 py-2 rounded-lg border border-white/[0.1] hover:border-[#3B82F6]/60 text-xs font-medium text-[#60A5FA] transition-colors cursor-pointer"
          >
            Edit in Verification Center
          </button>
        </div>
      </div>
    </div>
  );
};
