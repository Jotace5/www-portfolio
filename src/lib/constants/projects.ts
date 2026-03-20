import { type FeaturedProject } from "@/lib/types/github";

export const GITHUB_OWNER = "Jotace5";

export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    repoName: "www-portfolio",
    displayName: "Portfolio Website",
    order: 1,
  },
  {
    repoName: "audio-transcriber",
    displayName: "SST Transcriber",
    order: 2,
  },
  {
    repoName: "codesource-viz",
    displayName: "CodeSource Visualizer",
    order: 3,
    comingSoonDescription:
      "Interactive 3D node graph tool for visualizing codebase architecture and file relationships.",
    comingSoonTech: ["Three.js", "TypeScript", "Force-Directed Layout"],
  },
];
