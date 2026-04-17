import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const cwd = process.cwd()
// Typical layouts: cwd = repo root, or cwd = server/ (npm workspace). Later files override earlier ones.
const envPaths = [join(cwd, '..', '.env'), join(cwd, '.env'), join(cwd, 'server', '.env')]
for (const path of envPaths) {
  if (existsSync(path)) {
    config({ path, override: true })
  }
}
