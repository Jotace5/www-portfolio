import { useState, useEffect, useRef, useCallback } from 'react';
import { CHARSETS, CharsetKey } from '@/lib/scrambleCharsets';

export interface UseTextScrambleConfig {
  text: string;
  charset: CharsetKey;
  scrambleDuration: number;
  staggerPerChar: number;
  autoStart: boolean;
  startDelay?: number;
  continuousJitter?: boolean;
  jitterRate?: number;
}

export interface ScrambleChar {
  char: string;
  progress: number;
}

export function useTextScramble({
  text,
  charset,
  scrambleDuration,
  staggerPerChar,
  autoStart,
  startDelay = 0,
  continuousJitter = false,
  jitterRate = 0,
}: UseTextScrambleConfig) {
  const getRandomChar = useCallback(() => {
    const chars = CHARSETS[charset];
    return chars[Math.floor(Math.random() * chars.length)];
  }, [charset]);

  const [displayChars, setDisplayChars] = useState<ScrambleChar[]>(() => {
    const charsetChars = CHARSETS[charset];
    return text.split('').map((char, i) => {
      if (char === ' ') return { char: ' ', progress: 1 };
      return { char: charsetChars[i % charsetChars.length], progress: 0 };
    });
  });
  
  const [isScrambling, setIsScrambling] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  
  const requestRef = useRef<number | null>(null);
  const isScramblingRef = useRef(false);
  
  const scramble = useCallback((delayMs: number = 0) => {
    if (isScramblingRef.current) return;
    
    setIsScrambling(true);
    isScramblingRef.current = true;
    setIsResolved(false);
    
    const charsArray = text.split('');
    const totalDuration = charsArray.length * staggerPerChar + scrambleDuration;
    let startTime: number | null = null;
    
    const animate = (time: number) => {
      if (startTime === null) {
        startTime = time + delayMs;
      }
      const elapsed = time - startTime;
      let allResolved = true;
      
      const nextChars = charsArray.map((originalChar, i) => {
        if (originalChar === ' ') {
          return { char: ' ', progress: 1 };
        }
        
        const charStartTime = staggerPerChar * i;
        const charEndTime = charStartTime + scrambleDuration;
        
        if (elapsed >= charEndTime) {
          return { char: originalChar, progress: 1 };
        }
        
        allResolved = false;
        
        if (elapsed >= charStartTime) {
          return { char: getRandomChar(), progress: (elapsed - charStartTime) / scrambleDuration };
        }
        
        return { char: getRandomChar(), progress: 0 };
      });
      
      setDisplayChars(nextChars);
      
      if (!allResolved && elapsed < totalDuration) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        // Just in case time anomalies, force exact final resolution
        setDisplayChars(charsArray.map(char => ({ char, progress: 1 })));
        setIsScrambling(false);
        isScramblingRef.current = false;
        setIsResolved(true);
      }
    };
    
    requestRef.current = requestAnimationFrame(animate);
  }, [text, scrambleDuration, staggerPerChar, getRandomChar]);

  useEffect(() => {
    if (autoStart) {
      scramble(startDelay || 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (continuousJitter && isResolved) {
      const intervalId = setInterval(() => {
        setDisplayChars(prev => 
          prev.map((item, i) => {
            if (text[i] === ' ') return item;
            
            if (Math.random() < (jitterRate || 0)) {
              return { 
                char: getRandomChar(), 
                progress: 0.4 + Math.random() * 0.3 
              };
            }
            return { char: text[i], progress: 1 };
          })
        );
      }, 100);
      
      return () => clearInterval(intervalId);
    }
  }, [continuousJitter, isResolved, text, jitterRate, getRandomChar]);

  useEffect(() => {
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      isScramblingRef.current = false;
    };
  }, []);

  return { displayChars, scramble, isScrambling, isResolved };
}
