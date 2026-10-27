import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const resolver = 'src/server/peers/resolve-peers.ts';
const route = 'src/routes/api/peers/resolve.ts';
const violations = [];
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { scan(path); continue; }
    if (!/\.(?:[cm]?[jt]sx?)$/.test(path)) continue;
    const name = relative(process.cwd(), path).replaceAll('\\', '/');
    const source = readFileSync(path, 'utf8');
    if (name !== resolver && /api\.exa\.ai|EXA_API_KEY|(?:from\s*|import\s*\(|require\s*\()\s*['"]exa(?:-js)?['"]/.test(source)) violations.push(`${name}: forbidden provider access`);
    if (name !== resolver && name !== route && /resolvePeersWithExa|(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"]*resolve-peers['"]/.test(source)) violations.push(`${name}: forbidden resolver access`);
    if (name.startsWith('src/routes/') && name !== route && /(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"]*(?:server\/peers|exa-query)/.test(source)) violations.push(`${name}: forbidden server peer import`);
    if (name.startsWith('src/routes/') && name !== route && !['src/routes/_authenticated/onboarding.tsx', 'src/routes/_authenticated/settings.tsx'].includes(name) && /fetch\s*\(\s*['"]\/api\/peers\/resolve/.test(source)) violations.push(`${name}: forbidden peer trigger`);
    if (/VITE_(?:EXA|PEER_MONTHLY_CRON_SECRET|SUPABASE_SERVICE_ROLE_KEY)|PUBLIC_(?:EXA|PEER_MONTHLY_CRON_SECRET|SUPABASE_SERVICE_ROLE_KEY)/.test(source)) violations.push(`${name}: public secret variable`);
  }
}
scan('src');
if (violations.length) { console.error(violations.join('\n')); process.exitCode = 1; }
else console.log('Exa call-path guard passed.');