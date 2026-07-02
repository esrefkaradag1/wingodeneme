import React from 'react';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">RepoBank</span>
            </Link>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Premium UI kits, templates, and assets to speed up your development workflow. Built by creators, for creators.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><Link href="/templates" className="hover:text-indigo-600 transition-colors">All Templates</Link></li>
              <li><Link href="/assets" className="hover:text-indigo-600 transition-colors">Graphic Assets</Link></li>
              <li><Link href="/components" className="hover:text-indigo-600 transition-colors">UI Components</Link></li>
              <li><Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing Plans</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><Link href="/about" className="hover:text-indigo-600 transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link></li>
              <li><Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Newsletter</h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Subscribe for weekly freebies and updates.</p>
            <form className="flex gap-2">
              <input 
                type="email" 
                placeholder="you@example.com" 
                className="w-full bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              />
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Join
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-zinc-100 dark:border-split-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-400">
            &copy; {new Date().getFullYear()} RepoBank. All rights reserved.
          </p>
          <div className="flex gap-6 text-zinc-400">
            <span className="text-xs hover:text-indigo-600 cursor-pointer">Twitter</span>
            <span className="text-xs hover:text-indigo-600 cursor-pointer">Discord</span>
            <span className="text-xs hover:text-indigo-600 cursor-pointer">Dribbble</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
