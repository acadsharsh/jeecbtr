"use client";

/**
 * MathText — renders a string that may contain LaTeX math expressions.
 *
 * Supported syntax:
 *   Inline math  :  $x^2 + y^2 = r^2$      or  \(x^2\)
 *   Display math :  $$\frac{a}{b}$$          or  \[E = mc^2\]
 *
 * Non-math text between expressions is rendered as plain text, so you
 * can mix prose and equations freely.
 *
 * KaTeX is imported dynamically so it doesn't bloat the initial bundle.
 */

import { useEffect, useState, memo } from "react";

interface MathTextProps {
  /** The raw string, e.g. "Find $x$ if $x^2 = 4$" */
  text: string;
  /** Extra className on the wrapper span */
  className?: string;
  /** Display block (centres equations). Default false = inline */
  block?: boolean;
}

// Split a string into alternating plain / math segments
type Segment =
  | { type: "text"; content: string }
  | { type: "math"; content: string; display: boolean };

function splitMath(raw: string): Segment[] {
  // Order matters — match display before inline
  const re = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^)]+?\\\))/g;
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", content: raw.slice(last, match.index) });
    }
    const token = match[0];
    const display = token.startsWith("$$") || token.startsWith("\\[");
    const inner = token
      .replace(/^\$\$|\$\$$/g, "")
      .replace(/^\$|\$$/g, "")
      .replace(/^\\\[|\\\]$/g, "")
      .replace(/^\\\(|\\\)$/g, "")
      .trim();
    segments.push({ type: "math", content: inner, display });
    last = match.index + token.length;
  }
  if (last < raw.length) {
    segments.push({ type: "text", content: raw.slice(last) });
  }
  return segments;
}

// Render a single math segment to an HTML string via KaTeX
function renderMath(content: string, display: boolean, katex: any): string {
  try {
    return katex.renderToString(content, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return `<span class="text-crimson-500 font-mono text-xs">[math error]</span>`;
  }
}

// Check if a string actually contains math tokens
export function containsMath(text: string): boolean {
  return /\$[\s\S]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/.test(text);
}

export const MathText = memo(function MathText({ text, className, block }: MathTextProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [hasMath, setHasMath] = useState(false);

  useEffect(() => {
    if (!text) return;
    const segments = splitMath(text);
    const mathSegments = segments.filter(s => s.type === "math");

    if (mathSegments.length === 0) {
      setHasMath(false);
      setHtml(null);
      return;
    }

    setHasMath(true);

    // Dynamically import KaTeX only when needed
    import("katex").then(({ default: katex }) => {
      const parts = segments.map(seg => {
        if (seg.type === "text") {
          // Escape HTML in plain text segments
          return seg.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }
        return renderMath(seg.content, seg.display, katex);
      });
      setHtml(parts.join(""));
    });
  }, [text]);

  // No math found — just render plain text
  if (!hasMath || html === null) {
    const Tag = block ? "div" : "span";
    return <Tag className={className}>{text}</Tag>;
  }

  const Tag = block ? "div" : "span";
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
