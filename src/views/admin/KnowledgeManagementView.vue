<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import PageState from '@/components/PageState.vue'
import { createDictEntry, deleteDictEntry, listDictEntries, type DictCategory, type DictEntry } from '@/api/dicts'
import { listKnowledgeNodes, type KnowledgeNode } from '@/api/knowledge'

const category = ref<DictCategory>('place')
const entries = ref<DictEntry[]>([])
const nodes = ref<KnowledgeNode[]>([])
const loading = ref(false)
const error = ref('')
const dialog = ref(false)
const form = reactive({ standard_name: '', aliases: '', description: '' })

async function load() {
  loading.value = true; error.value = ''
  try {
    const [dict, graph] = await Promise.all([listDictEntries(category.value, { per_page: 100 }), listKnowledgeNodes()])
    entries.value = dict.data.items; nodes.value = graph.data.items
  } catch (caught: any) { error.value = caught?.response?.data?.message || '词表和知识节点加载失败' } finally { loading.value = false }
}
async function save() { if (!form.standard_name.trim()) return ElMessage.warning('请输入标准名称'); try { await createDictEntry(category.value, form); dialog.value = false; Object.assign(form, { standard_name: '', aliases: '', description: '' }); await load(); ElMessage.success('词条已添加') } catch {} }
async function remove(entry: DictEntry) { try { await ElMessageBox.confirm(`删除“${entry.standard_name}”吗？`, '删除词条', { type: 'warning' }); await deleteDictEntry(category.value, entry.id); await load(); ElMessage.success('词条已删除') } catch {} }
watch(category, load); onMounted(load)
</script>

<template>
  <AppShell title="词表与知识节点">
    <template #heading><el-button type="primary" @click="dialog = true">新增词条</el-button></template>
    <PageState :loading="loading" :error="error" @retry="load">
      <el-tabs v-model="category"><el-tab-pane label="地点词表" name="place"/><el-tab-pane label="组织词表" name="org"/><el-tab-pane label="主题词表" name="topic"/></el-tabs>
      <section class="surface-card table-wrap"><el-table :data="entries"><el-table-column prop="standard_name" label="标准名称"/><el-table-column prop="aliases" label="别名"/><el-table-column prop="description" label="说明"/><el-table-column label="操作" width="90"><template #default="{ row }"><el-button text type="danger" @click="remove(row)">删除</el-button></template></el-table-column></el-table></section>
      <section class="surface-card nodes"><h2>已识别知识节点</h2><el-empty v-if="!nodes.length" description="暂无知识节点"/><el-tag v-for="node in nodes" v-else :key="node.id" class="node" effect="plain">{{ node.node_type }} · {{ node.name }}</el-tag></section>
    </PageState>
    <el-dialog v-model="dialog" title="新增词表项" width="min(92vw, 520px)"><el-form label-position="top"><el-form-item label="标准名称"><el-input v-model="form.standard_name"/></el-form-item><el-form-item label="别名（逗号分隔）"><el-input v-model="form.aliases"/></el-form-item><el-form-item label="说明"><el-input v-model="form.description" type="textarea"/></el-form-item></el-form><template #footer><el-button @click="dialog = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template></el-dialog>
  </AppShell>
</template>

<style scoped>.table-wrap,.nodes{padding:20px;margin-top:16px}.nodes h2{margin:0 0 14px;color:var(--brand-dark);font-size:18px}.node{margin:0 8px 8px 0}.table-wrap{overflow:auto}</style>
