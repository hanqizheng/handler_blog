import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
IMAGE = "ghcr.io/hanqizheng/handler_blog:" + "a" * 40
spec = importlib.util.spec_from_file_location("public_config", REPO / "scripts/read-build-config.py")
public_config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(public_config)

MOCK = r'''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
args = sys.argv[1:]
command = Path(sys.argv[0]).name
scenario = os.environ.get("SCENARIO", "success")
state_file = Path(os.environ["STATE_FILE"])
state = json.loads(state_file.read_text())
with open(os.environ["CALL_LOG"], "a") as f:
    f.write(json.dumps([command, args, os.environ.get("HANDLER_BLOG_IMAGE", "")]) + "\n")
def finish(code=0, output=""):
    state_file.write_text(json.dumps(state))
    if output: print(output)
    sys.exit(code)
if command == "ss":
    if scenario == "port-check-fails": finish(1)
    finish(output="LISTEN" if scenario == "occupied-probe" and "8285" in args[-1] else "")
if command == "flock": finish(1 if scenario == "locked" else 0)
if command == "sleep": finish()
if command == "curl":
    is_probe = ":8285/" in args[-1]
    fails = scenario == "probe-fails" and is_probe
    fails |= scenario == "homepage-fails" and is_probe and args[-1].endswith("/zh-CN")
    fails |= scenario == "production-fails" and not is_probe and state.get("image") == os.environ["HANDLER_BLOG_IMAGE"] and state.get("image", "").startswith("ghcr.io/")
    finish(1 if fails else 0)
if args[:2] == ["image", "inspect"]: finish(1 if scenario == "image-missing" else 0)
if args[:2] == ["image", "tag"]: finish()
if args and args[0] == "inspect":
    name = args[-1]
    exists = state.get("probe", False) if name.startswith("handler-blog-probe-") else state.get("app", True)
    if not exists: finish(1)
    if "--format" in args:
        template = args[args.index("--format") + 1]
        if "Labels" in template: finish(output="foreign" if scenario == "foreign" else "handler-blog")
        if "Running" in template: finish(output="true")
        finish(output="sha256:" + "b" * 64)
    finish(output="{}")
if args and args[0] == "rm":
    if args[-1].startswith("handler-blog-probe-"): state["probe"] = False
    else: state["app"] = False
    finish()
if args and args[0] == "compose":
    operation = args[args.index("--env-file") + 2]
    if operation == "config": finish()
    if operation == "run":
        if "scripts/check-runtime-env.mjs" in args: finish(1 if scenario == "env-check-fails" else 0)
        if "--name" in args:
            state["probe"] = True
            finish()
        finish(1 if scenario == "migration-fails" else 0)
    if operation == "up":
        state.update(app=True, image=os.environ["HANDLER_BLOG_IMAGE"])
        finish(1 if scenario == "promotion-command-fails" and state["image"].startswith("ghcr.io/") else 0)
finish(1)
'''


