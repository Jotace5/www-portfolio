'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { ContactModal } from '../contact/ContactModal';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenContact={() => setIsContactOpen(true)} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 md:px-12 py-12">
        {children}
      </main>
      <Footer onOpenContact={() => setIsContactOpen(true)} />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}
