import client from './client'
import type { Activity } from './activities'
import type { ApiPage, UserProfile } from './types'

export interface Subscription { id: number; keyword: string; created_at: string }
export interface Notification { id: number; title: string; body: string; read: boolean; created_at: string }

export const getProfile = () => client.get<{ user: UserProfile }>('/auth/me')
export const updateProfile = (data: Pick<UserProfile, 'display_name' | 'email'>) => client.patch<{ user: UserProfile } | UserProfile>('/auth/me', data)
export const getFavorites = () => client.get<ApiPage<Activity>>('/activities/favorites')
export const getSubscriptions = () => client.get<{ items: Subscription[] }>('/subscriptions')
export const createSubscription = (keyword: string) => client.post<{ item: Subscription } | Subscription>('/subscriptions', { keyword })
export const deleteSubscription = (id: number) => client.delete(`/subscriptions/${id}`)
export const getNotifications = () => client.get<{ items: Notification[] }>('/subscriptions/notifications')
export const markNotificationRead = (id: number) => client.put(`/subscriptions/notifications/${id}/read`)
export const markAllNotificationsRead = () => client.put<{ updated: number }>('/subscriptions/notifications/read-all')