class PublicConfigurationTests(unittest.TestCase):
    def test_public_configuration_and_override(self):
        result = public_config.build_arguments((REPO / "deploy/build.env").read_text(), {"NEXT_PUBLIC_SITE_URL": "https://example.com"})
        self.assertIn("NEXT_PUBLIC_SITE_URL=https://example.com", result)
        self.assertNotIn("ACCESS_KEY", result)

    def test_private_variable_is_rejected_without_exposing_value(self):
        source = (REPO / "deploy/build.env").read_text() + "\nDATABASE_URL=PRIVATE_SENTINEL\n"
        with self.assertRaises(ValueError) as error:
            public_config.build_arguments(source, {})
        self.assertNotIn("PRIVATE_SENTINEL", str(error.exception))

    def test_multiline_override_is_rejected(self):
        with self.assertRaises(ValueError):
            public_config.build_arguments((REPO / "deploy/build.env").read_text(), {"NEXT_PUBLIC_SITE_URL": "a\nb"})


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "envs").mkdir()
        (self.root / "deploy").mkdir()
        self.env_file = self.root / "envs/app.env"
        self.env_text = f'DATABASE_URL=mysql://test:test@localhost/blog\nNEVER_EXECUTE=$(touch "{self.root}/executed")\n'
        self.env_file.write_text(self.env_text)
        (self.root / "deploy/docker-compose.yml").write_text("services: {}\n")
        self.mock_bin = self.root / "bin"
        self.mock_bin.mkdir()
        for name in ("docker", "curl", "flock", "ss", "sleep"):
            p = self.mock_bin / name
            p.write_text(MOCK)
            p.chmod(0o755)
        self.state = self.root / "state.json"
        self.log = self.root / "calls.jsonl"

    def deploy(self, scenario="success", previous=True, migrations=False, backup=False):
        self.state.write_text(json.dumps({"app": previous, "probe": False}))
        environment = dict(os.environ, PATH=str(self.mock_bin) + os.pathsep + os.environ["PATH"],
            HANDLER_BLOG_ROOT=str(self.root), STATE_FILE=str(self.state), CALL_LOG=str(self.log),
            SCENARIO=scenario, HEALTH_ATTEMPTS="1", HEALTH_INTERVAL="0", RUN_MIGRATIONS="1" if migrations else "0")
        if backup:
            snapshot = self.root / "snapshot.sql"
            snapshot.write_text("-- test fixture snapshot\n")
            environment["MIGRATION_BACKUP_FILE"] = str(snapshot)
        result = subprocess.run(["bash", str(REPO / "scripts/server/deploy-on-server.sh"), IMAGE], env=environment, capture_output=True, text=True)
        self.assertEqual(self.env_file.read_text(), self.env_text)
        self.assertFalse((self.root / "executed").exists())
        self.assertNotIn("mysql://", result.stdout + result.stderr)
        return result, json.loads(self.state.read_text())

    def calls(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()]

    def test_success_promotes_and_records_image(self):
        result, state = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(state["image"], IMAGE)
        self.assertFalse(state["probe"])
        self.assertEqual((self.root / ".current_image").read_text().strip(), IMAGE)
        self.assertTrue((self.root / ".previous_image").read_text().startswith("handler-blog-rollback:"))
        page_checks = [call for call in self.calls() if call[0] == "curl" and call[1][-1].endswith("/zh-CN")]
        self.assertTrue(page_checks)
        self.assertTrue(all("-fsSL" in call[1] and "--max-redirs" in call[1] for call in page_checks))

    def test_candidate_failure_does_not_replace_current_app(self):
        result, state = self.deploy("probe-fails")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(state["app"])
        self.assertFalse(state["probe"])
        self.assertFalse(any("up" in call[1] for call in self.calls()))

    def test_failed_promotion_restores_previous_image(self):
        result, state = self.deploy("production-fails")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(state["image"].startswith("handler-blog-rollback:"))
        self.assertFalse((self.root / ".current_image").exists())

    def test_failed_up_command_also_restores_previous_image(self):
        result, state = self.deploy("promotion-command-fails")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(state["image"].startswith("handler-blog-rollback:"))

    def test_failed_first_deployment_removes_only_new_app(self):
        result, state = self.deploy("production-fails", previous=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(state["app"])
        self.assertNotIn("pm2", str(self.calls()))

    def test_migrations_require_backup(self):
        result, _ = self.deploy(migrations=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("MIGRATION_BACKUP_FILE", result.stderr)
        self.assertFalse(any("run" in call[1] for call in self.calls()))

    def test_failed_migration_keeps_previous_app(self):
        result, state = self.deploy("migration-fails", migrations=True, backup=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(state["app"])
        self.assertFalse(any("up" in call[1] for call in self.calls()))

    def test_occupied_probe_port_aborts_before_replacement(self):
        result, _ = self.deploy("occupied-probe")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any("up" in call[1] for call in self.calls()))

    def test_foreign_container_is_not_replaced(self):
        result, _ = self.deploy("foreign")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any("up" in call[1] for call in self.calls()))

    def test_failed_port_inspection_aborts_before_replacement(self):
        result, _ = self.deploy("port-check-fails")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any("run" in call[1] or "up" in call[1] for call in self.calls()))

    def test_healthy_database_with_failed_homepage_keeps_current_app(self):
        result, state = self.deploy("homepage-fails")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(state["app"])
        self.assertFalse(state["probe"])
        self.assertFalse(any("up" in call[1] for call in self.calls()))

    def test_failed_runtime_configuration_keeps_current_app(self):
        result, state = self.deploy("env-check-fails")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(state["app"])
        self.assertFalse(state["probe"])
        self.assertFalse(any("up" in call[1] for call in self.calls()))

    def test_missing_image_aborts(self):
        result, _ = self.deploy("image-missing")
        self.assertNotEqual(result.returncode, 0)

    def test_concurrent_deploy_is_rejected(self):
        result, _ = self.deploy("locked")
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
