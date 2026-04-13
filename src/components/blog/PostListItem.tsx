import Link from "next/link";
import type { PostMeta } from "@/lib/types/blog";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PostListItem({ post }: { post: PostMeta }) {
  return (
    <li className="py-3 border-b border-[#1A1A2E]/10 last:border-b-0">
      <Link
        href={`/blog/${post.slug}`}
        className="flex flex-row items-baseline gap-4 group"
      >
        <span className="w-28 shrink-0 text-sm font-(family-name:--font-antic) text-[#1A1A2E]/60">
          {formatDate(post.date)}
        </span>
        <span className="flex-1 font-(family-name:--font-antic) text-[#1A1A2E] font-normal group-hover:underline group-hover:text-[#4A90D9] transition-colors">
          {post.title}
        </span>
        <span className="text-sm font-(family-name:--font-antic) text-[#1A1A2E]/60">
          {post.readingTime} min read
        </span>
      </Link>
    </li>
  );
}
