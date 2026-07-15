import client from './client'
import type { Activity } from './activities'
import type { ApiPage } from './types'

export interface AdminSummary { pending: number; published: number; sources: number; failed_tasks: number }
export interface AuditLog { id: number; created_at: string; actor: string; action: string; target: string; summary: string }
export interface DataSource { id: number; name: string; url: string; enabled: boolean; last_status: string }

export const getAdminSummary = () => client.get<AdminSummary>('/demo/summary')
export const getReviewActivities = (params?: Record<string, string | number>) => client.get<ApiPage<Activity>>('/posters/review-queue', { params })
export const reviewActivity = (id: number, action: 'approve' | 'reject', reason = '') => client.post(`/posters/${id}/review`, { action, reason })
export const getAuditLogs = (params?: Record<string, string | number>) => client.get<ApiPage<AuditLog>>('/audit-logs', { params })
export const getDataSources = () => client.get<{ items: DataSource[] }>('/data-sources')
export const createDataSource = (data: Pick<DataSource, 'name' | 'url' | 'enabled'>) => client.post<DataSource>('/data-sources', data)
export const updateDataSource = (id: number, data: Partial<Pick<DataSource, 'name' | 'url' | 'enabled'>>) => client.put<DataSource>(`/data-sources/${id}`, data)
export const toggleDataSource = (id: number, enabled: boolean) => client.patch(`/data-sources/${id}`, { enabled })
export const runDataSource = (id: number) => client.post(`/data-sources/${id}/crawl`)
export const exportActivities = () => client.get('/export/posters.json', { responseType: 'blob' })
