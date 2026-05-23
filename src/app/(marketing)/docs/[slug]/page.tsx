import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import type { Metadata } from "next";

import { mdxComponents } from "@/features/docs/components/mdx-components";
import { getDocSlugs, loadDoc } from "@/lib/mdx";

type Frontmatter = { title: string; description?: string };

export async function generateStaticParams() {
  const slugs = await getDocSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const source = await loadDoc(slug);
  if (!source) return {};
  const { frontmatter } = await compileMDX<Frontmatter>({
    source,
    options: { parseFrontmatter: true },
  });
  return {
    title: `${frontmatter.title} — Standfast docs`,
    description: frontmatter.description,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const source = await loadDoc(slug);
  if (!source) notFound();

  const { content } = await compileMDX<Frontmatter>({
    source,
    components: mdxComponents,
    options: { parseFrontmatter: true },
  });

  return <article className="max-w-3xl">{content}</article>;
}
