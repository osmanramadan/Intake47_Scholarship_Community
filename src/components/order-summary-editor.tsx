"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { useRef, useState } from "react";
import {
  orderSummaryItemsSchema,
  type OrderSummaryItem,
} from "@/lib/order-summary";
import { useLanguage } from "@/components/language-provider";

type DraftItem = {
  id: number;
  itemName: string;
  quantity: string;
  unitPrice: string;
};

function toDraftItems(items: OrderSummaryItem[], firstId = 0): DraftItem[] {
  return items.map((item, index) => ({
    id: firstId + index,
    itemName: item.itemName,
    quantity: String(item.quantity),
    unitPrice: (item.unitPriceCents / 100).toFixed(2),
  }));
}

function errorMessageFrom(body: unknown) {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return "The order summary could not be saved.";
}

export function OrderSummaryEditor({
  sessionId,
  currency,
  initialItems,
  initiallySaved,
  initialNotes,
}: {
  sessionId: string;
  currency: string;
  initialItems: OrderSummaryItem[];
  initiallySaved: boolean;
  initialNotes: string | null;
}) {
  const { locale, t } = useLanguage();
  const nextId = useRef(initialItems.length);
  const [items, setItems] = useState(() => toDraftItems(initialItems));
  const [savedItems, setSavedItems] = useState(() => toDraftItems(initialItems));
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [notesMessage, setNotesMessage] = useState("");

  function formatPrice(cents: number) {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }

  function updateItem(id: number, patch: Partial<Omit<DraftItem, "id">>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setError("");
    setMessage("");
  }

  function cancelEditing() {
    setItems(savedItems.map((item) => ({ ...item })));
    setEditing(false);
    setError("");
    setMessage("");
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { id: nextId.current++, itemName: "", quantity: "1", unitPrice: "0.01" },
    ]);
    setError("");
    setMessage("");
  }

  async function saveSummary() {
    setError("");
    setMessage("");

    const parsedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const price = Number(item.unitPrice);
      return {
        itemName: item.itemName.trim(),
        quantity,
        unitPriceCents: Math.round(price * 100),
        validPrice: Number.isFinite(price) && price > 0 && price <= 9_999_999_999.99 &&
          Math.abs(price * 100 - Math.round(price * 100)) < 0.000001,
      };
    });

    if (parsedItems.some((item) => !item.itemName || item.itemName.length > 150)) {
      setError(t("Enter a valid name for every item (up to 150 characters)."));
      return;
    }
    if (parsedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1_000_000)) {
      setError(t("Quantity must be a whole number greater than zero."));
      return;
    }
    if (parsedItems.some((item) => !item.validPrice)) {
      setError(t("Enter a price greater than zero with at most two decimal places."));
      return;
    }
    if (parsedItems.length === 0) {
      setError(t("Add at least one item before saving."));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/open-to-eat/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          items: parsedItems.map(({ itemName, quantity, unitPriceCents }) => ({
            itemName,
            quantity,
            unitPriceCents,
          })),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessageFrom(body));

      const responseItems = typeof body === "object" && body !== null && "items" in body ? body.items : undefined;
      const validatedItems = orderSummaryItemsSchema.safeParse(responseItems);
      if (!validatedItems.success) throw new Error(t("The server returned an invalid saved summary."));

      const savedDrafts = toDraftItems(validatedItems.data, nextId.current);
      nextId.current += savedDrafts.length;
      setItems(savedDrafts);
      setSavedItems(savedDrafts);
      setIsSaved(true);
      setEditing(false);
      setMessage(t("Order summary saved."));
    } catch (saveError) {
      setError(saveError instanceof Error ? t(saveError.message) : t("The order summary could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function resetToStudentOrders() {
    if (!window.confirm(t("Restore aggregation from student orders? The saved summary will be replaced."))) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/open-to-eat/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessageFrom(body));

      const responseItems = typeof body === "object" && body !== null && "items" in body ? body.items : undefined;
      const validatedItems = orderSummaryItemsSchema.safeParse(responseItems);
      if (!validatedItems.success) throw new Error(t("The server returned an invalid order summary."));

      const restoredDrafts = toDraftItems(validatedItems.data, nextId.current);
      nextId.current += restoredDrafts.length;
      setItems(restoredDrafts);
      setSavedItems(restoredDrafts);
      setIsSaved(false);
      setEditing(false);
      setMessage(t("Rebuilt from current student orders."));
    } catch (resetError) {
      setError(resetError instanceof Error ? t(resetError.message) : t("The order summary could not be reset."));
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    setNotesError("");
    setNotesMessage("");
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/admin/open-to-eat/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveNotes", notes }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessageFrom(body));

      const savedValue = typeof body === "object" && body !== null && "notes" in body && typeof body.notes === "string"
        ? body.notes
        : undefined;
      if (savedValue === undefined) throw new Error(t("The server returned invalid order notes."));
      setNotes(savedValue);
      setSavedNotes(savedValue);
      setNotesMessage(t("Notes saved."));
    } catch (saveError) {
      setNotesError(saveError instanceof Error ? t(saveError.message) : t("The order notes could not be saved."));
    } finally {
      setSavingNotes(false);
    }
  }

  const totalCents = items.reduce((total, item) => {
    const quantity = Number(item.quantity);
    const price = Number(item.unitPrice);
    if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price <= 0) return total;
    return total + Math.round(price * 100) * quantity;
  }, 0);

  return (
    <section dir={locale === "ar" ? "rtl" : "ltr"} aria-labelledby="order-summary-title" className="mt-7 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a32332]">{t("Order summary")}</p>
          <h2 id="order-summary-title" className="mt-2 text-2xl font-black">{t("Combined order from all students")}</h2>
          <p className="mt-2 text-sm text-slate-500">{t("Matching items are grouped with their total quantity and price.")}</p>
          {isSaved && <p className="mt-2 text-xs font-semibold text-green-700">{t("Changes saved. Rebuild to include any new orders.")}</p>}
        </div>
        <div className="text-right sm:shrink-0">
          <p className="text-sm font-semibold text-slate-500">{t("Final order total")}</p>
          <p className="mt-1 text-2xl font-black text-[#a32332]">{formatPrice(totalCents)}</p>
        </div>
      </div>

      {editing ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">{t("To combine duplicate items, use the same name and unit price; quantities will be added when saved. These edits affect only the summary, not student orders.")}</p>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_120px_150px_auto] sm:items-end">
                <label className="col-span-2 block text-sm font-semibold sm:col-span-1">
                  {t("Item name")}
                  <input
                    value={item.itemName}
                    onChange={(event) => updateItem(item.id, { itemName: event.target.value })}
                    maxLength={150}
                    className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-[#a32332] focus:ring-2 focus:ring-[#a32332]/10"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  {t("Quantity")}
                  <input
                    type="number"
                    min={1}
                    max={1_000_000}
                    step={1}
                    value={item.quantity}
                    onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                    className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-center font-normal outline-none focus:border-[#a32332] focus:ring-2 focus:ring-[#a32332]/10"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  {t("Unit price ({currency})", { currency })}
                  <input
                    type="number"
                    dir="ltr"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => updateItem(item.id, { unitPrice: event.target.value })}
                    className="mt-1 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-left font-normal outline-none focus:border-[#a32332] focus:ring-2 focus:ring-[#a32332]/10"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                  className="col-span-2 rounded-md px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 sm:col-span-1"
                  aria-label={t("Remove {item}", { item: item.itemName || t("item") })}
                >
                  {t("Remove item")}
                </button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              {t("+ Add item")}
            </button>
          </div>
      ) : items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className={`w-full min-w-[560px] border-collapse text-sm ${locale === "ar" ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500">
                  <th scope="col" className="px-3 py-3">{t("Item")}</th>
                  <th scope="col" className="px-3 py-3">{t("Total quantity")}</th>
                  <th scope="col" className="px-3 py-3">{t("Unit price")}</th>
                  <th scope="col" className="px-3 py-3">{t("Item total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const quantity = Number(item.quantity);
                  const unitPriceCents = Math.round(Number(item.unitPrice) * 100);
                  return (
                    <tr key={item.id}>
                      <th scope="row" className="px-3 py-4 font-bold">{item.itemName}</th>
                      <td className="px-3 py-4 font-semibold">{quantity}</td>
                      <td className="whitespace-nowrap px-3 py-4">{formatPrice(unitPriceCents)}</td>
                      <td className="whitespace-nowrap px-3 py-4 font-bold">{formatPrice(unitPriceCents * quantity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600">{t("No orders for this post yet.")}</p>
      )}

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{message}</p>}

      {(editing || items.length > 0) && (
        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
          {editing ? (
            <>
              <button type="button" onClick={saveSummary} disabled={saving} className="rounded-md bg-[#a32332] px-5 py-3 text-sm font-bold text-white hover:bg-[#871d2a] disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? t("Saving...") : t("Save summary")}
              </button>
              <button type="button" onClick={cancelEditing} disabled={saving} className="rounded-md border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                {t("Cancel")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setError("");
                  setMessage("");
                }}
                className="rounded-md border border-[#a32332] px-5 py-3 text-sm font-bold text-[#a32332] hover:bg-[#f8e9eb]"
              >
                {t("Edit order summary")}
              </button>
              {isSaved && (
                <button
                  type="button"
                  onClick={resetToStudentOrders}
                  disabled={saving}
                  className="rounded-md border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t("Rebuilding...") : t("Rebuild from orders")}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-black">{t("Important order notes")}</h3>
        <p className="mt-1 text-sm text-slate-600">{t("Write unexpected order details or a restaurant rating so you can refer to them later.")}</p>
        <label htmlFor="order-summary-notes" className="sr-only">{t("Important order notes")}</label>
        <textarea
          id="order-summary-notes"
          value={notes}
          maxLength={3000}
          onChange={(event) => {
            setNotes(event.target.value);
            setNotesError("");
            setNotesMessage("");
          }}
          rows={4}
          placeholder={t("Example: late delivery, a note about an item, or a restaurant rating...")}
          className={`mt-4 w-full rounded-md border border-slate-300 px-4 py-3 outline-none focus:border-[#a32332] focus:ring-2 focus:ring-[#a32332]/10 ${locale === "ar" ? "text-right" : "text-left"}`}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{notes.length}/3000</p>
          <button
            type="button"
            onClick={saveNotes}
            disabled={savingNotes || notes === savedNotes}
            className="rounded-md bg-[#a32332] px-5 py-3 text-sm font-bold text-white hover:bg-[#871d2a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingNotes ? t("Saving notes...") : t("Save notes")}
          </button>
        </div>
        {notesError && <p role="alert" className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{notesError}</p>}
        {notesMessage && <p role="status" className="mt-3 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{notesMessage}</p>}
      </div>
    </section>
  );
}
