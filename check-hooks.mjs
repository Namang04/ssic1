// Three more crash classes this app has actually hit, checked mechanically with the app's own Babel:
//   1. React hooks called conditionally / in callbacks / after an early return  -> "Rendered more hooks"
//   2. const/let read before its declaration in the same scope                  -> TDZ ReferenceError
//   3. the same top-level function declared twice (across babel blocks the later one silently wins)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
let Babel;
try { Babel = createRequire(import.meta.url)('@babel/standalone'); }
catch { console.error('  @babel/standalone is not installed here. Run: npm install'); process.exit(2); }
const FILE = process.argv[2];
let html;
try { html = readFileSync(FILE, 'utf8'); }
catch { console.error(`  cannot read ${FILE}`); process.exit(2); }
const blocks = [];
const re = /<script type="text\/babel">([\s\S]*?)<\/script>/g; let m;
while ((m = re.exec(html)) !== null) blocks.push({ code: m[1], startLine: html.slice(0, m.index).split('\n').length });
if (!blocks.length) { console.error(`  no <script type="text/babel"> blocks in ${FILE} - nothing was checked.`); process.exit(2); }

const hooks = [], tdz = [], dupes = [];
const topDecl = new Map();   // name -> [line...]
const isHookName = n => /^use[A-Z]/.test(n);
const isComponentName = n => /^[A-Z]/.test(n);

for (const b of blocks) {
  const L = n => n + b.startLine - 1;
  const ln = node => (node && node.loc) ? L(node.loc.start.line) : null;
  Babel.transform(b.code, {
    presets: [['react', { runtime: 'classic' }]], code: false, sourceType: 'script',
    plugins: [() => ({ visitor: {
      FunctionDeclaration(p) {
        if (p.parentPath.isProgram() && p.node.id) {
          const n = p.node.id.name; if (!topDecl.has(n)) topDecl.set(n, []); const l=ln(p.node); if(l!=null) topDecl.get(n).push(l);
        }
      },
      CallExpression(p) {
        const c = p.node.callee;
        let name = null;
        if (c.type === 'Identifier') name = c.name;
        else if (c.type === 'MemberExpression' && c.property.type === 'Identifier' && c.object.type === 'Identifier' && c.object.name === 'React') name = c.property.name;
        if (!name || !isHookName(name)) return;
        // walk up to the nearest function; note anything that makes the call conditional on the way
        let q = p.parentPath, problem = null, fn = null;
        while (q) {
          if (q.isFunction()) { fn = q; break; }
          if (q.isIfStatement() || q.isConditionalExpression() || q.isLogicalExpression() || q.isLoop() || q.isSwitchStatement()) problem = problem || q.node.type;
          q = q.parentPath;
        }
        if (!fn) return;
        // the enclosing function must itself be a component or a hook; a hook inside a plain callback is the bug
        let fnName = null;
        if (fn.node.id) fnName = fn.node.id.name;
        else if (fn.parentPath.isVariableDeclarator() && fn.parentPath.node.id.type === 'Identifier') fnName = fn.parentPath.node.id.name;
        else if (fn.parentPath.isCallExpression()) { problem = problem || 'callback'; }
        if (fnName && !isComponentName(fnName) && !isHookName(fnName)) problem = problem || `inside non-component ${fnName}()`;
        if (!fnName && !problem) problem = 'anonymous function';
        // early return before this hook in the same function body
        if (!problem && fn.node.body.type === 'BlockStatement') {
          for (const st of fn.node.body.body) {
            if (st.start >= p.node.start) break;
            if (st.type === 'ReturnStatement' || (st.type === 'IfStatement' && st.consequent.type === 'ReturnStatement')) { problem = 'after early return'; break; }
            if (st.type === 'IfStatement' && st.consequent.type === 'BlockStatement' && st.consequent.body.some(x => x.type === 'ReturnStatement')) { problem = 'after early return'; break; }
          }
        }
        const l=ln(p.node); if (problem && l!=null) hooks.push({ line: l, hook: name, fn: fnName || '(anon)', problem });
      },
      ReferencedIdentifier(p) {
        const name = p.node.name, bnd = p.scope.getBinding(name);
        if (!bnd || !['const', 'let'].includes(bnd.kind)) return;
        if (p.node.start==null || bnd.identifier.start==null) return;
        if (p.node.start >= bnd.identifier.start) return;              // declared earlier: fine
        // a read inside a NESTED function runs later, so only flag reads in the declaring function's own body
        const refFn = p.getFunctionParent(), declFn = bnd.path.getFunctionParent();
        if ((refFn && refFn.node) !== (declFn && declFn.node)) return;
        const l=ln(p.node), d=ln(bnd.identifier); if(l!=null&&d!=null) tdz.push({ line: l, name, declaredAt: d });
      },
    } })],
  });
}
for (const [n, lines] of topDecl) if (lines.length > 1) dupes.push({ name: n, lines });

const f = FILE.split('/').pop();
console.log(`\n== 1. hooks not at component top level: ${hooks.length}`);
for (const h of hooks) console.log(`   ${f}:${h.line}  ${h.hook}() in ${h.fn} — ${h.problem}`);
console.log(`\n== 2. const/let read before declaration (TDZ): ${tdz.length}`);
for (const t of tdz) console.log(`   ${f}:${t.line}  ${t.name}  (declared at ${t.declaredAt})`);
console.log(`\n== 3. top-level function declared more than once: ${dupes.length}`);
for (const d of dupes) console.log(`   ${d.name}  at lines ${d.lines.join(', ')}`);

// RATCHET. As of 2026-09-07 there are 42 hooks-after-early-return in five components: LinkTestNames,
// DataCenter, SyncTrackerFromRecords, AttendanceImport, QuestionBank. Every one sits behind a guard
// that is constant for a mounted instance (a role check, or __QB_DISABLED which is fixed per page
// load), so none crashes today. They WILL crash the day user.role is resolved asynchronously - the
// guard flips on a mounted instance and React throws "Rendered more hooks than during the previous
// render". Fix them before that work, not after. Until then: the count may fall, never rise.
// Pass --strict to fail on any finding at all. TDZ reads and duplicate declarations always fail.
const BASELINE_EARLY_RETURN = 42;
const strict = process.argv.includes('--strict');
const early = hooks.filter(h => h.problem === 'after early return').length;
const other = hooks.length - early;
let bad = tdz.length > 0 || dupes.length > 0 || other > 0;
if (strict ? hooks.length > 0 : early > BASELINE_EARLY_RETURN) bad = true;
if (!strict && early > 0 && early <= BASELINE_EARLY_RETURN)
  console.log(`\n   (${early} early-return findings are within the known baseline of ${BASELINE_EARLY_RETURN}; use --strict to fail on them)`);
process.exit(bad ? 1 : 0);
