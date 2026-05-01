import { skills } from './skills.js';
import { scripts } from './scripts.js';
import { references } from './references.js';
import { configFiles } from './config.js';
import { guardrail } from './guardrail.js';
import { symlinks } from './symlinks.js';
import { checklists } from './checklists.js';

export function getTemplates(config) {
  return [
    ...configFiles(config),
    ...skills(config),
    ...symlinks(config),
    ...scripts(config),
    ...references(config),
    ...guardrail(config),
    ...checklists(config),
  ];
}
