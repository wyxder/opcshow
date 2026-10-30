/** prerender.mjs 的 esbuild 入口：把正文数据导出给 Node 构建期使用。 */
export { articles } from '../src/data/articles'
export { siteMeta, profile, figures, education, skillGroups } from '../src/data/site'
export { resumeSnapshot } from '../src/data/work'
