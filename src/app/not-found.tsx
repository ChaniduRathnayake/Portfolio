import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

/** 404, in the site's own voice. */
export default function NotFound() {
  return (
    <main id="main" className="px-4 pt-28 pb-24 md:px-10 md:pt-36">
      <div className="max-w-[40rem] md:ml-[8vw]">
        <p className="font-mono text-[0.72rem] text-accent">cat: no such file or directory</p>
        <h1 className="mt-4 font-serif text-[2.4rem] leading-none text-text md:text-[3.4rem]">That page isn&apos;t here.</h1>
        <p className="mt-6 text-[0.95rem] leading-relaxed text-muted">
          The link may be old, or mistyped. Nothing is hidden at this address, including flags.
        </p>
        <div className="mt-10">
          <Link href="/" className="ui-link">
            <span aria-hidden="true">←</span> Back to the site
          </Link>
        </div>
      </div>
    </main>
  );
}
