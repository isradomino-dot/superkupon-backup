/**
 * Root loading UI — shown while route segment is loading (SSR pending,
 * data fetch, dll). Next.js App Router otomatis render ini kalau page.tsx
 * suspend.
 *
 * Purpose:
 *   - Prevent blank white page (yang Edge browser kadang tampilin sebagai
 *     "This page couldn't load")
 *   - Kasih visual feedback ke user pas page loading
 *   - Maintain layout shell (header, dll) tetap rendered
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/30" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-300">Loading SuperKupon…</p>
        <p className="mt-1 text-xs text-gray-500">Sebentar ya, ngambil data kupon terbaru</p>
      </div>
    </div>
  );
}
