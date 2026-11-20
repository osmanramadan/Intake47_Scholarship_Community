ALTER TABLE "Menu"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imagePublicId" TEXT;

ALTER TABLE "OrderItem"
ADD COLUMN "itemName" TEXT;

UPDATE "OrderItem"
SET "itemName" = "FoodItem"."name"
FROM "FoodItem"
WHERE "OrderItem"."foodItemId" = "FoodItem"."id";

ALTER TABLE "OrderItem"
ALTER COLUMN "foodItemId" DROP NOT NULL,
ALTER COLUMN "itemName" SET NOT NULL;
