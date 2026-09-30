#!/usr/bin/env python3
"""Copy Software Engineering Workbench surfaces into each open workspace.

Reads Cursor hook JSON from stdin. Writes {} to stdout. Never copies
*.canvas.data.json (those files are per workspace).

The agent rule goes to the user rules folder, not into the workspace, so
that no product repo can commit it.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

SOURCE_ROOT = Path.home() / "Projects" / "software-engineering-workbench"
CANVAS_NAME = "workbench.canvas.tsx"
RULE_NAME = "workbench-canvas.mdc"
USER_RULES_DIR = Path.home() / ".cursor" / "rules"


def cursor_project_dir(workspace_root: str) -> Path:
    encoded = workspace_root.lstrip("/").replace("/", "-")
    return Path.home() / ".cursor" / "projects" / encoded


def atomic_copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        dir=destination.parent,
        prefix=f".{destination.name}.",
        delete=False,
    ) as handle:
        temp_path = Path(handle.name)
    try:
        shutil.copy2(source, temp_path)
        os.replace(temp_path, destination)
    except Exception:
        temp_path.unlink(missing_ok=True)
        raise


def sync_workspace(workspace_root: str) -> None:
    canvas_source = SOURCE_ROOT / CANVAS_NAME
    if not canvas_source.is_file():
        return

    canvases_dir = cursor_project_dir(workspace_root) / "canvases"
    atomic_copy(canvas_source, canvases_dir / CANVAS_NAME)
    remove_legacy_project_rule(workspace_root)


def remove_legacy_project_rule(workspace_root: str) -> None:
    # Earlier versions wrote the rule into the workspace. Remove that copy so
    # it cannot be committed to a product repo.
    legacy_rule = Path(workspace_root) / ".cursor" / "rules" / RULE_NAME
    legacy_rule.unlink(missing_ok=True)


def sync_user_rule() -> None:
    rule_source = SOURCE_ROOT / "rules" / RULE_NAME
    if rule_source.is_file():
        atomic_copy(rule_source, USER_RULES_DIR / RULE_NAME)


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = {}

    roots = payload.get("workspace_roots") or []
    if isinstance(roots, str):
        roots = [roots]

    try:
        sync_user_rule()
    except OSError:
        pass

    for root in roots:
        if isinstance(root, str) and root:
            try:
                sync_workspace(root)
            except OSError:
                continue

    sys.stdout.write("{}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
