export function CouponSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3 border-b border-dashed border-gray-200 pb-3 dark:border-gray-700">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-12 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-3 h-8 w-full rounded border border-dashed border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900" />
    </div>
  );
}

export function CouponSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CouponSkeleton key={i} />
      ))}
    </div>
  );
}
