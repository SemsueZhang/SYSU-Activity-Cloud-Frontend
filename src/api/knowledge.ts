import client from './client'

export interface KnowledgeNode {
  id: number
  name: string
  node_type: 'time' | 'place' | 'organization' | 'topic' | 'source' | string
}

export interface RelatedActivity {
  id: number
  title: string
  summary?: string
  event_time?: string | null
  reason?: string
}

export interface ActivityKnowledgeContext {
  nodes: KnowledgeNode[]
  related: RelatedActivity[]
  source?: { name?: string; url?: string }
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function nodeOf(value: any): KnowledgeNode {
  return { id: Number(value.id), name: String(value.name ?? value.label ?? value.value ?? ''), node_type: String(value.node_type ?? value.type ?? 'topic') }
}

function relatedOf(value: any): RelatedActivity {
  const item = value.poster ?? value.activity ?? value
  return { id: Number(item.id), title: String(item.title ?? ''), summary: item.summary, event_time: item.event_time, reason: value.reason ?? value.relation_reason }
}

/**
 * The backend exposes knowledge as a separate resource. Keep it separate from
 * Activity so presentation code never needs to know the backend's poster model.
 */
export async function getActivityKnowledgeContext(id: number): Promise<ActivityKnowledgeContext> {
  const { data } = await client.get<any>(`/posters/${id}/related`)
  return {
    nodes: arrayOf(data.nodes ?? data.knowledge_nodes ?? data.direct_nodes).map(nodeOf).filter((node) => node.name),
    related: arrayOf(data.related ?? data.related_posters ?? data.items).map(relatedOf).filter((item) => item.id && item.title),
    source: data.source ? { name: data.source.name, url: data.source.url ?? data.source.source_url } : undefined,
  }
}

export function listKnowledgeNodes(params?: { q?: string; node_type?: string }) {
  return client.get<{ items: KnowledgeNode[] }>('/knowledge/nodes', { params })
}

export function subscribeToKnowledgeNode(nodeId: number) {
  return client.post('/subscriptions', { node_id: nodeId })
}
