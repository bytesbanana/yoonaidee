export default function ProfileLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-stone-100 px-4 text-stone-900 [font-family:var(--font-geist-sans),sans-serif]">
      <div role="status" className="flex flex-col items-center gap-4">
        <span aria-hidden="true" className="size-10 rounded-full border-4 border-emerald-200 border-t-emerald-800 motion-safe:animate-spin" />
        <p className="text-sm font-medium">Loading your profile…</p>
      </div>
    </main>
  );
}
