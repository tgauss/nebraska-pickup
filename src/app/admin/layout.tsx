'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, CalendarCheck, MapIcon, Loader2, LogOut, ClipboardList, Mail, MessageCircle } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(d => setAuthenticated(d.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

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

  // Loading
  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
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
    { href: '/admin/day-of', label: 'Day-of Ops', icon: CalendarCheck },
    { href: '/admin/map', label: 'Map', icon: MapIcon },
    { href: '/admin/prep', label: 'Prep', icon: ClipboardList },
    { href: '/admin/email', label: 'Email', icon: Mail },
    { href: '/admin/chat', label: 'Chat', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Top nav */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-1">
              <span className="font-bold text-primary mr-4">Devaney Ops</span>
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-secondary/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
