import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CollapsibleSection,
  Grid,
  H1,
  H2,
  IconButton,
  Row,
  Stack,
  Pill,
  Table,
  Text,
  Select,
  TextInput,
  useCanvasState,
  useHostTheme,
  useEffect,
  useRef,
  useState,
  type SetCanvasState,
} from "cursor/canvas";

// MARK: - Hub

// A canvas is one file with no relative imports, so every surface is a page
// inside this file. The sidebar lists tasks. A task owns one copy of every
// surface; the surfaces are tabs inside the task page.

const OVERVIEW_PAGE_ID = "overview";
const SIDEBAR_WIDTH = 220;
const PAGE_PADDING = 24;
const TASK_NAME_MAX_WIDTH = 360;
const NEW_TASK_NAME = "Untitled task";

// Spec data saved before tasks existed lives in top-level keys. It becomes
// this task the first time the canvas opens with the new schema.
const IMPORTED_TASK_ID = "task-imported";
const IMPORTED_TASK_NAME = "Imported task";

type Task = {
  id: string;
  name: string;
};

// Spec content of one task. Inner shapes match the pre-task top-level keys
// `featureName`, `specColumns`, and `specRows`.
type TaskSpec = {
  featureName: string;
  specColumns: Record<string, SpecColumn[]>;
  specRows: SpecRowsByTable;
};

type TaskSpecsById = Record<string, TaskSpec>;
type TaskAgentCellsById = Record<string, AgentCells>;

type SpecUpdate = (spec: TaskSpec) => TaskSpec;

type SurfacePageProps = {
  spec: TaskSpec;
  agentCells: AgentCells;
  onChangeSpec: (update: SpecUpdate) => void;
};

type SurfacePage = typeof FeatureSpecificationPage;

type Surface = {
  id: string;
  title: string;
  purpose: string;
  Page: SurfacePage;
};

const surfaces: Surface[] = [
  {
    id: "feature-specification",
    title: "Feature specification",
    purpose: "Write a feature spec that an agent implements.",
    Page: FeatureSpecificationPage,
  },
  {
    id: "architecture",
    title: "Architecture",
    purpose: "Describe the architecture of the feature.",
    Page: ArchitecturePage,
  },
  {
    id: "ui-elements",
    title: "UI elements",
    purpose: "List the UI elements of the feature and their interfaces.",
    Page: UiElementsPage,
  },
  {
    id: "functional-elements",
    title: "Functional elements",
    purpose: "List the hooks of the feature and their interfaces.",
    Page: FunctionalElementsPage,
  },
  {
    id: "unit-tests",
    title: "Unit tests",
    purpose: "List the unit tests of the feature.",
    Page: UnitTestsPage,
  },
];

export default function WorkbenchCanvas() {
  // `null` means the key was never written, which is what the legacy import
  // checks. An empty array means the user deleted every task.
  const [storedTasks, setTasks] = useCanvasState<Task[] | null>("tasks", null);
  const [taskSpecs, setTaskSpecs] = useCanvasState<TaskSpecsById>(
    "taskSpecs",
    {},
  );
  const [taskAgentCells, setTaskAgentCells] =
    useCanvasState<TaskAgentCellsById>("taskAgentCells", {});
  const [storedTaskId, setTaskId] = useCanvasState<string>("hubTask", "");
  const [storedPageId, setPageId] = useCanvasState<string>(
    "hubPage",
    OVERVIEW_PAGE_ID,
  );

  useImportLegacySpec(storedTasks, {
    setTasks,
    setTaskSpecs,
    setTaskAgentCells,
  });

  const tasks = storedTasks ?? [];
  // A stored id can point at a task or surface that no longer exists.
  const activeTask = tasks.find((task) => task.id === storedTaskId) ?? tasks[0];
  const activeSurface = surfaces.find((surface) => surface.id === storedPageId);
  const pageId = activeSurface ? activeSurface.id : OVERVIEW_PAGE_ID;

  const createTask = () => {
    const task: Task = { id: createTaskId(), name: NEW_TASK_NAME };
    setTasks((previous) => [...(previous ?? []), task]);
    setTaskId(task.id);
    setPageId(OVERVIEW_PAGE_ID);
  };

  const renameTask = (taskId: string, name: string) =>
    setTasks((previous) =>
      (previous ?? []).map((task) =>
        task.id === taskId ? { ...task, name } : task,
      ),
    );

  const deleteTask = (taskId: string) => {
    setTasks((previous) =>
      (previous ?? []).filter((task) => task.id !== taskId),
    );
    setTaskSpecs((previous) => withoutKey(previous, taskId));
    setTaskAgentCells((previous) => withoutKey(previous, taskId));
  };

  const updateSpec = (taskId: string, update: SpecUpdate) =>
    setTaskSpecs((previous) => ({
      ...previous,
      [taskId]: update(normalizeTaskSpec(previous[taskId])),
    }));

  return (
    <Row align="stretch" gap={0} style={{ minHeight: "100vh" }}>
      <HubSidebar
        tasks={tasks}
        activeTaskId={activeTask?.id}
        onSelect={setTaskId}
        onCreate={createTask}
      />
      <div style={{ flex: 1, minWidth: 0, padding: PAGE_PADDING }}>
        {activeTask ? (
          <TaskPage
            // Remount on task switch so local UI state, such as a pending
            // delete confirmation, never carries over to another task.
            key={activeTask.id}
            task={activeTask}
            pageId={pageId}
            spec={normalizeTaskSpec(taskSpecs[activeTask.id])}
            agentCells={taskAgentCells[activeTask.id] ?? {}}
            onSelectPage={setPageId}
            onRename={(name) => renameTask(activeTask.id, name)}
            onDelete={() => deleteTask(activeTask.id)}
            onChangeSpec={(update) => updateSpec(activeTask.id, update)}
          />
        ) : (
          <NoTasksPage onCreate={createTask} />
        )}
      </div>
    </Row>
  );
}

