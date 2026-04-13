import { getAllPosts } from "@/lib/mdx";
import { PostList } from "@/components/blog/PostList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Juance",
  description: "Writing on tech, scaling, and engineering.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-3xl">
      <h1 className="font-(family-name:--font-doto) text-3xl text-black mb-8">
        Blog
      </h1>
      
      {posts.length === 0 ? (
        <p className="font-(family-name:--font-antic) text-[#1A1A2E]/60">
          No posts yet.
        </p>
      ) : (
        <PostList posts={posts} />
      )}
    </div>
  );
}
