import { jsPDF } from 'jspdf';
import { ExtractedClaim, HandoverReportSnapshot } from '../types/neash';

function getDisplayTitle(claim: ExtractedClaim): string {
  return (claim.editedTitle ?? claim.originalTitle).trim();
}

function getDisplayDescription(claim: ExtractedClaim): string {
  return (claim.editedDescription ?? claim.originalDescription).trim();
}

export function downloadHandoverPdf(report: HandoverReportSnapshot): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 46;
  const maxWidth = pageWidth - margin * 2;
  let y = 48;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 54) {
      doc.addPage();
      y = 50;
      drawFooter();
    }
  };

  const drawFooter = () => {
    const pageNumber = doc.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 130, 150);
    doc.text(
      `NEASH Project Continuity Handover — ${report.projectName} | Page ${pageNumber}`,
      margin,
      pageHeight - 24
    );
  };

  // Header Banner
  doc.setFillColor(12, 20, 36);
  doc.rect(0, 0, pageWidth, 118, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(96, 165, 250);
  doc.text('NEASH  |  PROJECT KNOWLEDGE HANDOVER REPORT', margin, 34);

  doc.setFontSize(20);
  doc.setTextColor(248, 250, 252);
  doc.text(report.projectName, margin, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Team: ${report.team}   |   Outgoing: ${report.previousOwner}   |   Incoming: ${report.incomingOwner}`,
    margin,
    84
  );
  doc.text(
    `Generated: ${new Date(report.generatedAt).toLocaleString()}   |   Verified Claims: ${report.stats.verifiedCount}   |   Pending: ${report.stats.pendingCount}   |   Excluded Rejected: ${report.stats.rejectedCount}`,
    margin,
    100
  );

  drawFooter();
  y = 142;

  const addSectionTitle = (num: string, title: string, subtitle?: string) => {
    checkPageBreak(44);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + maxWidth, y);
    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${num}. ${title}`, margin, y);
    y += 14;

    if (subtitle) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, margin, y);
      y += 14;
    }
  };

  const addParagraph = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, maxWidth);
    checkPageBreak(lines.length * 14 + 8);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 8;
  };

  const addClaimList = (claims: ExtractedClaim[], emptyText: string) => {
    if (claims.length === 0) {
      addParagraph(emptyText);
      return;
    }

    for (const claim of claims) {
      const title = getDisplayTitle(claim);
      const desc = getDisplayDescription(claim);
      const wasEdited =
        claim.editedTitle !== null || claim.editedDescription !== null;
      const metaParts = [
        `Source: ${claim.sourceFilename} (${claim.sourceLocation})`,
        claim.owner ? `Owner: ${claim.owner}` : null,
        claim.date ? `Date: ${claim.date}` : null,
        wasEdited ? 'Human-Edited' : null,
      ]
        .filter(Boolean)
        .join('  |  ');

      const descLines = doc.splitTextToSize(desc, maxWidth - 14);
      const metaLines = doc.splitTextToSize(metaParts, maxWidth - 14);
      const blockHeight = 16 + descLines.length * 13 + metaLines.length * 11 + 12;

      checkPageBreak(blockHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${title}`, margin + 4, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(descLines, margin + 14, y);
      y += descLines.length * 13 + 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(metaLines, margin + 14, y);
      y += metaLines.length * 11 + 8;
    }
  };

  // Partition verified claims by category
  const verified = report.verifiedClaims;
  const decisions = verified.filter((c) => c.category === 'Decision');
  const completedTasks = verified.filter(
    (c) =>
      (c.category === 'Task' && c.taskStatus === 'Completed') ||
      c.category === 'Milestone'
  );
  const pendingTasks = verified.filter(
    (c) => c.category === 'Task' && c.taskStatus !== 'Completed'
  );
  const blockers = verified.filter((c) => c.category === 'Blocker');
  const risks = verified.filter((c) => c.category === 'Risk');
  const gaps = verified.filter((c) => c.category === 'Knowledge Gap');
  const nextActions = verified.filter((c) => c.category === 'Next Action');

  // 1. Project Overview
  addSectionTitle('1', 'Project Overview');
  addParagraph(report.projectDescription);

  // 2. Project Status
  addSectionTitle('2', 'Project Status');
  addParagraph(
    `Current Handover Status: ${report.projectStatus}. Outgoing Owner: ${report.previousOwner}. Incoming Owner: ${report.incomingOwner}. ` +
      `Knowledge Verification Summary: ${report.stats.verifiedCount} verified facts included below, ${report.stats.pendingCount} unverified claims separated in the Pending Review appendix, and ${report.stats.rejectedCount} rejected claims excluded.`
  );

  // 3. Important Decisions (Verified)
  addSectionTitle('3', 'Important Decisions (Verified)');
  addClaimList(decisions, 'No verified decisions recorded yet.');

  // 4. Completed Tasks & Milestones (Verified)
  addSectionTitle('4', 'Completed Tasks & Milestones (Verified)');
  addClaimList(
    completedTasks,
    'No verified completed tasks or milestones recorded yet.'
  );

  // 5. Pending Tasks (Verified)
  addSectionTitle('5', 'Pending Tasks (Verified)');
  addClaimList(pendingTasks, 'No verified pending tasks recorded yet.');

  // 6. Current Blockers (Verified)
  addSectionTitle('6', 'Current Blockers (Verified)');
  addClaimList(blockers, 'No verified active blockers recorded yet.');

  // 7. Risks and Dependencies (Verified)
  addSectionTitle('7', 'Risks and Dependencies (Verified)');
  addClaimList(risks, 'No verified risks or external dependencies recorded yet.');

  // 8. Knowledge Gaps (Verified)
  addSectionTitle('8', 'Knowledge Gaps (Verified)');
  addClaimList(gaps, 'No verified knowledge gaps recorded yet.');

  // 9. Incoming Member First-Day Action Plan
  addSectionTitle('9', 'Incoming Member First-Day Action Plan (Verified)');
  addClaimList(
    nextActions,
    'Verify Next Action items in the Verification Center to populate the confirmed first-day plan.'
  );

  // 10. Unverified Claims & Evidence Source References
  addSectionTitle(
    '10',
    'Unverified Claims (Pending Human Review) & Source References',
    'Items below are awaiting human sign-off and are NOT presented as confirmed project facts.'
  );
  addClaimList(
    report.pendingClaims,
    'All extracted claims have been reviewed (0 pending claims).'
  );

  // 11. Cross-Source Contradictions, Staleness & Multi-User Sign-Off
  const conflicts = report.conflicts ?? [];
  const openConflicts = conflicts.filter((c) => c.status === 'Open');
  const resolvedConflicts = conflicts.filter((c) => c.status !== 'Open');

  addSectionTitle(
    '11',
    'Cross-Source Reconciliation & Multi-User Sign-Off',
    `${openConflicts.length} open conflict/staleness alerts · ${resolvedConflicts.length} resolved/dismissed.`
  );

  if (conflicts.length === 0) {
    addParagraph('No cross-source contradictions, passed deadlines, or undocumented owners detected.');
  } else {
    for (const conflict of conflicts) {
      const detail = `${conflict.summary} (${conflict.sourceAFilename}${
        conflict.sourceBFilename ? ` vs ${conflict.sourceBFilename}` : ''
      })`;
      const descLines = doc.splitTextToSize(detail, maxWidth - 14);
      checkPageBreak(descLines.length * 13 + 26);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `• [${conflict.severity} · ${conflict.type} · ${conflict.status}] ${conflict.title}`,
        margin + 4,
        y
      );
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(descLines, margin + 14, y);
      y += descLines.length * 12 + 6;
    }
  }

  if (report.signOffs) {
    checkPageBreak(70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Multi-Role Handover Sign-Off Status:', margin, y);
    y += 14;
    for (const role of ['Outgoing Owner', 'Reviewer', 'Incoming Engineer'] as const) {
      const s = report.signOffs[role];
      checkPageBreak(16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const statusText = s?.signedOff
        ? `SIGNED OFF by ${s.actorName || 'User'} at ${
            s.signedAt ? new Date(s.signedAt).toLocaleString() : ''
          }${s.note ? ` — "${s.note}"` : ''}`
        : 'Pending Sign-Off';
      doc.text(`• ${role}: ${statusText}`, margin + 8, y);
      y += 13;
    }
    y += 6;
  }

  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Ingested Source Documents:', margin, y);
  y += 14;
  for (const src of report.sources) {
    checkPageBreak(16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `• ${src.name} (${src.format}) — ${src.origin === 'demo' ? 'DEMO DATA' : 'Uploaded Source'}`,
      margin + 8,
      y
    );
    y += 13;
  }

  const safeSlug = report.projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`NEASH-Handover-${safeSlug || 'project'}.pdf`);
}
