/**
 * 日历相关 Mock 路由
 *   GET /api/calendar/events
 */

import { ACTIVITIES, CALENDAR_EVENTS } from '../db.js'
import { getCurrentUser } from '../utils.js'

export default [
  {
    method: 'GET',
    path: '/api/calendar/events',
    handler: async (req) => {
      const user = getCurrentUser(req)
      if (!user) return { __status: 401, message: '请先登录' }
      const month = new URL(req.url, 'http://localhost:5000').searchParams.get('month') || '2026-05'
      const events = (CALENDAR_EVENTS[user.id] || []).map((item, index) => ({
        ...item, id: index + 1, date: item.date || `${month}-${String(index + 2).padStart(2, '0')}`,
      }))
      return { events }
    },
  },
  {
    method: 'GET', path: '/api/posters/:id/ics', handler: async (req) => {
      const activity = ACTIVITIES.find((item) => item.id === Number(req.params.id) && item.status === 'published')
      if (!activity) return { __status: 404, message: '活动不存在或尚未发布' }
      const stamp = (activity.event_time || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
      const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//逸仙活动云//CN\r\nBEGIN:VEVENT\r\nUID:activity-${activity.id}@sysu\r\nDTSTAMP:${stamp}\r\nDTSTART:${stamp}\r\nSUMMARY:${activity.title}\r\nLOCATION:${activity.location || ''}\r\nDESCRIPTION:${activity.summary || ''}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`
      return { __raw: ics, __contentType: 'text/calendar; charset=utf-8', __headers: { 'Content-Disposition': `attachment; filename="activity-${activity.id}.ics"` } }
    },
  },
]
