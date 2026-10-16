// The strict TypeScript rule (AGENTS.md): no type assertions (`as T`, `<T>x`; `as const` is
// fine), no non-null assertions (`x!`), no `any`, no @ts-ignore/@ts-expect-error/@ts-nocheck,
// anywhere we write (generated translations in */gen/ are checked by their generator instead).
// Also catches the `any` nobody writes: an expression whose checked type is `any` (JSON.parse,
// Reflect.get, calling a `Function`, a lib typed `any`), found with the TypeScript checker over
// both tsconfigs (browser code, then everything that runs under Node). JSON.parse itself is
// reported too: only readJson (packages/c64kit/src/json.ts) may call it. Only the SOURCE of an
// `any` is reported (not what flows from it). A genuinely untyped outside API is allowed only
// through one small adapter, marked with `// strict-ok: untyped API (why)` on the line (or the
// line above) that produces the `any`.
//   node tools/strict.mjs [--list]      exits 1 if anything is found
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureGen } from './gen.mjs';

ensureGen(); // the type checker reads the generated translations (games/*/src/gen/, not committed)

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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
    // JSON.parse only through readJson (packages/c64kit/src/json.ts): the parsed value is `unknown` there
    if (ts.isCallExpression(n) && n.expression.getText(src) === 'JSON.parse' && !f.endsWith(path.join('c64kit', 'src', 'json.ts'))) report(n, 'JSON.parse (use readJson, then narrow)');
    ts.forEachChild(n, visit);
  };
  visit(src);
  for (const m of text.matchAll(/@ts-(ignore|expect-error|nocheck)/g)) { found++; if (list) console.log(`${f}  @ts-${m[1]}`); }
}

// ---- expressions typed `any` (checker) ----
const SKIP_DIRS = /(^|\/)(node_modules|gen|\.claude|dist)\//;
const isDeclName = (n) => {
  const p = n.parent;
  return (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isQualifiedName(p))
    || ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p) || ts.isFunctionDeclaration(p)
      || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)
      || ts.isClassDeclaration(p) || ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p)
      || ts.isNamespaceImport(p) || ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p)
      || ts.isEnumMember(p) || ts.isTypeReferenceNode(p) || ts.isCatchClause(p)) && p.name === n)
    || (ts.isShorthandPropertyAssignment(p) && p.name === n) || ts.isTypeNode(p);
};
// An identifier is a source only when a .d.ts declares it `any` (a lib global); a variable we declare
// from an `any` is reported where the `any` comes in (its initialiser).
const fromDeclarationFile = (n) => {
  const sym = checker.getSymbolAtLocation(n);
  const decls = sym?.declarations ?? [];
  return decls.length > 0 && decls.every((d) => d.getSourceFile().isDeclarationFile);
};
const anyHits = new Set();
const anyTotals = [];
let checker;
for (const cfgName of ['tsconfig.json', 'tsconfig.test.json']) {
  const cfg = ts.getParsedCommandLineOfConfigFile(path.join(root, cfgName), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => console.error(d.messageText) });
  const program = ts.createProgram(cfg.fileNames, cfg.options);
  checker = program.getTypeChecker();
  const isAny = (n) => (checker.getTypeAtLocation(n).flags & ts.TypeFlags.Any) !== 0;
  let count = 0;
  for (const sf of program.getSourceFiles()) {
    const rel = path.relative(root, sf.fileName);
    if (sf.isDeclarationFile || rel.startsWith('..') || SKIP_DIRS.test(rel + '/') || !/^(games|packages|tools)\//.test(rel)) continue;
    if (!/\.(ts|mts|tsx)$/.test(rel)) continue;
    const lines = sf.text.split('\n');
    const visit = (n) => {
      const candidate = ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)
        || ts.isAwaitExpression(n) || ts.isTaggedTemplateExpression(n) || (ts.isIdentifier(n) && !isDeclName(n) && fromDeclarationFile(n));
      if (candidate && isAny(n)) {
        // only the source: no child expression is `any` itself
        let fromChild = false;
        ts.forEachChild(n, (c) => { if (!ts.isTypeNode(c) && (ts.isExpression(c) || ts.isIdentifier(c)) && isAny(c)) fromChild = true; });
        if (!fromChild) {
          const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
          const marked = /strict-ok:/.test(lines[line]) || (line > 0 && /strict-ok:/.test(lines[line - 1]));
          if (!marked) {
            const key = `${rel}:${line + 1}  implicit any: ${n.getText(sf).replace(/\s+/g, ' ').slice(0, 80)}`;
            if (!anyHits.has(key)) { anyHits.add(key); count++; }
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  anyTotals.push(`${cfgName}: ${count}`);
}
for (const h of [...anyHits].sort()) { found++; if (list) console.log(h); }
console.log(`any-typed expressions (${anyTotals.join(', ')}; same site counted once)`);
console.log(`${found} strict-TypeScript violations in ${files.length} files${found ? ' (node tools/strict.mjs --list)' : ''}`);
process.exit(found ? 1 : 0);
