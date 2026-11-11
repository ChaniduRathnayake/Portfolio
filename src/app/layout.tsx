import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Archivo, Instrument_Serif, Martian_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { Terminal } from "@/components/terminal/Terminal";
import { profile } from "@/content/profile";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const martianMono = Martian_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-martian-mono",
  display: "swap",
});

const archivo = Archivo({
  axes: ["wdth"],
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${profile.name} — Build / Break`, template: `%s — ${profile.name}` },
  description: `${profile.role}. ${profile.identity}`,
};

export const viewport: Viewport = {
  themeColor: "#06110b",
  colorScheme: "dark",
  // The on-screen keyboard shrinks the layout, so the terminal's prompt stays in view.
  interactiveWidget: "resizes-content",
};

/**
 * Runs before first paint (nonce'd, so CSP allows it): restores the saved
 * mode and palette and skips the boot screen on repeat visits, so nothing
 * flashes. Keys match STORAGE_KEYS in src/lib/store.ts.
 */
const PREPAINT = `(function(){try{var d=document.documentElement,m=localStorage.getItem("bb:mode"),p=localStorage.getItem("bb:palette");if(m==="build"||m==="break")d.dataset.mode=m;if(p==="phosphor"||p==="amber"||p==="thermal")d.dataset.palette=p;if(sessionStorage.getItem("bb:booted"))d.dataset.booted="";}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      data-mode="build"
      data-palette="phosphor"
      className={`${instrumentSerif.variable} ${martianMono.variable} ${archivo.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PREPAINT }} suppressHydrationWarning />
      </head>
      <body className="font-sans">
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: "<!-- flag 1/4: FLAG{d0m_c0mm3nt_r3c0n_01}  ·  reading source is half the job. submit it in the terminal (press `). -->",
          }}
        />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppProviders>
          <SiteHeader />
          {children}
          <SiteFooter />
          <Terminal />
        </AppProviders>
      </body>
    </html>
  );
}
