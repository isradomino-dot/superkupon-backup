import type { Coupon } from "./types";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type CouponSlugInput = Pick<Coupon, "id" | "title"> & {
  merchant?: { name?: string | null } | null;
};

export function couponSlug(c: CouponSlugInput): string {
  const merchantPart = slugify(c.merchant?.name || "");
  const titlePart = slugify(c.title || "").slice(0, 60);
  const parts = [String(c.id)];
  if (merchantPart) parts.push(merchantPart);
  if (titlePart) parts.push(titlePart);
  return parts.join("-");
}

export function parseCouponSlug(slug: string): number | null {
  const head = slug.split("-")[0];
  const id = Number(head);
  if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) return null;
  return id;
}

export function couponHref(c: CouponSlugInput): string {
  return `/coupon/${couponSlug(c)}`;
}
