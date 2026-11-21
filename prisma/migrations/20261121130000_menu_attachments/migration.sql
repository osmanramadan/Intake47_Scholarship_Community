-- CreateTable
CREATE TABLE "MenuAttachment" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuAttachment_menuId_sortOrder_idx" ON "MenuAttachment"("menuId", "sortOrder");

-- AddForeignKey
ALTER TABLE "MenuAttachment" ADD CONSTRAINT "MenuAttachment_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
