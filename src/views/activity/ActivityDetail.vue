<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import ActivityHeader from '@/components/activity/ActivityHeader.vue'
import ActivityMeta from '@/components/activity/ActivityMeta.vue'
import ActivityBody from '@/components/activity/ActivityBody.vue'
import { getActivityById, registerForActivity, setActivityFavorite, unregisterFromActivity, type ActivityDetail as ActivityDetailType } from '@/api/activities'
import { getActivityKnowledgeContext, subscribeToKnowledgeNode, type ActivityKnowledgeContext } from '@/api/knowledge'
import { downloadActivityIcs } from '@/api/calendar'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const detail = ref<ActivityDetailType | null>(null)
const registering = ref(false)
const favorite = ref(false)
const registered = ref(false)
const context = ref<ActivityKnowledgeContext>({ nodes: [], related: [] })
let requestVersion = 0

const activityId = computed(() => Number(route.params.id))
const redirectTarget = computed(() => {
  const value = route.query?.redirect
  return typeof value === 'string' && value.trim() ? value : ''
})

async function fetchDetail() {
  const version = ++requestVersion
  loading.value = true
  detail.value = null
  context.value = { nodes: [], related: [] }
  favorite.value = false
  registered.value = false
  try {
    const res = await getActivityById(activityId.value)
    if (version !== requestVersion) return
    detail.value = res.data || null
    favorite.value = Boolean(detail.value?.favorite)
    registered.value = Boolean(detail.value?.registered)
    getActivityKnowledgeContext(activityId.value).then((value) => {
      if (version === requestVersion) context.value = value
    }).catch(() => { /* the detail stays usable without related knowledge */ })
    if (!detail.value) {
      ElMessage.error('活动不存在或已下线')
      router.replace('/')
    }
  } catch {
    if (version === requestVersion) detail.value = null
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

async function toggleRegistration() {
  if (!detail.value) return
  if (!auth.isLoggedIn) { router.push({ path: '/auth/login', query: { redirect: route.fullPath } }); return }
  registering.value = true
  try {
    if (registered.value) {
      await ElMessageBox.confirm('取消报名后，该活动也会从你的日历中移除。确认取消？', '取消报名', { type: 'warning', confirmButtonText: '确认取消', cancelButtonText: '保留报名' })
      const { data } = await unregisterFromActivity(detail.value.id)
      detail.value.meta = { ...(detail.value.meta || { views: 0, registrations: 0 }), registrations: data.registrations }
      registered.value = false
      ElMessage.success('已取消报名并从日历移除')
    } else {
      const { data } = await registerForActivity(detail.value.id)
      detail.value.meta = { ...(detail.value.meta || { views: 0, registrations: 0 }), registrations: data.registrations }
      registered.value = true
      ElMessage.success(data.already_registered ? '你已报名该活动，日历已同步' : '报名成功，已加入日历')
    }
  } catch { /* interceptor handles request errors and confirmation cancellation */ } finally { registering.value = false }
}
async function toggleFavorite() {
  if (!detail.value) return
  if (!auth.isLoggedIn) { router.push({ path: '/auth/login', query: { redirect: route.fullPath } }); return }
  try { const { data } = await setActivityFavorite(detail.value.id, !favorite.value); favorite.value = data.favorite; ElMessage.success(favorite.value ? '已收藏' : '已取消收藏') } catch { /* interceptor handles request errors */ }
}
async function share() {
  const url = window.location.href
  try { if (navigator.share) await navigator.share({ title: detail.value?.title, url }); else { await navigator.clipboard.writeText(url); ElMessage.success('活动链接已复制') } } catch { /* user cancelled or clipboard is unavailable */ }
}
async function exportIcs() {
  if (!detail.value) return
  try {
    const { data } = await downloadActivityIcs(detail.value.id)
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url; link.download = `activity-${detail.value.id}.ics`; link.click()
    URL.revokeObjectURL(url)
  } catch { /* interceptor provides the server error */ }
}
async function subscribe(nodeId: number) {
  if (!auth.isLoggedIn) { router.push({ path: '/auth/login', query: { redirect: route.fullPath } }); return }
  try { await subscribeToKnowledgeNode(nodeId); ElMessage.success('已订阅该关联条件') } catch { /* interceptor provides the server error */ }
}

function goBack() {
  if (redirectTarget.value) {
    router.replace(redirectTarget.value)
    return
  }

  router.back()
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(activityId, fetchDetail, { immediate: true })
</script>

<template>
  <AppShell :show-search="false">
  <div class="detail-page">
    <div class="detail-shell">
      <el-button text class="back-btn" @click="goBack">← 返回</el-button>

      <el-skeleton v-if="loading" animated :rows="8" />

      <template v-else-if="detail">
        <ActivityHeader
          :title="detail.title"
          :summary="detail.summary"
          :event-time="formatDateTime(detail.event_time)"
          :location="detail.location"
          :organizer="detail.organizer"
          :activity-type="detail.activity_type"
          :views="detail.meta?.views ?? 0"
        />

        <div class="detail-grid">
          <ActivityBody
            :raw-text="detail.raw_text"
            :attachments="detail.attachments || []"
          />

          <ActivityMeta
            :tags="detail.tags || []"
            :registrations="detail.meta?.registrations ?? 0"
            :created-at="formatDateTime(detail.created_at)"
          />
        </div>

        <section v-if="context.nodes.length" class="context-card">
          <div>
            <h2>关联条件</h2>
          </div>
          <div v-if="context.nodes.length" class="node-list">
            <el-button v-for="node in context.nodes" :key="node.id" size="small" plain @click="subscribe(node.id)">{{ node.name }} · 订阅</el-button>
          </div>
        </section>

        <section v-if="context.related.length" class="related-card">
          <h2>相关活动</h2>
          <div class="related-list">
            <button v-for="item in context.related" :key="item.id" type="button" @click="router.push(`/activity/${item.id}`)"><strong>{{ item.title }}</strong><span>{{ item.reason || '关联推荐' }}</span></button>
          </div>
        </section>

        <section class="action-card">
          <div class="action-text">
            <h3>参与这场活动</h3>
            <p>报名成功后活动会自动加入日历；取消报名后会同步移除。</p>
          </div>
          <div class="action-buttons">
            <el-button :type="registered ? 'danger' : 'primary'" :loading="registering" @click="toggleRegistration">{{ registered ? '取消报名' : '立即报名' }}</el-button>
            <el-button @click="share">分享</el-button>
            <el-button @click="toggleFavorite">{{ favorite ? '取消收藏' : '收藏' }}</el-button>
            <el-button @click="exportIcs">导出 ICS</el-button>
          </div>
        </section>
      </template>
      <el-result v-else icon="error" title="活动不存在或已下线" sub-title="请检查链接，或返回活动列表。"><template #extra><el-button type="primary" @click="router.push('/activities')">浏览活动</el-button></template></el-result>
    </div>
  </div>
  </AppShell>
</template>

<style scoped>
.detail-page {
  min-height: calc(100vh - 60px);
  background: linear-gradient(180deg, #eef7f1 0%, #f8fbf8 38%, #f5f7f6 100%);
  padding: 32px 20px 48px;
}

.detail-shell {
  max-width: 1180px;
  margin: 0 auto;
}

.back-btn {
  margin-bottom: 16px;
  color: #0d5e3c;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  margin-top: 18px;
}

.action-card {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 20px 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, #0d5e3c 0%, #13714a 100%);
  color: #fff;
  box-shadow: 0 18px 40px rgba(13, 94, 60, 0.18);
}
.context-card,.related-card { margin-top:18px;padding:20px 22px;border:1px solid #e4efe7;border-radius:18px;background:#fff;box-shadow:0 8px 22px rgba(19,59,42,.05) }
.context-card { display:flex;gap:20px;justify-content:space-between;align-items:center }.context-card h2,.related-card h2{margin:0 0 7px;color:#133b2a;font-size:18px}.context-card p{margin:0;color:#5f6b66}.context-card a{color:var(--brand);font-weight:600}.node-list{display:flex;flex-wrap:wrap;gap:8px}.related-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.related-list button{border:1px solid #e5eee8;background:#f8fbf9;border-radius:12px;padding:13px;text-align:left;cursor:pointer;color:#133b2a}.related-list button:hover{background:var(--brand-soft)}.related-list span{display:block;margin-top:5px;color:#6b7671;font-size:13px}

.action-text h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.action-text p {
  margin: 0;
  opacity: 0.9;
  line-height: 1.7;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .action-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .context-card { align-items:flex-start; flex-direction:column; }
}
</style>
