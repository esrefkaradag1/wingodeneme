import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, User, LogOut, Layout, Star, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const Navigation = () => {
  const { user, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 py-3" : "bg-transparent py-5"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">RepoBank</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/templates" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400 transition-colors">
                Templates
              </Link>
              <Link href="/assets" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400 transition-colors">
                Assets
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400 transition-colors">
                Pricing
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform", isProfileOpen && "rotate-180")} />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-2 animate-in fade-in zoom-in duration-200">
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                      <p className="text-xs text-zinc-500 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold truncate dark:text-white">{user.email}</p>
                    </div>
                    
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                      <Layout className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link href="/favorites" className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                      <Star className="w-4 h-4" /> Favorites
                    </Link>
                    <Link href="/history" className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                      <Clock className="w-4 h-4" /> History
                    </Link>
                    
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                    
                    <button 
                      onClick={() => signOut()}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Log in
                </Link>
                <Link href="/signup" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-full transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-zinc-600 dark:text-zinc-300"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 shadow-xl">
          <div className="space-y-4">
            <Link href="/templates" className="block text-lg font-medium text-zinc-900 dark:text-white">Templates</Link>
            <Link href="/assets" className="block text-lg font-medium text-zinc-900 dark:text-white">Assets</Link>
            <Link href="/pricing" className="block text-lg font-medium text-zinc-900 dark:text-white">Pricing</Link>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
              {user ? (
                <>
                  <Link href="/dashboard" className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-center font-bold">Dashboard</Link>
                  <button onClick={() => signOut()} className="px-4 py-3 text-red-600 font-bold">Sign Out</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-center font-bold">Log in</Link>
                  <Link href="/signup" className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-center font-bold">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
