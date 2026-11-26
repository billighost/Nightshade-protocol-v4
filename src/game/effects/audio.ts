/**
 * Procedural Web Audio API sound engine for Nightshade Protocol.
 * CoD MW-inspired acoustic layering: deep sub-bass punch, crisp transient crack,
 * mechanical slide/bolt clatter, indoor concrete killhouse slapback reverb tails,
 * and unmistakable tactile hitmarker thwacks & metallic headshot dinks!
 */
export class TacticalAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientStarted = false;
  private muted = false;

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.76;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.startAmbientHum();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.76, this.ctx.currentTime, 0.04);
    }
  }

  public setAmbientActive(active: boolean): void {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(active ? 0.055 : 0, this.ctx.currentTime, 0.15);
    }
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private startAmbientHum(): void {
    if (!this.ctx || !this.masterGain || this.ambientStarted) return;
    this.ambientStarted = true;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.045;
    this.ambientGain.connect(this.masterGain);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 54;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 108.5;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 140;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.ambientGain);

    osc1.start();
    osc2.start();
  }

  /** Indoor concrete firing-bay early-reflection slapback & room tail */
  private triggerBayTail(now: number, volume: number, brightnessHz: number, decaySec: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const tail = this.ctx.createBufferSource();
    tail.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(brightnessHz, now + 0.032);
    bp.frequency.exponentialRampToValueAtTime(340, now + 0.032 + decaySec);
    bp.Q.value = 0.85;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(volume, now + 0.034);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.034 + decaySec);
    tail.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    tail.start(now + 0.03);
    tail.stop(now + 0.04 + decaySec);
  }

  public playPistolShot(overcharged: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const pitchJitter = 0.94 + Math.random() * 0.12;

    // 1. Punchy suppressed sub-bass chest thump (CoD MW M19/SOCOM body)
    this.tone((overcharged ? 230 : 185) * pitchJitter, 36, 0.105, 0.52, 'triangle', now);
    this.tone(92 * pitchJitter, 30, 0.09, 0.28, 'sine', now);

    // 2. High-pressure pneumatic baffle crack (tight bandpass transient)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((overcharged ? 3200 : 2450) * pitchJitter, now);
    filter.frequency.exponentialRampToValueAtTime(980, now + 0.075);
    filter.Q.value = 1.35;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.46, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.09);

    // 3. Crisp CNC steel slide reciprocation clack (double-snap open + lock forward!)
    this.tone(1750 * pitchJitter, 620, 0.038, 0.11, 'square', now + 0.018);
    this.tone(1280 * pitchJitter, 480, 0.035, 0.085, 'triangle', now + 0.056);

    // 4. Tight indoor concrete bay slapback reflection
    this.triggerBayTail(now, overcharged ? 0.14 : 0.1, 1350, 0.18);

    // 5. Overcharged tungsten harmonic shimmer
    if (overcharged) {
      this.tone(2150, 740, 0.16, 0.16, 'sine', now);
    }
  }

  public playSmgShot(heatRatio: number, flashBoost: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const pitchJitter = 0.93 + Math.random() * 0.14;
    const heatPitch = 1 + heatRatio * 0.42;

    // 1. Ferocious CoD compensated muzzle chest punch
    this.tone(205 * heatPitch * pitchJitter, 42, 0.075, 0.42, 'sawtooth', now);
    this.tone(110 * pitchJitter, 34, 0.068, 0.28, 'sine', now);

    // 2. Sharp compensated lateral-port muzzle BARK (wide biting high-mid noise)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime((1950 + heatRatio * 1350) * pitchJitter, now);
    hp.Q.value = 0.78;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.48, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    noise.connect(hp);
    hp.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.075);

    // 3. Rapid metallic bolt carrier clatter
    this.tone(2350 * pitchJitter, 980, 0.026, 0.095, 'square', now + 0.015);

    // 4. Indoor concrete firing-bay echo tail
    this.triggerBayTail(now, 0.15, 1650, 0.21);

    // 5. Escalating rail-capacitor whine as barrel heats up
    if (heatRatio > 0.35 || flashBoost) {
      this.tone(
        (flashBoost ? 1560 : 680 + heatRatio * 960) * pitchJitter,
        (flashBoost ? 920 : 480 + heatRatio * 620) * pitchJitter,
        0.055,
        0.07 + heatRatio * 0.065,
        'sine',
        now
      );
    }
  }

  /**
   * Peak CoD MW .50-Cal / Oden / Barrett Kinetic Battle-Rifle Cannon Thunder:
   * - Earth-shaking dual sub-bass chest cannon boom (128Hz->22Hz + 68Hz->19Hz)
   * - Ripping supersonic dual-baffle tank-brake shock crack
   * - Heavy CNC stainless steel bolt-carrier *KA-CHUNK*
   * - Cavernous indoor concrete proving-bay reverberation tail!
   */
  public playHeavyShot(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const jitter = 0.95 + Math.random() * 0.1;

    // 1. Massive dual sub-bass cannon punch
    this.tone(132 * jitter, 22, 0.24, 0.72, 'triangle', now);
    this.tone(72 * jitter, 19, 0.28, 0.64, 'sine', now);
    this.tone(240 * jitter, 46, 0.12, 0.42, 'sawtooth', now);

    // 2. Ripping dual-chamber tank muzzle-brake supersonic pressure wave
    const crack = this.ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650 * jitter, now);
    bp.frequency.exponentialRampToValueAtTime(280, now + 0.22);
    bp.Q.value = 0.58;
    const cGain = this.ctx.createGain();
    cGain.gain.setValueAtTime(0.76, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    crack.connect(bp);
    bp.connect(cGain);
    cGain.connect(this.masterGain);
    crack.start(now);
    crack.stop(now + 0.25);

    // 3. Heavy steel bolt-carrier reciprocation *KA-CHUNK*
    this.tone(980 * jitter, 260, 0.055, 0.22, 'square', now + 0.025);
    this.tone(1420 * jitter, 460, 0.048, 0.16, 'triangle', now + 0.088);

    // 4. Deep cavernous concrete bay thunder tail
    this.triggerBayTail(now, 0.28, 1280, 0.42);
  }

  /**
   * Pressurized boiling cryo-steam hiss + optional sizzling electrical short-circuit spark crackles
   * played continuously during VIPER-X4 thermal overheat / venting!
   */
  public playOverheatSteam(withSparks: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;

    // High-pressure continuous steam hiss burst
    const steam = this.ctx.createBufferSource();
    steam.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime((withSparks ? 3600 : 2900) * jitter, now);
    hp.frequency.exponentialRampToValueAtTime(1450, now + 0.22);
    hp.Q.value = 1.25;
    const sGain = this.ctx.createGain();
    sGain.gain.setValueAtTime(withSparks ? 0.22 : 0.14, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    steam.connect(hp);
    hp.connect(sGain);
    sGain.connect(this.masterGain);
    steam.start(now);
    steam.stop(now + 0.26);

    // Sharp crackling short-circuit sparks inside the steam
    if (withSparks) {
      this.tone(4400 * jitter, 1650 * jitter, 0.028, 0.14, 'sawtooth', now + 0.01);
      this.tone(5800 * jitter, 2200 * jitter, 0.022, 0.1, 'square', now + 0.065);
    }
  }

  /** Tactile military heavy-ammo crate latch *CLUNK-CHING* + fresh .50 brass mag resupply chime */
  public playAmmoPickup(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    // Heavy steel crate latch pop
    this.tone(190, 75, 0.09, 0.32, 'triangle', now);
    this.tone(760, 420, 0.065, 0.2, 'square', now + 0.02);
    // Brass .50 cartridges clinking + warm HUD confirmation double-chime
    this.tone(1180, 1480, 0.09, 0.16, 'sine', now + 0.075);
    this.tone(1560, 2080, 0.14, 0.18, 'sine', now + 0.13);
  }

  /** Unmistakable CoD MW tactile hitmarker confirmation (*thwack* for body, crisp *dink-CRUNCH* for crit!) */
  public playHitmarker(isCrit: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const jitter = 0.96 + Math.random() * 0.08;

    // Tactile transient *tick/thwack*
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (isCrit ? 4200 : 3100) * jitter;
    bp.Q.value = 2.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(isCrit ? 0.34 : 0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
    noise.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.036);

    if (isCrit) {
      // Iconic bright metallic headshot *dink*
      this.tone(2850 * jitter, 2100 * jitter, 0.09, 0.22, 'sine', now);
      this.tone(1420 * jitter, 980 * jitter, 0.065, 0.16, 'triangle', now + 0.012);
    } else {
      this.tone(1120 * jitter, 520 * jitter, 0.04, 0.15, 'triangle', now);
    }
  }

  public playReloadEvent(
    kind:
      | 'pistol_start'
      | 'pistol_perfect'
      | 'pistol_jam'
      | 'pistol_done'
      | 'heavy_start'
      | 'heavy_done'
      | 'smg_vent'
      | 'smg_flash'
      | 'smg_overheat'
      | 'swap'
      | 'dry_fire'
  ): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    if (kind === 'dry_fire') {
      this.tone(1020, 420, 0.04, 0.16, 'square', now);
      return;
    }

    if (kind === 'swap') {
      this.tone(420, 740, 0.08, 0.15, 'triangle', now);
      this.tone(1040, 660, 0.06, 0.1, 'square', now + 0.05);
      return;
    }

    if (kind === 'pistol_start') {
      this.tone(760, 320, 0.07, 0.18, 'triangle', now);
      this.tone(360, 180, 0.12, 0.14, 'sawtooth', now + 0.06);
      return;
    }

    if (kind === 'pistol_perfect') {
      this.tone(240, 95, 0.09, 0.34, 'triangle', now);
      this.tone(660, 990, 0.12, 0.18, 'sine', now + 0.02);
      this.tone(1320, 1760, 0.18, 0.16, 'sine', now + 0.07);
      return;
    }

    if (kind === 'pistol_jam') {
      this.tone(160, 95, 0.18, 0.24, 'sawtooth', now);
      this.tone(290, 120, 0.12, 0.18, 'square', now + 0.04);
      return;
    }

    if (kind === 'pistol_done') {
      this.tone(540, 880, 0.07, 0.18, 'triangle', now);
      this.tone(920, 1240, 0.06, 0.14, 'square', now + 0.06);
      return;
    }

    if (kind === 'heavy_start') {
      // Heavy steel .50-cal box mag release clack
      this.tone(480, 190, 0.09, 0.26, 'square', now);
      this.tone(240, 110, 0.14, 0.24, 'triangle', now + 0.05);
      return;
    }

    if (kind === 'heavy_done') {
      // Authoritative heavy bolt-rack *CHAK-CLACK* chambering a massive .50 round!
      this.tone(640, 320, 0.07, 0.28, 'sawtooth', now);
      this.tone(1120, 520, 0.08, 0.24, 'square', now + 0.085);
      this.tone(185, 68, 0.1, 0.26, 'triangle', now + 0.09);
      return;
    }

    if (kind === 'smg_vent' || kind === 'smg_flash' || kind === 'smg_overheat') {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(kind === 'smg_flash' ? 3800 : 2800, now);
      filter.frequency.exponentialRampToValueAtTime(900, now + 0.52);
      filter.Q.value = 1.6;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.32, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.58);

      if (kind === 'smg_flash') {
        this.tone(880, 1760, 0.16, 0.18, 'sine', now + 0.03);
        this.tone(1320, 2200, 0.18, 0.14, 'sine', now + 0.1);
      } else if (kind === 'smg_overheat') {
        this.tone(720, 420, 0.14, 0.22, 'sawtooth', now);
        this.tone(720, 420, 0.14, 0.22, 'sawtooth', now + 0.18);
      }
    }
  }

  public playImpact(kind: 'metal' | 'critical' | 'concrete' | 'explosion'): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;

    if (kind === 'metal') {
      this.tone(1280 * jitter, 680 * jitter, 0.16, 0.22, 'triangle', now);
      this.tone(2640 * jitter, 1980 * jitter, 0.14, 0.14, 'sine', now);
      this.playHitmarker(false);
    } else if (kind === 'critical') {
      this.tone(1820 * jitter, 2480 * jitter, 0.18, 0.26, 'sine', now);
      this.tone(920 * jitter, 1340 * jitter, 0.14, 0.19, 'triangle', now + 0.018);
      this.playHitmarker(true);
    } else if (kind === 'concrete') {
      // Concrete stone smack + crisp gravel debris scatter
      this.tone(165 * jitter, 58, 0.06, 0.18, 'triangle', now);
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1450 * jitter, now);
      bp.frequency.exponentialRampToValueAtTime(520, now + 0.085);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      noise.connect(bp);
      bp.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.095);
    } else if (kind === 'explosion') {
      this.tone(155, 26, 0.48, 0.62, 'sawtooth', now);
      this.tone(82, 22, 0.42, 0.45, 'sine', now);
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, now);
      lp.frequency.exponentialRampToValueAtTime(160, now + 0.55);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.54, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      noise.connect(lp);
      lp.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.6);
      this.playHitmarker(true);
    }
  }

  public playFootstep(sprinting: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const jitter = 0.88 + Math.random() * 0.24;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime((sprinting ? 135 : 105) * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.065);
    gain.gain.setValueAtTime(sprinting ? 0.16 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playJumpLaunch(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    this.tone(135, 58, 0.08, 0.16, 'triangle', now);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(340, now);
    bp.frequency.exponentialRampToValueAtTime(1420, now + 0.14);
    bp.Q.value = 1.25;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.17);
  }

  public playLandingImpact(impactStrength: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const strength = Math.max(0.35, Math.min(1.0, impactStrength));

    this.tone(108 + strength * 24, 30, 0.11 + strength * 0.06, 0.18 + strength * 0.22, 'sine', now);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1250 + strength * 800, now);
    lp.frequency.exponentialRampToValueAtTime(240, now + 0.12);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.12 + strength * 0.14, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.14);

    if (strength > 0.55) {
      this.tone(1680, 1120, 0.045, 0.045 * strength, 'triangle', now + 0.03);
    }
  }

  public playCasingClink(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const freq = 4100 + Math.random() * 1450;
    this.tone(freq, freq * 0.86, 0.036, 0.055, 'sine', now);
  }

  /** Crisp tactical authorization chime when activating a Floor Control Center (`[E]`). */
  public playConsoleActivate(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    this.tone(620, 880, 0.08, 0.16, 'triangle', now);
    this.tone(880, 1320, 0.12, 0.18, 'sine', now + 0.075);
    this.tone(1320, 1760, 0.16, 0.14, 'sine', now + 0.17);
  }

  /**
   * Monumental multi-stage Massive Bulkhead Door opening sound:
   * 1. Heavy metallic locking bolt clank withdrawal
   * 2. Pressurized pneumatic hiss
   * 3. Deep 1.8s seismic steel-slab rumble as twin blast leaves slide apart!
   */
  public playBulkheadDoorOpen(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    // 1. Heavy steel lock bolt unlatching CLANK
    this.tone(420, 110, 0.12, 0.34, 'square', now);
    this.tone(920, 340, 0.09, 0.22, 'triangle', now + 0.06);

    // 2. Pressurized hydraulic hiss
    const hiss = this.ctx.createBufferSource();
    hiss.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1850, now + 0.14);
    bp.frequency.exponentialRampToValueAtTime(620, now + 1.15);
    bp.Q.value = 1.2;
    const hGain = this.ctx.createGain();
    hGain.gain.setValueAtTime(0.001, now + 0.14);
    hGain.gain.linearRampToValueAtTime(0.24, now + 0.24);
    hGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
    hiss.connect(bp);
    bp.connect(hGain);
    hGain.connect(this.masterGain);
    hiss.start(now + 0.14);
    hiss.stop(now + 1.3);

    // 3. Deep subterranean hydraulic blast-leaf grind rumble
    this.tone(72, 46, 1.55, 0.36, 'sawtooth', now + 0.24);
    this.tone(54, 34, 1.65, 0.42, 'triangle', now + 0.24);
  }

  /** Heavy hydraulic airlock blast-door seal shut + final magnetic lock slam. */
  public playBulkheadDoorClose(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    this.tone(64, 38, 1.25, 0.34, 'triangle', now);
    this.tone(96, 52, 1.15, 0.22, 'sawtooth', now + 0.04);

    // Final heavy containment slam & lock bolt engagement
    this.tone(128, 28, 0.22, 0.48, 'sine', now + 1.28);
    this.tone(560, 140, 0.11, 0.28, 'square', now + 1.32);
  }

  /** Clean sci-fi vertical Express Lift warp chime. */
  public playExpressLiftWarp(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    this.tone(240, 960, 0.42, 0.22, 'sine', now);
    this.tone(480, 1440, 0.38, 0.14, 'triangle', now + 0.05);
  }

  /** Smooth motorized interior tactical sliding door servo whir + pneumatic rail glide. */
  public playTacticalDoorSlide(opening: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    // Electric actuator latch click + smooth servo pitch sweep
    this.tone(opening ? 320 : 480, opening ? 540 : 210, 0.42, 0.12, 'triangle', now);
    this.tone(opening ? 140 : 180, opening ? 220 : 95, 0.52, 0.1, 'sine', now + 0.02);

    // Filtered pneumatic track glide hiss
    const hiss = this.ctx.createBufferSource();
    hiss.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(opening ? 1450 : 1120, now);
    bp.frequency.exponentialRampToValueAtTime(opening ? 680 : 480, now + 0.55);
    bp.Q.value = 1.6;
    const hGain = this.ctx.createGain();
    hGain.gain.setValueAtTime(0.001, now);
    hGain.gain.linearRampToValueAtTime(0.11, now + 0.08);
    hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    hiss.connect(bp);
    bp.connect(hGain);
    hGain.connect(this.masterGain);
    hiss.start(now);
    hiss.stop(now + 0.62);
  }

  /** Heavy metallic slam & electric motor stall stutter when a malfunctioning shutter jams halfway open! */
  public playJammedShutterClunk(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    // Metallic hard stop impact CLANK + resonant shudder
    this.tone(240, 58, 0.14, 0.36, 'square', now);
    this.tone(580, 145, 0.11, 0.24, 'sawtooth', now + 0.015);
    this.tone(135, 42, 0.22, 0.32, 'triangle', now + 0.04);

    // Brief electric motor strain stutter
    this.tone(360, 180, 0.07, 0.12, 'sawtooth', now + 0.15);
    this.tone(320, 140, 0.08, 0.1, 'sawtooth', now + 0.24);
  }

  /** Crisp pneumatic air-cannon upward whoosh + cybernetic boost chime for tactical Jump Pads! */
  public playJumpPadLaunch(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    this.tone(120, 680, 0.24, 0.26, 'triangle', now);
    this.tone(360, 1180, 0.22, 0.16, 'sine', now + 0.03);

    const blast = this.ctx.createBufferSource();
    blast.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520, now);
    bp.frequency.exponentialRampToValueAtTime(2400, now + 0.26);
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    blast.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    blast.start(now);
    blast.stop(now + 0.32);
  }

  /** Heavy telescoping steel hydraulic rumble + lock-in clank when deploying a Retractable Skybridge! */
  public playBridgeDeploy(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    this.tone(180, 92, 0.55, 0.22, 'sawtooth', now);
    this.tone(420, 680, 0.38, 0.12, 'triangle', now + 0.06);
    this.tone(140, 56, 0.18, 0.3, 'square', now + 1.05);
  }

  /** Electric arc snap + metallic shatter + unlock chirp when shooting a Security Relay Lock! */
  public playLockShatter(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    this.tone(1480, 220, 0.16, 0.28, 'sawtooth', now);
    this.tone(2400, 980, 0.12, 0.18, 'square', now + 0.02);
    this.tone(540, 1080, 0.18, 0.18, 'sine', now + 0.14);
    this.tone(820, 1420, 0.22, 0.16, 'sine', now + 0.22);
  }

  /** Heavy concussive plasma barrel detonation: sub-bass shockwave + roaring debris crackle! */
  public playBarrelExplosion(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    // Sub-bass shockwave punch
    this.tone(138, 28, 0.52, 0.55, 'sine', now);
    this.tone(92, 24, 0.65, 0.42, 'triangle', now + 0.02);
    this.tone(360, 62, 0.22, 0.3, 'sawtooth', now);

    // Filtered concussive blast roar
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, now);
    lp.frequency.exponentialRampToValueAtTime(140, now + 0.78);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.46, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.86);
  }

  /** Tactile double low-tone rejection buzz when interacting with a sealed security gate. */
  public playLockedBuzzer(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    this.tone(190, 155, 0.09, 0.18, 'sawtooth', now);
    this.tone(170, 130, 0.11, 0.18, 'sawtooth', now + 0.12);
  }

  /** Visceral ceramic-weave armor crunch + sub-bass body thump when operative is struck! */
  public playPlayerHitArmor(strength = 0.65): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.55, 0.24 + strength * 0.26);
    this.tone(145, 36, 0.16, vol, 'sine', now);
    this.tone(420, 130, 0.09, vol * 0.72, 'sawtooth', now);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1600, now);
    bp.frequency.exponentialRampToValueAtTime(420, now + 0.11);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(vol * 0.78, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.13);
  }

  /** Crisp electric EMP shatter + resonant high crit chime when breaking an enemy weakpoint! */
  public playWeakpointBreak(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    this.tone(240, 62, 0.28, 0.42, 'sawtooth', now);
    this.tone(1320, 2640, 0.16, 0.26, 'sine', now);
    this.tone(1980, 960, 0.24, 0.22, 'triangle', now + 0.05);
    this.playHitmarker(true);
  }

  /** Unmistakable rising tactical telegraph warning for melee lunges, Iaijutsu glints, rail charges, shield charges, mortars, and boss slams. */
  public playEnemyTelegraph(
    kind:
      | 'melee'
      | 'mortar'
      | 'boss_slam'
      | 'dash'
      | 'iaijutsu_glint'
      | 'booster_burst'
      | 'rail_charge'
      | 'shield_charge'
      | 'shield_slam'
      | 'warden_vent'
      | 'pyro_flare'
      | 'kestrel_overdrive'
  ): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    if (kind === 'boss_slam') {
      // Valkyrie jet-turbine apex roar + seismic golden ground-slam resonance!
      this.tone(180, 740, 0.44, 0.3, 'sawtooth', now);
      this.tone(95, 360, 0.48, 0.28, 'triangle', now + 0.04);
      this.tone(520, 1180, 0.32, 0.16, 'sine', now + 0.08);
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(520, now);
        bp.frequency.exponentialRampToValueAtTime(2200, now + 0.46);
        bp.Q.value = 1.2;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.06, now);
        g.gain.linearRampToValueAtTime(0.34, now + 0.36);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.54);
      }
    } else if (kind === 'kestrel_overdrive') {
      // Iconic mechanical archangel wing-flare hydraulic snap + golden turbine chord!
      this.tone(240, 960, 0.42, 0.24, 'sawtooth', now);
      this.tone(480, 1440, 0.38, 0.18, 'triangle', now + 0.03);
      this.tone(720, 1920, 0.34, 0.14, 'sine', now + 0.06);
      this.tone(130, 54, 0.26, 0.34, 'sine', now + 0.12);
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.setValueAtTime(1200, now);
        hp.frequency.exponentialRampToValueAtTime(3400, now + 0.38);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.28, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        src.connect(hp);
        hp.connect(g);
        g.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.44);
      }
    } else if (kind === 'warden_vent') {
      // Hydraulic dorsal pylon pop + pressurized thermal-capacitor hiss chime!
      this.tone(420, 1280, 0.14, 0.2, 'triangle', now);
      this.tone(1680, 920, 0.22, 0.14, 'sine', now + 0.05);
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.setValueAtTime(2800, now);
        hp.frequency.exponentialRampToValueAtTime(980, now + 0.36);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.24, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        src.connect(hp);
        hp.connect(g);
        g.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.4);
      }
    } else if (kind === 'shield_charge') {
      // Heavy exo-suit turbine spool-up + deep juggernaut horn warning!
      this.tone(92, 240, 0.58, 0.32, 'sawtooth', now);
      this.tone(185, 620, 0.52, 0.2, 'triangle', now + 0.05);
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(320, now);
        bp.frequency.exponentialRampToValueAtTime(1650, now + 0.55);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.06, now);
        g.gain.linearRampToValueAtTime(0.32, now + 0.48);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.64);
      }
    } else if (kind === 'shield_slam') {
      // Seismic tungsten tower-shield ground slam boom + metallic shockwave ring!
      this.tone(140, 26, 0.38, 0.52, 'sine', now);
      this.tone(260, 48, 0.32, 0.36, 'sawtooth', now);
      this.tone(1280, 420, 0.28, 0.18, 'triangle', now + 0.02);
      this.triggerBayTail(now, 0.24, 980, 0.32);
    } else if (kind === 'iaijutsu_glint') {
      // Iconic Sekiro / MGR chilling high-frequency katana-sheathe peril ring + sub-bass dread pulse!
      this.tone(1980, 3160, 0.24, 0.24, 'sine', now);
      this.tone(2940, 1480, 0.36, 0.16, 'triangle', now + 0.03);
      this.tone(110, 52, 0.34, 0.28, 'sawtooth', now);
    } else if (kind === 'rail_charge') {
      // Rising electromagnetic railgun capacitor whine + crisp targeting lock double-chirp!
      this.tone(420, 2150, 0.58, 0.22, 'sawtooth', now);
      this.tone(840, 3200, 0.54, 0.14, 'sine', now + 0.04);
      this.tone(2640, 2640, 0.06, 0.18, 'square', now + 0.42);
    } else if (kind === 'booster_burst') {
      // Pressurized dorsal thruster jet ignition roar
      this.tone(260, 95, 0.18, 0.24, 'sawtooth', now);
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1400, now);
        bp.frequency.exponentialRampToValueAtTime(340, now + 0.22);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.32, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.25);
      }
    } else if (kind === 'pyro_flare') {
      // Pressurized thermite valve warning whistle + roaring propane furnace ignition whoosh!
      this.tone(720, 1480, 0.36, 0.22, 'sawtooth', now);
      this.tone(185, 92, 0.42, 0.3, 'triangle', now + 0.04);
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(480, now);
        bp.frequency.exponentialRampToValueAtTime(1950, now + 0.42);
        bp.Q.value = 1.1;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.05, now);
        g.gain.linearRampToValueAtTime(0.36, now + 0.32);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.5);
      }
    } else if (kind === 'mortar') {
      // Heavy 40mm Vulcan drum-click + rising pneumatic mortar pressure spool!
      this.tone(180, 420, 0.26, 0.24, 'triangle', now);
      this.tone(420, 740, 0.22, 0.16, 'sine', now + 0.05);
    } else if (kind === 'dash') {
      // High-tech kinetic flash-dash electric zip + pneumatic snap!
      this.tone(1180, 340, 0.18, 0.24, 'sawtooth', now);
      this.tone(2200, 740, 0.14, 0.16, 'sine', now + 0.01);
    } else {
      this.tone(440, 1180, 0.24, 0.22, 'sawtooth', now);
    }
  }

  /** High-frequency plasma katana whip-slash sound (razor air-slice + HF hum). */
  public playKatanaSlash(heavy = false): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;
    this.tone((heavy ? 1420 : 1780) * jitter, heavy ? 280 : 440, heavy ? 0.24 : 0.15, heavy ? 0.26 : 0.18, 'sawtooth', now);
    this.tone((heavy ? 760 : 980) * jitter, 220, heavy ? 0.26 : 0.16, 0.18, 'triangle', now + 0.01);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime((heavy ? 2400 : 3200) * jitter, now);
    bp.frequency.exponentialRampToValueAtTime(480, now + (heavy ? 0.24 : 0.15));
    bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(heavy ? 0.42 : 0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.25 : 0.16));
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.27);
  }

  /** Dramatic molten katana wall/floor gouge: screaming steel-on-concrete screech + heavy spark burst! */
  public playKatanaWallCarve(heavy = false): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;
    // Heavy kinetic gouge thud
    this.tone(180 * jitter, 42, heavy ? 0.28 : 0.18, heavy ? 0.46 : 0.34, 'sine', now);
    // Screaming high-frequency thermal blade scraping steel/concrete
    this.tone(3600 * jitter, 1450 * jitter, heavy ? 0.32 : 0.22, heavy ? 0.24 : 0.18, 'sawtooth', now);
    this.tone(4800 * jitter, 2350 * jitter, heavy ? 0.26 : 0.16, 0.14, 'square', now + 0.02);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2800 * jitter, now);
    hp.frequency.exponentialRampToValueAtTime(860, now + 0.28);
    hp.Q.value = 1.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(heavy ? 0.44 : 0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.32);
  }

  /** Distinct enemy gunfire signatures so the player reads threat types by ear. */
  public playEnemyFire(kind: 'rifle' | 'rail_slug' | 'smg' | 'shotgun' | 'mortar' | 'boss_carbine'): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;
    if (kind === 'rail_slug') {
      // Thunderous electromagnetic rail-slug supersonic whip-crack + sub-bass cannon punch!
      this.tone(165 * jitter, 28, 0.24, 0.44, 'triangle', now);
      this.tone(2400 * jitter, 320, 0.18, 0.28, 'sawtooth', now);
      this.tone(3800 * jitter, 980, 0.12, 0.18, 'square', now + 0.01);
      this.triggerBayTail(now, 0.2, 1800, 0.28);
    } else if (kind === 'shotgun') {
      // Heavy M90-H Sledgehammer auto-shotgun flak boom + indoor bay punch!
      this.tone(195 * jitter, 42, 0.22, 0.42, 'sawtooth', now);
      this.tone(110, 32, 0.24, 0.36, 'triangle', now);
      this.triggerBayTail(now, 0.18, 1250, 0.26);
    } else if (kind === 'mortar') {
      // Deep 40mm heavy pneumatic mortar THUMP + incandescent thermal blast tail!
      this.tone(148 * jitter, 34, 0.32, 0.46, 'sine', now);
      this.tone(310 * jitter, 82, 0.22, 0.28, 'sawtooth', now);
      this.tone(520 * jitter, 180, 0.14, 0.16, 'triangle', now + 0.01);
      this.triggerBayTail(now, 0.22, 920, 0.3);
    } else if (kind === 'smg') {
      this.tone(680 * jitter, 240, 0.06, 0.14, 'square', now);
    } else if (kind === 'boss_carbine') {
      // Sovereign-8 Overdrive Pulse Carbine: punchy magnetic rail-pulse snap + resonant hall tail
      this.tone(185 * jitter, 46, 0.12, 0.32, 'triangle', now);
      this.tone(460 * jitter, 118, 0.11, 0.26, 'sawtooth', now);
      this.tone(1040 * jitter, 340, 0.08, 0.16, 'square', now + 0.008);
      this.triggerBayTail(now, 0.12, 1450, 0.18);
    } else {
      this.tone(520 * jitter, 175, 0.09, 0.18, 'sawtooth', now);
    }
  }

  /** Dramatic 2-pulse facility breach / Floor Boss arrival klaxon! */
  public playBossAlert(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    this.tone(180, 140, 0.34, 0.32, 'sawtooth', now);
    this.tone(360, 280, 0.34, 0.22, 'triangle', now);
    this.tone(180, 130, 0.42, 0.34, 'sawtooth', now + 0.42);
    this.tone(360, 260, 0.42, 0.24, 'triangle', now + 0.42);
  }

  /** Clean crisp confirmation chime for Floor 08 Tutorial step progression. */
  public playTutorialStepComplete(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    this.tone(660, 880, 0.09, 0.16, 'sine', now);
    this.tone(990, 1320, 0.12, 0.16, 'sine', now + 0.07);
  }

  private tone(
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    startTime: number
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
