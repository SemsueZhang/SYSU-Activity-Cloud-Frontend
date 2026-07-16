<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { listMyActivities, submitActivityForReview, type Activity } from '@/api/activities'

type Section = 'approved' | 'reviewing' | 'rejected'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const activities = ref<Activity[]>([])
const submittingId = ref<number | null>(null)

const section = computed<Section>(() => {
  const value = String(route.params.section || '')
  return ['approved', 'reviewing', 'rejected'].includes(value) ? value as Section : 'approved'
})

const pageConfig = computed(() => ({
  approved: { title: '已通过', description: '已通过审核并发布的活动', empty: '暂无已通过活动' },
  reviewing: { title: '在审核', description: '已经提交、正在等待管理员审核的活动', empty: '暂无审核中活动' },
  rejected: { title: '未通过', description: '未通过审核或尚未提交的活动', empty: '暂无未通过或待提交活动' },
}[section.value]))

function activityTime(activity: Activity) {
  if (!activity.event_time) return Number.NEGATIVE_INFINITY
  const value = Date.parse(activity.event_time)
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value
}

const sortedActivities = computed(() => [...activities.value].sort((left, right) => activityTime(right) - activityTime(left) || right.id - left.id))

function isEnded(activity: Activity) {
  const value = activityTime(activity)
  return Number.isFinite(value) && value < Date.now()
}

function formatDateTime(value: string | null) {
  if (!value) return '时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待定'
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (section.value === 'rejected') {
      const [rejected, drafts] = await Promise.all([
        listMyActivities({ status: 'rejected', page: 1, per_page: 100 }),
        listMyActivities({ status: 'draft', page: 1, per_page: 100 }),
      ])
      activities.value = [...rejected.data.items, ...drafts.data.items]
    } else {
      const status = section.value === 'approved' ? 'published' : 'pending_review'
      const { data } = await listMyActivities({ status, page: 1, per_page: 100 })
      activities.value = data.items
    }
  } catch (reason) {
    error.value = (reason as { response?: { data?: { message?: string } } })?.response?.data?.message || '我创建的活动加载失败'
  } finally {
    loading.value = false
  }
}

async function submit(activity: Activity) {
  try {
    await ElMessageBox.confirm('提交后将进入审核队列，确认继续？', '提交审核', { type: 'warning' })
    submittingId.value = activity.id
    await submitActivityForReview(activity.id)
    ElMessage.success('已提交审核')
    router.push('/my/created/reviewing')
  } catch { /* request interceptor handles errors; closing the confirmation needs no message */ }
  finally { submittingId.value = null }
}

watch(section, load)
onMounted(load)
</script>

