import matter from 'gray-matter'

export interface ParsedSkill {
  name: string
  description: string
  body: string
}

export function parseSkillMd(content: string): ParsedSkill {
  const { data, content: body } = matter(content)
  return {
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    body: body.trimStart(),
  }
}

/**
 * 提取被双引号包围的行作为金句候选。
 * 同时接受中英文引号（" " “ ” " "）。
 */
export function extractQuotes(body: string): string[] {
  const quoted = /["“”]([^"“”]{8,}?)["“”]/g
  const out = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = quoted.exec(body)) !== null) {
    const text = (m[1] ?? '').trim()
    if (text) out.add(text)
  }
  return [...out]
}
