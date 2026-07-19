import {
  ACTIVITIES,
  AUDIT_LOGS,
  CALENDAR_EVENTS,
  DATA_SOURCES,
  USER_STATE,
} from '../db.js'
import { getCurrentUser, parseBody } from '../utils.js'

const PORT = 5000
const taskState = new Map()
const crawlLogs = []
const dictEntries = {
  place: [
    { id: 1, standard_name: '广州校区南校园', aliases: '南校,康乐园', description: '中山大学广州校区南校园' },
    { id: 2, standard_name: '广州校区东校园', aliases: '东校,大学城校区', description: '中山大学广州校区东校园' },
  ],
  org: [
    { id: 11, standard_name: '中山大学团委', aliases: '校团委', description: '共青团中山大学委员会' },
    { id: 12, standard_name: '学生会', aliases: '校学生会', description: '中山大学学生会' },
  ],
  topic: [
    { id: 21, standard_name: '人工智能', aliases: 'AI,大模型', description: '人工智能相关主题' },
    { id: 22, standard_name: '校园文化', aliases: '文化活动', description: '校园文化与艺术主题' },
  ],
}

const activitySeeds = {
  讲座: [
    ['生成式人工智能与科研创新讲座', '数据科学与计算机学院', '东校园公共教学楼 B101'],
    ['湾区青年学者前沿交叉论坛', '研究生院', '南校园怀士堂'],
  ],
  晚会: [
    ['逸仙星光草坪音乐会', '学生会文艺部', '南校园大草坪'],
    ['毕业季校园民谣之夜', '艺术教育中心', '东校园体育馆'],
  ],
  竞赛: [
    ['中大创新创业训练营决赛', '创新创业学院', '东校园行政楼报告厅'],
    ['校园数据应用挑战赛', '信息管理学院', '南校园计算机实验中心'],
  ],
  论坛: [
    ['绿色校园与可持续发展论坛', '总务部', '珠海校区海琴楼'],
    ['医学人文青年圆桌论坛', '中山医学院', '北校园医学科技楼'],
  ],
  展览: [
    ['百年校园建筑摄影展', '档案馆', '南校园图书馆展厅'],
    ['海洋科学科普互动展', '海洋科学学院', '珠海校区博雅堂'],
  ],
  招聘: [
    ['粤港澳大湾区暑期实习双选会', '就业指导中心', '东校园体育馆'],
    ['公共服务与国际组织职业分享会', '国际合作与交流处', '南校园小礼堂'],
  ],
  体育: [
    ['校园三人篮球联赛', '体育部', '东校园篮球场'],
    ['荧光夜跑与公益打卡', '青年志愿者协会', '南校园英东田径场'],
  ],
  其他: [
    ['非遗香云纱手作体验', '文化艺术中心', '南校园学生活动中心'],
    ['校园植物观察与自然笔记', '生命科学学院', '南校园生物博物馆'],
  ],
}

