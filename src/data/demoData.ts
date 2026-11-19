import {
  ActivityLogItem,
  ClaimCategory,
  ExtractedClaim,
  NeashAppState,
  Project,
  SourceFile,
} from '../types/neash';

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'proj-ecommerce',
    name: 'E-commerce Platform',
    description:
      'B2C retail storefront, checkout orchestration, inventory sync service, and merchant operations portal transitioning from Rahul Sharma to incoming engineering ownership.',
    category: 'Web Platform',
    team: 'Development Team Alpha',
    previousOwner: 'Rahul Sharma',
    incomingOwner: 'New Team Member',
    status: 'Handover in Progress',
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-11-08T16:30:00Z',
    isDemoData: true,
    intelligenceGenerated: true,
    lastExtractedAt: '2026-11-08T16:30:00Z',
  },
  {
    id: 'proj-support',
    name: 'Customer Support Portal',
    description:
      'Internal agent ticketing console, SLA escalation workflow, and automated triage integration preparing for transition from Ananya Iyer to Marcus Chen.',
    category: 'Internal Tooling',
    team: 'Platform Experience Squad',
    previousOwner: 'Ananya Iyer',
    incomingOwner: 'Marcus Chen',
    status: 'Pending Handover',
    createdAt: '2026-10-22T11:15:00Z',
    updatedAt: '2026-11-09T10:20:00Z',
    isDemoData: true,
    intelligenceGenerated: false,
    lastExtractedAt: null,
  },
];

// ============================================================================
// PROJECT 1: E-COMMERCE PLATFORM — 5 INTERNALLY CONSISTENT SAMPLE SOURCES
// ============================================================================

const MEETING_NOTES_PAGE_1 = `E-COMMERCE PLATFORM — ARCHITECTURE & HANDOVER MEETING NOTES
Date: 2026-10-14 | Attendees: Rahul Sharma (Tech Lead), Priya Nair (Backend), Arjun Mehta (Frontend)

1. Context & Transition Scope
Rahul Sharma confirmed his transition to the Core Payments division effective November 20. Development Team Alpha requires a complete knowledge transfer before code freeze.

2. Database Selection Decision
After benchmarking order-line concurrency and relational inventory locks, the team formally agreed: PostgreSQL selected as the primary database for all product, order, and ledger tables. Legacy MySQL prototypes from Q2 were officially deprecated and are not to be used. Database architecture approved by Rahul Sharma and Priya Nair.

3. Frontend Framework Selection
React selected for frontend development paired with TypeScript and Tailwind CSS to share design tokens with the merchant dashboard.`;

const MEETING_NOTES_PAGE_2 = `E-COMMERCE PLATFORM — SPRINT SYNC & SECURITY REVIEW
Date: 2026-10-28 | Attendees: Rahul Sharma, Priya Nair, Neha Kulkarni (QA)

4. Authentication & Session Roadmap
Session cookies will remain active for anonymous carts only. JWT authentication planned for the next milestone to secure customer checkout endpoints and merchant admin routes. Rahul noted that refresh token rotation specs still need final sign-off.

5. API Layer Discussion
The team briefly evaluated GraphQL federation for product search, but rejected GraphQL adoption for V1 due to caching complexity at the CDN edge. Standard versioned REST endpoints remain the agreed architecture.`;

const MEETING_NOTES_PAGE_3 = `E-COMMERCE PLATFORM — HANDOVER READINESS & OPEN QUESTIONS
Date: 2026-11-04 | Attendees: Rahul Sharma, Priya Nair, DevOps Representative

6. Unresolved Questions & Handover Gaps
- Missing deployment ownership information: No named DevOps engineer has been permanently assigned to oversee production releases after Rahul Sharma departs.
- Staging environment variables for the webhook listener are stored locally by Rahul and have not yet been migrated to the team secrets vault.
- Need formal sign-off on load-testing thresholds before Black Friday traffic onboarding.`;

const MEETING_NOTES_FULL = [
  `--- Page 1 ---\n${MEETING_NOTES_PAGE_1}`,
  `--- Page 2 ---\n${MEETING_NOTES_PAGE_2}`,
  `--- Page 3 ---\n${MEETING_NOTES_PAGE_3}`,
].join('\n\n');

const DEV_PROGRESS_TXT = `E-COMMERCE PLATFORM — DEVELOPMENT PROGRESS LOG
Team: Development Team Alpha
Maintainer: Rahul Sharma

[2026-10-30] COMPLETED FEATURES
- UI development completed for the storefront product catalog, variant selector, shopping cart drawer, and responsive checkout layout.
- PostgreSQL core schema migrations (users, products, inventory_items, orders, order_items) applied cleanly in local and dev environments.
- Product search filtering and category pagination verified against 12,000 seeded catalog records.

[2026-11-04] WORK IN PROGRESS
- Backend integration in progress for order creation, stock reservation transactions, and cart-to-order conversion service.
- Payment webhook receiver endpoint scaffolded under /api/v1/payments/webhook, awaiting live signature secret.
- End-to-end API contract test suite currently at 58% endpoint coverage.

[2026-11-08] TECHNICAL CHALLENGES & RISKS
- Checkout inventory lock queries show 340ms p95 latency under simulated 200 concurrent users; composite index tuning is required before launch.
- Delayed deployment risk: Staging cluster lacks automated migration hooks and payment sandbox secrets, putting the November 24 release target at risk.`;

