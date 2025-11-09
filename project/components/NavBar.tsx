'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Leaf, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const mainLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/coach', label: 'AI Coach' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/about', label: 'About Us' },
  { href: '/settings', label: 'Settings' },
];

// Visible to logged-out viewers only
const LOGGED_OUT_ALLOWED = new Set<string>(['/', '/integrations', '/about']);

// Routes that require auth (defensive routing for direct clicks)
const PROTECTED = new Set<string>(['/dashboard', '/calendar', '/coach', '/settings']);

function isActive(pathname: string, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [ready, setReady] = useState(false); // avoid flashing wrong menu
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsLoggedIn(!!data.session?.user);
      setReady(true);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Build the visible links:
  // - Logged out: Home, Integrations, About
  // - Logged in: everything EXCEPT Home
  const linksToRender = useMemo(() => {
    if (!ready) return []; // render nothing until we know auth state
    return isLoggedIn
      ? mainLinks.filter((l) => l.href !== '/') // drop Home when logged in
      : mainLinks.filter((l) => LOGGED_OUT_ALLOWED.has(l.href));
  }, [ready, isLoggedIn]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // flip local state immediately so menu updates without waiting for the listener
    setIsLoggedIn(false);
    // send them to the Home page (now visible when logged out)
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand (kept pointing to /) */}
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-green-600" />
          <span className="text-base font-semibold text-slate-900">EarthWise</span>
        </Link>

        {/* Main nav */}
        <nav className="hidden md:flex items-center space-x-1">
          {linksToRender.map(({ href, label }) => {
            const active = isActive(pathname ?? '/', href);
            const isProtected = PROTECTED.has(href);
            const linkHref = isProtected && !isLoggedIn ? '/login' : href;

            return (
              <Link
                key={href}
                href={linkHref}
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
          {ready &&
            (isLoggedIn ? (
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}
