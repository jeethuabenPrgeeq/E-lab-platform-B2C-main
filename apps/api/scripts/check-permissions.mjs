import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(resolve(here, path), 'utf8');
const keysIn = (text) => [...text.matchAll(/'([a-z]+(?:\.[a-z]+)+)'/g)].map((match) => match[1]);

const apiSource = read('../src/admin/access/permissions.ts');
const apiBlock = apiSource.slice(apiSource.indexOf('export const PERMISSIONS = ['), apiSource.indexOf('] as const;'));
const api = new Set(keysIn(apiBlock));

const typesSource = read('../../web/src/features/super/access/lib/types.ts');
const typeBlock = typesSource.slice(typesSource.indexOf('export type PermissionKey ='), typesSource.indexOf(';', typesSource.indexOf('export type PermissionKey =')));
const web = new Set(keysIn(typeBlock));

const sharedSource = read('../../web/src/features/super/access/lib/shared.ts');
const groupBlock = sharedSource.slice(sharedSource.indexOf('export const PERMISSION_GROUPS'), sharedSource.indexOf('export const AUTHORING_PERMISSIONS'));
const grouped = new Set([...groupBlock.matchAll(/key: '([^']+)'/g)].map((match) => match[1]));

const problems = [];
const compare = (label, left, right) => {
  for (const key of left) if (!right.has(key)) problems.push(`${label}: "${key}"`);
};
compare('In the API but missing from web PermissionKey', api, web);
compare('In web PermissionKey but missing from the API', web, api);
compare('In the API but missing from the web permission matrix', api, grouped);
compare('In the web permission matrix but missing from the API', grouped, api);

if (problems.length > 0) {
  console.error(`Permission keys are out of sync:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Permission keys in sync (${api.size} keys).`);
