import {
  Button,
  Checkbox,
  CollapsibleSection,
  H1,
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
} from "cursor/canvas";

// Column ownership (not a hard IDE lock; agents can still edit files):
// - Edit (readOnly false): human. Never change those cell values.
// - Read-only (readOnly true): agent. Write only into `agentCells`.
// agentCells shape: tableId -> rowId -> columnId -> string

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

const TEXT_CELL_MIN_WIDTH = 200;
const CODE_CELL_MIN_WIDTH = 360;
const CODE_CELL_MIN_ROWS = 4;
const CODE_LINE_HEIGHT = 18;
const CODE_PADDING = 8;
const CODE_INDENT = "  ";
const CODE_FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
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

const tableMeta: TableMeta[] = [
  { id: "user-stories", title: "User stories" },
  { id: "acceptance-criteria", title: "Acceptance criteria" },
  { id: "ui-elements", title: "UI elements" },
  { id: "functional-elements", title: "Functional elements" },
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
  "functional-elements": [
    text("fn-hook", "Hook"),
    text("fn-description", "Description"),
    text("fn-contract", "Contract"),
    text("fn-input", "Input"),
    text("fn-output", "Output"),
    code("fn-interface", "Interface", true),
  ],
};

const seedRows: SpecRowsByTable = {
  "user-stories": [
    { id: "us-1", done: false, cells: ["As a user, I can create a ToDo item"] },
    { id: "us-2", done: false, cells: ["As a user, I can delete a ToDo item"] },
    { id: "us-3", done: false, cells: ["As a user, I can edit a ToDo item"] },
    { id: "us-4", done: false, cells: ["As a user, I can check a ToDo item"] },
    { id: "us-5", done: false, cells: ["As a user, I can un-check a ToDo item"] },
  ],
  "acceptance-criteria": [],
  "ui-elements": [
    {
      id: "ui-1",
      done: false,
      cells: [
        "Todo item list",
        "List view that holds the todo items",
        [
          "• Given a list of todo items, it will display them",
          "• Given a create callback, it can call it",
          "• Given a delete callback, it can pass that responsibility to the todo item",
          "• Given an edit callback, it can pass that responsibility to the todo item",
        ].join("\n"),
        ["• Todo item list", "• Create callback", "• Delete callback", "• Edit callback"].join(
          "\n",
        ),
        "",
      ],
    },
    {
      id: "ui-2",
      done: false,
      cells: [
        "Todo item",
        "The main component that represents a todo item.",
        [
          "• Given a todo item content, it will display it",
          "• Given a delete callback, it can pass the todo id to it and call it",
          "• Given an edit callback, it can pass the todo id and new content to it and call it.",
        ].join("\n"),
        ["• Content", "• Delete callback", "• Edit callback"].join("\n"),
        "",
      ],
    },
  ],
  "functional-elements": [
    {
      id: "fn-1",
      done: false,
      cells: [
        "useTodoItems",
        "Manages the persistence, creation, deletion and editing of todo items",
        "• Given the data presentation of the todo items, it can manipulate them and return the new state of the todo items",
        "• data state (todo items)",
        [
          "• new data state (todo items)",
          "• create function",
          "• delete function",
          "• edit function",
        ].join("\n"),
      ],
    },
  ],
};

