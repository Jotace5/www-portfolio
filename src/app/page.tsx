import ParticleText from "@/components/hero/ParticleText";
import type { ParticleTextConfig } from "@/lib/particleUtils";

const heroConfig: ParticleTextConfig = {
  paddingTop: 20,
  paddingBottom: 60,
  blocks: [
    {
      text: "Hi, I'm Juan",
      font: "bold 40px Doto",
      marginTop: 50,
    },
    {
      text: "Former architect who spent 12 years designing and building things, until what started as experimentation became the path forward. That drive got me into a small-team US startup where we built a full conversational AI platform from zero — voice pipelines, new channels integration, LLM systems, and event-driven architectures on Cloud Services. I designed features end-to-end, put them into production, and learned to think in reliable systems built to scale. No CS degree (for now) — just own motivation, work and a mind full of curiosity.",
      font: "18px Antic",
      marginTop: 60,
      maxWidth: 0.95,
      lineHeight: 1.5,
    },
    {
      text: "Today, I'm still designing and building things — just with different tools.",
      font: "18px Antic",
      marginTop: 60,
      maxWidth: 0.95,
      lineHeight: 1.5,
    },
  ],
};

export default function Home() {
  return (
    <div>
      <ParticleText config={heroConfig} />
      <p className="text-lg mt-8 text-[#1A1A2E]">
        Creating things that matter.
      </p>
    </div>
  );
}