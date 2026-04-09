import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pickup Coordination — Nebraska Devaney Seats',
  description: 'Track pending and scheduled pickups for the Devaney Arena Seats event, April 16-18, 2026.',
};

export default function PendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
