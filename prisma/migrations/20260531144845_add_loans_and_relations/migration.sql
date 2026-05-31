/*
  Warnings:

  - You are about to drop the column `coverUrl` on the `Book` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Author` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('HOME', 'LIBRARY');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "SanctionStatus" AS ENUM ('PENDING', 'APPLIED', 'REDEEMED');

-- CreateEnum
CREATE TYPE "FineStatus" AS ENUM ('PENDING', 'PAID', 'ANNULLED');

-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('LEVE', 'GRAVE', 'MUY_GRAVE');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "CopyStatus" ADD VALUE 'HELD';

-- AlterTable
ALTER TABLE "Author" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "Book" DROP COLUMN "coverUrl",
ADD COLUMN     "cost" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "missedReservationsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "loanBlockUntil" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "systemBlockUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Reservation" (
    "reservationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "requestedLoanType" "LoanType" NOT NULL,
    "requestedDueDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("reservationId")
);

-- CreateTable
CREATE TABLE "Loan" (
    "loanId" TEXT NOT NULL,
    "reservationId" TEXT,
    "userId" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "borrowDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "type" "LoanType" NOT NULL DEFAULT 'HOME',
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "observations" TEXT,
    "depositAmount" DOUBLE PRECISION,
    "depositStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("loanId")
);

-- CreateTable
CREATE TABLE "Fine" (
    "fineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FineStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Fine_pkey" PRIMARY KEY ("fineId")
);

-- CreateTable
CREATE TABLE "Sanction" (
    "sanctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "SanctionType" NOT NULL,
    "status" "SanctionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sanction_pkey" PRIMARY KEY ("sanctionId")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "appealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fineId" TEXT,
    "sanctionId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "resolverId" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("appealId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "auditLogId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "performedBy" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("auditLogId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_token_key" ON "Reservation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_reservationId_key" ON "Loan"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "Copy"("copyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("reservationId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "Copy"("copyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("loanId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("loanId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_fineId_fkey" FOREIGN KEY ("fineId") REFERENCES "Fine"("fineId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_sanctionId_fkey" FOREIGN KEY ("sanctionId") REFERENCES "Sanction"("sanctionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_resolverId_fkey" FOREIGN KEY ("resolverId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
