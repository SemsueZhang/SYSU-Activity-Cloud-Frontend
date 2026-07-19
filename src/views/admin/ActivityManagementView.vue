<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { getManagedActivities } from '@/api/admin'
import { deleteActivity, type Activity } from '@/api/activities'

const router=useRouter(); const loading=ref(false); const error=ref(''); const activities=ref<Activity[]>([]); const page=ref(1); const total=ref(0); const status=ref(''); const pageSize=20
async function load(reset=false){if(reset)page.value=1;loading.value=true;error.value='';try{const {data}=await getManagedActivities({page:page.value,per_page:pageSize,...(status.value?{status:status.value}:{})});activities.value=data.items;total.value=data.total}catch(e:any){error.value=e?.response?.data?.message||'活动管理加载失败'}finally{loading.value=false}}
async function remove(row:Activity){try{await ElMessageBox.confirm(`确定删除“${row.title}”吗？该操作不可恢复。`,'删除活动',{type:'warning'});await deleteActivity(row.id);ElMessage.success('活动已删除');load()}catch{}}
onMounted(load)
</script>
<template><AppShell title="活动管理"><section class="toolbar surface-card"><el-select v-model="status" clearable placeholder="全部状态" @change="load(true)"><el-option label="草稿" value="draft"/><el-option label="审核中" value="pending_review"/><el-option label="已发布" value="published"/><el-option label="已驳回" value="rejected"/></el-select></section><PageState :loading="loading" :error="error" :empty="!loading&&!error&&!activities.length" empty-text="暂无活动" @retry="load"><section class="surface-card table-wrap"><el-table :data="activities"><el-table-column prop="title" label="活动" min-width="230"/><el-table-column prop="status" label="状态" width="120"/><el-table-column prop="organizer" label="主办方" min-width="150"/><el-table-column prop="created_at" label="创建时间" min-width="180"/><el-table-column label="操作" width="170"><template #default="{row}"><el-button text type="primary" @click="router.push(`/activities/${row.id}/edit`)">编辑</el-button><el-button text type="danger" @click="remove(row)">删除</el-button></template></el-table-column></el-table><div v-if="total>pageSize" class="pagination"><el-pagination v-model:current-page="page" :total="total" :page-size="pageSize" layout="prev, pager, next, jumper" @current-change="load"/></div></section></PageState></AppShell></template>
<style scoped>.toolbar{padding:14px;margin-bottom:16px}.table-wrap{overflow:auto}.pagination{display:flex;justify-content:center;padding:16px}</style>