const PENDING_TASKS_CSV = `Task ID,Task Name,Status,Owner,Priority,Deadline,Notes
TASK-101,Payment gateway integration,Pending,Rahul Sharma,High,2026-11-20,Stripe/Razorpay checkout session and webhook verification pending sandbox credentials
TASK-102,API testing,In Progress,Priya Nair,High,2026-11-18,Integration tests for /api/v1/orders and /api/v1/cart currently 58% complete
TASK-103,Database optimisation,Pending,Rahul Sharma,Medium,2026-11-25,Add composite indexes on orders(user_id created_at) and inventory_items(sku) to reduce 340ms p95 latency
TASK-104,Deployment preparation,Blocked,DevOps Queue,High,2026-11-22,Terraform staging variables and release runbook incomplete; awaiting assigned DevOps owner
TASK-105,JWT token refresh flow,Pending,Priya Nair,Medium,2026-11-28,Implement stateless JWT access + refresh token rotation for next milestone
TASK-106,UI development for storefront and cart,Completed,Arjun Mehta,High,2026-10-30,Responsive React storefront catalog and cart drawer merged to main`;

const TECH_ARCH_MD = `# Technical Architecture — E-commerce Platform

Last Updated: 2026-10-20
Primary Author: Rahul Sharma (Development Team Alpha)

## 1. Frontend Layer
- Framework: React 19 with TypeScript and Vite.
- Styling: Tailwind CSS utility design system.
- State Management: React Context for cart state synced with local persistence and optimistic updates.

## 2. Backend Services
- Runtime: Node.js with Express REST API server.
- Responsibilities: Order orchestration, inventory locking, payment intent creation, and webhook ingestion.
- Contact for Backend Walk-through: Priya Nair (priya.nair@alpha-team.internal) or Rahul Sharma prior to Nov 20.

## 3. Database Architecture
- Engine: PostgreSQL 16 (selected as primary transactional store).
- Core Tables: users, products, inventory_items, orders, order_items, payment_events.
- Transaction Policy: Pessimistic row-level locking on inventory_items during checkout confirmation.

## 4. API Structure
All client-facing endpoints follow a versioned REST convention under /api/v1:
- GET /api/v1/products — Paginated catalog listing and attribute filtering
- POST /api/v1/orders — Transactional order creation and inventory reservation
- POST /api/v1/payments/intent — Payment session initialization
- POST /api/v1/payments/webhook — Asynchronous payment state reconciliation

## 5. Known Documentation Gaps
- Undocumented API configuration: Rate-limiting thresholds, CORS origin allowlists for staging, and payment webhook retry/idempotency backoff intervals are configured in local .env files and not yet documented in this repository.
- Error payload schemas for 422 validation responses differ between /orders and /payments endpoints.`;

const TEAM_DISCUSSION_JSON = JSON.stringify(
  [
    {
      id: 'msg-1',
      timestamp: '2026-11-04T10:12:00Z',
      author: 'Priya Nair',
      role: 'Backend Engineer',
      channel: '#ecom-alpha-handover',
      message:
        'Order reservation endpoints are working locally against PostgreSQL 16. Moving on to /api/v1/orders integration tests next.',
    },
    {
      id: 'msg-2',
      timestamp: '2026-11-05T09:40:00Z',
      author: 'Rahul Sharma',
      role: 'Outgoing Tech Lead',
      channel: '#ecom-alpha-handover',
      message:
        'Blocker update: Payment gateway credentials unavailable from the finance vendor portal. We cannot test live checkout callbacks or webhook signatures until sandbox API keys are issued.',
    },
    {
      id: 'msg-3',
      timestamp: '2026-11-05T11:15:00Z',
      author: 'Neha Kulkarni',
      role: 'QA Lead',
      channel: '#ecom-alpha-handover',
      message:
        'Risk flagged: Dependency on external API approval and merchant KYC verification could push end-to-end checkout QA past the November 20 handover cutoff.',
    },
    {
      id: 'msg-4',
      timestamp: '2026-11-06T14:22:00Z',
      author: 'Rahul Sharma',
      role: 'Outgoing Tech Lead',
      channel: '#ecom-alpha-handover',
      message:
        'Deployment configuration incomplete: Staging Kubernetes ingress and secret mounts in Terraform still reference old Q2 cluster names and have not been validated.',
    },
    {
      id: 'msg-5',
      timestamp: '2026-11-07T16:05:00Z',
      author: 'Arjun Mehta',
      role: 'Frontend Engineer',
      channel: '#ecom-alpha-handover',
      message:
        'Unclear maintenance responsibility for the nightly inventory sync cron job once Rahul moves teams. Nobody else currently has alerts routed to them.',
    },
    {
      id: 'msg-6',
      timestamp: '2026-11-08T11:30:00Z',
      author: 'Rahul Sharma',
      role: 'Outgoing Tech Lead',
      channel: '#ecom-alpha-handover',
      message:
        'Handover note for the incoming owner: Please contact the previous project owner (Rahul Sharma, rahul.sharma@alpha-team.internal) and Priya Nair on day one to walk through the local .env secrets and payment sandbox request ticket #FIN-482.',
    },
  ],
  null,
  2
);

// ============================================================================
// PROJECT 2: CUSTOMER SUPPORT PORTAL — PRELOADED SOURCES (UNEXTRACTED)
// ============================================================================

const SUPPORT_BRIEF_MD = `# Customer Support Portal — Project Brief
Date: 2026-10-25
Outgoing Owner: Ananya Iyer | Incoming Owner: Marcus Chen

## Decisions
- Selected Zendesk Webhook Bridge over polling for real-time ticket ingestion.
- Adopted PostgreSQL full-text search for knowledge base article lookup.

## Current Blockers
- SSO SAML metadata certificate expires on 2026-12-01 and needs IT security renewal.

## Knowledge Gaps
- Escalation SLA routing matrix for VIP enterprise accounts is only documented in a private spreadsheet.`;

