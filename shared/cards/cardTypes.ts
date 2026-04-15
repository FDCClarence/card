export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface CardStats {
  health: number
  attack: number
  defense: number
  rollModifier: number
}

export interface EffectMeta {
  trigger: string
  label: string
  description: string
  icon: string
  params: Record<string, unknown> | null
}

export interface CardDefinition {
  id: string
  name: string
  image: string
  rarity: Rarity
  description: string
  stats: CardStats
  effects: string[]
  tags: string[]
}
