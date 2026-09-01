// Web Audio API Acoustic Siren Synthesizer for Law Enforcement Surveillance

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Plays an urgent acoustic alarm tailored to the risk score of the spotted vehicle.
 * @param riskScore - Numerical risk score from 0 to 100
 */
export const playRiskAlertSiren = (riskScore: number = 95) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (riskScore >= 80) {
      // 🚨 CRITICAL APB POLICE SIREN (High Urgency Dual-Tone Siren: 800Hz <-> 1250Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.18, now);

      // Modulate frequency like police intercept siren
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.15);
      osc.frequency.linearRampToValueAtTime(750, now + 0.3);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.45);
      osc.frequency.linearRampToValueAtTime(750, now + 0.6);

      gain.gain.linearRampToValueAtTime(0.18, now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } else if (riskScore >= 50) {
      // ⚠️ HIGH THREAT DOUBLE CHIRP (660Hz -> 920Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(660, now);
      osc1.frequency.linearRampToValueAtTime(920, now + 0.12);

      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.2);

      // Second pulse
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(720, now + 0.15);
      osc2.frequency.linearRampToValueAtTime(1020, now + 0.27);

      gain2.gain.setValueAtTime(0.15, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.15);
      osc2.stop(now + 0.35);
    } else {
      // ℹ️ LOW RISK NOTIFICATION CHIME (520Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Soft ignore if audio context blocked by browser autoplay policy
  }
};
