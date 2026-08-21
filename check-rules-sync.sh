#!/usr/bin/env bash
# The Security screen shows a copy of the rules for pasting into the Firebase console; firestore.rules is the
# version-controlled original. If they drift, what is reviewed in git is not what is published. Fails loudly.
set -euo pipefail
cd "$(dirname "$0")"
python3 - <<'PY'
import re,sys
s=open('index.html',encoding='utf-8').read()
m=re.search(r'FIRESTORE_RULES\s*=\s*`',s)
if not m: print("FAIL: FIRESTORE_RULES not found in index.html"); sys.exit(1)
i=m.end(); j=s.index('`',i)
inapp=s[i:j].strip(); onfile=open('firestore.rules').read().strip()
if inapp==onfile:
    print("OK: firestore.rules matches the copy shown in the app (%d lines)"%len(onfile.splitlines()))
else:
    print("FAIL: firestore.rules and the in-app copy have DRIFTED.")
    import difflib
    for l in list(difflib.unified_diff(onfile.splitlines(),inapp.splitlines(),'firestore.rules','index.html',lineterm=''))[:30]:
        print("  "+l)
    sys.exit(1)
PY
