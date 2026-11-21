export function formatEgyptDate(value: Date | string, locale: "en" | "ar" = "en") {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    timeZone: "Africa/Cairo",
  });
}

export function formatEgyptDateTime(value: Date | string, locale: "en" | "ar" = "en") {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
