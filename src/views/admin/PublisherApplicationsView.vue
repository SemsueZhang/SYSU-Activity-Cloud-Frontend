<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { getPublisherApplications, reviewPublisherApplication, type PublisherApplication } from '@/api/admin'

const loading = ref(false)
const error = ref('')
const applications = ref<PublisherApplication[]>([])
const page = ref(1); const total = ref(0); const pageSize = 20

async function load() {
  loading.value = true; error.value = ''
  try { const { data } = await getPublisherApplications({ page: page.value, per_page: pageSize }); applications.value = data.items; total.value = data.total }
  catch (caught: any) { error.value = caught?.response?.data?.message || '申请列表加载失败' }
  finally { loading.value = false }
}

async function review(application: PublisherApplication, action: 'approve' | 'reject') {
  try {
    const prompt = action === 'reject' ? await ElMessageBox.prompt('请输入驳回原因', '驳回申请', { inputPattern: /.+/, inputErrorMessage: '驳回原因不能为空' }) : null
    await reviewPublisherApplication(application.id, action, prompt?.value || '')
    ElMessage.success(action === 'approve' ? '已批准活动发起人申请' : '已驳回申请')
    load()
  } catch {}
}

onMounted(load)
</script>

<template>
  <AppShell title="活动发起人申请">
    <PageState :loading="loading" :error="error" :empty="!loading && !error && !applications.length" empty-text="暂无待审核申请" @retry="load">
      <section class="surface-card table-wrap"><el-table :data="applications"><el-table-column prop="username" label="用户" min-width="150" /><el-table-column prop="email" label="邮箱" min-width="210" /><el-table-column prop="reason" label="申请说明" min-width="240" /><el-table-column prop="created_at" label="提交时间" min-width="180" /><el-table-column label="操作" width="180"><template #default="{ row }"><el-button text type="success" @click="review(row, 'approve')">批准</el-button><el-button text type="danger" @click="review(row, 'reject')">驳回</el-button></template></el-table-column></el-table><div v-if="total>pageSize" class="pagination"><el-pagination v-model:current-page="page" :total="total" :page-size="pageSize" layout="prev, pager, next, jumper" @current-change="load"/></div></section>
    </PageState>
  </AppShell>
</template>

<style scoped>.table-wrap{overflow:auto}.pagination{display:flex;justify-content:center;padding:16px}</style>
