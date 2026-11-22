import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fixture } from './proof-fixture.mjs'

const [base, label, directory, mode = 'audit'] = process.argv.slice(2)
if (!base || !label || !directory) throw new Error('Usage: node e2e/proof.mjs URL LABEL OUTPUT_DIR [audit|captures]')
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const screens = [['overview', '/', 'Overview'], ['discover', '/discover', 'Discover'], ['campaigns', '/campaigns', 'Campaigns'], ['leads', '/leads', 'Leads'], ['drafts', '/drafts', 'Draft mails'], ['replies', '/replies', 'Replies'], ['chat', '/chat', 'Agent chat'], ['missing', '/missing', 'Page not found']]
await mkdir(directory, {recursive:true})
const browser = await chromium.launch({executablePath: process.env.CHROME_BIN})
const failures = []
let checks = 0
let overlays = 0

async function audit(page) {
  await page.addScriptTag({ path: axe })
  return page.evaluate(async () => (await window.axe.run()).violations.map(({ id, nodes }) =>
    ({ id, targets: nodes.map((node) => node.target) }),
  ))
}
for (const colorScheme of ['light','dark']) {
  const context = await browser.newContext({colorScheme, reducedMotion:'reduce'})
  await context.addInitScript(theme => localStorage.setItem('sdr-theme', theme), colorScheme)
  await context.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.slice(4)
    return route.fulfill(fixture(path))
  })
  const page = await context.newPage()
  for (const width of mode === 'audit' ? [320,390,768,1440] : [390,1440]) {
    await page.setViewportSize({width,height:width < 800 ? 844 : 1000})
    for (const [name, route, heading] of screens) {
      await page.goto(`${base}/?proof=${width}-${name}#${route}`)
      await page.getByRole('heading',{level:1,name:heading,exact:true}).waitFor()
      await page.waitForFunction(()=>!document.querySelector('.skeleton'))
      await page.evaluate(()=>document.fonts.ready)
      if (name === 'chat') {
        await page.getByRole('textbox',{name:'Message', exact:true}).fill('Research Northstar Robotics and draft mails')
        await page.getByRole('button',{name:'Send',exact:true}).click()
        await page.getByText('I found two verified contacts', {exact:false}).waitFor()
        await page.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 8000 })
      }
      const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)
      if (overflow) failures.push({colorScheme,width,name,overflow})
      if (mode === 'audit') {
        const violations = await audit(page)
        if (violations.length) failures.push({colorScheme,width,name,violations})
      }
      checks++
      if ((width === 1440 && colorScheme === 'light') || (width === 390 && ['overview', 'drafts'].includes(name))) {
        await page.screenshot({path:`${directory}/${label}-${name}-${colorScheme}-${width}.png`, animations:'disabled',fullPage:width===1440})
      }
    }
    if (mode === 'audit' && [390, 1440].includes(width)) {
      await page.goto(`${base}/?proof=${width}-overlays#/leads`)
      const lead = page.getByRole('button', { name: 'Avery Chen', exact: true })
      await lead.click()
      await page.getByRole('dialog', { name: 'Avery Chen' }).waitFor()
      const drawer = await audit(page)
      if (drawer.length) failures.push({ colorScheme, width, name: 'lead drawer', violations: drawer })
      overlays++
      await page.keyboard.press('Escape')

      const control = width === 390 ? 'Open menu' : 'Commands'
      await page.getByRole('button', { name: control, exact: true }).click()
      await page.getByRole('dialog').waitFor()
      const menu = await audit(page)
      if (menu.length) failures.push({ colorScheme, width, name: control, violations: menu })
      overlays++
    }
  }
  await context.close()
}
await browser.close()
await writeFile(`${directory}/${label}-checks.json`, JSON.stringify({ checks, overlays, failures }, null, 2))
console.log(JSON.stringify({ checks, overlays, failures }, null, 2))
if (failures.length) process.exitCode=1
