// Bash command classifier shared by tests and the scaffolded safe-bash hook.
// IMPORTANT: this is a best-effort UX safety net, not a security boundary.
// Regex cannot match a shell parser — variable indirection (`$CMD`), command
// substitution (`$(…)`), eval contexts, stdin pipelines, and many other shell
// features bypass these patterns trivially. Use containers / seccomp / a
// dedicated user for actual adversarial isolation. See SECURITY.md.
//
// Keep rule definitions in sync with src/templates/hooks/safe-bash.js.
const BASH_RULES = [
  {
    decision: 'deny',
    label: 'dangerous root delete',
    pattern: /\brm\s+(-[A-Za-z]*[rRfF][A-Za-z]*\s+)+(\/|\/\s|\/\*|\$HOME|~\/?)/i,
  },
  {
    decision: 'deny',
    label: 'curl pipe shell',
    pattern: /curl\b[^\n|]*\|\s*(bash|sh|zsh)\b/i,
  },
  {
    decision: 'deny',
    label: 'wget pipe shell',
    pattern: /wget\b[^\n|]*\|\s*(bash|sh|zsh)\b/i,
  },
  {
    decision: 'deny',
    label: 'disk utility',
    pattern: /(^|[\s;&|])(dd\s|mkfs(\.[a-z0-9]+)?\s|fdisk\s)/i,
  },
  {
    decision: 'deny',
    label: 'broad chmod',
    pattern: /chmod\s+-R\s+777\b/i,
  },
  {
    decision: 'ask',
    label: 'sudo command',
    pattern: /(^|[\s;&|])sudo\s/i,
  },
];

export function classifyBashCommand(command) {
  if (typeof command !== 'string' || command.trim() === '') return null;
  for (const rule of BASH_RULES) {
    if (rule.pattern.test(command)) return rule;
  }
  return null;
}

export { BASH_RULES };
