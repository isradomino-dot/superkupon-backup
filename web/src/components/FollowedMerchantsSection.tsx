"use client";

import { useMerchantFollows } from "@/lib/use-merchant-follows";
import { MerchantLogo } from "@/components/MerchantLogo";
import { SmartLink } from "@/components/SmartLink";

/**
 * Renders user's followed merchants as a quick-access pill row.
 * Returns null when nothing followed (zero state on homepage).
 */
export function FollowedMerchantsSection() {
  const { follows, unfollow } = useMerchantFollows();
  if (follows.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent p-4 animate-slide-up">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <span aria-hidden>💖</span> Merchant Favorit Lo
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {follows.length} merchant ke-follow — quick access ke promo terbaru
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {follows.map((f) => (
          <div key={f.slug} className="group relative">
            <SmartLink
              href={`/merchant/${f.slug}`}
              className="flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-500/10 py-1 pl-1 pr-3 text-sm text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
            >
              <MerchantLogo
                merchant={{ name: f.name, slug: f.slug, website: null }}
                size={22}
                rounded="full"
              />
              <span className="font-medium">{f.name}</span>
            </SmartLink>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                unfollow(f.slug);
              }}
              aria-label={`Unfollow ${f.name}`}
              title="Unfollow"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-rose-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
