# Software Engineering Workbench user manual

How to open and use the workbench inside a Cursor workspace. Setup of the sync
hook is in `README.md`. Rules for agents are in `AGENTS.md`.

## Open a surface

1. Open the workspace folder in Cursor.
2. Press `Cmd+Shift+P`.
3. Run **Open Canvas**.
4. Pick the surface, for example **Feature specification**.

Other ways:

- Click a canvas card or canvas file link that the agent posts in chat.
- Ask the agent: "open the feature specification canvas".

If the surface is not in the list, the sync hook has not run for this
workspace yet. Start a new chat in the workspace, or run the manual sync
command from `README.md`. Then run **Open Canvas** again.

## Where your data lives

Each workspace keeps its own content in
`~/.cursor/projects/<workspace>/canvases/<surface>.canvas.data.json`. Edits are
saved automatically. Nothing is shared between workspaces, and nothing is
uploaded.

A fresh workspace opens empty.

## Feature specification

Use this surface to write a feature spec that an agent implements.

### Layout

- **Feature name** input at the top.
- Four tables: **User stories**, **Acceptance criteria**, **UI elements**,
  **Functional elements**. Each table is a collapsible section with a row
  count.

### Rows

- **+ Add row** adds an empty row at the bottom.
- **✕** at the end of a row deletes it.
- The **Done** checkbox marks a row complete. Done rows show a success tone.

### Columns

Each column header has:

- A name input. Type to rename the column.
- A kind selector: **Text** or **Code**.
- **←** and **→** to move the column. **✕** to delete it. The last remaining
  column cannot be deleted.
- Two pills: **Edit** and **Read-only**.

**+ Add text column** and **+ Add code column** add a column to the table. A
new code column is named "Interface" and starts as Read-only.

### Edit vs Read-only

- **Edit** columns are yours. Agents do not change them.
- **Read-only** columns belong to the agent. You cannot type in them. The
  agent fills them when you ask it to implement the spec. A column named
  "Interface" is agent-owned even when the pill is not set.

Toggle the pill to hand a column to the agent or take it back.

### Cell editing

Text cells:

- Cells grow with their content.
- Press `Tab` on a line that starts with `-` to turn it into a `•` bullet.
  Select several lines to convert them at once.

Code cells:

- TypeScript syntax highlighting.
- `Tab` inserts two spaces. With a selection, `Tab` indents the selected
  lines. `Shift+Tab` unindents them.
- Read-only code cells show "The agent writes this interface." until the agent
  fills them.

### Work with the agent

1. Fill the Edit columns and mark which rows matter.
2. Ask the agent to implement the specification.
3. The agent reads your rows and writes the Read-only columns.
4. Tick **Done** on rows that are complete.

## Update the source, not the copy

The canvas file in `~/.cursor/projects/<workspace>/canvases/` is a copy. The
hook overwrites it. Change the workbench in
`~/Projects/software-engineering-workbench` and run the sync. See `README.md`.
