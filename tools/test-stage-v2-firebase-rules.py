import importlib.util
import copy
import unittest

spec = importlib.util.spec_from_file_location("stage_v2", "tools/stage-v2-firebase-rules.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class RuleMergeTests(unittest.TestCase):
    def setUp(self):
        self.deployed = {"rules": {
            "rooms": {"$room": {".read": "auth != null", ".write": "auth != null"}},
            "book": {"$season": {".read": "auth != null", "pins": {"$owner": {".write": "auth.uid === 'legacy-id'"}}}},
        }}
        self.fixture = {"rules": {".read": False, ".write": False, "v2": {"rounds": {".read": "auth.token.ownerId != null"}}}}

    def test_preserves_legacy_and_inserts_v2(self):
        original = copy.deepcopy(self.deployed)
        result = mod.combine(self.deployed, self.fixture)
        self.assertEqual(result["rules"]["rooms"], original["rules"]["rooms"])
        self.assertEqual(result["rules"]["book"], original["rules"]["book"])
        self.assertEqual(result["rules"]["v2"], self.fixture["rules"]["v2"])
        self.assertEqual(self.deployed, original)

    def test_declines_existing_v2_without_review(self):
        self.deployed["rules"]["v2"] = {"comments": {}}
        with self.assertRaisesRegex(ValueError, "already have a v2"):
            mod.combine(self.deployed, self.fixture)

    def test_refuses_global_deployed_read(self):
        self.deployed["rules"][".read"] = True
        with self.assertRaisesRegex(ValueError, "broad"):
            mod.combine(self.deployed, self.fixture)

    def test_refuses_global_deployed_write(self):
        self.deployed["rules"][".write"] = "auth != null"
        with self.assertRaisesRegex(ValueError, "broad"):
            mod.combine(self.deployed, self.fixture)

    def test_refuses_missing_legacy_path(self):
        del self.deployed["rules"]["book"]
        with self.assertRaisesRegex(ValueError, "both legacy"):
            mod.combine(self.deployed, self.fixture)

    def test_refuses_v2_that_redefines_book(self):
        self.fixture["rules"]["book"] = {}
        with self.assertRaisesRegex(ValueError, "legacy"):
            mod.combine(self.deployed, self.fixture)

    def test_refuses_global_fixture_allow(self):
        self.fixture["rules"][".read"] = True
        with self.assertRaisesRegex(ValueError, "global"):
            mod.combine(self.deployed, self.fixture)

    def test_refuses_malformed_input(self):
        with self.assertRaisesRegex(ValueError, "object"):
            mod.combine([], self.fixture)

if __name__ == "__main__":
    unittest.main()
