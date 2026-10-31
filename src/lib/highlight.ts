/**
 * 轻量语法高亮（无第三方依赖）。
 *
 * 设计目标：
 *   · 覆盖主流语言：JS / TS / Python / JSON / Markdown / Shell / HTML / CSS /
 *     SQL / Go / Rust / Java / Kotlin / C / C++ / C# / PHP / Ruby / Swift / YAML；
 *   · 只做「词法级」着色，不追求 AST 精度，几 KB 代码下足够快；
 *   · 输出 Token[]，由渲染层转成 React 元素，避免 dangerouslySetInnerHTML。
 */

export type TokenType =
  | 'plain'
  | 'comment'
  | 'keyword'
  | 'string'
  | 'number'
  | 'function'
  | 'type'
  | 'literal'
  | 'property'
  | 'tag'
  | 'attr'
  | 'punct'
  | 'builtin'
  | 'variable'
  | 'md-heading'
  | 'md-bullet'
  | 'md-code'
  | 'md-strong'
  | 'md-link'

export type Token = { text: string; type: TokenType }

type LangDef = {
  label: string
  keywords: string[]
  literals?: string[]
  types?: string[]
  builtins?: string[]
  lineComments?: string[]
  blockComment?: [string, string]
  strings?: string[]
  triples?: string[]
  caseInsensitive?: boolean
  /** JSON / YAML：后面跟冒号的词按属性着色 */
  keysBeforeColon?: boolean
  /** CSS：`prop: value` 里的 prop 按属性着色 */
  css?: boolean
  /** Shell / PHP：$name 按变量着色 */
  dollarVariables?: boolean
}

type PreparedLang = LangDef & {
  kwSet: Set<string>
  litSet: Set<string>
  typeSet: Set<string>
  biSet: Set<string>
}

const words = (s: string) => s.split(' ').filter(Boolean)

