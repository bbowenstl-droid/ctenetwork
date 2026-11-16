# Monday admin checkpoint — Firebase activation runbook
**Prepared:** 2026-11-15. **For:** Brendan, on a trusted desktop signed into the Google account that owns Firebase project `cte-draft-central`.
**Nothing here is automated.** Every write is a deliberate command you run. Stop at any failed check.

Estimated time: about 60–75 minutes, plus waiting for owners to sign in once.

## 0. Before you start
- Desktop browser + terminal (Cloud Shell from the Firebase/GCP console on desktop is fine).
- `git clone https://github.com/bbowenstl-droid/ctenetwork && cd ctenetwork && git checkout release/cte-network-2-completion`
- `pip install firebase-admin` and `gcloud auth application-default login` (your own Google account; no key files).
- Do **not** download service-account JSON keys. Do not paste tokens into chat, GitHub or the site.

## 0b. iPhone preview site (5 minutes, do first)
1. github.com/new → name `ctenetwork-preview`, **Public**, leave README/.gitignore/license **unchecked** → Create.
2. If the Claude GitHub app is limited to selected repositories: GitHub Settings → Applications → Claude → Configure → add `ctenetwork-preview`.
3. Tell Claude. Claude runs `tools/qa/make-preview.sh` (latest release build + red PREVIEW banner + noindex) and pushes it to the preview repo's `main`.
4. Repo Settings → Pages → Deploy from a branch → `main` / root → Save.
5. Run `IPHONE_CHECKLIST.md` on your phone at `https://bbowenstl-droid.github.io/ctenetwork-preview/`.
   Sportsbook and Draft Central there use the real database — don't bet or draft unless you mean it.
6. Delete the preview repo after release (Settings → Danger zone). Also delete branch `qa/baseline-predefer` in `ctenetwork`.

## 1. Back up the rules that are live today (no changes)
1. Firebase console → Realtime Database → **Rules** tab.
2. Copy the whole editor contents into `deployed-rules.json` (keep it out of git; `deployed-*.json` is not committed).
3. Note the time. This file is the rollback.

## 2. Build the candidate rule set (local only)
```bash
python3 tools/stage-v2-firebase-rules.py --deployed deployed-rules.json --output candidate-rules.json
```
- It refuses if the live rules lack `rooms`/`book`, already have `v2`, or grant broad root access. If it refuses, stop and send me the message (not the file).
- `candidate-rules.json` = your live rules for `rooms` and `book` (identical content; the script re-sorts keys and re-indents, and asserts equality), plus the tested `v2` block.
- If your console rules contain `//` comments, the script stops with a JSON error. Remove the comments from your copy and rerun.

## 3. Test the candidate in the emulator
```bash
cp candidate-rules.json /tmp/candidate.json
npm ci --prefix tests/security
CTE_RULES=/tmp/candidate.json npm test --prefix tests/security
```
Must print `PASS participation rules …`. (The CI already runs this against the v2 fixture; this run proves the merged file.)

## 4. Commissioner claim (you)
1. Visit `https://bbowenstl-droid.github.io/ctenetwork/auth-smoke-test.html` and sign in with Google once (creates/updates your Auth user).
2. Firebase console → Authentication → Users: copy **your** UID and confirm the email.
3. Dry run, read the output, then apply:
```bash
python3 tools/assign-commissioner-claims.py --uid "<UID>" --expected-email "<email>"
python3 tools/assign-commissioner-claims.py --uid "<UID>" --expected-email "<email>" --apply --confirm-uid "<UID>"
```
Expect `SUCCESS … verified via Firebase Admin SDK`.

## 5. Owner claims (the other 11)
Each owner signs in once at the auth smoke page (it only signs in; it never touches the database). Then:
```bash
python3 tools/assign-owner-claims.py --list            # who has signed in, who is mapped
python3 tools/assign-owner-claims.py --uid "<UID>" --expected-email "<their email>" --owner jacob
python3 tools/assign-owner-claims.py --uid "<UID>" --expected-email "<their email>" --owner jacob --apply --confirm-uid "<UID>"
```
- Only the 12 active 2026 owners are accepted; Jeremy and Tyler are refused.
- Refuses duplicates and re-mapping. Never touches the commissioner flag.
- Confirm each email with the owner directly (text them), not from a name match.
- Owners who aren't ready can be added later; the features work for whoever is mapped.

## 6. Deploy the rules (the one production write)
Firebase console → Realtime Database → Rules → paste `candidate-rules.json` → **Publish**.
Immediately check Draft Central and the Sportsbook still load and save as before (they use `rooms` and `book`).
**Rollback:** paste `deployed-rules.json` back and Publish.

## 7. Live security checks (with me)
Tell me when 6 is done. I'll run the live checklist with you and record results in PROGRESS.md:
anonymous denied · signed-in unmapped account denied · owner can save own pick, cannot edit another's · picks hidden until lock · lock blocks edits · commissioner-only round/result/poll · votes one per owner · lounge size limit and moderation · reload and second-device persistence.

## 8. Enable features
Only after 7 passes: set `window.CTE2_CLOUD_ENABLED = true` in `data/cte-participation-config.js` on the release branch (I'll do this commit). It ships with the release merge, not before.

## If anything fails
Stop. Don't retry writes. Roll back rules from step 1 if step 6 was done. Send me the error text.