<template>
  <AppShell :title="`我创建的活动 · ${pageConfig.title}`">
    <template #heading>
      <div class="heading-actions">
        <el-button @click="router.push('/my/activities')">我报名的活动</el-button>
        <el-button type="primary" @click="router.push('/activities/create')">创建活动</el-button>
      </div>
    </template>

    <nav class="status-nav surface-card" aria-label="我创建的活动状态导航">
      <el-button :type="section === 'approved' ? 'primary' : 'default'" @click="router.push('/my/created/approved')">已通过</el-button>
      <el-button :type="section === 'reviewing' ? 'primary' : 'default'" @click="router.push('/my/created/reviewing')">在审核</el-button>
      <el-button :type="section === 'rejected' ? 'primary' : 'default'" @click="router.push('/my/created/rejected')">未通过</el-button>
    </nav>

    <PageState :loading="loading" :error="error" @retry="load">
      <section class="surface-card activity-page" :aria-labelledby="`${section}-heading`">
        <div class="page-intro">
          <div>
            <h2 :id="`${section}-heading`">{{ pageConfig.title }}</h2>
            <p>{{ pageConfig.description }}，按活动日期从新到旧排列。</p>
          </div>
          <el-tag :type="section === 'approved' ? 'success' : section === 'reviewing' ? 'warning' : 'danger'" round>{{ activities.length }} 场</el-tag>
        </div>
        <el-empty v-if="!sortedActivities.length" :description="pageConfig.empty" />
        <div v-else class="activity-list">
          <article v-for="activity in sortedActivities" :key="activity.id" class="activity-item" :class="isEnded(activity) ? 'ended' : 'active'">
            <button type="button" class="activity-main" @click="router.push(section === 'rejected' ? `/activities/${activity.id}/edit` : `/activity/${activity.id}`)">
              <div class="activity-title-line">
                <h3>{{ activity.title }}</h3>
                <el-tag v-if="section === 'rejected'" :type="activity.status === 'rejected' ? 'danger' : 'info'" size="small">{{ activity.status === 'rejected' ? '未通过' : '草稿' }}</el-tag>
                <el-tag v-else :type="section === 'approved' ? 'success' : 'warning'" size="small">{{ pageConfig.title }}</el-tag>
              </div>
              <time>{{ formatDateTime(activity.event_time) }}</time>
              <p v-if="activity.status === 'rejected'" class="reject-reason">驳回原因：{{ activity.reject_reason || '请联系管理员了解具体原因' }}</p>
              <p v-else-if="activity.status === 'draft'" class="draft-note">尚未提交审核</p>
              <p v-else>{{ activity.location || '地点待定' }}</p>
            </button>
            <div v-if="section === 'rejected'" class="item-actions">
              <el-button text type="primary" @click="router.push(`/activities/${activity.id}/edit`)">编辑</el-button>
              <el-button text type="success" :loading="submittingId === activity.id" @click="submit(activity)">提交审核</el-button>
            </div>
            <el-button v-else text type="primary" @click="router.push(`/activity/${activity.id}`)">查看</el-button>
          </article>
        </div>
      </section>
    </PageState>
  </AppShell>
</template>

<style scoped>
.heading-actions, .status-nav, .item-actions { display: flex; gap: 10px; }
.status-nav { margin-bottom: 18px; padding: 12px 14px; }
.activity-page { padding: 22px; }
.page-intro { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
.page-intro h2 { margin: 0; color: var(--text-strong); font-size: 22px; }
.page-intro p { margin: 7px 0 0; color: var(--text-muted); line-height: 1.6; }
.activity-list { display: grid; gap: 12px; }
.activity-item { display: flex; align-items: center; gap: 14px; padding: 15px 16px; border: 1px solid; border-left-width: 5px; border-radius: 14px; transition: transform .18s ease, box-shadow .18s ease; }
.activity-item:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(20, 65, 44, .08); }
.activity-item.active { background: #f2faf5; border-color: #b9ddc6; border-left-color: #258653; }
.activity-item.ended { background: #f2f3f3; border-color: #d7dcda; border-left-color: #929b97; color: #6f7773; }
.activity-main { flex: 1; min-width: 0; border: 0; padding: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.activity-main:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: 5px; border-radius: 4px; }
.activity-title-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.activity-title-line h3 { margin: 0; font-size: 17px; color: inherit; }
.activity-main time { display: block; margin-top: 7px; color: inherit; font-size: 14px; font-weight: 600; }
.activity-main p { margin: 6px 0 0; color: inherit; font-size: 13px; }
.reject-reason { color: #a43b3b !important; font-weight: 600; line-height: 1.5; }
.draft-note { color: var(--text-muted) !important; }
.item-actions { flex-shrink: 0; }
@media (max-width: 700px) {
  .heading-actions, .status-nav { flex-wrap: wrap; }
  .activity-page { padding: 17px; }
  .page-intro { align-items: center; }
  .page-intro p { font-size: 13px; }
  .activity-item { align-items: flex-start; flex-wrap: wrap; }
  .activity-main { flex-basis: 100%; }
  .activity-item > .el-button, .item-actions { margin-left: auto; }
}
</style>
