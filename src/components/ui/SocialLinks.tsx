import { siGithub } from "simple-icons";
import { profile } from "@/content/profile";

/** GitHub, LinkedIn and email. Marks are server-rendered inline SVG, no requests. */

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={siGithub.path} />
    </svg>
  );
}

/** Plain "in" monogram: Simple Icons doesn't ship LinkedIn's mark, and we don't redraw it. */
function LinkedinMark() {
  return (
    <span className="social-mono" aria-hidden="true">
      in
    </span>
  );
}

function MailMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="social-stroke">
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 6l9 7 9-7" />
    </svg>
  );
}

export const SOCIAL = [
  { label: "GitHub", detail: "ChaniduRathnayake", href: profile.links.github, Mark: GithubMark, external: true },
  { label: "LinkedIn", detail: "chanidu-rathnayake", href: profile.links.linkedin, Mark: LinkedinMark, external: true },
  { label: "Email", detail: profile.links.email, href: `mailto:${profile.links.email}`, Mark: MailMark, external: false },
];

/** Plain text links (hero). */
export function SocialText() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Elsewhere">
      {SOCIAL.map(({ label, href, external }) => (
        <li key={label}>
          <a href={href} className="ui-link" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {label}
            {external && <span aria-hidden="true">↗</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Full rows with the handle shown (contact section). */
export function SocialList() {
  return (
    <ul className="social-list" aria-label="Reach me directly">
      {SOCIAL.map(({ label, detail, href, Mark, external }) => (
        <li key={label}>
          <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            <span className="social-mark">
              <Mark />
            </span>
            <span>
              <span className="block font-mono text-[0.66rem] text-muted">{label}</span>
              <span className="block text-[0.95rem] text-text">{detail}</span>
            </span>
            <span aria-hidden="true" className="ml-auto text-muted">
              {external ? "↗" : "→"}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
