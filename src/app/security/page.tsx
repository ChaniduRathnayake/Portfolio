import type { Metadata } from "next";
import Link from "next/link";
import { SECURITY_HEADERS } from "@/lib/security/headers";

export const metadata: Metadata = {
  title: "Security",
  description: "How this site is hardened: nonce-based CSP, HSTS, no third-party scripts, and how to report a bug.",
};

const CHOICES = [
  "No analytics, trackers, ad scripts or cookies. Preferences (mode, palette, CTF progress) stay in your browser's localStorage.",
  "Fonts are self-hosted at build time. Nothing loads from a third-party CDN.",
  "The X-Powered-By header is off. Framework versions aren't advertised.",
  "The CTF checks flags against SHA-256 hashes. The box in the terminal is a game that runs in your browser, so its files do ship in the JavaScript, lightly scrambled. Reading the bundle is a fair way to solve it.",
];

export default function SecurityPage() {
  return (
    <main id="main" className="px-4 pt-28 pb-24 md:px-10 md:pt-36">
      <div className="max-w-[46rem] md:ml-[8vw]">
        <h1 className="font-serif text-[2.4rem] leading-none text-text md:text-[3.4rem]">
          A hardened site, as proof.
        </h1>
        <p className="mt-6 text-[0.95rem] leading-relaxed text-muted">
          If I test other people&apos;s apps, mine should hold up. These are the response headers every page
          sends, and why. Check them yourself: open the terminal and run{" "}
          <code className="font-mono text-[0.8rem] text-text">curl -I /</code>.
        </p>

        <section aria-labelledby="headers-title" className="mt-16">
          <h2 id="headers-title" className="font-serif text-[1.8rem] text-text">
            Response headers
          </h2>
          <dl className="mt-6 border-t border-line">
            {SECURITY_HEADERS.map((c) => (
              <div key={c.header} className="border-b border-line py-6 md:grid md:grid-cols-[13rem_1fr] md:gap-8">
                <dt className="font-mono text-[0.72rem] text-accent">{c.header}</dt>
                <dd className="mt-3 md:mt-0">
                  <pre className="overflow-x-auto font-mono text-[0.7rem] leading-relaxed whitespace-pre-wrap text-text">
                    {c.value}
                  </pre>
                  <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">{c.why}</p>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="choices-title" className="mt-16">
          <h2 id="choices-title" className="font-serif text-[1.8rem] text-text">
            What it doesn&apos;t do
          </h2>
          <ul className="mt-6 space-y-3 text-[0.95rem] leading-relaxed text-text">
            {CHOICES.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="report-title" className="mt-16">
          <h2 id="report-title" className="font-serif text-[1.8rem] text-text">
            Found something?
          </h2>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">
            Contact details for reporting are in{" "}
            <a href="/.well-known/security.txt" className="ui-link">
              /.well-known/security.txt
            </a>
            . And if you&apos;re poking around anyway: there are eight flags on this site. Four are hidden in the page,
            four are in the terminal. Press <kbd className="font-mono text-[0.8rem] text-text">`</kbd> and type{" "}
            <code className="font-mono text-[0.8rem] text-text">ctf</code>.
          </p>
          <div className="mt-10">
            <Link href="/" className="ui-link">
              <span aria-hidden="true">←</span> Back to the site
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
