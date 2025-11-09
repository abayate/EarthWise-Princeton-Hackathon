'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, MessageSquare, Settings, Leaf, Trophy, Heart, TreePine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: Calendar },
  { href: '/coach', label: 'Coach', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy},
];

export default function Sidebar() {
  const pathname = usePathname();
  const [avatarId, setAvatarId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ew_avatar_v1');
    if (saved) setAvatarId(saved);

    const handleStorage = () => {
      const current = localStorage.getItem('ew_avatar_v1');
      setAvatarId(current);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <aside className="w-64 bg-white/40 backdrop-blur-md border-r border-slate-200/30 h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-slate-200/30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Leaf className="w-8 h-8 text-green-600" />
          <span className="text-xl font-bold text-slate-900">EarthWise</span>
        </Link>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-slate-200/30">
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="w-16 h-16">
            {avatarId ? (
              <AvatarImage 
                src={`/avatars/${avatarId}.png`}
                alt="User avatar"
              />
            ) : (
              <AvatarFallback>JD</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Jane Doe</h3>
            <p className="text-sm text-slate-600">Level 1</p>
            <p className="text-xs text-slate-500 mt-1">Making positive changes</p>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4 mt-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Points</span>
              <span className="text-sm font-semibold text-green-600">2,450</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Rank</span>
              <span className="text-sm font-semibold text-slate-900">Silver</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" />
                  Overall Contentment
                </span>
                <span className="text-xs font-medium text-slate-700">85%</span>
              </div>
              <Progress value={85} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <TreePine className="w-3 h-3 text-green-500" />
                  Eco-friendly
                </span>
                <span className="text-xs font-medium text-slate-700">78%</span>
              </div>
              <Progress value={78} className="h-1.5" />
            </div>
          </div>

          {/* Hobbies */}
          <div>
            <h4 className="text-xs font-medium text-slate-700 mb-2">Hobbies</h4>
            <div className="flex flex-wrap gap-1">
              {['Cycling', 'Gardening', 'Recycling'].map((hobby) => (
                <span
                  key={hobby}
                  className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs"
                >
                  {hobby}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg">
          <p className="text-xs font-medium text-slate-700 mb-1">Need guidance?</p>
          <p className="text-xs text-slate-600 mb-3">Chat with your AI coach for personalized tips.</p>
          <Link href="/coach">
            <button className="text-xs bg-white text-slate-700 px-3 py-1.5 rounded-md font-medium hover:bg-slate-50 transition-colors w-full">
              Start Chatting
            </button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
