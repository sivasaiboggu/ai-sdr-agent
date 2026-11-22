import { ArrowRight } from 'lucide-react'
import { ActionLink, PageHeader } from '../components/ui'

export default function NotFound() {
  return (
    <div className="max-w-2xl">
      <PageHeader section="Error 404" title="Page not found" subtitle="Check the address or return to your workspace." />
      <div className="ruled flex flex-wrap gap-2 pt-5">
        <ActionLink to="/" variant="brand">Back to overview <ArrowRight size={16} /></ActionLink>
        <ActionLink to="/chat">Open agent chat</ActionLink>
      </div>
    </div>
  )
}
