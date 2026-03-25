'use client';

import type { ProjectData } from "@/lib/types/github";

interface ProjectSelectorProps {
  projects: ProjectData[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ProjectSelector({ projects, activeIndex, onSelect }: ProjectSelectorProps) {
  return (
    <div className="flex flex-row flex-wrap gap-3">
      {projects.map((project, index) => {
        const isActive = index === activeIndex;
        const isComingSoon = project.status === "coming-soon";
        
        return (
          <button
            key={project.repoName}
            onClick={() => onSelect(index)}
            className={`
              px-5 py-2 rounded-full font-(family-name:--font-Antic) text-sm transition-all duration-200
              ${isActive 
                ? "bg-[#4A90D9] text-white shadow-sm" 
                : "bg-transparent border border-[#4A90D9]/30 text-[#1A1A2E] hover:border-[#4A90D9]"
              }
            `}
          >
            {project.displayName}
            {isComingSoon && <span className="ml-1 opacity-70">✦</span>}
          </button>
        );
      })}
    </div>
  );
}
