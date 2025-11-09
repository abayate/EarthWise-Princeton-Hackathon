'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import PROFILE_ICONS from '@/components/profileIcons';

const AVATAR_STORAGE_KEY = 'ew_avatar_v1';

export default function ProfilePictureSelector() {
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);
  const [tempSelected, setTempSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Load saved avatar on mount
  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (saved) setSavedAvatar(saved);
  }, []);

  // close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }
  }, [open]);

  const openSelector = () => {
    setTempSelected(savedAvatar);
    setOpen(true);
  };

  const handleSave = () => {
    if (tempSelected) {
      localStorage.setItem(AVATAR_STORAGE_KEY, tempSelected);
      setSavedAvatar(tempSelected);
      // notify other components
      window.dispatchEvent(new Event('storage'));
    }
    setOpen(false);
  };

  const handleRemove = () => {
    localStorage.removeItem(AVATAR_STORAGE_KEY);
    setSavedAvatar(null);
    setTempSelected(null);
    window.dispatchEvent(new Event('storage'));
    setOpen(false);
  };

  const currentSrc = PROFILE_ICONS.find((p) => p.id === (savedAvatar ?? tempSelected))?.src;

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <button type="button" onClick={openSelector} className="rounded-full focus:outline-none">
            <Avatar className="h-20 w-20">
              {currentSrc ? (
                <AvatarImage src={currentSrc} alt="Selected profile picture" />
              ) : (
                <AvatarFallback>JD</AvatarFallback>
              )}
            </Avatar>
          </button>
          {savedAvatar && !open && (
            <Button
              variant="outline"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemove}
              title="Remove avatar"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div>
          <h3 className="font-medium text-slate-900">Profile Picture</h3>
          <p className="text-sm text-slate-500">Choose an avatar or remove your current picture</p>
        </div>
      </div>

      {/* Popover - only visible when open */}
      {open && (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
          <div className="text-sm font-medium mb-2">Choose your avatar</div>

          <div className="grid grid-cols-6 gap-4 mb-3">
            {PROFILE_ICONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setTempSelected(option.id)}
                className={cn(
                  'relative rounded-full overflow-hidden hover:ring-2 hover:ring-green-500/70 transition-all',
                  tempSelected === option.id && 'ring-2 ring-green-600'
                )}
                title={option.label}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={option.src} alt={option.label} />
                  <AvatarFallback>...</AvatarFallback>
                </Avatar>
              </button>
            ))}
          </div>

          <div className="flex justify-between gap-2">
            <button
              className="flex-1 px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
              onClick={handleRemove}
            >
              Remove
            </button>

            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-md border bg-white hover:bg-gray-50" onClick={() => setOpen(false)}>
                Cancel
              </button>

              <button
                className="px-3 py-1 rounded-md bg-primary text-white disabled:opacity-50"
                onClick={handleSave}
                disabled={tempSelected === savedAvatar}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}