const SUPPORT_TICKETS_CSV = `Ticket,Task,Status,Owner,Priority,Deadline
SUP-12,Renew SAML SSO certificate,Blocked,Ananya Iyer,High,2026-11-28
SUP-15,Migrate agent macro templates,In Progress,Marcus Chen,Medium,2026-12-05
SUP-19,Document VIP SLA routing rules,Pending,Ananya Iyer,High,2026-11-22`;

const SUPPORT_ARCH_TXT = `CUSTOMER SUPPORT PORTAL — ARCHITECTURE NOTES
Date: 2026-11-02
Frontend: React SPA consuming /api/support/tickets.
Backend: Express API with Redis queue for SLA breach timers.
Risk: Redis persistence snapshot frequency is currently set to every 6 hours, risking recent SLA timer loss on restart.`;

export const DEMO_SOURCES: SourceFile[] = [
  {
    id: 'src-ecom-meeting',
    projectId: 'proj-ecommerce',
    name: 'Project_Meeting_Notes.pdf',
    format: 'PDF',
    sizeBytes: 184320,
    uploadedAt: '2026-11-04T15:00:00Z',
    status: 'Processed',
    origin: 'demo',
    content: MEETING_NOTES_FULL,
    pages: [
      {
        pageNumber: 1,
        title: 'Architecture & Handover Meeting Notes (2026-10-14)',
        text: MEETING_NOTES_PAGE_1,
      },
      {
        pageNumber: 2,
        title: 'Sprint Sync & Security Review (2026-10-28)',
        text: MEETING_NOTES_PAGE_2,
      },
      {
        pageNumber: 3,
        title: 'Handover Readiness & Open Questions (2026-11-04)',
        text: MEETING_NOTES_PAGE_3,
      },
    ],
    extractionNote: 'DEMO DATA — Preloaded multi-page meeting notes document',
  },
  {
    id: 'src-ecom-progress',
    projectId: 'proj-ecommerce',
    name: 'Development_Progress.txt',
    format: 'TXT',
    sizeBytes: 2480,
    uploadedAt: '2026-11-08T12:15:00Z',
    status: 'Processed',
    origin: 'demo',
    content: DEV_PROGRESS_TXT,
    extractionNote: 'DEMO DATA — Preloaded engineering progress log',
  },
  {
    id: 'src-ecom-tasks',
    projectId: 'proj-ecommerce',
    name: 'Pending_Tasks.csv',
    format: 'CSV',
    sizeBytes: 1420,
    uploadedAt: '2026-11-08T13:00:00Z',
    status: 'Processed',
    origin: 'demo',
    content: PENDING_TASKS_CSV,
    extractionNote: 'DEMO DATA — Preloaded CSV task tracker export',
  },
  {
    id: 'src-ecom-arch',
    projectId: 'proj-ecommerce',
    name: 'Technical_Architecture.md',
    format: 'MD',
    sizeBytes: 3150,
    uploadedAt: '2026-11-08T14:10:00Z',
    status: 'Processed',
    origin: 'demo',
    content: TECH_ARCH_MD,
    extractionNote: 'DEMO DATA — Preloaded technical architecture specification',
  },
  {
    id: 'src-ecom-discussion',
    projectId: 'proj-ecommerce',
    name: 'Team_Discussion.json',
    format: 'JSON',
    sizeBytes: 2890,
    uploadedAt: '2026-11-08T16:00:00Z',
    status: 'Processed',
    origin: 'demo',
    content: TEAM_DISCUSSION_JSON,
    extractionNote: 'DEMO DATA — Preloaded team chat export JSON',
  },
  // Project 2 sources (Ready for extraction)
  {
    id: 'src-sup-brief',
    projectId: 'proj-support',
    name: 'Support_Portal_Brief.md',
    format: 'MD',
    sizeBytes: 1120,
    uploadedAt: '2026-11-09T09:00:00Z',
    status: 'Ready',
    origin: 'demo',
    content: SUPPORT_BRIEF_MD,
    extractionNote: 'DEMO DATA — Preloaded project brief (ready for extraction)',
  },
  {
    id: 'src-sup-tickets',
    projectId: 'proj-support',
    name: 'Open_Tickets_Export.csv',
    format: 'CSV',
    sizeBytes: 840,
    uploadedAt: '2026-11-09T09:05:00Z',
    status: 'Ready',
    origin: 'demo',
    content: SUPPORT_TICKETS_CSV,
    extractionNote: 'DEMO DATA — Preloaded ticket CSV (ready for extraction)',
  },
  {
    id: 'src-sup-arch',
    projectId: 'proj-support',
    name: 'Architecture_Notes.txt',
    format: 'TXT',
    sizeBytes: 910,
    uploadedAt: '2026-11-09T09:10:00Z',
    status: 'Ready',
    origin: 'demo',
    content: SUPPORT_ARCH_TXT,
    extractionNote: 'DEMO DATA — Preloaded architecture notes (ready for extraction)',
  },
];

// ============================================================================
// DETERMINISTIC EXTRACTED CLAIMS FOR E-COMMERCE PLATFORM
// Every evidenceExcerpt is a verbatim substring of its source's `content`.
// ============================================================================

