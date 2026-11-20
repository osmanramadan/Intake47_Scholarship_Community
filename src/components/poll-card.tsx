"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { useState } from "react";
import { ZoomableImage } from "@/components/zoomable-image";
import { useLanguage } from "@/components/language-provider";

type Poll = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  deadline: string | null;
  allowVoteChange: boolean;
  showResultsBeforeClose: boolean;
  selectedOptionId: string | null;
  options: { id: string; text: string; votes: number }[];
};

export function PollCard({ poll }: { poll: Poll }) {
  const { locale, t } = useLanguage();
  const [selected, setSelected] = useState(poll.selectedOptionId);
  const [currentVote, setCurrentVote] = useState(poll.selectedOptionId);
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(poll.options.map((option) => [option.id, option.votes])),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const totalVotes = Object.values(counts).reduce((total, count) => total + count, 0);
  const canChange = !currentVote || poll.allowVoteChange;

  function adjustCounts(previousOptionId: string | null, nextOptionId: string | null) {
    setCounts((current) => {
      const updated = { ...current };
      if (previousOptionId) updated[previousOptionId] = Math.max(0, (updated[previousOptionId] ?? 0) - 1);
      if (nextOptionId) updated[nextOptionId] = (updated[nextOptionId] ?? 0) + 1;
      return updated;
    });
  }

  async function submitVote() {
    if (!selected || !canChange || selected === currentVote) return;
    const previousVote = currentVote;
    adjustCounts(previousVote, selected);
    setCurrentVote(selected);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, optionId: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to submit your vote."));
      if (Array.isArray(body.counts)) {
        setCounts(Object.fromEntries(body.counts.map((entry: { optionId: string; votes: number }) => [entry.optionId, entry.votes])));
      }
      setMessage(t("Your vote has been recorded."));
    } catch (voteError) {
      adjustCounts(selected, previousVote);
      setCurrentVote(previousVote);
      setError(voteError instanceof Error ? t(voteError.message) : t("Unable to submit your vote."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="bg-white p-5 shadow-sm sm:p-9">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold">{poll.title}</h2>
          {poll.description && <p className="mt-2 text-sm leading-6 text-slate-600">{poll.description}</p>}
        </div>
        {poll.deadline && <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t("Ends {date}", { date: new Date(poll.deadline).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US") })}</p>}
      </div>
      {poll.imageUrl && <ZoomableImage src={poll.imageUrl} alt={poll.title} />}
      <div className="mt-6 space-y-3">
        {poll.options.map((option) => (
          <label key={option.id} className={`flex cursor-pointer items-center justify-between gap-4 border p-4 transition ${selected === option.id ? "border-[#a32332] bg-[#f8e9eb]" : "border-slate-200 hover:border-[#c98b92]"}`}>
            <span className="flex min-w-0 items-start gap-3">
              <input type="radio" name={poll.id} value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} disabled={!canChange} className="mt-1 shrink-0 accent-[#a32332]" />
              <span className="break-words font-semibold">{option.text}</span>
            </span>
            {(poll.showResultsBeforeClose || currentVote) && <span className="shrink-0 text-sm text-slate-500">{t((counts[option.id] ?? 0) === 1 ? "{count} vote" : "{count} votes", { count: counts[option.id] ?? 0 })}</span>}
          </label>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-slate-500">{t(totalVotes === 1 ? "{count} total vote" : "{count} total votes", { count: totalVotes })}</p>
        <button type="button" onClick={submitVote} disabled={!selected || !canChange || selected === currentVote || saving} className="rounded-md bg-[#a32332] px-5 py-3 text-sm font-bold text-white hover:bg-[#871d2a] disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? t("Submitting...") : currentVote ? (poll.allowVoteChange ? t("Change vote") : t("Vote submitted")) : t("Submit vote")}
        </button>
      </div>
      {message && <p className="mt-4 rounded-md bg-[#f8e9eb] px-4 py-3 text-sm font-medium text-[#a32332]">{message}</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
    </article>
  );
}
