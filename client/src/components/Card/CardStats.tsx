import type { CardStats } from '@shared'

import styles from './Card.module.css'

interface StatBadgeProps {
  icon: string
  value: number
  type: 'health' | 'attack' | 'defense' | 'rollModifier'
  label: string
}

function StatBadge({ icon, value, type, label }: StatBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[type]}`} title={label} aria-label={`${label}: ${value}`}>
      <span className={styles.badgeIcon} aria-hidden="true">
        {icon}
      </span>
      {value}
    </span>
  )
}

interface CardStatsProps {
  stats: CardStats
}

export function CardStats({ stats }: CardStatsProps) {
  return (
    <div className={styles.statsRow}>
      <StatBadge icon="❤️" value={stats.health} type="health" label="Health" />
      <StatBadge icon="⚔️" value={stats.attack} type="attack" label="Attack" />
      <StatBadge icon="🛡️" value={stats.defense} type="defense" label="Defense" />
      <StatBadge icon="🎲" value={stats.rollModifier} type="rollModifier" label="Roll modifier" />
    </div>
  )
}
