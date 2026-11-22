import { expect, test } from '@playwright/test'

const screens = [
  ['/', 'Overview'], ['/discover', 'Discover'], ['/campaigns', 'Campaigns'],
  ['/leads', 'Leads'], ['/drafts', 'Draft mails'], ['/replies', 'Replies'],
  ['/chat', 'Agent chat'], ['/missing', 'Page not found'],
]

test('all screens fit at phone and desktop widths in both themes', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 503 }))
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/')
    await page.evaluate((theme) => localStorage.setItem('sdr-theme', theme), colorScheme)
    await page.reload()
    await expect(page.locator('html')).toHaveCSS('color-scheme', colorScheme)
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const [route, title] of screens) {
        await page.goto(`/#${route}`)
        await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
        await expect(page.locator('.skeleton')).toHaveCount(0)
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      }
    }
  }
})

test('keyboard opens the palette and lead record, then restores focus', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 503 }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Commands' }).focus()
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeFocused()
  await page.keyboard.type('leads')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Leads' })).toBeVisible()
  await page.keyboard.press('/')
  await expect(page.getByRole('searchbox', { name: 'Search leads' })).toBeFocused()
  await page.keyboard.type('Sanjaya')
  const lead = page.getByRole('button', { name: 'Sanjaya Molligoda' })
  await lead.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Sanjaya Molligoda' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(lead).toBeFocused()
})

test('mobile menu, board selection, validation and coverage handoff', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const messages = []
  await page.route('**/api/**', async (route) => {
    if (!route.request().url().endsWith('/chat/stream')) return route.fulfill({ status: 503 })
    messages.push(route.request().postDataJSON().message)
    return route.fulfill({
      contentType: 'text/event-stream',
      body: 'event: done\ndata: {"reply":"Research finished.","drafts":[]}\n\n',
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('dialog', { name: 'Workspace menu' }).getByRole('link', { name: 'Discover', exact: true }).click()
  await page.getByRole('button', { name: 'Check coverage' }).click()
  await expect(page.getByText('Enter a company name.')).toBeVisible()
  await page.getByRole('button', { name: /HiringCafe/ }).click()
  await expect(page.getByRole('link', { name: 'Open HiringCafe' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Company name' }).fill('Example Industry')
  await page.getByRole('button', { name: 'Check coverage' }).click()
  await page.getByRole('button', { name: 'Research in Agent chat' }).click()
  await expect(page.getByRole('log').getByText('Research finished.')).toBeVisible()
  expect(messages).toEqual(['Research Example Industry and draft mails'])
})

test('company approval refreshes live records and the tracker shows live replies', async ({ page }) => {
  let approved = false
  let attempts = 0
  const date = Math.floor(Date.now() / 1000)
  const draft = {
    company: 'Example Industry', recipient: 'Casey Doe', email: 'casey@example.com',
    subject: 'An introduction', body: 'Hello Casey, here is the draft.', status: 'draft',
    reply_class: null, sent_at: null, replied_at: null,
  }
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/health') return route.fulfill({ json: { status: 'ok', gmail_configured: true, gmail_send_enabled: false } })
    if (path === '/api/people') return route.fulfill({ json: { people: [] } })
    if (path === '/api/coverage') return route.fulfill({ json: { companies: [], do_not_mail: [] } })
    if (path === '/api/approve') {
      expect(route.request().postDataJSON()).toEqual({ company: 'Example Industry', approve: true })
      attempts += 1
      if (attempts === 1) return route.fulfill({ status: 409, json: { detail: 'Approval is blocked for this company.' } })
      approved = true
      return route.fulfill({ json: { company: draft.company, sent: [{ to: draft.email, status: 'sent' }] } })
    }
    if (path === '/api/campaigns') {
      const mail = approved ? { ...draft, status: 'sent', reply_class: 'out of office', sent_at: date, replied_at: date } : draft
      return route.fulfill({ json: { companies: [], mails: [mail] } })
    }
    return route.fulfill({ status: 404 })
  })
  await page.goto('/#/drafts')
  await expect(page.getByRole('heading', { name: 'An introduction' })).toBeVisible()
  const approve = page.getByRole('button', { name: 'Approve company drafts' })
  await approve.click()
  await expect(page.getByRole('alert')).toHaveText('Approval is blocked for this company.')
  await expect(approve).toBeEnabled()
  await approve.click()
  await expect(page.getByRole('heading', { name: 'No drafts waiting' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Replies' }).click()
  await expect(page.getByRole('heading', { name: 'An introduction' })).toBeVisible()
  await expect(page.getByText('Follow up after the recipient returns.')).toBeVisible()
})
