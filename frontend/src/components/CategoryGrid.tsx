import React from 'react';
import { Layout, Smartphone, Globe, Palette, Database, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'UI Kits', icon: Palette, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/20' },
  { name: 'Templates', icon: Layout, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  { name: 'Mobile', icon: Smartphone, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  { name: 'Websites', icon: Globe, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20' },
  { name: 'Backend', icon: Database, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20' },
  { name: 'Security', icon: Lock, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20' },
];

export const CategoryGrid = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-10 text-center">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => (
            <div 
              key={category.name}
              className="group cursor-pointer p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-xl hover:-translate-y-1"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", category.bg)}>
                <category.icon className={cn("w-6 h-6", category.color)} />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">{category.name}</h3>
              <p className="text-xs text-zinc-500 mt-1">Explore items</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
