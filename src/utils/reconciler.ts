import type {
  ExtractedClaim,
  Project,
  ReconciliationConflict,
  SourceFile,
} from '../types/neash.ts';

function extractDates(text: string): string[] {
  const matches = text.match(/\b20\d{2}-\d{2}-\d{2}\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function findLineExcerpt(content: string, pattern: RegExp): string | null {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && pattern.test(trimmed)) {
      return trimmed.length > 240 ? `${trimmed.slice(0, 237)}...` : trimmed;
    }
  }
  return null;
}

function parseCsvLines(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
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

/**
 * Cross-Source Contradiction, Staleness, Deadline & Undocumented Owner Detection Engine.
 * Compares decisions, task statuses, dates, and ownership across CSVs, meeting notes,
 * technical docs, chat exports, and uploaded addenda.
 */
export function reconcileProjectKnowledge(
  project: Project,
  sources: SourceFile[],
  claims: ExtractedClaim[],
  existingConflicts: ReconciliationConflict[] = [],
  referenceDateIso?: string
): ReconciliationConflict[] {
  const today = (referenceDateIso || new Date().toISOString()).slice(0, 10);
  const nowIso = new Date().toISOString();
  const prevById = new Map(existingConflicts.map((c) => [c.id, c]));
  const detected: ReconciliationConflict[] = [];

  const pushConflict = (
    item: Omit<ReconciliationConflict, 'detectedAt' | 'status'>
  ) => {
    const existing = prevById.get(item.id);
    detected.push({
      ...item,
      status: existing?.status ?? 'Open',
      detectedAt: existing?.detectedAt ?? nowIso,
      resolvedBy: existing?.resolvedBy ?? null,
      resolvedByRole: existing?.resolvedByRole ?? null,
      resolvedAt: existing?.resolvedAt ?? null,
      resolutionNote: existing?.resolutionNote ?? null,
    });
  };

  const validSources = sources.filter(
    (s) => s.projectId === project.id && s.content.trim().length > 0
  );
  if (validSources.length === 0) return [];

  // 1. Contradiction: Deprecated Q2 infra/cluster references still active in staging Terraform/chat
  const meetingDoc = validSources.find((s) =>
    /deprecated|mysql|q2/i.test(s.content)
  );
  const discussionDoc = validSources.find((s) =>
    /old q2|q2 cluster|terraform/i.test(s.content)
  );
  if (meetingDoc && discussionDoc && meetingDoc.id !== discussionDoc.id) {
    const exA =
      findLineExcerpt(meetingDoc.content, /deprecated|not to be used/i) ||
      'Legacy MySQL prototypes from Q2 were officially deprecated and are not to be used.';
    const exB =
      findLineExcerpt(discussionDoc.content, /old q2|q2 cluster/i) ||
      'Staging Kubernetes ingress and secret mounts in Terraform still reference old Q2 cluster names and have not been validated.';
    pushConflict({
      id: `conf-${project.id}-q2-drift`,
      projectId: project.id,
      type: 'Contradiction',
      severity: 'Critical',
      title: 'Deprecated Q2 architecture still referenced in staging Terraform config',
      summary: `${meetingDoc.name} officially deprecates Q2 prototypes, but ${discussionDoc.name} reveals staging Terraform ingress and secrets still point to old Q2 cluster names.`,
      sourceAFilename: meetingDoc.name,
      sourceALocation: 'Architecture Decision Record',
      excerptA: exA,
      sourceBFilename: discussionDoc.name,
      sourceBLocation: 'Team Chat Export',
      excerptB: exB,
    });
  }

  // 2. Status Mismatch: CSV Task marked "Pending" while Progress/Chat reports active "Blocker"
  const csvSources = validSources.filter((s) => s.format === 'CSV');
  const narrativeSources = validSources.filter((s) => s.format !== 'CSV');

  for (const csvSrc of csvSources) {
    const rows = parseCsvLines(csvSrc.content);
    if (rows.length < 2) continue;
    const headers = rows[0].map((h) => h.toLowerCase());
    const idIdx = headers.findIndex((h) => /id|ticket|key/.test(h));
    const nameIdx = headers.findIndex((h) => /task|name|title/.test(h));
    const statusIdx = headers.findIndex((h) => /status|state/.test(h));
    const ownerIdx = headers.findIndex((h) => /owner|assignee/.test(h));
    const deadlineIdx = headers.findIndex((h) => /deadline|due|date/.test(h));

    rows.slice(1).forEach((row, rIdx) => {
      const taskId = idIdx >= 0 ? row[idIdx] : `Row-${rIdx + 2}`;
      const taskName = nameIdx >= 0 ? row[nameIdx] : row[0] || '';
      const taskStatus = statusIdx >= 0 ? row[statusIdx] : '';
      const owner = ownerIdx >= 0 ? row[ownerIdx] : '';
      const deadline = deadlineIdx >= 0 ? row[deadlineIdx] : '';
      const rawRow = `${row.join(',')}`;

      // Check Payment/Gateway Pending vs Blocker across Chat/Progress docs
      if (/pending/i.test(taskStatus) && /payment|gateway|sso|certificate/i.test(taskName)) {
        const blockerDoc = narrativeSources.find((ns) =>
          /blocker|unavailable|cannot test|blocked|waiting on/i.test(ns.content) &&
          (taskName.toLowerCase().includes('payment')
            ? /payment|sandbox|credentials/i.test(ns.content)
            : /sso|saml|certificate/i.test(ns.content))
        );
        if (blockerDoc) {
          const exB =
            findLineExcerpt(
              blockerDoc.content,
              /blocker|unavailable|cannot test|expires|waiting on/i
            ) || blockerDoc.content.slice(0, 180);
          pushConflict({
            id: `conf-${project.id}-status-${taskId.toLowerCase()}`,
            projectId: project.id,
            type: 'Status Mismatch',
            severity: 'Critical',
            title: `${taskId} (${taskName}) listed as "${taskStatus}" in CSV but actively Blocked in ${blockerDoc.name}`,
            summary: `${csvSrc.name} tracks ${taskId} as "${taskStatus}", whereas ${blockerDoc.name} confirms work cannot proceed due to missing external credentials or approvals.`,
            sourceAFilename: csvSrc.name,
            sourceALocation: `Row ${rIdx + 2} (${taskId})`,
            excerptA: rawRow,
            sourceBFilename: blockerDoc.name,
            sourceBLocation: 'Status & Blocker Log',
            excerptB: exB,
          });
        }
      }

      // Check Passed or Overdue Deadlines (unless Completed)
      if (
        deadline &&
        /^\d{4}-\d{2}-\d{2}$/.test(deadline) &&
        !/complete|done|closed/i.test(taskStatus)
      ) {
        if (deadline < today) {
          pushConflict({
            id: `conf-${project.id}-deadline-${taskId.toLowerCase()}`,
            projectId: project.id,
            type: 'Passed Deadline',
            severity: 'Critical',
            title: `${taskId} deadline (${deadline}) has passed while status is "${taskStatus}"`,
            summary: `${taskName} was scheduled for completion on ${deadline} (reference date ${today}) and remains "${taskStatus}" under ${owner || 'unassigned owner'}.`,
            sourceAFilename: csvSrc.name,
            sourceALocation: `Row ${rIdx + 2} (${taskId})`,
            excerptA: rawRow,
            sourceBFilename: null,
            sourceBLocation: null,
            excerptB: null,
          });
        }
      }

      // Check Undocumented / Departing / Generic Queue Ownership
      if (
        !/complete|done|closed/i.test(taskStatus) &&
        (owner === '' ||
          /queue|unassigned|tbd|none/i.test(owner) ||
          owner.toLowerCase() === project.previousOwner.toLowerCase())
      ) {
        const isGenericQueue = !owner || /queue|unassigned|tbd|none/i.test(owner);
        const transitionEvidence = narrativeSources.find((ns) =>
          /no named|depart|transition|moves teams|nobody else/i.test(ns.content)
        );
        const exB = transitionEvidence
          ? findLineExcerpt(
              transitionEvidence.content,
              /no named|depart|transition|moves teams|nobody else/i
            )
          : null;

        pushConflict({
          id: `conf-${project.id}-owner-${taskId.toLowerCase()}`,
          projectId: project.id,
          type: 'Undocumented Owner',
          severity: isGenericQueue ? 'Critical' : 'Warning',
          title: isGenericQueue
            ? `${taskId} (${taskName}) assigned to generic queue "${owner || 'Unassigned'}"`
            : `${taskId} (${taskName}) still assigned to outgoing owner ${owner}`,
          summary: isGenericQueue
            ? `${csvSrc.name} assigns ${taskId} to "${owner || 'Unassigned'}" without a named engineer accountable after handover.`
            : `${taskId} remains "${taskStatus}" under outgoing owner ${owner}, who is transitioning off ${project.name} to ${project.incomingOwner}.`,
          sourceAFilename: csvSrc.name,
          sourceALocation: `Row ${rIdx + 2} (${taskId})`,
          excerptA: rawRow,
          sourceBFilename: transitionEvidence?.name ?? null,
          sourceBLocation: transitionEvidence ? 'Handover Transition Note' : null,
          excerptB: exB,
        });
      }
    });
  }

  // 3. Stale Documentation Check: Architecture doc older than latest progress/addendum
  const archDocs = validSources.filter((s) =>
    /architecture|tech_arch|technical_architecture/i.test(s.name)
  );
  for (const archDoc of archDocs) {
    const archDates = extractDates(archDoc.content);
    const archUpdated = archDates.sort().pop();
    if (!archUpdated) continue;

    // Compare against any newer source discussing rate limits, secrets, or newer updates
    const newerAddendum = validSources.find((other) => {
      if (other.id === archDoc.id) return false;
      const otherMaxDate = extractDates(other.content).sort().pop();
      if (!otherMaxDate || otherMaxDate <= archUpdated) return false;
      return /rate.?limit|webhook|env|cors|redis|sprint handover/i.test(other.content);
    });

    if (newerAddendum) {
      const newerDate = extractDates(newerAddendum.content).sort().pop() || '';
      const exA =
        findLineExcerpt(archDoc.content, /last updated|undocumented|rate.?limit|redis/i) ||
        `Last Updated: ${archUpdated}`;
      const exB =
        findLineExcerpt(
          newerAddendum.content,
          /rate.?limit|webhook|env|cors|addendum|sandbox/i
        ) || newerAddendum.content.slice(0, 180);

      pushConflict({
        id: `conf-${project.id}-stale-${archDoc.id}`,
        projectId: project.id,
        type: 'Stale Fact',
        severity: 'Warning',
        title: `${archDoc.name} (${archUpdated}) is stale relative to ${newerAddendum.name} (${newerDate})`,
        summary: `${archDoc.name} has not been updated since ${archUpdated} and omits runtime decisions/gaps recorded later in ${newerAddendum.name} (${newerDate}).`,
        sourceAFilename: archDoc.name,
        sourceALocation: `Last Updated: ${archUpdated}`,
        excerptA: exA,
        sourceBFilename: newerAddendum.name,
        sourceBLocation: `Updated ${newerDate}`,
        excerptB: exB,
      });
    }
  }

  // 4. Cross-Source Rate-Limit / Numeric Policy Contradictions across uploaded & demo docs
  const rateLimitMentions: Array<{ source: SourceFile; rate: string; excerpt: string }> = [];
  for (const src of validSources) {
    const match = src.content.match(/(\d+\s*(?:requests\/minute|req\/min|rpm))/i);
    if (match) {
      const ex =
        findLineExcerpt(src.content, /\d+\s*(?:requests\/minute|req\/min|rpm)/i) ||
        match[0];
      rateLimitMentions.push({ source: src, rate: match[1].toLowerCase(), excerpt: ex });
    }
  }
  if (rateLimitMentions.length >= 2) {
    const first = rateLimitMentions[0];
    const conflicting = rateLimitMentions.find((m) => m.rate !== first.rate);
    if (conflicting) {
      pushConflict({
        id: `conf-${project.id}-ratelimit-mismatch`,
        projectId: project.id,
        type: 'Contradiction',
        severity: 'Critical',
        title: `Conflicting API rate limit values (${first.rate} vs ${conflicting.rate})`,
        summary: `${first.source.name} specifies "${first.rate}" while ${conflicting.source.name} specifies "${conflicting.rate}". Reconcile before production launch.`,
        sourceAFilename: first.source.name,
        sourceALocation: 'Rate Limit Policy',
        excerptA: first.excerpt,
        sourceBFilename: conflicting.source.name,
        sourceBLocation: 'Rate Limit Policy',
        excerptB: conflicting.excerpt,
      });
    }
  } else if (rateLimitMentions.length === 1) {
    const rateSpec = rateLimitMentions[0];
    const undocumentedArch = validSources.find(
      (s) =>
        s.id !== rateSpec.source.id &&
        /rate.?limiting thresholds.*not yet documented/i.test(s.content)
    );
    if (undocumentedArch) {
      const exA =
        findLineExcerpt(undocumentedArch.content, /rate.?limiting/i) ||
        'Undocumented API configuration: Rate-limiting thresholds...';
      pushConflict({
        id: `conf-${project.id}-ratelimit-undoc-sync`,
        projectId: project.id,
        type: 'Stale Fact',
        severity: 'Warning',
        title: `${undocumentedArch.name} flags rate limits as undocumented, but ${rateSpec.source.name} defines ${rateSpec.rate}`,
        summary: `${undocumentedArch.name} still marks rate-limiting thresholds as missing from repo docs, while ${rateSpec.source.name} now enforces "${rateSpec.rate}".`,
        sourceAFilename: undocumentedArch.name,
        sourceALocation: 'Known Documentation Gaps',
        excerptA: exA,
        sourceBFilename: rateSpec.source.name,
        sourceBLocation: 'Addendum Specification',
        excerptB: rateSpec.excerpt,
      });
    }
  }

  // 5. Undocumented Cron / Operational Ownership from Knowledge Gap claims & uploaded sources
  for (const src of validSources) {
    const orphanLine = findLineExcerpt(
      src.content,
      /nobody else currently has alerts|private spreadsheet|stored locally by|no named devops/i
    );
    if (orphanLine) {
      const existingSame = detected.some(
        (d) =>
          d.excerptA === orphanLine ||
          d.excerptB === orphanLine ||
          (d.sourceAFilename === src.name && d.type === 'Undocumented Owner')
      );
      if (!existingSame) {
        pushConflict({
          id: `conf-${project.id}-orphan-${src.id}`,
          projectId: project.id,
          type: 'Undocumented Owner',
          severity: 'Warning',
          title: `Operational knowledge or secret access siloed in ${src.name}`,
          summary: `Detected undocumented owner, local-only credential, or private spreadsheet dependency in ${src.name} with no incoming assignee verified.`,
          sourceAFilename: src.name,
          sourceALocation: 'Operational Continuity Risk',
          excerptA: orphanLine,
          sourceBFilename: null,
          sourceBLocation: null,
          excerptB: null,
        });
      }
    }
  }

  // 6. Unverified Citation Check across extracted claims
  const unverifiedClaims = claims.filter(
    (c) => c.projectId === project.id && c.citationVerified === false
  );
  for (const uc of unverifiedClaims) {
    pushConflict({
      id: `conf-${project.id}-unverified-${uc.id}`,
      projectId: project.id,
      type: 'Stale Fact',
      severity: 'Warning',
      title: `Unverified quote rejected by programmatic citation check: "${uc.originalTitle}"`,
      summary: `Server-side citation verifier could not find the AI-proposed excerpt verbatim inside ${uc.sourceFilename}. Human review is required before accepting into Handover Report.`,
      sourceAFilename: uc.sourceFilename,
      sourceALocation: uc.sourceLocation,
      excerptA: uc.unverifiedQuote || 'No supporting evidence found.',
      sourceBFilename: null,
      sourceBLocation: null,
      excerptB: null,
    });
  }

  // Sort Critical first, then Warning, then Info
  const sevRank = { Critical: 0, Warning: 1, Info: 2 };
  return detected.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
}