type LegacyImportSetters = {
  setTasks: SetCanvasState<Task[] | null>;
  setTaskSpecs: SetCanvasState<TaskSpecsById>;
  setTaskAgentCells: SetCanvasState<TaskAgentCellsById>;
};

// Reads the pre-task top-level keys and moves their content into one task.
// Runs once: only while `tasks` has never been written. The old keys stay in
// the data file untouched.
function useImportLegacySpec(
  storedTasks: Task[] | null,
  setters: LegacyImportSetters,
) {
  const [featureName] = useCanvasState<string>("featureName", "");
  const [specColumns] = useCanvasState<Record<string, SpecColumn[]>>(
    "specColumns",
    {},
  );
  const [specRows] = useCanvasState<SpecRowsByTable>("specRows", {});
  const [agentCells] = useCanvasState<AgentCells>("agentCells", {});

  useEffect(() => {
    if (storedTasks !== null) return;
    if (!hasLegacySpecContent(featureName, specRows)) return;
    setters.setTasks(() => [
      { id: IMPORTED_TASK_ID, name: featureName.trim() || IMPORTED_TASK_NAME },
    ]);
    setters.setTaskSpecs((previous) => ({
      ...previous,
      [IMPORTED_TASK_ID]: { featureName, specColumns, specRows },
    }));
    setters.setTaskAgentCells((previous) => ({
      ...previous,
      [IMPORTED_TASK_ID]: agentCells,
    }));
  }, [storedTasks, featureName, specColumns, specRows, agentCells]);
}

function hasLegacySpecContent(
  featureName: string,
  specRows: SpecRowsByTable,
): boolean {
  if (featureName.trim() !== "") return true;
  return Object.values(specRows).some(
    (rows) => Array.isArray(rows) && rows.length > 0,
  );
}

// A stored spec can predate a field. Missing fields read as empty.
function normalizeTaskSpec(spec: Partial<TaskSpec> | undefined): TaskSpec {
  return {
    featureName: spec?.featureName ?? "",
    specColumns: spec?.specColumns ?? {},
    specRows: spec?.specRows ?? {},
  };
}

function withoutKey<T>(
  record: Record<string, T>,
  key: string,
): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

type HubSidebarProps = {
  tasks: Task[];
  activeTaskId: string | undefined;
  onSelect: (taskId: string) => void;
  onCreate: () => void;
};

function HubSidebar({
  tasks,
  activeTaskId,
  onSelect,
  onCreate,
}: HubSidebarProps) {
  const theme = useHostTheme();
  return (
    <Stack
      gap={16}
      style={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        padding: 16,
        borderRight: `1px solid ${theme.stroke.tertiary}`,
      }}
    >
      <Stack gap={2}>
        <Text weight="semibold">Workbench</Text>
        <Text size="small" tone="tertiary">
          Tasks
        </Text>
      </Stack>
      <Stack gap={2}>
        {tasks.map((task) => (
          <SidebarItem
            key={task.id}
            label={displayTaskName(task)}
            active={task.id === activeTaskId}
            onClick={() => onSelect(task.id)}
          />
        ))}
      </Stack>
      <Row>
        <Button variant="ghost" onClick={onCreate}>
          + New task
        </Button>
      </Row>
    </Stack>
  );
}

function displayTaskName(task: Task): string {
  return task.name.trim() || NEW_TASK_NAME;
}

type SidebarItemProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function SidebarItem({ label, active, onClick }: SidebarItemProps) {
  const theme = useHostTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        font: "inherit",
        fontSize: 13,
        padding: "6px 8px",
        border: "none",
        borderRadius: theme.radius.sm,
        cursor: "pointer",
        color: active ? theme.text.primary : theme.text.secondary,
        background: active ? theme.fill.secondary : "transparent",
      }}
    >
      {label}
    </button>
  );
}

