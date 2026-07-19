<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { exportActivities, getAuditLogs, type AuditLog } from '@/api/admin'
import { ElMessage } from 'element-plus'
const loading=ref(false);const error=ref('');const logs=ref<AuditLog[]>([]);const action=ref('');const page=ref(1);const total=ref(0);const pageSize=20
async function load(reset=false){if(reset)page.value=1;loading.value=true;error.value='';try{const {data}=await getAuditLogs({...(action.value?{action:action.value}:{}),page:page.value,per_page:pageSize});logs.value=data.items;total.value=data.total}catch(e:any){error.value=e?.response?.data?.message||'审计日志加载失败'}finally{loading.value=false}}
async function download(){try{const response=await exportActivities();const url=URL.createObjectURL(response.data);const link=document.createElement('a');link.href=url;link.download='activities.json';link.click();URL.revokeObjectURL(url);ElMessage.success('导出已开始')}catch{}}
onMounted(load)
</script>
<template><AppShell title="审计日志"><template #heading><el-button type="primary" @click="download">导出活动</el-button></template><section class="toolbar surface-card"><el-select v-model="action" clearable placeholder="全部操作" @change="load(true)"><el-option label="批准" value="approve"/><el-option label="驳回" value="reject"/><el-option label="抓取" value="crawl"/></el-select></section><PageState :loading="loading" :error="error" :empty="!loading&&!error&&!logs.length" empty-text="暂无审计记录" @retry="load"><section class="surface-card table-wrap"><el-table :data="logs"><el-table-column prop="created_at" label="时间" min-width="170"/><el-table-column prop="actor" label="操作人" width="120"/><el-table-column prop="action" label="操作" width="120"/><el-table-column prop="target" label="目标" min-width="160"/><el-table-column prop="summary" label="摘要" min-width="220"/></el-table><div v-if="total>pageSize" class="pagination"><el-pagination v-model:current-page="page" :total="total" :page-size="pageSize" layout="prev, pager, next, jumper" @current-change="load"/></div></section></PageState></AppShell></template><style scoped>.toolbar{padding:14px;margin-bottom:16px}.table-wrap{overflow:auto}.pagination{display:flex;justify-content:center;padding:16px}</style>