export function createEcommerceDemoClaims(initialReviewPreset = true): ExtractedClaim[] {
  const base: Array<
    Omit<
      ExtractedClaim,
      'editedTitle' | 'editedDescription' | 'reviewedBy' | 'reviewedAt' | 'reviewerNote' | 'origin'
    >
  > = [
    // A. DECISIONS
    {
      id: 'claim-ecom-01',
      projectId: 'proj-ecommerce',
      category: 'Decision',
      originalTitle: 'PostgreSQL selected as the primary database',
      originalDescription:
        'Development Team Alpha standardized on PostgreSQL 16 for product catalog, transactional orders, and ledger records to support row-level inventory locking.',
      sourceFilename: 'Project_Meeting_Notes.pdf',
      sourceId: 'src-ecom-meeting',
      sourceLocation: 'Page 1, Section 2 (Database Selection Decision)',
      evidenceExcerpt:
        'PostgreSQL selected as the primary database for all product, order, and ledger tables.',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-10-14',
      owner: 'Rahul Sharma',
    },
    {
      id: 'claim-ecom-02',
      projectId: 'proj-ecommerce',
      category: 'Decision',
      originalTitle: 'React selected for frontend development',
      originalDescription:
        'The storefront and merchant portal UI use React paired with TypeScript and Tailwind CSS for shared component and design-token consistency.',
      sourceFilename: 'Project_Meeting_Notes.pdf',
      sourceId: 'src-ecom-meeting',
      sourceLocation: 'Page 1, Section 3 (Frontend Framework Selection)',
      evidenceExcerpt:
        'React selected for frontend development paired with TypeScript and Tailwind CSS to share design tokens with the merchant dashboard.',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-10-14',
      owner: 'Arjun Mehta',
    },
    {
      id: 'claim-ecom-03',
      projectId: 'proj-ecommerce',
      category: 'Decision',
      originalTitle: 'JWT authentication planned for the next milestone',
      originalDescription:
        'Customer checkout and merchant admin endpoints will transition to stateless JWT access and refresh tokens in the upcoming milestone.',
      sourceFilename: 'Project_Meeting_Notes.pdf',
      sourceId: 'src-ecom-meeting',
      sourceLocation: 'Page 2, Section 4 (Authentication & Session Roadmap)',
      evidenceExcerpt:
        'JWT authentication planned for the next milestone to secure customer checkout endpoints and merchant admin routes.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-10-28',
      owner: 'Priya Nair',
    },
    {
      id: 'claim-ecom-04',
      projectId: 'proj-ecommerce',
      category: 'Decision',
      originalTitle: 'Versioned REST API convention under /api/v1',
      originalDescription:
        'All client-facing backend services expose versioned REST endpoints (/api/v1/products, /orders, /payments) powered by Node.js and Express.',
      sourceFilename: 'Technical_Architecture.md',
      sourceId: 'src-ecom-arch',
      sourceLocation: 'Section 4 (API Structure), Lines 28–33',
      evidenceExcerpt:
        'All client-facing endpoints follow a versioned REST convention under /api/v1:',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-10-20',
      owner: 'Rahul Sharma',
    },
    {
      id: 'claim-ecom-05',
      projectId: 'proj-ecommerce',
      category: 'Decision',
      originalTitle: 'Evaluate GraphQL federation for V1 product search',
      originalDescription:
        'Superseded proposal from early sprint sync to introduce GraphQL federation at the API gateway for storefront search.',
      sourceFilename: 'Project_Meeting_Notes.pdf',
      sourceId: 'src-ecom-meeting',
      sourceLocation: 'Page 2, Section 5 (API Layer Discussion)',
      evidenceExcerpt:
        'The team briefly evaluated GraphQL federation for product search, but rejected GraphQL adoption for V1 due to caching complexity at the CDN edge.',
      confidence: 'Medium',
      reviewStatus: initialReviewPreset ? 'Rejected' : 'Pending Review',
      date: '2026-10-28',
    },

    // B. TASKS
    {
      id: 'claim-ecom-06',
      projectId: 'proj-ecommerce',
      category: 'Task',
      originalTitle: 'Payment gateway integration',
      originalDescription:
        'Complete Stripe/Razorpay checkout session initialization and webhook signature verification once sandbox credentials arrive.',
      sourceFilename: 'Pending_Tasks.csv',
      sourceId: 'src-ecom-tasks',
      sourceLocation: 'Row 2 (TASK-101)',
      evidenceExcerpt:
        'TASK-101,Payment gateway integration,Pending,Rahul Sharma,High,2026-11-20,Stripe/Razorpay checkout session and webhook verification pending sandbox credentials',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-20',
      owner: 'Rahul Sharma',
      priority: 'High',
      taskStatus: 'Pending',
    },
    {
      id: 'claim-ecom-07',
      projectId: 'proj-ecommerce',
      category: 'Task',
      originalTitle: 'API testing for order and cart endpoints',
      originalDescription:
        'Finish integration test coverage for /api/v1/orders and /api/v1/cart (currently 58% complete).',
      sourceFilename: 'Pending_Tasks.csv',
      sourceId: 'src-ecom-tasks',
      sourceLocation: 'Row 3 (TASK-102)',
      evidenceExcerpt:
        'TASK-102,API testing,In Progress,Priya Nair,High,2026-11-18,Integration tests for /api/v1/orders and /api/v1/cart currently 58% complete',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-18',
      owner: 'Priya Nair',
      priority: 'High',
      taskStatus: 'In Progress',
    },
    {
      id: 'claim-ecom-08',
      projectId: 'proj-ecommerce',
      category: 'Task',
      originalTitle: 'Database optimisation and composite indexing',
      originalDescription:
        'Add composite indexes on orders(user_id, created_at) and inventory_items(sku) to eliminate 340ms p95 checkout query latency.',
      sourceFilename: 'Pending_Tasks.csv',
      sourceId: 'src-ecom-tasks',
      sourceLocation: 'Row 4 (TASK-103)',
      evidenceExcerpt:
        'TASK-103,Database optimisation,Pending,Rahul Sharma,Medium,2026-11-25,Add composite indexes on orders(user_id created_at) and inventory_items(sku) to reduce 340ms p95 latency',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-11-25',
      owner: 'Rahul Sharma',
      priority: 'Medium',
      taskStatus: 'Pending',
    },
    {
      id: 'claim-ecom-09',
      projectId: 'proj-ecommerce',
      category: 'Task',
      originalTitle: 'Deployment preparation and staging Terraform runbook',
      originalDescription:
        'Update staging Terraform variables and author the production release runbook; currently blocked pending assigned DevOps ownership.',
      sourceFilename: 'Pending_Tasks.csv',
      sourceId: 'src-ecom-tasks',
      sourceLocation: 'Row 5 (TASK-104)',
      evidenceExcerpt:
        'TASK-104,Deployment preparation,Blocked,DevOps Queue,High,2026-11-22,Terraform staging variables and release runbook incomplete; awaiting assigned DevOps owner',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-22',
      owner: 'DevOps Queue',
      priority: 'High',
      taskStatus: 'Blocked',
    },
    {
      id: 'claim-ecom-10',
      projectId: 'proj-ecommerce',
      category: 'Task',
      originalTitle: 'Storefront product catalog and cart UI completed',
      originalDescription:
        'Responsive React product catalog, variant selector, and shopping cart drawer merged to main branch.',
      sourceFilename: 'Pending_Tasks.csv',
      sourceId: 'src-ecom-tasks',
      sourceLocation: 'Row 7 (TASK-106)',
      evidenceExcerpt:
        'TASK-106,UI development for storefront and cart,Completed,Arjun Mehta,High,2026-10-30,Responsive React storefront catalog and cart drawer merged to main',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-10-30',
      owner: 'Arjun Mehta',
      priority: 'High',
      taskStatus: 'Completed',
    },

    // C. BLOCKERS
    {
      id: 'claim-ecom-11',
      projectId: 'proj-ecommerce',
      category: 'Blocker',
      originalTitle: 'Payment gateway credentials unavailable',
      originalDescription:
        'Sandbox API keys and webhook signing secrets have not been issued by the finance vendor portal, blocking live checkout callback testing.',
      sourceFilename: 'Team_Discussion.json',
      sourceId: 'src-ecom-discussion',
      sourceLocation: 'Message #2 (msg-2, #ecom-alpha-handover)',
      evidenceExcerpt:
        'Blocker update: Payment gateway credentials unavailable from the finance vendor portal. We cannot test live checkout callbacks or webhook signatures until sandbox API keys are issued.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-05',
      owner: 'Rahul Sharma',
    },
    {
      id: 'claim-ecom-12',
      projectId: 'proj-ecommerce',
      category: 'Blocker',
      originalTitle: 'Deployment configuration incomplete',
      originalDescription:
        'Staging Kubernetes ingress and Terraform secret mounts still reference deprecated Q2 cluster names and remain unvalidated.',
      sourceFilename: 'Team_Discussion.json',
      sourceId: 'src-ecom-discussion',
      sourceLocation: 'Message #4 (msg-4, #ecom-alpha-handover)',
      evidenceExcerpt:
        'Deployment configuration incomplete: Staging Kubernetes ingress and secret mounts in Terraform still reference old Q2 cluster names and have not been validated.',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-11-06',
      owner: 'Rahul Sharma',
    },

    // D. RISKS
    {
      id: 'claim-ecom-13',
      projectId: 'proj-ecommerce',
      category: 'Risk',
      originalTitle: 'Delayed deployment target due to missing staging hooks',
      originalDescription:
        'Lack of automated database migration hooks and missing sandbox secrets in staging threaten the November 24 release target.',
      sourceFilename: 'Development_Progress.txt',
      sourceId: 'src-ecom-progress',
      sourceLocation: 'Lines 17–19 ([2026-11-08] Technical Challenges)',
      evidenceExcerpt:
        'Delayed deployment risk: Staging cluster lacks automated migration hooks and payment sandbox secrets, putting the November 24 release target at risk.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-08',
    },
    {
      id: 'claim-ecom-14',
      projectId: 'proj-ecommerce',
      category: 'Risk',
      originalTitle: 'Missing API error-handling and validation schema documentation',
      originalDescription:
        '422 validation error payload formats diverge between /orders and /payments endpoints, creating integration risk for incoming engineers.',
      sourceFilename: 'Technical_Architecture.md',
      sourceId: 'src-ecom-arch',
      sourceLocation: 'Section 5 (Known Documentation Gaps)',
      evidenceExcerpt:
        'Error payload schemas for 422 validation responses differ between /orders and /payments endpoints.',
      confidence: 'Medium',
      reviewStatus: 'Pending Review',
    },
    {
      id: 'claim-ecom-15',
      projectId: 'proj-ecommerce',
      category: 'Risk',
      originalTitle: 'Dependency on external API approval and KYC',
      originalDescription:
        'External payment provider KYC verification could delay end-to-end checkout QA past the November 20 handover cutoff.',
      sourceFilename: 'Team_Discussion.json',
      sourceId: 'src-ecom-discussion',
      sourceLocation: 'Message #3 (msg-3, #ecom-alpha-handover)',
      evidenceExcerpt:
        'Risk flagged: Dependency on external API approval and merchant KYC verification could push end-to-end checkout QA past the November 20 handover cutoff.',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-11-05',
      owner: 'Neha Kulkarni',
    },

    // E. MILESTONES
    {
      id: 'claim-ecom-16',
      projectId: 'proj-ecommerce',
      category: 'Milestone',
      originalTitle: 'UI development completed',
      originalDescription:
        'Storefront product catalog, variant selector, cart drawer, and responsive checkout screens are completed and merged.',
      sourceFilename: 'Development_Progress.txt',
      sourceId: 'src-ecom-progress',
      sourceLocation: 'Lines 5–7 ([2026-10-30] Completed Features)',
      evidenceExcerpt:
        'UI development completed for the storefront product catalog, variant selector, shopping cart drawer, and responsive checkout layout.',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-10-30',
    },
    {
      id: 'claim-ecom-17',
      projectId: 'proj-ecommerce',
      category: 'Milestone',
      originalTitle: 'Database architecture approved',
      originalDescription:
        'PostgreSQL relational schema for users, products, inventory_items, orders, and ledger tables approved by Rahul Sharma and Priya Nair.',
      sourceFilename: 'Project_Meeting_Notes.pdf',
      sourceId: 'src-ecom-meeting',
      sourceLocation: 'Page 1, Section 2 (Database Selection Decision)',
      evidenceExcerpt:
        'Database architecture approved by Rahul Sharma and Priya Nair.',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-10-14',
    },
    {
      id: 'claim-ecom-18',
      projectId: 'proj-ecommerce',
      category: 'Milestone',
      originalTitle: 'Backend integration in progress',
      originalDescription:
        'Order creation, stock reservation transactions, and cart-to-order conversion service are actively under integration.',
      sourceFilename: 'Development_Progress.txt',
      sourceId: 'src-ecom-progress',
      sourceLocation: 'Lines 10–12 ([2026-11-04] Work in Progress)',
      evidenceExcerpt:
        'Backend integration in progress for order creation, stock reservation transactions, and cart-to-order conversion service.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-04',
    },

    // F. KNOWLEDGE GAPS
    {
      id: 'claim-ecom-19',
      projectId: 'proj-ecommerce',
      category: 'Knowledge Gap',
      originalTitle: 'Missing deployment ownership information',
      originalDescription:
        'No named DevOps engineer has been assigned to take over production deployments and Terraform secrets after Rahul Sharma transitions.',
      sourceFilename: 'Project_Meeting_Notes.pdf',
      sourceId: 'src-ecom-meeting',
      sourceLocation: 'Page 3, Section 6 (Unresolved Questions)',
      evidenceExcerpt:
        'Missing deployment ownership information: No named DevOps engineer has been permanently assigned to oversee production releases after Rahul Sharma departs.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-04',
    },
    {
      id: 'claim-ecom-20',
      projectId: 'proj-ecommerce',
      category: 'Knowledge Gap',
      originalTitle: 'Undocumented API configuration and webhook retries',
      originalDescription:
        'Rate limits, staging CORS allowlists, and webhook idempotency/retry intervals exist only in local .env files and are missing from repository docs.',
      sourceFilename: 'Technical_Architecture.md',
      sourceId: 'src-ecom-arch',
      sourceLocation: 'Section 5 (Known Documentation Gaps)',
      evidenceExcerpt:
        'Undocumented API configuration: Rate-limiting thresholds, CORS origin allowlists for staging, and payment webhook retry/idempotency backoff intervals are configured in local .env files and not yet documented in this repository.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
    },
    {
      id: 'claim-ecom-21',
      projectId: 'proj-ecommerce',
      category: 'Knowledge Gap',
      originalTitle: 'Unclear maintenance responsibility for inventory sync cron',
      originalDescription:
        'Alert routing and operational ownership for the nightly inventory sync job remain unassigned after Rahul Sharma moves teams.',
      sourceFilename: 'Team_Discussion.json',
      sourceId: 'src-ecom-discussion',
      sourceLocation: 'Message #5 (msg-5, #ecom-alpha-handover)',
      evidenceExcerpt:
        'Unclear maintenance responsibility for the nightly inventory sync cron job once Rahul moves teams. Nobody else currently has alerts routed to them.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-07',
    },
    {
      id: 'claim-ecom-22',
      projectId: 'proj-ecommerce',
      category: 'Knowledge Gap',
      originalTitle: 'Legacy MySQL Q2 prototype migration guide',
      originalDescription:
        'Archived note referencing Q2 MySQL prototypes; confirmed deprecated and excluded from the active handover scope.',
      sourceFilename: 'Project_Meeting_Notes.pdf',
      sourceId: 'src-ecom-meeting',
      sourceLocation: 'Page 1, Section 2',
      evidenceExcerpt:
        'Legacy MySQL prototypes from Q2 were officially deprecated and are not to be used.',
      confidence: 'Low',
      reviewStatus: initialReviewPreset ? 'Rejected' : 'Pending Review',
      date: '2026-10-14',
    },

    // G. NEXT ACTIONS
    {
      id: 'claim-ecom-23',
      projectId: 'proj-ecommerce',
      category: 'Next Action',
      originalTitle: 'Review backend architecture and PostgreSQL locking policy',
      originalDescription:
        'Inspect the Node.js/Express REST services, PostgreSQL 16 schema, and pessimistic row-level locking on inventory_items.',
      sourceFilename: 'Technical_Architecture.md',
      sourceId: 'src-ecom-arch',
      sourceLocation: 'Sections 2 & 3, Lines 11–26',
      evidenceExcerpt:
        'Transaction Policy: Pessimistic row-level locking on inventory_items during checkout confirmation.',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
    },
    {
      id: 'claim-ecom-24',
      projectId: 'proj-ecommerce',
      category: 'Next Action',
      originalTitle: 'Contact the previous project owner for secrets & sandbox ticket',
      originalDescription:
        'Schedule day-one sync with Rahul Sharma (rahul.sharma@alpha-team.internal) and Priya Nair to transfer local .env secrets and follow up on finance ticket #FIN-482.',
      sourceFilename: 'Team_Discussion.json',
      sourceId: 'src-ecom-discussion',
      sourceLocation: 'Message #6 (msg-6, #ecom-alpha-handover)',
      evidenceExcerpt:
        'Please contact the previous project owner (Rahul Sharma, rahul.sharma@alpha-team.internal) and Priya Nair on day one to walk through the local .env secrets and payment sandbox request ticket #FIN-482.',
      confidence: 'High',
      reviewStatus: initialReviewPreset ? 'Verified' : 'Pending Review',
      date: '2026-11-08',
      owner: 'New Team Member',
    },
    {
      id: 'claim-ecom-25',
      projectId: 'proj-ecommerce',
      category: 'Next Action',
      originalTitle: 'Complete pending API integration tests with Priya Nair',
      originalDescription:
        'Pair with Priya Nair to finish the remaining 42% of /api/v1/orders and /api/v1/cart integration tests prior to November 18.',
      sourceFilename: 'Pending_Tasks.csv',
      sourceId: 'src-ecom-tasks',
      sourceLocation: 'Row 3 (TASK-102)',
      evidenceExcerpt:
        'TASK-102,API testing,In Progress,Priya Nair,High,2026-11-18,Integration tests for /api/v1/orders and /api/v1/cart currently 58% complete',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-18',
      owner: 'Priya Nair',
    },
  ];

  return base.map((item) => ({
    ...item,
    editedTitle: null,
    editedDescription: null,
    citationVerified: true,
    citationMatchType: 'exact' as const,
    reviewedBy: item.reviewStatus !== 'Pending Review' ? 'Demo User' : null,
    reviewedByRole: item.reviewStatus !== 'Pending Review' ? 'Reviewer' : null,
    reviewedAt: item.reviewStatus !== 'Pending Review' ? '2026-11-09T10:00:00Z' : null,
    reviewerNote:
      item.reviewStatus === 'Rejected'
        ? 'Marked out of scope during initial demo triage (superseded by PostgreSQL / REST V1).'
        : null,
    origin: 'demo',
  }));
}

