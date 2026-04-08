import type { ProjectData } from "@/lib/types/github";

interface ProjectGraphProps {
  project: ProjectData;
}

export function ProjectGraph({ project }: ProjectGraphProps) {
  const label = "Graph visualization";

  return (
    <div className="relative w-full aspect-video rounded-xl bg-[#F8F9FA] border border-[#4A90D9]/10 overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Lines */}
        <line x1="150" y1="120" x2="350" y2="200" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="350" y1="200" x2="600" y2="150" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="350" y1="200" x2="450" y2="300" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="450" y1="300" x2="650" y2="350" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="150" y1="120" x2="250" y2="280" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="250" y1="280" x2="450" y2="300" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="600" y1="150" x2="700" y2="100" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="350" y1="200" x2="200" y2="80" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="600" y1="150" x2="550" y2="50" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />
        <line x1="450" y1="300" x2="500" y2="400" stroke="#4A90D9" strokeWidth="1" opacity="0.1" />

        {/* Nodes */}
        <circle cx="150" cy="120" r="10" fill="#4A90D9" opacity="0.2" />
        <circle cx="200" cy="80" r="6" fill="#4A90D9" opacity="0.15" />
        <circle cx="250" cy="280" r="12" fill="#4A90D9" opacity="0.25" />
        
        {/* Main Node */}
        <circle cx="350" cy="200" r="22" fill="#4A90D9" opacity="0.4" />
        
        <circle cx="450" cy="300" r="16" fill="#4A90D9" opacity="0.3" />
        <circle cx="500" cy="400" r="8" fill="#4A90D9" opacity="0.2" />
        <circle cx="600" cy="150" r="14" fill="#4A90D9" opacity="0.25" />
        <circle cx="550" cy="50" r="6" fill="#4A90D9" opacity="0.15" />
        <circle cx="650" cy="350" r="10" fill="#4A90D9" opacity="0.2" />
        <circle cx="700" cy="100" r="8" fill="#4A90D9" opacity="0.15" />
      </svg>
      
      {/* Overlay label */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <span className="text-xs text-[#4A90D9]/40 font-(family-name:--font-antic)">
          {label}
        </span>
      </div>
    </div>
  );
}