const rawLangs: Record<string, LangDef> = {
  javascript: {
    label: 'JavaScript',
    keywords: words(
      'async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield',
    ),
    literals: ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'],
    types: ['Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'Map', 'Set', 'Date', 'RegExp', 'Error', 'BigInt', 'Symbol'],
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
  },
  typescript: {
    label: 'TypeScript',
    keywords: words(
      'abstract as async await break case catch class const continue declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface keyof let namespace new of override private protected public readonly return satisfies set static super switch this throw try type typeof unique unknown var void while with yield',
    ),
    literals: ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'],
    types: ['Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'Map', 'Set', 'Date', 'RegExp', 'Error', 'BigInt', 'Symbol', 'Record', 'Partial', 'Pick', 'Omit', 'unknown', 'any', 'never', 'void'],
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
  },
  python: {
    label: 'Python',
    keywords: words(
      'and as assert async await break class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try case while with yield',
    ),
    literals: ['True', 'False', 'None', 'Ellipsis'],
    types: ['int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'bytes', 'object'],
    builtins: words(
      'abs all any bin bool bytes callable chr dict enumerate filter float format frozenset getattr hasattr hash int isinstance iter len list map max min next object open ord print range repr reversed round set sorted str sum super tuple type zip',
    ),
    lineComments: ['#'],
    strings: ['"', "'"],
    triples: ['"""', "'''"],
  },
  json: {
    label: 'JSON',
    keywords: [],
    literals: ['true', 'false', 'null'],
    strings: ['"'],
    keysBeforeColon: true,
  },
  markdown: {
    label: 'Markdown',
    keywords: [],
  },
  bash: {
    label: 'Shell',
    keywords: words(
      'if then else elif fi for while until do done case esac function select in return break continue exit export unset local readonly declare source alias set shift trap wait',
    ),
    literals: ['true', 'false'],
    builtins: words('echo printf read cd pwd ls cp mv rm mkdir rmdir touch cat grep sed awk find xargs curl wget git npm node python docker sudo chmod chown tar'),
    lineComments: ['#'],
    strings: ['"', "'", '`'],
    dollarVariables: true,
  },
  html: {
    label: 'HTML / XML',
    keywords: [],
  },
  css: {
    label: 'CSS',
    keywords: words('important inherit initial unset none auto block flex grid inline absolute relative sticky fixed content border-box'),
    lineComments: [],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
    css: true,
  },
  sql: {
    label: 'SQL',
    keywords: words(
      'select from where join inner left right outer full on group by order having insert into values update set delete create table alter drop index view as and or not null is in like between case when then else end limit offset distinct union all primary key foreign references default constraint unique exists asc desc with returning begin commit rollback transaction',
    ),
    literals: ['true', 'false', 'null'],
    types: words('int integer bigint smallint decimal numeric float real double char varchar text date datetime timestamp boolean json blob'),
    lineComments: ['--'],
    blockComment: ['/*', '*/'],
    strings: ["'", '"'],
    caseInsensitive: true,
  },
  go: {
    label: 'Go',
    keywords: words(
      'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var',
    ),
    literals: ['true', 'false', 'nil', 'iota'],
    types: words('string int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 complex64 complex128 bool byte rune error any'),
    builtins: words('append cap close complex copy delete imag len make new panic print println real recover'),
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', '`'],
  },
  rust: {
    label: 'Rust',
    keywords: words(
      'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while yield',
    ),
    literals: ['true', 'false', 'Some', 'None', 'Ok', 'Err'],
    types: words('i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box HashMap BTreeMap Rc Arc'),
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"'],
  },
  java: {
    label: 'Java',
    keywords: words(
      'abstract assert break case catch class continue default do else enum extends final finally for if implements import instanceof interface native new package private protected public record return static strictfp super switch synchronized this throw throws transient try var volatile while yield',
    ),
    literals: ['true', 'false', 'null'],
    types: words('boolean byte char double float int long short void String Object Integer Long Double List Map Set Optional'),
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
  },
  kotlin: {
    label: 'Kotlin',
    keywords: words(
      'as break by catch class companion const constructor continue crossinline data do dynamic else enum external false final finally for fun get if import in infix init inline inner interface internal is lateinit object open operator out override package private protected public reified return sealed set super suspend tailrec this throw try typealias val var when where while',
    ),
    literals: ['true', 'false', 'null'],
    types: words('Int Long Short Byte Double Float Boolean Char String Unit Any Nothing List Map Set Array'),
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
  },
  c: {
    label: 'C',
    keywords: words(
      'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while',
    ),
    literals: ['NULL', 'true', 'false'],
    types: words('int char float double void long short unsigned signed size_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t bool'),
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
  },
  cpp: {
    label: 'C++',
    keywords: words(
      'alignas alignof asm auto break case catch class const constexpr continue decltype default delete do dynamic_cast else enum explicit export extern false final for friend goto if inline mutable namespace new noexcept nullptr operator override private protected public register reinterpret_cast return sizeof static static_cast struct switch template this throw throw try typedef typeid typename union using virtual volatile while',
    ),
    literals: ['nullptr', 'true', 'false', 'NULL'],
    types: words('bool char double float int long short signed unsigned void size_t string vector map set unique_ptr shared_ptr optional'),
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
  },
  csharp: {
    label: 'C#',
    keywords: words(
      'abstract as async await base break case catch checked class const continue default delegate do else enum event explicit extern false finally fixed for foreach get goto if implicit in init interface internal is lock namespace new null operator out override params private protected public readonly record ref return sealed set sizeof stackalloc static struct switch this throw true try typeof unchecked unsafe using var virtual void volatile while yield',
    ),
    literals: ['true', 'false', 'null'],
    types: words('bool byte char decimal double float int long object sbyte short string uint ulong ushort var Task List Dictionary IEnumerable'),
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
  },
  php: {
    label: 'PHP',
    keywords: words(
      'abstract and array as break callable case catch class clone const continue declare default die do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield',
    ),
    literals: ['true', 'false', 'null'],
    lineComments: ['//', '#'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
    dollarVariables: true,
  },
  ruby: {
    label: 'Ruby',
    keywords: words(
      'alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield require attr_accessor private protected public',
    ),
    literals: ['true', 'false', 'nil'],
    lineComments: ['#'],
    strings: ['"', "'"],
  },
  swift: {
    label: 'Swift',
    keywords: words(
      'as associatedtype break case catch class continue convenience default defer deinit do else enum extension fallthrough false fileprivate for func guard if import in init inout internal is let open operator private protocol public repeat rethrows return self Self static struct subscript super switch throw throws true try typealias var where while',
    ),
    literals: ['true', 'false', 'nil'],
    types: words('Int Double Float String Bool Array Dictionary Set Optional Any AnyObject'),
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"'],
  },
  yaml: {
    label: 'YAML',
    keywords: [],
    literals: ['true', 'false', 'null', 'yes', 'no', 'on', 'off'],
    lineComments: ['#'],
    strings: ['"', "'"],
    keysBeforeColon: true,
  },
  toml: {
    label: 'TOML',
    keywords: [],
    literals: ['true', 'false'],
    lineComments: ['#'],
    strings: ['"', "'"],
    keysBeforeColon: true,
  },
  ini: {
    label: 'INI',
    keywords: [],
    literals: ['true', 'false', 'yes', 'no'],
    lineComments: [';', '#'],
    strings: ['"', "'"],
    keysBeforeColon: true,
  },
  plain: { label: 'Text', keywords: [] },
}

const aliases: Record<string, string> = {
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  py: 'python',
  python: 'python',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  json: 'json',
  jsonc: 'json',
  html: 'html',
  htm: 'html',
  xml: 'html',
  svg: 'html',
  vue: 'html',
  css: 'css',
  scss: 'css',
  less: 'css',
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  zsh: 'bash',
  dockerfile: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  sql: 'sql',
  go: 'go',
  golang: 'go',
  rs: 'rust',
  rust: 'rust',
  java: 'java',
  kt: 'kotlin',
  kotlin: 'kotlin',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  csharp: 'csharp',
  php: 'php',
  rb: 'ruby',
  ruby: 'ruby',
  swift: 'swift',
  toml: 'toml',
  ini: 'ini',
  text: 'plain',
  txt: 'plain',
  plain: 'plain',
  plaintext: 'plain',
}

const prepared: Record<string, PreparedLang> = Object.fromEntries(
  Object.entries(rawLangs).map(([key, def]) => {
    const lower = def.caseInsensitive
    return [
      key,
      {
        ...def,
        kwSet: new Set(lower ? def.keywords.map((k) => k.toLowerCase()) : def.keywords),
        litSet: new Set(lower ? (def.literals ?? []).map((k) => k.toLowerCase()) : def.literals ?? []),
        typeSet: new Set(lower ? (def.types ?? []).map((k) => k.toLowerCase()) : def.types ?? []),
        biSet: new Set(lower ? (def.builtins ?? []).map((k) => k.toLowerCase()) : def.builtins ?? []),
      },
    ]
  }),
) as Record<string, PreparedLang>

function resolveKey(lang: string) {
  return aliases[lang.trim().toLowerCase()] ?? 'plain'
}

/** 供代码块标题展示的语言名，如 `ts` → `TypeScript` */
export function languageLabel(lang: string) {
  const raw = lang.trim()
  const key = aliases[raw.toLowerCase()]
  if (!key) return raw.toUpperCase() || 'TEXT'
  return prepared[key]?.label ?? raw.toUpperCase()
}

const WORD = /[A-Za-z_$][A-Za-z0-9_$]*/y
const TAG_NAME = /[A-Za-z][A-Za-z0-9:_-]*/y
const ATTR_NAME = /[A-Za-z_:][A-Za-z0-9:_.-]*/y
const NUMBER = /(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.\d[\d_]*|\d[\d_]*|\.\d+))(?:[eE][+-]?\d+)?/y

function classifyWord(text: string, def: PreparedLang, code: string, start: number, end: number): TokenType {
  const key = def.caseInsensitive ? text.toLowerCase() : text
  if (def.kwSet.has(key)) return 'keyword'
  if (def.litSet.has(key)) return 'literal'
  if (def.typeSet.has(key)) return 'type'
  if (def.biSet.has(key)) return 'builtin'
  if (def.dollarVariables && text.startsWith('$')) return 'variable'
  if (code[start - 1] === '@') return 'keyword'
  if (def.keysBeforeColon) {
    let j = end
    while (j < code.length && (code[j] === ' ' || code[j] === '\t')) j++
    if (code[j] === ':') return 'property'
  }
  if (def.css) {
    let j = end
    while (j < code.length && (code[j] === ' ' || code[j] === '\t')) j++
    if (code[j] === ':' && code[j + 1] !== ':') return 'property'
  }
  let j = end
  while (j < code.length && (code[j] === ' ' || code[j] === '\t')) j++
  if (code[j] === '(') return 'function'
  if (text.length > 1 && text[0] >= 'A' && text[0] <= 'Z') return 'type'
  return 'plain'
}

function tokenizeGeneric(code: string, def: PreparedLang): Token[] {
  const out: Token[] = []
  const len = code.length
  let i = 0

  const push = (text: string, type: TokenType = 'plain') => {
    if (text) out.push({ text, type })
  }

  while (i < len) {
    const ch = code[i]

    // 空白整段保留，pre 里靠它维持换行与缩进
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      let j = i + 1
      while (j < len && (code[j] === ' ' || code[j] === '\t' || code[j] === '\n' || code[j] === '\r')) j++
      push(code.slice(i, j))
      i = j
      continue
    }

    // 行注释
    let consumed = false
    for (const lc of def.lineComments ?? []) {
      if (code.startsWith(lc, i)) {
        let j = code.indexOf('\n', i)
        if (j === -1) j = len
        push(code.slice(i, j), 'comment')
        i = j
        consumed = true
        break
      }
    }
    if (consumed) continue

    // 块注释
    if (def.blockComment && code.startsWith(def.blockComment[0], i)) {
      const close = def.blockComment[1]
      const end = code.indexOf(close, i + def.blockComment[0].length)
      const j = end === -1 ? len : end + close.length
      push(code.slice(i, j), 'comment')
      i = j
      continue
    }

    // 三引号字符串（Python）
    consumed = false
    for (const q of def.triples ?? []) {
      if (code.startsWith(q, i)) {
        let j = i + q.length
        while (j < len) {
          if (code[j] === '\\') {
            j += 2
            continue
          }
          if (code.startsWith(q, j)) {
            j += q.length
            break
          }
          j++
        }
        j = Math.min(j, len)
        push(code.slice(i, j), 'string')
        i = j
        consumed = true
        break
      }
    }
    if (consumed) continue

    // 普通字符串
    consumed = false
    for (const q of def.strings ?? []) {
      if (ch === q) {
        let j = i + 1
        while (j < len) {
          if (code[j] === '\\') {
            j += 2
            continue
          }
          if (code[j] === q) {
            j++
            break
          }
          if (code[j] === '\n' && q !== '`') break
          j++
        }
        const text = code.slice(i, j)
        let type: TokenType = 'string'
        if (def.keysBeforeColon) {
          let k = j
          while (k < len && (code[k] === ' ' || code[k] === '\t')) k++
          if (code[k] === ':') type = 'property'
        }
        push(text, type)
        i = j
        consumed = true
        break
      }
    }
    if (consumed) continue

    // 数字
    NUMBER.lastIndex = i
    const num = NUMBER.exec(code)
    if (num && num.index === i) {
      push(num[0], 'number')
      i += num[0].length
      continue
    }

    // 单词
    WORD.lastIndex = i
    const word = WORD.exec(code)
    if (word && word.index === i) {
      const text = word[0]
      push(text, classifyWord(text, def, code, i, i + text.length))
      i += text.length
      continue
    }

    push(ch, 'punct')
    i++
  }

  return out
}

