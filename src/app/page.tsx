import ParticleText from "@/components/hero/ParticleText";
import type { ParticleTextConfig } from "@/lib/particleUtils";
import { ProjectsSection } from '@/components/projects/ProjectsSection';

const heroConfig: ParticleTextConfig = {
  paddingTop: 20,
  paddingBottom: 60,
  blocks: [
    {
      text: "Hi, I'm Juan",
      font: "bold 48px Doto",
      marginTop: 50,
    },
    {
      text: "Former architect who spent 12 years designing and building things, until what started as experimentation became the path forward. That drive got me into a small-team US startup where we built a full conversational AI platform from zero — voice pipelines, new channels integration, LLM systems, and event-driven architectures on Cloud Services. I designed features end-to-end, put them into production, and learned to think in reliable systems built to scale. No CS degree (for now) — just own motivation, work and a mind full of curiosity.",
      font: "18px Antic",
      marginTop: 60,
      maxWidth: 0.95,
      lineHeight: 1.5,
      alphaThreshold: 70,
    },
    {
      text: "Today, I'm still designing and building things — just with different tools.",
      font: "18px Antic",
      marginTop: 60,
      maxWidth: 0.95,
      lineHeight: 1.5,
      alphaThreshold: 70,
    },
  ],
};

export default function Home() {
  return (
    <div>
      <ParticleText config={heroConfig} />
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