export function createSupportPortalDemoClaims(): ExtractedClaim[] {
  const items: Array<
    Omit<
      ExtractedClaim,
      'editedTitle' | 'editedDescription' | 'reviewedBy' | 'reviewedAt' | 'reviewerNote' | 'origin'
    >
  > = [
    {
      id: 'claim-sup-01',
      projectId: 'proj-support',
      category: 'Decision',
      originalTitle: 'Zendesk Webhook Bridge selected for real-time ingestion',
      originalDescription:
        'Portal ingests support tickets via Zendesk Webhook Bridge rather than scheduled polling.',
      sourceFilename: 'Support_Portal_Brief.md',
      sourceId: 'src-sup-brief',
      sourceLocation: 'Decisions Section, Line 6',
      evidenceExcerpt:
        'Selected Zendesk Webhook Bridge over polling for real-time ticket ingestion.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-10-25',
    },
    {
      id: 'claim-sup-02',
      projectId: 'proj-support',
      category: 'Decision',
      originalTitle: 'PostgreSQL full-text search adopted for KB lookup',
      originalDescription:
        'Knowledge base article search is backed by native PostgreSQL full-text indexing.',
      sourceFilename: 'Support_Portal_Brief.md',
      sourceId: 'src-sup-brief',
      sourceLocation: 'Decisions Section, Line 7',
      evidenceExcerpt:
        'Adopted PostgreSQL full-text search for knowledge base article lookup.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-10-25',
    },
    {
      id: 'claim-sup-03',
      projectId: 'proj-support',
      category: 'Blocker',
      originalTitle: 'SSO SAML metadata certificate expiring 2026-12-01',
      originalDescription:
        'Agent login SSO relies on an SAML metadata certificate expiring December 1 that requires IT Security renewal.',
      sourceFilename: 'Support_Portal_Brief.md',
      sourceId: 'src-sup-brief',
      sourceLocation: 'Current Blockers Section, Line 10',
      evidenceExcerpt:
        'SSO SAML metadata certificate expires on 2026-12-01 and needs IT security renewal.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-12-01',
      owner: 'Ananya Iyer',
    },
    {
      id: 'claim-sup-04',
      projectId: 'proj-support',
      category: 'Knowledge Gap',
      originalTitle: 'VIP enterprise SLA routing matrix undocumented in repo',
      originalDescription:
        'Escalation rules for VIP enterprise accounts currently exist only in a private spreadsheet.',
      sourceFilename: 'Support_Portal_Brief.md',
      sourceId: 'src-sup-brief',
      sourceLocation: 'Knowledge Gaps Section, Line 13',
      evidenceExcerpt:
        'Escalation SLA routing matrix for VIP enterprise accounts is only documented in a private spreadsheet.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
    },
    {
      id: 'claim-sup-05',
      projectId: 'proj-support',
      category: 'Task',
      originalTitle: 'Migrate agent macro templates',
      originalDescription:
        'Transfer legacy agent response macros to the new portal template engine.',
      sourceFilename: 'Open_Tickets_Export.csv',
      sourceId: 'src-sup-tickets',
      sourceLocation: 'Row 3 (SUP-15)',
      evidenceExcerpt: 'SUP-15,Migrate agent macro templates,In Progress,Marcus Chen,Medium,2026-12-05',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-12-05',
      owner: 'Marcus Chen',
      priority: 'Medium',
      taskStatus: 'In Progress',
    },
    {
      id: 'claim-sup-06',
      projectId: 'proj-support',
      category: 'Risk',
      originalTitle: 'Redis 6-hour snapshot interval risks SLA timer loss',
      originalDescription:
        'A Redis restart between 6-hour RDB snapshots could drop active SLA breach timers.',
      sourceFilename: 'Architecture_Notes.txt',
      sourceId: 'src-sup-arch',
      sourceLocation: 'Line 5 (Risk Note)',
      evidenceExcerpt:
        'Risk: Redis persistence snapshot frequency is currently set to every 6 hours, risking recent SLA timer loss on restart.',
      confidence: 'High',
      reviewStatus: 'Pending Review',
      date: '2026-11-02',
    },
    {
      id: 'claim-sup-07',
      projectId: 'proj-support',
      category: 'Next Action',
      originalTitle: 'Request VIP SLA spreadsheet access from Ananya Iyer',
      originalDescription:
        'Coordinate with Ananya Iyer before 2026-11-22 to document VIP SLA routing rules in the repository.',
      sourceFilename: 'Open_Tickets_Export.csv',
      sourceId: 'src-sup-tickets',
      sourceLocation: 'Row 4 (SUP-19)',
      evidenceExcerpt:
        'SUP-19,Document VIP SLA routing rules,Pending,Ananya Iyer,High,2026-11-22',
      confidence: 'Medium',
      reviewStatus: 'Pending Review',
      date: '2026-11-22',
      owner: 'Ananya Iyer',
    },
  ];

  return items.map((item) => ({
    ...item,
    editedTitle: null,
    editedDescription: null,
    citationVerified: true,
    citationMatchType: 'exact' as const,
    reviewedBy: null,
    reviewedByRole: null,
    reviewedAt: null,
    reviewerNote: null,
    origin: 'demo',
  }));
}

