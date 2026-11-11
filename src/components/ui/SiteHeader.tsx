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
    <header className="header-scrim pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-4 px-4 pt-4 pb-10 md:px-10 md:pt-7 md:pb-14 xl:grid xl:grid-cols-[1fr_auto_1fr]">
      <Link href="/" className="pointer-events-auto font-serif text-[1.15rem] leading-none text-text md:text-[1.3rem]">
        {profile.name}
      </Link>
      <div className="pointer-events-auto hidden xl:block">
        <SectionNav />
      </div>
      <div className="pointer-events-auto flex items-center gap-3 justify-self-end md:gap-4">
        <TerminalButton />
        <div className="hidden md:block">
          <ModeToggle />
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
