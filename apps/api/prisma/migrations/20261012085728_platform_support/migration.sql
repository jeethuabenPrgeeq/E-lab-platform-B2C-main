-- CreateTable
CREATE TABLE "problem_reports" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "problemSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assigneeId" TEXT,
    "assigneeName" TEXT,
    "resolutionType" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_report_entries" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT,
    "learnerName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "submissionId" TEXT,
    "language" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_report_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_report_events" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_report_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_tickets" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "requesterId" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterRole" TEXT NOT NULL,
    "requesterOrg" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigneeId" TEXT,
    "assigneeName" TEXT,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "escalatedTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tech_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tech_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'investigating',
    "components" JSONB NOT NULL DEFAULT '[]',
    "commanderId" TEXT,
    "commanderName" TEXT NOT NULL,
    "links" JSONB NOT NULL DEFAULT '[]',
    "postmortem" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "authorName" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ownerId" TEXT,
    "ownerName" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "stageMinutes" INTEGER NOT NULL DEFAULT 10,
    "stageAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "changes" JSONB NOT NULL DEFAULT '[]',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_events" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'neutral',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "problem_reports_number_key" ON "problem_reports"("number");

-- CreateIndex
CREATE INDEX "problem_reports_status_idx" ON "problem_reports"("status");

-- CreateIndex
CREATE INDEX "problem_reports_problemSlug_category_idx" ON "problem_reports"("problemSlug", "category");

-- CreateIndex
CREATE INDEX "problem_report_entries_reportId_idx" ON "problem_report_entries"("reportId");

-- CreateIndex
CREATE INDEX "problem_report_entries_userId_at_idx" ON "problem_report_entries"("userId", "at");

-- CreateIndex
CREATE INDEX "problem_report_events_reportId_at_idx" ON "problem_report_events"("reportId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "tech_tickets_number_key" ON "tech_tickets"("number");

-- CreateIndex
CREATE INDEX "tech_tickets_status_idx" ON "tech_tickets"("status");

-- CreateIndex
CREATE INDEX "tech_tickets_requesterId_idx" ON "tech_tickets"("requesterId");

-- CreateIndex
CREATE INDEX "tech_ticket_messages_ticketId_at_idx" ON "tech_ticket_messages"("ticketId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_number_key" ON "incidents"("number");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incident_updates_incidentId_at_idx" ON "incident_updates"("incidentId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "releases_version_key" ON "releases"("version");

-- CreateIndex
CREATE INDEX "releases_status_idx" ON "releases"("status");

-- CreateIndex
CREATE INDEX "release_events_releaseId_at_idx" ON "release_events"("releaseId", "at");

-- AddForeignKey
ALTER TABLE "problem_report_entries" ADD CONSTRAINT "problem_report_entries_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "problem_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_report_events" ADD CONSTRAINT "problem_report_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "problem_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_ticket_messages" ADD CONSTRAINT "tech_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tech_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_events" ADD CONSTRAINT "release_events_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
