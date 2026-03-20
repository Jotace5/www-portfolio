import { NextRequest, NextResponse } from "next/server";
import { GITHUB_OWNER } from "@/lib/constants/projects";
import type { RepoMetadata, LanguageEntry, FileTreeEntry, ProjectData } from "@/lib/types/github";

export async function GET(request: NextRequest) {
  const repo = request.nextUrl.searchParams.get("repo");
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN is missing in environment variables" },
      { status: 500 }
    );
  }

  if (!repo) {
    return NextResponse.json(
      { error: "Missing 'repo' query parameter" },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "www-portfolio",
  };

  try {
    // 1. Fetch metadata first to get the defaultBranch
    const metaResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}`, {
      headers,
    });

    if (metaResponse.status === 404) {
      return NextResponse.json(
        { status: "not-found" },
        { status: 200 }
      );
    }

    if (metaResponse.status === 403) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded (403)" },
        { status: 429 }
      );
    }

    if (!metaResponse.ok) {
      throw new Error(`Failed to fetch metadata (Status: ${metaResponse.status})`);
    }

    const rawMeta = await metaResponse.json();

    const metadata: RepoMetadata = {
      name: rawMeta.name,
      description: rawMeta.description,
      htmlUrl: rawMeta.html_url,
      language: rawMeta.language,
      topics: rawMeta.topics || [],
      stargazersCount: rawMeta.stargazers_count,
      forksCount: rawMeta.forks_count,
      createdAt: rawMeta.created_at,
      pushedAt: rawMeta.pushed_at,
      defaultBranch: rawMeta.default_branch,
    };

    // 2. Fetch languages and tree in parallel
    const [langsResult, treeResult] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/languages`, { headers }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch languages");
        return res.json();
      }),
      fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/git/trees/${metadata.defaultBranch}?recursive=1`, { headers }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tree");
        return res.json();
      }),
    ]);

    // Process languages
    let languages: LanguageEntry[] = [];
    if (langsResult.status === "fulfilled") {
      const rawLangs = langsResult.value;
      const totalBytes = Object.values(rawLangs).reduce((sum: number, bytes: any) => sum + Number(bytes), 0);
      
      languages = Object.entries(rawLangs).map(([name, bytes]) => {
        const numBytes = Number(bytes);
        return {
          name,
          bytes: numBytes,
          percentage: totalBytes > 0 ? Math.round((numBytes / totalBytes) * 1000) / 10 : 0,
        };
      });

      // Sort by percentage descending
      languages.sort((a, b) => b.percentage - a.percentage);
    }

    // Process file tree
    let fileTree: FileTreeEntry[] = [];
    if (treeResult.status === "fulfilled" && treeResult.value.tree) {
      fileTree = treeResult.value.tree
        .filter((entry: any) => entry.path)
        .map((entry: any) => ({
          path: entry.path,
          type: entry.type === "blob" ? "blob" : "tree",
          size: entry.size,
        }));
    }

    const projectData: ProjectData = {
      status: "available",
      repoName: repo,
      displayName: rawMeta.name, // Will be overridden by client if necessary
      metadata,
      languages,
      fileTree,
    };

    return NextResponse.json(projectData, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
