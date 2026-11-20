export function getCloudinaryImageUrl(src: string, width: number, height?: number): string {
  try {
    const url = new URL(src);
    const uploadSegment = "/image/upload/";
    const uploadIndex = url.pathname.indexOf(uploadSegment);

    if (url.hostname !== "res.cloudinary.com" || uploadIndex === -1) return src;

    const imagePath = url.pathname.slice(uploadIndex + uploadSegment.length);
    if (!imagePath || /^[a-z]_[^/]+(?:,|\/)/i.test(imagePath)) return src;

    const safeWidth = Math.max(1, Math.min(2400, Math.round(width)));
    const transformation = height
      ? `f_auto,q_auto,c_fill,w_${safeWidth},h_${Math.max(1, Math.min(2400, Math.round(height)))}`
      : `f_auto,q_auto,c_limit,w_${safeWidth}`;
    url.pathname = `${url.pathname.slice(0, uploadIndex + uploadSegment.length)}${transformation}/${imagePath}`;
    return url.toString();
  } catch {
    return src;
  }
}
