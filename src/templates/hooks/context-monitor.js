#!/usr/bin/env node
// APED context-monitor — PostToolUse advisory hook (opt-in).
//
// Reads the transcript after each tool use, computes used / limit / remaining
// from the last assistant turn's usage record (same formula as the statusline:
// input_tokens + cache_read + cache_creation), and injects an advisory message
// when remaining drops below thresholds. The agent SEES the warning in its
// conversation — the user already sees the statusline bar.
//
// Thresholds:
//   WARNING  (remaining <= 35%): wrap up, no new complex work
//   CRITICAL (remaining <= 25%): stop and tell the user
//
// Debounce: 5 tool calls between warnings to avoid spam. Severity escalation
// (WARNING → CRITICAL) bypasses the debounce so the agent sees the upgrade
// immediately.
//
// Disable: set `hooks.context_monitor: false` in `{{APED_DIR}}/config.local.yaml`
// (per-developer, gitignored, read first) or `{{APED_DIR}}/config.yaml` (team).
//
// stdin:  PostToolUse JSON (session_id, transcript_path, cwd, model)
// stdout: hookSpecificOutput.additionalContext on advisory; empty on silent.
// exit:   0 always (advisory only — never block).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));

const WARNING_THRESHOLD = 35;
const CRITICAL_THRESHOLD = 25;
const STALE_SECONDS = 60;
const DEBOUNCE_CALLS = 5;

const stdinTimeout = setTimeout(() => process.exit(0), 10_000);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    runHook(input);
  } catch {
    // Silent fail — never block tool execution.
  }
});

function runHook(rawInput) {
  let data;
  try {
    data = JSON.parse(rawInput);
  } catch {
    return;
  }

  const sessionId = data.session_id;
  if (!sessionId || /[/\\]|\.\./.test(sessionId)) return;

  const cwd = data.cwd || process.cwd();
  if (isDisabledViaConfig(cwd)) return;

  const transcriptPath = data.transcript_path;
  if (!transcriptPath || !existsSync(transcriptPath)) return;

  const used = lastTurnUsedTokens(transcriptPath);
  if (!used) return;

  const limit = detectContextWindow(data);
  const usedPct = Math.round((used / limit) * 100);
  const remaining = 100 - usedPct;
  if (remaining > WARNING_THRESHOLD) return;

  const warnPath = join(tmpdir(), `aped-ctx-${sessionId}-warned.json`);
  const warnData = readWarn(warnPath);
  const isCritical = remaining <= CRITICAL_THRESHOLD;
  const currentLevel = isCritical ? 'critical' : 'warning';
  const severityEscalated =
    currentLevel === 'critical' && warnData.lastLevel === 'warning';
  warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;

  const firstWarn = warnData.lastLevel === null;
  if (!firstWarn && warnData.callsSinceWarn < DEBOUNCE_CALLS && !severityEscalated) {
    writeWarn(warnPath, warnData);
    return;
  }

  warnData.callsSinceWarn = 0;
  warnData.lastLevel = currentLevel;
  warnData.timestamp = Math.floor(Date.now() / 1000);
  writeWarn(warnPath, warnData);

  const apedActive = existsSync(join(cwd, '{{OUTPUT_DIR}}', 'state.yaml'));
  const message = buildMessage(isCritical, apedActive, usedPct, remaining);

  const output = {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: message,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

function isDisabledViaConfig(cwd) {
  for (const name of ['config.local.yaml', 'config.yaml']) {
    const p = join(cwd, '{{APED_DIR}}', name);
    if (!existsSync(p)) continue;
    try {
      const yaml = readFileSync(p, 'utf8');
      // Tolerant regex — matches `context_monitor: false` under any indent.
      if (/(^|\n)\s*context_monitor:\s*false\b/.test(yaml)) return true;
    } catch {
      // Fall through.
    }
  }
  return false;
}

function lastTurnUsedTokens(transcriptPath) {
  let raw;
  try {
    raw = readFileSync(transcriptPath, 'utf8');
  } catch {
    return 0;
  }
  const lines = raw.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const usage = entry?.message?.usage;
    if (!usage) continue;
    return (
      (usage.input_tokens || 0) +
      (usage.cache_read_input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0)
    );
  }
  return 0;
}

function detectContextWindow(data) {
  const id = (data?.model?.id || '').toLowerCase();
  const name = (data?.model?.display_name || '').toLowerCase();
  if (id.includes('[1m]') || name.includes('1m context') || name.includes('1m ')) {
    return 1_000_000;
  }
  return 200_000;
}

function readWarn(path) {
  if (!existsSync(path)) {
    return { callsSinceWarn: 0, lastLevel: null, timestamp: 0 };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (parsed.timestamp && now - parsed.timestamp > STALE_SECONDS) {
      // Treat stale state as a fresh session — first warn fires immediately.
      return { callsSinceWarn: 0, lastLevel: null, timestamp: 0 };
    }
    return {
      callsSinceWarn: parsed.callsSinceWarn ?? 0,
      lastLevel: parsed.lastLevel ?? null,
      timestamp: parsed.timestamp ?? 0,
    };
  } catch {
    return { callsSinceWarn: 0, lastLevel: null, timestamp: 0 };
  }
}

function writeWarn(path, data) {
  try {
    writeFileSync(path, JSON.stringify(data));
  } catch {
    // Best-effort — debounce file is advisory.
  }
}

function buildMessage(isCritical, apedActive, usedPct, remaining) {
  if (isCritical) {
    return apedActive
      ? `CONTEXT CRITICAL: usage ${usedPct}%, remaining ${remaining}%. ` +
          'Stop new complex work. Tell the user that context is nearly exhausted ' +
          'so they can decide whether to run aped-checkpoint or wrap up at the next ' +
          'natural stopping point. Do NOT autonomously write handoff files.'
      : `CONTEXT CRITICAL: usage ${usedPct}%, remaining ${remaining}%. ` +
          'Context is nearly exhausted. Inform the user and ask how to proceed. ' +
          'Do NOT autonomously save state or write handoff files unless asked.';
  }
  return apedActive
    ? `CONTEXT WARNING: usage ${usedPct}%, remaining ${remaining}%. ` +
        'Avoid starting new complex work. If you are not mid-step in an APED phase, ' +
        'inform the user so they can prepare to pause.'
    : `CONTEXT WARNING: usage ${usedPct}%, remaining ${remaining}%. ` +
        'Context is getting limited. Avoid unnecessary exploration or new complex work.';
}
