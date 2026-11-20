import { z } from "zod";

export const orderSummaryItemSchema = z.object({
  itemName: z.string().trim().min(1).max(150),
  quantity: z.number().int().min(1).max(1_000_000),
  unitPriceCents: z.number().int().min(1).max(999_999_999_999),
});

export const orderSummaryItemsSchema = z.array(orderSummaryItemSchema).min(1).max(500);

export type OrderSummaryItem = z.infer<typeof orderSummaryItemSchema>;

export function normalizeOrderItemName(itemName: string) {
  return itemName
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .toLocaleLowerCase();
}

export function combineOrderSummaryItems(items: readonly OrderSummaryItem[]) {
  const itemsByKey = new Map<string, OrderSummaryItem>();

  for (const item of items) {
    const itemName = item.itemName.trim().replace(/\s+/g, " ").normalize("NFKC");
    const key = `${normalizeOrderItemName(itemName)}|${item.unitPriceCents}`;
    const existing = itemsByKey.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      itemsByKey.set(key, { ...item, itemName });
    }
  }

  return Array.from(itemsByKey.values()).sort((left, right) =>
    left.itemName.localeCompare(right.itemName, undefined, { sensitivity: "base" }),
  );
}
