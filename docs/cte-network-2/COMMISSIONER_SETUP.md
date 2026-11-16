# CTE Network 2.0 — Commissioner Role Provisioning

**Status: prepared, not executed.** This PR does not grant access, modify Authentication users, change Realtime Database rules, or enable shared features.

## Confirmed owner mapping

The existing `data/league-data.js` declares permanent active owner ID `brendan` for the team **Flowers on your Grave**. The league UI checks signed-in Firebase custom claims `ownerId` against that exact ID and requires `commissioner === true` to use the Commissioner Center.

The Google sign-in smoke test on the authorized site origin already succeeded. A successful web sign-in is **not** Firebase Admin authorization and does **not** grant the commissioner role.

## Recommended trusted execution

Only an authorized administrator with appropriately scoped Firebase Authentication permissions and *valid* Application Default Credentials should run `tools/assign-commissioner-claims.py`. The administrator must verify the actual existing Firebase Auth UID and email in the project, not infer them from a team name or grant access based solely on a claim made by an unauthenticated caller.

No service account secrets, JSON key files, client-side Admin SDK credentials, pasted OAuth authorization codes, or tokens may be stored in GitHub, website source, public chat, or workflow logs.

1. Establish appropriate admin credentials in a trusted environment. **Mobile Cloud Shell is currently blocked by OAuth/ADC login errors; do not assume that normal `gcloud config set project` establishes user authentication.**
2. Check existing Google Auth account via the trusted project Firebase Admin SDK, and verify the account UID and email using an independent, authenticated admin session.
3. Run read-only preview first:
   ```bash
   python3 tools/assign-commissioner-claims.py --uid "<firebase-auth-uid>" --expected-email "<verified-google-email>"
   ```
4. Review its output. It must say `DRY RUN ONLY`.
5. To apply, an authorized admin explicitly confirms the target UID a second time:
   ```bash
   python3 tools/assign-commissioner-claims.py --uid "<firebase-auth-uid>" --expected-email "<verified-google-email>" --apply --confirm-uid "<firebase-auth-uid>"
   ```
6. Script verifies readback of custom claims. User must sign out/in or refresh ID token after provisioning.

This script preserves other existing custom claims. It changes only `commissioner` and `ownerId`, and fails closed for a disabled account, non-Google provider, mismatched email, missing credentials, or oversize claims.

## Firebase release gates still pending

- Harden and validate Realtime Database `v2` rules independently of legacy `rooms` and `book` data. Repository `database.rules.json` is not confirmed to match **deployed** rules; don't blindly publish the repository file.
- Test role rules with owner, commissioner, unrelated Google account and anonymous users; verify denial of owner impersonation and attempts after lock deadlines.
- Ensure Google sign-in and UID mapping work on mobile, and verify commissioner role only after Admin SDK readback and fresh ID token.
- Only after these tests should `CTE2_CLOUD_ENABLED` be switched to true and rollout considered.

Do **not** implement a public self-serve `/setup-commissioner` page with admin credentials, allow the frontend to write its own claims, or hardcode an arbitrary UID in `database.rules.json`. A one-time bootstrap requires privileged server-side verification, not a public link.
