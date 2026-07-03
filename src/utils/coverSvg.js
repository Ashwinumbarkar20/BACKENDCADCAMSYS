const PALETTES = {
  cam2d: ["#1b1147", "#4f2bd6", "#b5179e"],
  nesting: ["#0b2447", "#19a7ce", "#46c2cb"],
  cam3d: ["#10002b", "#7b2cbf", "#e0aaff"],
  quoting: ["#14213d", "#fca311", "#ff5a3c"],
  production: ["#0d1b2a", "#1b6ca8", "#33a1fd"],
  robotics: ["#2b0a3d", "#c1121f", "#ff5a3c"],
  industry: ["#1a1a2e", "#16213e", "#5b34ea"],
  page: ["#1b1147", "#3a1d9c", "#5b34ea"],
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapTitle(title) {
  const words = String(title).split(/\s+/);
  const lines = [""];
  const max = 15;
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (cur && (cur + " " + w).length > max && lines.length < 2) {
      lines.push(w);
    } else {
      lines[lines.length - 1] = cur ? `${cur} ${w}` : w;
    }
  }
  return lines;
}

export function coverSvg({ title, kicker, palette }) {
  const [c1, c2, c3] = PALETTES[palette] || PALETTES.page;
  const lines = wrapTitle(title);
  const titleY = lines.length === 1 ? 340 : 300;
  const titleSpans = lines
    .map((ln, i) => `<tspan x="90" dy="${i === 0 ? 0 : 88}">${esc(ln)}</tspan>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="0.55" stop-color="${c2}"/>
      <stop offset="1" stop-color="${c3}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1010" cy="120" r="220" fill="url(#sheen)"/>
  <circle cx="1080" cy="560" r="120" fill="#ffffff" fill-opacity="0.06"/>
  <g stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" fill="none">
    <path d="M90 470 L1110 470"/>
    <path d="M820 90 l120 0 l60 100 l-120 0 z"/>
    <path d="M900 250 l120 0 l60 100 l-120 0 z"/>
  </g>
  <text x="90" y="160" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="30" letter-spacing="6" font-weight="600" fill="#ffffff" fill-opacity="0.85">${esc(kicker || "CADCAMSYS").toUpperCase()}</text>
  <text x="90" y="${titleY}" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="78" font-weight="700" fill="#ffffff">${titleSpans}</text>
  <text x="90" y="540" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="26" font-weight="500" fill="#ffffff" fill-opacity="0.8">CADCAMSYS — CAM · Nesting · Quoting · Robotics</text>
</svg>`;
}
