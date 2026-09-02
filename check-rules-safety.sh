#!/usr/bin/env bash
# Static safety checks for firestore.rules. No Java or emulator needed, so this runs on every change.
# Each pattern corresponds to a rules bug that reached live staff on 2 September 2026.
set -uo pipefail
cd "$(dirname "$0")"
python3 - <<'PY'
import io,re,sys
raw=io.open('firestore.rules',encoding='utf-8').read()
lines=[re.sub(r'//.*$','',l) for l in raw.split("\n")]
code="\n".join(lines)

def functions(txt):
    """Yield (name, body) using real brace matching - a regex swallows following functions."""
    for m in re.finditer(r'function\s+(\w+)\s*\([^)]*\)\s*\{', txt):
        i=m.end()-1; depth=0
        for j in range(i,len(txt)):
            if txt[j]=='{': depth+=1
            elif txt[j]=='}':
                depth-=1
                if depth==0:
                    yield m.group(1), txt[i+1:j]; break

problems=[]

# 1. get() on a path with no exists() guard for that path in the same function.
#    get() on a MISSING document throws, which denies the write - this locked the Director out of assignments.
for name, body in functions(code):
    g=set(re.findall(r'get\(/databases/\$\(database\)/documents/([^)]+)\)', body))
    e=set(re.findall(r'exists\(/databases/\$\(database\)/documents/([^)]+)\)', body))
    for p in g-e:
        problems.append(("unguarded-get", name, "get() on %s with no exists() guard" % p.strip()))

# 2. An assignment list required to contain a match, with no allowance for it being EMPTY.
#    An empty subjects array denied every class-log write for a teacher assigned a class but no subject.
for name, body in functions(code):
    for fld in ("subjects","classes","teachingPairs","classTeacherOf"):
        # A function offering an OR alternative (e.g. ownsClassSection falls back to the shared
        # class-teacher map) is not a dead end even when the list is empty.
        if ".get('%s'" % fld in body and ".hasAny(" in body and "size() == 0" not in body \
           and "||" not in body:
            problems.append(("required-nonempty-list", name, "%s must contain a match, empty not allowed" % fld))

# 3. Flag-derived role checks USED outside the accounts collection (definitions are fine).
#    Deriving Director-ness from a fees flag locked out both Director and VP.
fn_names={n for n,_ in functions(code)}
in_accounts=False; in_fn=0
for i,l in enumerate(lines,1):
    if re.match(r'\s*function\s+\w+', l): in_fn = l.count('{')-l.count('}') or 1
    elif in_fn: in_fn += l.count('{')-l.count('}'); in_fn=max(in_fn,0); continue
    if re.match(r'\s*match /accounts/', l): in_accounts=True
    elif re.match(r'\s*match /', l): in_accounts=False
    if not in_accounts and re.search(r'\b(isDirectorRole|isVicePrincipalRole)\(\)', l) and 'function' not in l:
        problems.append(("flag-derived-role", "line %d" % i, l.strip()[:100]))

if not problems:
    print("OK: no known rules hazards found."); sys.exit(0)
by={}
for k,w,d in problems: by.setdefault(k,[]).append((w,d))
for k,items in by.items():
    print("%s  (%d)" % (k,len(items)))
    for w,d in items[:8]: print("   %-24s %s" % (w,d))
sys.exit(1)
PY
