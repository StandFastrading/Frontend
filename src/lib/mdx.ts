import fs from "node:fs/promises";
import path from "node:path";

const DOCS_DIR = path.join(process.cwd(), "content", "docs");

export async function loadDoc(slug: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(DOCS_DIR, `${slug}.mdx`), "utf8");
  } catch {
    return null;
  }
}

export async function getDocSlugs(): Promise<string[]> {
  const files = await fs.readdir(DOCS_DIR);
  return files
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
