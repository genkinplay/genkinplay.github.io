import { readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  paths() {
    const dir = resolve(__dirname, '../../../data/investors')
    return readdirSync(dir)
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => ({ params: { slug: f.replace('.yaml', '') } }))
  },
}
