# CTE Network 2.0 — iPhone-first execution plan
**Prepared:** Saturday, 2026-11-14. **Desktop checkpoint:** Monday, 2026-11-16.

## Operating decision
Commissioner is restricted to an iPhone until Monday. Developer handles GitHub coding, commits, PRs, CI results, fixture verification, and read-only public data checks. Do not ask the commissioner to repeatedly reconnect Cloud Shell or paste long commands. Avoid requesting a user action unless a decision or identity verification truly needs it.

## Work NOW — no privileged Firebase access needed
1. Finish Step 30 quality work: accessibility semantics, mobile navigation, layout overflow, performance budgets, network fallbacks; validate in GitHub Actions and real browsers where available.
2. Step 31 static/deterministic regression: history and owner legacy, standings/playoff seed math, rivalry record reconciliation, trade trees (especially three-team trade), What-If and playoff simulations, links and content accuracy.
3. Build and test Firebase v2 Realtime Database rules **offline** with emulator: admins, owner IDs, anonymous, other owners, closed rounds, invalid winners, moderation, polls, and comments. Never replace production rules with the standalone v2-only fixture file.
4. Keep existing Google Firebase Auth verification page live and isolated. Maintain the secure role assignment utility under PR #20, but do not run any privileged commands without verified administrator credentials.
5. Keep the production merge gated by full regression, browser checks, verified league data, Firebase credentials and deployed rules. Keep a known-good rollback commit and do not touch live `rooms` or `book`.

## Monday — desktop/admin checkpoint
1. Use trusted desktop Google Cloud/Firebase admin login with correct project `cte-draft-central`, and verify the registered Google UID/email against Firebase Authentication.
2. Run the commissioner provisioning tool in **dry-run** mode; review target and existing claims. Only then apply in a trusted environment and verify claims via Admin SDK readback.
3. Preserve and back up **currently deployed** RTDB rules; compose v2 rules into them rather than overwriting legacy `rooms` and `book`.
4. Test candidate rules in emulator and, with approval/controlled release, deploy the merged rule set. Verify an outsider, anonymous account, league owner, and commissioner can access only intended resources.
5. Sign into CTE Network with a fresh Google ID token and verify member/admin role mapping and server-time locks; only then enable shared participation and finish release QA.

## Release gates and reporting
Track each task as **implemented / CI-tested / browser-tested / deployed / blocked**; these are different states. Never call development-only code live. Document the source branch and PR for changes. Stop on failed security tests, missing admin identity, bad historical reconciliation, mobile breakage, or uncertain production data. The site remains online on the established production branch until the entire release passes gates.

## Working branches
- Consolidated source: `release/cte-network-2-completion`.
- Accessibility/quality: `quality/cte-network-2-step-30` and draft PR #18.
- Trusted commissioner provisioning: `feature/cte-commissioner-claims-setup`, draft PR #20 (based on quality branch).
- iPhone-first Firebase rules QA: `quality/cte-network-2-mobile-prep`, draft PR #21 (based on PR #20).
- Isolated production-safe Google login smoke test: merged PR #19, **not** a production CTE 2.0 release.

## Known issue
The v2-only fixture `security/participation.rules.json` used `numChildren()`, which Realtime Database rules emulator rejected. Fix on PR #21 is **not yet a passed verification** until CI confirms. Offline fixture is not the current deployed Firebase rule set.
