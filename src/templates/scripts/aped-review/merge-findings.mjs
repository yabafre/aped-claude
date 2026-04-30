#!/usr/bin/env node
// Merge findings from parallel review sub-agents (4.18.0).
// Reads YAML findings from stdin (one per reviewer), deduplicates by
// file:line + category, assigns severity, outputs the merged report.
//
// Usage: echo "$FINDINGS_YAML" | node merge-findings.mjs
//
// Input format (per reviewer, concatenated):
// ---
// reviewer: hannah
// findings:
//   - file: src/auth.ts
//     line: 42
//     category: hallucinated-identifier
//     severity: BLOCKER
//     message: "identifier 'authService' not in spec"
// ---
//
// Output: merged YAML report to stdout.

import { readFileSync } from 'node:fs';

function parseFindingsFromStdin(input) {
  const lines = input.split('\n');
  const allFindings = [];
  const reviewers = [];
  let currentReviewer = null;
  let currentFinding = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === '---') continue;

    const reviewerMatch = line.match(/^reviewer:\s*(.+)/);
    if (reviewerMatch) {
      currentReviewer = reviewerMatch[1].trim();
      reviewers.push({ name: currentReviewer, finding_count: 0 });
      currentFinding = null;
      continue;
    }
    if (line.match(/^findings:/)) continue;

    const itemStart = line.match(/^\s+-\s+file:\s*"?(.+?)"?\s*$/);
    if (itemStart) {
      currentFinding = { file: itemStart[1], line: 0, category: 'uncategorized', severity: 'MINOR', message: '', reviewer: currentReviewer || 'unknown' };
      allFindings.push(currentFinding);
      if (reviewers.length) reviewers[reviewers.length - 1].finding_count++;
      continue;
    }

    if (currentFinding) {
      const lineMatch = line.match(/^\s+line:\s*(\d+)/);
      const catMatch = line.match(/^\s+category:\s*(.+)/);
      const sevMatch = line.match(/^\s+severity:\s*(.+)/);
      const msgMatch = line.match(/^\s+message:\s*"?(.+?)"?\s*$/);
      if (lineMatch) currentFinding.line = parseInt(lineMatch[1], 10);
      if (catMatch) currentFinding.category = catMatch[1].trim();
      if (sevMatch) currentFinding.severity = sevMatch[1].trim().toUpperCase();
      if (msgMatch) currentFinding.message = msgMatch[1].trim();
    }
  }

  return { allFindings, reviewers };
}

function deduplicateFindings(findings) {
  const seen = new Map();
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.category}`;
    if (!seen.has(key)) {
      seen.set(key, f);
    } else {
      const existing = seen.get(key);
      const SEVERITY_ORDER = { BLOCKER: 0, MAJOR: 1, MINOR: 2, NIT: 3 };
      if ((SEVERITY_ORDER[f.severity] ?? 3) < (SEVERITY_ORDER[existing.severity] ?? 3)) {
        seen.set(key, f);
      }
    }
  }
  return [...seen.values()];
}

function categorize(findings) {
  const buckets = { blockers: [], majors: [], minors: [], nits: [] };
  for (const f of findings) {
    if (f.severity === 'BLOCKER') buckets.blockers.push(f);
    else if (f.severity === 'MAJOR') buckets.majors.push(f);
    else if (f.severity === 'NIT') buckets.nits.push(f);
    else buckets.minors.push(f);
  }
  return buckets;
}

function formatYaml(buckets, reviewers) {
  const lines = ['review:'];
  lines.push(`  summary: "${buckets.blockers.length} blockers, ${buckets.majors.length} majors, ${buckets.minors.length} minors, ${buckets.nits.length} nits"`);

  for (const [key, items] of Object.entries(buckets)) {
    lines.push(`  ${key}:`);
    if (items.length === 0) {
      lines.push(`    []`);
    } else {
      for (const f of items) {
        lines.push(`    - file: "${f.file}"`);
        lines.push(`      line: ${f.line}`);
        lines.push(`      category: ${f.category}`);
        lines.push(`      severity: ${f.severity}`);
        lines.push(`      message: "${f.message}"`);
        lines.push(`      reviewer: ${f.reviewer}`);
      }
    }
  }

  lines.push(`  reviewers:`);
  for (const r of reviewers) {
    lines.push(`    - name: ${r.name}`);
    lines.push(`      finding_count: ${r.finding_count}`);
  }

  return lines.join('\n') + '\n';
}

export function mergeFindings(input) {
  const { allFindings, reviewers } = parseFindingsFromStdin(input);
  const deduped = deduplicateFindings(allFindings);
  const buckets = categorize(deduped);
  return formatYaml(buckets, reviewers);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const input = readFileSync('/dev/stdin', 'utf-8');
  process.stdout.write(mergeFindings(input));
}
