-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN     "details" TEXT,
ADD COLUMN     "imagePublicId" TEXT,
ALTER COLUMN "category" SET DEFAULT 'Food';
