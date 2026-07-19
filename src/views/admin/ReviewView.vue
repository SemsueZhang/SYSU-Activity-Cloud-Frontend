<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { getReviewActivities, reviewActivity } from '@/api/admin'
import { deleteActivity } from '@/api/activities'
import type { Activity } from '@/api/activities'

const loading = ref(false)
const error = ref('')
const activities = ref<Activity[]>([])
const selected = ref<Activity[]>([])
const detail = ref<Activity | null>(null)
const page = ref(1); const total = ref(0); const router = useRouter(); const pageSize = 20

async function load() {
  loading.value = true; error.value = ''
  try { const { data } = await getReviewActivities({ page: page.value, per_page: pageSize }); activities.value = data.items; total.value = data.total }
  catch (caught: any) { error.value = caught?.response?.data?.message || '审核队列加载失败' }
  finally { loading.value = false }
}
async function remove(row: Activity) { try { await ElMessageBox.confirm(`确定删除“${row.title}”吗？`, '删除活动', { type: 'warning' }); await deleteActivity(row.id); ElMessage.success('活动已删除'); load() } catch {} }
async function review(id: number, action: 'approve' | 'reject') {
  try {
    const reason = action === 'reject' ? await ElMessageBox.prompt('请输入驳回理由', '驳回活动', { inputPattern: /.+/, inputErrorMessage: '驳回理由不能为空' }) : null
    await reviewActivity(id, action, reason?.value || '')
    ElMessage.success(action === 'approve' ? '已批准' : '已驳回')
    detail.value = null; load()
  } catch {}
}
async function approveSelected() {
  if (!selected.value.length) return
  try {
    await ElMessageBox.confirm(`确认批准 ${selected.value.length} 条活动？`, '批量审核', { type: 'warning' })
    const results = await Promise.allSettled(selected.value.map(item => reviewActivity(item.id, 'approve')))
    const failed = results.filter(item => item.status === 'rejected').length
    ElMessage[failed ? 'warning' : 'success'](failed ? `${selected.value.length - failed} 条已批准，${failed} 条失败` : '已完成批量批准')
    load()
  } catch {}
}
onMounted(load)
</script>

<template>
  <AppShell title="审核队列">
    <template #heading><el-button type="primary" :disabled="!selected.length" @click="approveSelected">批准选中（{{ selected.length }}）</el-button></template>
    <PageState :loading="loading" :error="error" :empty="!loading && !error && !activities.length" empty-text="暂无待审核活动" @retry="load">
      <section class="surface-card table-wrap"><el-table :data="activities" @selection-change="selected = $event"><el-table-column type="selection" width="48" /><el-table-column prop="title" label="活动" min-width="210" /><el-table-column prop="activity_type" label="分类" width="100" /><el-table-column prop="organizer" label="主办方" min-width="130" /><el-table-column label="操作" width="310"><template #default="{ row }"><el-button text type="primary" @click="detail = row">详情</el-button><el-button text type="primary" @click="router.push(`/activities/${row.id}/edit`)">编辑</el-button><el-button text type="danger" @click="remove(row)">删除</el-button><el-button text type="success" @click="review(row.id, 'approve')">批准</el-button><el-button text type="danger" @click="review(row.id, 'reject')">驳回</el-button></template></el-table-column></el-table><div v-if="total>pageSize" class="pagination"><el-pagination v-model:current-page="page" :total="total" :page-size="pageSize" layout="prev, pager, next, jumper" @current-change="load"/></div></section>
    </PageState>
    <el-dialog v-model="detail" title="活动审核详情" width="min(92vw, 720px)"><template v-if="detail"><h2>{{ detail.title }}</h2><el-descriptions :column="1" border><el-descriptions-item label="时间">{{ detail.event_time || '待定' }}</el-descriptions-item><el-descriptions-item label="地点">{{ detail.location || '待定' }}</el-descriptions-item><el-descriptions-item label="主办方">{{ detail.organizer || '待定' }}</el-descriptions-item><el-descriptions-item label="分类">{{ detail.activity_type || '未分类' }}</el-descriptions-item><el-descriptions-item label="来源">{{ detail.source_url || '手动创建' }}</el-descriptions-item></el-descriptions><h3>摘要</h3><p class="summary">{{ detail.summary }}</p><h3>原始内容</h3><pre class="raw-text">{{ detail.raw_text }}</pre></template></el-dialog>
  </AppShell>
</template>

<style scoped>.table-wrap{overflow:auto}.pagination{display:flex;justify-content:center;padding:16px}.summary{line-height:1.7}.raw-text{white-space:pre-wrap;word-break:break-word;line-height:1.7;background:var(--surface-muted);padding:14px;border-radius:8px}</style>
