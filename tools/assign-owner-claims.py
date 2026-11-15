#!/usr/bin/env python3
"""Map a verified Google account to one active CTE owner (ownerId custom claim).

Companion to assign-commissioner-claims.py for the other league owners. Without
an ownerId claim an owner cannot use shared Pick'em, polls or the Lounge.

Read-only by default. Does NOT deploy rules, create users, or touch RTDB.
Run ONLY in a trusted admin environment with preconfigured Application Default
Credentials. Never commit service-account keys or tokens.

Modes
  --list                       read-only: Google-linked users and their current ownerId
  --uid U --expected-email E --owner O
                               dry run: verify and show the change
  ... --apply --confirm-uid U  write, then verify by Admin SDK readback

Safety
  * owner must be one of the 12 active 2026 owners (former owners are refused)
  * refuses if another account already holds that ownerId
  * refuses to re-map an account that already has a different ownerId
  * never grants or removes commissioner; refuses commissioner accounts
    (use assign-commissioner-claims.py for Brendan)
"""
import argparse
import json
import sys

PROJECT = "cte-draft-central"
ACTIVE_OWNERS = ("brendan", "troy", "mike", "jerry", "dan", "cotton",
                 "brett", "jacob", "jesse", "elijah", "isaiah", "carter")


def iter_users(auth, app):
    page = auth.list_users(app=app)
    while page:
        for user in page.users:
            yield user
        page = page.get_next_page()


def is_google(user):
    return any(p.provider_id == "google.com" for p in (user.provider_data or []))


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--list", action="store_true", help="Read-only listing of Google-linked users and ownerId claims")
    p.add_argument("--uid", help="Existing Firebase Authentication user's UID")
    p.add_argument("--expected-email", help="Expected Google account email, checked against Firebase Auth")
    p.add_argument("--owner", help="Active CTE owner id: " + ", ".join(ACTIVE_OWNERS))
    p.add_argument("--apply", action="store_true", help="Write the claim (default is read-only)")
    p.add_argument("--confirm-uid", help="Second exact UID confirmation required with --apply")
    args = p.parse_args(argv)

    if not args.list:
        if not (args.uid and args.uid.strip() and args.expected_email and args.expected_email.strip() and args.owner):
            p.error("--uid, --expected-email and --owner are required (or use --list)")
        if args.owner not in ACTIVE_OWNERS:
            p.error(f"--owner must be an active 2026 owner; got {args.owner!r}")
        if args.owner == "brendan":
            p.error("Brendan is provisioned with assign-commissioner-claims.py")
        if args.apply and args.confirm_uid != args.uid:
            p.error("--apply requires --confirm-uid matching --uid exactly")

    try:
        import firebase_admin
        from firebase_admin import auth
    except ImportError as e:
        p.error(f"Install firebase-admin in a trusted administrator environment: {e}")

    try:
        app = firebase_admin.initialize_app(options={"projectId": PROJECT}, name="cte-owner-claims")
    except Exception as e:
        print(f"Could not initialise Firebase Admin for {PROJECT}: {type(e).__name__}: {e}", file=sys.stderr)
        return 1

    try:
        users = list(iter_users(auth, app))
    except Exception as e:
        print(f"Could not list Firebase users in {PROJECT}: {type(e).__name__}: {e}", file=sys.stderr)
        return 1

    if args.list:
        print(f"Firebase project: {PROJECT} — Google-linked accounts (read-only)")
        held = {}
        for u in users:
            if not is_google(u):
                continue
            c = u.custom_claims or {}
            held.setdefault(c.get("ownerId"), []).append(u.email)
            print(f"  {u.uid}  {u.email or '-'}  ownerId={c.get('ownerId')!r}  commissioner={c.get('commissioner', False)!r}  disabled={u.disabled}")
        missing = [o for o in ACTIVE_OWNERS if o not in held]
        print("Owners without an account: " + (", ".join(missing) if missing else "none"))
        dupes = {k: v for k, v in held.items() if k and len(v) > 1}
        if dupes:
            print("WARNING duplicate ownerId claims: " + json.dumps(dupes))
        return 0

    user = next((u for u in users if u.uid == args.uid), None)
    if user is None:
        print("ABORT: UID not found in Firebase Authentication.", file=sys.stderr)
        return 2
    if (user.email or "").casefold() != args.expected_email.casefold():
        print("ABORT: Firebase email does not match --expected-email.", file=sys.stderr)
        return 2
    if not is_google(user):
        print("ABORT: Target user is not linked to Google authentication.", file=sys.stderr)
        return 2
    if user.disabled:
        print("ABORT: Target Firebase account is disabled.", file=sys.stderr)
        return 2
    existing = dict(user.custom_claims or {})
    if existing.get("commissioner") is True:
        print("ABORT: Target account holds the commissioner claim; manage it with assign-commissioner-claims.py.", file=sys.stderr)
        return 2
    if existing.get("ownerId") not in (None, args.owner):
        print(f"ABORT: Account already mapped to {existing.get('ownerId')!r}; un-map deliberately before re-mapping.", file=sys.stderr)
        return 2
    holders = [u for u in users if u.uid != user.uid and (u.custom_claims or {}).get("ownerId") == args.owner]
    if holders:
        print(f"ABORT: ownerId {args.owner!r} already held by {', '.join(h.email or h.uid for h in holders)}.", file=sys.stderr)
        return 2

    next_claims = dict(existing)
    next_claims["ownerId"] = args.owner
    if len(json.dumps(next_claims, separators=(",", ":")).encode("utf-8")) > 1000:
        print("ABORT: Custom claims may exceed Firebase's 1000-byte limit.", file=sys.stderr)
        return 2
    print(f"Firebase project: {PROJECT}")
    print(f"Verified Google UID: {user.uid}")
    print(f"Verified account email: {user.email}")
    print(f"Current ownerId: {existing.get('ownerId')!r}  ->  requested ownerId: {args.owner!r} (commissioner unchanged)")
    print(f"Preserving other custom claim keys: {sorted(set(existing) - {'ownerId'})}")
    if not args.apply:
        print("DRY RUN ONLY — nothing changed. Apply requires --apply --confirm-uid <UID>.")
        return 0
    try:
        auth.set_custom_user_claims(user.uid, next_claims, app=app)
        verified = auth.get_user(user.uid, app=app).custom_claims or {}
    except Exception as e:
        print(f"Claims write/readback failed: {type(e).__name__}: {e}", file=sys.stderr)
        return 1
    if verified != next_claims:
        print("FAIL: Post-write claims do not match requested claims.", file=sys.stderr)
        return 1
    print(f"SUCCESS: ownerId={args.owner!r} saved and verified via Firebase Admin SDK.")
    print("The owner must sign out and back in (or refresh their ID token) to pick up the claim.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
