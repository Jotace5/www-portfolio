import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { PostMeta, PostContent } from './types/blog';

const postsDirectory = path.join(process.cwd(), 'src/content/posts');

export function getPostBySlug(slug: string): PostContent | null {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  if (!data.title || !data.date || !data.slug || !data.description) {
    throw new Error(`Missing required frontmatter fields in ${slug}.mdx`);
  }

  if (data.slug !== slug) {
    throw new Error(`Slug in frontmatter (${data.slug}) does not match filename (${slug}.mdx)`);
  }

  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 220);

  const meta: PostMeta = {
    title: data.title,
    date: data.date,
    slug: data.slug,
    description: data.description,
    readingTime,
    featured: data.featured === true,
  };

  return {
    meta,
    rawMdx: content,
  };
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '');
      const post = getPostBySlug(slug);
      
      if (!post) {
        throw new Error(`Could not load post for slug: ${slug}`);
      }
      
      return post.meta;
    });

  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  
  return fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => fileName.replace(/\.mdx$/, ''));
}
