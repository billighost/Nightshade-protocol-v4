import type {
  BossHudState,
  EnemyArchetypeConfig,
  EnemyCombatState,
  WeakpointIntelBanner,
} from './types';

export interface ActiveEnemyView {
  state: EnemyCombatState;
  config: EnemyArchetypeConfig;
  x: number;
  y: number;
  z: number;
}

/**
 * Selects the most relevant active Mini-Boss or Floor Boss for the sleek top-center boss telemetry bar.
 * Prioritizes the Floor Boss (`tier === 'boss'`) whenever alive, otherwise the closest engaged/nearby Zone Mini-Boss.
 */
export function selectActiveBossHud(
  enemies: ReadonlyArray<ActiveEnemyView>,
  playerX: number,
  playerZ: number
): BossHudState | null {
  let best: ActiveEnemyView | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.state.alive) continue;
    if (e.state.tier !== 'boss' && e.state.tier !== 'miniboss') continue;

    const dx = e.x - playerX;
    const dz = e.z - playerZ;
    const dist = Math.hypot(dx, dz);

    // Floor boss shows across the entire floor once spawned; mini-bosses show when engaged or within 22m
    if (e.state.tier === 'miniboss' && !e.state.engaged && dist > 22) continue;

    const priority = e.state.tier === 'boss' ? dist - 1000 : dist;
    if (priority < bestScore) {
      bestScore = priority;
      best = e;
    }
  }

  if (!best) return null;

  return {
    enemyId: best.state.id,
    name: best.config.displayName,
    subtitle: best.config.roleSubtitle,
    tier: best.state.tier === 'boss' ? 'boss' : 'miniboss',
    hp: Math.ceil(best.state.hp),
    maxHp: best.state.maxHp,
    hpRatio: Math.max(0, Math.min(1, best.state.hp / Math.max(1, best.state.maxHp))),
    phase: best.state.phase,
    staggered: best.state.staggerTimer > 0,
    weakpointExposed: best.state.weakpoint.exposed && !best.state.weakpoint.broken,
    weakpointLabel: best.config.weakpoint.label,
  };
}

export function buildWeakpointIntelBanner(
  config: EnemyArchetypeConfig,
  isPhase2 = false
): WeakpointIntelBanner {
  const accent: WeakpointIntelBanner['accent'] =
    config.id === 'aegis_riot_trooper' ||
    config.id === 'vault_stalker_sniper' ||
    config.id === 'valkyrie_hover_drone'
      ? 'cyan'
      : config.id === 'commander_kestrel' || config.id === 'bastion_seven_boss'
        ? 'gold'
        : config.id === 'razor_strider' ||
            config.id === 'ordnance_pyro_tech' ||
            config.id === 'turbine_juggernaut' ||
            config.id === 'grapple_lance_duelist'
          ? 'crimson'
          : 'amber';

  return {
    title: isPhase2 ? `${config.displayName} · PHASE 2` : `INTEL · ${config.displayName}`,
    hint: isPhase2 && config.phase2Intel ? config.phase2Intel : config.weakpointIntel,
    accent,
  };
}
