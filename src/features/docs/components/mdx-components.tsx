import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type AProps = ComponentPropsWithoutRef<"a">;

export const mdxComponents = {
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="mb-4 text-3xl font-semibold tracking-tight" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-8 mb-3 text-2xl font-semibold tracking-tight"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-6 mb-2 text-xl font-medium" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mb-4 leading-7 text-foreground/90" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mb-4 list-disc pl-6 [&>li]:my-1" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mb-4 list-decimal pl-6 [&>li]:my-1" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  a: ({ href = "#", children, ...rest }: AProps) => {
    const isInternal = href.startsWith("/");
    if (isInternal) {
      return (
        <Link
          href={href}
          className="text-primary underline underline-offset-4 hover:no-underline"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:no-underline"
        target="_blank"
        rel="noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  },
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="my-4 overflow-x-auto rounded-md bg-muted p-4 text-sm"
      {...props}
    />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground"
      {...props}
    />
  ),
};
