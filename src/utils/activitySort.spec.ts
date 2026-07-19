import { describe, expect, it } from 'vitest'
import { sortActivities } from './activitySort'
import type { Activity } from '@/api/activities'

const base = { raw_text: '', summary: '', event_time: null, location: null, organizer: null, status: 'published', activity_type: '讲座', created_at: '2026-07-01T00:00:00' } as const

describe('sortActivities popularity', () => {
  it('orders activities by the explicit hot score', () => {
    const items: Activity[] = [
      { ...base, id: 1, title: '普通活动', hot_score: 20 },
      { ...base, id: 2, title: '热门活动', hot_score: 95 },
      { ...base, id: 3, title: '次热门活动', hot_score: 70 },
    ]

    expect(sortActivities(items, 'popularity').map((item) => item.id)).toEqual([2, 3, 1])
  })
})
