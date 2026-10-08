// ===========================================================
// Identifier helper
//
// Sortable-ish, collision-safe within a session. Prefixed ids
// make a stray row immediately identifiable in devtools or a
// Postgres query.
// ===========================================================

let counter = 0;

export function newId(prefix: string): string {
  counter += 1;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${counter.toString(36)}${rand}`;
}