function initializeDemoData() {
  if (ACTIVITIES.some((item) => item.id >= 100)) return
  let id = 100
  let index = 0
  for (const [category, seeds] of Object.entries(activitySeeds)) {
    for (const [title, organizer, location] of seeds) {
      const day = 18 + (index % 12)
      ACTIVITIES.push({
        id: id++,
        title,
        raw_text: `${title}面向全校师生开放。活动包含主题分享、现场互动和自由交流三个环节，参与者可在活动结束后领取电子参与证明。请提前十分钟到场签到，并留意校内通知中的场地调整信息。`,
        summary: `${organizer}发起的${category}活动，包含主题分享、互动交流与现场体验。`,
        event_time: `2026-07-${String(day).padStart(2, '0')}T${index % 2 ? '19:00' : '14:30'}:00`,
        location,
        organizer,
        status: 'published',
        activity_type: category,
        created_by: 2,
        created_at: `2026-07-${String(16 - (index % 10)).padStart(2, '0')}T09:00:00`,
        hot_score: 96 - index * 3,
        tags: [category, '校内活动'],
        meta: { views: 520 - index * 17, registrations: 86 - index * 2 },
        content_html: `<h2>${title}</h2><p>欢迎全校师生参加。本活动设置主题分享、互动问答和交流环节。</p>`,
        source_name: organizer,
        source_url: 'https://www.sysu.edu.cn/',
        cover_image_url: null,
      })
      index++
    }
  }
  ACTIVITIES.push(
    {
      id: 300, title: '人工智能社团暑期开放日', raw_text: '社团开放日包含项目展示、招新说明、技术分享和成员交流。', summary: 'AI 社团项目展示与招新开放日。',
      event_time: '2026-07-29T15:00:00', location: '东校园工学院楼', organizer: '人工智能协会', status: 'pending_review', activity_type: '其他', created_by: 2,
      created_at: '2026-07-17T09:00:00', quality_score: 91, tags: ['人工智能', '社团'], content_html: '<h2>人工智能社团暑期开放日</h2><p>项目展示、技术分享与成员交流。</p>', source_url: 'https://www.sysu.edu.cn/', hot_score: 0,
    },
    {
      id: 301, title: '南校园旧书循环市集', raw_text: '同学可携带闲置教材与文学读物到场交换，现场设公益捐赠点。', summary: '旧书交换、公益捐赠与阅读分享。',
      event_time: '2026-07-30T10:00:00', location: '南校园学生活动中心', organizer: '青年志愿者协会', status: 'pending_review', activity_type: '其他', created_by: 2,
      created_at: '2026-07-17T10:00:00', quality_score: 87, tags: ['公益', '阅读'], content_html: '<h2>旧书循环市集</h2><p>让闲置书籍继续流动。</p>', source_url: 'https://www.sysu.edu.cn/', hot_score: 0,
    },
  )
  ACTIVITIES.forEach((item, position) => {
    item.hot_score ??= Math.max(20, 88 - position * 4)
    item.meta ??= { views: 180 + position * 23, registrations: 18 + position * 4 }
    item.tags ??= [item.activity_type || '活动', '中山大学']
    item.cover_image_url ??= null
    item.content_html ??= `<h2>${item.title}</h2><p>${item.raw_text}</p>`
    item.source_name ??= item.organizer || '中山大学'
    item.source_url ??= 'https://www.sysu.edu.cn/'
    item.meta.registrations = (USER_STATE.registrations[item.id] || []).length
  })
  DATA_SOURCES.forEach((source, position) => Object.assign(source, {
    list_selector: source.list_selector || '.news-list a',
    content_selector: source.content_selector || 'article',
    allowed_domains: new URL(source.url).hostname,
    crawl_mode: position === 0 ? 'smart' : 'basic',
    source_level: 'official',
  }))
  CALENDAR_EVENTS[1] = [
    { date: '2026-07-18', time: '09:00', title: '审核待发布活动', type: 'info' },
    { date: '2026-07-18', time: '14:00', title: '数据源巡检', type: 'warning' },
    { date: '2026-07-18', time: '16:30', title: '团队周会', type: 'info' },
    { date: '2026-07-22', time: '19:00', title: '逸仙星光草坪音乐会', type: 'activity', activity_id: 102 },
    { date: '2026-07-22', time: '20:30', title: '音乐会志愿者复盘', type: 'info' },
    { date: '2026-07-28', time: '14:30', title: '校园三人篮球联赛', type: 'activity', activity_id: 112 },
  ]
  crawlLogs.push({ id: 1, data_source_id: 1, status: 'success', message: '完成智能正文识别并生成 3 条预览候选', started_at: '2026-07-17T08:00:00', finished_at: '2026-07-17T08:02:15', pages_found: 12, pages_succeeded: 11, pages_failed: 1, duplicates_skipped: 4, drafts_created: 3, average_quality_score: 88 })
}

initializeDemoData()

function adminOrError(req) {
  const user = getCurrentUser(req)
  return user?.role === 'admin' ? user : { __status: user ? 403 : 401, message: user ? '权限不足' : '请先登录' }
}

function publisherOrError(req) {
  const user = getCurrentUser(req)
  return user && ['publisher', 'admin'].includes(user.role) ? user : { __status: user ? 403 : 401, message: user ? '权限不足' : '请先登录' }
}

function page(items, url) {
  const current = Math.max(Number(url.searchParams.get('page') || 1), 1)
  const perPage = Math.max(Number(url.searchParams.get('per_page') || 10), 1)
  return { items: items.slice((current - 1) * perPage, current * perPage), total: items.length, page: current, per_page: perPage, pages: Math.ceil(items.length / perPage) }
}

function sortActivities(items, sort) {
  const result = [...items]
  if (sort === 'event_time') result.sort((a, b) => new Date(a.event_time || '9999-12-31').getTime() - new Date(b.event_time || '9999-12-31').getTime())
  else if (sort === 'popularity') result.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0) || (b.meta?.views || 0) - (a.meta?.views || 0))
  else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return result
}

