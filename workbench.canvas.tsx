import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CollapsibleSection,
  Divider,
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
  useCanvasAction,
  useCanvasState,
  useHostTheme,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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

type Task = {
  id: string;
  name: string;
};

type TaskSpec = {
  specColumns: Record<string, SpecColumn[]>;
  specRows: SpecRowsByTable;
};

type TaskSpecsById = Record<string, TaskSpec>;
type TaskArchitectureById = Record<string, ArchitectureDiagram[]>;
type TaskResearchById = Record<string, TaskResearch>;

type SpecUpdate = (spec: TaskSpec) => TaskSpec;
type DiagramsUpdate = (
  diagrams: ArchitectureDiagram[],
) => ArchitectureDiagram[];
type ResearchUpdate = (research: TaskResearch) => TaskResearch;

// Every surface page receives the whole task data set and picks what it
// shows. The spec pages use `spec`; the Architecture page uses `diagrams`;
// the Research page uses `research`.
type SurfacePageProps = {
  task: Task;
  spec: TaskSpec;
  onChangeSpec: (update: SpecUpdate) => void;
  diagrams: ArchitectureDiagram[];
  onChangeDiagrams: (update: DiagramsUpdate) => void;
  research: TaskResearch;
  onChangeResearch: (update: ResearchUpdate) => void;
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
    id: "research",
    title: "Research",
    purpose:
      "Start the task with four questions. The agent reads the answers as context.",
    Page: ResearchPage,
  },
  {
    id: "feature-specification",
    title: "Feature specification",
    purpose: "Write a feature spec that an agent implements.",
    Page: FeatureSpecificationPage,
  },
  {
    id: "architecture",
    title: "Architecture",
    purpose: "Draw the architecture of the feature as mermaid diagrams.",
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
  {
    id: "integration-tests",
    title: "Integration tests",
    purpose: "List the integration tests of the feature.",
    Page: IntegrationTestsPage,
  },
  {
    id: "e2e-tests",
    title: "E2E tests",
    purpose: "List the end-to-end tests of the feature.",
    Page: E2eTestsPage,
  },
  {
    id: "deliverables",
    title: "Deliverables",
    purpose: "List what the feature delivers.",
    Page: DeliverablesPage,
  },
];

export default function WorkbenchCanvas() {
  const [tasks, setTasks] = useCanvasState<Task[]>("tasks", []);
  const [taskSpecs, setTaskSpecs] = useCanvasState<TaskSpecsById>(
    "taskSpecs",
    {},
  );
  const [taskArchitecture, setTaskArchitecture] =
    useCanvasState<TaskArchitectureById>("taskArchitecture", {});
  const [taskResearch, setTaskResearch] = useCanvasState<TaskResearchById>(
    "taskResearch",
    {},
  );
  const [storedTaskId, setTaskId] = useCanvasState<string>("hubTask", "");
  const [storedPageId, setPageId] = useCanvasState<string>(
    "hubPage",
    OVERVIEW_PAGE_ID,
  );
  // A stored id can point at a task or surface that no longer exists.
  const activeTask = tasks.find((task) => task.id === storedTaskId) ?? tasks[0];
  const activeSurface = surfaces.find((surface) => surface.id === storedPageId);
  const pageId = activeSurface ? activeSurface.id : OVERVIEW_PAGE_ID;

  const createTask = () => {
    const task: Task = { id: createTaskId(), name: NEW_TASK_NAME };
    setTasks((previous) => [...previous, task]);
    setTaskId(task.id);
    setPageId(OVERVIEW_PAGE_ID);
  };

  const renameTask = (taskId: string, name: string) =>
    setTasks((previous) =>
      previous.map((task) =>
        task.id === taskId ? { ...task, name } : task,
      ),
    );

  const deleteTask = (taskId: string) => {
    setTasks((previous) =>
      previous.filter((task) => task.id !== taskId),
    );
    setTaskSpecs((previous) => withoutKey(previous, taskId));
    setTaskArchitecture((previous) => withoutKey(previous, taskId));
    setTaskResearch((previous) => withoutKey(previous, taskId));
  };

  const updateSpec = (taskId: string, update: SpecUpdate) =>
    setTaskSpecs((previous) => ({
      ...previous,
      [taskId]: update(normalizeTaskSpec(previous[taskId])),
    }));

  const updateDiagrams = (taskId: string, update: DiagramsUpdate) =>
    setTaskArchitecture((previous) => ({
      ...previous,
      [taskId]: update(normalizeDiagrams(previous[taskId])),
    }));

  const updateResearch = (taskId: string, update: ResearchUpdate) =>
    setTaskResearch((previous) => ({
      ...previous,
      [taskId]: update(normalizeResearch(previous[taskId])),
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
            diagrams={normalizeDiagrams(taskArchitecture[activeTask.id])}
            research={normalizeResearch(taskResearch[activeTask.id])}
            onSelectPage={setPageId}
            onRename={(name) => renameTask(activeTask.id, name)}
            onDelete={() => deleteTask(activeTask.id)}
            onChangeSpec={(update) => updateSpec(activeTask.id, update)}
            onChangeDiagrams={(update) => updateDiagrams(activeTask.id, update)}
            onChangeResearch={(update) => updateResearch(activeTask.id, update)}
          />
        ) : (
          <NoTasksPage onCreate={createTask} />
        )}
      </div>
    </Row>
  );
}

