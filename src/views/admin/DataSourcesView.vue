<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { createDataSource, getDataSourceLogs, getDataSources, runDataSource, toggleDataSource, updateDataSource, type CrawlLog, type DataSource } from '@/api/admin'

const loading = ref(false)
const error = ref('')
const sources = ref<DataSource[]>([])
const dialog = ref(false)
const logsVisible = ref(false)
const logs = ref<CrawlLog[]>([])
const logSourceName = ref('')
const editingId = ref<number | null>(null)
const form = reactive({ name: '', url: '', enabled: true })

async function load() {
  loading.value = true
  error.value = ''
  try { sources.value = (await getDataSources()).data.items }
  catch (e: any) { error.value = e?.response?.data?.message || '数据源加载失败' }
  finally { loading.value = false }
}
async function toggle(source: DataSource) { try { await ElMessageBox.confirm(`确认${source.enabled ? '停用' : '启用'}“${source.name}”吗？`, '变更数据源状态', { type: 'warning' }); await toggleDataSource(source.id, !source.enabled); source.enabled = !source.enabled; ElMessage.success('状态已更新') } catch {} }
async function run(source: DataSource) { try { await ElMessageBox.confirm(`确认立即抓取“${source.name}”吗？`, '启动抓取任务', { type: 'warning' }); const { data }: any = await runDataSource(source.id, true); source.last_status = data.message || '抓取完成'; ElMessage.success(data.message || '抓取完成') } catch {} }
async function showLogs(source: DataSource) { try { logs.value = (await getDataSourceLogs(source.id)).data.items; logSourceName.value = source.name; logsVisible.value = true } catch {} }
function logType(log: CrawlLog) { return ['success', 'completed'].includes(log.status) ? 'success' : log.status === 'running' ? 'warning' : 'danger' }
function logTitle(log: CrawlLog) { return ['success', 'completed'].includes(log.status) ? '抓取完成' : log.status === 'running' ? '抓取中' : '抓取失败' }
function logMessage(log: CrawlLog) { return log.message || (log.status === 'running' ? '正在抓取页面，请稍后刷新日志。' : '抓取结束，但服务未返回额外说明') }
function open(source?: DataSource) { editingId.value = source?.id || null; Object.assign(form, source ? { name: source.name, url: source.url, enabled: source.enabled } : { name: '', url: '', enabled: true }); dialog.value = true }
async function save() { try { if (editingId.value) await updateDataSource(editingId.value, form); else await createDataSource(form); dialog.value = false; ElMessage.success('数据源已保存'); load() } catch {} }
onMounted(load)
</script>

<template>
  <AppShell title="数据源管理">
    <template #heading><el-button type="primary" @click="open()">新建数据源</el-button></template>
    <PageState :loading="loading" :error="error" :empty="!loading && !error && !sources.length" empty-text="暂无数据源" @retry="load">
      <section class="surface-card table-wrap">
        <el-table :data="sources">
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="url" label="地址" min-width="260" />
          <el-table-column label="启用" width="100"><template #default="{ row }"><el-switch :model-value="row.enabled" @change="toggle(row)" /></template></el-table-column>
          <el-table-column prop="last_status" label="最近状态" min-width="150" />
          <el-table-column label="操作" width="220"><template #default="{ row }"><el-button text type="primary" @click="open(row)">编辑</el-button><el-button text type="primary" @click="run(row)">立即抓取</el-button><el-button text type="primary" @click="showLogs(row)">日志</el-button></template></el-table-column>
        </el-table>
      </section>
    </PageState>
    <el-dialog v-model="dialog" :title="editingId ? '编辑数据源' : '新建数据源'" width="min(92vw, 520px)">
      <el-form label-position="top"><el-form-item label="名称"><el-input v-model="form.name" /></el-form-item><el-form-item label="地址"><el-input v-model="form.url" /></el-form-item><el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item></el-form>
      <template #footer><el-button @click="dialog = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
    <el-drawer v-model="logsVisible" :title="`${logSourceName} · 抓取日志`" size="min(92vw, 560px)"><el-empty v-if="!logs.length" description="暂无抓取记录" /><el-timeline v-else><el-timeline-item v-for="log in logs" :key="log.id" :timestamp="log.finished_at || log.started_at" :type="logType(log)"><strong>{{ logTitle(log) }}</strong><p>{{ logMessage(log) }}</p><small>页面 {{ log.pages_succeeded }}/{{ log.pages_found }}；新建活动 {{ log.drafts_created }}；跳过重复 {{ log.duplicates_skipped }}</small></el-timeline-item></el-timeline></el-drawer>
  </AppShell>
</template>

<style scoped>.table-wrap { overflow: auto; }</style>
