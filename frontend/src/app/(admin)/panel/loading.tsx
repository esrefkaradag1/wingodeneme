import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-100 animate-pulse" />
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin absolute inset-0" />
      </div>
      <p className="text-sm font-medium text-gray-500 animate-pulse">Yükleniyor...</p>
    </div>
  );
}
