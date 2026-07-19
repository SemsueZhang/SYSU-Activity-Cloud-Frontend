<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import AuthLayout from '@/components/AuthLayout.vue'
import { requestPasswordReset, resetPassword } from '@/api/auth'

const email = ref(''); const code = ref(''); const password = ref(''); const confirmPassword = ref('')
const sent = ref(false); const submitting = ref(false)
async function sendCode() {
  if (!/^\S+@\S+\.\S+$/.test(email.value)) return ElMessage.warning('请输入有效邮箱')
  submitting.value = true
  try { const { data } = await requestPasswordReset(email.value); if (data.code) code.value = data.code; sent.value = true; ElMessage.success(data.message) } catch {} finally { submitting.value = false }
}
async function submit() {
  if (!code.value || password.value.length < 6) return ElMessage.warning('请输入验证码和至少 6 位的新密码')
  if (password.value !== confirmPassword.value) return ElMessage.warning('两次密码输入不一致')
  submitting.value = true
  try { await resetPassword({ email: email.value, verification_code: code.value, password: password.value }); ElMessage.success('密码已重置，请使用新密码登录'); sent.value = false; password.value = ''; confirmPassword.value = '' } catch {} finally { submitting.value = false }
}
</script>
<template><AuthLayout><div class="forgot"><h2>重置密码</h2><p>{{ sent ? '请输入邮箱验证码并设置新密码。' : '输入注册邮箱，我们会发送验证码。' }}</p><el-input v-model="email" size="large" placeholder="邮箱地址" :disabled="sent" @keyup.enter="sendCode"/><template v-if="sent"><el-input v-model="code" size="large" placeholder="6 位验证码" maxlength="6"/><el-input v-model="password" size="large" placeholder="至少 6 位的新密码" show-password/><el-input v-model="confirmPassword" size="large" placeholder="再次输入新密码" show-password @keyup.enter="submit"/><el-button type="primary" size="large" :loading="submitting" @click="submit">确认重置密码</el-button><el-button text @click="sent = false">更换邮箱</el-button></template><el-button v-else type="primary" size="large" :loading="submitting" @click="sendCode">获取重置验证码</el-button><router-link to="/auth/login">返回登录</router-link></div></AuthLayout></template><style scoped>.forgot{display:grid;gap:18px;text-align:center}.forgot h2{margin:0}.forgot p{color:#66736d}.forgot a{color:var(--brand)}</style>
