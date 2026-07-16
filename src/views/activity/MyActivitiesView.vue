<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { listRegisteredActivities, unregisterFromActivity, type Activity } from '@/api/activities'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const activities = ref<Activity[]>([])
const cancellingId = ref<number | null>(null)

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
    const { data } = await listRegisteredActivities({ page: 1, per_page: 100 })
    activities.value = data.items
  } catch (reason) {
    error.value = (reason as { response?: { data?: { message?: string } } })?.response?.data?.message || '已报名活动加载失败'
  } finally {
    loading.value = false
  }
}

async function cancelRegistration(activity: Activity) {
  try {
    await ElMessageBox.confirm(`确认取消报名“${activity.title}”？取消后会同时从日历中移除。`, '取消报名', {
      type: 'warning',
      confirmButtonText: '确认取消',
      cancelButtonText: '保留报名',
    })
    cancellingId.value = activity.id
    await unregisterFromActivity(activity.id)
    activities.value = activities.value.filter((item) => item.id !== activity.id)
    ElMessage.success('已取消报名并从日历移除')
  } catch { /* request interceptor handles errors; closing the confirmation needs no message */ }
  finally { cancellingId.value = null }
}

onMounted(load)
</script>

<template>
  <AppShell title="我报名的活动">
    <template #heading>
      <el-button v-if="auth.isPublisher" @click="router.push('/my/created/approved')">我创建的活动</el-button>
    </template>

    <PageState :loading="loading" :error="error" @retry="load">
      <section class="surface-card activity-page" aria-labelledby="registered-heading">
        <div class="page-intro">
          <div>
            <h2 id="registered-heading">报名记录</h2>
            <p>报名成功后会自动加入日历，取消报名后会同步移除。</p>
          </div>
          <el-tag type="success" round>{{ activities.length }} 场</el-tag>
        </div>
        <el-empty v-if="!sortedActivities.length" description="还没有报名活动">
          <el-button type="primary" @click="router.push('/activities')">浏览活动</el-button>
        </el-empty>
        <div v-else class="activity-list">
          <article v-for="activity in sortedActivities" :key="activity.id" class="activity-item" :class="isEnded(activity) ? 'ended' : 'active'">
            <button type="button" class="activity-main" :aria-label="`查看活动：${activity.title}`" @click="router.push(`/activity/${activity.id}`)">
              <div class="activity-title-line">
                <h3>{{ activity.title }}</h3>
                <el-tag :type="isEnded(activity) ? 'info' : 'success'" size="small">{{ isEnded(activity) ? '已结束' : '进行中' }}</el-tag>
              </div>
              <time>{{ formatDateTime(activity.event_time) }}</time>
              <p>{{ activity.location || '地点待定' }}<span v-if="activity.organizer"> · {{ activity.organizer }}</span></p>
            </button>
            <el-button type="danger" plain :loading="cancellingId === activity.id" @click="cancelRegistration(activity)">取消报名</el-button>
          </article>
        </div>
      </section>
    </PageState>
  </AppShell>
</template>

<style scoped>
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
@media (max-width: 700px) {
  .activity-page { padding: 17px; }
  .page-intro { align-items: center; }
  .page-intro p { font-size: 13px; }
  .activity-item { align-items: flex-start; flex-wrap: wrap; }
  .activity-main { flex-basis: 100%; }
  .activity-item > .el-button { margin-left: auto; }
}
</style>
