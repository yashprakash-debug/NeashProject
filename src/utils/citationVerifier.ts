import type { CitationMatchType, SourceFile } from '../types/neash.ts';

export interface CitationVerificationResult {
  verified: boolean;
  matchType: CitationMatchType;
  matchedSourceId: string | null;
  matchedSourceFilename: string;
  verbatimExcerpt: string;
  charOffset: number | null;
}

function normalizeForMatch(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds the original substring inside `haystack` corresponding to a whitespace-normalized needle.
 */
function findNormalizedSpan(
  haystack: string,
  needle: string
): { verbatim: string; offset: number } | null {
  const normNeedle = normalizeForMatch(needle);
  if (normNeedle.length < 12) return null;

  // Build mapping from normalized index -> original index
  const mapToOriginal: number[] = [];
  let normHaystack = '';
  let lastWasSpace = true;

  for (let i = 0; i < haystack.length; i++) {
    let ch = haystack[i];
    if (ch === '\u2018' || ch === '\u2019') ch = "'";
    else if (ch === '\u201C' || ch === '\u201D') ch = '"';

    if (/\s/.test(ch)) {
      if (!lastWasSpace) {
        normHaystack += ' ';
        mapToOriginal.push(i);
        lastWasSpace = true;
      }
    } else {
      normHaystack += ch;
      mapToOriginal.push(i);
      lastWasSpace = false;
    }
  }

  const idx = normHaystack.toLowerCase().indexOf(normNeedle.toLowerCase());
  if (idx === -1) return null;

  const startOrig = mapToOriginal[idx] ?? 0;
  const endNormIdx = idx + normNeedle.length - 1;
  const endOrig = (mapToOriginal[endNormIdx] ?? haystack.length - 1) + 1;

  return {
    verbatim: haystack.slice(startOrig, endOrig).trim(),
    offset: startOrig,
  };
}

export function verifyCitationAgainstSources(
  candidateExcerpt: string | undefined | null,
  claimedFilename: string | undefined | null,
  sources: Array<Pick<SourceFile, 'id' | 'name' | 'content'>>
): CitationVerificationResult {
  const trimmed = (candidateExcerpt ?? '').trim();
  const fallbackName = claimedFilename?.trim() || sources[0]?.name || 'Unknown Source';

  if (!trimmed || trimmed === 'No supporting evidence found.') {
    return {
      verified: false,
      matchType: 'unverified',
      matchedSourceId: null,
      matchedSourceFilename: fallbackName,
      verbatimExcerpt: 'No supporting evidence found.',
      charOffset: null,
    };
  }

  // Prioritize claimed source first, then inspect remaining sources
  const orderedSources = [...sources].sort((a, b) => {
    const aMatch = a.name.toLowerCase() === (claimedFilename ?? '').trim().toLowerCase() ? 0 : 1;
    const bMatch = b.name.toLowerCase() === (claimedFilename ?? '').trim().toLowerCase() ? 0 : 1;
    return aMatch - bMatch;
  });

  // 1. Exact substring match check
  for (const src of orderedSources) {
    if (!src.content) continue;
    const idx = src.content.indexOf(trimmed);
    if (idx !== -1) {
      return {
        verified: true,
        matchType: 'exact',
        matchedSourceId: src.id,
        matchedSourceFilename: src.name,
        verbatimExcerpt: src.content.slice(idx, idx + trimmed.length),
        charOffset: idx,
      };
    }
  }

  // 2. Whitespace- & quote-normalized substring verification (case-insensitive)
  for (const src of orderedSources) {
    if (!src.content) continue;
    const span = findNormalizedSpan(src.content, trimmed);
    if (span && span.verbatim.length >= 12) {
      return {
        verified: true,
        matchType: 'normalized',
        matchedSourceId: src.id,
        matchedSourceFilename: src.name,
        verbatimExcerpt: span.verbatim,
        charOffset: span.offset,
      };
    }
  }

  // 3. Unverified quote — do NOT pass off ungrounded LLM text as verbatim evidence
  const matchingSource = orderedSources.find(
    (s) => s.name.toLowerCase() === fallbackName.toLowerCase()
  );

  return {
    verified: false,
    matchType: 'unverified',
    matchedSourceId: matchingSource?.id ?? null,
    matchedSourceFilename: matchingSource?.name ?? fallbackName,
    verbatimExcerpt: 'No supporting evidence found.',
    charOffset: null,
  };
}
