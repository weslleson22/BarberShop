-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DEVELOPER';

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "barbershopId" DROP NOT NULL;
