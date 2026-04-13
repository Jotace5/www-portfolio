import { getAllPosts } from "@/lib/mdx";
import { PostListItem } from "@/components/blog/PostListItem";
import Link from "next/link";

export function RecentPosts() {
  const allPosts = getAllPosts();
  const featured = allPosts.filter((p) => p.featured);
  const toDisplay =
    featured.length >= 3 ? featured.slice(0, 3) : allPosts.slice(0, 3);

  if (toDisplay.length === 0) {
    return null;
  }

  return (
    <>
      <h2 className="font-(family-name:--font-doto) text-3xl text-black mb-8">
        Recent writing
      </h2>
      <ul className="p-0 m-0 flex flex-col mb-4">
        {toDisplay.map((post) => (
          <PostListItem key={post.slug} post={post} />
        ))}
      </ul>
      <div className="flex justify-end mt-4">
        <Link
          href="/blog"
          className="font-(family-name:--font-antic) text-sm text-[#1A1A2E]/60 hover:text-[#4A90D9] transition-colors"
        >
          All posts &rarr;
        </Link>
      </div>
    </>
  );
}
