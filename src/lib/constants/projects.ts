import { type FeaturedProject, type ProjectConfigEntry } from "@/lib/types/github";
import projectsConfig from "../../../projects.config.json";

export const GITHUB_OWNER = "Jotace5";

export const FEATURED_PROJECTS: FeaturedProject[] = (projectsConfig as ProjectConfigEntry[])
  .map((p) => ({
    repoName: p.name,
    displayName: p.frontend.displayName,
    order: p.frontend.order,
  }))
  .sort((a, b) => a.order - b.order);
