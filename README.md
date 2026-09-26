# Software Engineering Workbench

Source of Software Engineering Workbench. Agents that change this repo read
`AGENTS.md` first. Usage instructions are in `USER-MANUAL.md`.

The workbench is one Cursor canvas, `workbench.canvas.tsx`. It has a hub
sidebar and one page per surface. The first surface is Feature specification.
Edit `workbench.canvas.tsx` and `rules/workbench-canvas.mdc` in
this repo. A user hook copies those files into each workspace.

Do not edit the copy under `~/.cursor/projects/<workspace>/canvases/`. The next
hook run overwrites it.

Workspace data stays local in `workbench.canvas.data.json`. The hook does not
copy that file between workspaces. In a workspace that still has
`feature-specification.canvas.data.json` from the earlier standalone canvas,
the hook copies it to `workbench.canvas.data.json` once and removes the old
canvas copy. The old data file is left in place.

## Hook

`~/.cursor/hooks.json` runs `scripts/sync-workbench.py` on `sessionStart` and
`workspaceOpen`.

Manual run:

```bash
echo '{"workspace_roots":["/absolute/path/to/workspace"]}' | python3 scripts/sync-workbench.py
```

## Compatibility

When you add columns or tables, keep reading missing keys and short row arrays
as empty. Old workspace data files must still load.
