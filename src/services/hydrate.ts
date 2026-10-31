/**
 * 启动期内容水合（单一真源桥接，迁移期）。
 *
 * 前台页面仍直接 import `src/data/*`；这里在 React 挂载前拉一次已发布内容并原地替换数组，
 * 让「后台改 → 前台生效」。数据模块用动态 import，避免把文章正文等大对象压进入口包。
 * 失败 / 超时 / 未接服务端 → 保留本地快照。
 */
import { serverConfig } from './config'
import { apiJsonSafe } from './http'

const replace = <T,>(target: T[], items: T[]) => {
  if (!Array.isArray(items)) return false
  target.splice(0, target.length, ...items)
  return true
}

async function get<T>(path: string): Promise<T | null> {
  return apiJsonSafe<T>(path, { timeoutMs: 3500 })
}

export async function hydrateSiteData(): Promise<void> {
  if (!serverConfig.enabled) return

  const [dataArticles, dataIndex, dataLife, dataMe, dataProjects, dataSite, dataWork] = await Promise.all([
    import('@/data/articles'),
    import('@/data/articles.index'),
    import('@/data/life'),
    import('@/data/me'),
    import('@/data/projects'),
    import('@/data/site'),
    import('@/data/work'),
  ])

  const [articlesData, projectsData, momentsData, tripsData, tracksData, friendsData, awardsData, skillsData, danmakuData, resourcesData] = await Promise.all([
    get<typeof dataArticles.articles>('/api/content/articles'),
    get<typeof dataProjects.projects>('/api/content/projects'),
    get<typeof dataLife.moments>('/api/content/moments'),
    get<typeof dataLife.trips>('/api/content/trips'),
    get<typeof dataLife.playlist>('/api/content/tracks'),
    get<typeof dataMe.friends>('/api/content/friends'),
    get<typeof dataSite.awards>('/api/content/awards'),
    get<typeof dataSite.skillGroups>('/api/content/skills'),
    get<typeof dataMe.danmakuSeeds>('/api/content/danmaku'),
    get<typeof dataWork.resourceFiles>('/api/content/resources'),
  ])

  if (articlesData?.length) {
    replace(dataArticles.articles, articlesData)
    replace(
      dataIndex.articleMeta,
      articlesData.map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: (a as { subtitle?: string }).subtitle ?? '',
        category: a.category,
        date: a.date,
        readMin: a.readMin,
        views: a.views ?? 0,
        abstract: (a as { abstract?: string }).abstract ?? '',
        tags: (a as { tags?: string[] }).tags ?? [],
      })) as unknown as typeof dataIndex.articleMeta,
    )
  }
  if (projectsData?.length) replace(dataProjects.projects, projectsData)
  if (momentsData?.length) replace(dataLife.moments, momentsData)
  if (tripsData?.length) replace(dataLife.trips, tripsData)
  if (tracksData?.length) replace(dataLife.playlist, tracksData)
  if (friendsData) replace(dataMe.friends, friendsData)
  if (awardsData?.length) replace(dataSite.awards, awardsData)
  if (skillsData?.length) replace(dataSite.skillGroups, skillsData)
  if (danmakuData?.length) replace(dataMe.danmakuSeeds, danmakuData)
  if (resourcesData) replace(dataWork.resourceFiles, resourcesData)
}
