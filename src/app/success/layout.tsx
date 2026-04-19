import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Husker Nation Showed Up — Nebraska Devaney Seats',
  description: '377 fans. 28 states. 710 pieces of Husker history rescued from demolition. The story of the Bob Devaney Sports Center seat activation.',
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