export const INITIAL_ACTIVITIES: ActivityLogItem[] = [
  {
    id: 'act-1',
    projectId: 'proj-ecommerce',
    title: 'Sample Knowledge Extracted (DEMO DATA)',
    detail: '25 structured claims extracted across 5 source documents for E-commerce Platform.',
    timestamp: '2026-11-08T16:30:00Z',
    type: 'extraction',
    read: false,
  },
  {
    id: 'act-2',
    projectId: 'proj-ecommerce',
    title: 'Initial Verification Triage Recorded',
    detail: '10 claims pre-triaged (8 verified, 2 rejected) in demo baseline; 15 pending human review.',
    timestamp: '2026-11-09T10:00:00Z',
    type: 'verification',
    read: false,
  },
  {
    id: 'act-3',
    projectId: 'proj-support',
    title: 'Sources Ready for Analysis',
    detail: '3 sample sources staged for Customer Support Portal. Run intelligence extraction to analyze.',
    timestamp: '2026-11-09T10:20:00Z',
    type: 'source',
    read: true,
  },
];

export function createDefaultProjectSignOffs() {
  return {
    'Outgoing Owner': {
      role: 'Outgoing Owner' as const,
      signedOff: false,
      actorName: null,
      signedAt: null,
      note: null,
    },
    Reviewer: {
      role: 'Reviewer' as const,
      signedOff: false,
      actorName: null,
      signedAt: null,
      note: null,
    },
    'Incoming Engineer': {
      role: 'Incoming Engineer' as const,
      signedOff: false,
      actorName: null,
      signedAt: null,
      note: null,
    },
  };
}

