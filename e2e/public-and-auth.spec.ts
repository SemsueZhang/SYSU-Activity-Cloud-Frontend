import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto('/auth/login')
  await page.getByPlaceholder('请输入用户名/邮箱').fill(username)
  await page.getByPlaceholder('请输入密码').fill(password)
  const code = await page.getByAltText('图形验证码，点击可更换').evaluate(async (image) => {
    const svg = await (await fetch((image as HTMLImageElement).src)).text()
    return svg.match(/>(\d{4})<\/text>/)?.[1] || ''
  })
  await page.getByPlaceholder('请输入图形验证码').fill(code)
  await page.getByRole('button', { name: '登 录' }).click()
  await expect(page).toHaveURL('/')
  await page.waitForFunction(() => Boolean(localStorage.getItem('token')))
}

async function fillCaptcha(page: import('@playwright/test').Page) {
  const code = await page.getByAltText('图形验证码，点击可更换').evaluate(async (image) => {
    const svg = await (await fetch((image as HTMLImageElement).src)).text()
    return svg.match(/>(\d{4})<\/text>/)?.[1] || ''
  })
  await page.getByPlaceholder('请输入图形验证码').fill(code)
}

const signInAsPublisher = (page: import('@playwright/test').Page) => signIn(page, 'zhangsan', '123456')

test('visitor can search published activities', async ({ page }) => {
  await page.goto('/search?q=%E5%AD%A6%E6%9C%AF')
  await expect(page.getByRole('heading', { name: /搜索结果/ })).toBeVisible()
  await expect(page.getByText('中山大学第12届学术科技节')).toBeVisible()
})

test('home search, email registration, and enrollment idempotency are usable', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('搜索活动、主题、地点…').fill('学术')
  await page.getByPlaceholder('搜索活动、主题、地点…').press('Enter')
  await expect(page).toHaveURL(/\/search\?q=/)

  const username = `e2e-user-${Date.now()}`
  await page.goto('/auth/register')
  await page.getByPlaceholder('请输入用户名').fill(username)
  await page.getByPlaceholder('请输入邮箱地址').fill(`${username}@example.com`)
  await page.getByPlaceholder('至少 6 个字符').fill('test123456')
  await page.getByPlaceholder('再次输入密码').fill('test123456')
  await page.getByRole('button', { name: '获取验证码' }).click()
  await expect(page.getByPlaceholder('6 位验证码')).not.toBeEmpty()
  await fillCaptcha(page)
  await page.getByRole('button', { name: '注 册' }).click()
  await expect(page).toHaveURL('/auth/login')
  await signIn(page, username, 'test123456')
  const result = await page.evaluate(async (email) => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const form = { name: '端到端测试用户', student_id: '20260001', college: '计算机学院', email }
    const request = () => fetch('/api/activities/1/register', { method: 'POST', headers, body: JSON.stringify(form) }).then((response) => response.json())
    const first = await request()
    const second = await request()
    const registeredAfter = await fetch('/api/activities/registered?per_page=100', { headers }).then((response) => response.json())
    const calendarAfter = await fetch('/api/calendar/events?month=2026-06', { headers }).then((response) => response.json())
    const cancelled = await fetch('/api/activities/1/register', { method: 'DELETE', headers }).then((response) => response.json())
    const registeredRemoved = await fetch('/api/activities/registered?per_page=100', { headers }).then((response) => response.json())
    const calendarRemoved = await fetch('/api/calendar/events?month=2026-06', { headers }).then((response) => response.json())
    return { first, second, registeredAfter, calendarAfter, cancelled, registeredRemoved, calendarRemoved }
  }, `${username}@example.com`)
  expect(result.first.already_registered).toBe(false)
  expect(result.second.already_registered).toBe(true)
  expect(result.second.registrations).toBe(result.first.registrations)
  expect(result.registeredAfter.items.some((item: { id: number }) => item.id === 1)).toBe(true)
  expect(result.calendarAfter.events.some((item: { activity_id?: number }) => item.activity_id === 1)).toBe(true)
  expect(result.cancelled.registrations).toBe(result.first.registrations - 1)
  expect(result.registeredRemoved.items.some((item: { id: number }) => item.id === 1)).toBe(false)
  expect(result.calendarRemoved.events.some((item: { activity_id?: number }) => item.activity_id === 1)).toBe(false)
})

test('publisher can access registered and created activities on separate pages', async ({ page }) => {
  await signInAsPublisher(page)
  await expect(page).toHaveURL('/')
  await page.goto('/my/activities')
  await expect(page.getByRole('heading', { name: '我报名的活动' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '我创建的活动' })).toHaveCount(0)
  await page.goto('/my/created/rejected')
  await expect(page.getByRole('heading', { name: '我创建的活动 · 未通过' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '我创建的活动状态导航' })).toBeVisible()
})

