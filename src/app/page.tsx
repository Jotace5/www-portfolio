import { HeroSection } from "@/components/hero/HeroSection";
import { ProjectsSection } from '@/components/projects/ProjectsSection';

export default function Home() {
  return (
    <div>
      <HeroSection />
      {/* Projects Section */}
      <section id="projects" className="mt-20">
        <h2 className="font-(family-name:--font-doto) text-3xl text-black mb-8">
          Projects
        </h2>
        <ProjectsSection />
      </section>
    </div>
  );
}