export function createInitialDemoState(): NeashAppState {
  const claims = createEcommerceDemoClaims(true);
  return {
    projects: DEMO_PROJECTS.map((p) => ({ ...p })),
    activeProjectId: 'proj-ecommerce',
    sources: DEMO_SOURCES.map((s) => ({ ...s })),
    claims,
    conflicts: [],
    signOffs: {
      'proj-ecommerce': createDefaultProjectSignOffs(),
      'proj-support': createDefaultProjectSignOffs(),
    },
    auditTrail: [
      {
        id: 'aud-init-1',
        projectId: 'proj-ecommerce',
        timestamp: '2026-11-09T10:00:00Z',
        actorName: 'Rahul Sharma',
        actorRole: 'Outgoing Owner',
        action: 'CLAIM_VERIFIED',
        targetId: 'claim-ecom-01',
        targetLabel: 'PostgreSQL selected as the primary database',
        detail: 'Baseline architecture claims pre-verified in DEMO DATA.',
      },
    ],
    activities: INITIAL_ACTIVITIES.map((a) => ({ ...a })),
    reports: {},
    workspaceId: null,
    workspaceUpdatedAt: null,
  };
}

export const ALL_CLAIM_CATEGORIES: ClaimCategory[] = [
  'Decision',
  'Task',
  'Blocker',
  'Risk',
  'Milestone',
  'Knowledge Gap',
  'Next Action',
];
