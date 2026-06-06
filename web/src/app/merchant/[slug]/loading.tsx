import { CouponSkeletonGrid } from "@/components/CouponSkeleton";
import { MerchantStatsSkeleton } from "@/components/MerchantStats";
import { SkeletonBar, SkeletonBox } from "@/components/Skeleton";

export default function MerchantLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <SkeletonBar className="h-3 w-32 bg-white/10" />

      {/* Hero card */}
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/15 via-transparent to-transparent p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBar className="h-8 w-48 bg-white/10" />
            <SkeletonBar className="h-3 w-56 bg-white/10" />
            <SkeletonBar className="h-3 w-40 bg-white/5" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBox className="h-8 w-44 rounded-full bg-white/10" />
            <SkeletonBox className="h-8 w-32 rounded-full bg-white/10" />
          </div>
        </div>
      </header>

      <MerchantStatsSkeleton />

      <section>
        <SkeletonBar className="mb-3 h-3 w-40 bg-white/10" />
        <CouponSkeletonGrid count={9} />
      </section>
    </div>
  );
}
