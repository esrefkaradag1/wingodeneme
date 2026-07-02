'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { useConfirmDialogStore } from '@/store/confirm-dialog.store';

export function ConfirmDialogHost() {
  const open = useConfirmDialogStore((s) => s.open);
  const title = useConfirmDialogStore((s) => s.title);
  const message = useConfirmDialogStore((s) => s.message);
  const onayMetni = useConfirmDialogStore((s) => s.onayMetni);
  const iptalMetni = useConfirmDialogStore((s) => s.iptalMetni);
  const variant = useConfirmDialogStore((s) => s.variant);
  const closeWith = useConfirmDialogStore((s) => s.closeWith);

  const destructive = variant === 'destructive';

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) closeWith(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[301] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl shadow-slate-900/10 outline-none"
          onEscapeKeyDown={() => closeWith(false)}
        >
          <div className="flex gap-4 p-6">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                destructive ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <Dialog.Title className="text-lg font-semibold text-gray-900 leading-snug">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {message}
              </Dialog.Description>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 px-4 py-3 rounded-b-2xl">
            <button
              type="button"
              onClick={() => closeWith(false)}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {iptalMetni}
            </button>
            <button
              type="button"
              onClick={() => closeWith(true)}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                destructive
                  ? 'bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20'
              }`}
            >
              {onayMetni}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