test('mock contract rejects private activity reads, unauthorized export, and cross-owner edits', async ({ page }) => {
  await page.goto('/')
  const guestStatuses = await page.evaluate(async () => {
    const [drafts, exportFile] = await Promise.all([
      fetch('/api/activities?status=draft'),
      fetch('/api/export/posters.json'),
    ])
    return [drafts.status, exportFile.status]
  })
  expect(guestStatuses).toEqual([403, 401])

  await signInAsPublisher(page)
  const status = await page.evaluate(async () => {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/activities/1', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'attempted overwrite' }) })
    return response.status
  })
  expect(status).toBe(403)
})

test('knowledge context and ICS export follow the backend resource contract', async ({ page }) => {
  await signInAsPublisher(page)
  const result = await page.evaluate(async () => {
    const [related, ics] = await Promise.all([
      fetch('/api/posters/1/related'),
      fetch('/api/posters/1/ics'),
    ])
    return { related: { status: related.status, body: await related.json() }, ics: { status: ics.status, type: ics.headers.get('content-type') } }
  })
  expect(result.related.status).toBe(200)
  expect(result.related.body.nodes.length).toBeGreaterThan(0)
  expect(result.ics).toMatchObject({ status: 200, type: expect.stringContaining('text/calendar') })
})

test('publisher can submit a draft created in the UI and an admin can approve it', async ({ page }) => {
  const title = `E2E 审核活动 ${Date.now()}`
  await signInAsPublisher(page)
  await page.goto('/activities/create')
  const editor = page.locator('.editor')
  await editor.locator('input').first().fill(title)
  await editor.locator('.el-select').first().click()
  await page.getByText('讲座', { exact: true }).last().click()
  await editor.locator('textarea').nth(1).fill('这是用于验证发布与审核闭环的活动正文。')
  await page.getByRole('button', { name: '提交审核' }).click()
  await expect(page).toHaveURL('/my/created/reviewing')
  await expect(page.getByText(title)).toBeVisible()

  await page.evaluate(() => localStorage.clear())
  await signIn(page, 'admin', 'admin123456')
  await page.goto('/admin/review')
  const row = page.getByRole('row', { name: new RegExp(title) })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: '批准' }).click()
  await expect(row).toHaveCount(0)
})

test('publisher uploads a safe attachment, retries a transient failure, and cannot submit forged URLs', async ({ page }) => {
  await signInAsPublisher(page)
  await page.goto('/activities/create')
  let firstUpload = true
  await page.route('**/api/uploads', async (route) => {
    if (firstUpload) {
      firstUpload = false
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: '模拟上传失败' }) })
      return
    }
    await route.continue()
  })
  const picker = page.locator('input[type="file"]')
  await picker.setInputFiles({ name: 'agenda.pdf', mimeType: 'application/pdf', buffer: Buffer.from('mock agenda') })
  await expect(page.getByText('模拟上传失败')).toBeVisible()
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.getByText('agenda.pdf', { exact: true })).toBeVisible()

  const forgedStatus = await page.evaluate(async () => {
    const token = localStorage.getItem('token') || ''
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'forged attachment', raw_text: 'test', attachments: [{ id: 'missing', name: 'bad', url: 'javascript:alert(1)' }] }),
    })
    return response.status
  })
  expect(forgedStatus).toBe(422)
})

test('public sorting, rejection feedback, and home failure state are visible', async ({ page }) => {
  await page.goto('/activities?sort=event_time')
  await expect(page.locator('.activity-card h2').first()).toHaveText('中山大学春季艺术展')

  const rejectedTitle = `E2E 驳回活动 ${Date.now()}`
  await signInAsPublisher(page)
  const activityId = await page.evaluate(async (title) => {
    const token = localStorage.getItem('token') || ''
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const created = await fetch('/api/activities', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, raw_text: '用于验证驳回反馈。', summary: '', event_time: null, location: '', organizer: '', activity_type: '其他', tags: [], attachments: [] }),
    }).then((response) => response.json())
    await fetch(`/api/activities/${created.id}/submit-review`, { method: 'POST', headers })
    return created.id as number
  }, rejectedTitle)
  await page.evaluate(() => localStorage.clear())
  await signIn(page, 'admin', 'admin123456')
  await page.evaluate(async ({ id }) => {
    const token = localStorage.getItem('token') || ''
    await fetch(`/api/posters/${id}/review`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', reason: '请补充场地审批材料' }) })
  }, { id: activityId })
  await page.evaluate(() => localStorage.clear())
  await signInAsPublisher(page)
  await page.goto('/my/created/rejected')
  await expect(page.getByText(rejectedTitle)).toBeVisible()
  await expect(page.getByText('请补充场地审批材料')).toBeVisible()

  await page.unrouteAll({ behavior: 'wait' })
  await page.route('**/api/activities?**', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: '模拟首页失败' }) }))
  await page.goto('/')
  await expect(page.getByText('活动加载失败')).toBeVisible()
})
