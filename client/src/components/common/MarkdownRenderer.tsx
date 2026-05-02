import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ node, ...props }) => (
            <img
              {...props}
              className="max-w-full h-auto rounded-lg border-border my-2"
              loading="lazy"
            />
          ),
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="ml-2">{children}</li>,
          code: ({ node, inline, className: codeClassName, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            const cleanChildren = Array.isArray(children)
              ? children.filter((child: any) => child?.type !== 'br')
              : children;
            return (
              <pre className="bg-secondary rounded-lg p-4 overflow-x-auto mb-4 whitespace-pre">
                <code className={codeClassName} {...props}>
                  {cleanChildren}
                </code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-border">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-secondary">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-border px-4 py-2 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-4 py-2">{children}</td>,
          a: ({ href, children }) => (
            <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
