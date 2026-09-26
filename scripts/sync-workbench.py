#!/usr/bin/env python3
"""Copy Software Engineering Workbench surfaces into each open workspace.

Reads Cursor hook JSON from stdin. Writes {} to stdout. Never copies
*.canvas.data.json (those files are per workspace).
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
DATA_NAME = "workbench.canvas.data.json"
RULE_NAME = "workbench-canvas.mdc"

# The Feature specification canvas became a page in the Workbench canvas.
# Its data keys did not change, so the old data file is carried over as is.
LEGACY_CANVAS_NAME = "feature-specification.canvas.tsx"
LEGACY_DATA_NAME = "feature-specification.canvas.data.json"
LEGACY_STATUS_NAME = "feature-specification.canvas.status.json"
# The rule was renamed when it started to cover every page of the canvas.
# The old copy is removed so a workspace does not load the rule twice.
LEGACY_RULE_NAME = "feature-specification-canvas.mdc"


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
    migrate_legacy_canvas(canvases_dir)
    atomic_copy(canvas_source, canvases_dir / CANVAS_NAME)

    rule_source = SOURCE_ROOT / "rules" / RULE_NAME
    if rule_source.is_file():
        rules_dir = Path(workspace_root) / ".cursor" / "rules"
        (rules_dir / LEGACY_RULE_NAME).unlink(missing_ok=True)
        atomic_copy(rule_source, rules_dir / RULE_NAME)


def migrate_legacy_canvas(canvases_dir: Path) -> None:
    """Move one workspace's own data to the Workbench canvas file name.

    Copies the old data file only when the new one does not exist yet, so a
    workspace that already uses the Workbench canvas is never overwritten.
    The old data file stays in place. The old canvas copy is removed so
    Open Canvas does not list two surfaces that edit different files.
    """
    legacy_data = canvases_dir / LEGACY_DATA_NAME
    new_data = canvases_dir / DATA_NAME
    if legacy_data.is_file() and not new_data.exists():
        atomic_copy(legacy_data, new_data)

    (canvases_dir / LEGACY_CANVAS_NAME).unlink(missing_ok=True)
    (canvases_dir / LEGACY_STATUS_NAME).unlink(missing_ok=True)


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = {}

    roots = payload.get("workspace_roots") or []
    if isinstance(roots, str):
        roots = [roots]

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
