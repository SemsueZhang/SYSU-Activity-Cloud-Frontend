<script setup lang="ts">
import { TrendCharts, Collection, Clock, Calendar, Location, User, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useHomePage } from '@/composables/useHomePage'
import NavHeader from '@/components/NavHeader.vue'
import NavSidebar from '@/components/NavSidebar.vue'
import HomeCalendarCard from '@/components/HomeCalendarCard.vue'
import FooterBar from '@/components/FooterBar.vue'

const {
  auth, router,
  hotActivities, activityTypeList, loading, error, scheduleError, searchKeyword,
  currentHotIndex, selectHotActivity,
  activeNav, selectNav,
  currentYear, currentMonth, selectedDate, weekDays,
  calendarDays, prevMonth, nextMonth, selectDate, selectedScheduleItems,
  selectedCategoryId, categoryActivities, categoryLoading, selectCategory,
  fetchData, fetchSchedule, formatTime, goActivityDetail, handleSearch, handleLogout, currentYearLabel
} = useHomePage()
</script>

<template>
  <div class="home-page">
    <NavHeader
      :search-keyword="searchKeyword"
      :is-logged-in="auth.isLoggedIn"
      :username="auth.user?.username ?? null"
      @update:search-keyword="searchKeyword = $event"
      @search="handleSearch"
      @login="router.push('/auth/login')"
      @register="router.push('/auth/register')"
      @profile="router.push('/profile')"
      @logout="handleLogout"
      @go-home="router.push('/')"
    />

    <div class="home-body">
      <NavSidebar
        :active-nav="activeNav"
        :activity-type-list="activityTypeList"
        :selected-category-id="selectedCategoryId"
        :is-publisher="auth.isPublisher"
        @select-nav="selectNav"
        @select-category="selectCategory"
      />

      <main class="home-main">
        <div id="section-hot" class="hot-section" v-if="!loading && !error">
          <div class="section-header">
            <h2 class="section-title">
              <el-icon class="section-title-icon"><TrendCharts /></el-icon>
              热门活动
            </h2>
            <el-button text class="section-more" @click="router.push('/activities')">
              查看全部 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
          <template v-if="hotActivities.length > 0">
          <article class="hot-carousel" tabindex="0" role="link" :aria-label="`查看热门活动：${hotActivities[currentHotIndex].title}`" @click="goActivityDetail(hotActivities[currentHotIndex].id)" @keyup.enter="goActivityDetail(hotActivities[currentHotIndex].id)" @keydown.space.prevent="goActivityDetail(hotActivities[currentHotIndex].id)">
            <div class="hc-card">
              <div class="hc-badge">
                <el-tag
                  :type="hotActivities[currentHotIndex].activity_type ? 'success' : 'info'"
                  size="small" effect="plain" round
                >
                  {{ hotActivities[currentHotIndex].activity_type || '活动' }}
                </el-tag>
              </div>
              <h3 class="hc-title">{{ hotActivities[currentHotIndex].title }}</h3>
              <p class="hc-summary">
                {{ hotActivities[currentHotIndex].summary || hotActivities[currentHotIndex].raw_text?.substring(0, 80) || '暂无简介' }}
              </p>
              <div class="hc-meta">
                <span><el-icon size="14"><User /></el-icon> {{ hotActivities[currentHotIndex].organizer || '未知' }}</span>
                <span><el-icon size="14"><Clock /></el-icon> {{ formatTime(hotActivities[currentHotIndex].event_time) }}</span>
                <span><el-icon size="14"><Location /></el-icon> {{ hotActivities[currentHotIndex].location || '待定' }}</span>
              </div>
            </div>
          </article>
          <div v-if="hotActivities.length > 1" class="hc-dots" aria-label="热门活动切换">
            <button v-for="(_, index) in hotActivities" :key="index" type="button" class="hc-dot" :class="{ active: index === currentHotIndex }" :aria-label="`显示第 ${index + 1} 条热门活动`" :aria-current="index === currentHotIndex ? 'true' : undefined" @click="selectHotActivity(index)"></button>
          </div>
          </template>
          <div v-else class="hot-empty">
            <el-empty :image-size="80" description="暂无活动" />
          </div>
        </div>

        <section v-if="!loading && !error" id="section-categories" class="category-scroll">
          <div class="section-header">
            <h2 class="section-title"><el-icon class="section-title-icon"><Collection /></el-icon>类别热门活动</h2>
          </div>
          <div class="category-tabs">
            <el-radio-group v-model="selectedCategoryId" @change="selectCategory">
              <el-radio-button value="recent">全部热门</el-radio-button>
              <el-radio-button v-for="category in activityTypeList" :key="category" :value="category">{{ category }}</el-radio-button>
            </el-radio-group>
          </div>
          <div class="cat-scroll-body" v-loading="categoryLoading">
            <div v-if="categoryActivities.length" class="cat-activity-list">
              <button v-for="activity in categoryActivities" :key="activity.id" type="button" class="cat-activity-item" @click="goActivityDetail(activity.id)">
                <div class="cpi-left"><div class="cpi-title">{{ activity.title }}</div><div class="cpi-meta"><span><el-icon size="12"><Location /></el-icon>{{ activity.location || '地点待定' }}</span><span><el-icon size="12"><Calendar /></el-icon>{{ formatTime(activity.event_time) }}</span></div></div>
                <el-tag size="small" type="success" effect="plain" round>{{ activity.activity_type || '活动' }}</el-tag>
              </button>
            </div>
            <el-empty v-else-if="!categoryLoading" :image-size="80" description="该类别暂无热门活动" />
          </div>
        </section>

        <section v-if="loading" class="content-section loading-section">
          <div class="skeleton-title"></div>
          <div class="skeleton-scroll"><div v-for="i in 2" :key="i" class="skeleton-card-scroll"></div></div>
        </section>
        <section v-else-if="error" class="home-error"><el-result icon="error" title="活动加载失败" :sub-title="error"><template #extra><el-button type="primary" @click="fetchData">重试</el-button></template></el-result></section>
      </main>

      <aside class="side-right">
        <HomeCalendarCard
          :current-year="currentYear"
          :current-month="currentMonth"
          :week-days="weekDays"
          :calendar-days="calendarDays"
          :selected-date="selectedDate"
          :schedule-items="selectedScheduleItems"
          :schedule-error="scheduleError"
          @prev-month="prevMonth"
          @next-month="nextMonth"
          @select-date="selectDate"
          @retry-schedule="fetchSchedule"
        />
      </aside>
    </div>

    <FooterBar :current-year-label="currentYearLabel" />

    <el-backtop :visibility-height="400" :right="32" :bottom="40" />
  </div>
