import Link from "next/link";
import { profile } from "@/content/profile";
import { SCENES } from "@/lib/scenes";
import { SOCIAL } from "./SocialLinks";

/** Site-wide footer: where to go next, how to reach me, and how the site is built. */
export function SiteFooter() {
  return (
    <footer className="site-footer relative z-10 px-4 pt-14 pb-10 md:px-10">
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-[24rem]">
          <p className="font-serif text-[1.6rem] leading-none text-text">{profile.name}</p>
          <p className="mt-3 text-[0.85rem] leading-relaxed text-muted">{profile.role}.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-14 gap-y-8 font-mono text-[0.7rem]">
          <div>
            <p className="text-muted">Sections</p>
            <ul className="mt-3 space-y-2">
              {SCENES.map((s) => (
                <li key={s.id}>
                  <a href={`/#${s.id}`} className="footer-link">
                    {s.nav}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-muted">Elsewhere</p>
            <ul className="mt-3 space-y-2">
              {SOCIAL.map(({ label, href, external }) => (
                <li key={label}>
                  <a href={href} className="footer-link" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-muted">This site</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/security" className="footer-link">
                  How it&apos;s hardened
                </Link>
              </li>
              <li>
                <a href="/.well-known/security.txt" className="footer-link">
                  security.txt
                </a>
              </li>
              <li className="text-muted">
                Press <kbd className="text-text">`</kbd> for a shell
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 font-mono text-[0.64rem] text-muted">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <a href="#main" className="footer-link">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
