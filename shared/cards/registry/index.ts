/**
 * cards/registry/index.ts — validated card and effect loaders.
 *
 * loadCards()   → parse + validate cards.json → CardDefinition[]
 * loadEffects() → parse + validate effects.json and cross-check against handlers
 */
import { effectHandlers } from '../../effects/registry.js'
import type { CardDefinition, EffectMeta, Rarity } from '../cardTypes.js'

import rawCards from './cards.json' with { type: 'json' }
import rawEffects from './effects.json' with { type: 'json' }

// ─── Internal validation helpers ─────────────────────────────────────────────

const VALID_RARITIES = new Set<Rarity>(['common', 'rare', 'epic', 'legendary'])

function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && VALID_RARITIES.has(value as Rarity)
}

function assertString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Registry validation: "${path}" must be a non-empty string, got ${JSON.stringify(value)}`)
  }
  return value
}

function assertPositiveInt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error(`Registry validation: "${path}" must be a positive integer, got ${JSON.stringify(value)}`)
  }
  return value
}

function assertStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((x) => typeof x !== 'string')) {
    throw new Error(`Registry validation: "${path}" must be an array of strings, got ${JSON.stringify(value)}`)
  }
  return value as string[]
}

// ─── Loaders ─────────────────────────────────────────────────────────────────

/**
 * Parse and validate cards.json.
 * Throws a descriptive error if any card is malformed.
 */
export function loadCards(): CardDefinition[] {
  if (!Array.isArray(rawCards)) {
    throw new Error('Registry validation: cards.json must be a JSON array.')
  }

  return rawCards.map((raw: unknown, i: number) => {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`Registry validation: card at index ${i} is not an object.`)
    }
    const r = raw as Record<string, unknown>
    const prefix = `card[${i}]`

    const id = assertString(r['id'], `${prefix}.id`)
    const name = assertString(r['name'], `${prefix}.name`)
    const image = assertString(r['image'], `${prefix}.image`)
    const description = assertString(r['description'], `${prefix}.description`)

    if (!isRarity(r['rarity'])) {
      throw new Error(
        `Registry validation: ${prefix}.rarity must be one of ${[...VALID_RARITIES].join('|')}, got "${r['rarity']}"`,
      )
    }

    if (typeof r['stats'] !== 'object' || r['stats'] === null) {
      throw new Error(`Registry validation: ${prefix}.stats must be an object.`)
    }
    const s = r['stats'] as Record<string, unknown>

    const stats = {
      health: assertPositiveInt(s['health'], `${prefix}.stats.health`),
      attack: assertPositiveInt(s['attack'], `${prefix}.stats.attack`),
      defense: assertPositiveInt(s['defense'], `${prefix}.stats.defense`),
      rollModifier: assertPositiveInt(s['rollModifier'], `${prefix}.stats.rollModifier`),
    }

    const effects = assertStringArray(r['effects'], `${prefix}.effects`)
    const tags = assertStringArray(r['tags'], `${prefix}.tags`)
    const max_copies =
      r['max_copies'] === undefined
        ? undefined
        : assertPositiveInt(r['max_copies'], `${prefix}.max_copies`)

    return { id, name, image, rarity: r['rarity'] as Rarity, description, stats, effects, tags, max_copies }
  })
}

/**
 * Parse and validate effects.json.
 *
 * Also cross-checks: if an effect has params: null, it MUST have a registered
 * handler in effectHandlers. Throws if the handler is missing.
 */
export function loadEffects(): Record<string, EffectMeta> {
  if (typeof rawEffects !== 'object' || rawEffects === null || Array.isArray(rawEffects)) {
    throw new Error('Registry validation: effects.json must be a JSON object.')
  }

  const result: Record<string, EffectMeta> = {}
  const missingHandlers: string[] = []

  for (const [effectId, raw] of Object.entries(rawEffects)) {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`Registry validation: effect "${effectId}" must be an object.`)
    }
    const r = raw as Record<string, unknown>
    const prefix = `effect["${effectId}"]`

    const trigger = assertString(r['trigger'], `${prefix}.trigger`)
    const label = assertString(r['label'], `${prefix}.label`)
    const description = assertString(r['description'], `${prefix}.description`)
    const icon = assertString(r['icon'], `${prefix}.icon`)

    // params must be an object or explicitly null — not missing/undefined
    if (!Object.prototype.hasOwnProperty.call(r, 'params')) {
      throw new Error(
        `Registry validation: ${prefix}.params is required (use null for complex effects).`,
      )
    }
    const params =
      r['params'] === null
        ? null
        : (r['params'] as Record<string, unknown>)

    // complex effects must have a handler registered
    if (params === null && !(effectId in effectHandlers)) {
      missingHandlers.push(effectId)
    }

    result[effectId] = { trigger, label, description, icon, params }
  }

  if (missingHandlers.length > 0) {
    throw new Error(
      `Registry validation: the following effects have params: null but no registered handler:\n` +
        missingHandlers.map((id) => `  • ${id}`).join('\n') +
        `\nRegister them in shared/effects/registry.ts.`,
    )
  }

  return result
}
