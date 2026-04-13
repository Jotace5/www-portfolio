import { compileMDX } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";

export async function PostBody({ source }: { source: string }) {
  const { content } = await compileMDX({
    source,
    options: {
      mdxOptions: {
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: "github-light",
              keepBackground: true,
            },
          ],
        ],
      },
    },
  });

  return (
    <div className="post-body font-(family-name:--font-antic) text-[#1A1A2E] leading-relaxed">
      {content}
    </div>
  );
}
