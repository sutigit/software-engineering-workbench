# Software Engineering Workbench

Source of Software Engineering Workbench. Agents that change this repo read
`AGENTS.md` first. Usage instructions are in `USER-MANUAL.md`.

The first surface is the Cursor Feature specification canvas. Edit
`feature-specification.canvas.tsx` and `rules/feature-specification-canvas.mdc`
in this repo. A user hook copies those files into each workspace.

Do not edit the copy under `~/.cursor/projects/<workspace>/canvases/`. The next
hook run overwrites it.

Workspace data stays local in `feature-specification.canvas.data.json`. The hook
does not copy that file.

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
