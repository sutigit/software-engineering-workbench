# Software Engineering Workbench user manual

How to open and use the workbench inside a Cursor workspace. Setup of the sync
hook is in `README.md`. Rules for agents are in `AGENTS.md`.

## Open the workbench

1. Open the workspace folder in Cursor.
2. Press `Cmd+Shift+P`.
3. Run **Open Canvas**.
4. Pick **workbench**.

Other ways:

- Click a canvas card or canvas file link that the agent posts in chat.
- Ask the agent: "open the workbench canvas".

If **workbench** is not in the list, the sync hook has not run for this
workspace yet. Start a new chat in the workspace, or run the manual sync
command from `README.md`. Then run **Open Canvas** again.

## Hub

The workbench opens with a sidebar on the left and a page on the right.

- The sidebar lists **Overview** and one entry per surface. Click an entry to
  show that page. The workbench remembers the open page.
- **Overview** shows one card per surface with its purpose. **Open** on a card
  shows that surface.

## Where your data lives

Each workspace keeps its own content in
`~/.cursor/projects/<workspace>/canvases/workbench.canvas.data.json`. Edits
are saved automatically. Nothing is shared between workspaces, and nothing is
uploaded.

A fresh workspace opens empty.

If you used the earlier standalone Feature specification canvas, the sync hook
copies its data into the workbench file once. Your rows are kept.

## Feature specification, UI elements, Functional elements

These three pages together describe one feature that an agent implements.
Open each from the sidebar or from its Overview card. Each page shows only its
own tables. All three pages save into the same data file.

- **Feature specification** has a **Feature name** input at the top and two
  tables: **User stories** and **Acceptance criteria**.
- **UI elements** has one table, **UI elements**.
- **Functional elements** has one table, **Functional elements**.

Each table is a collapsible section with a row count. The sections below apply
to every table on the three pages.

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

1. Fill the Edit columns on the three pages and mark which rows matter.
2. Ask the agent to implement the specification.
3. The agent reads your rows on all three pages and writes the Read-only
   columns.
4. Tick **Done** on rows that are complete.

## Update the source, not the copy

The canvas file in `~/.cursor/projects/<workspace>/canvases/` is a copy. The
hook overwrites it. Change the workbench in
`~/Projects/software-engineering-workbench` and run the sync. See `README.md`.
