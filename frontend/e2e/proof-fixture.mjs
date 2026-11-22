const now = Math.floor(Date.now() / 86400000) * 86400 + 43200
const names = ['Northstar Robotics', 'Papertrail Systems', 'Meridian Studio']
const people = [
  ['Avery Chen', 'Co-founder and CTO', 'avery', 98, true, 0],
  ['Nora Patel', 'Head of Talent', 'nora', 88, true, 0],
  ['Theo Morgan', 'Engineering Manager', 'theo', 84, true, 1],
  ['Mina Li', 'Co-founder', 'mina', 92, true, 2],
  ['Sam Rivera', 'Product Lead', '', 73, false, 1],
].map(([name, title, handle, score, verified, company], i) => ({
  id: i + 1, name, title, score, verified, email: handle && `${handle}@example.com`, company: names[company],
}))
const draft = (p, subject, id) => ({
  id, company: p.company, recipient: p.name, email: p.email, subject, status: 'draft', sent_at: null, replied_at: null, reply_class: null,
  body: `Hi ${p.name.split(' ')[0]},\n\nI saw your team is hiring for work on production agent workflows. In AuditMind I built a FastAPI service that extracts and checks contract clauses, with a review step for uncertain results. I would start by mapping where your team checks an agent's output today and build a small prototype around that step.\n\nCould we talk for 15 minutes next week?\n\nBest,\nSivasai`,
})
const mails = [draft(people[0], 'An introduction for Northstar Robotics', 9), draft(people[1], 'A note on your engineering internship', 8), draft(people[2], 'Agent workflows at Papertrail Systems', 7),
  {...draft(people[3], 'Re: Meridian Studio engineering internship', 6), status:'sent', sent_at:now-86400*3, replied_at:now-86400, reply_class:'interested'},
  {...draft({...people[2], name: 'Alex Reed', email: 'alex@example.com'}, 'Re: Contract review prototype', 5), status:'sent', sent_at:now-86400*4, replied_at:now-86400*2, reply_class:'out of office'},
  {...draft({...people[3], name: 'Jamie Ford', email: 'jamie@example.com'}, 'Introduction from Sivasai', 4), status:'sent', sent_at:now-86400*2},
]
const companies = names.map((name,i)=>({name, summary:['Warehouse robotics and tools for field operations.','Document infrastructure for operations teams.','Workflow tools for independent studios.'][i], mails: i === 1 ? 3 : 2, sent: i, last_sent_at: i ? now-86400*(i+2) : null, status: i === 0 ? 'mailed' : 'sent'}))
const data = {
  '/health': {status:'ok', gmail_configured:true, gmail_send_enabled:false},
  '/campaigns': {companies,mails}, '/coverage': {companies, do_not_mail:[]}, '/people': {people}
}
const frame = (event, payload) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`

export function fixture(path) {
  if (path === '/chat/stream') return {
    contentType: 'text/event-stream',
    body: frame('done', {
      reply: 'I found two verified contacts at Northstar Robotics and saved both drafts for review.',
      company: { name: names[0] },
      drafts: mails.slice(0, 2).map(({ id, email, recipient, company, subject, body }) =>
        ({ id, to: email, name: recipient, company, subject, body })),
    }),
  }
  if (path === '/boards') return { status: 503 }
  return Object.hasOwn(data, path) ? { json: data[path] } : { status: 404 }
}
