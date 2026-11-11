/**
 * Line diagrams for projects that have no screenshots. Each one shows what
 * the project actually does, drawn in the site's own tokens (see .diagram in
 * globals.css), so they read as part of the design instead of stock art.
 */

type Diagram = "feistel" | "traversal" | "scorm" | "nonce" | "chain";

function Box({ x, y, w, h, label, hot = false }: { x: number; y: number; w: number; h: number; label: string; hot?: boolean }) {
  return (
    <g className={hot ? "hot" : undefined}>
      <rect x={x} y={y} width={w} height={h} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

/** The values going through one DES round, in hex (see src/lib/des.ts). */
export interface RoundValues {
  n: number;
  key: string;
  leftIn: string;
  rightIn: string;
  f: string;
  leftOut: string;
  rightOut: string;
}

/**
 * DES: one Feistel round. L/R halves, F with the round subkey, XOR, swap.
 * With `round`, the boxes carry that round's real values instead of names.
 */
function Feistel({ round }: { round?: RoundValues }) {
  const before = round ? round.n - 1 : "i";
  const after = round ? round.n : "i+1";
  return (
    <>
      <Box x={40} y={18} w={120} h={30} label={round ? `L${before} ${round.leftIn}` : "L i"} />
      <Box x={200} y={18} w={120} h={30} label={round ? `R${before} ${round.rightIn}` : "R i"} />
      <Box x={150} y={86} w={60} h={28} label="F" hot />
      <text x={180} y={70} textAnchor="middle" className="note">
        {round ? `K${round.n} ${round.key}` : "K i (48-bit)"}
      </text>
      <path d="M180 76 V86" />
      {/* R feeds F, then crosses over to become L i+1. */}
      <path d="M260 48 V100 H210" />
      <path d="M260 100 V150 L100 196" />
      {/* L XOR F(R, K) becomes R i+1. */}
      <path d="M100 48 V90" />
      <path d="M150 100 H110" />
      <circle cx={100} cy={100} r={10} className="hot" />
      <path d="M100 92 V108 M92 100 H108" className="hot" />
      <path d="M100 110 V150 L260 196" className="hot" />
      {round && (
        <text x={180} y={134} textAnchor="middle" className="hot-text">
          F = {round.f}
        </text>
      )}
      <Box x={40} y={196} w={120} h={30} label={round ? `L${after} ${round.leftOut}` : "L i+1"} />
      <Box x={200} y={196} w={120} h={30} label={round ? `R${after} ${round.rightOut}` : "R i+1"} hot />
      <text x={330} y={140} textAnchor="end" className="note">
        {round ? `${round.n} of 16` : "× 16 rounds"}
      </text>
    </>
  );
}

/** The Feistel diagram on its own, for the DES lab to drive with live values. */
export function FeistelDiagram({ label, round }: { label: string; round: RoundValues }) {
  return (
    <svg className="diagram" viewBox="0 0 360 240" role="img" aria-label={label}>
      <Feistel round={round} />
    </svg>
  );
}

/** Path traversal: climbing out of the web root to a file that should be unreachable. */
function Traversal() {
  const tree: [number, number, string, boolean?][] = [
    [24, 30, "/"],
    [44, 56, "etc/"],
    [64, 82, "passwd", true],
    [44, 112, "var/"],
    [64, 138, "www/"],
    [84, 164, "html/"],
    [104, 190, "files/"],
  ];
  return (
    <>
      {tree.map(([x, y, label, hot]) => (
        <text key={label} x={x} y={y} className={hot ? "hot-text" : undefined}>
          {label}
        </text>
      ))}
      <text x={160} y={190} className="note">
        ← the app serves files from here
      </text>
      {/* The climb: four levels up, then down into /etc. */}
      <path d="M100 186 H92 V160 H72 V134 H52 V108 H30 V40" className="hot dashed" />
      <path d="M30 40 V52 H40" className="hot dashed" />
      <path d="M48 60 V78 H60" className="hot" />
      <text x={150} y={120} className="note">
        ../../../../etc/passwd
      </text>
      <text x={150} y={140} className="note">
        stages: plain, filtered, encoded,
      </text>
      <text x={150} y={156} className="note">
        hidden folder, final
      </text>
    </>
  );
}

/** SecureAware: how a SCORM package becomes a tracked course. */
function Scorm() {
  return (
    <>
      <Box x={14} y={24} w={96} h={34} label="course.zip" />
      <Box x={132} y={24} w={96} h={34} label="unzip" />
      <Box x={250} y={24} w={100} h={34} label="imsmanifest" hot />
      <path d="M110 41 H132 M228 41 H250" />
      <path d="M300 58 V92 H62 V110" />
      <Box x={14} y={110} w={96} h={34} label="Cloudinary" />
      <Box x={132} y={110} w={96} h={34} label="SCORM API" hot />
      <Box x={250} y={110} w={100} h={34} label="audit log" />
      <path d="M110 127 H132 M228 127 H250" />
      <text x={14} y={186} className="note">
        JWT + bcrypt · helmet · rate limits ·
      </text>
      <text x={14} y={204} className="note">
        express-validator · MongoDB
      </text>
    </>
  );
}

/** This site: one request, and what the per-request nonce lets through. */
function Nonce() {
  return (
    <>
      <Box x={14} y={22} w={84} h={32} label="GET /" />
      <Box x={132} y={22} w={96} h={32} label="proxy.ts" hot />
      <Box x={262} y={22} w={84} h={32} label="page" />
      <path d="M98 38 H132 M228 38 H262" />
      <text x={180} y={74} textAnchor="middle" className="note">
        new random nonce, every request
      </text>
      <path d="M180 82 V98 M100 98 H260 M100 98 V112 M260 98 V112" className="hot" />
      <Box x={24} y={112} w={152} h={32} label="CSP: 'nonce-…'" hot />
      <Box x={196} y={112} w={140} h={32} label="<script nonce>" hot />
      <text x={186} y={168} textAnchor="middle" className="hot-text">
        match: runs
      </text>
      <path d="M24 186 H336" className="dashed" />
      <text x={24} y={206} className="note">
        no nonce: blocked. no inline handlers,
      </text>
      <text x={24} y={222} className="note">
        no eval, no third-party origins.
      </text>
    </>
  );
}

/** The box in the terminal: four steps up from guest to root. */
function Chain() {
  const steps: [number, number, string, string][] = [
    [14, 176, "enumerate", "ls -la"],
    [98, 134, "decode", "base64 | rot13"],
    [182, 92, "crack", "john, then su"],
  ];
  return (
    <>
      {steps.map(([x, y, label, how]) => (
        <g key={label}>
          <Box x={x} y={y} w={80} h={30} label={label} />
          <text x={x} y={y + 46} className="note">
            {how}
          </text>
        </g>
      ))}
      <Box x={266} y={50} w={80} h={30} label="root" hot />
      <text x={346} y={38} textAnchor="end" className="hot-text">
        sudo cat /var/log/*
      </text>
      {/* Each step is reached from the one below it. */}
      <path d="M54 176 V149 H98 M138 134 V107 H182 M222 92 V65 H266" className="hot" />
      <text x={14} y={22} className="note">
        guest
      </text>
      <path d="M22 30 V176" className="dashed" />
    </>
  );
}

const DIAGRAMS: Record<Diagram, () => React.JSX.Element> = {
  feistel: () => <Feistel />,
  traversal: Traversal,
  scorm: Scorm,
  nonce: Nonce,
  chain: Chain,
};

export function ProjectDiagram({ diagram, label }: { diagram: Diagram; label: string }) {
  const Content = DIAGRAMS[diagram];
  return (
    <svg className="diagram" viewBox="0 0 360 240" role="img" aria-label={label}>
      <Content />
    </svg>
  );
}
