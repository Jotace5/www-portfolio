'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 py-6 px-6 md:px-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-(family-name:--font-antic) text-[#1A1A2E]/60">
          &copy; {currentYear} Jotace
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-6 flex-wrap justify-center">
          <a
            href="mailto:juancastap@gmail.com"
            className="font-(family-name:--font-antic) text-[#1A1A2E] hover:text-[#4A90D9] transition-colors"
          >
            Email
          </a>
          <a
            href="https://github.com/Jotace5"
            target="_blank"
            rel="noopener noreferrer"
            className="font-(family-name:--font-antic) text-[#1A1A2E] hover:text-[#4A90D9] transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/juancastanop/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-(family-name:--font-antic) text-[#1A1A2E] hover:text-[#4A90D9] transition-colors"
          >
            LinkedIn
          </a>
          <button
            type="button"
            onClick={() => console.log('Contact modal trigger clicked — will open modal in feat/contact-form')}
            className="font-(family-name:--font-antic) text-[#1A1A2E] hover:text-[#4A90D9] transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            Send a message
          </button>
        </div>
      </div>
    </footer>
  );
}
