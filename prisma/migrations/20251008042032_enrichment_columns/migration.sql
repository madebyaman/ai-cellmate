-- CreateEnum
CREATE TYPE "public"."ColumnType" AS ENUM ('SOURCE', 'ENRICHMENT');

-- CreateEnum
CREATE TYPE "public"."Origin" AS ENUM ('AI', 'UPLOAD', 'USER_EDIT');

-- CreateEnum
CREATE TYPE "public"."HintOrRunScope" AS ENUM ('TABLE', 'COLUMN');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."session" ADD COLUMN     "activeOrganizationId" TEXT;

-- CreateTable
CREATE TABLE "public"."credits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN,
    "seats" INTEGER,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "stripeCustomerId" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."table" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "uploadKey" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."row" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "row_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."column" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ColumnType" NOT NULL DEFAULT 'SOURCE',
    "tableId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "column_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cell" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rowId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,

    CONSTRAINT "cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cell_versions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "picked" BOOLEAN NOT NULL DEFAULT false,
    "value" TEXT,
    "sourceUrl" TEXT,
    "confidence" INTEGER,
    "origin" "public"."Origin" NOT NULL DEFAULT 'AI',
    "pickedAt" TIMESTAMP(3),
    "cellId" TEXT NOT NULL,
    "runId" TEXT,

    CONSTRAINT "cell_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hint" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scope" "public"."HintOrRunScope" NOT NULL,
    "prompt" TEXT,
    "websites" TEXT[],
    "columnId" TEXT,
    "tableId" TEXT,

    CONSTRAINT "Hint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Run" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cached_table" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tableId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "cached_table_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credits_organizationId_key" ON "public"."credits"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "public"."organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "row_tableId_position_key" ON "public"."row"("tableId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "column_tableId_position_key" ON "public"."column"("tableId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "cell_rowId_columnId_key" ON "public"."cell"("rowId", "columnId");

-- CreateIndex
CREATE INDEX "cell_versions_cellId_createdAt_idx" ON "public"."cell_versions"("cellId", "createdAt");

-- CreateIndex
CREATE INDEX "cell_versions_cellId_picked_idx" ON "public"."cell_versions"("cellId", "picked");

-- CreateIndex
CREATE INDEX "cell_versions_runId_idx" ON "public"."cell_versions"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Hint_columnId_key" ON "public"."Hint"("columnId");

-- CreateIndex
CREATE UNIQUE INDEX "Hint_tableId_key" ON "public"."Hint"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "cached_table_tableId_key" ON "public"."cached_table"("tableId");

-- AddForeignKey
ALTER TABLE "public"."credits" ADD CONSTRAINT "credits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscription" ADD CONSTRAINT "subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."table" ADD CONSTRAINT "table_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."row" ADD CONSTRAINT "row_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."column" ADD CONSTRAINT "column_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cell" ADD CONSTRAINT "cell_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "public"."row"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cell" ADD CONSTRAINT "cell_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "public"."column"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cell_versions" ADD CONSTRAINT "cell_versions_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "public"."cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cell_versions" ADD CONSTRAINT "cell_versions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Hint" ADD CONSTRAINT "Hint_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "public"."column"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Hint" ADD CONSTRAINT "Hint_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Run" ADD CONSTRAINT "Run_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cached_table" ADD CONSTRAINT "cached_table_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
