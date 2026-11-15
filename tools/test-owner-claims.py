"""Offline tests: owner provisioning must never touch live Firebase and must fail closed."""
import importlib.util
import io
import sys
import types
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("owner_claims", "tools/assign-owner-claims.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def user(uid, email, claims=None, provider="google.com", disabled=False):
    return types.SimpleNamespace(uid=uid, email=email, custom_claims=dict(claims or {}), disabled=disabled,
                                 provider_data=[types.SimpleNamespace(provider_id=provider)])


class Page:
    def __init__(self, users):
        self.users = users

    def get_next_page(self):
        return None


class OwnerClaimTests(unittest.TestCase):
    def setUp(self):
        self.users = [
            user("u-jacob", "jacob@example.test"),
            user("u-brendan", "brendan@example.test", {"ownerId": "brendan", "commissioner": True}),
            user("u-troy", "troy@example.test", {"ownerId": "troy", "keep": 1}),
        ]
        self.calls = []
        fake_auth = types.ModuleType("firebase_admin.auth")
        fake_auth.list_users = lambda app=None: Page(self.users)
        fake_auth.get_user = lambda uid, app=None: next(u for u in self.users if u.uid == uid)
        fake_auth.set_custom_user_claims = self._set
        fake_fb = types.ModuleType("firebase_admin")
        fake_fb.initialize_app = lambda **kw: "isolated-test-app"
        fake_fb.auth = fake_auth
        self.mods = patch.dict(sys.modules, {"firebase_admin": fake_fb, "firebase_admin.auth": fake_auth})
        self.mods.start()

    def tearDown(self):
        self.mods.stop()

    def _set(self, uid, claims, app=None):
        self.calls.append((uid, claims))
        next(u for u in self.users if u.uid == uid).custom_claims = claims

    def run_cmd(self, *args):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            with self.assertRaises(SystemExit) as ctx:
                raise SystemExit(module.main(list(args)))
        return ctx.exception.code, out.getvalue(), err.getvalue()

    def base(self, uid="u-jacob", email="jacob@example.test", owner="jacob"):
        return ["--uid", uid, "--expected-email", email, "--owner", owner]

    def test_list_is_read_only(self):
        code, out, _ = self.run_cmd("--list")
        self.assertEqual(code, 0)
        self.assertIn("Owners without an account", out)
        self.assertEqual(self.calls, [])

    def test_dry_run_default(self):
        code, out, _ = self.run_cmd(*self.base())
        self.assertEqual(code, 0)
        self.assertIn("DRY RUN ONLY", out)
        self.assertEqual(self.calls, [])

    def test_apply_needs_confirmation(self):
        code, _, _ = self.run_cmd(*self.base(), "--apply")
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_apply_sets_owner_only_and_reads_back(self):
        code, out, _ = self.run_cmd(*self.base(), "--apply", "--confirm-uid", "u-jacob")
        self.assertEqual(code, 0)
        self.assertIn("SUCCESS", out)
        self.assertEqual(self.calls, [("u-jacob", {"ownerId": "jacob"})])
        self.assertNotIn("commissioner", self.calls[0][1])

    def test_former_owner_refused(self):
        for former in ("jeremy", "tyler"):
            code, _, _ = self.run_cmd(*self.base(owner=former), "--apply", "--confirm-uid", "u-jacob")
            self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_brendan_routed_to_commissioner_tool(self):
        code, _, _ = self.run_cmd(*self.base(owner="brendan"))
        self.assertEqual(code, 2)

    def test_duplicate_owner_refused(self):
        code, _, err = self.run_cmd(*self.base(owner="troy"), "--apply", "--confirm-uid", "u-jacob")
        self.assertEqual(code, 2)
        self.assertIn("already held", err)
        self.assertEqual(self.calls, [])

    def test_remap_refused(self):
        code, _, err = self.run_cmd(*self.base(uid="u-troy", email="troy@example.test", owner="mike"), "--apply", "--confirm-uid", "u-troy")
        self.assertEqual(code, 2)
        self.assertIn("already mapped", err)

    def test_commissioner_account_refused(self):
        code, _, _ = self.run_cmd(*self.base(uid="u-brendan", email="brendan@example.test", owner="mike"), "--apply", "--confirm-uid", "u-brendan")
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_email_mismatch_and_non_google_and_disabled(self):
        self.assertEqual(self.run_cmd(*self.base(email="x@example.test"))[0], 2)
        self.users[0].provider_data = [types.SimpleNamespace(provider_id="password")]
        self.assertEqual(self.run_cmd(*self.base())[0], 2)
        self.users[0].provider_data = [types.SimpleNamespace(provider_id="google.com")]
        self.users[0].disabled = True
        self.assertEqual(self.run_cmd(*self.base())[0], 2)
        self.assertEqual(self.calls, [])

    def test_idempotent_same_owner_preserves_other_claims(self):
        code, _, _ = self.run_cmd(*self.base(uid="u-troy", email="troy@example.test", owner="troy"), "--apply", "--confirm-uid", "u-troy")
        self.assertEqual(code, 0)
        self.assertEqual(self.calls, [("u-troy", {"ownerId": "troy", "keep": 1})])


if __name__ == "__main__":
    unittest.main()
