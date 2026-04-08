'use client';

import type { ProjectData } from "@/lib/types/github";
import { FEATURED_PROJECTS } from "@/lib/constants/projects";

interface ProjectInfoProps {
  project: ProjectData;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F7DF1E",
  Python: "#3572A5",
  CSS: "#563D7C",
  Batchfile: "#C1F12E",
  HTML: "#E34C26"
};

const DEFAULT_LANG_COLOR = "#8B8B8B";

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
}

export function ProjectInfo({ project }: ProjectInfoProps) {
  if (!project.metadata) return null;

  const { metadata, languages, fileTree } = project;
  const fileCount = fileTree.filter(e => e.type === "blob").length;

  return (
    <div className="flex flex-col h-full justify-center">
      <h3 className="font-(family-name:--font-Doto) text-2xl text-black">
        {metadata.htmlUrl ? (
          <a href={metadata.htmlUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {metadata.name} <span className="inline-block translate-x-1 -translate-y-1 text-lg">↗</span>
          </a>
        ) : (
          metadata.name
        )}
      </h3>
      
      {metadata.description && (
        <p className="font-(family-name:--font-antic) text-base text-[#1A1A2E] mt-2">
          {metadata.description}
        </p>
      )}

      {languages && languages.length > 0 && (
        <>
          <div className="w-full flex h-2 rounded-full overflow-hidden mt-5">
            {languages.map(lang => (
              <div 
                key={lang.name}
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: LANGUAGE_COLORS[lang.name] || DEFAULT_LANG_COLOR
                }}
                className="h-full"
                title={`${lang.name}: ${lang.percentage}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {languages.map(lang => (
              <div key={lang.name} className="flex items-center gap-1.5 text-xs text-[#1A1A2E]">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: LANGUAGE_COLORS[lang.name] || DEFAULT_LANG_COLOR }} 
                />
                <span className="font-medium">{lang.name}</span>
                <span className="opacity-70">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-row flex-wrap mt-5 gap-6">
        <div className="flex flex-col">
          <span className="text-xs uppercase text-[#1A1A2E]/50">Stars</span>
          <span className="text-sm font-medium text-[#1A1A2E]">{metadata.stargazersCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase text-[#1A1A2E]/50">Forks</span>
          <span className="text-sm font-medium text-[#1A1A2E]">{metadata.forksCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase text-[#1A1A2E]/50">Last Activity</span>
          <span className="text-sm font-medium text-[#1A1A2E]">{getRelativeTime(metadata.pushedAt)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase text-[#1A1A2E]/50">Files</span>
          <span className="text-sm font-medium text-[#1A1A2E]">{fileCount}</span>
        </div>
      </div>

      {metadata.topics && metadata.topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {metadata.topics.map(topic => (
            <span 
              key={topic} 
              className="text-xs px-2 py-0.5 rounded-full border border-[#4A90D9]/20 text-[#4A90D9]"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
