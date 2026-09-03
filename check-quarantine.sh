#!/bin/sh
# Fails if a diff touches the teacher daily-routine components. Run before any push.
# The director's standing rule: nothing that changes class-teacher status, class assignments,
# the class log, or the teachers' daily routine may ship without being double-checked first.
BASE="${1:-HEAD}"
RANGES="AttendanceImport Attendance TestTracker EnterMarks TimetablePanel TimetableEditor ClassLogView StaffAttendanceRegister"
HITS=$(git diff -U0 "$BASE" -- index.html | grep -E "^@@" | sed -E 's/^@@ -[0-9,]+ \+([0-9]+).*/\1/')
[ -z "$HITS" ] && { echo "quarantine: no index.html changes"; exit 0; }
FOUND=0
for L in $HITS; do
  NAME=$(awk -v tgt="$L" '/^function [A-Za-z_]+\(|^function [A-Za-z_]+\({/{n=$0;sub(/^function /,"",n);sub(/\(.*/,"",n);ln=NR} NR==tgt{print n; exit}' index.html)
  for Q in $RANGES; do
    [ "$NAME" = "$Q" ] && { echo "QUARANTINED: line $L is inside $NAME — needs double-checking before push"; FOUND=1; }
  done
done
if git diff "$BASE" -- index.html | grep -qE "^[-+].*(__classTeachers|__ctList|__ctAdd|__ctRemove|__ctSectionsFor)"; then
  echo "QUARANTINED: diff touches class-teacher helpers"; FOUND=1
fi
[ "$FOUND" = "0" ] && echo "quarantine: clear — no teacher-routine code touched"
exit $FOUND
