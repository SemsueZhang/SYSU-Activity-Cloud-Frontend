import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import type { Activity } from '@/api/activities'
import { listActivities } from '@/api/activities'
import { getCalendarEvents, type CalendarEvent } from '@/api/calendar'

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function useHomePage() {
  const auth = useAuthStore()
  const router = useRouter()

  const hotActivities = ref<Activity[]>([])
  const activityTypeList = ['讲座', '晚会', '竞赛', '论坛', '展览', '招聘', '体育', '其他']
  const loading = ref(true)
  const error = ref('')
  const scheduleError = ref('')
  const searchKeyword = ref('')

  const currentHotIndex = ref(0)
  let hotTimer: ReturnType<typeof setInterval> | null = null

  function stopHotCarousel() {
    if (hotTimer) {
      clearInterval(hotTimer)
      hotTimer = null
    }
  }

  function startHotCarousel() {
    stopHotCarousel()
    if (hotActivities.value.length < 2) return
    hotTimer = setInterval(() => {
      currentHotIndex.value = (currentHotIndex.value + 1) % hotActivities.value.length
    }, 4000)
  }

  function selectHotActivity(index: number) {
    currentHotIndex.value = index
    startHotCarousel()
  }

  // ---- 左侧导航 ----
  const activeNav = ref('hot')

  function selectNav(key: string) {
    activeNav.value = key
    if (key === 'all') { router.push('/activities'); return }
    if (key === 'my') {
      if (!auth.isLoggedIn) {
        router.push({ path: '/auth/login', query: { redirect: '/my/activities' } })
        return
      }
      router.push('/my/activities')
      return
    }
    if (key === 'created') {
      if (!auth.isLoggedIn) { router.push({ path: '/auth/login', query: { redirect: '/my/created/approved' } }); return }
      if (!auth.isPublisher) { ElMessage.warning('只有发布者和管理员可以管理创建的活动'); return }
      router.push('/my/created/approved')
      return
    }
    if (key === 'create') {
      if (!auth.isLoggedIn) { router.push({ path: '/auth/login', query: { redirect: '/activities/create' } }); return }
      if (!auth.isPublisher) { ElMessage.warning('只有发布者和管理员可以创建活动'); return }
      router.push('/activities/create')
      return
    }
    const el = document.getElementById(`section-${key}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ---- 日历 ----
  const today = new Date()
  const currentYear = ref(today.getFullYear())
  const currentMonth = ref(today.getMonth())
  const selectedDate = ref<Date>(new Date())
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const calendarDays = computed(() => {
    const year = currentYear.value
    const month = currentMonth.value
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = []

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, isCurrentMonth: false, isToday: false, isSelected: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      const now = new Date()
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === now.toDateString(),
        isSelected: selectedDate.value?.toDateString() === d.toDateString(),
      })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, isToday: false, isSelected: false })
    }
    return days
  })

  function prevMonth() {
    if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value-- }
    else { currentMonth.value-- }
  }

  function nextMonth() {
    if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++ }
    else { currentMonth.value++ }
  }

  function selectDate(date: Date) {
    selectedDate.value = date
  }

  const scheduleItems = ref<CalendarEvent[]>([])
  const selectedScheduleItems = computed(() => scheduleItems.value.filter((item) => (item.date || item.event_time?.slice(0, 10)) === localDateKey(selectedDate.value)))

  async function fetchSchedule() {
    scheduleError.value = ''
    try {
      if (!auth.isLoggedIn) {
        scheduleItems.value = []
        return
      }
      const month = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`
      const res = await getCalendarEvents(month)
      scheduleItems.value = res.data?.events || []
    } catch (caught: any) {
      scheduleError.value = caught?.response?.data?.message || '日程加载失败'
    }
  }

  const selectedCategoryId = ref<string | null>('recent')
  const categoryActivities = ref<Activity[]>([])
  const categoryLoading = ref(false)

  async function fetchCategoryActivities() {
    if (selectedCategoryId.value === 'recent' || !selectedCategoryId.value) {
      categoryActivities.value = hotActivities.value
      return
    }
    categoryLoading.value = true
    try {
      const { data } = await listActivities({ status: 'published', activity_type: selectedCategoryId.value, per_page: 6 })
      categoryActivities.value = [...(data.items || [])].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    } catch {
      categoryActivities.value = []
      ElMessage.error('该类别活动加载失败')
    } finally {
      categoryLoading.value = false
    }
  }

  function selectCategory(category: string | null) {
    selectedCategoryId.value = category
    void fetchCategoryActivities()
  }

  // ---- 数据获取 ----
  async function fetchData() {
    loading.value = true
    error.value = ''
    try {
      const hotRes = await listActivities({ status: 'published', per_page: 6 })
      hotActivities.value = (hotRes.data?.items || []).sort(
        (a: Activity, b: Activity) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      if (selectedCategoryId.value === 'recent') categoryActivities.value = hotActivities.value
    } catch (caught: any) { error.value = caught?.response?.data?.message || '活动数据加载失败' }
    finally { loading.value = false }
  }

  // ---- 工具 ----
  function formatTime(iso: string | null) {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string | null) {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function goActivityDetail(id: number) {
    router.push(`/activity/${id}`)
  }

  function handleSearch() {
    const q = searchKeyword.value.trim()
    router.push({ path: '/search', query: q ? { q } : {} })
  }

  function handleLogout() { auth.logout(); router.push('/') }

  const currentYearLabel = new Date().getFullYear()

  watch(hotActivities, (activities) => {
    currentHotIndex.value = 0
    if (activities.length > 1) startHotCarousel()
    else stopHotCarousel()
  })
  watch([currentYear, currentMonth], fetchSchedule)
  onMounted(() => {
    fetchData()
    fetchSchedule()
  })
  onUnmounted(stopHotCarousel)
  return {
    auth, router,
    hotActivities, activityTypeList, loading, error, scheduleError, searchKeyword,
    currentHotIndex, selectHotActivity,
    activeNav, selectNav,
    currentYear, currentMonth, selectedDate, weekDays,
    calendarDays, prevMonth, nextMonth, selectDate, selectedScheduleItems,
    selectedCategoryId, categoryActivities, categoryLoading, fetchCategoryActivities, selectCategory,
    fetchData, fetchSchedule, formatTime, formatDate, goActivityDetail, handleSearch, handleLogout, currentYearLabel,
  }
}
