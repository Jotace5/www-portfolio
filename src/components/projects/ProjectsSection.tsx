'use client';

import { useEffect, useState } from "react";
import { fetchAllProjects } from "@/lib/github";
import type { ProjectData } from "@/lib/types/github";
import { ProjectSelector } from "./ProjectSelector";
import { ProjectInfo } from "./ProjectInfo";
import { ProjectGraph } from "./ProjectGraph";

export function ProjectsSection() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await fetchAllProjects();
        setProjects(data);
      } catch (err: any) {
        setError("Could not load projects");
      } finally {
        setLoading(false);
      }
    }
    
    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20 font-(family-name:--font-Antic) text-[#1A1A2E]/40">
        Loading projects...
      </div>
    );
  }

  if (error || projects.length === 0) {
    return (
      <div className="w-full flex justify-center py-20 font-(family-name:--font-Antic) text-[#1A1A2E]/40">
        {error || "No projects found."}
      </div>
    );
  }

  const activeProject = projects[activeIndex];

  return (
    <div className="flex flex-col w-full">
      <ProjectSelector 
        projects={projects} 
        activeIndex={activeIndex} 
        onSelect={setActiveIndex} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-[1fr_0.7fr] gap-8 mt-8">
        <ProjectInfo project={activeProject} />
        <ProjectGraph project={activeProject} />
      </div>
    </div>
  );
}