export default function FeatureSpecificationCanvas() {
  const [featureName, setFeatureName] = useCanvasState("featureName", "ToDo App");
  const [columnsByTable, setColumnsByTable] = useCanvasState("specColumns", seedColumns);
  const [rowsByTable, setRowsByTable] = useCanvasState<SpecRowsByTable>("specRows", seedRows);
  const [agentCells] = useCanvasState<AgentCells>("agentCells", {});

  const updateRows = (tableId: string, update: (rows: SpecRow[]) => SpecRow[]) =>
    setRowsByTable((previous) => ({
      ...previous,
      [tableId]: update(previous[tableId] ?? []),
    }));

  const updateColumns = (
    tableId: string,
    update: (columns: SpecColumn[]) => SpecColumn[],
  ) =>
    setColumnsByTable((previous) => ({
      ...previous,
      [tableId]: update(previous[tableId] ?? seedColumns[tableId] ?? []),
    }));

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 1400 }}>
      <Stack gap={8}>
        <H1>Feature specification</H1>
        <TextInput
          value={featureName}
          onChange={setFeatureName}
          placeholder="Feature name"
          style={{ maxWidth: 360 }}
        />
        <Text size="small" tone="tertiary">
          Edits are saved automatically. Ask the agent to implement this specification.
          Edit columns are human-owned. Read-only columns are agent-owned.
        </Text>
      </Stack>

      <Stack gap={16}>
        {tableMeta.map((table) => (
          <SpecTableSection
            key={table.id}
            tableId={table.id}
            title={table.title}
            columns={columnsByTable[table.id] ?? seedColumns[table.id] ?? []}
            rows={rowsByTable[table.id] ?? []}
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
        row.id === rowId ? { ...row, cells: withCell(row.cells, columnIndex, value) } : row,
      ),
    );
  };

  const setDone = (rowId: string, done: boolean) =>
    onChangeRows((current) => current.map((row) => (row.id === rowId ? { ...row, done } : row)));

  const deleteRow = (rowId: string) =>
    onChangeRows((current) => current.filter((row) => row.id !== rowId));

  const addRow = () =>
    onChangeRows((current) => [
      ...current,
      { id: createRowId(), done: false, cells: columns.map(() => "") },
    ]);

  const renameColumn = (columnId: string, name: string) =>
    onChangeColumns((current) =>
      current.map((column) => (column.id === columnId ? { ...column, name } : column)),
    );

  const setColumnKind = (columnId: string, kind: ColumnKind) =>
    onChangeColumns((current) =>
      current.map((column) => (column.id === columnId ? { ...column, kind } : column)),
    );

  const setColumnReadOnly = (columnId: string, readOnly: boolean) =>
    onChangeColumns((current) =>
      current.map((column) => (column.id === columnId ? { ...column, readOnly } : column)),
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
      current.map((row) => ({ ...row, cells: insertCell(row.cells, index, "") })),
    );
  };

  const deleteColumn = (columnIndex: number) => {
    if (columns.length <= 1) return;
    onChangeColumns((current) => current.filter((_, index) => index !== columnIndex));
    onChangeRows((current) =>
      current.map((row) => ({ ...row, cells: removeCell(row.cells, columnIndex) })),
    );
  };

  const moveColumn = (columnIndex: number, direction: -1 | 1) => {
    const nextIndex = columnIndex + direction;
    if (nextIndex < 0 || nextIndex >= columns.length) return;
    onChangeColumns((current) => swapItems(current, columnIndex, nextIndex));
    onChangeRows((current) =>
      current.map((row) => ({
        ...row,
        cells: swapItems(padCells(row.cells, columns.length), columnIndex, nextIndex),
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
    <IconButton key={`${row.id}-delete`} title="Delete row" onClick={() => deleteRow(row.id)}>
      ✕
    </IconButton>,
  ]);
  const rowTone = rows.map((row) => (row.done === true ? "success" : undefined));

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
        <IconButton title="Move column left" disabled={!canMoveLeft} onClick={onMoveLeft}>
          ←
        </IconButton>
        <IconButton title="Move column right" disabled={!canMoveRight} onClick={onMoveRight}>
          →
        </IconButton>
        <IconButton title="Delete column" disabled={!canDelete} onClick={onDelete}>
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
        {value
          ? highlightTypeScript(value, colors)
          : <span style={{ color: theme.text.quaternary }}>{placeholder}</span>}
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
    const next = value.slice(0, selectionStart) + CODE_INDENT + value.slice(selectionEnd);
    const caret = selectionStart + CODE_INDENT.length;
    return { value: next, start: caret, end: caret };
  }

  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const endsOnLineStart = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n";
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
  const endsOnLineStart = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n";
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
    return agentCells[tableId]?.[row.id]?.[column.id] ?? row.cells[columnIndex] ?? "";
  }
  return row.cells[columnIndex] ?? "";
}

function withCell(cells: string[], columnIndex: number, value: string): string[] {
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
  return padCells(cells, index + 1).filter((_, cellIndex) => cellIndex !== index);
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