function NoTasksPage({ onCreate }: { onCreate: () => void }) {
  return (
    <Stack gap={16} style={{ maxWidth: 960 }}>
      <H1>Software Engineering Workbench</H1>
      <Text size="small" tone="tertiary">
        A task holds one feature specification with its UI elements and
        functional elements. Data stays in this workspace.
      </Text>
      <Row>
        <Button variant="primary" onClick={onCreate}>
          + New task
        </Button>
      </Row>
    </Stack>
  );
}

type TaskPageProps = {
  task: Task;
  pageId: string;
  spec: TaskSpec;
  agentCells: AgentCells;
  onSelectPage: (pageId: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onChangeSpec: (update: SpecUpdate) => void;
};

function TaskPage({
  task,
  pageId,
  spec,
  agentCells,
  onSelectPage,
  onRename,
  onDelete,
  onChangeSpec,
}: TaskPageProps) {
  const activeSurface = surfaces.find((surface) => surface.id === pageId);
  return (
    <Stack gap={24}>
      <TaskHeader task={task} onRename={onRename} onDelete={onDelete} />
      <TaskTabs activePageId={pageId} onSelect={onSelectPage} />
      {activeSurface ? (
        <activeSurface.Page
          spec={spec}
          agentCells={agentCells}
          onChangeSpec={onChangeSpec}
        />
      ) : (
        <OverviewTab onOpen={onSelectPage} />
      )}
    </Stack>
  );
}

type TaskHeaderProps = {
  task: Task;
  onRename: (name: string) => void;
  onDelete: () => void;
};

function TaskHeader({ task, onRename, onDelete }: TaskHeaderProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <Row gap={12} align="center" wrap>
      <TextInput
        value={task.name}
        onChange={onRename}
        placeholder="Task name"
        style={{ width: TASK_NAME_MAX_WIDTH, maxWidth: "100%" }}
      />
      {confirmingDelete ? (
        <Row gap={8} align="center" wrap>
          <Text size="small" tone="secondary">
            Delete this task and all its content?
          </Text>
          <Button variant="primary" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </Button>
        </Row>
      ) : (
        <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
          Delete task
        </Button>
      )}
    </Row>
  );
}

type TaskTabsProps = {
  activePageId: string;
  onSelect: (pageId: string) => void;
};

