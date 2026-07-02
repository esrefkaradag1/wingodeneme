declare module 'katex/contrib/auto-render' {
  export interface RenderMathInElementOptions {
    delimiters?: Array<{ left: string; right: string; display: boolean }>;
    throwOnError?: boolean;
    strict?: boolean;
    ignoredTags?: string[];
    ignoredClasses?: string[];
    errorCallback?: (msg: string, err: unknown) => void;
    macros?: Record<string, string>;
  }
  export default function renderMathInElement(
    elem: HTMLElement,
    options?: RenderMathInElementOptions,
  ): void;
}
