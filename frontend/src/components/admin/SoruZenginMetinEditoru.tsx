'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Eraser,
  Subscript,
  Superscript,
  Code2,
  Pilcrow,
} from 'lucide-react';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  label?: string;
};

function bosHtmlMu(html: string): boolean {
  const plain = String(html || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return plain.length === 0;
}

export default function SoruZenginMetinEditoru({
  value,
  onChange,
  placeholder = 'Metni buraya yazın…',
  minHeight = 160,
  label,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [htmlModu, setHtmlModu] = useState(false);
  const [htmlHam, setHtmlHam] = useState(value);
  const sonDisDeger = useRef('');

  const icerikYay = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    sonDisDeger.current = html;
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    if (htmlModu) {
      setHtmlHam(value);
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    if (value === sonDisDeger.current && el.innerHTML === (value || '')) return;
    sonDisDeger.current = value;
    if (document.activeElement === el) return;
    el.innerHTML = value || '';
  }, [value, htmlModu]);

  const komut = (cmd: string, arg?: string) => {
    if (htmlModu) return;
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    icerikYay();
  };

  const aracBtn = (
    title: string,
    onClick: () => void,
    icon: React.ReactNode,
    ek?: string,
  ) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
    >
      <span className="flex items-center gap-1">
        {icon}
        {ek ? <span className="text-[9px] font-bold hidden sm:inline">{ek}</span> : null}
      </span>
    </button>
  );

  return (
    <div className="space-y-2">
      {label ? (
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      ) : null}

      <div className="rounded-3xl border border-gray-100 bg-gray-50 overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-white/80">
          {!htmlModu ? (
            <>
              {aracBtn('Kalın (Ctrl+B)', () => komut('bold'), <Bold className="w-4 h-4" />)}
              {aracBtn('İtalik (Ctrl+I)', () => komut('italic'), <Italic className="w-4 h-4" />)}
              {aracBtn('Altı çizili (Ctrl+U)', () => komut('underline'), <Underline className="w-4 h-4" />, 'Altı çiz')}
              {aracBtn('Üstü çizili', () => komut('strikeThrough'), <Strikethrough className="w-4 h-4" />)}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              {aracBtn('Üst simge (I, II…)', () => komut('superscript'), <Superscript className="w-4 h-4" />)}
              {aracBtn('Alt simge', () => komut('subscript'), <Subscript className="w-4 h-4" />)}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              {aracBtn('Madde işareti', () => komut('insertUnorderedList'), <List className="w-4 h-4" />)}
              {aracBtn('Numaralı liste', () => komut('insertOrderedList'), <ListOrdered className="w-4 h-4" />)}
              {aracBtn('Paragraf', () => komut('formatBlock', 'p'), <Pilcrow className="w-4 h-4" />)}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              {aracBtn('Biçimlendirmeyi temizle', () => komut('removeFormat'), <Eraser className="w-4 h-4" />)}
            </>
          ) : (
            <span className="text-[10px] font-bold text-amber-600 px-2 py-1">Ham HTML düzenleme</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (htmlModu) {
                  onChange(htmlHam);
                  sonDisDeger.current = htmlHam;
                  setHtmlModu(false);
                } else {
                  setHtmlHam(value);
                  setHtmlModu(true);
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                htmlModu ? 'bg-amber-100 text-amber-800' : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              HTML
            </button>
          </div>
        </div>

        {htmlModu ? (
          <textarea
            value={htmlHam}
            onChange={(e) => {
              setHtmlHam(e.target.value);
              sonDisDeger.current = e.target.value;
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full px-5 py-4 bg-white font-mono text-xs text-gray-700 outline-none resize-y"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline
            data-placeholder={placeholder}
            onInput={icerikYay}
            onBlur={icerikYay}
            style={{ minHeight }}
            className="soru-zengin-editor w-full px-5 py-4 bg-white text-sm text-gray-800 leading-relaxed outline-none overflow-y-auto [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-300 [&:empty]:before:pointer-events-none [&_u]:underline [&_em]:italic [&_strong]:font-bold [&_sub]:text-[0.75em] [&_sub]:align-sub [&_sup]:text-[0.75em] [&_sup]:align-super [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0"
          />
        )}
      </div>

      {!htmlModu && bosHtmlMu(value) ? (
        <p className="text-[10px] text-gray-400 ml-1">
          Seçili kelimeye araç çubuğundan <b>kalın</b>, <i>italik</i> veya <u>altı çizili</u> uygulayabilirsiniz.
        </p>
      ) : null}
    </div>
  );
}
