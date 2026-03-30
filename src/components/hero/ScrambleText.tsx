 'use client';

import { useEffect } from 'react';
import { useTextScramble, UseTextScrambleConfig } from '@/hooks/useTextScramble';
import { CharsetKey } from '@/lib/scrambleCharsets';

interface ScrambleTextProps {
  text: string;
  charset: CharsetKey;
  className?: string;
  scrambleDuration: number;
  staggerPerChar: number;
  autoStart: boolean;
  startDelay?: number;
  continuousJitter?: boolean;
  jitterRate?: number;
  scrambleRef?: React.MutableRefObject<((delayMs?: number) => void) | null>;
}

export function ScrambleText({
  text,
  charset,
  className = '',
  scrambleDuration,
  staggerPerChar,
  autoStart,
  startDelay,
  continuousJitter,
  jitterRate,
  scrambleRef,
}: ScrambleTextProps) {
  const { displayChars, scramble, isResolved } = useTextScramble({
    text,
    charset,
    scrambleDuration,
    staggerPerChar,
    autoStart,
    startDelay,
    continuousJitter,
    jitterRate,
  });

  useEffect(() => {
    if (scrambleRef) {
      scrambleRef.current = scramble;
    }
  }, [scramble, scrambleRef]);

  // Split characters into word groups based on spaces in original text
  const words: { chars: { item: typeof displayChars[0]; index: number }[]; }[] = [];
  let currentWord: { item: typeof displayChars[0]; index: number }[] = [];

  displayChars.forEach((item, i) => {
    if (text[i] === ' ') {
      if (currentWord.length > 0) {
        words.push({ chars: currentWord });
        currentWord = [];
      }
      words.push({ chars: [{ item, index: i }] }); // space as its own "word"
    } else {
      currentWord.push({ item, index: i });
    }
  });
  if (currentWord.length > 0) {
    words.push({ chars: currentWord });
  }

  return (
    <span className={className} style={{ display: 'inline' }}>
      {words.map((word, wIdx) => {
        // If it's a space
        if (word.chars.length === 1 && text[word.chars[0].index] === ' ') {
          return <span key={`s-${wIdx}`}> </span>;
        }
        
        // Word group — nowrap keeps the word together
        return (
          <span key={`w-${wIdx}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {word.chars.map(({ item, index }) => {
              const isScrambling = item.progress < 1;
              const effectColor = isScrambling ? 'black' : 'inherit';
              const effectFontFamily = isScrambling ? 'var(--font-doto)' : 'inherit';

              return (
                <span 
                  key={index} 
                  style={{ 
                    display: 'inline-block', 
                    position: 'relative', 
                    textAlign: 'center' 
                  }}
                >
                  {/* Ghost original character for taking up layout space */}
                  <span style={{ visibility: 'hidden' }}>{text[index]}</span>
                  
                  {/* Superimposed Animated Character */}
                  <span 
                    style={{ 
                      position: 'absolute', 
                      left: 0, 
                      right: 0,
                      color: effectColor,
                      fontFamily: effectFontFamily,
                    }}
                  >
                    {item.char}
                  </span>
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
