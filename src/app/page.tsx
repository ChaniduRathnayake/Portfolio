import { existsSync } from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { BootSequence } from "@/components/home/BootSequence";
import { CrtHotspot } from "@/components/home/CrtHotspot";
import { CtfInvite } from "@/components/home/CtfInvite";
import { HeroHeadline, ModeLink, TerminalLaunch } from "@/components/home/ModeControls";
import { SceneTimeline } from "@/components/home/SceneTimeline";
import { StageLoader } from "@/components/home/StageLoader";
import { DesLab } from "@/components/labs/DesLab";
import { PolicyTest } from "@/components/labs/PolicyTest";
import { Recon } from "@/components/labs/Recon";
import { TraversalLab } from "@/components/labs/TraversalLab";
import { ByMode } from "@/components/ui/ByMode";
import { CspImage } from "@/components/ui/CspImage";
import { InView } from "@/components/ui/InView";
import { ProjectDiagram } from "@/components/ui/ProjectDiagram";
import { ShotViewer } from "@/components/ui/ShotViewer";
import { SocialList, SocialText } from "@/components/ui/SocialLinks";
import { ToolName, Tools } from "@/components/ui/TechLogo";
import { allSkills, education, experience, modeCopy, profile, security, type Certification, type SkillGroup } from "@/content/profile";
import { projectsFor, type Project } from "@/content/projects";
import { SECURITY_HEADERS } from "@/lib/security/headers";

/** Same file the CRT screen dithers. Optional: the figure only renders once the file exists. */
const PORTRAIT_SRC = "/images/portrait.jpg";

/** "I build … . Then I … ." → the BUILD sentence and the BREAK sentence. */
const [identityBuild, identityBreak] = profile.identity.split(/(?<=\.)\s+/);

const inPublic = (src: string) => existsSync(path.join(process.cwd(), "public", src));

function ProjectMedia({ project }: { project: Project }) {
  const { media } = project;

  if (media.kind === "lab") {
    return media.lab === "des" ? <DesLab caption={media.caption} /> : <TraversalLab caption={media.caption} />;
  }

  if (media.kind === "diagram") {
    return (
      <figure className="project-media">
        <ProjectDiagram diagram={media.diagram} label={`${project.name}: ${media.caption}`} />
        <figcaption>{media.caption}</figcaption>
      </figure>
    );
  }

  // A screenshot that hasn't been added yet falls back to its icon.
  if (media.fallback && !inPublic(media.src)) {
    return (
      <figure className="project-media">
        <div className="project-icon">
          <CspImage src={media.fallback.src} alt={media.fallback.alt} width={128} height={128} />
        </div>
        <figcaption>{media.fallback.caption}</figcaption>
      </figure>
    );
  }

  const { src, alt, width, height, caption } = media;
  return (
    <figure className="project-media">
      <ShotViewer shots={[{ src, alt, width, height, caption }, ...(media.gallery?.filter((shot) => inPublic(shot.src)) ?? [])]} />
    </figure>
  );
}

