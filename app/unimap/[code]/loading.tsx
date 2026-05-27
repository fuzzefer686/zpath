export default function UniversityDetailLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16">
        <div className="container-page">
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          <div className="mt-5 h-10 w-full max-w-2xl animate-pulse rounded bg-muted md:h-12" />
          <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
          <div className="mt-7 flex gap-3">
            <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </section>

      <div className="container-page py-10 lg:pl-16">
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-lg border border-border bg-muted/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
