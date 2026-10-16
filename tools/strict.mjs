// The strict TypeScript rule (AGENTS.md): no type assertions (`as T`, `<T>x`; `as const` is
// fine), no non-null assertions (`x!`), no `any`, no @ts-ignore/@ts-expect-error/@ts-nocheck,
// anywhere we write (generated translations in */gen/ are checked by their generator instead).
//   node tools/strict.mjs [--list]      exits 1 if anything is found
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const list = process.argv.includes('--list');
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'gen', '.claude', 'dist'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|mts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) files.push(p);
  }
};
['games', 'packages', 'tools'].forEach(walk);

let found = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const src = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true);
  const report = (n, what) => {
    found++;
    if (list) { const { line } = src.getLineAndCharacterOfPosition(n.getStart(src)); console.log(`${f}:${line + 1}  ${what}`); }
  };
  const visit = (n) => {
    if ((ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) && n.type.getText(src) !== 'const') report(n, `type assertion (${n.type.getText(src)})`);
    if (ts.isNonNullExpression(n)) report(n, 'non-null assertion (!)');
    if (n.kind === ts.SyntaxKind.AnyKeyword) report(n, 'any');
    ts.forEachChild(n, visit);
  };
  visit(src);
  for (const m of text.matchAll(/@ts-(ignore|expect-error|nocheck)/g)) { found++; if (list) console.log(`${f}  @ts-${m[1]}`); }
}
console.log(`${found} strict-TypeScript violations in ${files.length} files${found ? ' (node tools/strict.mjs --list)' : ''}`);
process.exit(found ? 1 : 0);
