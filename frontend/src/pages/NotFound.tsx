import { Link } from 'react-router-dom'
import { Button, PageHeader } from '../components/ui'

/** Unknown route: say so plainly and point back, instead of silently
 * showing the dashboard as if the link had worked. */
export default function NotFound() {
  return (
    <div>
      <PageHeader title="This page doesn't exist" subtitle="The link may be mistyped, or the page was removed." />
      <div className="card max-w-md p-6">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Nothing is broken on your side — there is just no page at this address.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/"><Button variant="brand">Back to Overview</Button></Link>
          <Link to="/chat"><Button variant="ghost">Open agent chat</Button></Link>
        </div>
      </div>
    </div>
  )
}
