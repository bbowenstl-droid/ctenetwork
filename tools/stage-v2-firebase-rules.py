#!/usr/bin/env python3
"""Safely stage v2 Firebase RTDB rules beside existing legacy rules.

This tool NEVER calls Firebase or deploys rules. Feed it a downloaded export
of CURRENTLY DEPLOYED rules, not the outdated repository rules. Produces a
candidate JSON file for review and emulator testing.
"""
import argparse
import copy
import json
from pathlib import Path
import sys


def fail(message):
    raise ValueError(message)


def combine(deployed, v2_fixture):
    if not isinstance(deployed, dict) or not isinstance(deployed.get("rules"), dict):
        fail("Deployed rules must be a Firebase RTDB JSON object with a 'rules' object")
    if not isinstance(v2_fixture, dict) or not isinstance(v2_fixture.get("rules"), dict):
        fail("v2 fixture must contain a 'rules' object")
    old = deployed["rules"]
    new = v2_fixture["rules"]
    if "v2" in old:
        fail("Deployed rules already have a v2 path; manual inspection/migration required")
    if any(k in new for k in ("rooms", "book")):
        fail("v2 fixture cannot supply or replace legacy rooms/book")
    if not isinstance(new.get("v2"), dict):
        fail("v2 fixture must provide an object at rules.v2")
    if new.get(".read") not in (False, None) or new.get(".write") not in (False, None):
        fail("v2 fixture must not allow global access")
    if old.get(".read") not in (None, False) or old.get(".write") not in (None, False):
        fail("Deployed root has broad read/write privileges that can bypass child rules")
    if "rooms" not in old or "book" not in old:
        fail("Cannot confirm both legacy rooms and book paths; manual review required")
    merged = copy.deepcopy(deployed)
    merged["rules"]["v2"] = copy.deepcopy(new["v2"])
    for key in ("rooms", "book"):
        if merged["rules"][key] != old[key]:
            fail("Legacy data security changed: " + key)
    return merged


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--deployed", type=Path, required=True, help="JSON export of actual deployed RTDB security rules")
    p.add_argument("--v2", type=Path, default=Path("security/participation.rules.json"))
    p.add_argument("--output", type=Path, required=True, help="Where to write locally reviewed candidate")
    args = p.parse_args(argv)
    if args.deployed.resolve() == args.output.resolve() or args.v2.resolve() == args.output.resolve():
        p.error("Output path must not overwrite either input")
    if args.output.exists():
        p.error("Output exists; refusing to overwrite without manual review")
    try:
        deployed = json.loads(args.deployed.read_text(encoding="utf-8"))
        fixture = json.loads(args.v2.read_text(encoding="utf-8"))
        merged = combine(deployed, fixture)
        args.output.write_text(json.dumps(merged, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as e:
        print("ABORT: " + str(e), file=sys.stderr)
        return 1
    print("STAGED ONLY: saved a candidate rules JSON; NO Firebase deployment occurred.")
    print("Verify existing rooms/book behavior and owner/commissioner permissions in Firebase emulator before any deployment.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