function tokenizeHtml(code: string): Token[] {
  const out: Token[] = []
  const len = code.length
  let i = 0
  const push = (text: string, type: TokenType = 'plain') => {
    if (text) out.push({ text, type })
  }

  while (i < len) {
    if (code.startsWith('<!--', i)) {
      const end = code.indexOf('-->', i + 4)
      const j = end === -1 ? len : end + 3
      push(code.slice(i, j), 'comment')
      i = j
      continue
    }

    if (code[i] === '<') {
      push('<', 'punct')
      i++
      if (code[i] === '/') {
        push('/', 'punct')
        i++
      }

      TAG_NAME.lastIndex = i
      const tag = TAG_NAME.exec(code)
      if (tag && tag.index === i) {
        push(tag[0], 'tag')
        i += tag[0].length
      }

      while (i < len && code[i] !== '>') {
        const ch = code[i]
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
          let j = i + 1
          while (j < len && (code[j] === ' ' || code[j] === '\t' || code[j] === '\n' || code[j] === '\r')) j++
          push(code.slice(i, j))
          i = j
          continue
        }
        if (ch === '"' || ch === "'") {
          let j = i + 1
          while (j < len && code[j] !== ch) {
            if (code[j] === '\\') j++
            j++
          }
          if (j < len) j++
          push(code.slice(i, j), 'string')
          i = j
          continue
        }
        ATTR_NAME.lastIndex = i
        const attr = ATTR_NAME.exec(code)
        if (attr && attr.index === i) {
          push(attr[0], 'attr')
          i += attr[0].length
          continue
        }
        push(ch, 'punct')
        i++
      }

      if (i < len) {
        push('>', 'punct')
        i++
      }
      continue
    }

    let j = code.indexOf('<', i)
    if (j === -1) j = len
    push(code.slice(i, j))
    i = j
  }

  return out
}