function normalizeTaskSpec(spec: Partial<TaskSpec> | undefined): TaskSpec {
  return {
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
        A task holds one feature specification with its architecture, UI
        elements, and functional elements. Data stays in this workspace.
      </Text>
      <Row>
        <Button variant="primary" onClick={onCreate}>
          + New task
        </Button>
      </Row>
    </Stack>
  );
}

type TaskPageProps = SurfacePageProps & {
  pageId: string;
  onSelectPage: (pageId: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

function TaskPage({
  task,
  pageId,
  onSelectPage,
  onRename,
  onDelete,
  ...pageProps
}: TaskPageProps) {
  const activeSurface = surfaces.find((surface) => surface.id === pageId);
  return (
    <Stack gap={24}>
      <TaskHeader task={task} onRename={onRename} onDelete={onDelete} />
      <TaskTabs activePageId={pageId} onSelect={onSelectPage} />
      {activeSurface ? (
        <activeSurface.Page task={task} {...pageProps} />
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
                <Button variant="secondary" onClick={() => onOpen(surface.id)}>
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

// MARK: - Research

// Research is the entry point of a task: four fixed questions, one notes
// field each, stored in `taskResearch[taskId]`. It is deliberately short and
// free-form so the user can start with one sentence. The agent reads the
// answers as context; it does not turn them into a spec here.

type TaskResearch = {
  situation: string;
  outcome: string;
  known: string;
  unclear: string;
};

type ResearchQuestion = {
  field: keyof TaskResearch;
  question: string;
  hint: string;
};

// Prose reads best in a narrower column than the spec tables.
const RESEARCH_PAGE_MAX_WIDTH = 760;
const NOTES_MIN_ROWS = 4;
const RESEARCH_PAGE_INTRO =
  "Answer what you can. Empty answers are fine. Edits are saved " +
  "automatically. The agent reads these notes before it works on the task.";

const researchQuestions: ResearchQuestion[] = [
  {
    field: "situation",
    question: "What is going on?",
    hint:
      "The current situation: a bug, a messy area, a missing piece, or a " +
      "change you want. Write it as you would tell a colleague.",
  },
  {
    field: "outcome",
    question: "What should be different when this is done?",
    hint: "The outcome in plain words. Not stories, not tests.",
  },
  {
    field: "known",
    question: "What do I already know?",
    hint:
      "Facts, hunches, file names, modules, past attempts, and what must " +
      "not change. Rough notes are enough.",
  },
  {
    field: "unclear",
    question: "What is still unclear?",
    hint: "Questions, doubts, and things to check. Answers can wait.",
  },
];

function ResearchPage({ research, onChangeResearch }: SurfacePageProps) {
  const editField = (field: keyof TaskResearch, value: string) =>
    onChangeResearch((current) => ({ ...current, [field]: value }));

  return (
    <Stack gap={24} style={{ maxWidth: RESEARCH_PAGE_MAX_WIDTH }}>
      <Stack gap={8}>
        <H2>Research</H2>
        <Text size="small" tone="tertiary">
          {RESEARCH_PAGE_INTRO}
        </Text>
      </Stack>
      {researchQuestions.map((item) => (
        <ResearchQuestionSection
          key={item.field}
          item={item}
          value={research[item.field]}
          onChange={(value) => editField(item.field, value)}
        />
      ))}
    </Stack>
  );
}

type ResearchQuestionSectionProps = {
  item: ResearchQuestion;
  value: string;
  onChange: (value: string) => void;
};

function ResearchQuestionSection({
  item,
  value,
  onChange,
}: ResearchQuestionSectionProps) {
  return (
    <Stack gap={8}>
      <Stack gap={2}>
        <Text weight="semibold">{item.question}</Text>
        <Text size="small" tone="tertiary">
          {item.hint}
        </Text>
      </Stack>
      <NotesTextarea
        value={value}
        onChange={onChange}
        placeholder="Notes"
        label={item.question}
      />
    </Stack>
  );
}

type NotesTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
};

// A plain multi-line text field in the style of the spec text cells. It
// starts at NOTES_MIN_ROWS and grows with its content, so notes never scroll
// inside the field.
function NotesTextarea({
  value,
  onChange,
  placeholder,
  label,
}: NotesTextareaProps) {
  const theme = useHostTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useFitHeightToContent(textareaRef, value);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      placeholder={placeholder}
      rows={NOTES_MIN_ROWS}
      aria-label={label}
      onChange={(event: { currentTarget: HTMLTextAreaElement }) =>
        onChange(event.currentTarget.value)
      }
      style={{
        boxSizing: "border-box",
        display: "block",
        width: "100%",
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

// A stored research entry can predate a field. Missing fields read as empty.
function normalizeResearch(
  research: Partial<TaskResearch> | undefined,
): TaskResearch {
  return {
    situation: research?.situation ?? "",
    outcome: research?.outcome ?? "",
    known: research?.known ?? "",
    unclear: research?.unclear ?? "",
  };
}

// MARK: - Architecture

// A task holds a list of mermaid diagrams in `taskArchitecture[taskId]`.
// The canvas does not render mermaid. `scripts/render-architecture.mjs` in
// the source repo turns `source` into `svg` with beautiful-mermaid and
// records the text it rendered in `renderedSource`. The canvas only shows
// the stored picture; `source !== renderedSource` means unsaved changes.
//
// Ownership: user and agent both edit `title` and `source`. Only the render
// script writes `svg`, `renderedSource`, and `renderError`.
//
// The canvas cannot run the script. "Save changes" asks the agent to run it.
// The canvas SDK has no action that posts into the open chat, so the request
// opens a new chat with the prompt pre-filled; the user submits it.

type ArchitectureDiagram = {
  id: string;
  title: string;
  source: string;
  renderedSource: string;
  svg: string;
  renderError: string;
};

const NEW_DIAGRAM_TITLE = "Untitled diagram";
const DIAGRAM_TITLE_MAX_WIDTH = 360;
// Editor and preview sit side by side and wrap to one column below this.
const DIAGRAM_PANE_MIN_WIDTH = 360;
const DIAGRAM_EDITOR_MIN_ROWS = 8;

function ArchitecturePage({
  task,
  diagrams,
  onChangeDiagrams,
}: SurfacePageProps) {
  const dispatch = useCanvasAction();
  const requestRender = () =>
    dispatch({
      type: "newComposerChat",
      userPrompt: `Render the Architecture diagrams of task ${displayTaskName(task)}.`,
    });

  const editDiagram = (
    diagramId: string,
    patch: Partial<Pick<ArchitectureDiagram, "title" | "source">>,
  ) =>
    onChangeDiagrams((current) =>
      current.map((diagram) =>
        diagram.id === diagramId ? { ...diagram, ...patch } : diagram,
      ),
    );

  const addDiagram = () =>
    onChangeDiagrams((current) => [...current, createDiagram()]);

  const deleteDiagram = (diagramId: string) =>
    onChangeDiagrams((current) =>
      current.filter((diagram) => diagram.id !== diagramId),
    );

  return (
    <Stack gap={24} style={{ maxWidth: SPEC_PAGE_MAX_WIDTH }}>
      <Stack gap={8}>
        <H2>Architecture</H2>
        <Text size="small" tone="tertiary">
          Each diagram is mermaid code. Edits are saved automatically. The
          picture updates when the agent renders the diagrams.
        </Text>
      </Stack>

      {diagrams.map((diagram, index) => (
        <Stack key={diagram.id} gap={24}>
          {index > 0 && <Divider />}
          <DiagramSection
            diagram={diagram}
            onChangeTitle={(title) => editDiagram(diagram.id, { title })}
            onChangeSource={(source) => editDiagram(diagram.id, { source })}
            onRequestRender={requestRender}
            onDelete={() => deleteDiagram(diagram.id)}
          />
        </Stack>
      ))}

      <Row>
        <Button variant="ghost" onClick={addDiagram}>
          + Add diagram
        </Button>
      </Row>
    </Stack>
  );
}

type DiagramSectionProps = {
  diagram: ArchitectureDiagram;
  onChangeTitle: (title: string) => void;
  onChangeSource: (source: string) => void;
  onRequestRender: () => void;
  onDelete: () => void;
};

function DiagramSection({
  diagram,
  onChangeTitle,
  onChangeSource,
  onRequestRender,
  onDelete,
}: DiagramSectionProps) {
  const hasUnrenderedChanges = diagram.source !== diagram.renderedSource;
  return (
    <Stack gap={12}>
      <Row gap={12} align="center" wrap>
        <TextInput
          value={diagram.title}
          onChange={onChangeTitle}
          placeholder="Diagram title"
          style={{ width: DIAGRAM_TITLE_MAX_WIDTH, maxWidth: "100%" }}
        />
        <DeleteDiagramButton onDelete={onDelete} />
      </Row>
      <Row gap={16} align="start" wrap>
        <Stack
          gap={8}
          style={{ flex: `1 1 ${DIAGRAM_PANE_MIN_WIDTH}px`, minWidth: 0 }}
        >
          <MermaidCodeEditor value={diagram.source} onChange={onChangeSource} />
          {hasUnrenderedChanges && (
            <Row gap={8} align="center" wrap>
              <Text size="small" tone="secondary">
                Changes not rendered yet
              </Text>
              <Button variant="secondary" onClick={onRequestRender}>
                Save changes
              </Button>
            </Row>
          )}
          {diagram.renderError && (
            <Text size="small" tone="secondary">
              {diagram.renderError}
            </Text>
          )}
        </Stack>
        {diagram.svg && <DiagramPreview svg={diagram.svg} />}
      </Row>
    </Stack>
  );
}

function DeleteDiagramButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Delete diagram
      </Button>
    );
  }
  return (
    <Row gap={8} align="center" wrap>
      <Text size="small" tone="secondary">
        Delete this diagram?
      </Text>
      <Button variant="primary" onClick={onDelete}>
        Delete
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </Row>
  );
}

// The SVG is rendered with `bg: var(--wb-diagram-bg)` and
// `fg: var(--wb-diagram-fg)`, so the wrapper sets those two variables from
// the host theme and one stored picture reads in dark and light themes.
function DiagramPreview({ svg }: { svg: string }) {
  const theme = useHostTheme();
  const style = {
    "--wb-diagram-bg": theme.bg.editor,
    "--wb-diagram-fg": theme.text.primary,
    flex: `1 1 ${DIAGRAM_PANE_MIN_WIDTH}px`,
    minWidth: 0,
    overflow: "auto",
    padding: 8,
    background: theme.bg.editor,
    border: `1px solid ${theme.stroke.tertiary}`,
    borderRadius: theme.radius.sm,
  } as CSSProperties;
  return <div style={style} dangerouslySetInnerHTML={{ __html: svg }} />;
}

type MermaidCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function MermaidCodeEditor({ value, onChange }: MermaidCodeEditorProps) {
  const theme = useHostTheme();
  const lineCount = Math.max(DIAGRAM_EDITOR_MIN_ROWS, value.split("\n").length);
  return (
    <textarea
      value={value}
      placeholder="Mermaid code"
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      aria-label="Mermaid code"
      onChange={(event: { currentTarget: HTMLTextAreaElement }) =>
        onChange(event.currentTarget.value)
      }
      onKeyDown={(event: CodeKeyEvent) => indentOnTab(event, onChange)}
      style={{
        boxSizing: "border-box",
        display: "block",
        width: "100%",
        height: lineCount * CODE_LINE_HEIGHT + CODE_PADDING * 2,
        fontFamily: CODE_FONT_FAMILY,
        fontSize: CODE_FONT_SIZE,
        lineHeight: `${CODE_LINE_HEIGHT}px`,
        tabSize: 2,
        padding: CODE_PADDING,
        margin: 0,
        whiteSpace: "pre",
        overflowX: "auto",
        overflowY: "hidden",
        resize: "none",
        outline: "none",
        color: theme.text.primary,
        background: theme.fill.tertiary,
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: theme.radius.sm,
      }}
    />
  );
}

// A stored diagram can predate a field. Missing fields read as empty.
function normalizeDiagrams(
  diagrams: Partial<ArchitectureDiagram>[] | undefined,
): ArchitectureDiagram[] {
  if (!Array.isArray(diagrams)) return [];
  return diagrams.map((diagram) => ({
    id: diagram.id ?? "",
    title: diagram.title ?? "",
    source: diagram.source ?? "",
    renderedSource: diagram.renderedSource ?? "",
    svg: diagram.svg ?? "",
    renderError: diagram.renderError ?? "",
  }));
}

function createDiagram(): ArchitectureDiagram {
  return {
    id: createDiagramId(),
    title: NEW_DIAGRAM_TITLE,
    source: "",
    renderedSource: "",
    svg: "",
    renderError: "",
  };
}

function createDiagramId(): string {
  return `arch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// MARK: - Stub surfaces

// E2E tests and Deliverables are placeholders. They store nothing and read
// nothing from the task data set.

const STUB_PAGE_INTRO = "This tab has no content yet.";

function E2eTestsPage(_props: SurfacePageProps) {
  return <StubPage title="E2E tests" />;
}

function DeliverablesPage(_props: SurfacePageProps) {
  return <StubPage title="Deliverables" />;
}

function StubPage({ title }: { title: string }) {
  return (
    <Stack gap={8} style={{ maxWidth: SPEC_PAGE_MAX_WIDTH }}>
      <H2>{title}</H2>
      <Text size="small" tone="tertiary">
        {STUB_PAGE_INTRO}
      </Text>
    </Stack>
  );
}

// MARK: - Feature specification

// Feature specification, UI elements, Functional elements, Unit tests, and
// Integration tests are tabs over one task's data set. The task's `TaskSpec`
// holds `specColumns` and `specRows` keyed by table id. The user types in the
// canvas and the agent writes the same `specRows`.

type ColumnKind = "text" | "code" | "selection" | "multi-selection";

type SelectionRef = {
  tableId: string;
  rowId: string;
};

type SpecColumn = {
  id: string;
  name: string;
  kind: ColumnKind;
};

type SpecRow = {
  id: string;
  done: boolean;
  cells: string[];
};

type SpecRowsByTable = Record<string, SpecRow[]>;

const SPEC_PAGE_MAX_WIDTH = 1400;
const NEW_COLUMN_NAME = "Column";
const TEXT_CELL_MIN_WIDTH = 200;
const SELECTION_CELL_MIN_WIDTH = 200;
// Matches the height of a one-line text cell so mixed rows align.
const SELECTION_FIELD_MIN_HEIGHT = 34;
const SELECTION_MENU_WIDTH = 260;
const SELECTION_MENU_MAX_HEIGHT = 220;
const CODE_CELL_MIN_WIDTH = 360;
const CODE_CELL_MIN_ROWS = 4;
const CODE_LINE_HEIGHT = 18;
const CODE_PADDING = 8;
const CODE_INDENT = "  ";
const CODE_FONT_FAMILY =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const CODE_FONT_SIZE = 12;
const HELP_ICON_SIZE = 16;
const HELP_POPOVER_WIDTH = 280;

const SPEC_PAGE_INTRO =
  "Edits are saved automatically. You or the agent can fill any cell. " +
  "Ask the agent to implement this specification.";

const TEST_PAGE_INTRO =
  "Edits are saved automatically. You or the agent can fill each row. " +
  "Write the description in plain English, with no test-framework names.";

const text = (id: string, name: string): SpecColumn => ({
  id,
  name,
  kind: "text",
});
const code = (id: string, name: string): SpecColumn => ({
  id,
  name,
  kind: "code",
});

// `description` is the hover tooltip on the help icon in the section header.
type TableMeta = { id: string; title: string; description: string };

const featureSpecificationTables: TableMeta[] = [
  {
    id: "user-stories",
    title: "User stories",
    description:
      "Short statements of what a user wants and why, written from the " +
      'user\'s view ("As a …, I want …, so that …"). They define the scope ' +
      "and value of the feature, not the design.",
  },
  {
    id: "acceptance-criteria",
    title: "Acceptance criteria",
    description:
      "Testable conditions that must be true for a user story to count as " +
      "done. They turn a story into a pass or fail check and are the base " +
      "for tests.",
  },
  {
    id: "functional-requirements",
    title: "Functional requirements",
    description:
      "What the system must do. Specific behaviours, inputs, outputs, and " +
      "rules. They drive the components, interfaces, and data flow of the " +
      "architecture.",
  },
  {
    id: "non-functional-requirements",
    title: "Non-functional requirements",
    description:
      "How well the system must do it. Performance, security, reliability, " +
      "scalability, accessibility, maintainability. They drive technology " +
      "choices and architecture trade-offs.",
  },
];

const uiElementsTables: TableMeta[] = [
  {
    id: "ui-elements",
    title: "UI elements",
    description:
      "The visual components the feature needs, with their contract and " +
      "interface.",
  },
];

const reactHooksTables: TableMeta[] = [
  {
    id: "react-hooks",
    title: "React hooks",
    description:
      "The functional building blocks (state, effects, data access) the " +
      "feature needs, with input and output.",
  },
];

const unitTestsTables: TableMeta[] = [
  {
    id: "unit-tests",
    title: "Unit tests",
    description:
      "Checks of one unit in isolation. Name the code-level components " +
      "under test, then state in plain English what must be true. Do not " +
      "name a test framework.",
  },
];

const integrationTestsTables: TableMeta[] = [
  {
    id: "integration-tests",
    title: "Integration tests",
    description:
      "Checks of how units work together. Name the code-level components " +
      "under test, then state in plain English what must be true. Do not " +
      "name a test framework.",
  },
];

type SelectionCatalogGroup = {
  id: string;
  title: string;
  tables: TableMeta[];
};

const selectionCatalogGroups: SelectionCatalogGroup[] = [
  {
    id: "ui-elements",
    title: "UI elements",
    tables: uiElementsTables,
  },
  {
    id: "functional-elements",
    title: "Functional elements",
    tables: reactHooksTables,
  },
];

const seedColumns: Record<string, SpecColumn[]> = {
  "user-stories": [text("us-story", "Story")],
  "acceptance-criteria": [text("ac-criterion", "Criterion")],
  "functional-requirements": [text("fr-requirement", "Requirement")],
  "non-functional-requirements": [text("nfr-requirement", "Requirement")],
  "ui-elements": [
    text("ui-element", "UI element"),
    text("ui-description", "Description"),
    text("ui-contract", "Contract"),
    text("ui-parameters", "Parameters"),
    code("ui-interface", "Interface"),
  ],
  "react-hooks": [
    text("fn-hook", "Hook"),
    text("fn-description", "Description"),
    text("fn-contract", "Contract"),
    text("fn-input", "Input"),
    text("fn-output", "Output"),
    code("fn-interface", "Interface"),
  ],
  // Components is free text for now. A later column will pick known UI
  // elements and functional elements from this workspace.
  "unit-tests": [
    text("ut-components", "Components"),
    text("ut-description", "Description"),
  ],
  "integration-tests": [
    text("it-components", "Components"),
    text("it-description", "Description"),
  ],
};

function FeatureSpecificationPage(props: SurfacePageProps) {
  return (
    <SpecPage
      {...props}
      title="Feature specification"
      tables={featureSpecificationTables}
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

function UnitTestsPage(props: SurfacePageProps) {
  return (
    <SpecPage
      {...props}
      title="Unit tests"
      tables={unitTestsTables}
      intro={TEST_PAGE_INTRO}
    />
  );
}

function IntegrationTestsPage(props: SurfacePageProps) {
  return (
    <SpecPage
      {...props}
      title="Integration tests"
      tables={integrationTestsTables}
      intro={TEST_PAGE_INTRO}
    />
  );
}

type SpecPageProps = SurfacePageProps & {
  title: string;
  tables: TableMeta[];
  intro?: string;
};

function SpecPage({
  title,
  tables,
  spec,
  onChangeSpec,
  intro = SPEC_PAGE_INTRO,
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
        <Text size="small" tone="tertiary">
          {intro}
        </Text>
      </Stack>

      <Stack gap={16}>
        {tables.map((table) => (
          <SpecTableSection
            key={table.id}
            title={table.title}
            description={table.description}
            columns={spec.specColumns[table.id] ?? seedColumns[table.id] ?? []}
            rows={spec.specRows[table.id] ?? []}
            specRows={spec.specRows}
            onChangeRows={(update) => updateRows(table.id, update)}
            onChangeColumns={(update) => updateColumns(table.id, update)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

type SpecTableSectionProps = {
  title: string;
  description: string;
  columns: SpecColumn[];
  rows: SpecRow[];
  specRows: SpecRowsByTable;
  onChangeRows: (update: (rows: SpecRow[]) => SpecRow[]) => void;
  onChangeColumns: (update: (columns: SpecColumn[]) => SpecColumn[]) => void;
};

function SpecTableSection({
  title,
  description,
  columns,
  rows,
  specRows,
  onChangeRows,
  onChangeColumns,
}: SpecTableSectionProps) {
  const editCell = (rowId: string, columnIndex: number, value: string) =>
    onChangeRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? { ...row, cells: withCell(row.cells, columnIndex, value) }
          : row,
      ),
    );

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

  // A new column is always Text. The kind selector in its header changes it.
  const addColumn = () => {
    const index = columns.length;
    onChangeColumns((current) => [
      ...current,
      { id: createColumnId(), name: NEW_COLUMN_NAME, kind: "text" },
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
        value={row.cells[columnIndex] ?? ""}
        specRows={specRows}
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
    <CollapsibleSection
      title={title}
      count={rows.length}
      trailing={<TableHelpIcon description={description} />}
      defaultOpen
    >
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
          <Button variant="ghost" onClick={addColumn}>
            + Add column
          </Button>
        </Row>
      </Stack>
    </CollapsibleSection>
  );
}

// The canvas SDK has no Tooltip component and the canvas webview does not
// paint native `title` tooltips, so the popover is rendered by hand. The icon
// sits inside the CollapsibleSection header, which toggles on click, so the
// click must not bubble.
function TableHelpIcon({ description }: { description: string }) {
  const theme = useHostTheme();
  const [open, setOpen] = useState(false);
  return (
    <span
      tabIndex={0}
      aria-label="What this table is for"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(event: { stopPropagation: () => void }) =>
        event.stopPropagation()
      }
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: HELP_ICON_SIZE,
        height: HELP_ICON_SIZE,
        borderRadius: HELP_ICON_SIZE / 2,
        fontSize: 11,
        lineHeight: 1,
        cursor: "help",
        color: open ? theme.text.primary : theme.text.tertiary,
        background: open ? theme.fill.secondary : theme.fill.quaternary,
      }}
    >
      ?
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            width: HELP_POPOVER_WIDTH,
            padding: 8,
            zIndex: 1,
            textAlign: "left",
            cursor: "default",
            background: theme.bg.elevated,
            border: `1px solid ${theme.stroke.secondary}`,
            borderRadius: theme.radius.sm,
          }}
        >
          <Text size="small">{description}</Text>
        </span>
      )}
    </span>
  );
}

type ColumnHeaderProps = {
  column: SpecColumn;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onRename: (name: string) => void;
  onKindChange: (kind: ColumnKind) => void;
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
            { value: "selection", label: "Selection" },
            { value: "multi-selection", label: "Multi-selection" },
          ]}
          style={{ minWidth: 140 }}
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
    </Stack>
  );
}

type CellEditorProps = {
  column: SpecColumn;
  value: string;
  specRows: SpecRowsByTable;
  onChange: (value: string) => void;
};

function CellEditor({ column, value, specRows, onChange }: CellEditorProps) {
  if (column.kind === "selection" || column.kind === "multi-selection") {
    return (
      <SelectionCellEditor
        value={value}
        specRows={specRows}
        mode={column.kind}
        onChange={onChange}
      />
    );
  }

  if (column.kind === "code") {
    return (
      <TypeScriptCodeEditor
        value={value}
        onChange={onChange}
        placeholder={`interface ${column.name} {\n  \n}`}
      />
    );
  }

  return (
    <TextCellEditor
      value={value}
      onChange={onChange}
      placeholder={column.name}
    />
  );
}

type SelectionCellEditorProps = {
  value: string;
  specRows: SpecRowsByTable;
  mode: "selection" | "multi-selection";
  onChange: (value: string) => void;
};

function SelectionCellEditor({
  value,
  specRows,
  mode,
  onChange,
}: SelectionCellEditorProps) {
  const theme = useHostTheme();
  const fieldRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<SelectionMenuBox | null>(null);
  const [activeGroupId, setActiveGroupId] = useState(
    selectionCatalogGroups[0]?.id ?? "",
  );
  const multiple = mode === "multi-selection";
  const selected = multiple
    ? parseMultiSelectionValue(value)
    : parseSelectionValue(value);
  const placeholder = multiple ? "Choose items" : "Choose one";

  const writeRefs = (refs: SelectionRef[]) =>
    onChange(
      multiple
        ? serializeMultiSelectionValue(refs)
        : serializeSelectionValue(refs[0] ?? null),
    );

  const removeRef = (ref: SelectionRef) =>
    writeRefs(
      selected.filter((item) => selectionRefKey(item) !== selectionRefKey(ref)),
    );

  const chooseRef = (ref: SelectionRef) => {
    const key = selectionRefKey(ref);
    const alreadySelected = selected.some(
      (item) => selectionRefKey(item) === key,
    );
    if (multiple) {
      writeRefs(
        alreadySelected
          ? selected.filter((item) => selectionRefKey(item) !== key)
          : [...selected, ref],
      );
      return;
    }
    writeRefs(alreadySelected ? [] : [ref]);
    setOpen(false);
    setMenuBox(null);
  };

  const activeGroup =
    selectionCatalogGroups.find((group) => group.id === activeGroupId) ??
    selectionCatalogGroups[0];
  const options = activeGroup
    ? catalogOptionsForGroup(specRows, activeGroup)
    : [];

  const isSelected = (ref: SelectionRef) =>
    selected.some((item) => selectionRefKey(item) === selectionRefKey(ref));

  const syncMenuBox = () => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuBox(placeSelectionMenu(rect));
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      setMenuBox(null);
      return;
    }
    syncMenuBox();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onViewportChange = () => syncMenuBox();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  return (
    <span
      style={{
        display: "block",
        minWidth: SELECTION_CELL_MIN_WIDTH,
      }}
    >
      <span
        ref={fieldRef}
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={(event: { key: string; preventDefault: () => void }) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggleOpen();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxSizing: "border-box",
          width: "100%",
          minHeight: SELECTION_FIELD_MIN_HEIGHT,
          padding: "6px 8px",
          fontSize: 13,
          lineHeight: "18px",
          cursor: "pointer",
          color: theme.text.primary,
          background: theme.fill.tertiary,
          border: `1px solid ${
            open ? theme.accent.primary : theme.stroke.secondary
          }`,
          borderRadius: theme.radius.sm,
          outline: "none",
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
          }}
        >
          {selected.length === 0 ? (
            <span style={{ color: theme.text.tertiary }}>{placeholder}</span>
          ) : (
            selected.map((ref) => (
              <SelectionChip
                key={selectionRefKey(ref)}
                resolved={resolveSelectionRef(specRows, ref)}
                onRemove={multiple ? () => removeRef(ref) : undefined}
              />
            ))
          )}
        </span>
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            fontSize: 10,
            color: theme.text.tertiary,
          }}
        >
          {open ? "▴" : "▾"}
        </span>
      </span>
      {open && menuBox && (
        <>
          <span
            onClick={() => {
              setOpen(false);
              setMenuBox(null);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 20 }}
          />
          <span
            role="listbox"
            style={{
              position: "fixed",
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
              zIndex: 21,
              display: "block",
              background: theme.bg.elevated,
              border: `1px solid ${theme.stroke.secondary}`,
              borderRadius: theme.radius.sm,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "flex",
                borderBottom: `1px solid ${theme.stroke.tertiary}`,
              }}
            >
              {selectionCatalogGroups.map((group) => (
                <SelectionMenuTab
                  key={group.id}
                  title={group.title}
                  active={group.id === activeGroup?.id}
                  onSelect={() => setActiveGroupId(group.id)}
                />
              ))}
            </span>
            <span
              style={{
                display: "block",
                maxHeight: SELECTION_MENU_MAX_HEIGHT,
                overflowY: "auto",
                padding: 4,
              }}
            >
              {options.length === 0 ? (
                <span
                  style={{
                    display: "block",
                    padding: "6px 8px",
                    fontSize: 12,
                    color: theme.text.tertiary,
                  }}
                >
                  No rows yet.
                </span>
              ) : (
                options.map((option) => (
                  <SelectionOptionRow
                    key={selectionRefKey(option)}
                    label={resolveSelectionRef(specRows, option).label}
                    checked={isSelected(option)}
                    onChoose={() => chooseRef(option)}
                  />
                ))
              )}
            </span>
          </span>
        </>
      )}
    </span>
  );
}

function SelectionChip({
  resolved,
  onRemove,
}: {
  resolved: ResolvedSelectionRef;
  onRemove?: () => void;
}) {
  const theme = useHostTheme();
  // A single-selection value reads as plain text; only lists need chips.
  if (!onRemove) {
    return (
      <span
        style={{
          color: resolved.missing ? theme.text.tertiary : theme.text.primary,
          fontStyle: resolved.missing ? "italic" : "normal",
        }}
      >
        {resolved.label}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 6px",
        fontSize: 12,
        lineHeight: "16px",
        color: resolved.missing ? theme.text.tertiary : theme.text.secondary,
        fontStyle: resolved.missing ? "italic" : "normal",
        background: theme.fill.secondary,
        borderRadius: theme.radius.sm,
      }}
    >
      {resolved.label}
      <span
        role="button"
        aria-label={`Remove ${resolved.label}`}
        onClick={(event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          onRemove();
        }}
        style={{ cursor: "pointer", color: theme.text.tertiary }}
      >
        ×
      </span>
    </span>
  );
}

function SelectionMenuTab({
  title,
  active,
  onSelect,
}: {
  title: string;
  active: boolean;
  onSelect: () => void;
}) {
  const theme = useHostTheme();
  return (
    <span
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      style={{
        flex: 1,
        textAlign: "center",
        padding: "6px 8px",
        fontSize: 12,
        cursor: "pointer",
        color: active ? theme.text.primary : theme.text.tertiary,
        // Pull the underline over the container border so the two lines meet.
        marginBottom: -1,
        borderBottom: `1px solid ${
          active ? theme.accent.primary : "transparent"
        }`,
      }}
    >
      {title}
    </span>
  );
}

function SelectionOptionRow({
  label,
  checked,
  onChoose,
}: {
  label: string;
  checked: boolean;
  onChoose: () => void;
}) {
  const theme = useHostTheme();
  // Inline styles cannot express `:hover`, so the highlight is tracked here.
  const [hovered, setHovered] = useState(false);
  return (
    <span
      role="option"
      aria-selected={checked}
      onClick={onChoose}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 8px",
        fontSize: 12,
        lineHeight: "16px",
        cursor: "pointer",
        color: theme.text.primary,
        background: hovered ? theme.fill.secondary : "transparent",
        borderRadius: theme.radius.sm,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 12,
          flexShrink: 0,
          textAlign: "center",
          color: theme.accent.primary,
          visibility: checked ? "visible" : "hidden",
        }}
      >
        ✓
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </span>
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
  useFitHeightToContent(textareaRef, value);

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

// Shared by every auto-growing textarea. Wrapped lines change when the width
// changes, not only when the text changes. Only width triggers the observer
// so the height update does not retrigger it.
function useFitHeightToContent(
  textareaRef: { current: HTMLTextAreaElement | null },
  value: string,
) {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    fitHeightToContent(textarea);
    let lastWidth = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === lastWidth) return;
      lastWidth = textarea.clientWidth;
      fitHeightToContent(textarea);
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [textareaRef, value]);
}

function fitHeightToContent(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight + 2}px`;
}

type TypeScriptCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

function TypeScriptCodeEditor({
  value,
  onChange,
  placeholder,
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
        aria-hidden
        style={{
          ...shared,
          position: "absolute",
          inset: 0,
          color: colors.text,
          pointerEvents: "none",
        }}
      >
        {value ? (
          highlightTypeScript(value, colors)
        ) : (
          <span style={{ color: theme.text.quaternary }}>{placeholder}</span>
        )}
      </pre>
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
        onKeyDown={(event: CodeKeyEvent) => indentOnTab(event, onChange)}
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

type CodeKeyEvent = TextKeyEvent & { shiftKey: boolean };

// `Tab` indents and `Shift+Tab` unindents in every code editor. The caret is
// restored after React re-renders the controlled textarea.
function indentOnTab(event: CodeKeyEvent, onChange: (value: string) => void) {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const textarea = event.currentTarget;
  const result = applyTabIndent(
    textarea.value,
    textarea.selectionStart,
    textarea.selectionEnd,
    event.shiftKey,
  );
  onChange(result.value);
  queueMicrotask(() => {
    textarea.selectionStart = result.start;
    textarea.selectionEnd = result.end;
  });
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

function isSelectionRef(value: unknown): value is SelectionRef {
  if (!value || typeof value !== "object") return false;
  const record = value as { tableId?: unknown; rowId?: unknown };
  return typeof record.tableId === "string" && typeof record.rowId === "string";
}

function parseSelectionValue(value: string): SelectionRef[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return isSelectionRef(parsed) ? [parsed] : [];
  } catch {
    return [];
  }
}

function parseMultiSelectionValue(value: string): SelectionRef[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSelectionRef);
  } catch {
    return [];
  }
}

function serializeSelectionValue(ref: SelectionRef | null): string {
  return ref ? JSON.stringify(ref) : "";
}

function serializeMultiSelectionValue(refs: SelectionRef[]): string {
  return refs.length === 0 ? "" : JSON.stringify(refs);
}

function selectionRefKey(ref: SelectionRef): string {
  return `${ref.tableId}:${ref.rowId}`;
}

function optionLabel(row: SpecRow): string {
  const label = (row.cells[0] ?? "").trim();
  return label.length > 0 ? label : "Untitled";
}

function catalogOptionsForGroup(
  specRows: SpecRowsByTable,
  group: SelectionCatalogGroup,
): SelectionRef[] {
  return group.tables.flatMap((table) =>
    (specRows[table.id] ?? []).map((row) => ({
      tableId: table.id,
      rowId: row.id,
    })),
  );
}

type ResolvedSelectionRef = { label: string; missing: boolean };

type SelectionMenuBox = { top: number; left: number; width: number };

function placeSelectionMenu(rect: {
  top: number;
  bottom: number;
  left: number;
  width: number;
}): SelectionMenuBox {
  const width = Math.max(rect.width, SELECTION_MENU_WIDTH);
  const maxLeft = Math.max(8, window.innerWidth - width - 8);
  const left = Math.min(Math.max(8, rect.left), maxLeft);
  const below = rect.bottom + 4;
  const estimatedHeight = SELECTION_MENU_MAX_HEIGHT + 36;
  const spaceBelow = window.innerHeight - below;
  const top =
    spaceBelow < estimatedHeight && rect.top > estimatedHeight
      ? rect.top - estimatedHeight
      : below;
  return { top, left, width };
}

function resolveSelectionRef(
  specRows: SpecRowsByTable,
  ref: SelectionRef,
): ResolvedSelectionRef {
  const row = (specRows[ref.tableId] ?? []).find((item) => item.id === ref.rowId);
  if (!row) return { label: "Missing item", missing: true };
  return { label: optionLabel(row), missing: false };
}
