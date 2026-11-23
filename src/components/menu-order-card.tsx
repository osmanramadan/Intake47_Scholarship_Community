"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { FormEvent, useState } from "react";
import { MenuAttachmentSlider, type MenuAttachment } from "@/components/menu-attachment-slider";
import { useLanguage } from "@/components/language-provider";
import { useRouter } from "next/navigation";

type OrderLine = { itemName: string; quantity: number; unitPrice: string };
type OrderReceipt = { id: string; submittedAt: string; items: OrderLine[] };
type OrderDraft = { itemName: string; price: string; quantity: number };

const pricePattern = /^\d+(?:\.\d{1,2})?$/;

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { error?: string; detail?: string; order?: OrderReceipt };
  } catch {
    throw new Error("The server returned an invalid response. Please try again.");
  }
}

function getValidPrice(value: string) {
  const price = value.trim();
  if (!pricePattern.test(price)) return null;
  const number = Number(price);
  return Number.isFinite(number) && number > 0 && number <= 9_999_999_999.99 ? number : null;
}

export function MenuOrderCard({
  sessionId,
  title,
  description,
  menuAttachments,
  createdAt,
  deadline,
  currency,
  initialOrders,
}: {
  sessionId: string;
  title: string;
  description: string | null;
  menuAttachments: MenuAttachment[];
  createdAt: string;
  deadline: string | null;
  currency: string;
  initialOrders: OrderReceipt[];
}) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<OrderDraft[]>([{ itemName: "", price: "", quantity: 1 }]);
  const [submittedOrders, setSubmittedOrders] = useState(initialOrders);
  const [isOrdering, setIsOrdering] = useState(initialOrders.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<OrderDraft[]>([]);

  function formatPrice(price: number) {
    return `${currency} ${price.toFixed(2)}`;
  }

  function updateItem(index: number, patch: Partial<OrderDraft>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  const canSubmit = items.length > 0 && items.every((item) =>
    item.itemName.trim().length > 0 &&
    item.itemName.trim().length <= 150 &&
    getValidPrice(item.price) !== null &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= 50,
  );
  const subtotal = items.reduce((sum, item) => sum + (getValidPrice(item.price) ?? 0) * item.quantity, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setError(t("Enter each dish, its menu price, and a quantity from 1 to 50."));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/open-to-eat/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          items: items.map((item) => ({
            name: item.itemName.trim(),
            price: item.price.trim(),
            quantity: item.quantity,
          })),
        }),
      });
      const body = await readJsonResponse(response);
      if (!response.ok) {
        const message = body.detail
          ? `${body.error ?? "Unable to submit your order."} ${body.detail}`
          : body.error ?? "Unable to submit your order.";
        throw new Error(t(message));
      }
      if (!body.order) throw new Error(t("The server did not confirm the order. Please try again."));
      setSubmittedOrders((current) => [body.order!, ...current]);
      setItems([{ itemName: "", price: "", quantity: 1 }]);
      setIsOrdering(false);
    } catch (orderError) {
      setError(orderError instanceof Error ? t(orderError.message) : t("Unable to submit your order."));
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(order: OrderReceipt) {
    setError("");
    setEditingOrderId(order.id);
    setEditItems(order.items.map((item) => ({
      itemName: item.itemName,
      price: item.unitPrice,
      quantity: item.quantity,
    })));
  }

  function updateEditItem(index: number, patch: Partial<OrderDraft>) {
    setEditItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function saveEdit(orderId: string) {
    const valid = editItems.length > 0 && editItems.every((item) =>
      item.itemName.trim().length > 0 &&
      item.itemName.trim().length <= 150 &&
      getValidPrice(item.price) !== null &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 50,
    );
    if (!valid) {
      setError(t("Enter each dish, its menu price, and a quantity from 1 to 50."));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/open-to-eat/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editItems.map((item) => ({
            name: item.itemName.trim(),
            price: item.price.trim(),
            quantity: item.quantity,
          })),
        }),
      });
      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(t(body.error ?? "Unable to edit your order."));
      if (!body.order) throw new Error(t("Unable to edit your order."));
      setSubmittedOrders((current) => current.map((order) => order.id === orderId ? body.order! : order));
      setEditingOrderId(null);
      router.refresh();
    } catch (editError) {
      setError(editError instanceof Error ? t(editError.message) : t("Unable to edit your order."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(orderId: string) {
    if (!window.confirm(t("Delete this order?"))) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/open-to-eat/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(t(body.error ?? "Unable to delete your order."));
      setSubmittedOrders((current) => current.filter((order) => order.id !== orderId));
      if (editingOrderId === orderId) setEditingOrderId(null);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? t(deleteError.message) : t("Unable to delete your order."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a32332]">{t("Open to eat post")}</p>
          <h2 className="mt-2 text-2xl font-bold">{title}</h2>
          {description && <p className="mt-2 text-slate-600">{description}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500">{t("Added {date}", { date: new Date(createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", { timeZone: "Africa/Cairo" }) })}</p>
          {deadline && <p className="mt-1 text-sm font-semibold text-slate-500">{t("Order by {date}", { date: new Date(deadline).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", { timeZone: "Africa/Cairo" }) })}</p>}
        </div>
      </div>

      <MenuAttachmentSlider title={title} attachments={menuAttachments} />

      {submittedOrders.length > 0 && (
        <section className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-[#a32332]">{t("Your orders for this post")}</p>
              <p className="mt-1 text-sm text-slate-500">{t(submittedOrders.length === 1 ? "{count} separate order" : "{count} separate orders", { count: submittedOrders.length })}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsOrdering((current) => !current);
              }}
              disabled={saving}
              className="cursor-pointer rounded-md border border-[#a32332] px-4 py-2 text-sm font-bold text-[#a32332] hover:bg-[#f8e9eb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isOrdering ? t("Cancel new order") : t("+ Place another order")}
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-200">
            {submittedOrders.map((order, index) => {
              const total = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
              const isEditing = editingOrderId === order.id;
              return (
                <article key={order.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{t("Order {number}", { number: submittedOrders.length - index })}</h3>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-500">{new Date(order.submittedAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</p>
                      {!isEditing && (
                        <>
                          <button type="button" onClick={() => beginEdit(order)} disabled={saving} className="cursor-pointer text-sm font-bold text-[#a32332] hover:underline disabled:cursor-not-allowed disabled:opacity-50">{t("Edit")}</button>
                          <button type="button" onClick={() => deleteOrder(order.id)} disabled={saving} className="cursor-pointer text-sm font-bold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50">{saving ? t("Deleting...") : t("Delete")}</button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="mt-3 space-y-3">
                      {editItems.map((item, itemIndex) => (
                        <fieldset key={itemIndex} className="grid gap-3 border border-slate-200 bg-[#fafafa] p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_8rem]">
                          <legend className="px-2 text-sm font-bold text-slate-600">{t("Dish {number}", { number: itemIndex + 1 })}</legend>
                          <label className="block text-sm font-semibold">
                            {t("Dish name")}
                            <input value={item.itemName} onChange={(event) => updateEditItem(itemIndex, { itemName: event.target.value })} required maxLength={150} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#a32332]" />
                          </label>
                          <label className="block text-sm font-semibold">
                            {t("Price ({currency})", { currency })}
                            <input value={item.price} onChange={(event) => updateEditItem(itemIndex, { price: event.target.value })} required inputMode="decimal" className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#a32332]" />
                          </label>
                          <label className="block text-sm font-semibold">
                            {t("Quantity")}
                            <input type="number" min={1} max={50} step={1} value={item.quantity} onChange={(event) => updateEditItem(itemIndex, { quantity: Number(event.target.value) })} required className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#a32332]" />
                          </label>
                          {editItems.length > 1 && (
                            <button type="button" onClick={() => setEditItems((current) => current.filter((_, indexToRemove) => indexToRemove !== itemIndex))} disabled={saving} className="cursor-pointer justify-self-start text-sm font-semibold text-red-700 hover:underline disabled:opacity-50 sm:col-span-3">{t("Remove dish")}</button>
                          )}
                        </fieldset>
                      ))}
                      {editItems.length < 20 && (
                        <button type="button" onClick={() => setEditItems((current) => [...current, { itemName: "", price: "", quantity: 1 }])} disabled={saving} className="cursor-pointer text-sm font-bold text-[#a32332] hover:underline disabled:opacity-50">{t("+ Add dish")}</button>
                      )}
                      <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" onClick={() => setEditingOrderId(null)} disabled={saving} className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50">{t("Cancel")}</button>
                        <button type="button" onClick={() => saveEdit(order.id)} disabled={saving} className="cursor-pointer rounded-md bg-[#a32332] px-4 py-2 text-sm font-bold text-white hover:bg-[#871d2a] disabled:opacity-50">{saving ? t("Saving...") : t("Save changes")}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ul className="mt-3 space-y-2">
                        {order.items.map((item, itemIndex) => (
                          <li key={`${order.id}-${itemIndex}`} className="flex justify-between gap-4 text-sm">
                            <span>{item.itemName} × {item.quantity}</span>
                            <span className="font-semibold">{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-right text-sm font-bold">{t("Order total: {price}", { price: formatPrice(total) })}</p>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {(submittedOrders.length === 0 || isOrdering) && (
        <form onSubmit={submit} className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">{t(submittedOrders.length > 0 ? "Place another separate order" : "Your order")}</h3>
              <p className="mt-1 text-sm text-slate-500">{t("Enter dish names and prices as shown in the menu files.")}</p>
            </div>
            <button
              type="button"
              onClick={() => setItems((current) => [...current, { itemName: "", price: "", quantity: 1 }])}
              disabled={items.length >= 20 || saving}
              className="cursor-pointer text-sm font-bold text-[#a32332] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("+ Add dish")}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {items.map((item, index) => (
              <fieldset key={index} className="grid gap-3 border border-slate-200 bg-[#fafafa] p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_8rem]">
                <legend className="px-2 text-sm font-bold text-slate-600">{t("Dish {number}", { number: index + 1 })}</legend>
                <label className="block text-sm font-semibold">
                  {t("Dish name")}
                  <input
                    value={item.itemName}
                    onChange={(event) => updateItem(index, { itemName: event.target.value })}
                    required
                    maxLength={150}
                    placeholder={t("Dish from the menu")}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#a32332]"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  {t("Price ({currency})", { currency })}
                  <input
                    value={item.price}
                    onChange={(event) => updateItem(index, { price: event.target.value })}
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#a32332]"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  {t("Quantity")}
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                    required
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#a32332]"
                  />
                </label>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    disabled={saving}
                    className="cursor-pointer justify-self-start text-sm font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3"
                  >
                    {t("Remove dish")}
                  </button>
                )}
              </fieldset>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="font-bold">{t("This order total: {price}", { price: formatPrice(subtotal) })}</p>
            <button type="submit" disabled={saving || !canSubmit} className="cursor-pointer rounded-md bg-[#a32332] px-5 py-3 text-sm font-bold text-white hover:bg-[#871d2a] disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? t("Submitting order...") : t("Submit order")}
            </button>
          </div>
          {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        </form>
      )}
    </article>
  );
}
