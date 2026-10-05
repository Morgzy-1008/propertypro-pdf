import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Launching test_e2e_tenders_and_plans.ts via tsx runner...");
const tsxCli = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const tsScript = path.join(__dirname, 'test_e2e_tenders_and_plans.ts');

const result = spawnSync(process.execPath, [tsxCli, tsScript], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env,
});

process.exit(result.status || 0);
