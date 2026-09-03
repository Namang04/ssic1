// Finds identifiers that resolve to no binding anywhere - the class of bug that compiles clean and
// throws only when the user clicks the thing. Parses each text/babel block with the app's own Babel.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
let Babel;
try { Babel = createRequire(import.meta.url)('@babel/standalone'); }
catch { console.error('  @babel/standalone is not installed here. Run: npm install'); process.exit(2); }

const FILE = process.argv[2] || '/Users/namangupta/repos/ssic1/index.html';
let html;
try { html = readFileSync(FILE, 'utf8'); }
catch { console.error(`  cannot read ${FILE}`); process.exit(2); }   // 2 = cannot check, 1 = findings

// pull out each babel block with the line it starts on
const blocks = [];
const re = /<script type="text\/babel">([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html)) !== null) {
  blocks.push({ code: m[1], startLine: html.slice(0, m.index).split('\n').length });
}

// A checker that finds nothing because it parsed nothing is worse than no checker. The compiled
// build has no text/babel blocks at all, so pointing this at build/index.html used to "pass".
if (!blocks.length) {
  console.error(`  ERROR: no <script type="text/babel"> blocks in ${FILE} - nothing was checked.`);
  console.error('  Run this against the SOURCE index.html, not the compiled build.');
  process.exit(2);
}

const BROWSER = new Set(`window document console localStorage sessionStorage navigator location history
alert confirm prompt fetch setTimeout clearTimeout setInterval clearInterval requestAnimationFrame
cancelAnimationFrame Math JSON Object Array String Number Boolean Date RegExp Error TypeError Promise
Map Set WeakMap WeakSet Symbol Intl parseInt parseFloat isNaN isFinite encodeURIComponent Image Blob
decodeURIComponent encodeURI decodeURI escape unescape URL URLSearchParams FileReader File FormData
XMLHttpRequest Event CustomEvent MutationObserver IntersectionObserver ResizeObserver getComputedStyle
performance crypto structuredClone queueMicrotask atob btoa TextEncoder TextDecoder AbortController
React ReactDOM XLSX katex firebase globalThis undefined NaN Infinity arguments eval Function Proxy
Reflect BigInt Uint8Array ArrayBuffer DataView Notification indexedDB matchMedia screen frames self
top parent opener closed name status HTMLElement Node Element process require module exports`.split(/\s+/).filter(Boolean));

// every top-level declaration in ANY block is a legitimate cross-block global in this app
const declared = new Set();
const collectTop = {
  FunctionDeclaration(p) { if (p.parentPath.isProgram() && p.node.id) declared.add(p.node.id.name); },
  ClassDeclaration(p) { if (p.parentPath.isProgram() && p.node.id) declared.add(p.node.id.name); },
  // Destructuring counts: `const {useState,useEffect}=React` at the top of a block declares both.
  // Missing this made every hook look undeclared in the later blocks.
  VariableDeclarator(p) {
    if (!p.getFunctionParent()) Object.keys(p.getBindingIdentifiers()).forEach(n => declared.add(n));
  },
  // `Object.defineProperty(window,"QB_DATA",{get:...})` also publishes one.
  CallExpression(p) {
    const c = p.node.callee;
    if (c.type === 'MemberExpression' && c.object.type === 'Identifier' && c.object.name === 'Object' &&
        c.property.type === 'Identifier' && c.property.name === 'defineProperty') {
      const a = p.node.arguments;
      if (a.length > 1 && a[0].type === 'Identifier' && a[0].name === 'window' && a[1].type === 'StringLiteral')
        declared.add(a[1].value);
    }
  },
  // `window.__foo = ...` publishes a genuine cross-block global.
  AssignmentExpression(p) {
    const l = p.node.left;
    if (l.type === 'MemberExpression' && l.object.type === 'Identifier' &&
        l.object.name === 'window' && l.property.type === 'Identifier') declared.add(l.property.name);
  },
};
const asts = [];
for (const b of blocks) {
  const out = Babel.transform(b.code, {
    presets: [['react', { runtime: 'classic' }]], ast: true, code: false, sourceType: 'script',
    plugins: [() => ({ visitor: collectTop })],
  });
  asts.push({ ast: out.ast, b });
}

// second pass: report unresolved references
const findings = [];
for (const { b } of asts) {
  Babel.transform(b.code, {
    presets: [['react', { runtime: 'classic' }]], code: false, sourceType: 'script',
    plugins: [() => ({ visitor: { Program(path) {
      for (const name of Object.keys(path.scope.globals)) {
        if (BROWSER.has(name) || declared.has(name)) continue;
        const node = path.scope.globals[name];
        findings.push({ name, line: (node.loc ? node.loc.start.line : 0) + b.startLine - 1 });
      }
    } } })],
  });
}

findings.sort((a, b2) => a.line - b2.line);
if (!findings.length) { console.log('  no undeclared identifiers'); process.exit(0); }
console.error(`  ${findings.length} undeclared identifier(s):\n`);
for (const f of findings) console.error(`  ${FILE.split('/').pop()}:${f.line}  ${f.name}`);
// Exit non-zero, or this reports failures and still reads as a pass to npm, a hook or CI -
// which is the exact silent-success fault this tool exists to catch.
process.exit(1);
