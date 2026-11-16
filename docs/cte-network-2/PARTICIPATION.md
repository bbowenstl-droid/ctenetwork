# Shared participation and commissioner access

Status: implementation staged; production disabled by `data/cte-participation-config.js`. No production database writes, rule deployments, or identity changes have occurred.

## Security boundary
Google sign-in supplies Firebase identity. Trusted custom claims map `ownerId` to one active league owner; the commissioner also needs `commissioner: true`. Browser selectors and local storage do not assign roles. The public Firebase configuration is not a credential or permission grant.

The isolated `/v2` namespace contains rounds, picks, finalized results, polls, votes, lounge comments and reactions. Database rules enforce owner-specific writes, server-time deadlines, valid matchup choices, post-deadline pick visibility, commissioner-only round/result/poll publishing, and comment size limits. Closed rounds cannot be rewritten by the client. The commissioner may remove lounge messages. No client can issue its own claims. Pick batches and result batches use atomic updates.

## Required production setup — blocked on verified project access
1. Inspect and export the **deployed** rules. The existing repository `database.rules.json` contains a placeholder commissioner UID and is not proof of deployed authorization.
2. Enable Google sign-in and authorize the production domain in Firebase Authentication.
3. From a trusted Firebase Admin environment, assign verified account UIDs to the twelve `ownerId` claims and grant Brendan's verified account the commissioner claim. Do not put a service-account key or admin SDK in the website. Never infer ownership from an email address supplied by a browser.
4. Merge only the `v2` subtree from `security/participation.rules.json` into the existing rules after reviewing ancestor grants. Do **not** replace the live rules with this test file: it does not contain legacy draft/sportsbook permissions. Broad ancestor read/write grants would defeat child restrictions and must be resolved first.
5. Run emulator security tests, then staging tests using two real owner accounts, an unassigned account and the commissioner. Test deadline locks, hidden cards, denied impersonation, role revocation, reload persistence, final-result grading and polling.
6. Enable `CTE2_CLOUD_ENABLED` only after those checks. The disabled screen deliberately offers no fake local-storage submission.

No paid service, account, membership, or identity configuration has been created. The user declined the Firebase plugin; do not interpret that as authorization to bypass project access.

## Operating the features
Commissioner creates a round from six current Sleeper matchups and supplies a deadline before the first kickoff. Owners submit one winner per matchup; edits are allowed until the server deadline. Results are published only after the shared Sleeper completion boundary and matchup identities validate. Each correct pick earns one point; tied games push. The leaderboard derives from stored cards and results rather than a client-writable score total.

Polls have two to four validated options (the commissioner UI currently creates two), a server deadline, and one updatable vote per owner. The lounge has one current message and reaction per owner; it is intentionally not an unrestricted message stream.

No real-money wagers or payments are included in these features. Existing entertainment sportsbook functionality is preserved.

References: https://firebase.google.com/docs/auth/web/google-signin ; https://firebase.google.com/docs/reference/security/database ; https://firebase.google.com/docs/rules/unit-tests
