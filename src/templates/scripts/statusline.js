#!/usr/bin/env node
// APED statusline. Installed via `aped-method statusline`. Reads the APED
// state.yaml and git branch to render a compact phase / epic / story /
// review / worktrees / branch line. Best-effort YAML parsing via regex;
// degrades silently when state is missing or malformed.
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let data = {};
  try { data = input ? JSON.parse(input) : {}; } catch { data = {}; }

  const projectDir = process.env.CLAUDE_PROJECT_DIR
    || data.workspace?.project_dir
    || data.workspace?.current_dir
    || process.cwd();

  const statePath = join(projectDir, '{{OUTPUT_DIR}}', 'state.yaml');
  const summary = summarizeState(statePath);
  const branch = readBranch(projectDir);
  const worktrees = countWorktrees(projectDir, summary);
  const model = data.model?.display_name || data.model?.id || 'Claude';
  const project = basename(projectDir);

  const parts = [
    color('36', '[' + model + ']'),
    color('32', project),
    summary.phase ? color('33', 'phase:' + summary.phase) : null,
    summary.epic ? color('35', 'epic:' + summary.epic) : null,
    summary.story ? color('34', 'story:' + summary.story) : null,
    summary.reviewCount > 0 ? color('31', 'review:' + summary.reviewCount) : null,
    worktrees > 0 ? color('36', 'worktrees:' + worktrees) : null,
    branch ? color(summary.dirty ? '31' : '32', 'git:' + branch + (summary.dirty ? '*' : '')) : null,
  ].filter(Boolean);

  process.stdout.write(parts.join(' | ') + '\n');
});

function summarizeState(statePath) {
  if (!existsSync(statePath)) {
    return { phase: 'none', epic: null, story: null, reviewCount: 0, worktreeCount: 0, dirty: false };
  }

  const state = readFileSync(statePath, 'utf8');
  const phaseMatch = state.match(/current_phase:\s*"?([^"\n]+)"?/);
  const epicMatch = state.match(/active_epic:\s*([^\n]+)/);
  const stories = [];
  let currentStory = null;

  for (const line of state.split('\n')) {
    const storyMatch = line.match(/^\s{2}([^:\s]+):\s*$/);
    if (storyMatch) {
      currentStory = { key: storyMatch[1] };
      stories.push(currentStory);
      continue;
    }
    const statusMatch = line.match(/^\s{4}status:\s*"?([^"\n]+)"?/);
    if (statusMatch && currentStory) currentStory.status = statusMatch[1];
    const worktreeMatch = line.match(/^\s{4}worktree:\s*"?([^"\n]+)"?/);
    if (worktreeMatch && currentStory) currentStory.worktree = worktreeMatch[1];
  }

  const activeStory = stories.find((story) => ['in-progress', 'review', 'review-queued', 'ready-for-dev'].includes(story.status))
    || null;
  const reviewCount = stories.filter((story) => ['review', 'review-queued'].includes(story.status)).length;
  const worktreeCount = stories.filter((story) => Boolean(story.worktree)).length;

  return {
    phase: phaseMatch ? phaseMatch[1] : 'none',
    epic: epicMatch ? epicMatch[1].replace(/["'\s]/g, '') : null,
    story: activeStory ? activeStory.key : null,
    reviewCount,
    worktreeCount,
    dirty: false,
  };
}

function readBranch(projectDir) {
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.status !== 0) return '';
  return result.stdout.trim();
}

function countWorktrees(projectDir, summary) {
  const result = spawnSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.status === 0) {
    const count = result.stdout.split('\n').filter((line) => line.startsWith('worktree ')).length;
    return Math.max(count - 1, 0);
  }
  return summary.worktreeCount;
}

function color(code, text) {
  return '\x1b[' + code + 'm' + text + '\x1b[0m';
}
