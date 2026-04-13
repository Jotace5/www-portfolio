export interface PostMeta {
  title: string;
  date: string;          // ISO format: "2026-04-13"
  slug: string;
  description: string;
  readingTime: number;   // minutes, rounded up
  featured: boolean;
}

export interface PostContent {
  meta: PostMeta;
  rawMdx: string;        // raw MDX source, frontmatter already stripped
}