function TaskTabs({ activePageId, onSelect }: TaskTabsProps) {
  const theme = useHostTheme();
  return (
    <Row
      gap={8}
      wrap
      style={{
        paddingBottom: 12,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}
    >
      <Pill
        active={activePageId === OVERVIEW_PAGE_ID}
        onClick={() => onSelect(OVERVIEW_PAGE_ID)}
      >
        Overview
      </Pill>
      {surfaces.map((surface) => (
        <Pill
          key={surface.id}
          active={activePageId === surface.id}
          onClick={() => onSelect(surface.id)}
        >
          {surface.title}
        </Pill>
      ))}
    </Row>
  );
}

function OverviewTab({ onOpen }: { onOpen: (pageId: string) => void }) {
  return (
    <Stack gap={16}>
      <Text size="small" tone="tertiary">
        Each tab documents one part of this task. Data stays in this workspace.
      </Text>
      <Grid columns={2} gap={12} align="stretch">
        {surfaces.map((surface) => (
          <Card
            key={surface.id}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardHeader>{surface.title}</CardHeader>
            <CardBody
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text size="small" tone="secondary">
                {surface.purpose}
              </Text>
              <Row>
                <Button
                  variant="secondary"
                  onClick={() => onOpen(surface.id)}
                >
                  Open
                </Button>
              </Row>
            </CardBody>
          </Card>
        ))}
      </Grid>
    </Stack>
  );
}

// Tasks need stable ids; names can change and repeat.
function createTaskId(): string {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// MARK: - Architecture and Unit tests

// These surfaces have a tab but no content format yet. They store nothing
// until their format is decided.

function ArchitecturePage() {
  return <PlaceholderPage title="Architecture" />;
}

function UnitTestsPage() {
  return <PlaceholderPage title="Unit tests" />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <Stack gap={8}>
      <H2>{title}</H2>
      <Text size="small" tone="tertiary">
        The content format of this tab is not decided yet.
      </Text>
    </Stack>
  );
}

// MARK: - Feature specification

// Feature specification, UI elements, and Functional elements are three tabs
// over one task's data set. The task's `TaskSpec` holds `specColumns` and
// `specRows` keyed by table id; `taskAgentCells[taskId]` holds the agent
// output for the same tables.
//
// Column ownership (not a hard IDE lock; agents can still edit files):
// - Edit (readOnly false): human. Never change those cell values.
// - Read-only (readOnly true): agent. Write only into `taskAgentCells`.
// AgentCells shape: tableId -> rowId -> columnId -> string

type ColumnKind = "text" | "code";

type SpecColumn = {
  id: string;
  name: string;
  kind: ColumnKind;
  // When true, the user cannot edit cells. The agent writes this column.
  readOnly: boolean;
};

type AgentCells = Record<string, Record<string, Record<string, string>>>;

type SpecRow = {
  id: string;
  done: boolean;
  cells: string[];
};

type SpecRowsByTable = Record<string, SpecRow[]>;

const SPEC_PAGE_MAX_WIDTH = 1400;
const FEATURE_NAME_MAX_WIDTH = 360;
const TEXT_CELL_MIN_WIDTH = 200;
const CODE_CELL_MIN_WIDTH = 360;
const CODE_CELL_MIN_ROWS = 4;
const CODE_LINE_HEIGHT = 18;
const CODE_PADDING = 8;
const CODE_INDENT = "  ";
const CODE_FONT_FAMILY =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const CODE_FONT_SIZE = 12;

const text = (id: string, name: string, readOnly = false): SpecColumn => ({
  id,
  name,
  kind: "text",
  readOnly,
});
const code = (id: string, name: string, readOnly = false): SpecColumn => ({
  id,
  name,
  kind: "code",
  readOnly,
});

type TableMeta = { id: string; title: string };

const featureSpecificationTables: TableMeta[] = [
  { id: "user-stories", title: "User stories" },
  { id: "acceptance-criteria", title: "Acceptance criteria" },
];

const uiElementsTables: TableMeta[] = [
  { id: "ui-elements", title: "UI elements" },
];

const reactHooksTables: TableMeta[] = [
  { id: "react-hooks", title: "React hooks" },
];

const seedColumns: Record<string, SpecColumn[]> = {
  "user-stories": [text("us-story", "Story")],
  "acceptance-criteria": [text("ac-criterion", "Criterion")],
  "ui-elements": [
    text("ui-element", "UI element"),
    text("ui-description", "Description"),
    text("ui-contract", "Contract"),
    text("ui-parameters", "Parameters"),
    code("ui-interface", "Interface", true),
  ],
  "react-hooks": [
    text("fn-hook", "Hook"),
    text("fn-description", "Description"),
    text("fn-contract", "Contract"),
    text("fn-input", "Input"),
    text("fn-output", "Output"),
    code("fn-interface", "Interface", true),
  ],
};

function FeatureSpecificationPage(props: SurfacePageProps) {
  const setFeatureName = (featureName: string) =>
    props.onChangeSpec((spec) => ({ ...spec, featureName }));
  return (
    <SpecPage
      {...props}
      title="Feature specification"
      tables={featureSpecificationTables}
      featureNameInput={{
        value: props.spec.featureName,
        onChange: setFeatureName,
      }}
    />
  );
}

function UiElementsPage(props: SurfacePageProps) {
  return <SpecPage {...props} title="UI elements" tables={uiElementsTables} />;
}

function FunctionalElementsPage(props: SurfacePageProps) {
  return (
    <SpecPage
      {...props}
      title="Functional elements"
      tables={reactHooksTables}
    />
  );
}

type FeatureNameInput = {
  value: string;
  onChange: (value: string) => void;
};

type SpecPageProps = SurfacePageProps & {
  title: string;
  tables: TableMeta[];
  // Only the Feature specification page names the feature.
  featureNameInput?: FeatureNameInput;
};

function SpecPage({
  title,
  tables,
  spec,
  agentCells,
  onChangeSpec,
  featureNameInput,
}: SpecPageProps) {
  const updateRows = (
    tableId: string,
    update: (rows: SpecRow[]) => SpecRow[],
  ) =>
    onChangeSpec((previous) => ({
      ...previous,
      specRows: {
        ...previous.specRows,
        [tableId]: update(previous.specRows[tableId] ?? []),
      },
    }));

  const updateColumns = (
    tableId: string,
    update: (columns: SpecColumn[]) => SpecColumn[],
  ) =>
    onChangeSpec((previous) => ({
      ...previous,
      specColumns: {
        ...previous.specColumns,
        [tableId]: update(
          previous.specColumns[tableId] ?? seedColumns[tableId] ?? [],
        ),
      },
    }));

  return (
    <Stack gap={24} style={{ maxWidth: SPEC_PAGE_MAX_WIDTH }}>
      <Stack gap={8}>
        <H2>{title}</H2>
        {featureNameInput && (
          <TextInput
            value={featureNameInput.value}
            onChange={featureNameInput.onChange}
            placeholder="Feature name"
            style={{ maxWidth: FEATURE_NAME_MAX_WIDTH }}
          />
        )}
        <Text size="small" tone="tertiary">
          Edits are saved automatically. Ask the agent to implement this
          specification. Edit columns are human-owned. Read-only columns are
          agent-owned.
        </Text>
      </Stack>

      <Stack gap={16}>
        {tables.map((table) => (
          <SpecTableSection
            key={table.id}
            tableId={table.id}
            title={table.title}
            columns={spec.specColumns[table.id] ?? seedColumns[table.id] ?? []}
            rows={spec.specRows[table.id] ?? []}
            agentCells={agentCells}
            onChangeRows={(update) => updateRows(table.id, update)}
            onChangeColumns={(update) => updateColumns(table.id, update)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

type SpecTableSectionProps = {
  tableId: string;
  title: string;
  columns: SpecColumn[];
  rows: SpecRow[];
  agentCells: AgentCells;
  onChangeRows: (update: (rows: SpecRow[]) => SpecRow[]) => void;
  onChangeColumns: (update: (columns: SpecColumn[]) => SpecColumn[]) => void;
};

function SpecTableSection({
  tableId,
  title,
  columns,
  rows,
  agentCells,
  onChangeRows,
  onChangeColumns,
}: SpecTableSectionProps) {
  const editCell = (rowId: string, columnIndex: number, value: string) => {
    if (isReadOnlyColumn(columns[columnIndex])) return;
    onChangeRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? { ...row, cells: withCell(row.cells, columnIndex, value) }
          : row,
      ),
    );
  };

  const setDone = (rowId: string, done: boolean) =>
    onChangeRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, done } : row)),
    );

  const deleteRow = (rowId: string) =>
    onChangeRows((current) => current.filter((row) => row.id !== rowId));

  const addRow = () =>
    onChangeRows((current) => [
      ...current,
      { id: createRowId(), done: false, cells: columns.map(() => "") },
    ]);

  const renameColumn = (columnId: string, name: string) =>
    onChangeColumns((current) =>
      current.map((column) =>
        column.id === columnId ? { ...column, name } : column,
      ),
    );

  const setColumnKind = (columnId: string, kind: ColumnKind) =>
    onChangeColumns((current) =>
      current.map((column) =>
        column.id === columnId ? { ...column, kind } : column,
      ),
    );

  const setColumnReadOnly = (columnId: string, readOnly: boolean) =>
    onChangeColumns((current) =>
      current.map((column) =>
        column.id === columnId ? { ...column, readOnly } : column,
      ),
    );

  const addColumn = (kind: ColumnKind) => {
    const index = columns.length;
    onChangeColumns((current) => [
      ...current,
      {
        id: createColumnId(),
        name: kind === "code" ? "Interface" : "Column",
        kind,
        readOnly: kind === "code",
      },
    ]);
    onChangeRows((current) =>
      current.map((row) => ({
        ...row,
        cells: insertCell(row.cells, index, ""),
      })),
    );
  };

  const deleteColumn = (columnIndex: number) => {
    if (columns.length <= 1) return;
    onChangeColumns((current) =>
      current.filter((_, index) => index !== columnIndex),
    );
    onChangeRows((current) =>
      current.map((row) => ({
        ...row,
        cells: removeCell(row.cells, columnIndex),
      })),
    );
  };

  const moveColumn = (columnIndex: number, direction: -1 | 1) => {
    const nextIndex = columnIndex + direction;
    if (nextIndex < 0 || nextIndex >= columns.length) return;
    onChangeColumns((current) => swapItems(current, columnIndex, nextIndex));
    onChangeRows((current) =>
      current.map((row) => ({
        ...row,
        cells: swapItems(
          padCells(row.cells, columns.length),
          columnIndex,
          nextIndex,
        ),
      })),
    );
  };

  const headers = [
    "Done",
    ...columns.map((column, columnIndex) => (
      <ColumnHeader
        key={column.id}
        column={column}
        canDelete={columns.length > 1}
        canMoveLeft={columnIndex > 0}
        canMoveRight={columnIndex < columns.length - 1}
        onRename={(name) => renameColumn(column.id, name)}
        onKindChange={(kind) => setColumnKind(column.id, kind)}
        onReadOnlyChange={(readOnly) => setColumnReadOnly(column.id, readOnly)}
        onMoveLeft={() => moveColumn(columnIndex, -1)}
        onMoveRight={() => moveColumn(columnIndex, 1)}
        onDelete={() => deleteColumn(columnIndex)}
      />
    )),
    "",
  ];
  const tableRows = rows.map((row) => [
    <Checkbox
      key={`${row.id}-done`}
      checked={row.done === true}
      onChange={(done) => setDone(row.id, done)}
    />,
    ...columns.map((column, columnIndex) => (
      <CellEditor
        key={`${row.id}-${column.id}`}
        column={column}
        value={displayCell(agentCells, tableId, row, column, columnIndex)}
        onChange={(value) => editCell(row.id, columnIndex, value)}
      />
    )),
    <IconButton
      key={`${row.id}-delete`}
      title="Delete row"
      onClick={() => deleteRow(row.id)}
    >
      ✕
    </IconButton>,
  ]);
  const rowTone = rows.map((row) =>
    row.done === true ? "success" : undefined,
  );

  return (
    <CollapsibleSection title={title} count={rows.length} defaultOpen>
      <Stack gap={8}>
        <Table
          headers={headers}
          rows={tableRows}
          rowTone={rowTone}
          emptyMessage="No rows yet."
        />
        <Row gap={8} wrap>
          <Button variant="ghost" onClick={addRow}>
            + Add row
          </Button>
          <Button variant="ghost" onClick={() => addColumn("text")}>
            + Add text column
          </Button>
          <Button variant="ghost" onClick={() => addColumn("code")}>
            + Add code column
          </Button>
        </Row>
      </Stack>
    </CollapsibleSection>
  );
}

type ColumnHeaderProps = {
  column: SpecColumn;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onRename: (name: string) => void;
  onKindChange: (kind: ColumnKind) => void;
  onReadOnlyChange: (readOnly: boolean) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onDelete: () => void;
};

function ColumnHeader({
  column,
  canDelete,
  canMoveLeft,
  canMoveRight,
  onRename,
  onKindChange,
  onReadOnlyChange,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: ColumnHeaderProps) {
  return (
    <Stack gap={6}>
      <TextInput
        value={column.name}
        onChange={onRename}
        placeholder="Column name"
        style={{ minWidth: 140 }}
      />
      <Row gap={4} align="center">
        <Select
          value={column.kind}
          onChange={(value) => onKindChange(value as ColumnKind)}
          options={[
            { value: "text", label: "Text" },
            { value: "code", label: "Code" },
          ]}
          style={{ minWidth: 92 }}
        />
        <IconButton
          title="Move column left"
          disabled={!canMoveLeft}
          onClick={onMoveLeft}
        >
          ←
        </IconButton>
        <IconButton
          title="Move column right"
          disabled={!canMoveRight}
          onClick={onMoveRight}
        >
          →
        </IconButton>
        <IconButton
          title="Delete column"
          disabled={!canDelete}
          onClick={onDelete}
        >
          ✕
        </IconButton>
      </Row>
      <Row gap={4} align="center">
        <Pill
          size="sm"
          active={!isReadOnlyColumn(column)}
          onClick={() => onReadOnlyChange(false)}
        >
          Edit
        </Pill>
        <Pill
          size="sm"
          active={isReadOnlyColumn(column)}
          onClick={() => onReadOnlyChange(true)}
        >
          Read-only
        </Pill>
      </Row>
    </Stack>
  );
}

type CellEditorProps = {
  column: SpecColumn;
  value: string;
  onChange: (value: string) => void;
};

function CellEditor({ column, value, onChange }: CellEditorProps) {
  const readOnly = isReadOnlyColumn(column);

  if (column.kind === "code") {
    return (
      <TypeScriptCodeEditor
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={
          readOnly
            ? "The agent writes this interface."
            : `interface ${column.name} {\n  \n}`
        }
      />
    );
  }

  if (readOnly) {
    return <ReadOnlyText value={value} />;
  }

  return (
    <TextCellEditor
      value={value}
      onChange={onChange}
      placeholder={column.name}
    />
  );
}

type TextKeyEvent = {
  key: string;
  preventDefault: () => void;
  currentTarget: HTMLTextAreaElement;
};

function TextCellEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const theme = useHostTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    fitHeightToContent(textarea);
    // Wrapped lines change when the column width changes, not only when text changes.
    // Only react to width so the height update does not retrigger the observer.
    let lastWidth = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === lastWidth) return;
      lastWidth = textarea.clientWidth;
      fitHeightToContent(textarea);
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      placeholder={placeholder}
      rows={1}
      spellCheck={false}
      onChange={(event: { currentTarget: HTMLTextAreaElement }) =>
        onChange(event.currentTarget.value)
      }
      onKeyDown={(event: TextKeyEvent) => {
        if (event.key !== "Tab") return;
        const textarea = event.currentTarget;
        const result = applyDashToBullets(
          textarea.value,
          textarea.selectionStart,
          textarea.selectionEnd,
        );
        if (!result) return;
        event.preventDefault();
        onChange(result.value);
        queueMicrotask(() => {
          textarea.selectionStart = result.start;
          textarea.selectionEnd = result.end;
        });
      }}
      style={{
        minWidth: TEXT_CELL_MIN_WIDTH,
        width: "100%",
        boxSizing: "border-box",
        display: "block",
        resize: "none",
        overflow: "hidden",
        font: "inherit",
        fontSize: 13,
        lineHeight: "18px",
        padding: 8,
        color: theme.text.primary,
        background: theme.fill.tertiary,
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: theme.radius.sm,
        outline: "none",
      }}
    />
  );
}

