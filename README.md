# Software Engineering Workbench

Source of Software Engineering Workbench. Agents that change this repo read
`AGENTS.md` first. Usage instructions are in `USER-MANUAL.md`.

## What it is

The workbench is one Cursor canvas, `workbench.canvas.tsx`. It has a sidebar
of tasks and a task page with an Overview tab plus one tab per surface. Each
task holds its own content for every surface.

Surfaces and their status:

| Surface               | Status | Content                                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------------------------- |
| Research              | Active | Four kickoff questions with free-text notes                                             |
| Feature specification | Active | User stories, Acceptance criteria, Functional requirements, Non-functional requirements |
| Architecture          | Active | Mermaid diagrams, rendered to SVG by `scripts/render-architecture.mjs`                  |
| UI elements           | Active | UI elements table                                                                       |
| Functional elements   | Active | React hooks table                                                                       |
| Unit tests            | Active | Unit tests table: Components, Description                                               |
| Integration tests     | Active | Integration tests table: Components, Description                                        |
| E2E tests             | Stub   | Placeholder, no content                                                                 |
| Deliverables          | Stub   | Placeholder, no content                                                                 |

Research is four notes fields the user fills to start a task; the agent reads
them as context. The spec and test surfaces are editable tables. The user
types in the canvas and the agent writes the same `specRows`; every cell is
open to both.
Architecture is a list of mermaid diagrams; the agent runs the render script
so the stored SVG matches the mermaid source. The data layout for agents is
in `rules/workbench-canvas.mdc`.

## Setup

The render script depends on the npm package `beautiful-mermaid`. Run once in
this repo:

```bash
npm install
```

The canvas itself needs no install.

## Files

- `workbench.canvas.tsx`: the canvas. Copied into each workspace.
- `rules/workbench-canvas.mdc`: the agent rule. Copied to `~/.cursor/rules/`,
  the user rules folder. It never enters a workspace repo.
- `scripts/sync-workbench.py`: the copy script, run by the hook.
- `scripts/render-architecture.mjs`: renders Architecture diagrams to SVG in
  a workspace data file. Run by the agent, never by the hook.
- `package.json`: the render script dependencies.
- `AGENTS.md`: how to change the workbench.
- `USER-MANUAL.md`: how to use the workbench.

Edit the canvas and the rule in this repo. Do not edit the copies under
`~/.cursor/projects/<workspace>/canvases/` or `~/.cursor/rules/`. The next
hook run overwrites them.

## Data

Workspace data stays local in
`~/.cursor/projects/<workspace>/canvases/workbench.canvas.data.json`. The
hook does not copy that file between workspaces and never seeds it. A fresh
workspace opens empty.

## Hook

`~/.cursor/hooks.json` runs `scripts/sync-workbench.py` on `sessionStart` and
`workspaceOpen`. The script copies the canvas into the workspace canvases
folder and the rule into `~/.cursor/rules/`. The rule is a user rule: it
applies in every workspace on this machine and is not shared with a team.
The script also deletes a `<workspace>/.cursor/rules/workbench-canvas.mdc`
left by an older version.

Manual run:

```bash
echo '{"workspace_roots":["/absolute/path/to/workspace"]}' | python3 scripts/sync-workbench.py
```

After a sync, reopen the canvas with Command Palette: **Open Canvas**.

## Compatibility

Old workspace data files must still load. Missing keys and short row arrays
read as empty. The full checklist is in `AGENTS.md`.
