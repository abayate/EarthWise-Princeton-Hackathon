'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

const mainLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/coach', label: 'AI Coach' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/about', label: 'About Us' },
  { href: '/settings', label: 'Settings' },
];

function isActive(pathname: string, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-green-600" />
          <span className="text-base font-semibold text-slate-900">EarthWise</span>
        </Link>

        {/* Main nav */}
        <nav className="hidden md:flex items-center space-x-1">
          {mainLinks.map(({ href, label }) => {
            const active = isActive(pathname ?? '/', href);
            
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Auth action */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
