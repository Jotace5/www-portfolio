import ParticleText from "@/components/hero/ParticleText";

export default function Home() {
  return (
    <div>
      <ParticleText
        imageSrc="/images/hero-text.png"
      />
      <p className="text-lg mt-8 text-[#1A1A2E]">
        Self-made software engineer, ex-architect switching career. Building things that matter.
      </p>
    </div>
  );
}
