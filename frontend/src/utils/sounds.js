let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playNote(c, freq, time, duration, vol = 0.2, type = 'triangle') {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, time)
  gain.gain.setValueAtTime(vol, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
  osc.start(time)
  osc.stop(time + duration + 0.01)
}

// Deep thump when pressing the open button
export function playClick() {
  try {
    const c = getCtx()
    const t = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(110, t)
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09)
    gain.gain.setValueAtTime(0.45, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.start(t)
    osc.stop(t + 0.11)
  } catch (_) {}
}

// Deep low thud per card crossing the center
export function playTick() {
  try {
    const c = getCtx()
    const t = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, t)
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.035)
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    osc.start(t)
    osc.stop(t + 0.045)
  } catch (_) {}
}

// Rarity rank for reveal sound scaling
const REVEAL_RANK = {
  Common: 0, Unusual: 0, Uncommon: 1, Superior: 2,
  Rare: 3, Mystic: 4, Epic: 5, Ancient: 6,
  Legendary: 7, Divine: 8, Mythic: 9, Celestial: 10, Transcendent: 11,
  Ethereal: 11, Cosmic: 11, Omnipotent: 11, Singularity: 11,
}

// Deep horn-like fanfare that scales with rarity
// Notes are all in the low register (C3=130, E3=165, G3=196, C4=262, E4=330, G4=392)
export function playReveal(rarity) {
  try {
    const c = getCtx()
    const t = c.currentTime
    const rank = REVEAL_RANK[rarity] ?? 0

    if (rank === 0) {
      playNote(c, 131, t, 0.5, 0.18)
    } else if (rank <= 2) {
      playNote(c, 131, t, 0.55, 0.20)
      playNote(c, 165, t + 0.13, 0.55, 0.20)
    } else if (rank <= 4) {
      playNote(c, 131, t, 0.65, 0.22)
      playNote(c, 165, t + 0.10, 0.65, 0.22)
      playNote(c, 196, t + 0.22, 0.75, 0.22)
    } else if (rank <= 6) {
      playNote(c, 131, t, 0.75, 0.25)
      playNote(c, 165, t + 0.09, 0.75, 0.25)
      playNote(c, 196, t + 0.19, 0.85, 0.25)
      playNote(c, 262, t + 0.31, 0.95, 0.26)
    } else if (rank <= 8) {
      playNote(c, 131, t, 0.85, 0.28)
      playNote(c, 165, t + 0.08, 0.85, 0.28)
      playNote(c, 196, t + 0.17, 0.95, 0.28)
      playNote(c, 262, t + 0.27, 1.05, 0.30)
      playNote(c, 330, t + 0.40, 1.15, 0.30)
    } else {
      // Epic low fanfare for Mythic/Celestial/Transcendent
      playNote(c, 98,  t,        0.9, 0.30)   // G2 sub bass
      playNote(c, 131, t + 0.06, 1.0, 0.30)
      playNote(c, 165, t + 0.13, 1.0, 0.30)
      playNote(c, 196, t + 0.21, 1.1, 0.30)
      playNote(c, 262, t + 0.31, 1.2, 0.32)
      playNote(c, 330, t + 0.44, 1.4, 0.32)
      // Sustain chord landing
      setTimeout(() => {
        const t2 = c.currentTime
        playNote(c, 98,  t2, 1.5, 0.28)
        playNote(c, 131, t2, 1.5, 0.26)
        playNote(c, 196, t2, 1.5, 0.24)
        playNote(c, 262, t2, 1.5, 0.22)
      }, 600)
    }
  } catch (_) {}
}
