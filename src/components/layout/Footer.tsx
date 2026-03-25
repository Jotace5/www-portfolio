const socialLinks = [
  {
    href: "https://github.com/Jotace5",
    label: "GitHub",
  },
  {
    href: "https://linkedin.com/in/juancastanop",
    label: "LinkedIn",
  },
  {
    href: "mailto:juancastap@gmail.com",
    label: "Email",
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 py-6 px-6 md:px-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-(family-name:--font-antic) text-[#1A1A2E]/60">
          &copy; {currentYear} Jotace
        </p>
        <div className="flex items-center gap-6">
          {socialLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-(family-name:--font-antic) text-sm text-[#1A1A2E]/60 hover:text-[#4A90D9] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
