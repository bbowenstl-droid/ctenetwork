"""Offline tests: commissioner provisioning must never touch live Firebase."""
import importlib.util
import io
import sys
import types
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("claims", "tools/assign-commissioner-claims.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class User:
    uid = "test-owner-uid"
    email = "commissioner@example.test"
    disabled = False
    provider_data = [types.SimpleNamespace(provider_id="google.com")]
    custom_claims = {"keep": "existing-value"}


class ClaimTests(unittest.TestCase):
    def setUp(self):
        self.user = User()
        self.user.custom_claims = {"keep": "existing-value"}
        self.calls = []
        fake_auth = types.ModuleType("firebase_admin.auth")
        fake_auth.get_user = lambda uid, app=None: self.user
        fake_auth.set_custom_user_claims = self._set
        self.others = []
        fake_auth.list_users = lambda app=None: types.SimpleNamespace(users=[self.user] + self.others, get_next_page=lambda: None)
        fake_firebase = types.ModuleType("firebase_admin")
        fake_firebase.initialize_app = lambda **kw: "isolated-test-app"
        fake_firebase.auth = fake_auth
        self.mods = patch.dict(sys.modules, {"firebase_admin": fake_firebase, "firebase_admin.auth": fake_auth})
        self.mods.start()

    def test_refuses_second_commissioner(self):
        other = types.SimpleNamespace(uid="someone-else", email="other@example.test", custom_claims={"commissioner": True})
        self.others = [other]
        code, out, err = self.run_cmd("--uid", User.uid, "--expected-email", User.email, "--apply", "--confirm-uid", User.uid)
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_refuses_remap_of_other_owner(self):
        self.user.custom_claims = {"ownerId": "jacob"}
        code, out, err = self.run_cmd("--uid", User.uid, "--expected-email", User.email, "--apply", "--confirm-uid", User.uid)
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def tearDown(self):
        self.mods.stop()

    def _set(self, uid, claims, app=None):
        self.calls.append((uid, claims))
        self.user.custom_claims = claims

    def run_cmd(self, *args):
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            with self.assertRaises(SystemExit) as ctx:
                # argparse errors exit; successful main returns without raising
                result = module.main(list(args))
                raise SystemExit(result)
        return ctx.exception.code, stdout.getvalue(), stderr.getvalue()

    def test_dry_run_no_mutations(self):
        code, out, _ = self.run_cmd("--uid", self.user.uid, "--expected-email", self.user.email)
        self.assertEqual(code, 0)
        self.assertIn("DRY RUN ONLY", out)
        self.assertEqual(self.calls, [])

    def test_apply_requires_second_uid_confirmation(self):
        code, _, err = self.run_cmd("--uid", self.user.uid, "--expected-email", self.user.email, "--apply")
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_apply_preserves_claims_and_readback(self):
        args = ("--uid", self.user.uid, "--expected-email", self.user.email,
                "--apply", "--confirm-uid", self.user.uid)
        code, out, _ = self.run_cmd(*args)
        self.assertEqual(code, 0)
        self.assertIn("SUCCESS", out)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.calls[0][1], {"keep": "existing-value", "ownerId": "brendan", "commissioner": True})

    def test_email_mismatch_fails_closed(self):
        code, _, _ = self.run_cmd("--uid", self.user.uid, "--expected-email", "wrong@example.test", "--apply", "--confirm-uid", self.user.uid)
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_non_google_account_fails_closed(self):
        self.user.provider_data = [types.SimpleNamespace(provider_id="password")]
        code, _, _ = self.run_cmd("--uid", self.user.uid, "--expected-email", self.user.email, "--apply", "--confirm-uid", self.user.uid)
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_disabled_account_fails_closed(self):
        self.user.disabled = True
        code, _, _ = self.run_cmd("--uid", self.user.uid, "--expected-email", self.user.email, "--apply", "--confirm-uid", self.user.uid)
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_existing_claim_size_guard(self):
        self.user.custom_claims = {"large": "x" * 1100}
        code, _, _ = self.run_cmd("--uid", self.user.uid, "--expected-email", self.user.email, "--apply", "--confirm-uid", self.user.uid)
        self.assertEqual(code, 2)
        self.assertEqual(self.calls, [])

    def test_missing_admin_credentials_fails(self):
        import firebase_admin
        with patch.object(firebase_admin, "initialize_app", side_effect=RuntimeError("no credentials")):
            code, _, _ = self.run_cmd("--uid", self.user.uid, "--expected-email", self.user.email)
        self.assertEqual(code, 1)
        self.assertEqual(self.calls, [])


if __name__ == "__main__":
    unittest.main()
