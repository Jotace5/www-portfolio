/** Raw repo metadata from GitHub API */
export interface RepoMetadata {
  name: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  topics: string[];
  stargazersCount: number;
  forksCount: number;
  createdAt: string;       // ISO date string
  pushedAt: string;        // ISO date string
  defaultBranch: string;
}

/** Language breakdown with bytes and calculated percentage */
export interface LanguageEntry {
  name: string;
  bytes: number;
  percentage: number;      // 0-100, rounded to 1 decimal
}

/** Single entry from the Git tree endpoint */
export interface FileTreeEntry {
  path: string;
  type: "blob" | "tree";   // blob = file, tree = directory
  size?: number;            // bytes, only present for blobs
}

/** Consolidated project data returned by our API route */
export interface ProjectData {
  status: "available";
  repoName: string;
  displayName: string;
  metadata: RepoMetadata | null;
  languages: LanguageEntry[];
  fileTree: FileTreeEntry[];
}

/** Single entry in projects.config.json */
export interface ProjectConfigEntry {
  name: string;
  repo: string;
  sourceDir: string;
  languages: string[];
  extensions: string[];
  ignoreDependencies: string[];
  ignoreDirectories?: string[];
  frontend: {
    displayName: string;
    order: number;
  };
}

/** Config for a featured project in the projects list */
export interface FeaturedProject {
  repoName: string;
  displayName: string;
  order: number;
}
