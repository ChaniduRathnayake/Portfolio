import type { SimpleIcon } from "simple-icons";
import {
  siAxios,
  siBurpsuite,
  siCisco,
  siCloudinary,
  siCss,
  siDocker,
  siDotnet,
  siExpress,
  siFlask,
  siFramer,
  siGit,
  siGsap,
  siHashcat,
  siHtml5,
  siHuawei,
  siJavascript,
  siJsonwebtokens,
  siLinux,
  siLucide,
  siMetasploit,
  siMongodb,
  siMongoose,
  siNextdotjs,
  siNodedotjs,
  siNumpy,
  siOpenjdk,
  siOwasp,
  siPaloaltonetworks,
  siPandas,
  siPhp,
  siPython,
  siReact,
  siReactrouter,
  siResend,
  siScikitlearn,
  siSocketdotio,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVercel,
  siVite,
  siVitest,
  siWireshark,
} from "simple-icons";

/**
 * Technology names, typeset as a plain run of words. Where a tool has an
 * official mark in Simple Icons (CC0 path data) it sits before the name,
 * rendered server-side as inline SVG: no requests, no third-party origin,
 * tinted by CSS. Tools without one are just their name; we don't redraw other
 * companies' logos or invent stand-ins. Names match the strings in /content.
 */
const LOGOS: Record<string, SimpleIcon> = {
  "Palo Alto NGFW": siPaloaltonetworks,
  GlobalProtect: siPaloaltonetworks,
  "Prisma SASE": siPaloaltonetworks,
  Cisco: siCisco,
  Huawei: siHuawei,
  Linux: siLinux,
  "Burp Suite": siBurpsuite,
  "OWASP ZAP": siOwasp,
  Metasploit: siMetasploit,
  Hashcat: siHashcat,
  Wireshark: siWireshark,
  TypeScript: siTypescript,
  JavaScript: siJavascript,
  React: siReact,
  "React Router": siReactrouter,
  "Next.js": siNextdotjs,
  "Node.js": siNodedotjs,
  Express: siExpress,
  MongoDB: siMongodb,
  Mongoose: siMongoose,
  "Tailwind CSS": siTailwindcss,
  Vite: siVite,
  Vitest: siVitest,
  "Socket.IO": siSocketdotio,
  Axios: siAxios,
  Lucide: siLucide,
  "Framer Motion": siFramer,
  JWT: siJsonwebtokens,
  Cloudinary: siCloudinary,
  Supabase: siSupabase,
  Python: siPython,
  Flask: siFlask,
  "scikit-learn": siScikitlearn,
  pandas: siPandas,
  NumPy: siNumpy,
  "C#": siDotnet,
  ".NET": siDotnet,
  Java: siOpenjdk,
  PHP: siPhp,
  HTML: siHtml5,
  CSS: siCss,
  Docker: siDocker,
  Git: siGit,
  Vercel: siVercel,
  "three.js": siThreedotjs,
  "React Three Fiber": siThreedotjs,
  GSAP: siGsap,
  Resend: siResend,
};

/** A tool's name, with its mark in front when there is one. */
export function ToolName({ name }: { name: string }) {
  const icon = LOGOS[name];
  return (
    <>
      {icon && (
        <svg className="tool-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d={icon.path} />
        </svg>
      )}
      {name}
    </>
  );
}

/** A list of tools as a run of words, wrapping like a sentence. */
export function Tools({ names, label }: { names: readonly string[]; label: string }) {
  return (
    <ul className="tools" aria-label={label}>
      {names.map((name) => (
        <li key={name}>
          <ToolName name={name} />
        </li>
      ))}
    </ul>
  );
}