function nodesFor(activity) {
  return [
    activity.location && ['place', activity.location],
    activity.organizer && ['organization', activity.organizer],
    activity.activity_type && ['topic', activity.activity_type],
    activity.source_name && ['source', activity.source_name],
  ].filter(Boolean)
}

function nodeId(type, name) {
  let hash = 7
  for (const char of `${type}:${name}`) hash = (hash * 31 + char.charCodeAt(0)) % 1000000
  return hash + 1
}

function knowledgeCatalog() {
  const catalog = new Map()
  for (const activity of ACTIVITIES.filter((item) => item.status === 'published')) {
    for (const [type, name] of nodesFor(activity)) {
      const id = nodeId(type, name)
      const current = catalog.get(id) || { id, name, node_type: type, alias: '', description: `${name}关联的校园活动节点`, posters: [] }
      current.posters.push({ relation_type: type === 'organization' ? 'organized_by' : type === 'place' ? 'held_at' : 'tagged_with', matched_by: 'exact', poster: activity })
      catalog.set(id, current)
    }
  }
  return [...catalog.values()]
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

function extractFields(text) {
  const normalized = String(text || '').trim()
  const date = normalized.match(/(20\d{2})[年/-](\d{1,2})[月/-](\d{1,2})日?\s*(\d{1,2})?(?::|时)?(\d{1,2})?分?/)
  const location = ['怀士堂', '体育馆', '图书馆', '学生活动中心', '教学楼'].find((value) => normalized.includes(value)) || ''
  const type = normalized.includes('竞赛') ? '竞赛' : normalized.includes('讲座') ? '讲座' : normalized.includes('论坛') ? '论坛' : normalized.includes('招聘') ? '招聘' : normalized.includes('展') ? '展览' : '其他'
  return {
    title: normalized.split(/[。\n]/)[0].slice(0, 60) || '待完善活动标题',
    summary: normalized.slice(0, 100),
    raw_text: normalized,
    event_time: date ? `${date[1]}-${String(date[2]).padStart(2, '0')}-${String(date[3]).padStart(2, '0')}T${String(date[4] || 9).padStart(2, '0')}:${String(date[5] || 0).padStart(2, '0')}:00` : null,
    location,
    organizer: normalized.includes('学生会') ? '学生会' : '',
    activity_type: type,
    tags: [type, normalized.includes('人工智能') ? '人工智能' : '校园活动'],
  }
}

export default [
  {
    method: 'GET', path: '/api/home/featured', handler: async () => ({ items: sortActivities(ACTIVITIES.filter((item) => item.status === 'published'), 'popularity').slice(0, 6) }),
  },
  {
    method: 'GET', path: '/api/activities', handler: async (req) => {
      const url = new URL(req.url, `http://localhost:${PORT}`)
      const user = getCurrentUser(req)
      const status = url.searchParams.get('status')
      const keyword = url.searchParams.get('keyword') || url.searchParams.get('q') || ''
      const activityType = url.searchParams.get('activity_type')
      let items = ACTIVITIES.filter((item) => status && status !== 'published'
        ? Boolean(user && (user.role === 'admin' || item.created_by === user.id) && item.status === status)
        : item.status === 'published')
      if (activityType) items = items.filter((item) => item.activity_type === activityType)
      if (keyword) items = items.filter((item) => [item.title, item.summary, item.raw_text, item.location, item.organizer].some((value) => String(value || '').includes(keyword)))
      return page(sortActivities(items, url.searchParams.get('sort')), url)
    },
  },
  {
    method: 'GET', path: '/api/search/external', handler: async (req) => {
      const url = new URL(req.url, `http://localhost:${PORT}`)
      const q = url.searchParams.get('q') || ''
      const sources = [
        ['中山大学新闻网', 'https://news.sysu.edu.cn/'],
        ['中山大学官网', 'https://www.sysu.edu.cn/'],
      ]
      let items = ACTIVITIES.filter((item) => item.status === 'published' && (!q || `${item.title}${item.summary}${item.raw_text}`.includes(q))).slice(0, 16)
      if (!items.length) items = sortActivities(ACTIVITIES.filter((item) => item.status === 'published'), 'popularity').slice(0, 6)
      const results = items.map((item, index) => ({ hit_type: 'external', item: { ...item, source_url: sources[index % sources.length][1] }, score: 0.82 - index * 0.02, source: sources[index % sources.length][0], url: sources[index % sources.length][1] }))
      const result = page(results, url)
      return { ...result, search_mode: 'mock-external-preview' }
    },
  },
  {
    method: 'POST', path: '/api/search/poster-preview', handler: async (req) => {
      const user = getCurrentUser(req)
      if (!user) return { __status: 401, message: '请先登录' }
      const body = await parseBody(req)
      const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(body.title)}</title><style>body{margin:0;background:#eef7f1;font-family:system-ui;color:#133b2a}.poster{width:520px;min-height:620px;margin:24px auto;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px #0d5e3c33}.hero{padding:56px;background:linear-gradient(135deg,#0d5e3c,#27a66b);color:#fff}.hero small{letter-spacing:.18em}.hero h1{font-size:40px;line-height:1.15}.body{padding:44px;font-size:18px;line-height:1.8}.source{color:#547064;font-size:14px}</style></head><body><article class="poster"><header class="hero"><small>逸仙活动云 · 自动海报</small><h1>${escapeHtml(body.title)}</h1></header><section class="body"><p>${escapeHtml(body.summary || '请以来源页面的活动信息为准。')}</p><p class="source">来源：${escapeHtml(body.source || '外部搜索')}</p></section></article></body></html>`
      return { __raw: html, __contentType: 'text/html; charset=utf-8' }
    },
  },
  {
    method: 'GET', path: '/api/demo/summary', handler: async (req) => {
      const user = adminOrError(req); if (user.__status) return user
      const published = ACTIVITIES.filter((item) => item.status === 'published').length
      const draft = ACTIVITIES.filter((item) => item.status === 'draft').length
      const rejected = ACTIVITIES.filter((item) => item.status === 'rejected').length
      const pending = ACTIVITIES.filter((item) => item.status === 'pending_review').length
      return { pending, published, sources: DATA_SOURCES.length, failed_tasks: 0, posters: { total: ACTIVITIES.length, published, draft, rejected }, knowledge_nodes: knowledgeCatalog().length, poster_links: knowledgeCatalog().reduce((sum, node) => sum + node.posters.length, 0), data_sources: DATA_SOURCES.length, last_crawl: crawlLogs[0] || null }
    },
  },
  {
    method: 'POST', path: '/api/posters/bulk-review', handler: async (req) => {
      const user = adminOrError(req); if (user.__status) return user
      const { poster_ids = [], action, comment = '' } = await parseBody(req)
      const succeeded = []; const failed = []
      for (const id of poster_ids) {
        const item = ACTIVITIES.find((candidate) => candidate.id === Number(id))
        if (!item || !['pending_review', 'draft'].includes(item.status)) { failed.push({ id, reason: '当前状态不可审核' }); continue }
        item.status = action === 'approve' ? 'published' : 'rejected'; item.reject_reason = action === 'reject' ? comment : ''; succeeded.push(item.id)
      }
      return { succeeded, failed }
    },
  },
  {
    method: 'GET', path: '/api/posters/:id/duplicates', handler: async (req) => {
      const user = adminOrError(req); if (user.__status) return user
      const poster = ACTIVITIES.find((item) => item.id === Number(req.params.id)); if (!poster) return { __status: 404, message: '活动不存在' }
      const duplicates = ACTIVITIES.filter((item) => item.id !== poster.id && (item.organizer === poster.organizer || item.activity_type === poster.activity_type)).slice(0, 3)
      return { poster, duplicates, count: duplicates.length }
    },
  },
  {
    method: 'POST', path: '/api/posters/:id/merge-source', handler: async (req) => {
      const user = adminOrError(req); if (user.__status) return user
      const target = ACTIVITIES.find((item) => item.id === Number(req.params.id)); const { source_poster_id } = await parseBody(req); const source = ACTIVITIES.find((item) => item.id === Number(source_poster_id))
      if (!target || !source) return { __status: 404, message: '活动不存在' }
      target.raw_text = `${target.raw_text}\n\n补充来源：${source.raw_text}`; return { success: true, poster: target }
    },
  },
  {
    method: 'POST', path: '/api/posters/:id/rebuild-knowledge', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; return { success: true, nodes: 4, links: 4, message: '已根据地点、主办方、分类与来源重建关联' } },
  },
  {
    method: 'GET', path: '/api/data-sources', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; return { items: DATA_SOURCES } },
  },
  {
    method: 'GET', path: '/api/data-sources/:id/logs', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; return { items: crawlLogs.filter((item) => item.data_source_id === Number(req.params.id)) } },
  },
  {
    method: 'GET', path: '/api/data-sources/:id/preview-crawl', handler: async (req) => {
      const user = adminOrError(req); if (user.__status) return user
      const source = DATA_SOURCES.find((item) => item.id === Number(req.params.id)); if (!source) return { __status: 404, message: '数据源不存在' }
      const items = sortActivities(ACTIVITIES.filter((item) => item.status === 'published'), 'created_at').slice(0, 6).map((item, index) => ({ title: `${source.name}：${item.title}`, raw_text: item.raw_text, summary: item.summary, event_time: item.event_time, location: item.location, organizer: item.organizer, source_url: source.url, is_duplicate: index === 4, extraction_mode: source.crawl_mode === 'smart' ? '智能正文识别' : '选择器提取' }))
      return { items, source: { id: source.id, name: source.name }, extraction: { mode: source.crawl_mode, pages_scanned: 8, candidates: items.length } }
    },
  },
  {
    method: 'POST', path: '/api/data-sources/:id/crawl', handler: async (req) => {
      const user = adminOrError(req); if (user.__status) return user
      const source = DATA_SOURCES.find((item) => item.id === Number(req.params.id)); if (!source) return { __status: 404, message: '数据源不存在' }
      const task_id = `mock-crawl-${source.id}-${Date.now()}`
      const log = { id: Date.now(), data_source_id: source.id, status: 'success', message: '智能正文识别完成，候选内容等待预览确认', started_at: new Date().toISOString(), finished_at: new Date().toISOString(), pages_found: 8, pages_succeeded: 8, pages_failed: 0, duplicates_skipped: 2, drafts_created: 0, average_quality_score: 90 }
      crawlLogs.unshift(log); taskState.set(task_id, { task_id, state: 'SUCCESS', result: log, error: null }); source.last_status = '抓取完成，等待预览导入'
      return { task_id, message: source.last_status }
    },
  },
  {
    method: 'GET', path: '/api/tasks/:id', handler: async (req) => taskState.get(req.params.id) || { task_id: req.params.id, state: 'PENDING', result: null, error: null },
  },
  {
    method: 'GET', path: '/api/ai/status', handler: async (req) => {
      const user = adminOrError(req); if (user.__status) return user
      return { llm_configured: true, llm_profiles: [{ name: '活动信息抽取', model: 'mock-campus-extractor-v1', base_url: 'local://mock/ai', key_masked: 'mock-••••-local' }], searxng_base_url: 'local://mock/external-search', searxng_engines: ['校园官网', '校园新闻网'], embedding_enabled: true, mcp_servers: [] }
    },
  },
  {
    method: 'POST', path: '/api/ai/extract', handler: async (req) => { const user = publisherOrError(req); if (user.__status) return user; const { text } = await parseBody(req); if (!String(text || '').trim()) return { __status: 422, message: '请输入活动正文' }; return { fields: extractFields(text), provider: 'local-mock' } },
  },
  {
    method: 'POST', path: '/api/ai/enrich/:id', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; const item = ACTIVITIES.find((candidate) => candidate.id === Number(req.params.id)); if (!item) return { __status: 404, message: '活动不存在' }; item.summary ||= item.raw_text.slice(0, 100); item.quality_score = Math.max(item.quality_score || 0, 92); item.tags = [...new Set([...(item.tags || []), 'AI 已校对'])]; return { item, fields_updated: ['summary', 'quality_score', 'tags'] } },
  },
  {
    method: 'GET', path: '/api/knowledge/nodes', handler: async (req) => { const url = new URL(req.url, `http://localhost:${PORT}`); const q = url.searchParams.get('q') || ''; const type = url.searchParams.get('node_type') || ''; return { items: knowledgeCatalog().map(({ posters, ...node }) => node).filter((node) => (!q || node.name.includes(q)) && (!type || node.node_type === type)) } },
  },
  {
    method: 'GET', path: '/api/knowledge/nodes/:id', handler: async (req) => { const item = knowledgeCatalog().find((node) => node.id === Number(req.params.id)); return item ? { item } : { __status: 404, message: '知识节点不存在' } },
  },
  {
    method: 'POST', path: '/api/knowledge/rebuild', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; const body = await parseBody(req); const total = ACTIVITIES.filter((item) => !body.status || item.status === body.status).length; return { total, succeeded: total, failed: 0, errors: [], embeddings: body.rebuild_embeddings ? { task_id: `mock-embedding-${Date.now()}` } : null } },
  },
  {
    method: 'GET', path: '/api/posters/:id/related', handler: async (req) => { const activity = ACTIVITIES.find((item) => item.id === Number(req.params.id) && item.status === 'published'); if (!activity) return { __status: 404, message: 'activity not found' }; const catalog = knowledgeCatalog(); const nodes = catalog.filter((node) => node.posters.some((link) => link.poster.id === activity.id)).map(({ posters, ...node }) => node); const related = ACTIVITIES.filter((item) => item.id !== activity.id && item.status === 'published' && (item.activity_type === activity.activity_type || item.organizer === activity.organizer || item.location === activity.location)).slice(0, 6).map((item) => ({ activity: item, reason: item.activity_type === activity.activity_type ? `同属${activity.activity_type}` : item.organizer === activity.organizer ? '主办方相同' : '活动地点相同' })); return { nodes, related, source: { name: activity.source_name, url: activity.source_url } } },
  },
  {
    method: 'GET', path: '/api/dict/:category/suggestions', handler: async (req) => { const category = req.params.category; const existing = new Set((dictEntries[category] || []).map((item) => item.standard_name)); const field = category === 'place' ? 'location' : category === 'org' ? 'organizer' : 'activity_type'; const counts = new Map(); ACTIVITIES.forEach((item) => { const value = item[field]; if (value && !existing.has(value)) counts.set(value, (counts.get(value) || 0) + 1) }); return { items: [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count) } },
  },
  {
    method: 'GET', path: '/api/dict/:category', handler: async (req) => { const category = req.params.category; const url = new URL(req.url, `http://localhost:${PORT}`); const q = url.searchParams.get('q') || ''; const items = (dictEntries[category] || []).filter((item) => !q || `${item.standard_name}${item.aliases}${item.description}`.includes(q)); return { category, items, page: 1, per_page: Number(url.searchParams.get('per_page') || 100), total: items.length } },
  },
  {
    method: 'POST', path: '/api/dict/seed', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; const before = Object.values(dictEntries).reduce((sum, items) => sum + items.length, 0); const seeds = [['place', '珠海校区'], ['org', '就业指导中心'], ['topic', '创新创业']]; let seeded = 0; for (const [category, name] of seeds) { if (!dictEntries[category].some((item) => item.standard_name === name)) { dictEntries[category].push({ id: Date.now() + seeded, standard_name: name, aliases: '', description: '内置示例词条' }); seeded++ } } return { seeded, total: before + seeded } },
  },
  {
    method: 'POST', path: '/api/dict/:category', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; const category = req.params.category; const body = await parseBody(req); if (!body.standard_name) return { __status: 422, message: '标准名称不能为空' }; const item = { id: Date.now(), standard_name: body.standard_name, aliases: body.aliases || '', description: body.description || '' }; (dictEntries[category] ||= []).push(item); return { item } },
  },
  {
    method: 'PUT', path: '/api/dict/:category/:id', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; const item = (dictEntries[req.params.category] || []).find((entry) => entry.id === Number(req.params.id)); if (!item) return { __status: 404, message: '字典项不存在' }; Object.assign(item, await parseBody(req)); return { item } },
  },
  {
    method: 'DELETE', path: '/api/dict/:category/:id', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; const items = dictEntries[req.params.category] || []; dictEntries[req.params.category] = items.filter((entry) => entry.id !== Number(req.params.id)); return { success: true } },
  },
  {
    method: 'PUT', path: '/api/notifications/read-all', handler: async (req) => { const user = getCurrentUser(req); if (!user) return { __status: 401, message: '请先登录' }; const items = USER_STATE.notifications[user.id] || []; items.forEach((item) => { item.read = true }); return { updated: items.length } },
  },
  {
    method: 'GET', path: '/api/export/knowledge.json', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; return { generated_at: new Date().toISOString(), items: knowledgeCatalog() } },
  },
  {
    method: 'GET', path: '/api/export/crawl-report.json', handler: async (req) => { const user = adminOrError(req); if (user.__status) return user; return { generated_at: new Date().toISOString(), items: crawlLogs } },
  },
]
