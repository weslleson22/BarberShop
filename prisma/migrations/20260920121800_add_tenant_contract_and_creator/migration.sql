-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN "contractExpiresAt" TIMESTAMP(3),
ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "barbershops" ADD CONSTRAINT "barbershops_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
