# Software Engineering Workbench

Source of Software Engineering Workbench. Agents that change this repo read
`AGENTS.md` first. Usage instructions are in `USER-MANUAL.md`.

## What it is

The workbench is one Cursor canvas, `workbench.canvas.tsx`. It has a sidebar
of tasks and a task page with an Overview tab plus one tab per surface. Each
task holds its own content for every surface.

Surfaces and their status:

| Surface               | Status | Content                                                                                               |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| Feature specification | Active | Feature name, User stories, Acceptance criteria, Functional requirements, Non-functional requirements |
| Architecture          | Active | Mermaid diagrams, rendered to SVG by `scripts/render-architecture.mjs`                                |
| UI elements           | Active | UI elements table                                                                                     |
| Functional elements   | Active | React hooks table                                                                                     |
| Unit tests            | Active | Unit tests table: Components, Description                                                             |
| Integration tests     | Active | Integration tests table: Components, Description                                                      |

The spec and test surfaces are editable tables. Each column is either **Edit**
(the user can type) or **Read-only** (the agent writes into `taskAgentCells`).
The agent fills Read-only columns when asked to implement the spec. On Unit
tests and Integration tests, Edit columns may also be written by the agent in
`specRows`. Architecture is a list of mermaid diagrams; the agent runs the
render script so the stored SVG matches the mermaid source. Ownership rules
for agents are in `rules/workbench-canvas.mdc`.

## Setup

The render script depends on the npm package `beautiful-mermaid`. Run once in
this repo:

```bash
npm install
```

The canvas itself needs no install.

## Files

- `workbench.canvas.tsx`: the canvas. Copied into each workspace.
- `rules/workbench-canvas.mdc`: the agent rule. Copied into each workspace.
- `scripts/sync-workbench.py`: the copy script, run by the hook.
- `scripts/render-architecture.mjs`: renders Architecture diagrams to SVG in
  a workspace data file. Run by the agent, never by the hook.
- `package.json`: the render script dependencies.
- `AGENTS.md`: how to change the workbench.
- `USER-MANUAL.md`: how to use the workbench.

Edit the canvas and the rule in this repo. Do not edit the copies under
`~/.cursor/projects/<workspace>/canvases/` or
`<workspace>/.cursor/rules/`. The next hook run overwrites them.

## Data

Workspace data stays local in
`~/.cursor/projects/<workspace>/canvases/workbench.canvas.data.json`. The
hook does not copy that file between workspaces and never seeds it. A fresh
workspace opens empty.

Migration from the earlier standalone Feature specification canvas: in a
workspace that still has `feature-specification.canvas.data.json`, the hook
copies it to `workbench.canvas.data.json` once, if the new file does not exist,
and removes the old canvas copy and the old rule
`feature-specification-canvas.mdc`. The old data file is left in place. On
first load, the canvas turns pre-task content into one task.

## Hook

`~/.cursor/hooks.json` runs `scripts/sync-workbench.py` on `sessionStart` and
`workspaceOpen`. The script copies the canvas into the workspace canvases
folder and the rule into `<workspace>/.cursor/rules/`.

Manual run:

```bash
echo '{"workspace_roots":["/absolute/path/to/workspace"]}' | python3 scripts/sync-workbench.py
```

After a sync, reopen the canvas with Command Palette: **Open Canvas**.

## Compatibility

Old workspace data files must still load. Missing keys and short row arrays
read as empty. The full checklist is in `AGENTS.md`.
