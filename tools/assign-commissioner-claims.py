#!/usr/bin/env python3
"""Assign CTE commissioner custom claims with Firebase Admin credentials.

Read-only by default. Does NOT deploy Firebase rules, create users, or touch RTDB.
Run ONLY in a trusted admin environment with preconfigured Application Default
Credentials. Never commit service-account private keys or authentication tokens.
"""
import argparse
import sys

PROJECT = "cte-draft-central"
OWNER = "brendan"


def desired_claims(existing):
    claims = dict(existing or {})
    claims.update({"ownerId": OWNER, "commissioner": True})
    return claims


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--uid", required=True, help="Existing Firebase Authentication user's UID")
    p.add_argument("--expected-email", required=True, help="Expected Google account email, checked against Firebase Auth")
    p.add_argument("--apply", action="store_true", help="Write claims (default is read-only)")
    p.add_argument("--confirm-uid", help="Second exact UID confirmation required with --apply")
    args = p.parse_args(argv)

    if not args.uid.strip() or not args.expected_email.strip():
        p.error("UID and expected email must not be empty")
    if args.apply and args.confirm_uid != args.uid:
        p.error("--apply requires --confirm-uid matching --uid exactly")

    try:
        import firebase_admin
        from firebase_admin import auth
        from google.auth.exceptions import DefaultCredentialsError
    except ImportError as e:
        p.error(f"Install firebase-admin in a trusted administrator environment: {e}")

    # The projectId alone does not confer credentials or authorization.
    # ADC must already be configured securely and have Firebase Auth admin access.
    try:
        app = firebase_admin.initialize_app(options={"projectId": PROJECT}, name="cte-commissioner-claims")
        user = auth.get_user(args.uid, app=app)
    except Exception as e:
        print(f"Could not verify Firebase user in project {PROJECT}: {type(e).__name__}: {e}", file=sys.stderr)
        return 1

    if (user.email or "").casefold() != args.expected_email.casefold():
        print("ABORT: Firebase email does not match --expected-email.", file=sys.stderr)
        return 2
    if not user.provider_data or not any(provider.provider_id == "google.com" for provider in user.provider_data):
        print("ABORT: Target user is not linked to Google authentication.", file=sys.stderr)
        return 2
    if user.disabled:
        print("ABORT: Target Firebase account is disabled.", file=sys.stderr)
        return 2

    existing = user.custom_claims or {}
    next_claims = desired_claims(existing)
    if len(str(next_claims).encode("utf-8")) > 900:
        print("ABORT: Custom claims may exceed Firebase's 1000-byte limit.", file=sys.stderr)
        return 2
    print(f"Firebase project: {PROJECT}")
    print(f"Verified Google UID: {user.uid}")
    print(f"Verified account email: {user.email}")
    print(f"Current role: commissioner={existing.get('commissioner', None)!r}, ownerId={existing.get('ownerId', None)!r}")
    print(f"Requested role: commissioner=True, ownerId={OWNER!r}")
    print(f"Preserving other custom claim keys: {sorted(set(existing)-{'commissioner','ownerId'})}")

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
    print("SUCCESS: commissioner claims saved and verified via Firebase Admin SDK.")
    print("The user must refresh their ID token or sign out and back in to see the new claims.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
