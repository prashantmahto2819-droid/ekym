export function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(value?: number | string | null) {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function telHref(value?: string | null) {
  if (!value) return undefined;
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(value?: string | null, text?: string) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  const normalised = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalised}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function embedUrl(platform: string | null, url: string) {
  const p = (platform ?? "").toLowerCase();
  if (p === "youtube") {
    const id =
      url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/)?.[1] ?? url.split("/").pop();
    return `https://www.youtube.com/embed/${id}`;
  }
  if (p === "vimeo") {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  if (p === "facebook") {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
  }
  if (p === "instagram") {
    const clean = (url.split("?")[0] ?? url).replace(/\/$/, "");
    return `${clean}/embed`;
  }
  return url;
}

export function truncate(text?: string | null, length = 160) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}
