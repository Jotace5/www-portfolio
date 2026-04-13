import type { PostMeta } from "@/lib/types/blog";
import { PostListItem } from "./PostListItem";

export function PostList({ posts }: { posts: PostMeta[] }) {
  return (
    <ul className="p-0 m-0 flex flex-col">
      {posts.map((post) => (
        <PostListItem key={post.slug} post={post} />
      ))}
    </ul>
  );
}
