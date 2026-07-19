import type { Activity } from '@/api/activities'

export type ActivitySort = 'created_at' | 'event_time' | 'popularity'

function dateValue(value: string | null | undefined, nullValue: number) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(timestamp) ? timestamp : nullValue
}

export function sortActivities<T extends Activity>(items: T[], sort: ActivitySort): T[] {
  return [...items].sort((left, right) => {
    const comparison = sort === 'event_time'
      ? dateValue(right.event_time, Number.NEGATIVE_INFINITY) - dateValue(left.event_time, Number.NEGATIVE_INFINITY)
      : sort === 'popularity'
        ? (right.hot_score ?? 0) - (left.hot_score ?? 0)
        : dateValue(right.created_at, 0) - dateValue(left.created_at, 0)
    return comparison || left.id - right.id
  })
}