function fitHeightToContent(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight + 2}px`;
}

function ReadOnlyText({ value }: { value: string }) {
  const theme = useHostTheme();
  return (
    <Text
      size="small"
      tone={value ? "primary" : "tertiary"}
      style={{
        minWidth: TEXT_CELL_MIN_WIDTH,
        whiteSpace: "pre-wrap",
        padding: 8,
        background: theme.fill.tertiary,
        border: `1px solid ${theme.stroke.tertiary}`,
        borderRadius: theme.radius.sm,
      }}
    >
      {value || "The agent writes this column."}
    </Text>
  );
}

type TypeScriptCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  readOnly?: boolean;
};

function TypeScriptCodeEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
}: TypeScriptCodeEditorProps) {
  const theme = useHostTheme();
  const overlayRef = useRef<HTMLPreElement>(null);
  const lineCount = Math.max(CODE_CELL_MIN_ROWS, value.split("\n").length);
  const height = lineCount * CODE_LINE_HEIGHT + CODE_PADDING * 2;
  const colors = {
    text: theme.text.primary,
    keyword: theme.accent.primary,
    type: theme.text.link,
    string: theme.chart.sequence[0] ?? theme.text.link,
    number: theme.chart.sequence[2] ?? theme.text.secondary,
    comment: theme.text.tertiary,
    punctuation: theme.text.secondary,
  };
  const shared = {
    boxSizing: "border-box" as const,
    fontFamily: CODE_FONT_FAMILY,
    fontSize: CODE_FONT_SIZE,
    lineHeight: `${CODE_LINE_HEIGHT}px`,
    tabSize: 2,
    padding: CODE_PADDING,
    margin: 0,
    whiteSpace: "pre" as const,
    overflowX: "auto" as const,
    overflowY: "hidden" as const,
    width: "100%",
    height,
  };

  return (
    <div
      style={{
        position: "relative",
        minWidth: CODE_CELL_MIN_WIDTH,
        width: "100%",
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: theme.radius.sm,
        background: theme.fill.tertiary,
      }}
    >
      <pre
        ref={overlayRef}
        aria-hidden={!readOnly}
        style={{
          ...shared,
          position: readOnly ? "relative" : "absolute",
          inset: readOnly ? undefined : 0,
          color: colors.text,
          pointerEvents: readOnly ? "auto" : "none",
        }}
      >
        {value ? (
          highlightTypeScript(value, colors)
        ) : (
          <span style={{ color: theme.text.quaternary }}>{placeholder}</span>
        )}
      </pre>
      {!readOnly && (
        <textarea
          value={value}
          placeholder=""
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="TypeScript interface"
          onChange={(event: { currentTarget: HTMLTextAreaElement }) =>
            onChange(event.currentTarget.value)
          }
          onScroll={(event: { currentTarget: HTMLTextAreaElement }) => {
            const overlay = overlayRef.current;
            if (!overlay) return;
            overlay.scrollTop = event.currentTarget.scrollTop;
            overlay.scrollLeft = event.currentTarget.scrollLeft;
          }}
          onKeyDown={(event: {
            key: string;
            shiftKey: boolean;
            preventDefault: () => void;
            currentTarget: HTMLTextAreaElement;
          }) => {
            if (event.key !== "Tab") return;
            event.preventDefault();
            const result = applyTabIndent(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
              event.shiftKey,
            );
            onChange(result.value);
            const textarea = event.currentTarget;
            queueMicrotask(() => {
              textarea.selectionStart = result.start;
              textarea.selectionEnd = result.end;
            });
          }}
          style={{
            ...shared,
            position: "relative",
            display: "block",
            color: "transparent",
            caretColor: theme.text.primary,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            WebkitTextFillColor: "transparent",
          }}
        />
      )}
    </div>
  );
}

type HighlightColors = {
  text: string;
  keyword: string;
  type: string;
  string: string;
  number: string;
  comment: string;
  punctuation: string;
};

function highlightTypeScript(source: string, colors: HighlightColors) {
  return tokenizeTypeScript(source).map((token, index) => (
    <span key={index} style={{ color: colors[token.kind] }}>
      {token.text}
    </span>
  ));
}

type TokenKind = keyof HighlightColors;

type Token = { kind: TokenKind; text: string };

const TS_KEYWORDS = new Set([
  "abstract",
  "as",
  "asserts",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "infer",
  "instanceof",
  "interface",
  "is",
  "keyof",
  "let",
  "namespace",
  "new",
  "null",
  "of",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "unique",
  "var",
  "while",
  "yield",
]);

const TS_TYPES = new Set([
  "any",
  "bigint",
  "boolean",
  "never",
  "number",
  "object",
  "string",
  "symbol",
  "unknown",
  "void",
  "Record",
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit",
  "Array",
  "Promise",
  "Map",
  "Set",
]);

function tokenizeTypeScript(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  const push = (kind: TokenKind, text: string) => {
    if (text.length > 0) tokens.push({ kind, text });
  };

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      push("comment", source.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      push("comment", source.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      const stop = readString(source, index);
      push("string", source.slice(index, stop));
      index = stop;
      continue;
    }

    if (isDigit(char)) {
      let stop = index + 1;
      while (stop < source.length && /[\d._]/.test(source[stop])) stop += 1;
      push("number", source.slice(index, stop));
      index = stop;
      continue;
    }

    if (isIdentStart(char)) {
      let stop = index + 1;
      while (stop < source.length && isIdentPart(source[stop])) stop += 1;
      const text = source.slice(index, stop);
      const kind: TokenKind = TS_KEYWORDS.has(text)
        ? "keyword"
        : TS_TYPES.has(text) || /^[A-Z]/.test(text)
          ? "type"
          : "text";
      push(kind, text);
      index = stop;
      continue;
    }

    push(char.trim() === "" ? "text" : "punctuation", char);
    index += 1;
  }

  return tokens;
}

function readString(source: string, start: number): number {
  const quote = source[start];
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === quote) return index + 1;
    index += 1;
  }
  return source.length;
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isIdentStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

function isIdentPart(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char);
}

function applyTabIndent(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  unindent: boolean,
): { value: string; start: number; end: number } {
  if (!unindent && selectionStart === selectionEnd) {
    const next =
      value.slice(0, selectionStart) + CODE_INDENT + value.slice(selectionEnd);
    const caret = selectionStart + CODE_INDENT.length;
    return { value: next, start: caret, end: caret };
  }

  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const endsOnLineStart =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n";
  const lastChar = endsOnLineStart ? selectionEnd - 1 : selectionEnd;
  const newlineAfter = value.indexOf("\n", lastChar);
  const blockEnd = newlineAfter === -1 ? value.length : newlineAfter;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const nextLines = lines.map((line) =>
    unindent ? removeIndent(line) : CODE_INDENT + line,
  );
  const nextBlock = nextLines.join("\n");
  const next = value.slice(0, blockStart) + nextBlock + value.slice(blockEnd);
  const startDelta = nextLines[0].length - lines[0].length;
  const blockDelta = nextBlock.length - block.length;
  return {
    value: next,
    start: Math.max(blockStart, selectionStart + startDelta),
    end: Math.max(blockStart, selectionEnd + blockDelta),
  };
}

function removeIndent(line: string): string {
  if (line.startsWith(CODE_INDENT)) return line.slice(CODE_INDENT.length);
  if (line.startsWith("\t")) return line.slice(1);
  if (line.startsWith(" ")) return line.slice(1);
  return line;
}

// Saved rows can be shorter than the schema when a column is added later.
function applyDashToBullets(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; start: number; end: number } | null {
  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const endsOnLineStart =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n";
  const lastChar = endsOnLineStart ? selectionEnd - 1 : selectionEnd;
  const newlineAfter = value.indexOf("\n", lastChar);
  const blockEnd = newlineAfter === -1 ? value.length : newlineAfter;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const nextLines = lines.map(dashLineToBullet);
  const converted = nextLines.some((line, index) => line !== lines[index]);
  if (!converted) return null;

  const nextBlock = nextLines.join("\n");
  const next = value.slice(0, blockStart) + nextBlock + value.slice(blockEnd);
  const startDelta = nextLines[0].length - lines[0].length;
  const blockDelta = nextBlock.length - block.length;
  return {
    value: next,
    start: Math.max(blockStart, selectionStart + startDelta),
    end: Math.max(blockStart, selectionEnd + blockDelta),
  };
}

function dashLineToBullet(line: string): string {
  const trimmedStart = line.trimStart();
  if (trimmedStart.startsWith("--")) return line;
  const match = line.match(/^(\s*)-\s?(.*)$/);
  if (!match) return line;
  return `${match[1]}• ${match[2]}`;
}

function isReadOnlyColumn(column: SpecColumn | undefined): boolean {
  if (!column) return false;
  if (typeof column.readOnly === "boolean") return column.readOnly;
  return column.name.trim().toLowerCase() === "interface";
}

function displayCell(
  agentCells: AgentCells,
  tableId: string,
  row: SpecRow,
  column: SpecColumn,
  columnIndex: number,
): string {
  if (isReadOnlyColumn(column)) {
    return (
      agentCells[tableId]?.[row.id]?.[column.id] ?? row.cells[columnIndex] ?? ""
    );
  }
  return row.cells[columnIndex] ?? "";
}

function withCell(
  cells: string[],
  columnIndex: number,
  value: string,
): string[] {
  const padded = padCells(cells, columnIndex + 1);
  padded[columnIndex] = value;
  return padded;
}

function padCells(cells: string[], length: number): string[] {
  const padded = [...cells];
  while (padded.length < length) padded.push("");
  return padded;
}

function insertCell(cells: string[], index: number, value: string): string[] {
  const padded = padCells(cells, index);
  const next = [...padded];
  next.splice(index, 0, value);
  return next;
}

function removeCell(cells: string[], index: number): string[] {
  return padCells(cells, index + 1).filter(
    (_, cellIndex) => cellIndex !== index,
  );
}

function swapItems<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Rows need stable keys that survive reordering and deletion; index-based keys
// would remap textarea state to the wrong row after a delete.
function createRowId(): string {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createColumnId(): string {
  return `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
