import { useEffect, useRef, useState } from 'react'
import { Compass, Moon, Search, Sun, X, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { NAV } from './layout'

type PaletteAction = { id: string; label: string; group: string; icon: LucideIcon; run: () => void }

export default function CommandPalette({ open, onClose, onToggleTheme, dark }: {
  open: boolean; onClose: () => void; onToggleTheme: () => void; dark: boolean
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setQuery('')
      setActive(0)
      dialog.showModal()
      searchRef.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function go(to: string, message?: string) {
    dialogRef.current?.close()
    onClose()
    navigate(to, message ? { state: { message } } : undefined)
  }

  const actions: PaletteAction[] = [
    ...NAV.map(({ to, label, icon }) => ({ id: to, label, group: 'Go to', icon, run: () => go(to) })),
    ...['iion', 'Alchemyst AI', 'Discover Dollar', 'Drivetrain'].map((company) => ({
      id: company, label: `Research ${company} and draft mails`, group: 'Research', icon: Compass,
      run: () => go('/chat', `Research ${company} and draft mails`),
    })),
    { id: 'theme', label: dark ? 'Switch to light theme' : 'Switch to dark theme', group: 'Appearance',
      icon: dark ? Sun : Moon, run: () => { onToggleTheme(); onClose() } },
  ]
  const q = query.trim().toLowerCase()
  const filtered = actions.filter((a) => `${a.label} ${a.group}`.toLowerCase().includes(q))
  const selected = filtered[active]

  return (
    <dialog id="command-palette" ref={dialogRef} className="modal modal--palette" aria-label="Command palette"
      onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="flex items-center gap-2 border-b border-rule p-3">
        <Search className="text-muted" size={18} aria-hidden="true" />
        <input ref={searchRef} className="input" value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0) }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((index) => Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))))
            }
            if (event.key === 'Enter' && selected) { event.preventDefault(); selected.run() }
          }}
          placeholder="Find a page or action" aria-label="Search commands" role="combobox" aria-expanded={open}
          aria-controls="command-results" aria-autocomplete="list"
          aria-activedescendant={selected ? `command-option-${active}` : undefined} />
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close command palette"><X size={18} /></button>
      </div>
      <div ref={listRef} id="command-results" role="listbox" aria-label="Commands" className="max-h-80 overflow-auto p-2">
        {filtered.length === 0 && <p className="p-4 text-muted" role="status">No commands match “{query}”.</p>}
        {filtered.map((action, index) => (
          <div key={action.id} role="presentation">
            {filtered[index - 1]?.group !== action.group && <p className="eyebrow px-3 pt-3 pb-1">{action.group}</p>}
            <button type="button" tabIndex={-1} id={`command-option-${index}`} data-index={index}
              data-active={index === active} role="option" aria-selected={index === active} className="palette-option"
              onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={action.run}>
              <action.icon size={16} className="text-muted" aria-hidden="true" />{action.label}
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 border-t border-rule p-3 text-xs text-muted" aria-hidden="true">
        <span><kbd>Up or Down</kbd> Move</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span>
      </div>
    </dialog>
  )
}
