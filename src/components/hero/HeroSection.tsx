'use client';

import { useEffect, useRef } from 'react';
import { ScrambleText } from './ScrambleText';

const TITLE_TEXT = "Hi, I'm Juan";

const SUBTITLE_TEXT = "Software engineer based in Buenos Aires, Argentina.";

const BODY_TEXT = `Former architect who spent about a decade designing and building things, until what started as experimentation became the path forward. That career trained me to connect systems from completely different disciplines and to think from the perspective of the person who will actually use what I build. I bring that same instinct to software – most recently at a small-team US startup where we built a conversational AI platform for customer service from zero, handling 3,000 conversations a day across voice, WhatsApp, and web. I designed and owned features end-to-end, from problem to architecture to production.`;

const CLOSING_TEXT = `Today, I'm still designing and building things – just with different tools.`;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleScrambleRef = useRef<((delayMs?: number) => void) | null>(null);
  const subtitleScrambleRef = useRef<((delayMs?: number) => void) | null>(null);
  const bodyScrambleRef = useRef<((delayMs?: number) => void) | null>(null);
  const closingScrambleRef = useRef<((delayMs?: number) => void) | null>(null);
  const wasVisible = useRef(true);

  const handleReplay = () => {
    titleScrambleRef.current?.(0);
    subtitleScrambleRef.current?.(1200);
    bodyScrambleRef.current?.(2200); 
    closingScrambleRef.current?.(5500);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        
        if (entry.isIntersecting && !wasVisible.current) {
          subtitleScrambleRef.current?.(0);
          bodyScrambleRef.current?.(0);
          closingScrambleRef.current?.(8 * BODY_TEXT.length + 1000);
        }
        
        wasVisible.current = entry.isIntersecting;
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="flex flex-col items-center justify-center pt-12 pb-8 px-4 max-w-3xl mx-auto min-h-[20vh]">
      {/* Título — Doto */}
      <div className="text-center">
        <ScrambleText
          text={TITLE_TEXT}
          charset="circuit"
          scrambleDuration={1100}
          staggerPerChar={70}
          autoStart
          startDelay={300}
          continuousJitter
          jitterRate={0.050}
          scrambleRef={titleScrambleRef}
          className="font-(family-name:--font-doto) text-4xl sm:text-5xl md:text-6xl font-semibold tracking-wide text-black leading-tight"
        />
      </div>

      {/* Subtitle — Doto */}
      <div className="text-center mt-3 sm:mt-4 mb-7">
        <ScrambleText
          text={SUBTITLE_TEXT}
          charset="alphanumeric"
          scrambleDuration={1000}
          staggerPerChar={8}
          autoStart
          startDelay={1200}
          scrambleRef={subtitleScrambleRef}
          className="font-(family-name:--font-doto) text-lg sm:text-xl md:text-2xl text-black font-medium"
        />
      </div>

      {/* Body — Antic */}
      <div className="text-center">
        <ScrambleText
          text={BODY_TEXT}
          charset="alphanumeric"
          scrambleDuration={1000}
          staggerPerChar={8}
          autoStart
          startDelay={2200}
          scrambleRef={bodyScrambleRef}
          className="font-(family-name:--font-antic) text-sm sm:text-base md:text-lg text-[#1A1A2E] leading-relaxed"
        />
      </div>

      {/* Closing — Antic */}
      <div className="text-center mt-6">
        <ScrambleText
          text={CLOSING_TEXT}
          charset="alphanumeric"
          scrambleDuration={1000}
          staggerPerChar={8}
          autoStart
          startDelay={5500}
          scrambleRef={closingScrambleRef}
          className="font-(family-name:--font-antic) text-sm sm:text-base md:text-lg text-[#1A1A2E] leading-relaxed"
        />
      </div>

      {/* Replay Button */}
      <div className="w-full flex justify-end mt-8 sm:mt-12">
        <button
          onClick={handleReplay}
          title="Replay animation"
          className="p-3 rounded-full bg-black/5 hover:bg-black/10 text-black/40 hover:text-black/60 transition-all focus:outline-hidden cursor-pointer"
        >
          <svg className="w-4 h-4" stroke="currentColor" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </section>
  );
}
