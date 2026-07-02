'use client';

import { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';

/** LLM/JSON bazen \\( veya \\sqrt için fazladan \\ üretir; KaTeX delimiter arar. */
function katexHamHtmlNormalize(html: string): string {
  return String(html || '')
    .replace(/\\{2}([\(\)\[\]])/g, '\\$1')
    .replace(
      /\\{2}(sqrt|frac|left|right|cdot|cdotp|pm|mp|times|div|leq|geq|neq|approx|equiv|text|mathrm|mathbf|overline)/gi,
      '\\$1',
    );
}

type Props = {
  html: string;
  className?: string;
};

/**
 * HTML gösterir ve içindeki LaTeX'i KaTeX ile işler (`\(...\)`, `\[...\]`, `$...$`).
 */
export function SoruHtmlMath({ html, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = katexHamHtmlNormalize(html || '');
    let iptal = false;
    void (async () => {
      try {
        const mod = await import('katex/contrib/auto-render');
        const renderMathInElement = (mod as { default: (n: HTMLElement, o: object) => void }).default;
        if (!renderMathInElement || iptal || !ref.current) return;
        renderMathInElement(ref.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
          strict: false,
        });
      } catch {
        /* KaTeX yüklenemezse ham HTML kalır */
      }
    })();
    return () => {
      iptal = true;
    };
  }, [html]);

  return <div ref={ref} className={className} />;
}
