/**
 * Stepping Stone Inter College — server-side actions.
 *
 * WHY THIS EXISTS
 * Firebase passwords can only be changed by the account holder or by the Admin SDK, which cannot run in the
 * browser. Without this, a teacher who forgot her password could only be given a "recovery password" stored on
 * her user document — that let her sign in but carried NO Firebase session, so every Firestore rule requiring
 * signedIn() denied her writes. She could look at the register and not mark it.
 *
 * This performs a REAL reset: her username stays, her old password stops working, and nothing is stored in
 * plain text.
 */
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// Must match AUTH_EMAIL in index.html exactly, or we would look up the wrong account.
const AUTH_EMAIL = (u) =>
  String(u || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") + "@ssic-portal.app";

// A live user doc is keyed by safeId(username) — dots and spaces become underscores.
const safeId = (s) => String(s || "").replace(/[^a-zA-Z0-9]/g, "_");

/** The caller's authoritative role, read from accounts/{uid} — never trusted from the client. */
async function callerRole(auth) {
  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  const snap = await admin.firestore().collection("accounts").doc(auth.uid).get();
  const role = snap.exists ? snap.data().role : null;
  if (role !== "admin" && role !== "vp") {
    throw new HttpsError("permission-denied", "Only the Director or Vice Principal can reset a password.");
  }
  return role;
}

exports.resetStaffPassword = onCall({region: "us-central1", cors: true}, async (req) => {
  const role = await callerRole(req.auth);

  const username = String((req.data && req.data.username) || "").trim();
  const newPassword = String((req.data && req.data.newPassword) || "");
  if (!username) throw new HttpsError("invalid-argument", "Which account? No username given.");
  if (newPassword.length < 6) throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");

  const db = admin.firestore();

  // Look the target up by their login email.
  let target;
  try {
    target = await admin.auth().getUserByEmail(AUTH_EMAIL(username));
  } catch (e) {
    throw new HttpsError("not-found",
      `"${username}" has no secure login yet. Use "Give login" on the Accounts screen to create one.`);
  }

  // A Vice Principal may not reset a Director or another VP — mirrors the in-app protection on those rows.
  const acct = await db.collection("accounts").doc(target.uid).get();
  const targetRole = acct.exists ? acct.data().role : null;
  if (role === "vp" && (targetRole === "admin" || targetRole === "vp")) {
    throw new HttpsError("permission-denied", "Only the Director can reset a Director or Vice Principal password.");
  }

  await admin.auth().updateUser(target.uid, {password: newPassword});

  // Drop the plaintext copy the old recovery flow left behind, and ask them to choose their own.
  // loginOff is cleared so a reset can never land on a login that is still disabled.
  const docId = safeId(username);
  const ref = db.collection("users").doc(docId);
  const cur = await ref.get();
  if (cur.exists) {
    await ref.update({
      password: admin.firestore.FieldValue.delete(),
      pwdTemp: true,
      loginOff: false,
    });
  }

  // Audit WITHOUT the password.
  await db.collection("auditLogs").add({
    action: "password-reset-secure",
    coll: "auth",
    docId: username,
    by: req.auth.uid,
    byRole: role,
    at: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {});

  return {ok: true, username, message: `Password changed for ${username}. Their previous password no longer works.`};
});
