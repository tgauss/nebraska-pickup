import Link from 'next/link';
/* eslint-disable @next/next/no-img-element */

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center max-w-lg">
          <img
            src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
            alt="Nebraska N"
            width={56}
            height={56}
            className="mx-auto mb-6"
          />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-3">
            Nebraska Devaney
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Pickup & Fulfillment
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
            Schedule your pickup for Devaney arena seats, benches, and memorabilia.
            Use the link from your email, or look up your order below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/lookup"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-sm font-sans font-medium transition-colors"
            >
              Find My Order
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Need help? Tap the chat button in the corner — we&apos;re here for you.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-accent text-accent-foreground/60 py-6 text-center">
        <p className="text-xs">2410 Production Drive, Unit 4, Roca, NE 68430</p>
      </footer>
    </div>
  );
}
