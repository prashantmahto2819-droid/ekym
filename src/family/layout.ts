// Family chart layout (FamilyEcho-style): generations in rows, spouses beside the person,
// children centred under the couple, connectors drawn as a "bus". Pure functions, no DOM.

export type Person = {
  id: string;
  parent_id: string | null;
  name: string;
  relation?: string | null;
  is_head?: boolean;
  sort_order?: number;
  native_place?: string | null;
  village_name?: string | null;
  is_deceased?: boolean;
  name_unknown?: boolean;
  member_kind?: string | null; // son (default) | spouse | daughter
  family_id?: string | null;
  family_name?: string | null;
  phone?: string | null;
  phone2?: string | null;
  photo_path?: string | null;
  created_at?: string;
  suspended_at?: string | null; // सदस्यता निलंबित (कोई पत्र / सूचना / संदेश नहीं)
  suspended_until?: string | null;
};

/** Membership suspended right now (an end date in the past means it is over). */
export const isSuspended = (p: Pick<Person, "suspended_at" | "suspended_until">) =>
  !!p.suspended_at && (!p.suspended_until || p.suspended_until >= new Date().toISOString().slice(0, 10));

export const BOX_W = 168;
export const BOX_H = 64;
export const SPOUSE_GAP = 22;   // gap between husband and wife boxes
export const SIB_GAP = 26;      // gap between sibling subtrees
export const ROW_GAP = 76;      // vertical gap between generations
export const PAD = 40;

export type Unit = {
  person: Person;
  spouses: Person[];
  children: Unit[];
  depth: number;
  /** subtree width */
  w: number;
  /** x of the unit's own left edge (person box) */
  x: number;
  y: number;
};

export type Placed = { person: Person; x: number; y: number; unit: Unit; isSpouse: boolean };
export type Line = { x1: number; y1: number; x2: number; y2: number; kind: "spouse" | "drop" | "bus" };
export type Layout = { boxes: Placed[]; lines: Line[]; width: number; height: number; units: Unit[]; generations: number };

const rank = (p: Person) => (p.member_kind === "spouse" ? 0 : p.member_kind === "daughter" ? 2 : 1);
const byOrder = (a: Person, b: Person) =>
  Number(!!b.is_head) - Number(!!a.is_head) || rank(a) - rank(b) || (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.created_at ?? "").localeCompare(b.created_at ?? "");

/** Build units (person + spouses + children) from a flat member list. */
export function buildUnits(people: Person[]): Unit[] {
  const kids = new Map<string | null, Person[]>();
  const ids = new Set(people.map((p) => p.id));
  for (const p of people) {
    const key = p.parent_id && ids.has(p.parent_id) ? p.parent_id : null;
    const arr = kids.get(key) ?? [];
    arr.push(p);
    kids.set(key, arr);
  }
  for (const arr of kids.values()) arr.sort(byOrder);
  const make = (p: Person, depth: number): Unit => {
    const ch = kids.get(p.id) ?? [];
    const spouses = ch.filter((c) => c.member_kind === "spouse");
    const children = ch.filter((c) => c.member_kind !== "spouse").map((c) => make(c, depth + 1));
    return { person: p, spouses, children, depth, w: 0, x: 0, y: 0 };
  };
  return (kids.get(null) ?? []).filter((p) => p.member_kind !== "spouse").map((p) => make(p, 0));
}

export function ownWidth(u: Unit) { return BOX_W + u.spouses.length * (BOX_W + SPOUSE_GAP); }

function measure(u: Unit): number {
  const own = ownWidth(u);
  const kidsW = u.children.reduce((s, c, i) => s + measure(c) + (i ? SIB_GAP : 0), 0);
  u.w = Math.max(own, kidsW);
  return u.w;
}

function place(u: Unit, left: number, depth: number) {
  u.y = depth * (BOX_H + ROW_GAP);
  const own = ownWidth(u);
  const kidsW = u.children.reduce((s, c, i) => s + c.w + (i ? SIB_GAP : 0), 0);
  let cx = left + (u.w - kidsW) / 2;
  for (const c of u.children) { place(c, cx, depth + 1); cx += c.w + SIB_GAP; }
  if (u.children.length) {
    const first = u.children[0]!, last = u.children[u.children.length - 1]!;
    const mid = (first.x + ownWidth(first) / 2 + last.x + ownWidth(last) / 2) / 2; // centre over children's own boxes
    // couple centre should sit over `mid`
    u.x = Math.max(left, Math.min(left + u.w - own, mid - own / 2));
  } else {
    u.x = left + (u.w - own) / 2;
  }
}

/** Compute the full chart. Roots are laid side by side. */
export function layoutFamily(people: Person[]): Layout {
  const units = buildUnits(people);
  let left = PAD;
  for (const u of units) { measure(u); place(u, left, 0); left += u.w + SIB_GAP * 2; }
  const boxes: Placed[] = [];
  const lines: Line[] = [];
  let maxDepth = 0;
  const walk = (u: Unit) => {
    maxDepth = Math.max(maxDepth, u.depth);
    const y = u.y + PAD;
    boxes.push({ person: u.person, x: u.x, y, unit: u, isSpouse: false });
    let sx = u.x;
    for (const s of u.spouses) {
      const nx = sx + BOX_W + SPOUSE_GAP;
      lines.push({ x1: sx + BOX_W, y1: y + BOX_H / 2, x2: nx, y2: y + BOX_H / 2, kind: "spouse" });
      boxes.push({ person: s, x: nx, y, unit: u, isSpouse: true });
      sx = nx;
    }
    if (u.children.length) {
      // drop from the couple centre (between husband and first wife) or from the person
      const cx = u.spouses.length ? u.x + BOX_W + SPOUSE_GAP / 2 : u.x + BOX_W / 2;
      const busY = y + BOX_H + ROW_GAP / 2;
      lines.push({ x1: cx, y1: u.spouses.length ? y + BOX_H / 2 : y + BOX_H, x2: cx, y2: busY, kind: "drop" });
      const xs = u.children.map((c) => c.x + BOX_W / 2);
      const minX = Math.min(cx, ...xs), maxX = Math.max(cx, ...xs);
      lines.push({ x1: minX, y1: busY, x2: maxX, y2: busY, kind: "bus" });
      for (const c of u.children) {
        lines.push({ x1: c.x + BOX_W / 2, y1: busY, x2: c.x + BOX_W / 2, y2: c.y + PAD, kind: "drop" });
        walk(c);
      }
    }
  };
  units.forEach(walk);
  const width = Math.max(...boxes.map((b) => b.x + BOX_W), 0) + PAD;
  const height = (maxDepth + 1) * (BOX_H + ROW_GAP) - ROW_GAP + PAD * 2;
  return { boxes, lines, width, height, units, generations: maxDepth + 1 };
}

/** Ancestors (ids) of a person, nearest first. */
export function ancestorsOf(people: Person[], id: string): string[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const out: string[] = [];
  let cur = byId.get(id)?.parent_id ?? null;
  while (cur && byId.has(cur) && !out.includes(cur)) { out.push(cur); cur = byId.get(cur)!.parent_id; }
  return out;
}

/** Descendant ids (including self). */
export function descendantsOf(people: Person[], id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) for (const p of people) if (p.parent_id === out[i]) out.push(p.id);
  return out;
}
