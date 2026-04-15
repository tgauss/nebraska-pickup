'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, CalendarCheck, MapIcon, Loader2, LogOut, ClipboardList, Mail, MessageCircle, MapPin, Menu, X, Phone, List, Tag, Package, Boxes } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(d => setAuthenticated(d.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setLoginError('Invalid password');
    }
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-sm border max-w-sm w-full">
          <h1 className="text-xl font-bold mb-1">Admin Login</h1>
          <p className="text-sm text-gray-500 mb-6">Nebraska Devaney Pickup Operations</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border rounded-lg px-4 py-3 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          {loginError && <p className="text-red-500 text-sm mb-3">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/customers', label: 'Customers', icon: Users },
    { href: '/admin/bookings', label: 'Bookings', icon: List },
    { href: '/admin/day-of', label: 'Day-of', icon: CalendarCheck },
    { href: '/admin/map', label: 'Map', icon: MapIcon },
    { href: '/admin/staging', label: 'Staging', icon: Boxes },
    { href: '/admin/packing', label: 'Packing', icon: Package },
    { href: '/admin/labels', label: 'Labels', icon: Tag },
    { href: '/admin/prep', label: 'Prep', icon: ClipboardList },
    { href: '/admin/email', label: 'Email', icon: Mail },
    { href: '/admin/chat', label: 'Chat', icon: MessageCircle },
    { href: '/admin/outreach', label: 'Outreach', icon: Phone },
    { href: '/admin/distant', label: 'Distant', icon: MapPin },
  ];

  const navSections = [
    { label: 'Overview', items: navItems.filter(i => ['/admin', '/admin/customers', '/admin/bookings', '/admin/map'].includes(i.href)) },
    { label: 'Pickup Day', items: navItems.filter(i => ['/admin/day-of', '/admin/staging', '/admin/labels'].includes(i.href)) },
    { label: 'Shipping', items: navItems.filter(i => ['/admin/packing'].includes(i.href)) },
    { label: 'Outreach', items: navItems.filter(i => ['/admin/email', '/admin/chat', '/admin/outreach', '/admin/distant'].includes(i.href)) },
    { label: 'Setup', items: navItems.filter(i => ['/admin/prep'].includes(i.href)) },
  ];

  const currentPage = navItems.find(i => i.href === pathname);

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Top bar */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <span className="font-bold text-primary">Devaney Ops</span>
              {currentPage && (
                <span className="text-gray-400 text-sm hidden sm:inline">/ {currentPage.label}</span>
              )}
            </div>
            <button
              onClick={async () => {
                await fetch('/api/admin/auth', { method: 'DELETE' });
                setAuthenticated(false);
              }}
              className="text-gray-400 hover:text-gray-600 p-2"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Slide-out nav */}
      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setMobileNavOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-4 h-14 border-b">
              <span className="font-bold text-primary">Devaney Ops</span>
              <button onClick={() => setMobileNavOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-2">
              {navSections.map(section => (
                <div key={section.label} className="mb-1">
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    {section.label}
                  </p>
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
