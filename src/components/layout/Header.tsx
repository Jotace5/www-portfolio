import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#projects", label: "Projects" },
  { href: "/#blog", label: "Blog" },
  { href: "/#about", label: "About" },
];

export function Header() {
  return (
    <header className="pt-6 pb-0 px-6 md:px-12">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="font-(family-name:--font-doto)] text-black hover:text-[#4A90D9] transition-colors"
        >
         JC+
        </Link>
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-(family-name:--font-antic)] text-sm text-[#1A1A2E] hover:text-[#4A90D9] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
