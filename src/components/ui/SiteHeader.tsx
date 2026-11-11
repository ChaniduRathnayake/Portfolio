import Link from "next/link";
import { profile } from "@/content/profile";
import { ModeToggle, SectionNav, TerminalButton } from "./HeaderControls";
import { MobileMenu } from "./MobileMenu";

/**
 * Name on the left, sections in the middle (wide screens), controls on the
 * right. Below 1280px the sections move into the menu; phones also move the
 * mode switch there.
 */
export function SiteHeader() {
  return (
    <header className="header-scrim pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-4 pt-4 pb-10 min-[360px]:gap-4 md:px-10 md:pt-7 md:pb-14 xl:grid xl:grid-cols-[1fr_auto_1fr]">
      <Link href="/" className="pointer-events-auto py-1 font-serif text-[1rem] leading-none text-text min-[360px]:text-[1.15rem] md:text-[1.3rem]">
        {profile.name}
      </Link>
      <div className="pointer-events-auto hidden xl:block">
        <SectionNav />
      </div>
      <div className="pointer-events-auto flex shrink-0 items-center gap-2 justify-self-end min-[360px]:gap-3 md:gap-4">
        <TerminalButton />
        <div className="hidden md:block">
          <ModeToggle />
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
