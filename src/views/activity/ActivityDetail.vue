<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import ActivityHeader from '@/components/activity/ActivityHeader.vue'
import ActivityMeta from '@/components/activity/ActivityMeta.vue'
import ActivityBody from '@/components/activity/ActivityBody.vue'
import { deleteActivity, downloadActivityRegistrations, getActivityById, registerForActivity, setActivityFavorite, unregisterFromActivity, type ActivityDetail as ActivityDetailType, type RegistrationForm } from '@/api/activities'
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
const registrationFormVisible = ref(false)
const registrationForm = reactive<RegistrationForm>({ name: '', student_id: '', college: '', email: '' })
let requestVersion = 0

const activityId = computed(() => Number(route.params.id))
const canViewRegistrationList = computed(() => Boolean(detail.value && auth.user && (auth.isAdmin || detail.value.created_by === auth.user.id)))
const canManageActivity = computed(() => Boolean(detail.value && auth.user && (auth.isAdmin || detail.value.created_by === auth.user.id)))

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
      registrationForm.name ||= auth.user?.display_name || auth.user?.username || ''
      registrationForm.email ||= auth.user?.email || ''
      registrationFormVisible.value = true
    }
  } catch { /* interceptor handles request errors and confirmation cancellation */ } finally { registering.value = false }
}
async function submitRegistration() {
  if (!detail.value) return
  registrationForm.name = registrationForm.name.trim()
  registrationForm.student_id = registrationForm.student_id.trim()
  registrationForm.college = registrationForm.college.trim()
  registrationForm.email = registrationForm.email.trim()
  if (!registrationForm.name || !registrationForm.student_id || !registrationForm.college || !registrationForm.email) {
    ElMessage.warning('请完整填写姓名、学号、学院和联系邮箱')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationForm.email)) {
    ElMessage.warning('请输入有效的联系邮箱')
    return
  }
  registering.value = true
  try {
    const { data } = await registerForActivity(detail.value.id, registrationForm)
    detail.value.meta = { ...(detail.value.meta || { views: 0, registrations: 0 }), registrations: data.registrations }
    registered.value = true
    registrationFormVisible.value = false
    ElMessage.success(data.already_registered ? '你已报名该活动，日历已同步' : '报名成功，已加入日历')
  } catch { /* interceptor provides the server error */ } finally { registering.value = false }
}
async function toggleFavorite() {
  if (!detail.value) return
  if (!auth.isLoggedIn) { router.push({ path: '/auth/login', query: { redirect: route.fullPath } }); return }
  try { const { data } = await setActivityFavorite(detail.value.id, !favorite.value); favorite.value = data.favorite; ElMessage.success(favorite.value ? '已收藏' : '已取消收藏') } catch { /* interceptor handles request errors */ }
}
async function downloadRegistrationCsv() {
  if (!detail.value) return
  try {
    const { data } = await downloadActivityRegistrations(detail.value.id)
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-${detail.value.id}-registrations.csv`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('报名表 CSV 已下载')
  } catch { /* interceptor provides the server error */ }
}
async function removeActivity() {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(`确定删除“${detail.value.title}”吗？该操作不可恢复。`, '删除活动', { type: 'warning', confirmButtonText: '删除' })
    await deleteActivity(detail.value.id)
    ElMessage.success('活动已删除')
    router.replace('/activities')
  } catch { /* cancelled or handled by interceptor */ }
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
            <button v-for="item in context.related" :key="item.id" type="button" @click="router.push(`/activity/${item.id}`)"><strong>{{ item.title }}</strong><p>{{ item.summary || '查看活动详情与报名信息' }}</p><time v-if="item.event_time">{{ formatDateTime(item.event_time) }}</time><span>{{ item.reason || '关联推荐' }}</span></button>
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
            <el-button v-if="canManageActivity" @click="router.push(`/activities/${detail.id}/edit`)">编辑</el-button>
            <el-button v-if="canManageActivity" type="danger" plain @click="removeActivity">删除</el-button>
            <el-button v-if="canViewRegistrationList" plain @click="downloadRegistrationCsv">导出报名表 CSV（{{ detail.meta?.registrations ?? 0 }}）</el-button>
          </div>
        </section>
        <el-dialog v-model="registrationFormVisible" title="填写报名信息" width="min(520px, 94vw)" :close-on-click-modal="false">
          <p class="registration-form-tip">请填写真实信息，活动创建者将据此确认参与资格。</p>
          <el-form label-position="top">
            <el-form-item label="姓名" required><el-input v-model="registrationForm.name" maxlength="50" placeholder="请输入姓名" /></el-form-item>
            <el-form-item label="学号" required><el-input v-model="registrationForm.student_id" maxlength="30" placeholder="请输入学号" /></el-form-item>
            <el-form-item label="学院" required><el-input v-model="registrationForm.college" maxlength="80" placeholder="请输入学院名称" /></el-form-item>
            <el-form-item label="联系邮箱" required><el-input v-model="registrationForm.email" maxlength="120" placeholder="请输入常用邮箱" /></el-form-item>
          </el-form>
          <template #footer>
            <el-button :disabled="registering" @click="registrationFormVisible = false">取消</el-button>
            <el-button type="primary" :loading="registering" @click="submitRegistration">提交报名</el-button>
          </template>
        </el-dialog>
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
.context-card { display:flex;gap:20px;justify-content:space-between;align-items:center }.context-card h2,.related-card h2{margin:0 0 7px;color:#133b2a;font-size:18px}.context-card p{margin:0;color:#5f6b66}.context-card a{color:var(--brand);font-weight:600}.node-list{display:flex;flex-wrap:wrap;gap:8px}.related-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.related-list button{border:1px solid #e5eee8;background:#f8fbf9;border-radius:12px;padding:13px;text-align:left;cursor:pointer;color:#133b2a}.related-list button:hover{background:var(--brand-soft)}.related-list p{margin:7px 0 0;color:#5f6b66;font-size:13px;line-height:1.55}.related-list time{display:block;margin-top:8px;color:#39755a;font-size:12px}.related-list span{display:block;margin-top:6px;color:#6b7671;font-size:13px}

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

.registration-form-tip { margin: 0 0 16px; color: var(--text-muted); }

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
