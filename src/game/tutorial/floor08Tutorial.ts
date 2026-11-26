export type Floor08TutorialStepId =
  | 'move_sprint'
  | 'aim_fire_swap'
  | 'reload_vent'
  | 'jump_roll'
  | 'relay_interact'
  | 'completed';

export interface Floor08TutorialStepDef {
  id: Exclude<Floor08TutorialStepId, 'completed'>;
  index: number;
  title: string;
  instruction: string;
  keyHint: string;
}

export const FLOOR08_TUTORIAL_STEPS: readonly Floor08TutorialStepDef[] = [
  {
    id: 'move_sprint',
    index: 1,
    title: 'LOCOMOTION & SPRINT',
    instruction: 'Move into the Firing Hall and sprint with SHIFT',
    keyHint: 'WASD + SHIFT',
  },
  {
    id: 'aim_fire_swap',
    index: 2,
    title: 'ADS, FIRE & WEAPON SWAP',
    instruction: 'Aim down sights, fire a round, and swap weapons',
    keyHint: 'RMB · LMB · 1-3',
  },
  {
    id: 'reload_vent',
    index: 3,
    title: 'ACTIVE RELOAD / THERMAL VENT',
    instruction: 'Trigger an active reload or thermal heat vent',
    keyHint: 'R',
  },
  {
    id: 'jump_roll',
    index: 4,
    title: 'JUMP & DODGE-ROLL',
    instruction: 'Jump and execute a tactical roll under low shutters',
    keyHint: 'SPACE · V',
  },
  {
    id: 'relay_interact',
    index: 5,
    title: 'BREACH RELAY & INTERACT',
    instruction: 'Shoot the glowing Security Relay in Lane 03 or press [E] at a terminal',
    keyHint: 'SHOOT RELAY / E',
  },
];

export interface Floor08TutorialSignals {
  movedDistance: number;
  sprinted: boolean;
  aimedAds: boolean;
  firedWeapon: boolean;
  swappedWeapon: boolean;
  reloadedOrVented: boolean;
  jumped: boolean;
  dodgeRolled: boolean;
  shotSecurityRelay: boolean;
  interactedConsole: boolean;
}

export interface Floor08TutorialHudState {
  active: boolean;
  stepId: Floor08TutorialStepId;
  stepIndex: number; // 1..5
  totalSteps: number;
  title: string;
  instruction: string;
  keyHint: string;
  subProgressText: string;
}

/**
 * Pure, deterministic Interactive Floor 08 Tutorial state machine.
 * Fast auto-progression as actions are performed, plus clean instant skip (`[Tab]`).
 */
export class Floor08TutorialMachine {
  public active = true;
  public stepIndex = 0; // 0..4 while active, 5 when completed
  public skipped = false;
  public respawnPending = false;
  public readonly signals: Floor08TutorialSignals = {
    movedDistance: 0,
    sprinted: false,
    aimedAds: false,
    firedWeapon: false,
    swappedWeapon: false,
    reloadedOrVented: false,
    jumped: false,
    dodgeRolled: false,
    shotSecurityRelay: false,
    interactedConsole: false,
  };

  public get stepId(): Floor08TutorialStepId {
    if (!this.active || this.stepIndex >= FLOOR08_TUTORIAL_STEPS.length) {
      return 'completed';
    }
    return FLOOR08_TUTORIAL_STEPS[this.stepIndex].id;
  }

  public reset(): void {
    this.active = true;
    this.stepIndex = 0;
    this.skipped = false;
    this.respawnPending = false;
    this.signals.movedDistance = 0;
    this.signals.sprinted = false;
    this.signals.aimedAds = false;
    this.signals.firedWeapon = false;
    this.signals.swappedWeapon = false;
    this.signals.reloadedOrVented = false;
    this.signals.jumped = false;
    this.signals.dodgeRolled = false;
    this.signals.shotSecurityRelay = false;
    this.signals.interactedConsole = false;
  }

  public recordMovement(distMeters: number, sprinting: boolean): boolean {
    if (!this.active) return false;
    this.signals.movedDistance += Math.max(0, distMeters);
    if (sprinting && distMeters > 0.01) {
      this.signals.sprinted = true;
    }
    return this.evaluateAdvance();
  }

  public recordAds(): boolean {
    if (!this.active) return false;
    this.signals.aimedAds = true;
    return this.evaluateAdvance();
  }

  public recordFire(): boolean {
    if (!this.active) return false;
    this.signals.firedWeapon = true;
    return this.evaluateAdvance();
  }

