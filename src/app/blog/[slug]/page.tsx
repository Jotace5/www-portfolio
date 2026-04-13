import { getPostBySlug, getAllSlugs } from "@/lib/mdx";
import { notFound } from "next/navigation";
import { PostBody } from "@/components/blog/PostBody";
import type { Metadata } from "next";
import Link from "next/link";

export function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found — Juance",
    };
  }

  return {
    title: `${post.meta.title} — Juance`,
    description: post.meta.description,
  };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-170 mx-auto mt-12 w-full">
      <header className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-6 border-b border-[#1A1A2E]/10 pb-4">
        <h1 className="font-(family-name:--font-doto) text-black text-4xl">
          {post.meta.title}
        </h1>
        <div className="shrink-0 font-(family-name:--font-antic) text-sm text-[#1A1A2E]/60 whitespace-nowrap">
          {formatDate(post.meta.date)} &middot; {post.meta.readingTime} min read
        </div>
      </header>

      <div className="mt-12">
        <PostBody source={post.rawMdx} />
      </div>

      <footer className="mt-20 border-t border-[#1A1A2E]/10 pt-6">
        <Link
          href="/blog"
          className="font-(family-name:--font-antic) text-sm text-[#1A1A2E]/60 hover:text-[#4A90D9] transition-colors"
        >
          &larr; Back to blog
        </Link>
      </footer>
    </div>
  );
}
