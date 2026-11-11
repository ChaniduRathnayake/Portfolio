/**
 * Everything the site says about me lives here (projects are in ./projects.ts).
 * The HTML sections, the terminal and the CRT screen all read from this file.
 *
 * Values in [SQUARE BRACKETS] are placeholders that still need real info.
 * Never put ID numbers, birth dates, home addresses, phone numbers or
 * references' contact details here: this file ships to every visitor.
 */
import { projectTechnologies } from "./projects";

export const profile = {
  name: "Chanidu Rathnayake",
  handle: "chanidu",
  identity: "I build secure networks. Then I try to break them.",
  role: "Network security engineer and self-taught web developer",
  location: "Sri Lanka",
  remote: "[OPEN TO REMOTE? yes / no]",
  links: {
    github: "https://github.com/ChaniduRathnayake",
    linkedin: "https://www.linkedin.com/in/chanidu-rathnayake-5bb588200",
    email: "chanidu.banula@gmail.com",
    /** Public copy of the CV, without personal ID data. Put it in /public and set the path. */
    resume: "",
  },
  /** Short, true lines for `cat about.txt`. */
  about: [
    "Network security engineer at Cryptogen (managed services) and a final-year",
    "cyber security student at SLIIT. Day to day: Palo Alto and Check Point",
    "firewalls, IPsec, switching, Forescout NAC and Prisma SASE for clients.",
    "I taught myself web development and use it to build security tools,",
    "then test them the way an attacker would: a SIEM/IDS for hospital",
    "networks, a Windows per-app firewall, small CTF challenges.",
  ],
} as const;

/**
 * The site has two sides. BUILD shows the defensive, building work; BREAK
 * shows the offensive work. Same person, same facts, split by which side of
 * the wire they sit on. Sections read their headings and intros from here.
 */
export const modeCopy = {
  build: {
    hero: "Network security engineer at Cryptogen. I configure and run Palo Alto and Check Point firewalls, Forescout NAC and Prisma SASE for managed-services clients. On my own time I write security tools: a SIEM for hospital networks, a per-app firewall for Windows.",
    cta: "See what I build",
    stackTitle: "What I build and defend with.",
    stackIntro:
      "Most of my week is enterprise network security for managed-services clients. The rest goes on web development, which I taught myself. Laid out like a port scan, and the ports are the real ones.",
    workTitle: "Things I've built.",
    workIntro: "Security tools first, then the web work. Every one of these has its source on GitHub.",
    securityTitle: "How I defend.",
    contact: "Need a network locked down, a firewall migrated, or a second pair of eyes on a design? Send a message, or reach me directly. I read everything that comes in.",
  },
  break: {
    hero: "The other half of the job. I hunt bugs in web apps, work through TryHackMe rooms and write CTF challenges of my own. This site is a target too: four flags are hidden around it, and there's a box to root in the terminal.",
    cta: "See what I break",
    stackTitle: "What I attack with.",
    stackIntro:
      "The offensive kit, from the first scan to the cracked hash. Used on bug bounty targets, in labs and CTFs, and for vulnerability assessments at work.",
    workTitle: "Things built to be broken.",
    workIntro: "Challenges I wrote so other people could practise an attack, and one cipher I rebuilt to see where it gives.",
    securityTitle: "How I break things.",
    contact: "Want something tested before someone less friendly tests it? Send a message, or reach me directly. I read everything that comes in.",
  },
} as const;

/** Jobs only, newest first. Projects live in projects.ts, study in `education`. */
export const experience: {
  period: string;
  role: string;
  company: string;
  team?: string;
  highlights: { area: string; text: string }[];
}[] = [
  {
    period: "2026 – present",
    role: "Junior Engineer",
    company: "Cryptogen",
    team: "Managed Services",
    highlights: [
      {
        area: "Firewalls",
        text: "Palo Alto and Check Point configuration, upgrades and management. IPsec and NAT, AD-integrated user-based rules, internal and perimeter policy.",
      },
      { area: "Remote access", text: "GlobalProtect troubleshooting, including HIP and connectivity issues." },
      { area: "Migrations", text: "Head-office and DR data-centre migrations." },
      {
        area: "Switching and Wi-Fi",
        text: "Cisco, Huawei and HPE switches: initial configs, VLANs, RADIUS integration. Aruba access points.",
      },
      { area: "NAC", text: "Forescout policies, reports, automation and device integrations." },
      { area: "SASE", text: "Prisma SASE proofs of concept, initial configuration, user onboarding, service connections and rules." },
    ],
  },
  {
    period: "2025 – 2026",
    role: "Junior Associate Engineer, internship",
    company: "Cryptogen",
    highlights: [
      { area: "EDR", text: "CrowdStrike endpoint detection and response." },
      { area: "Data protection", text: "Classification and DLP with Forcepoint, Boldon James and Titus." },
      { area: "Hardening", text: "Windows Server hardening, Linux compliance, Windows and Linux vulnerability assessments." },
    ],
  },
];

