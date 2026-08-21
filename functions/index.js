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

/**
 * Confirm a UPI payment: write the receipt, close the intent, and refresh the parent-visible balance —
 * as ONE Firestore transaction.
 *
 * Client-side this was three sequential writes, and the third (the parent's balance) sat inside an empty
 * catch. So the office could see "Recorded ₹4,500 · SSC/26-27/0042" while the parent still saw the old
 * balance and a Pay button, and paid again. The balance update was also a read-modify-write with no
 * transaction, so two confirmations at once lost one increment.
 *
 * Idempotent: the receipt id is derived from the intent id, and an intent that is no longer pending is
 * refused, so a double-click or a retry after a timeout cannot double-record.
 */
exports.confirmUpiPayment = onCall({region: "us-central1", cors: true}, async (req) => {
  if (!req.auth || !req.auth.uid) throw new HttpsError("unauthenticated", "Sign in first.");
  const db = admin.firestore();

  const acct = await db.collection("accounts").doc(req.auth.uid).get();
  const role = acct.exists ? acct.data().role : null;
  if (!["admin", "office", "vp"].includes(role)) {
    throw new HttpsError("permission-denied", "Only the office, Director or Vice Principal can confirm a payment.");
  }

  const intentId = String((req.data && req.data.intentId) || "").trim();
  const session = String((req.data && req.data.session) || "2026-27");
  if (!intentId) throw new HttpsError("invalid-argument", "Which payment? No intent given.");

  const intentRef = db.collection("paymentIntents").doc(intentId);
  const counterRef = db.collection("counters").doc("feeReceipts");

  const out = await db.runTransaction(async (tx) => {
    const iSnap = await tx.get(intentRef);
    if (!iSnap.exists) throw new HttpsError("not-found", "That payment claim no longer exists.");
    const it = iSnap.data();
    if (it.status && it.status !== "pending") {
      throw new HttpsError("failed-precondition",
        `Already handled by ${it.verifiedBy || "someone"}${it.receiptNo ? " · " + it.receiptNo : ""}.`);
    }

    const amount = Number(it.amount) || 0;
    if (amount <= 0) throw new HttpsError("invalid-argument", "That claim has no amount on it.");
    const admNo = String(it.admNo || "").trim();

    const cSnap = await tx.get(counterRef);
    const next = ((cSnap.exists ? Number(cSnap.data().value) : 0) || 0) + 1;
    const receiptNo = "SSC/" + session.replace(/^20/, "") + "/" + String(next).padStart(4, "0");

    // portalFees must be READ inside the transaction, or a concurrent confirmation overwrites this one.
    const pRef = admNo ? db.collection("portalFees").doc(admNo) : null;
    const pSnap = pRef ? await tx.get(pRef) : null;

    tx.set(counterRef, {value: next}, {merge: true});
    tx.set(db.collection("fees").doc("pay_" + intentId), {
      cls: it.cls || "", student: it.student || "", admNo,
      amount, mode: "UPI", note: "Online UPI" + (it.ref ? " · ref " + it.ref : ""),
      date: it.date || new Date().toISOString().slice(0, 10),
      receiptNo, session, by: role, at: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(intentRef, Object.assign({}, it, {
      status: "verified", verifiedBy: req.auth.uid, verifiedAt: new Date().toISOString(), receiptNo,
    }));
    if (pSnap && pSnap.exists) {
      const pf = pSnap.data();
      tx.set(pRef, Object.assign({}, pf, {
        paid: Number(pf.paid || 0) + amount,
        bal: Math.max(0, Number(pf.bal || 0) - amount),
        updatedAt: new Date().toISOString(),
      }));
    }
    return {receiptNo, amount, admNo, balanceUpdated: !!(pSnap && pSnap.exists)};
  });

  return Object.assign({ok: true}, out);
});
