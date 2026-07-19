import client from './client'
import type { ActivityStatus, ApiPage } from './types'

export interface Attachment {
  id?: string
  name: string
  url: string
  mime_type?: string
  size?: number
}

export interface Activity {
  id: number
  title: string
  raw_text: string
  summary: string
  event_time: string | null
  location: string | null
  organizer: string | null
  status: ActivityStatus
  activity_type: string | null
  created_at: string
  reject_reason?: string
  cover_image_url?: string | null
  hot_score?: number
  created_by?: number
  source_url?: string
}

export interface ActivityDetail extends Activity {
  tags?: string[]
  attachments?: Attachment[]
  meta?: {
    views: number
    registrations: number
  }
  favorite?: boolean
  registered?: boolean
  in_calendar?: boolean
  source_name?: string
  content_html?: string | null
}

export interface ActivityForm {
  title: string
  summary: string
  raw_text: string
  event_time: string | null
  location: string | null
  organizer: string | null
  activity_type: string | null
  tags: string[]
  attachments: Attachment[]
  cover_image_url?: string | null
}

export interface ActivityListParams {
  q?: string
  status?: string
  page?: number
  per_page?: number
  activity_type?: string
  sort?: 'created_at' | 'event_time' | 'popularity'
}

export interface RegistrationAttendee {
  id: number
  username: string
  name: string
  student_id: string
  college: string
  email?: string
  registered_at: string | null
}

export interface RegistrationForm {
  name: string
  student_id: string
  college: string
  email: string
}

export interface RecommendedActivity extends Activity {
  score: number
  reason: string
}

export function listActivities(params?: ActivityListParams) {
  return client.get<ApiPage<Activity>>(
    '/activities',
    { params },
  )
}

export function getActivityById(id: number) {
  return client.get<ActivityDetail>(`/activities/${id}`)
}

export function registerForActivity(id: number, form: RegistrationForm) {
  return client.post<{ success: boolean; registrations: number; already_registered: boolean; registered?: boolean }>(`/activities/${id}/register`, form)
}

export function cancelRegistration(id: number) {
  return client.delete<{ success: boolean; registrations: number; registered: boolean }>(`/activities/${id}/register`)
}

export function unregisterFromActivity(id: number) {
  return cancelRegistration(id)
}

export function setActivityFavorite(id: number, favorite: boolean) {
  return client.request<{ favorite: boolean }>({ method: favorite ? 'POST' : 'DELETE', url: `/activities/${id}/favorite` })
}

export function listMyActivities(params?: ActivityListParams) {
  return client.get<ApiPage<Activity>>('/activities/mine', { params })
}

export function listRegisteredActivities(params?: Pick<ActivityListParams, 'page' | 'per_page'>) {
  return client.get<ApiPage<Activity>>('/activities/registered', { params })
}

export function getPersonalizedRecommendations(limit = 6) {
  return client.get<{ items: RecommendedActivity[] }>('/activities/recommendations', { params: { limit } })
}

export function listActivityRegistrations(id: number, params?: Pick<ActivityListParams, 'page' | 'per_page'>) {
  return client.get<ApiPage<RegistrationAttendee>>(`/activities/${id}/registrations`, { params })
}

export function downloadActivityRegistrations(id: number) {
  return client.get(`/activities/${id}/registrations.csv`, { responseType: 'blob' })
}

export function createActivity(data: ActivityForm) {
  return client.post<ActivityDetail>('/activities', data)
}

export function updateActivity(id: number, data: ActivityForm) {
  return client.put<ActivityDetail>(`/activities/${id}`, data)
}

export function deleteActivity(id: number) {
  return client.delete<{ success: boolean }>(`/activities/${id}`)
}

export function submitActivityForReview(id: number) {
  return client.post<ActivityDetail>(`/activities/${id}/submit-review`)
}