/** One side's projects: alternating rows, media on one side and copy on the other. */
function ProjectList({ mode }: { mode: "build" | "break" }) {
  return (
    <ol className="space-y-14 md:space-y-20">
      {projectsFor(mode).map((project, i) => (
        <li key={project.slug} className={`project ${i % 2 ? "is-flipped" : ""}`}>
          <ProjectMedia project={project} />
          <div className="pane">
            <h3 className="!text-[1.9rem]">{project.name}</h3>
            <p className="meta mt-1.5">{project.year}</p>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-text">{project.line}</p>
            <p className="built-with mt-5">
              <span>Built with</span> {project.stack.join(", ")}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {project.slug === "this-site" && mode === "break" && (
                <TerminalLaunch command="ctf" className="ui-link">
                  Root the box <span aria-hidden="true">→</span>
                </TerminalLaunch>
              )}
              {project.links.map((link) =>
                link.href.startsWith("/") ? (
                  <Link key={link.href} href={link.href} className="ui-link">
                    {link.label} <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <a key={link.href} href={link.href} className="ui-link" target="_blank" rel="noopener noreferrer">
                    {link.label} <span aria-hidden="true">↗</span>
                  </a>
                ),
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Skill groups laid out like a port scan: port and service, what it is, the tools. */
function Scan({ groups }: { groups: SkillGroup[] }) {
  return (
    <ol className="scan">
      {groups.map((group) => (
        <li key={group.service}>
          <p className="scan-port">
            <span>
              {group.port}/{group.proto}
            </span>
            {group.service}
          </p>
          <div>
            <h3>{group.title}</h3>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">{group.detail}</p>
          </div>
          <Tools names={group.items} label={group.title} />
        </li>
      ))}
    </ol>
  );
}

/** Certifications of one track, grouped under their issuer. */
function Certifications({ track }: { track: Certification["track"] }) {
  const certs = security.certifications.filter((c) => c.track === track);
  const issuers = [...new Set(certs.map((c) => c.issuer))];
  return (
    <dl className="certs">
      {issuers.map((issuer) => (
        <div key={issuer}>
          <dt>
            <ToolName name={issuer} />
          </dt>
          {certs
            .filter((c) => c.issuer === issuer)
            .map((c) => (
              <dd key={c.name}>{c.name}</dd>
            ))}
        </div>
      ))}
    </dl>
  );
}

/**
 * One continuous scroll. Each <section data-scene> is a scene boundary for the
 * camera (see SceneTimeline), in the order of SCENES in src/lib/scenes.ts.
 * All copy is real HTML; the 3D layer behind it is decoration.
 *
 * The site has two sides, BUILD and BREAK. Anything that differs between them
 * is rendered for both and switched in CSS (see ByMode).
 */
export default async function HomePage() {
  const hasPortrait = inPublic(PORTRAIT_SRC);
  // The contact form's optional Turnstile script needs the request's CSP nonce.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const [currentJob] = experience;
  const [degree] = education;
  const attackCerts = security.certifications.filter((c) => c.track === "attack").length;
  const defendCerts = security.certifications.length - attackCerts;

  return (
    <>
      <BootSequence />
      <StageLoader />
      <SceneTimeline />

      <main id="main" className="relative z-10">
        {/* 01. The CRT room */}
        <section id="top" data-scene aria-labelledby="hero-title" className="relative h-[200svh]">
          <div className="sticky top-0 flex h-svh flex-col justify-end px-4 pb-8 md:px-10 md:pb-12">
            <CrtHotspot />
            <div data-hero-copy className="relative max-w-[40rem]">
              <p className="max-w-none font-mono text-[0.7rem] leading-relaxed text-muted">
                {profile.name} · Network security engineer, {currentJob.company} · {profile.location}
              </p>
              <HeroHeadline build={identityBuild} brk={identityBreak} />
              <ByMode
                as="p"
                className="mt-5 max-w-[50ch] text-[0.9rem] leading-relaxed text-muted md:text-[0.95rem]"
                build={modeCopy.build.hero}
                brk={modeCopy.break.hero}
              />
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 md:mt-7">
                <a href="#work" className="btn-primary">
                  <ByMode as="span" build={modeCopy.build.cta} brk={modeCopy.break.cta} />
                  <span aria-hidden="true">↓</span>
                </a>
                <span className="only-break">
                  <TerminalLaunch command="ctf" className="ui-button">
                    <span aria-hidden="true" className="text-muted">
                      &gt;_
                    </span>
                    Root the box
                  </TerminalLaunch>
                </span>
                <SocialText />
              </div>
              <p className="hero-sides">
                <ByMode
                  as="span"
                  build={
                    <>
                      This is the defensive side. <ModeLink to="break">Show me the offensive side</ModeLink>
                    </>
                  }
                  brk={
                    <>
                      This is the offensive side. <ModeLink to="build">Back to the defensive side</ModeLink>
                    </>
                  }
                />
              </p>
            </div>
            <p className="scroll-hint" aria-hidden="true">
              Scroll
            </p>
          </div>
        </section>

        {/* 02. Into the code: who I am and what I work with */}
        <section id="stack" data-scene aria-labelledby="stack-title" className="relative px-4 pt-[18svh] pb-[30svh] md:px-10">
          <div data-panel className="panel pane mx-auto max-w-[78rem]">
            <div className="about">
              {hasPortrait && (
                <figure className="portrait">
                  <CspImage
                    src={PORTRAIT_SRC}
                    alt={`${profile.name}, sitting at a table and looking to the side`}
                    width={560}
                    height={700}
                    sizes="(min-width: 768px) 17rem, 60vw"
                    className="aspect-[4/5] h-auto w-full object-cover"
                  />
                </figure>
              )}
              <div>
                <h2 id="stack-title">About me.</h2>
                <p className="mt-5 max-w-[60ch] text-[1rem] leading-relaxed text-text">{profile.about.join(" ")}</p>
                <dl className="facts mt-7">
                  <div>
                    <dt>Now</dt>
                    <dd>
                      {currentJob.role}
                      {currentJob.team ? `, ${currentJob.team}` : ""} at {currentJob.company}
                    </dd>
                  </div>
                  <div>
                    <dt>Studying</dt>
                    <dd>
                      {degree.title}, {degree.place}
                    </dd>
                  </div>
                  <div>
                    <dt>Based in</dt>
                    <dd>{profile.location}</dd>
                  </div>
                </dl>
                <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
                  <a href="#log" className="ui-link">
                    Experience <span aria-hidden="true">↓</span>
                  </a>
                  <a href="#contact" className="ui-link">
                    Get in touch <span aria-hidden="true">↓</span>
                  </a>
                  {profile.links.resume && (
                    <a href={profile.links.resume} className="ui-link">
                      Resume (PDF)
                    </a>
                  )}
                </div>
              </div>
            </div>

            <h2 className="mt-16 md:mt-20">
              <ByMode as="span" build={modeCopy.build.stackTitle} brk={modeCopy.break.stackTitle} />
            </h2>
            <ByMode
              as="p"
              className="mt-5 max-w-[62ch] text-[0.95rem] leading-relaxed text-muted"
              build={modeCopy.build.stackIntro}
              brk={modeCopy.break.stackIntro}
            />
            <div className="mt-9">
              <ByMode
                build={
                  <InView>
                    <Scan groups={allSkills.filter((g) => g.track !== "break")} />
                  </InView>
                }
                brk={
                  <InView>
                    <Scan groups={allSkills.filter((g) => g.track === "break")} />
                  </InView>
                }
              />
            </div>
          </div>
        </section>

        {/* 03. The network: projects */}
        <section id="work" data-scene aria-labelledby="work-title" className="relative px-4 pt-[16svh] pb-[30svh] md:px-10">
          <div data-panel className="panel mx-auto max-w-[78rem]">
            <div className="pane max-w-[36rem]">
              <h2 id="work-title">
                <ByMode as="span" build={modeCopy.build.workTitle} brk={modeCopy.break.workTitle} />
              </h2>
              <ByMode
                as="p"
                className="mt-5 text-[0.95rem] leading-relaxed text-muted"
                build={modeCopy.build.workIntro}
                brk={modeCopy.break.workIntro}
              />
            </div>
            <div className="mt-12">
              <ByMode build={<ProjectList mode="build" />} brk={<ProjectList mode="break" />} />
            </div>
            <p className="other-side mt-14">
              <ByMode
                as="span"
                build={
                  <>
                    The things I&apos;ve built to be attacked are on the other side.{" "}
                    <ModeLink to="break">See what I break</ModeLink>
                  </>
                }
                brk={
                  <>
                    The tools I&apos;ve built to stop this are on the other side.{" "}
                    <ModeLink to="build">See what I build</ModeLink>
                  </>
                }
              />
            </p>
          </div>
        </section>

        {/* 04. The breach: defence on one side, offence on the other */}
        <section id="breach" data-scene aria-labelledby="breach-title" className="relative px-4 pt-[18svh] pb-[30svh] md:px-10">
          <div
            data-panel
            className="panel mx-auto grid max-w-[78rem] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]"
          >
            <div className="pane">
              <h2 id="breach-title">
                <ByMode as="span" build={modeCopy.build.securityTitle} brk={modeCopy.break.securityTitle} />
              </h2>
              <ByMode
                build={
                  <>
                    <ul className="plain-list mt-7">
                      {security.defence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <h3 className="mt-12">Certifications</h3>
                    <Certifications track="defend" />
                    <p className="other-side mt-8">
                      {attackCerts} more on the offensive side. <ModeLink to="break">Show them</ModeLink>
                    </p>
                  </>
                }
                brk={
                  <>
                    <ul className="plain-list mt-7">
                      {security.practice.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <h3 className="mt-12">Certifications</h3>
                    <Certifications track="attack" />
                    <p className="other-side mt-8">
                      {defendCerts} more on the defensive side. <ModeLink to="build">Show them</ModeLink>
                    </p>
                  </>
                }
              />
            </div>

            <ByMode
              className="pane"
              build={
                <>
                  <h3>What this page was sent with.</h3>
                  <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
                    The response headers on the page you&apos;re reading. Check them yourself in the terminal with{" "}
                    <code className="font-mono text-[0.78rem] text-text">curl -I /</code>.
                  </p>
                  <ul className="header-check mt-6">
                    {SECURITY_HEADERS.map((h) => (
                      <li key={h.header}>
                        <code>{h.header}</code>
                        <span>{h.short}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/security" className="ui-link mt-7">
                    Each one explained <span aria-hidden="true">→</span>
                  </Link>
                </>
              }
              brk={<CtfInvite />}
            />

            {/* Full width underneath: something to do on each side. */}
            <ByMode className="pane lg:col-span-2" build={<PolicyTest />} brk={<Recon />} />
          </div>
        </section>

        {/* 05. The log: experience, then education */}
        <section id="log" data-scene aria-labelledby="log-title" className="relative px-4 pt-[18svh] pb-[30svh] md:px-10">
          <div
            data-panel
            className="panel mx-auto grid max-w-[78rem] items-start gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"
          >
            <div className="pane">
              <h2 id="log-title">Experience.</h2>
              <ol className="timeline mt-10">
                {experience.map((job) => (
                  <li key={job.role}>
                    <p className="meta">{job.period}</p>
                    <h3 className="mt-1.5 !text-[1.45rem]">{job.role}</h3>
                    <p className="mt-1 font-mono text-[0.72rem] text-accent">
                      {job.company}
                      {job.team ? ` · ${job.team}` : ""}
                    </p>
                    <dl className="mt-5 grid gap-x-6 gap-y-3 text-[0.9rem] leading-relaxed md:grid-cols-[9.5rem_1fr]">
                      {job.highlights.map((h) => (
                        <div key={h.area} className="contents">
                          <dt className="meta pt-[0.2rem]">{h.area}</dt>
                          <dd className="text-muted">{h.text}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pane">
              <h2 className="!text-[clamp(1.7rem,3vw,2.2rem)]">Education.</h2>
              <ol className="timeline mt-9">
                {education.map((ed) => (
                  <li key={ed.title}>
                    <p className="meta">{ed.period}</p>
                    <h3 className="mt-1.5 !text-[1.25rem]">{ed.title}</h3>
                    <p className="mt-1 font-mono text-[0.72rem] text-accent">{ed.place}</p>
                    {ed.detail.length > 0 && (
                      <ul className="mt-3 space-y-1 text-[0.9rem] leading-relaxed text-muted">
                        {ed.detail.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 06. Exit: contact */}
        <section id="contact" data-scene aria-labelledby="contact-title" className="relative min-h-[100svh] px-4 pt-[18svh] pb-20 md:px-10">
          <div
            data-panel
            className="panel mx-auto grid max-w-[78rem] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-10"
          >
            <div className="pane">
              <h2 id="contact-title">Get in touch.</h2>
              <ByMode
                as="p"
                className="mt-5 max-w-[48ch] text-[0.95rem] leading-relaxed text-muted"
                build={modeCopy.build.contact}
                brk={modeCopy.break.contact}
              />
              <div className="mt-8">
                <SocialList />
              </div>
            </div>
            <div className="pane">
              <h3>Send a message.</h3>
              <ContactForm nonce={nonce} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
