"use client";

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private warmupInterval: NodeJS.Timeout | null = null;

  private initCtx() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Suara ketukan (tick) saat roda berputar melewati segmen
   */
  public playTick(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800 * pitchMultiplier, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  /**
   * Suara fanfare keriaan kemenangan saat pemenang keluar
   */
  public playFanfare() {
    this.playCeremonialChime();
  }

  /**
   * Suara Grand Reveal Pemenang:
   * 1. Cinematic Sub-Boom (dentuman bass panggung megah meluncur turun)
   * 2. Grand Ceremonial Chime Fanfare (paduan kristal lonceng D Mayor 9 berkumandang megah)
   */
  public playWinnerRevealSound() {
    this.stopWarmupSound();
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Cinematic Sub-Boom Impact (Dentuman Bass Panggung)
      const boomOsc = ctx.createOscillator();
      const boomGain = ctx.createGain();

      boomOsc.type = "sine";
      boomOsc.frequency.setValueAtTime(150, now);
      boomOsc.frequency.exponentialRampToValueAtTime(32, now + 0.8);

      boomGain.gain.setValueAtTime(0.38, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      boomOsc.connect(boomGain);
      boomGain.connect(ctx.destination);

      boomOsc.start(now);
      boomOsc.stop(now + 1.5);

      // 2. Grand Fanfare Chime Chord (D Mayor 9 + Shimmer)
      const frequencies = [293.66, 369.99, 440.0, 554.37, 659.25, 880.0, 1108.73];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        const startTime = now + 0.08 + idx * 0.04;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.22 / (idx * 0.25 + 1), startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 2.9);
      });
    } catch {
      // Audio context might be restricted
    }
  }

  /**
   * Suara Panggung Seremonial Mewah (Crystal Chime Chord + Brass Swell)
   */
  public playCeremonialChime() {
    this.stopWarmupSound();
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Akord Mewah D Mayor 9 (D4, F#4, A4, C#5, E5, A5)
      const frequencies = [293.66, 369.99, 440.0, 554.37, 659.25, 880.0];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Sine murni dengan overtone hangat seperti lonceng kristal panggung
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.18 / (idx * 0.3 + 1), now + idx * 0.05 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 2.3);
      });
    } catch {
      // Audio context might be restricted
    }
  }

  /**
   * Suara Cinematic Whoosh / Reel Sweep saat kartu bergeser
   */
  public playCinematicSweep(pitch: number = 1.0) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(450 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Audio context might be restricted
    }
  }

  /**
   * Suara Pemanasan / Anticipation Drumroll Ticking (Warmup 0ms saat tombol ditekan)
   */
  public startWarmupSound() {
    if (this.isMuted) return;
    this.stopWarmupSound();
    let tickCount = 0;
    // Mainkan tick pembuka seketika
    this.playTick(0.85);

    this.warmupInterval = setInterval(() => {
      tickCount++;
      // Ketukan ritmis drumroll dengan modulasi lembut
      const pitch = 0.8 + ((tickCount % 4) * 0.08);
      this.playTick(pitch);
    }, 115);
  }

  public stopWarmupSound() {
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
      this.warmupInterval = null;
    }
  }
}

export const soundEffects = new SoundManager();