export const education: { period: string; title: string; place: string; detail: string[] }[] = [
  {
    period: "2022 – present",
    title: "BSc (Hons) Information Technology, specialising in Cyber Security",
    place: "SLIIT",
    detail: [
      "Dean's List, year 4 semester 1 (GPA 3.6).",
      "Final-year research: MediSIEM.",
      "Member of the IEEE Student Branch at SLIIT.",
    ],
  },
  {
    period: "2026 – present",
    title: "Network Security: NetSec Professional",
    place: "in progress",
    detail: [],
  },
  {
    period: "2018 – 2019",
    title: "Certificate in Software Engineering",
    place: "NIBM",
    detail: [],
  },
];

export interface SkillGroup {
  /** Shown as "port/proto service", nmap style. Ports match the real service where one exists. */
  port: number;
  proto: "tcp" | "udp";
  service: string;
  /** Human heading for the Stack section. */
  title: string;
  items: string[];
  /** What I actually do with it, from day-to-day work. */
  detail: string;
  /** "netsec" and "build" show on the BUILD side of the site, "break" on the BREAK side. */
  track: "netsec" | "break" | "build";
}

/** The Skills section and `nmap skills`. Ordered by how much of my week they take. */
export const skills: SkillGroup[] = [
  {
    port: 500,
    proto: "udp",
    service: "isakmp",
    title: "Firewalls and VPN",
    items: ["Palo Alto NGFW", "Check Point", "GlobalProtect", "IPsec", "NAT"],
    detail:
      "Configuration, upgrades and day-to-day management of perimeter and internal firewalls. Site-to-site IPsec and NAT, AD-integrated user-based rules, GlobalProtect and HIP troubleshooting, HO/DR data-centre migrations.",
    track: "netsec",
  },
  {
    port: 1812,
    proto: "udp",
    service: "radius",
    title: "Switching, wireless and NAC",
    items: ["Cisco", "Huawei", "HPE", "Aruba", "VLANs", "RADIUS", "Forescout NAC"],
    detail:
      "Initial configs and troubleshooting on Cisco, Huawei and HPE switches, VLAN design, RADIUS integration, Aruba access points. Forescout NAC policies, automation, reporting and device integrations.",
    track: "netsec",
  },
  {
    port: 443,
    proto: "tcp",
    service: "sase",
    title: "SASE",
    items: ["Prisma SASE"],
    detail: "Proofs of concept, initial configuration, user onboarding, service connections, rule creation and troubleshooting.",
    track: "netsec",
  },
  {
    port: 1514,
    proto: "tcp",
    service: "detection",
    title: "Endpoint, data and detection",
    items: ["CrowdStrike EDR", "Forcepoint DLP", "Boldon James", "Titus", "Wazuh SIEM"],
    detail:
      "EDR operations, data classification and DLP policy, and a Wazuh-based SIEM/IDS built for my final-year research.",
    track: "netsec",
  },
  {
    port: 22,
    proto: "tcp",
    service: "ssh",
    title: "Hardening and compliance",
    items: ["Windows Server", "Linux", "Vulnerability assessment"],
    detail: "Windows Server hardening, Linux compliance checks, and Windows and Linux vulnerability assessments.",
    track: "netsec",
  },
  {
    port: 8080,
    proto: "tcp",
    service: "http-proxy",
    title: "Web app testing",
    items: ["Burp Suite", "OWASP ZAP", "Acunetix", "Nikto"],
    detail: "Bug bounty style testing of web apps, by hand through a proxy and with scanners for the first pass.",
    track: "break",
  },
  {
    port: 80,
    proto: "tcp",
    service: "http",
    title: "What I look for",
    items: ["SQL injection", "XSS", "CSRF", "Broken authentication", "Path traversal"],
    detail: "The bug classes I test for. The last one I built a five-stage CTF around.",
    track: "break",
  },
  {
    port: 8834,
    proto: "tcp",
    service: "nessus",
    title: "Recon and vulnerability scanning",
    items: ["Nmap", "Nessus", "Shodan", "Wireshark"],
    detail: "Host and service discovery, vulnerability scans and packet capture. Windows and Linux vulnerability assessments at Cryptogen, the rest in labs and CTFs.",
    track: "break",
  },
  {
    port: 4444,
    proto: "tcp",
    service: "exploit",
    title: "Exploitation and password attacks",
    items: ["Metasploit", "Hydra", "Hashcat", "John the Ripper", "Aircrack-ng"],
    detail: "Exploitation, online and offline password attacks and Wi-Fi auditing, in labs, CTFs and TryHackMe.",
    track: "break",
  },
  {
    port: 3000,
    proto: "tcp",
    service: "http-dev",
    title: "Web development, self-taught",
    items: ["TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Express", "MongoDB", "Tailwind CSS", "Vite", "Socket.IO"],
    detail:
      "Learned on my own time, shipped on real projects: the MediSIEM SOC dashboard and its public site, SecureAware, and this portfolio.",
    track: "build",
  },
  {
    port: 5001,
    proto: "tcp",
    service: "tooling",
    title: "Languages and tooling",
    items: ["Python", "C#", "Java", "PHP", "Flask", "Docker", "Git", "Linux", "PowerShell"],
    detail: "A Windows network tool in C#/WPF, ML services in Python and Flask, Docker for the SIEM stack, PowerShell for the boring parts.",
    track: "build",
  },
];

