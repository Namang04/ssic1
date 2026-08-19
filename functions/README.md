# Server-side actions

One Cloud Function, `resetStaffPassword`. It exists because Firebase passwords can only be changed by the
account holder or by the Admin SDK, which cannot run in a browser — so without it the app could only write a
"recovery password" to the user document. That let a teacher sign in but carried **no Firebase session**, so
every Firestore rule requiring `signedIn()` denied her writes: she could open the register and not mark it.

## Deploying

From the repository root, once:

    npm install -g firebase-tools
    firebase login

Then, each time this folder changes:

    firebase deploy --only functions

Nothing else in the project is touched — the website still deploys through Vercel, and `firebase.json`
deliberately contains no `hosting` block so a stray `firebase deploy` cannot publish over it.

## What it does

`resetStaffPassword({ username, newPassword })`

1. Reads the CALLER's role from `accounts/{uid}` — never trusts the client. Director or VP only, and a VP
   cannot reset a Director or another VP.
2. Finds the target by their login email (`<username>@ssic-portal.app`) and sets the new password through the
   Admin SDK. Their old password stops working; their username does not change.
3. Deletes the plaintext `password` field from `users/{id}`, sets `pwdTemp` so they are asked to choose their
   own, and clears `loginOff` so a reset cannot land on a disabled login.
4. Writes an audit entry — never the password.

## Before this is deployed

The app falls back to the old recovery-password behaviour and says on screen that it is view-only. After
deploying, the same button performs a real reset with no code change needed.

## Still to do afterwards

Once this is live and proven, the plaintext `password` field and the legacy sign-in path in `index.html`
should both be removed. They are load-bearing until then: they are the only reason any recovery works today.
