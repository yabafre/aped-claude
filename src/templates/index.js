import { skills } from './skills.js';
import { scripts } from './scripts.js';
import { references } from './references.js';
import { configFiles } from './config.js';
import { commands } from './commands.js';

export function getTemplates(config) {
  return [
    ...configFiles(config),
    ...commands(config),
    ...skills(config),
    ...scripts(config),
    ...references(config),
  ];
}
