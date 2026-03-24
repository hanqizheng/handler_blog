export default function SiteLoading() {
  return (
    <main className="w-full">
      <section className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse bg-slate-200" />
            <div className="h-10 w-56 animate-pulse bg-slate-200" />
            <div className="h-4 w-full max-w-xl animate-pulse bg-slate-200" />
          </div>
        </div>
      </section>
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-4">
              <div className="aspect-[4/3] animate-pulse bg-slate-200" />
              <div className="h-5 w-3/4 animate-pulse bg-slate-200" />
              <div className="h-4 w-full animate-pulse bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
