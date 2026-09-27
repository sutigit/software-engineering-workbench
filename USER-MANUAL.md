# Software Engineering Workbench user manual

How to open and use the workbench inside a Cursor workspace. Setup of the sync
hook is in `README.md`. The rule that agents follow inside your workspace is
`rules/workbench-canvas.mdc`. Instructions for agents that change the
workbench itself are in `AGENTS.md`.

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

The workbench opens with a sidebar on the left and a task page on the right.

- The sidebar lists your **tasks**. Click a task to show it. The workbench
  remembers the open task and tab.
- A fresh workspace has no tasks. The page shows the title, a short note, and
  a **+ New task** button. The sidebar also has **+ New task**.

## Tasks

A task is one unit of work. It has a name and seven tabs: **Overview**,
**Feature specification**, **Architecture**, **UI elements**, **Functional
elements**, **Unit tests**, and **Integration tests**. Each task has its own
content in every tab.

- **+ New task** at the bottom of the sidebar adds a task named
  "Untitled task" and opens its Overview tab.
- The **Task name** input at the top of the task page renames the task. The
  sidebar shows the new name as you type.
- **Delete task** next to the name asks "Delete this task and all its
  content?". **Delete** removes the task and its tabs. **Cancel** keeps it.
- The tab bar under the name switches between the seven tabs.
- **Overview** shows one card per tab in a two-column grid. **Open** on a
  card shows that tab.
- **Unit tests** and **Integration tests** have no content format yet. Each
  shows its title and a note. They store nothing.

## Where your data lives

Each workspace keeps its own content in
`~/.cursor/projects/<workspace>/canvases/workbench.canvas.data.json`. Edits
are saved automatically. Nothing is shared between workspaces, and nothing is
uploaded.

A fresh workspace opens empty.

If you used the earlier standalone Feature specification canvas, the sync hook
copies its data into the workbench file once. If the workbench had content
before tasks existed, that content opens as a task named after its feature
name, or "Imported task" when there was no feature name.

## Feature specification, UI elements, Functional elements

These three tabs together describe one feature that an agent implements. Open
each from the tab bar or from its Overview card. Each tab shows only its own
tables. All three tabs save into the same task.

- **Feature specification** has a **Feature name** input at the top and four
  tables in this order: **User stories**, **Acceptance criteria**,
  **Functional requirements**, and **Non-functional requirements**.
- **UI elements** has one table, **UI elements**.
- **Functional elements** has one table, **React hooks**.

Each table is a collapsible section with a row count and a **?** icon at the
right of its header. Hover or focus the icon to read what the table is for.
Clicking the icon does not collapse the section. An empty
table shows "No rows yet." The sections below apply to every table on the
three tabs.

### Default columns

A new task starts with these columns. You can rename, move, add, or delete
them.

| Table                       | Columns                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| User stories                | Story                                                            |
| Acceptance criteria         | Criterion                                                        |
| Functional requirements     | Requirement                                                      |
| Non-functional requirements | Requirement                                                      |
| UI elements                 | UI element, Description, Contract, Parameters, Interface (code)  |
| React hooks                 | Hook, Description, Contract, Input, Output, Interface (code)     |

Every column is a Text column and Edit, except **Interface**, which is a Code
column and Read-only.

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
new text column is named "Column" and starts as Edit. A new code column is
named "Interface" and starts as Read-only.

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
  Select several lines to convert them at once. Lines that start with `--`
  do not change.
- Read-only text cells show "The agent writes this column." until the agent
  fills them.

Code cells:

- TypeScript syntax highlighting.
- `Tab` inserts two spaces. With a selection, `Tab` indents the selected
  lines. `Shift+Tab` unindents them.
- An empty Edit code cell shows an `interface` skeleton named after the
  column as a hint.
- Read-only code cells show "The agent writes this interface." until the agent
  fills them.

### Work with the agent

1. Fill the Edit columns on the three tabs and mark which rows matter.
2. Ask the agent to implement the specification. Name the task, or leave the
   task open; the agent uses the open task by default.
3. The agent reads your rows on all three tabs and writes the Read-only
   columns.
4. Tick **Done** on rows that are complete.

## Architecture

The **Architecture** tab holds the diagrams of the task. Each diagram is
mermaid code and a picture of that code. The picture is not live: the agent
renders it with the render script from `README.md`. There is no preview
while you type.

A new task has no diagrams. The tab shows its title, a short note, and
**+ Add diagram**.

### Add a diagram

**+ Add diagram** at the bottom of the tab adds a diagram named "Untitled
diagram" with empty code.

### Edit a diagram

Each diagram is one section:

- A **Diagram title** input. Type to rename the diagram.
- A monospace **Mermaid code** editor. `Tab` inserts two spaces. With a
  selection, `Tab` indents the selected lines. `Shift+Tab` unindents them.
  There is no syntax highlighting.
- The rendered picture, to the right of the editor or below it when the
  window is narrow. It is shown only when a render exists.

Edits are saved automatically. When the code differs from the code the
picture was made from, the note "Changes not rendered yet" and a **Save
changes** button appear under the editor.

### Render the picture

**Save changes** opens a new agent chat with the workbench canvas attached
and the request "Render the Architecture diagrams of task <task name>."
pre-filled. Press `Enter` to send it. The canvas cannot post into a chat that
is already open. You can also type the same request in any open chat.

The agent runs the render script, which writes the picture into the
workspace data file. The note and the button disappear when the picture
matches the code. If the canvas still shows the old picture, reopen it with
**Open Canvas**.

If the mermaid code does not parse, the error message appears under the
editor and the last good picture stays.

The picture follows the Cursor theme. One render reads in dark and light
themes.

### Delete a diagram

**Delete diagram** next to the title asks "Delete this diagram?". **Delete**
removes the diagram and its picture. **Cancel** keeps it.

### Work with the agent

- The agent reads the mermaid code of every diagram as context when it
  implements the task.
- The agent may write and edit mermaid code, and renders after each edit.
- The agent adds or deletes diagrams only when you ask.

## Update the source, not the copy

The canvas file in `~/.cursor/projects/<workspace>/canvases/` is a copy. The
hook overwrites it. Change the workbench in
`~/Projects/software-engineering-workbench` and run the sync. See `README.md`.
