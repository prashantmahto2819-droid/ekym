// Decorative SVGs shared by the printable exam certificates.
/* decorative SVGs for the printable certificate */
export function CornerArt({ className }: { className: string }) {
  return <svg viewBox="0 0 60 60" className={className} fill="none" stroke="#b8924a" strokeLinecap="round"><path d="M60 1 H17 Q1 1 1 17 V60" strokeWidth="3" /><path d="M42 8 H19 Q8 8 8 19 V42" strokeWidth="1.6" /><circle cx="16" cy="16" r="3" fill="#b8924a" stroke="none" /></svg>;
}
export function Flourish({ className }: { className: string }) {
  return <svg viewBox="0 0 200 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M92 8 C70 0 58 16 36 8 H2 M108 8 C130 0 142 16 164 8 H198" /><circle cx="36" cy="5" r="2.5" /><circle cx="164" cy="5" r="2.5" /><path d="M100 2 L106 8 L100 14 L94 8 Z" fill="currentColor" stroke="none" /></svg>;
}
export function Seal({ className }: { className: string }) {
  const n = 28, pts = Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 36 : 40; return `${50 + Math.cos(a) * r},${45 + Math.sin(a) * r}`; }).join(" ");
  const star = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 6 : 14; return `${50 + Math.cos(a) * r},${45 + Math.sin(a) * r}`; }).join(" ");
  return <svg viewBox="0 0 100 120" className={className}><path d="M38 70 L30 118 L40 110 L48 118 L50 72 Z M62 70 L70 118 L60 110 L52 118 L50 72 Z" fill="#a8823e" /><polygon points={pts} fill="#b8924a" /><circle cx="50" cy="45" r="30" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" /><circle cx="50" cy="45" r="26" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" /><polygon points={star} fill="#fff" fillOpacity=".92" /></svg>;
}
export function Mandala({ className }: { className: string }) {
  const rings: [number, number, number][] = [[48, 32, 8], [37, 24, 9], [26, 16, 10], [15, 12, 8]];
  return <svg viewBox="-50 -50 100 100" className={className} fill="none" stroke="#b8924a" strokeWidth=".35">{rings.map(([k, cnt, len]) => <g key={k}>{Array.from({ length: cnt }, (_, i) => <ellipse key={i} cx="0" cy={-(k - len / 2)} rx={len * 0.32} ry={len / 2} transform={`rotate(${(i / cnt) * 360})`} />)}<circle r={k - len} /></g>)}</svg>;
}
