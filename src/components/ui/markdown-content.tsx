import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with consistent styling across the site
 * Supports GitHub Flavored Markdown (tables, strikethrough, task lists, etc.)
 */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <h1 className="text-3xl font-bold mb-4 mt-6 first:mt-0" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-2xl font-bold mb-3 mt-5 first:mt-0" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xl font-semibold mb-2 mt-4" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-lg font-semibold mb-2 mt-3" {...props}>
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p className="mb-4 leading-relaxed text-muted-foreground" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-muted-foreground" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-muted-foreground" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="ml-4" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props}>
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>, // Remove default pre styling since we style code blocks
          a: ({ children, ...props }) => (
            <a
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-border" />,
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-border" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border px-4 py-2 text-left font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-4 py-2" {...props}>
              {children}
            </td>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-foreground" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic" {...props}>
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
