#!/usr/bin/env node
// Render the mermaid diagrams of the Architecture surface to SVG.
//
// Usage:
//   node scripts/render-architecture.mjs <workbench.canvas.data.json> [taskId] [diagramId]
//
// Without a diagram id, every diagram whose `source` differs from
// `renderedSource` is rendered. With a diagram id, that diagram is rendered
// even when it is unchanged. Only `svg`, `renderedSource`, and `renderError`
// of the targeted diagrams change; every other key is written back as read.

import { readFileSync, writeFileSync } from "node:fs";
import { renderMermaidSVG } from "beautiful-mermaid";

const ARCHITECTURE_KEY = "taskArchitecture";

// The canvas sets these variables from `useHostTheme()` on the wrapper
// element, so one SVG reads in both the dark and the light theme.
const DIAGRAM_COLORS = {
  bg: "var(--wb-diagram-bg)",
  fg: "var(--wb-diagram-fg)",
};

const JSON_INDENT = 2;

function main(argv) {
  const [dataPath, taskId, diagramId] = argv;
  if (!dataPath) {
    console.error(
      "Usage: render-architecture.mjs <workbench.canvas.data.json> [taskId] [diagramId]",
    );
    return 2;
  }

  const targets = selectTargets(readData(dataPath), taskId, diagramId);
  const results = targets.map(renderTarget);

  // Re-read right before writing so edits made while rendering are kept.
  const data = readData(dataPath);
  const changed = applyResults(data, results);
  if (changed === 0) {
    console.log("Nothing to render.");
    return 0;
  }

  writeFileSync(dataPath, `${JSON.stringify(data, null, JSON_INDENT)}\n`);
  for (const result of results) {
    console.log(describeResult(result));
  }
  return results.some((result) => result.renderError) ? 1 : 0;
}

function readData(dataPath) {
  const parsed = JSON.parse(readFileSync(dataPath, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${dataPath} does not contain a JSON object.`);
  }
  return parsed;
}

function selectTargets(data, taskId, diagramId) {
  const byTask = data[ARCHITECTURE_KEY] ?? {};
  const taskIds = taskId ? [taskId] : Object.keys(byTask);
  const targets = [];
  for (const id of taskIds) {
    const diagrams = Array.isArray(byTask[id]) ? byTask[id] : [];
    for (const diagram of diagrams) {
      if (!isTarget(diagram, diagramId)) continue;
      targets.push({ taskId: id, diagramId: diagram.id, source: text(diagram.source) });
    }
  }
  return targets;
}

function isTarget(diagram, diagramId) {
  if (typeof diagram !== "object" || diagram === null) return false;
  if (diagramId) return diagram.id === diagramId;
  return text(diagram.source) !== text(diagram.renderedSource);
}

function renderTarget(target) {
  const { source } = target;
  // Whitespace-only source keeps `renderedSource` equal to `source` so the
  // canvas does not report unsaved changes for a blank diagram.
  if (source.trim() === "") {
    return { ...target, svg: "", renderedSource: source, renderError: "" };
  }
  try {
    const svg = renderMermaidSVG(source, DIAGRAM_COLORS);
    return { ...target, svg, renderedSource: source, renderError: "" };
  } catch (error) {
    return { ...target, renderError: errorMessage(error) };
  }
}

// Returns how many diagrams changed. A failed render keeps the old `svg` and
// `renderedSource` so the last good picture stays visible next to the error.
function applyResults(data, results) {
  let changed = 0;
  for (const result of results) {
    const diagram = findDiagram(data, result.taskId, result.diagramId);
    if (!diagram) continue;
    const next = result.renderError
      ? { renderError: result.renderError }
      : {
          svg: result.svg,
          renderedSource: result.renderedSource,
          renderError: "",
        };
    for (const [key, value] of Object.entries(next)) {
      if (text(diagram[key]) === value) continue;
      diagram[key] = value;
      changed += 1;
    }
  }
  return changed;
}

function findDiagram(data, taskId, diagramId) {
  const diagrams = data[ARCHITECTURE_KEY]?.[taskId];
  if (!Array.isArray(diagrams)) return undefined;
  return diagrams.find(
    (diagram) =>
      typeof diagram === "object" && diagram !== null && diagram.id === diagramId,
  );
}

function describeResult(result) {
  const label = `${result.taskId}/${result.diagramId}`;
  if (result.renderError) return `${label}: error: ${result.renderError}`;
  if (result.svg === "") return `${label}: cleared (empty source)`;
  return `${label}: rendered`;
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

process.exitCode = main(process.argv.slice(2));
