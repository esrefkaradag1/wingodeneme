import React from 'react';
import { Heart, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { id: 1, title: 'Modern SaaS Dashboard', category: 'UI Kit', price: '$49', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800' },
  { id: 2, title: 'Agency Landing Page', category: 'Template', price: '$29', image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=800' },
  { id: 3, title: 'Mobile E-commerce App', category: 'Mobile', price: '$59', image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800' },
  { id: 4, title: 'Dark Portfolio Theme', category: 'Website', price: '$19', image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=800' },
];

export const FeaturedItems = () => {
  return (
    <section className="py-20 px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Featured Assets</h2>
            <p className="text-zinc-500 mt-2">The best-selling templates of this week.</p>
          </div>
          <button className="text-indigo-600 font-semibold hover:underline text-sm transition-all">View all products</button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item) => (
            <div key={item.id} className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-2xl transition-all">
              <div className="aspect-video relative overflow-hidden">
                <img src={item.image} alt={item.title} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700" />
                <button className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-zinc-900 dark:text-white hover:text-red-500 transition-colors">
                  <Heart size={18} />
                </button>
              </div>
              <div className="p-5">
                <div className="text-[10px] font-bold text-indigo-600 mb-1 uppercase tracking-widest">{item.category}</div>
                <h3 className="font-bold text-zinc-900 dark:text-white mb-4 line-clamp-1">{item.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{item.price}</span>
                  <button className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                    <Download size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
