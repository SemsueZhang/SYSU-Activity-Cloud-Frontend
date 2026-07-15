<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { getReviewActivities, reviewActivity } from '@/api/admin'
import type { Activity } from '@/api/activities'
const loading=ref(false);const error=ref('');const activities=ref<Activity[]>([]);const selected=ref<Activity[]>([])
async function load(){loading.value=true;error.value='';try{activities.value=(await getReviewActivities()).data.items}catch(e:any){error.value=e?.response?.data?.message||'审核队列加载失败'}finally{loading.value=false}}
async function review(id:number,action:'approve'|'reject'){try{const reason=action==='reject'?await ElMessageBox.prompt('请输入驳回理由','驳回活动',{inputPattern:/.+/,inputErrorMessage:'驳回理由不能为空'}):null;await reviewActivity(id,action,reason?.value||'');ElMessage.success(action==='approve'?'已批准':'已驳回');load()}catch{}}
async function approveSelected(){if(!selected.value.length)return;try{await ElMessageBox.confirm(`确认批准 ${selected.value.length} 条活动？`,'批量审核',{type:'warning'});const results=await Promise.allSettled(selected.value.map(x=>reviewActivity(x.id,'approve')));const failed=results.filter(x=>x.status==='rejected').length;ElMessage[failed?'warning':'success'](failed?`${selected.value.length-failed} 条已批准，${failed} 条失败`:'已完成批量批准');load()}catch{}}
onMounted(load)
</script>
<template><AppShell title="审核队列"><template #heading><el-button type="primary" :disabled="!selected.length" @click="approveSelected">批准选中（{{selected.length}}）</el-button></template><PageState :loading="loading" :error="error" :empty="!loading&&!error&&!activities.length" empty-text="暂无待审核活动" @retry="load"><section class="surface-card table-wrap"><el-table :data="activities" @selection-change="selected=$event"><el-table-column type="selection" width="48"/><el-table-column prop="title" label="活动" min-width="210"/><el-table-column prop="activity_type" label="分类" width="100"/><el-table-column prop="organizer" label="主办方" min-width="130"/><el-table-column label="操作" width="170"><template #default="{row}"><el-button text type="success" @click="review(row.id,'approve')">批准</el-button><el-button text type="danger" @click="review(row.id,'reject')">驳回</el-button></template></el-table-column></el-table></section></PageState></AppShell></template><style scoped>.table-wrap{overflow:auto}</style>
