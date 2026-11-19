export type NavRoute =
  | 'overview'
  | 'projects'
  | 'sources'
  | 'knowledge'
  | 'verification'
  | 'timeline'
  | 'first-day'
  | 'reports'
  | 'settings';

export type ProjectStatus =
  | 'Handover in Progress'
  | 'Pending Handover'
  | 'Ready for Transition'
  | 'Completed';

export type ProjectCategory =
  | 'Web Platform'
  | 'Backend Infrastructure'
  | 'Internal Tooling'
  | 'Mobile Application'
  | 'Data & Analytics';

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  team: string;
  previousOwner: string;
  incomingOwner: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  isDemoData: boolean;
  intelligenceGenerated: boolean;
  lastExtractedAt: string | null;
}

export type SourceFormat = 'PDF' | 'TXT' | 'CSV' | 'MD' | 'JSON' | 'UNSUPPORTED';

export type SourceProcessingStatus =
  | 'Ready'
  | 'Processing'
  | 'Processed'
  | 'Unsupported'
  | 'Error';

export interface SourcePage {
  pageNumber: number;
  title?: string;
  text: string;
}

export interface SourceFile {
  id: string;
  projectId: string;
  name: string;
  format: SourceFormat;
  sizeBytes: number;
  uploadedAt: string;
  status: SourceProcessingStatus;
  origin: 'demo' | 'uploaded';
  content: string;
  pages?: SourcePage[];
  extractionNote: string;
}

export type ClaimCategory =
  | 'Decision'
  | 'Task'
  | 'Blocker'
  | 'Risk'
  | 'Milestone'
  | 'Knowledge Gap'
  | 'Next Action';

export type ReviewStatus = 'Pending Review' | 'Verified' | 'Rejected';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type TaskProgressStatus = 'Completed' | 'In Progress' | 'Pending' | 'Blocked';

export type CitationMatchType = 'exact' | 'normalized' | 'unverified';

export interface ExtractedClaim {
  id: string;
  projectId: string;
  category: ClaimCategory;
  // Immutable AI/Extraction output
  originalTitle: string;
  originalDescription: string;
  // Human-edited fields kept strictly separate
  editedTitle: string | null;
  editedDescription: string | null;
  // Traceability & Programmatic Citation Verification
  sourceFilename: string;
  sourceId: string | null;
  sourceLocation: string;
  evidenceExcerpt: string;
  citationVerified?: boolean;
  citationMatchType?: CitationMatchType;
  unverifiedQuote?: string | null;
  confidence: ConfidenceLevel;
  // Human verification state
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedByRole?: CollaboratorRole | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  // Optional structured metadata strictly derived from source
  date?: string;
  owner?: string;
  priority?: string;
  taskStatus?: TaskProgressStatus;
  origin: 'demo' | 'uploaded';
  extractedByModel?: string;
}

export type ConflictType =
  | 'Contradiction'
  | 'Status Mismatch'
  | 'Stale Fact'
  | 'Passed Deadline'
  | 'Undocumented Owner';

export type ConflictSeverity = 'Critical' | 'Warning' | 'Info';

export type ConflictStatus = 'Open' | 'Resolved' | 'Dismissed';

export interface ReconciliationConflict {
  id: string;
  projectId: string;
  type: ConflictType;
  severity: ConflictSeverity;
  status: ConflictStatus;
  title: string;
  summary: string;
  sourceAFilename: string;
  sourceALocation: string;
  excerptA: string;
  sourceBFilename: string | null;
  sourceBLocation: string | null;
  excerptB: string | null;
  detectedAt: string;
  resolvedBy?: string | null;
  resolvedByRole?: CollaboratorRole | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
}

export type CollaboratorRole =
  | 'Outgoing Owner'
  | 'Reviewer'
  | 'Incoming Engineer';

export interface RoleSignOff {
  role: CollaboratorRole;
  signedOff: boolean;
  actorName: string | null;
  signedAt: string | null;
  note: string | null;
}

export interface AuditTrailEntry {
  id: string;
  projectId: string;
  timestamp: string;
  actorName: string;
  actorRole: CollaboratorRole;
  action:
    | 'CLAIM_VERIFIED'
    | 'CLAIM_REJECTED'
    | 'CLAIM_REOPENED'
    | 'CLAIM_EDITED'
    | 'CONFLICT_RESOLVED'
    | 'CONFLICT_DISMISSED'
    | 'CONFLICT_REOPENED'
    | 'ROLE_SIGNED_OFF'
    | 'SIGNOFF_REVOKED'
    | 'AI_EXTRACTION_RUN'
    | 'WORKSPACE_SHARED';
  targetId: string;
  targetLabel: string;
  detail: string;
}

export interface CollaboratorProfile {
  name: string;
  role: CollaboratorRole;
}

export interface ActivityLogItem {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  timestamp: string;
  type: 'extraction' | 'verification' | 'source' | 'project' | 'report' | 'conflict' | 'signoff';
  read: boolean;
}

export interface HandoverReportSnapshot {
  id: string;
  projectId: string;
  generatedAt: string;
  projectName: string;
  team: string;
  previousOwner: string;
  incomingOwner: string;
  projectStatus: ProjectStatus;
  projectDescription: string;
  stats: {
    totalExtracted: number;
    verifiedCount: number;
    pendingCount: number;
    rejectedCount: number;
    sourcesCount: number;
    openConflictsCount?: number;
    resolvedConflictsCount?: number;
  };
  verifiedClaims: ExtractedClaim[];
  pendingClaims: ExtractedClaim[];
  rejectedCount: number;
  conflicts?: ReconciliationConflict[];
  signOffs?: Record<CollaboratorRole, RoleSignOff>;
  auditTrail?: AuditTrailEntry[];
  sources: Array<{
    id: string;
    name: string;
    format: SourceFormat;
    origin: 'demo' | 'uploaded';
  }>;
}

export interface JudgeChecklistProgress {
  stepProject: boolean;
  stepSource: boolean;
  stepExtraction: boolean;
  stepEvidence: boolean;
  stepVerification: boolean;
  stepReport: boolean;
  guideCollapsed: boolean;
}

export interface NeashAppState {
  projects: Project[];
  activeProjectId: string;
  sources: SourceFile[];
  claims: ExtractedClaim[];
  conflicts?: ReconciliationConflict[];
  signOffs?: Record<string, Record<CollaboratorRole, RoleSignOff>>;
  auditTrail?: AuditTrailEntry[];
  activities: ActivityLogItem[];
  reports: Record<string, HandoverReportSnapshot>;
  judgeChecklist?: JudgeChecklistProgress;
  workspaceId?: string | null;
  workspaceUpdatedAt?: string | null;
}
