import { FEATURED_PROJECTS } from "@/lib/constants/projects";
import type { ProjectData } from "@/lib/types/github";

export async function fetchProjectData(repoName: string, displayName: string): Promise<ProjectData> {
  const url = `/api/github?repo=${encodeURIComponent(repoName)}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch project data for ${repoName}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status === "not-found") {
    return {
      status: "coming-soon",
      repoName,
      displayName,
      metadata: null,
      languages: [],
      fileTree: [],
    };
  }

  return {
    ...data,
    displayName,
  };
}

export async function fetchAllProjects(): Promise<ProjectData[]> {
  const results = await Promise.allSettled(
    FEATURED_PROJECTS.map((project) => fetchProjectData(project.repoName, project.displayName))
  );

  const projects: ProjectData[] = [];

  results.forEach((result, index) => {
    const config = FEATURED_PROJECTS[index];

    if (result.status === "fulfilled") {
      projects.push(result.value);
    } else {
      console.error(`Error fetching project ${config.repoName}:`, result.reason);

      if (config.comingSoonDescription) {
        projects.push({
          status: "coming-soon",
          repoName: config.repoName,
          displayName: config.displayName,
          metadata: null,
          languages: [],
          fileTree: [],
        });
      }
    }
  });

  const orderedProjects = projects.map(p => {
    const featureConfig = FEATURED_PROJECTS.find(f => f.repoName === p.repoName);
    return { project: p, order: featureConfig?.order || 999 };
  });

  orderedProjects.sort((a, b) => a.order - b.order);

  return orderedProjects.map(p => p.project);
}