function tokenizeInline(line: string, out: Token[]) {
  const push = (text: string, type: TokenType = 'plain') => {
    if (text) out.push({ text, type })
  }
  let i = 0
  while (i < line.length) {
    const rest = line.slice(i)
    if (rest.startsWith('```')) {
      push(rest, 'md-code')
      return
    }
    if (line[i] === '`') {
      const end = line.indexOf('`', i + 1)
      if (end !== -1) {
        push(line.slice(i, end + 1), 'md-code')
        i = end + 1
        continue
      }
    }
    if (rest.startsWith('**')) {
      const end = line.indexOf('**', i + 2)
      if (end !== -1) {
        push(line.slice(i, end + 2), 'md-strong')
        i = end + 2
        continue
      }
    }
    if (line[i] === '[') {
      const close = line.indexOf('](', i + 1)
      const end = close === -1 ? -1 : line.indexOf(')', close + 2)
      if (close !== -1 && end !== -1) {
        push(line.slice(i, end + 1), 'md-link')
        i = end + 1
        continue
      }
    }
    let j = i + 1
    while (j < line.length) {
      const ch = line[j]
      if (ch === '`' || ch === '[' || (ch === '*' && line[j + 1] === '*')) break
      j++
    }
    push(line.slice(i, j))
    i = j
  }
}

