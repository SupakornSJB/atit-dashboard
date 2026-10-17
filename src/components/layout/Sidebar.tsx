import { Monitor, Bell, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Section = 'devices' | 'alerts' | 'game'

interface Props {
  active: Section
  onChange: (section: Section) => void
}

const items: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'devices', label: 'Devices', icon: <Monitor className="h-4 w-4" /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell className="h-4 w-4" /> },
  { id: 'game', label: 'Game', icon: <Gamepad2 className="h-4 w-4" /> },
]

export function Sidebar({ active, onChange }: Props) {
  return (
    <aside className="flex w-48 flex-col gap-1 border-r border-border bg-card p-4">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            active === item.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </aside>
  )
}