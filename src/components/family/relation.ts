import type { Person } from "@/family/layout";

/** Relation of b to a through the father line of one tree (a wife is counted through her husband). */
export function relation(a0: Person, b0: Person, byId: Map<string, Person>, L: boolean): string {
  const late = (p: Person) => (p.is_deceased ? (L ? "स्व. " : "Late ") : "") + p.name;
  const via = (p: Person) => (p.member_kind === "spouse" && p.parent_id ? byId.get(p.parent_id) ?? p : p);
  const up = (p: Person) => { const out = [p]; const seen = new Set([p.id]); let c = p; while (c.parent_id && byId.has(c.parent_id) && !seen.has(c.parent_id)) { c = byId.get(c.parent_id)!; seen.add(c.id); out.push(c); } return out; };
  const a = via(a0), b = via(b0);
  if (a.id === b.id) return a0.id === b0.id ? (L ? "एक ही व्यक्ति चुना गया।" : "The same person was chosen.") : (L ? `${late(a0)} और ${late(b0)} पति-पत्नी हैं।` : `${late(a0)} and ${late(b0)} are husband and wife.`);
  const ua = up(a), ub = up(b);
  const ib = new Map(ub.map((p, i) => [p.id, i] as const));
  const da = ua.findIndex((p) => ib.has(p.id));
  if (da < 0) return L ? "इस वंश वृक्ष में इन दोनों के बीच कोई साझा पूर्वज दर्ज नहीं है।" : "No common ancestor is recorded for these two in this tree.";
  const lca = ua[da]!;
  const db = ib.get(lca.id) ?? 0;
  const girl = b.member_kind === "daughter";
  const pair = (): [string, string] => {
    if (da === 0) return db === 1 ? [girl ? "पुत्री" : "पुत्र", girl ? "daughter" : "son"] : db === 2 ? [girl ? "पौत्री" : "पौत्र", girl ? "granddaughter" : "grandson"] : [`${db} पीढ़ी नीचे के वंशज`, `descendant, ${db} generations down`];
    if (db === 0) return da === 1 ? ["पिता", "father"] : da === 2 ? ["दादा", "grandfather"] : da === 3 ? ["परदादा", "great-grandfather"] : [`${da} पीढ़ी ऊपर के पूर्वज`, `ancestor, ${da} generations up`];
    if (da === 1 && db === 1) return [girl ? "बहन" : "भाई", girl ? "sister" : "brother"];
    if (da === 2 && db === 1) return [girl ? "बुआ" : "चाचा / ताऊ", girl ? "father's sister" : "father's brother"];
    if (da === 1 && db === 2) return [girl ? "भतीजी" : "भतीजा", girl ? "brother's daughter" : "brother's son"];
    if (da === 2 && db === 2) return [girl ? "चचेरी बहन" : "चचेरे भाई", "first cousin"];
    return ["कुटुंबी (एक ही वंश के)", "relative of the same lineage"];
  };
  const [hi, en] = pair();
  const chain = [...ua.slice(0, da + 1).map(late), ...ub.slice(0, db).reverse().map(late)].join(" → ");
  return L
    ? `${late(b)}, ${late(a)} के ${hi} हैं।${da > 0 && db > 0 ? ` साझा पूर्वज: ${late(lca)}।` : ""} कड़ी: ${chain}`
    : `${late(b)} is the ${en} of ${late(a)}.${da > 0 && db > 0 ? ` Common ancestor: ${late(lca)}.` : ""} Chain: ${chain}`;
}

/** Top ancestor reachable from p in the given map (a wife is counted through her husband). */
export function lineageRoot(p0: Person, byId: Map<string, Person>): string {
  let c = p0.member_kind === "spouse" && p0.parent_id ? byId.get(p0.parent_id) ?? p0 : p0;
  const seen = new Set([c.id]);
  while (c.parent_id && byId.has(c.parent_id) && !seen.has(c.parent_id)) { c = byId.get(c.parent_id)!; seen.add(c.id); }
  return c.id;
}