function tokenizeMarkdown(code: string): Token[] {
  const out: Token[] = []
  const lines = code.split('\n')
  lines.forEach((line, index) => {
    if (index > 0) out.push({ text: '\n', type: 'plain' })
    if (!line) return

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      out.push({ text: heading[1], type: 'md-bullet' })
      out.push({ text: ' ' + heading[2], type: 'md-heading' })
      return
    }

    const fence = /^\s*(\d+\.|[-*+])\s+/.exec(line)
    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
      out.push({ text: line, type: 'md-code' })
      return
    }
    if (fence) {
      const indent = line.slice(0, line.indexOf(fence[1]))
      out.push({ text: indent, type: 'plain' })
      out.push({ text: fence[1], type: 'md-bullet' })
      out.push({ text: ' ', type: 'plain' })
      tokenizeInline(line.slice(indent.length + fence[1].length + 1), out)
      return
    }

    tokenizeInline(line, out)
  })
  return out
}

/** 把源码切成带类型的 token */
export function tokenize(code: string, lang: string): Token[] {
  const key = resolveKey(lang)
  if (key === 'plain') return code ? [{ text: code, type: 'plain' }] : []
  if (key === 'markdown') return tokenizeMarkdown(code)
  if (key === 'html') return tokenizeHtml(code)
  const def = prepared[key]
  if (!def) return code ? [{ text: code, type: 'plain' }] : []
  return tokenizeGeneric(code, def)
}

/** 按行拆分 token，供代码块渲染行号 */
export function splitTokenLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]]
  for (const token of tokens) {
    const parts = token.text.split('\n')
    parts.forEach((part, index) => {
      if (index > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ text: part, type: token.type })
    })
  }
  return lines
}