/**
 * The skill groups above plus one built from every project's stack, so any
 * library or tool I've shipped with shows up as a skill without listing it twice.
 */
export const allSkills: SkillGroup[] = (() => {
  const listed = new Set(skills.flatMap((s) => s.items));
  const extra = projectTechnologies().filter((t) => !listed.has(t));
  return [
    ...skills,
    {
      port: 8000,
      proto: "tcp",
      service: "http-alt",
      title: "Also in my projects",
      items: extra,
      detail: "Every other library, framework and tool from the projects below, taken from their dependency files.",
      track: "build",
    },
  ];
})();

export interface Certification {
  issuer: string;
  name: string;
  /** Which side of the site it belongs to. */
  track: "defend" | "attack";
}

const certifications: Certification[] = [
  { issuer: "Cisco", name: "Network Essentials / Introduction to Networking", track: "defend" },
  { issuer: "Forcepoint", name: "DLP Administrator", track: "defend" },
  { issuer: "EC-Council", name: "Application Security, The Complete Guide", track: "defend" },
  { issuer: "EC-Council", name: "Practical Spring Security", track: "defend" },
  { issuer: "EC-Council", name: "PowerShell Scripting Essentials", track: "defend" },
  { issuer: "EC-Council", name: "Cybersecurity for Supply Chain Management", track: "defend" },
  { issuer: "EC-Council", name: "AWS Pentesting", track: "attack" },
  { issuer: "EC-Council", name: "Hands-on JavaScript for Ethical Hacking", track: "attack" },
  { issuer: "EC-Council", name: "Hands-on Penetration Testing with BlackArch Linux", track: "attack" },
];

/** Security record for the Security section and the terminal. */
export const security = {
  /** BUILD side: defensive work, from the roles above. */
  defence: [
    "Firewall policy for clients: AD-integrated user-based rules, perimeter and internal, on Palo Alto and Check Point.",
    "Windows Server hardening and Linux compliance checks.",
    "Data classification and DLP with Forcepoint, Boldon James and Titus.",
    "This site is the worked example. The list beside this is what your browser was just sent.",
  ],
  /** BREAK side: offensive practice. */
  practice: [
    "Bug bounty hunting on web apps: SQL injection, XSS, CSRF, broken authentication.",
    "TryHackMe Advent of Cyber: pentesting, forensics and crypto tasks.",
    "Windows and Linux vulnerability assessments at Cryptogen.",
  ],
  certifications,
  writeups: [] as { title: string; href: string }[],
};
