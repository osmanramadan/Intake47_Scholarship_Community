export function getOpenToEatPostTitle(title: string) {
  const trimmedTitle = title.trim();
  return /^\d+$/.test(trimmedTitle) ? "Open to eat post" : trimmedTitle;
}