  public recordWeaponSwap(): boolean {
    if (!this.active) return false;
    this.signals.swappedWeapon = true;
    return this.evaluateAdvance();
  }

  public recordReloadOrVent(): boolean {
    if (!this.active) return false;
    this.signals.reloadedOrVented = true;
    return this.evaluateAdvance();
  }

  public recordJump(): boolean {
    if (!this.active) return false;
    this.signals.jumped = true;
    return this.evaluateAdvance();
  }

  public recordDodgeRoll(): boolean {
    if (!this.active) return false;
    this.signals.dodgeRolled = true;
    return this.evaluateAdvance();
  }

  public recordRelayShot(): boolean {
    if (!this.active) return false;
    this.signals.shotSecurityRelay = true;
    return this.evaluateAdvance();
  }

  public recordInteract(): boolean {
    if (!this.active) return false;
    this.signals.interactedConsole = true;
    return this.evaluateAdvance();
  }

  public skip(): boolean {
    if (!this.active) return false;
    this.skipped = true;
    this.complete();
    return true;
  }

  public forceComplete(): boolean {
    if (!this.active) return false;
    this.complete();
    return true;
  }

  public consumeRespawnPending(): boolean {
    if (!this.respawnPending) return false;
    this.respawnPending = false;
    return true;
  }

  public getHudState(): Floor08TutorialHudState {
    if (!this.active || this.stepIndex >= FLOOR08_TUTORIAL_STEPS.length) {
      return {
        active: false,
        stepId: 'completed',
        stepIndex: FLOOR08_TUTORIAL_STEPS.length,
        totalSteps: FLOOR08_TUTORIAL_STEPS.length,
        title: 'LIVE COMBAT ACTIVE',
        instruction: '',
        keyHint: '',
        subProgressText: '',
      };
    }

    const step = FLOOR08_TUTORIAL_STEPS[this.stepIndex];
    let sub = '';
    if (step.id === 'move_sprint') {
      const m = this.signals.movedDistance >= 1.5 ? 'MOVE OK' : 'MOVE';
      const s = this.signals.sprinted ? 'SPRINT OK' : 'SPRINT';
      sub = `${m} · ${s}`;
    } else if (step.id === 'aim_fire_swap') {
      const a = this.signals.aimedAds ? 'ADS OK' : 'ADS';
      const f = this.signals.firedWeapon ? 'FIRE OK' : 'FIRE';
      const w = this.signals.swappedWeapon ? 'SWAP OK' : 'SWAP';
      sub = `${a} · ${f} · ${w}`;
    } else if (step.id === 'reload_vent') {
      sub = this.signals.reloadedOrVented ? 'VENT/RELOAD OK' : 'PRESS [R]';
    } else if (step.id === 'jump_roll') {
      const j = this.signals.jumped ? 'JUMP OK' : 'JUMP';
      const r = this.signals.dodgeRolled ? 'ROLL OK' : 'ROLL';
      sub = `${j} · ${r}`;
    } else if (step.id === 'relay_interact') {
      sub = 'SHOOT AMBER RELAY OR PRESS [E]';
    }

    return {
      active: true,
      stepId: step.id,
      stepIndex: step.index,
      totalSteps: FLOOR08_TUTORIAL_STEPS.length,
      title: step.title,
      instruction: step.instruction,
      keyHint: step.keyHint,
      subProgressText: sub,
    };
  }

  private evaluateAdvance(): boolean {
    if (!this.active) return false;
    let advanced = false;

    while (this.active && this.stepIndex < FLOOR08_TUTORIAL_STEPS.length) {
      const cur = FLOOR08_TUTORIAL_STEPS[this.stepIndex].id;
      let done = false;
      if (cur === 'move_sprint') {
        done = this.signals.movedDistance >= 1.5 && this.signals.sprinted;
      } else if (cur === 'aim_fire_swap') {
        done = this.signals.aimedAds && this.signals.firedWeapon && this.signals.swappedWeapon;
      } else if (cur === 'reload_vent') {
        done = this.signals.reloadedOrVented;
      } else if (cur === 'jump_roll') {
        done = this.signals.jumped && this.signals.dodgeRolled;
      } else if (cur === 'relay_interact') {
        done = this.signals.shotSecurityRelay || this.signals.interactedConsole;
      }

      if (!done) break;
      this.stepIndex += 1;
      advanced = true;
      if (this.stepIndex >= FLOOR08_TUTORIAL_STEPS.length) {
        this.complete();
        break;
      }
    }

    return advanced;
  }

  private complete(): void {
    this.active = false;
    this.stepIndex = FLOOR08_TUTORIAL_STEPS.length;
    this.respawnPending = true;
  }
}
