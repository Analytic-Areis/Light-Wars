/**
 * Light-Wars: Web Audio Synthesizer
 * Procedural retro/arcade audio engine with comic punch.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.6;
    this.initialized = false;

    // Procedural Space Synthwave Background Music System
    this.musicPlaying = false;
    this.musicTrack = null; // 'EXPLORATION' | 'COMBAT' | 'BOSS'
    this.musicNextStepTime = 0;
    this.musicStep = 0;
    this.musicBpm = 110;
    this.musicTimerId = null;
    this.musicActiveNodes = [];
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext init failed:", e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (!this.initialized) this.init();
    if (this.sfxGain && this.ctx) {
      try {
        this.sfxGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      } catch (e) {
        this.sfxGain.gain.value = this.sfxVolume;
      }
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (!this.initialized) this.init();
    if (this.musicGain && this.ctx) {
      try {
        this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      } catch (e) {
        this.musicGain.gain.value = this.musicVolume;
      }
    }
    // If music volume turned up and not currently playing, start music
    if (this.musicVolume > 0 && !this.musicPlaying) {
      this.startMusic();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Space Synthwave & Cosmic Void Background Music Engine
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Start or switch background space music:
   * trackMode: 'MENU' (Comic Strip Hub) | 'EXPLORATION' (Level 1 Tutorial / Deep Space) | 'COMBAT' (Level 2 RGB) | 'BOSS' (Level 3 Void Overlord)
   */
  startMusic(trackMode = 'EXPLORATION') {
    this.resume();
    if (!this.ctx) return;

    if (this.musicPlaying && this.musicTrack === trackMode) {
      return;
    }

    this.stopMusic();
    this.musicPlaying = true;
    this.musicTrack = trackMode;
    this.musicStep = 0;
    this.musicNextStepTime = this.ctx.currentTime + 0.05;

    // Restore musicGain to user's chosen volume
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }

    // Cinematic 6/8 meter feel: 74 BPM for Menu, 84-96 BPM for gameplay
    if (trackMode === 'BOSS') {
      this.musicBpm = 96; // Driving, apocalyptic void war
    } else if (trackMode === 'COMBAT') {
      this.musicBpm = 90; // High-tension chromatic battle
    } else if (trackMode === 'MENU') {
      this.musicBpm = 74; // Ominous, grand, atmospheric main menu prologue
    } else {
      this.musicBpm = 84; // Brooding, stately space exploration
    }

    this._scheduleMusic();
  }

  stopMusic(fadeDuration = 0.05) {
    this.musicPlaying = false;
    if (this.musicTimerId) {
      clearTimeout(this.musicTimerId);
      this.musicTimerId = null;
    }

    // Fast, immediate fade-out on the background music bus
    if (this.musicGain && this.ctx) {
      try {
        const t = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(t);
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
        this.musicGain.gain.linearRampToValueAtTime(0.001, t + fadeDuration);
      } catch (e) {
        this.musicGain.gain.value = 0;
      }
    }

    // Immediately stop and disconnect all scheduled/playing music oscillators
    const nodes = this.musicActiveNodes;
    this.musicActiveNodes = [];
    for (const node of nodes) {
      try {
        if (node.stop) {
          node.stop(this.ctx ? this.ctx.currentTime + fadeDuration : 0);
        }
      } catch (e) {}
    }
  }

  _scheduleMusic() {
    if (!this.musicPlaying || !this.ctx) return;

    // 6/8 Meter: 6 eighth-note pulses per measure, divided into sixteenth notes (12 steps per bar)
    // Step duration = duration of 1 sixteenth note in 6/8
    const stepDuration = (60 / this.musicBpm) / 4; 
    const scheduleAheadTime = 0.25;

    while (this.musicNextStepTime < this.ctx.currentTime + scheduleAheadTime) {
      this._playMusicStep(this.musicStep, this.musicNextStepTime, stepDuration);
      this.musicNextStepTime += stepDuration;
      // 4-measure cycle in 6/8 = 4 * 12 = 48 sixteenth notes
      this.musicStep = (this.musicStep + 1) % 48;
    }

    this.musicTimerId = setTimeout(() => this._scheduleMusic(), 50);
  }

  _playMusicStep(step, time, stepDur) {
    if (this.isMuted || this.musicVolume <= 0) return;

    const isBoss = this.musicTrack === 'BOSS';
    const isCombat = this.musicTrack === 'COMBAT';
    const isMenu = this.musicTrack === 'MENU';

    // Measure index (0, 1, 2, 3) in 48-step loop (12 steps per 6/8 bar)
    const bar = Math.floor(step / 12);
    const stepInBar = step % 12;

    // 1. Epic War Taiko Drums / Cinematic Percussion:
    // In MENU mode, softer, distant deep reverberating pulse for suspense
    if (isMenu) {
      if (stepInBar === 0) {
        this._playTaikoDrum(time, 0.65, false);
      } else if (stepInBar === 6) {
        this._playTaikoDrum(time, 0.45, false);
      }
    } else {
      if (stepInBar === 0) {
        this._playTaikoDrum(time, 1.0, isBoss); // Powerful resonant root strike
      } else if (stepInBar === 6) {
        this._playTaikoDrum(time, 0.75, isBoss); // Secondary heavy strike
      } else if (stepInBar === 4 || stepInBar === 10) {
        // Galloping battle rim accent
        this._playCinematicRim(time, isCombat || isBoss);
      }
    }

    // Shaker / war rattle pulse on alternating 16ths
    if (!isMenu && stepInBar % 2 === 0) {
      this._playRattle(time, stepInBar === 0 || stepInBar === 6);
    }

    // 2. Game of Thrones Signature Ostinato (Driving Cello / Dark Synth String Ostinato)
    // Pattern: 6/8 Triple feel rolling arpeggiation (Ta-ki-ta Ta-ki-ta)
    // Harmonized in C Minor:
    // Bar 0: C Minor (C3 - G3 - C3 - Eb3 - D3 - C3)
    // Bar 1: Ab Major (Ab2 - Eb3 - Ab2 - C3 - Bb2 - Ab2)
    // Bar 2: F Minor (F2 - C3 - F2 - Ab2 - G2 - F2)
    // Bar 3: G Dominant / Dim (G2 - D3 - G2 - B2 - C3 - D3)
    const ostinatoChords = [
      // Bar 0: Cm (C3=130.81, G3=196.00, Eb3=155.56, D3=146.83)
      [130.81, 196.00, 130.81, 155.56, 146.83, 130.81],
      // Bar 1: Ab (Ab2=103.83, Eb3=155.56, C3=130.81, Bb2=116.54)
      [103.83, 155.56, 103.83, 130.81, 116.54, 103.83],
      // Bar 2: Fm (F2=87.31, C3=130.81, Ab2=103.83, G2=98.00)
      [87.31, 130.81, 87.31, 103.83, 98.00, 87.31],
      // Bar 3: Gsus / G (G2=98.00, D3=146.83, B2=123.47, C3=130.81)
      [98.00, 146.83, 98.00, 123.47, 130.81, 146.83]
    ];

    if (stepInBar % 2 === 0) {
      const subIdx = Math.floor(stepInBar / 2);
      const chordNotes = ostinatoChords[bar % 4];
      const noteFreq = chordNotes[subIdx % 6];
      this._playCelloOstinato(time, noteFreq, stepDur * 1.85, isBoss);
    }

    // 3. Iconic Melodic Lead: Mournful, Majestic Solo Cello / Horn Melody
    // Inspired by GoT: Long, expressive minor-scale cello motifs that rise and resolve
    // Bar 0: C4 (261.63) -> Eb4 (311.13)
    // Bar 1: F4 (349.23) -> G4 (392.00) -> Eb4 (311.13)
    // Bar 2: D4 (293.66) -> C4 (261.63)
    // Bar 3: B3 (246.94) -> C4 (261.63)
    if (stepInBar === 0 || stepInBar === 6) {
      let leadFreq = 0;
      let leadDur = stepDur * 5.6;

      if (bar === 0) {
        leadFreq = (stepInBar === 0) ? 261.63 : 311.13; // C4 -> Eb4
      } else if (bar === 1) {
        leadFreq = (stepInBar === 0) ? 349.23 : 392.00; // F4 -> G4
      } else if (bar === 2) {
        leadFreq = (stepInBar === 0) ? 311.13 : 293.66; // Eb4 -> D4
      } else if (bar === 3) {
        leadFreq = (stepInBar === 0) ? 246.94 : 261.63; // B3 -> C4
      }

      if (leadFreq > 0) {
        this._playMajesticLead(time, leadFreq, leadDur, isBoss);
      }
    }

    // 4. Low French Horn / Synth Brass Swell & Dark Sub Drone
    // Root notes sustained under each bar: C2=65.4, Ab1=51.9, F1=43.6, G1=49.0
    if (stepInBar === 0) {
      const bassRoots = [65.41, 51.91, 43.65, 49.00];
      const root = bassRoots[bar % 4];
      this._playDarkBrassDrone(time, root, stepDur * 11.5, isBoss);
    }

    // 5. Ominous Choir Pad: Minor third / fifth harmony swelling in background
    if (stepInBar === 0) {
      const choirChords = [
        [130.81, 155.56, 196.00], // Cm
        [103.83, 130.81, 155.56], // Ab
        [87.31, 103.83, 130.81],  // Fm
        [98.00, 123.47, 146.83]   // G
      ];
      this._playDarkChoirPad(time, choirChords[bar % 4], stepDur * 11.8);
    }
  }

  // ── Cinematic Instruments ──────────────────────────────────────────────────

  _trackMusicNode(node) {
    this.musicActiveNodes.push(node);
    node.onended = () => {
      const idx = this.musicActiveNodes.indexOf(node);
      if (idx !== -1) this.musicActiveNodes.splice(idx, 1);
    };
    return node;
  }

  _playTaikoDrum(time, velocity = 1.0, isHeavy = false) {
    if (!this.ctx || !this.musicGain) return;

    // Resonant sub-membrane
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = isHeavy ? 92 : 80;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(28, time + 0.28);

    const vol = (isHeavy ? 0.40 : 0.30) * velocity;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    osc.connect(gain);
    gain.connect(this.musicGain);

    this._trackMusicNode(osc);
    osc.start(time);
    osc.stop(time + 0.34);

    // Leather strike transient
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, time);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.25 * velocity, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.musicGain);

    this._trackMusicNode(noise);
    noise.start(time);
    noise.stop(time + 0.06);
  }

  _playCinematicRim(time, isAccent) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isAccent ? 380 : 280, time);
    osc.frequency.exponentialRampToValueAtTime(110, time + 0.08);

    gain.gain.setValueAtTime(isAccent ? 0.16 : 0.10, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(gain);
    gain.connect(this.musicGain);
    this._trackMusicNode(osc);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  _playRattle(time, isDownbeat) {
    if (!this.ctx || !this.musicGain) return;
    const dur = isDownbeat ? 0.06 : 0.035;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, time);
    filter.Q.setValueAtTime(2.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isDownbeat ? 0.08 : 0.045, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    this._trackMusicNode(noise);
    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  // GoT-style rolling cello ostinato with warm body resonance
  _playCelloOstinato(time, freq, dur, isHeavy) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Sawtooth filtered gives a rich string/cello timbre
    osc.type = isHeavy ? 'sawtooth' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Resonant string body formant filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHeavy ? 650 : 500, time);
    filter.Q.setValueAtTime(2.5, time);

    // Natural bowed string envelope (quick attack, sustained resonance, gentle decay)
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
    gain.gain.setValueAtTime(0.15, time + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    this._trackMusicNode(osc);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // Majestic Solo Cello / French Horn Lead with expressive vibrato
  _playMajesticLead(time, freq, dur, isBoss) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Expressive vibrato after initial onset
    const vibOsc = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vibOsc.frequency.setValueAtTime(5.5, time); // 5.5 Hz vibrato
    vibGain.gain.setValueAtTime(0.001, time);
    vibGain.gain.linearRampToValueAtTime(freq * 0.025, time + 0.35); // Gentle vibrato depth

    vibOsc.connect(osc.frequency);

    // Warm orchestral horn/cello formant
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, time);
    filter.Q.setValueAtTime(2.0, time);

    // Expressive swell envelope
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.12);
    gain.gain.setValueAtTime(0.20, time + dur * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    this._trackMusicNode(osc);
    this._trackMusicNode(vibOsc);
    osc.start(time);
    vibOsc.start(time);
    osc.stop(time + dur + 0.05);
    vibOsc.stop(time + dur + 0.05);
  }

  // Deep Brass Drone (French Horn / Tuba & Sub Synth Bass)
  _playDarkBrassDrone(time, freq, dur, isHeavy) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, time); // Sub-octave power

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHeavy ? 350 : 250, time);
    filter.frequency.linearRampToValueAtTime(isHeavy ? 450 : 320, time + dur * 0.5);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.24, time + 0.3);
    gain.gain.setValueAtTime(0.22, time + dur - 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    this._trackMusicNode(osc);
    this._trackMusicNode(subOsc);
    osc.start(time);
    subOsc.start(time);
    osc.stop(time + dur + 0.05);
    subOsc.stop(time + dur + 0.05);
  }

  // Ominous Dark Choir Pad
  _playDarkChoirPad(time, frequencies, dur) {
    if (!this.ctx || !this.musicGain) return;
    frequencies.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, time);
      filter.Q.setValueAtTime(1.5, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.055, time + 0.6);
      gain.gain.setValueAtTime(0.055, time + dur - 0.7);
      gain.gain.linearRampToValueAtTime(0.001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      this._trackMusicNode(osc);
      osc.start(time);
      osc.stop(time + dur + 0.08);
    });
  }

  // Laser shot sound - chromatic pitch based on laser color
  playLaser(colorId) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const pitches = {
      RED: 440,
      GREEN: 523.25,
      BLUE: 659.25,
      CYAN: 783.99,
      MAGENTA: 880,
      YELLOW: 987.77,
      WHITE: 1174.66
    };
    const baseFreq = pitches[colorId] || 500;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Comic Explosion / Enemy Death
  playComicDeath() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.28;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.28);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    noise.start(t);
    noise.stop(t + 0.3);

    // Punch sub-oscillator
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(180, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain || this.masterGain);

    subOsc.start(t);
    subOsc.stop(t + 0.26);
  }

  // Enemy Color Transform chime
  playTransform() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + idx * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.19);
    });
  }

  // Orb spawn sound
  playOrbSpawn() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.2);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  // Orb + Laser conversion into new ammo
  playOrbConvert() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + idx * 0.05;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.21);
    });
  }

  // Dialogue card advance chime
  playDialogueAdvance() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08); // A5
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // White Light Refill
  playRefill() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  // Player Dash
  playDash() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Player Hit
  playPlayerHurt() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(70, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  // Level Clear Fanfare
  playVictory() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const delays = [0, 0.12, 0.24, 0.36, 0.52];

    delays.forEach((delay, idx) => {
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[idx], t);

      const dur = (idx === delays.length - 1) ? 0.6 : 0.2;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  playLaserFire(colorId) {
    return this.playLaser(colorId);
  }

  playKaboom() {
    return this.playComicDeath();
  }

  playEmpty() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Player Death Sound: Dramatic downward pitch distortion, heavy low rumble, and eerie fading minor chords
  playPlayerDeath() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Heavy resonant impact thud
    const impactOsc = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();
    impactOsc.type = 'triangle';
    impactOsc.frequency.setValueAtTime(160, t);
    impactOsc.frequency.exponentialRampToValueAtTime(25, t + 0.6);

    impactGain.gain.setValueAtTime(0.75, t);
    impactGain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);

    impactOsc.connect(impactGain);
    impactGain.connect(this.sfxGain || this.masterGain);
    impactOsc.start(t);
    impactOsc.stop(t + 0.7);

    // 2. Shattering noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(50, t + 0.4);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.6, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain || this.masterGain);
    noise.start(t);
    noise.stop(t + 0.42);

    // 3. Somber, descending death tolls (C4 -> G#3 -> G3 -> D#3)
    const deathNotes = [261.63, 207.65, 196.00, 155.56];
    deathNotes.forEach((freq, idx) => {
      const noteTime = t + 0.12 + idx * 0.22;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, noteTime + 0.45);

      const noteFilter = this.ctx.createBiquadFilter();
      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(550, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.45, noteTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);

      osc.connect(noteFilter);
      noteFilter.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.52);
    });
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.sound = new SoundEngine();
