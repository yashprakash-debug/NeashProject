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
  // Traceability
  sourceFilename: string;
  sourceId: string | null;
  sourceLocation: string;
  evidenceExcerpt: string;
  confidence: ConfidenceLevel;
  // Human verification state
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  // Optional structured metadata strictly derived from source
  date?: string;
  owner?: string;
  priority?: string;
  taskStatus?: TaskProgressStatus;
  origin: 'demo' | 'uploaded';
}

export interface ActivityLogItem {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  timestamp: string;
  type: 'extraction' | 'verification' | 'source' | 'project' | 'report';
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
  };
  verifiedClaims: ExtractedClaim[];
  pendingClaims: ExtractedClaim[];
  rejectedCount: number;
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
  activities: ActivityLogItem[];
  reports: Record<string, HandoverReportSnapshot>;
  judgeChecklist?: JudgeChecklistProgress;
}
