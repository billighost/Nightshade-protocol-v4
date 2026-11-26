import { FLOOR_CATALOG } from '../../types';

/**
 * FLOOR 08 — APEX TACTICAL PROVING COMPLEX — MASTER SPATIAL BLUEPRINT
 *
 * Whole-world multi-wing layout (74m wide × 68m deep, 5 interconnected architectural zones):
 *
 *                 [BULKHEAD 08 EXIT → DESCENT GALLERY TO FLOOR 07]
 *                                  z = -17.0 (x = 0)
 *           ┌───────────────────────────┴───────────────────────────┐
 *           │   ZONE 5: NORTH SECURITY ATRIUM & COMMAND BRIDGE      │ z ∈ [-17, -1]
 *           │   (48m × 16m × 12.5m · Upper Bridge + Twin Stairs)    │ x ∈ [-24, +24]
 *           └──┬───────┬───────────────────────────────┬───────┬────┘
 *              │KH Exit│ W-Pass    [BACKSTOP]   E-Pass │Armory │  z = -1.0
 *  ┌───────────┴───────┴┐┌───────────────────────────┐┌┴───────┴──────────┐
 *  │ ZONE 3: WEST WING  ││ ZONE 4: CENTRAL HERO HALL ││ ZONE 2: EAST WING │
 *  │ CQB BREACHING      ││ MONUMENTAL BALLISTIC      ││ TACTICAL ARMORY,  │
 *  │ KILLHOUSE          ││ PROVING CATHEDRAL (13.5m) ││ GLASS OBSERVATION │
 *  │ ("SHOOT HOUSE 08") │┤ Firing Stalls · Baffles   ├┤ GALLERY & EXPRESS │
 *  │ 3-Lane Rooms +     ││ 3-Tier Range + Mezzanine  ││ VERTICAL LIFT     │
 *  │ Instructor Catwalk ││ + Twin Grand Staircases   ││ (to Floor 01)     │
 *  │ x ∈ [-36, -17]     ││ x ∈ [-17, +17]            ││ x ∈ [+17, +36]    │
 *  │ z ∈ [-1, +45]      ││ z ∈ [-1, +33]             ││ z ∈ [-1, +46]     │
 *  └──────────┬─────────┘└──────────┬────────────────┘└─────────┬─────────┘
 *             │ West Portal         │ 11m Grand Blast Archway   │ East Portal
 *             └─────────┐┌──────────┴────────────┐┌─────────────┘ z = +33.0
 *                       ││ ZONE 1: OPS BRIEFING  ││
 *                       └┤ ROTUNDA & DEPLOYMENT  ├┘ z ∈ [+33, +50]
 *                        │ (Spawn z=+45.5, N=0)  │  x ∈ [-13, +13]
 *                        └───────────────────────┘
 */
export const F8_BASE_Y = FLOOR_CATALOG[8].baseY; // 98.0m
export const F8_MEZZ_Y = F8_BASE_Y + 4.4; // 102.4m (consistent across all elevated galleries!)

export const F8_CEILINGS = {
  briefing: 7.2,
  armory: 8.4,
  killhouse: 8.6,
  firingHall: 13.5,
  northAtrium: 12.5,
} as const;

export const F8_BOUNDS = {
  minX: -40,
  maxX: 40,
  minZ: -38,
  maxZ: 54,
} as const;

export const F8_SPAWN = {
  x: 0,
  y: F8_BASE_Y,
  z: 45.5,
  yaw: 0,
} as const;

export const F8_PORTALS = {
  // Zone 1 (Briefing) <-> Zone 4 (Main Firing Hall) at z = +33
  briefingToHallX: [-5.5, 5.5] as const,
  // Zone 1 (Briefing) <-> Zone 3 (Killhouse Entry) at x = -13
  briefingToKillhouseZ: [38.5, 43.5] as const,
  // Zone 1 (Briefing) <-> Zone 2 (Armory Entry) at x = +13
  briefingToArmoryZ: [38.5, 43.5] as const,

  // Zone 4 (Main Firing Hall) <-> Zone 3 (Killhouse) at x = -17
  hallToKillhouseGroundZ: [11.0, 16.0] as const,
  hallToKillhouseUpperZ: [20.0, 24.4] as const,

  // Zone 4 (Main Firing Hall) <-> Zone 2 (Armory Corridor) at x = +17
  hallToArmoryGroundZ: [21.0, 26.0] as const,
  hallToArmoryUpperZ: [27.0, 31.2] as const,

  // Zone 4 / Zone 3 / Zone 2 <-> Zone 5 (North Security Atrium) at z = -1
  killhouseToAtriumX: [-23.0, -18.4] as const,
  hallWestToAtriumX: [-15.8, -11.6] as const,
  hallEastToAtriumX: [11.6, 15.8] as const,
  armoryToAtriumX: [18.4, 23.0] as const,
  hallUpperBridgeToAtriumX: [-5.0, 5.0] as const,

  // Zone 5 (North Security Atrium) -> Massive Bulkhead 08 Exit at z = -17
  bulkheadZ: -17.0,
  bulkheadWidth: 5.6,
  bulkheadHeight: 5.4,
} as const;
