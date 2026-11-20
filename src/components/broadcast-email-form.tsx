"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/components/language-provider";

function getErrorMessage(body: unknown) {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return "The announcement could not be sent.";
}

export function BroadcastEmailForm({ recipientCount }: { recipientCount: number }) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!window.confirm(t("Send this email to all {count} registered email addresses?", { count: recipientCount }))) return;

    setSending(true);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, details }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(t(getErrorMessage(body)));

      const sentCount = typeof body === "object" && body !== null && "sentCount" in body && typeof body.sentCount === "number"
        ? body.sentCount
        : undefined;
      if (sentCount === undefined) throw new Error(t("The server returned an invalid send result."));

      setMessage(t(
        sentCount === 1
          ? "The email was accepted by the mail server for {count} registered account"
          : "The email was accepted by the mail server for {count} registered accounts",
        { count: sentCount },
      ));
      setTitle("");
      setDetails("");
    } catch (sendError) {
      setError(sendError instanceof Error ? t(sendError.message) : t("The announcement could not be sent."));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        {t("This will email all {count} registered accounts, including pending and disabled accounts. Recipients will not see one another's email addresses.", { count: recipientCount })}
      </div>
      <label className="block text-sm font-bold">
        {t("Message title")}
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={2}
          maxLength={150}
          className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10"
        />
      </label>
      <label className="block text-sm font-bold">
        {t("Message details")}
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          required
          maxLength={5000}
          rows={7}
          className="mt-2 w-full resize-y rounded-md border border-slate-300 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10"
        />
        <span className="mt-1 block text-right text-xs font-normal text-slate-500">{details.length}/5000</span>
      </label>
      {error && <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>}
      <button
        type="submit"
        disabled={sending || recipientCount === 0}
        className="rounded-md bg-[#a32332] px-6 py-3 font-bold text-white hover:bg-[#871d2a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? t("Sending email...") : t("Send to {count} accounts", { count: recipientCount })}
      </button>
    </form>
  );
}
