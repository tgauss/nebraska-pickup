import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center max-w-lg">
          <Image
            src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
            alt="Nebraska N"
            width={56}
            height={56}
            className="mx-auto mb-6"
            unoptimized
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
            <Link
              href="/admin"
              className="bg-accent text-accent-foreground px-8 py-3 rounded-sm font-sans font-medium hover:bg-accent/90 transition-colors"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-accent text-accent-foreground/60 py-6 text-center">
        <p className="text-xs">2410 Production Drive, Unit 6, Roca, NE 68430</p>
      </footer>
    </div>
  );
}