</template>

<style scoped>
.home-page {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  text-align: left;
  overflow: hidden;
}

/* ---- 三栏主体布局 ---- */
.home-body {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 32px 0 188px;
  display: flex;
  gap: 28px;
  overflow: hidden;
  min-height: 0;
}

/* ---- 中间主内容 ---- */
.home-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hot-section { flex-shrink: 0; }

.category-scroll {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  margin-top: 8px;
}

.cat-scroll-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.cat-scroll-body::-webkit-scrollbar { width: 4px; }
.cat-scroll-body::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 2px; }

.content-section { margin-bottom: 20px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: 800;
  color: #0d5e3c;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title-icon { font-size: 20px; color: #27a66b; }

.section-more {
  color: #0b7d5b !important;
  font-size: 13px;
  transition: color 0.2s;
}

.section-more:hover {
  color: #0ea36f !important;
  background: rgba(11, 125, 91, 0.06) !important;
}

/* ---- 卡片入场动画 ---- */
@keyframes card-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hot-carousel, .cat-activity-item { animation: card-in 0.5s ease-out both; }
.hot-carousel { animation-delay: 0s; }
.cat-activity-item:nth-child(1) { animation-delay: 0.05s; }
.cat-activity-item:nth-child(2) { animation-delay: 0.1s; }
.cat-activity-item:nth-child(3) { animation-delay: 0.15s; }
.cat-activity-item:nth-child(4) { animation-delay: 0.2s; }
.cat-activity-item:nth-child(5) { animation-delay: 0.25s; }
.cat-activity-item:nth-child(6) { animation-delay: 0.3s; }

/* ---- 骨架屏 ---- */
.skeleton-title {
  height: 24px; width: 140px;
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 6px; margin-bottom: 16px;
}

.skeleton-scroll { display: flex; gap: 16px; overflow: hidden; }

.skeleton-card-scroll {
  width: 240px; height: 160px;
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 16px; flex-shrink: 0;
}

.skeleton-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

.skeleton-card {
  height: 100px;
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 12px;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---- 热门轮播 ---- */
.hot-carousel {
  background: #fff;
  border-radius: 14px;
  padding: 28px 32px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
  border-left: 4px solid #27a66b;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  position: relative;
}

.hot-carousel:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(13, 94, 60, 0.08);
}

.hot-carousel:focus-visible { outline: 3px solid #27a66b; outline-offset: 3px; }

.hc-dots { display: flex; justify-content: center; gap: 8px; margin-top: 16px; }
.hc-dot { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 50%; background: #d0d0d0; cursor: pointer; transition: all .2s; }
.hc-dot.active { width: 24px; border-radius: 4px; background: #27a66b; }
.hc-dot:hover,.hc-dot:focus-visible { background: #1f8d59; outline: none; }

.hot-empty {
  display: flex; align-items: center; justify-content: center;
  min-height: 180px; background: #fff;
  border: 1px dashed #d8dee9; border-radius: 14px;
}

.hc-badge { margin-bottom: 12px; }

.hc-title {
  font-size: 20px; font-weight: 800;
  color: #0d5e3c; margin: 0 0 10px;
}

.hc-summary {
  font-size: 14px; color: #606266; line-height: 1.6;
  margin: 0 0 16px;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}

.hc-meta { display: flex; gap: 20px; font-size: 13px; color: #909399; flex-wrap: wrap; }
.hc-meta span { display: flex; align-items: center; gap: 4px; }

/* ---- 分类标签 ---- */
.category-tabs {
  margin-bottom: 8px;
  overflow-x: auto;
  white-space: nowrap;
  padding-bottom: 4px;
}

.category-tabs :deep(.el-radio-group) { display: inline-flex; gap: 0; flex-wrap: nowrap; }
.category-tabs :deep(.el-radio-button__inner) { font-size: 13px; padding: 8px 16px; border-color: #e8e8e8; }

.cat-activity-list { display: flex; flex-direction: column; gap: 8px; }

.cat-activity-item {
  background: #fff; border-radius: 12px;
  padding: 16px 20px;
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  border: 0;
  width: 100%;
  text-align: left;
}

.cat-activity-item:hover { background: #f5fcf8; transform: translateX(4px); }

.cpi-left { flex: 1; min-width: 0; }

.cpi-title {
  font-size: 14px; font-weight: 600; color: #0d5e3c;
  margin-bottom: 4px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.cpi-meta { font-size: 12px; color: #909399; display: flex; gap: 16px; }
.cpi-meta span { display: flex; align-items: center; gap: 4px; }
.cpi-tag { flex-shrink: 0; margin-left: 12px; }
.cat-activity-empty { padding: 24px 0; }

.empty-state { background: #fff; border-radius: 14px; padding: 40px 0; }
.home-error { background: #fff; border-radius: 14px; }

/* ---- 右侧辅助栏容器 ---- */
.side-right {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

/* ---- 响应式 ---- */
@media (max-width: 1024px) {
  .side-right { display: none; }
  .home-body { gap: 20px; }
}

@media (max-width: 768px) {
  .home-page { height: auto; min-height: 100svh; overflow: visible; }
  .home-body,.home-main,.category-scroll { overflow: visible; }
  .cat-scroll-body { overflow: visible; }
  .side-left { display: none; }
  .home-body { padding: 16px 16px 0; flex-direction: column; }
  .section-title { font-size: 17px; }
  .hc-summary { font-size: 13px; }
}

@media (max-width: 480px) {
  .home-body { padding: 12px; }
  .category-tabs :deep(.el-radio-button__inner) { padding: 6px 12px; font-size: 12px; }
  .cat-activity-item { padding: 12px 16px; flex-direction: column; align-items: flex-start; gap: 8px; }
  .cpi-tag { margin-left: 0; }
}
</style>
