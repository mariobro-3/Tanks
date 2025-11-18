import './style.css'

// --- Types ---
type Vector = { x: number; y: number }

type ControlType = 'human' | 'easy' | 'medium' | 'hard'

type Tank = {
  position: Vector
  angleDeg: number
  power: number
  color: string
  alive: boolean
  control: ControlType
  score: number
  health: number
  maxHealth: number
  fuel: number
  maxFuel: number
}

type Projectile = {
  position: Vector
  velocity: Vector
  previous: Vector
  active: boolean
  ownerIndex: number
  kind: WeaponKind
  scatterCountdown?: number
  ageFrames: number
}

type Terrain = {
  width: number
  height: number
  samples: number[] // ground height for each x
}

type WeaponKind = 'shell' | 'missile' | 'scatter' | 'nuke' | 'laser'

type Particle = {
  position: Vector
  velocity: Vector
  life: number
  maxLife: number
  color: string
  size: number
}

type GameState = {
  terrain: Terrain
  tanks: Tank[]
  projectile: Projectile | null
  particles: Particle[]
  currentPlayerIndex: number
  gravity: number
  wind: number
  landscape: 'earth' | 'moon' | 'mars'
  weapon: WeaponKind
}

// --- Utils ---
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const degToRad = (deg: number) => (deg * Math.PI) / 180

// --- Terrain Generation ---
function generateTerrain(width: number, height: number, kind: GameState['landscape']): Terrain {
  const samples: number[] = new Array(width)

  function addHills(amplitude: number, scale: number) {
    for (let x = 0; x < width; x++) {
      const nx = x / width
      const y =
        Math.sin(nx * Math.PI * 2 * scale) * amplitude * 0.6 +
        Math.sin(nx * Math.PI * 6 * scale) * amplitude * 0.25
      samples[x] = (samples[x] ?? 0) + y
    }
  }

  // base ground line (normalized around 0)
  for (let x = 0; x < width; x++) samples[x] = 0

  if (kind === 'earth') {
    addHills(height * 0.18, 0.7)
  } else if (kind === 'moon') {
    // South Pole crater: large bowl near center with scarps
    const craterCenter = Math.floor(width * 0.52)
    const craterRadius = Math.floor(width * 0.28)
    for (let x = 0; x < width; x++) {
      const d = (x - craterCenter) / craterRadius
      const bowl = -Math.exp(-d * d) * height * 0.35
      const rim = Math.exp(-Math.pow(Math.abs(d) - 0.95, 2) * 20) * height * 0.10
      samples[x] += bowl + rim
    }
    addHills(height * 0.06, 1.2)
  } else if (kind === 'mars') {
    // “Marianas Trench” analog on Mars: deep linear trench with stepped sides
    const trenchCenter = Math.floor(width * 0.6)
    const trenchHalfWidth = Math.floor(width * 0.18)
    for (let x = 0; x < width; x++) {
      const t = clamp(1 - Math.abs(x - trenchCenter) / trenchHalfWidth, 0, 1)
      const depth = -Math.pow(t, 1.2) * height * 0.38
      // terraces/steps
      const terraces = Math.floor(t * 6) / 6
      samples[x] += depth * (0.9 + terraces * 0.1)
    }
    addHills(height * 0.08, 0.9)
  }

  // add random noise for variation
  for (let x = 0; x < width; x++) {
    const noise = (Math.sin(x * 0.1) * 5) + (Math.random() * 10 - 5)
    samples[x] += noise
  }

  // normalize and place ground baseline near bottom
  const minY = Math.min(...samples)
  const maxY = Math.max(...samples)
  const range = maxY - minY || 1
  for (let x = 0; x < width; x++) {
    const n = (samples[x] - minY) / range // 0..1
    // invert so high values are higher ground, then push near bottom
    const ground = height * (0.35 + n * 0.45)
    samples[x] = ground
  }

  return { width, height, samples }
}

// --- Rendering ---
function renderTerrain(ctx: CanvasRenderingContext2D, terrain: Terrain, landscape: GameState['landscape']) {
  const { width, height, samples } = terrain
  ctx.save()
  // gradient sky
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  if (landscape === 'earth') {
    sky.addColorStop(0, '#163a6b')
    sky.addColorStop(0.7, '#102a4a')
    sky.addColorStop(1, '#091524')
  } else if (landscape === 'moon') {
    sky.addColorStop(0, '#0a1528')
    sky.addColorStop(1, '#05050c')
  } else {
    sky.addColorStop(0, '#3a0f0f')
    sky.addColorStop(1, '#120606')
  }
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  // ground shape
  const groundGradient = ctx.createLinearGradient(0, 0, 0, height)
  if (landscape === 'earth') {
    groundGradient.addColorStop(0, '#2c4d3a')
    groundGradient.addColorStop(1, '#1a241b')
  } else if (landscape === 'moon') {
    groundGradient.addColorStop(0, '#3b3b47')
    groundGradient.addColorStop(1, '#1e1e28')
  } else {
    groundGradient.addColorStop(0, '#5a2a23')
    groundGradient.addColorStop(1, '#2b1412')
  }
  ctx.fillStyle = groundGradient
  ctx.beginPath()
  ctx.moveTo(0, height)
  for (let x = 0; x < width; x++) ctx.lineTo(x + 0.5, samples[x])
  ctx.lineTo(width, height)
  ctx.closePath()
  ctx.fill()

  // subtle rim highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = 0; x < width; x += 2) ctx.lineTo(x + 0.5, samples[x] - 1)
  ctx.stroke()

  // stars and ambient elements
  ctx.fillStyle = landscape === 'mars' ? 'rgba(255,200,160,0.35)' : 'rgba(255,255,255,0.35)'
  const starCount = landscape === 'moon' ? 120 : 60
  for (let i = 0; i < starCount; i++) {
    const sx = (i * 73) % width
    const sy = ((i * 127) % Math.floor(height * 0.4)) + 10
    ctx.globalAlpha = ((i * 31) % 10) / 10
    ctx.fillRect(sx, sy, 1, 1)
  }
  ctx.globalAlpha = 1

  // decorative horizon lights
  for (let i = 0; i < width; i += 80) {
    const y = samples[i] - 4
    const g = ctx.createRadialGradient(i, y, 0, i, y, 18)
    const glow = landscape === 'mars' ? 'rgba(255,160,120,0.25)' : 'rgba(120,200,255,0.25)'
    g.addColorStop(0, glow)
    g.addColorStop(1, 'rgba(120,200,255,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(i, y, 18, 0, Math.PI * 2); ctx.fill()
  }

  ctx.restore()
}

function renderTank(ctx: CanvasRenderingContext2D, tank: Tank) {
  const { position, color, angleDeg, health, maxHealth } = tank
  const healthRatio = health / maxHealth
  ctx.save()
  ctx.translate(position.x, position.y)

  // subtle bobbing animation
  const bob = Math.sin(performance.now() / 400 + position.x * 0.03) * 0.5
  ctx.translate(0, bob)

  // glow under tank
  const glow = ctx.createRadialGradient(0, 2, 0, 0, 2, 12)
  glow.addColorStop(0, color + '88')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.arc(0, 2, 10, 0, Math.PI * 2); ctx.fill()

  // Damage effect - tanks become warmer and slightly transparent as health decreases
  const alpha = 0.8 + (healthRatio * 0.2)
  ctx.globalAlpha = alpha

  // body with layered armor plates
  const damagedColor = healthRatio < 0.3 ? '#ff6b6b' : color
  ctx.fillStyle = damagedColor
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 2

  // base hull
  drawRoundedRect(ctx, -14, -8, 28, 12, 4)
  ctx.fill(); ctx.stroke()
  // upper plate
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  drawRoundedRect(ctx, -10, -10, 20, 10, 3)
  ctx.fill()

  // turret
  ctx.save()
  ctx.rotate(-degToRad(angleDeg))
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(0, -2, 18, 4)
  // muzzle highlight
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillRect(16, -1.5, 2, 3)
  ctx.restore()

  // antenna
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(6, -10); ctx.lineTo(6, -16); ctx.stroke()

  ctx.restore()
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
}

function renderProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.save()
  ctx.fillStyle = proj.kind === 'laser' ? '#00ffff' : '#ffd36e'
  ctx.shadowColor = proj.kind === 'laser' ? '#00ffff' : '#ffde9c'
  ctx.shadowBlur = 10
  const size = proj.kind === 'laser' ? 1.5 : 2.5
  ctx.beginPath()
  ctx.arc(proj.position.x, proj.position.y, size, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function spawnParticles(cx: number, cy: number, count: number, color: string, speed: number = 2, particles: Particle[]) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const vel = Math.random() * speed
    particles.push({
      position: { x: cx, y: cy },
      velocity: { x: Math.cos(angle) * vel, y: Math.sin(angle) * vel },
      life: 60 + Math.random() * 60,
      maxLife: 120,
      color,
      size: 1 + Math.random() * 2,
    })
  }
}

function updateParticles(dt: number, particles: Particle[], gravity: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.position.x += p.velocity.x * dt
    p.position.y += p.velocity.y * dt
    p.velocity.y += gravity * 0.1 * dt // light gravity
    p.life -= dt
    if (p.life <= 0) particles.splice(i, 1)
  }
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save()
  for (const p of particles) {
    const alpha = p.life / p.maxLife
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Physics and helpers ---
function groundHeightAt(terrain: Terrain, x: number): number {
  const xi = clamp(Math.round(x), 0, terrain.width - 1)
  return terrain.samples[xi]
}

function placeTanks(terrain: Terrain): Tank[] {
  const xs = [0.1, 0.35, 0.65, 0.9].map(p => Math.floor(terrain.width * p))
  const colors = ['#63b3ff', '#ff6b6b', '#8bd66a', '#d6b36a']
  return xs.map((x, i) => ({
    position: { x, y: groundHeightAt(terrain, x) - 4 },
    angleDeg: i < 2 ? 45 + i * 45 : 135 - (i - 2) * 45,
    power: 60,
    color: colors[i],
    alive: true,
    control: 'human',
    score: 0,
    health: 100,
    maxHealth: 100,
    fuel: 100,
    maxFuel: 100,
  }))
}

function createGame(canvas: HTMLCanvasElement): GameState {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.error('Could not get 2D context from canvas!')
    throw new Error('Canvas 2D context not available')
  }

  const landscapeSel = document.getElementById('landscape') as HTMLSelectElement
  const weaponSel = document.getElementById('weapon') as HTMLSelectElement
  const angleInput = document.getElementById('angle') as HTMLInputElement
  const powerInput = document.getElementById('power') as HTMLInputElement
  const angleVal = document.getElementById('angleVal')!
  const powerVal = document.getElementById('powerVal')!
  const windVal = document.getElementById('windVal')!
  const windArrow = document.getElementById('windArrow') as HTMLElement
  const windLeftFill = document.getElementById('windLeftFill') as HTMLElement
  const windRightFill = document.getElementById('windRightFill') as HTMLElement
  const turnVal = document.getElementById('turnVal')!
  // Move/Fire buttons removed; retain keyboard controls
  const p1Type = document.getElementById('p1Type') as HTMLSelectElement
  const p2Type = document.getElementById('p2Type') as HTMLSelectElement
  const p3Type = document.getElementById('p3Type') as HTMLSelectElement
  const p4Type = document.getElementById('p4Type') as HTMLSelectElement
  const newRoundBtn = document.getElementById('newRound') as HTMLButtonElement
  const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement
  const muteToggle = document.getElementById('muteToggle') as HTMLButtonElement
  const overlay = document.getElementById('overlay') as HTMLDivElement
  const overlayText = document.getElementById('overlayText') as HTMLDivElement
  const overlayHelp = document.getElementById('overlayHelp') as HTMLDivElement
  const continueBtn = document.getElementById('continueBtn') as HTMLButtonElement

  const s1 = document.querySelector('#scoreP1 b') as HTMLElement
  const s2 = document.querySelector('#scoreP2 b') as HTMLElement
  const s3 = document.querySelector('#scoreP3 b') as HTMLElement
  const s4 = document.querySelector('#scoreP4 b') as HTMLElement

  const h1 = document.getElementById('healthP1') as HTMLElement
  const h2 = document.getElementById('healthP2') as HTMLElement
  const h3 = document.getElementById('healthP3') as HTMLElement
  const h4 = document.getElementById('healthP4') as HTMLElement

  const f1 = document.getElementById('fuelP1') as HTMLElement
  const f2 = document.getElementById('fuelP2') as HTMLElement
  const f3 = document.getElementById('fuelP3') as HTMLElement
  const f4 = document.getElementById('fuelP4') as HTMLElement

  let landscape: GameState['landscape'] = (landscapeSel.value as any) || 'earth'
  let terrain = generateTerrain(canvas.width, canvas.height, landscape)
  let tanks = placeTanks(terrain)
  let projectile: Projectile | null = null
  let particles: Particle[] = []
  let currentPlayerIndex = 0
  let gravity = 0.25
  let wind = 0
  let weapon: WeaponKind = 'shell'
  let paused = false
  let muted = false
  let audioCtx: AudioContext | null = null

  function randomizeWind() {
    wind = Math.round((Math.random() * 2 - 1) * 0.12 * 100) / 100 // -0.12..0.12
    updateWindUI()
  }
  randomizeWind()
  // Smoothly vary wind over time with gentle noise
  let windTime = 0
  function updateWind(dt: number) {
    windTime += dt * 0.005
    const target = (Math.sin(windTime) + Math.sin(windTime * 0.37) * 0.5) * 0.08
    // ease towards target
    wind += (target - wind) * 0.02
  }

  function updateUI() {
    const tank = tanks[currentPlayerIndex]
    angleInput.value = `${Math.round(tank.angleDeg)}`
    powerInput.value = `${Math.round(tank.power)}`
    angleVal.textContent = `${Math.round(tank.angleDeg)}°`
    powerVal.textContent = `${Math.round(tank.power)}`
    turnVal.textContent = `P${currentPlayerIndex + 1}`

    // Update scores
    s1.textContent = `${tanks[0]?.score ?? 0}`
    s2.textContent = `${tanks[1]?.score ?? 0}`
    s3.textContent = `${tanks[2]?.score ?? 0}`
    s4.textContent = `${tanks[3]?.score ?? 0}`

    // Update health bars
    if (tanks[0]) h1.style.width = `${(tanks[0].health / tanks[0].maxHealth) * 100}%`
    if (tanks[1]) h2.style.width = `${(tanks[1].health / tanks[1].maxHealth) * 100}%`
    if (tanks[2]) h3.style.width = `${(tanks[2].health / tanks[2].maxHealth) * 100}%`
    if (tanks[3]) h4.style.width = `${(tanks[3].health / tanks[3].maxHealth) * 100}%`

    // Update fuel bars
    if (tanks[0]) f1.style.width = `${(tanks[0].fuel / tanks[0].maxFuel) * 100}%`
    if (tanks[1]) f2.style.width = `${(tanks[1].fuel / tanks[1].maxFuel) * 100}%`
    if (tanks[2]) f3.style.width = `${(tanks[2].fuel / tanks[2].maxFuel) * 100}%`
    if (tanks[3]) f4.style.width = `${(tanks[3].fuel / tanks[3].maxFuel) * 100}%`

    updateWindUI()
    syncWeaponLocks()
  }
  function updateWindUI() {
    if (!windVal || !windArrow || !windLeftFill || !windRightFill) return
    const dirRight = wind >= 0
    const strength = Math.min(1, Math.abs(wind) / 0.12)
    windArrow.textContent = dirRight ? '→' : '←'
    windVal.textContent = `${Math.abs(wind).toFixed(2)}`
    windLeftFill.style.width = dirRight ? '0%' : `${Math.round(strength * 100)}%`
    windRightFill.style.width = dirRight ? `${Math.round(strength * 100)}%` : '0%'
  }
  updateUI()

  function applyControlTypes() {
    tanks[0].control = (p1Type.value as ControlType)
    tanks[1].control = (p2Type.value as ControlType)
    tanks[2].control = (p3Type.value as ControlType)
    tanks[3].control = (p4Type.value as ControlType)
  }
  applyControlTypes()

  function enforceSingleHuman() {
    // ensure only one player can be human; others revert to easy
    const selects = [p1Type, p2Type, p3Type, p4Type]
    let humanFound = false
    for (const sel of selects) {
      if (sel.value === 'human') {
        if (!humanFound) {
          humanFound = true
        } else {
          sel.value = 'easy'
        }
      }
    }
    applyControlTypes()
  }

  p1Type.onchange = p2Type.onchange = p3Type.onchange = p4Type.onchange = () => {
    enforceSingleHuman()
    updateUI()
    if (tanks[currentPlayerIndex].control !== 'human' && !projectile) maybeAIFire()
  }
  // initial enforcement
  enforceSingleHuman()

  // Keyboard controls (scoped to game)
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase()
    if (key === 'p') {
      const btn = document.getElementById('pauseBtn') as HTMLButtonElement
      btn?.click(); e.preventDefault(); return
    }
    if (key === 'm') {
      const btn = document.getElementById('muteToggle') as HTMLButtonElement
      btn?.click(); e.preventDefault(); return
    }
    const angle = document.getElementById('angle') as HTMLInputElement
    const power = document.getElementById('power') as HTMLInputElement
    if (key === 'arrowleft') { tryMove(-1); e.preventDefault() }
    if (key === 'arrowright') { tryMove(1); e.preventDefault() }
    if (key === 'arrowup')   { angle.value = String(Math.min(180, Number(angle.value) + 1)); angle.dispatchEvent(new Event('input')); e.preventDefault() }
    if (key === 'arrowdown') { angle.value = String(Math.max(0, Number(angle.value) - 1)); angle.dispatchEvent(new Event('input')); e.preventDefault() }
    if (key === 'q')         { power.value = String(Math.max(10, Number(power.value) - 1)); power.dispatchEvent(new Event('input')); e.preventDefault() }
    if (key === 'e')         { power.value = String(Math.min(100, Number(power.value) + 1)); power.dispatchEvent(new Event('input')); e.preventDefault() }
    if (key === ' ')         { onFire(); e.preventDefault() }
  })

  newRoundBtn.onclick = () => {
    const prev = tanks
    terrain = generateTerrain(canvas.width, canvas.height, landscape)
    tanks = placeTanks(terrain)
    for (let i = 0; i < tanks.length; i++) {
      tanks[i].control = prev[i]?.control ?? 'human'
      tanks[i].score = prev[i]?.score ?? 0
      // Carry over health/fuel bonuses based on score
      const bonusMultiplier = Math.floor(prev[i]?.score / 1000) + 1
      tanks[i].maxHealth = 100 * bonusMultiplier
      tanks[i].maxFuel = 100 * bonusMultiplier
      tanks[i].health = tanks[i].maxHealth
      tanks[i].fuel = tanks[i].maxFuel
    }
    projectile = null
    currentPlayerIndex = 0
    enforceSingleHuman()
    randomizeWind()
    updateUI()
    maybeAIFire()
  }

  landscapeSel.onchange = () => {
    landscape = landscapeSel.value as GameState['landscape']
    terrain = generateTerrain(canvas.width, canvas.height, landscape)
    const prev = tanks
    tanks = placeTanks(terrain)
    // keep control types and scores on reset
    for (let i = 0; i < tanks.length; i++) {
      tanks[i].control = prev[i]?.control ?? tanks[i].control
      tanks[i].score = prev[i]?.score ?? 0
    }
    projectile = null
    currentPlayerIndex = 0
    enforceSingleHuman()
    randomizeWind()
    updateUI()
  }

  weaponSel.onchange = () => {
    // enforce unlocks on selection as well
    const points = tanks[currentPlayerIndex]?.score ?? 0
    const selected = weaponSel.value as WeaponKind
    const locked = (selected === 'missile' && points < 200) ||
                   (selected === 'scatter' && points < 400) ||
                   (selected === 'laser' && points < 500) ||
                   (selected === 'nuke' && points < 800)
    if (locked) {
      // revert to shell if locked
      weaponSel.value = 'shell'
      weapon = 'shell'
    } else {
      weapon = selected
    }
  }

  angleInput.oninput = () => {
    const t = tanks[currentPlayerIndex]
    t.angleDeg = clamp(parseFloat(angleInput.value) || 0, 0, 180)
    angleVal.textContent = `${Math.round(t.angleDeg)}°`
  }
  powerInput.oninput = () => {
    const t = tanks[currentPlayerIndex]
    t.power = clamp(parseFloat(powerInput.value) || 10, 10, 100)
    powerVal.textContent = `${Math.round(t.power)}`
  }

  function tryMove(dir: -1 | 1) {
    if (projectile) return
    const t = tanks[currentPlayerIndex]
    if (!consumeFuel(currentPlayerIndex, 2)) return // movement costs 2 fuel
    t.position.x = clamp(t.position.x + dir * 6, 4, terrain.width - 4)
    t.position.y = groundHeightAt(terrain, t.position.x) - 4
  }
  function onFire() {
    if (projectile) return
    const shooter = tanks[currentPlayerIndex]
    if (!consumeFuel(currentPlayerIndex, 5)) return // shooting costs 5 fuel

    // Limit power based on health
    const healthRatio = shooter.health / shooter.maxHealth
    const maxPower = 30 + (70 * healthRatio) // 30-100 power based on health
    const actualPower = Math.min(shooter.power, maxPower)

    const theta = degToRad(shooter.angleDeg)
    const speed = actualPower * 0.9
    const dir = currentPlayerIndex <= 1 ? 1 : -1
    const vx = Math.cos(theta) * speed * dir
    const vy = -Math.sin(theta) * speed
    spawnShot(shooter.position.x, shooter.position.y - 6, { x: vx, y: vy }, weapon)
    playShot()
  }

  function syncWeaponLocks() {
    const points = tanks[currentPlayerIndex]?.score ?? 0
    const laser = weaponSel.querySelector('option[value="laser"]') as HTMLOptionElement
    const miss = weaponSel.querySelector('option[value="missile"]') as HTMLOptionElement
    const scat = weaponSel.querySelector('option[value="scatter"]') as HTMLOptionElement
    const nuke = weaponSel.querySelector('option[value="nuke"]') as HTMLOptionElement
    laser.disabled = points < 500
    miss.disabled = points < 200
    scat.disabled = points < 400
    nuke.disabled = points < 800
  }

  function awardPoints(playerIndex: number, pts: number) {
    tanks[playerIndex].score += pts
    saveProgress()
  }

  function awardFuel(playerIndex: number, fuelAmount: number) {
    tanks[playerIndex].fuel = Math.min(tanks[playerIndex].maxFuel, tanks[playerIndex].fuel + fuelAmount)
  }

  function consumeFuel(playerIndex: number, amount: number): boolean {
    if (tanks[playerIndex].fuel >= amount) {
      tanks[playerIndex].fuel -= amount
      return true
    }
    return false
  }

  function regenerateFuel() {
    // Slow fuel regeneration over time
    for (const tank of tanks) {
      if (tank.alive && tank.fuel < tank.maxFuel) {
        tank.fuel = Math.min(tank.maxFuel, tank.fuel + 0.1) // Regenerate 0.1 fuel per frame
      }
    }
  }

  function saveProgress() {
    const data = {
      scores: tanks.map(t => t.score),
      controls: tanks.map(t => t.control),
      landscape,
      maxHealths: tanks.map(t => t.maxHealth),
      maxFuels: tanks.map(t => t.maxFuel),
    }
    try { localStorage.setItem('tanks-progress', JSON.stringify(data)) } catch {}
  }
  function loadProgress() {
    try {
      const raw = localStorage.getItem('tanks-progress')
      if (!raw) return
      const data = JSON.parse(raw)
      if (Array.isArray(data?.scores)) {
        for (let i = 0; i < Math.min(4, data.scores.length); i++) tanks[i].score = Number(data.scores[i]) || 0
      }
      if (Array.isArray(data?.controls)) {
        for (let i = 0; i < Math.min(4, data.controls.length); i++) tanks[i].control = (data.controls[i] as ControlType) || 'human'
        p1Type.value = tanks[0].control
        p2Type.value = tanks[1].control
        p3Type.value = tanks[2].control
        p4Type.value = tanks[3].control
      }
      if (data?.landscape) {
        landscape = data.landscape
        landscapeSel.value = landscape
        terrain = generateTerrain(canvas.width, canvas.height, landscape)
        // reposition tanks on new terrain while keeping x
        for (let i = 0; i < tanks.length; i++) {
          const x = tanks[i].position.x
          tanks[i].position.y = groundHeightAt(terrain, x) - 4
        }
      }
      if (Array.isArray(data?.maxHealths)) {
        for (let i = 0; i < Math.min(4, data.maxHealths.length); i++) {
          tanks[i].maxHealth = Number(data.maxHealths[i]) || 100
          tanks[i].health = Math.min(tanks[i].health, tanks[i].maxHealth)
        }
      }
      if (Array.isArray(data?.maxFuels)) {
        for (let i = 0; i < Math.min(4, data.maxFuels.length); i++) {
          tanks[i].maxFuel = Number(data.maxFuels[i]) || 100
          tanks[i].fuel = Math.min(tanks[i].fuel, tanks[i].maxFuel)
        }
      }
      enforceSingleHuman()
    } catch {}
  }
  loadProgress()

  function deformTerrain(cx: number, cy: number, radius: number) {
    // simple vertical erosion: lower samples near impact
    const r2 = radius * radius
    const start = clamp(Math.floor(cx - radius), 0, terrain.width - 1)
    const end = clamp(Math.ceil(cx + radius), 0, terrain.width - 1)
    for (let x = start; x <= end; x++) {
      const dy = terrain.samples[x] - cy
      const dx = x - cx
      const dist2 = dx * dx + dy * dy
      if (dist2 <= r2) {
        const fall = (1 - dist2 / r2) * radius * 0.6
        terrain.samples[x] += fall
      }
    }
  }

  function hitTankCheck(p: Vector, radius: number, ownerIndex?: number): number | null {
    for (let i = 0; i < tanks.length; i++) {
      if (!tanks[i].alive) continue
      if (i === ownerIndex) continue // can't hit self
      const dx = tanks[i].position.x - p.x
      const dy = tanks[i].position.y - p.y
      if (dx * dx + dy * dy < radius * radius) return i
    }
    return null
  }

  function segmentCircleIntersect(a: Vector, b: Vector, center: Vector, radius: number): boolean {
    // Check if segment AB intersects circle at center with radius
    const abx = b.x - a.x
    const aby = b.y - a.y
    const acx = center.x - a.x
    const acy = center.y - a.y
    const ab2 = abx * abx + aby * aby
    const proj = ab2 > 0 ? (acx * abx + acy * aby) / ab2 : 0
    const t = clamp(proj, 0, 1)
    const qx = a.x + abx * t
    const qy = a.y + aby * t
    const dx = qx - center.x
    const dy = qy - center.y
    return dx * dx + dy * dy <= radius * radius
  }

  function checkWin() {
    const alive = tanks.filter(t => t.alive)
    if (alive.length === 1) {
      const winner = alive[0]
      overlayText.textContent = `Player ${tanks.indexOf(winner) + 1} Wins!`
      overlayHelp.innerHTML = '<b>Scores</b>' + tanks.map((t, i) => `<div>P${i+1}: ${t.score}</div>`).join('')
      continueBtn.classList.remove('hidden')
      overlay.classList.remove('hidden')
      paused = true
    }
  }

  continueBtn.onclick = () => {
    overlay.classList.add('hidden')
    continueBtn.classList.add('hidden')
    paused = false
    // Start new round with bonuses
    const prev = tanks
    terrain = generateTerrain(canvas.width, canvas.height, landscape)
    tanks = placeTanks(terrain)
    for (let i = 0; i < tanks.length; i++) {
      tanks[i].control = prev[i]?.control ?? 'human'
      tanks[i].score = prev[i]?.score ?? 0
      // Carry over health/fuel bonuses based on score
      const bonusMultiplier = Math.floor(prev[i]?.score / 1000) + 1
      tanks[i].maxHealth = 100 * bonusMultiplier
      tanks[i].maxFuel = 100 * bonusMultiplier
      tanks[i].health = tanks[i].maxHealth
      tanks[i].fuel = tanks[i].maxFuel
    }
    projectile = null
    currentPlayerIndex = 0
    enforceSingleHuman()
    randomizeWind()
    updateUI()
    maybeAIFire()
  }

  function nextTurn() {
    for (let k = 0; k < tanks.length; k++) {
      currentPlayerIndex = (currentPlayerIndex + 1) % tanks.length
      if (tanks[currentPlayerIndex].alive) break
    }
    randomizeWind()
    updateUI()
    checkWin()
    if (!paused) maybeAIFire()
  }

  // --- Pause/Resume ---
  function setPaused(p: boolean) {
    paused = p
    if (continueBtn.classList.contains('hidden')) {
      overlay.classList.toggle('hidden', !paused)
    }
    pauseBtn.textContent = paused ? 'Resume' : 'Pause'
  }
  pauseBtn.onclick = () => setPaused(!paused)

  // --- Audio ---
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  function playShot() {
    if (muted) return
    ensureAudio()
    const ctx = audioCtx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = 220
    g.gain.value = 0.15
    o.connect(g).connect(ctx.destination)
    o.start()
    o.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14)
    o.stop(ctx.currentTime + 0.15)
  }
  function playExplosion(big = false) {
    if (muted) return
    ensureAudio()
    const ctx = audioCtx!
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (big ? 4000 : 6000))
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const g = ctx.createGain()
    g.gain.value = big ? 0.5 : 0.35
    src.connect(g).connect(ctx.destination)
    src.start()
  }
  muteToggle.onclick = () => {
    muted = !muted
    muteToggle.textContent = muted ? 'Unmute' : 'Mute'
  }

  function spawnShot(px: number, py: number, vel: Vector, kind: WeaponKind) {
    const owner = currentPlayerIndex
    if (kind === 'laser') {
      projectile = {
        position: { x: px, y: py },
        previous: { x: px, y: py },
        velocity: { x: vel.x, y: vel.y },
        active: true,
        ownerIndex: owner,
        kind: 'laser',
        ageFrames: 0,
      }
    } else if (kind === 'scatter') {
      projectile = {
        position: { x: px, y: py },
        previous: { x: px, y: py },
        velocity: { x: vel.x * 0.85, y: vel.y * 0.85 },
        active: true,
        ownerIndex: owner,
        kind: 'scatter',
        scatterCountdown: 30 + Math.random() * 20,
        ageFrames: 0,
      }
    } else if (kind === 'nuke') {
      projectile = {
        position: { x: px, y: py },
        previous: { x: px, y: py },
        velocity: { x: vel.x * 0.9, y: vel.y * 0.9 },
        active: true,
        ownerIndex: owner,
        kind: 'nuke',
        ageFrames: 0,
      }
    } else if (kind === 'missile') {
      projectile = {
        position: { x: px, y: py },
        previous: { x: px, y: py },
        velocity: { x: vel.x, y: vel.y },
        active: true,
        ownerIndex: owner,
        kind: 'missile',
        ageFrames: 0,
      }
    } else {
      projectile = {
        position: { x: px, y: py },
        previous: { x: px, y: py },
        velocity: { x: vel.x, y: vel.y },
        active: true,
        ownerIndex: owner,
        kind: 'shell',
        ageFrames: 0,
      }
    }
  }

  function maybeAIFire() {
    const t = tanks[currentPlayerIndex]
    if (t.control === 'human') return
    // choose alive opponent nearest in x
    const enemies = tanks.map((tk, i) => ({ tk, i })).filter(({ tk, i }) => i !== currentPlayerIndex && tk.alive)
    if (enemies.length === 0) return
    enemies.sort((a, b) => Math.abs(a.tk.position.x - t.position.x) - Math.abs(b.tk.position.x - t.position.x))
    const target = enemies[0]

    // brute-force search over angle/power, simulate trajectory and score
    let bestAngle = t.angleDeg
    let bestPower = t.power
    let bestScore = -Infinity
    const angleSteps = t.control === 'hard' ? 41 : t.control === 'medium' ? 25 : 15
    const powerSteps = t.control === 'hard' ? 16 : t.control === 'medium' ? 12 : 8
    for (let ai = 0; ai < angleSteps; ai++) {
      const ang = 5 + (170 - 5) * (ai / (angleSteps - 1))
      for (let pi = 0; pi < powerSteps; pi++) {
        const pw = 30 + (100 - 30) * (pi / (powerSteps - 1))
        const score = simulateScore(t.position, ang, pw, target.tk.position)
        if (score > bestScore) { bestScore = score; bestAngle = ang; bestPower = pw }
      }
    }
    // add small noise based on difficulty
    const noiseAng = t.control === 'hard' ? 0.5 : t.control === 'medium' ? 2 : 4
    const noisePow = t.control === 'hard' ? 1 : t.control === 'medium' ? 3 : 5
    t.angleDeg = clamp(bestAngle + (Math.random() * 2 - 1) * noiseAng, 0, 180)
    t.power = clamp(bestPower + (Math.random() * 2 - 1) * noisePow, 10, 100)

    // weapon choice: higher difficulty prefers better weapons if unlocked
    const points = t.score
    const viable: WeaponKind[] = ['shell']
    if (points >= 200) viable.push('missile')
    if (points >= 500) viable.push('laser')
    if (points >= 400) viable.push('scatter')
    if (points >= 800) viable.push('nuke')
    weapon = viable[Math.min(viable.length - 1, t.control === 'hard' ? viable.length - 1 : Math.floor(Math.random() * viable.length))]
    weaponSel.value = weapon

    // check fuel and health limits
    if (!consumeFuel(currentPlayerIndex, 5)) return // shooting costs 5 fuel

    // Limit power based on health
    const healthRatio = t.health / t.maxHealth
    const maxPower = 30 + (70 * healthRatio) // 30-100 power based on health
    const actualPower = Math.min(t.power, maxPower)

    // fire
    const thetaRad = degToRad(t.angleDeg)
    const dir = currentPlayerIndex <= 1 ? 1 : -1
    const speed = actualPower * 0.9
    const vx = Math.cos(thetaRad) * speed * dir
    const vy = -Math.sin(thetaRad) * speed
    spawnShot(t.position.x, t.position.y - 6, { x: vx, y: vy }, weapon)
    playShot()
  }

  function simulateScore(origin: Vector, angleDegInput: number, powerInput: number, targetPos: Vector): number {
    const theta = degToRad(angleDegInput)
    const dir = currentPlayerIndex <= 1 ? 1 : -1
    let vx = Math.cos(theta) * (powerInput * 0.9) * dir
    let vy = -Math.sin(theta) * (powerInput * 0.9)
    let px = origin.x, py = origin.y - 6
    let score = 0
    for (let step = 0; step < 300; step++) {
      vy += gravity
      vx += wind
      px += vx * 0.1
      py += vy * 0.1
      // offscreen or hit ground
      if (px < 0 || px >= terrain.width || py >= terrain.height) break
      const gh = groundHeightAt(terrain, px)
      if (py >= gh) break
      const dx = targetPos.x - px
      const dy = targetPos.y - py
      const d2 = dx * dx + dy * dy
      // inverse distance score
      score = Math.max(score, 1 / (1 + d2))
    }
    return score
  }

  // --- Main Loop ---
  let last = performance.now()
  function frame(now: number) {
    const dt = clamp((now - last) / 16.6667, 0, 3) // normalize to ~60fps steps
    last = now

    // update particles
    updateParticles(dt, particles, gravity)
    updateWind(dt)

    // regenerate fuel
    regenerateFuel()

    // update projectile
    if (projectile && projectile.active) {
      const kind = projectile.kind
      projectile.scatterCountdown = (projectile.scatterCountdown ?? 0) - 1 * dt
      projectile.ageFrames += dt
      projectile.previous.x = projectile.position.x
      projectile.previous.y = projectile.position.y
      if (kind !== 'laser') {
        projectile.velocity.y += gravity * dt
        projectile.velocity.x += wind * dt
      }
      // missiles get slight homing towards nearest enemy
      if (kind === 'missile') {
        const enemies = tanks.filter((t, i) => i !== currentPlayerIndex && t.alive)
        let nearest = enemies[0]
        let nd = Infinity
        for (const e of enemies) {
          const dx = e.position.x - projectile.position.x
          const dy = e.position.y - projectile.position.y
          const d = dx * dx + dy * dy
          if (d < nd) { nd = d; nearest = e }
        }
        if (nearest) {
          const steerX = clamp((nearest.position.x - projectile.position.x) * 0.001, -0.25, 0.25)
          projectile.velocity.x += steerX * dt
        }
      }
      projectile.position.x += projectile.velocity.x * 0.1 * dt
      projectile.position.y += projectile.velocity.y * 0.1 * dt

      // out of bounds
      if (
        projectile.position.x < 0 ||
        projectile.position.x >= terrain.width ||
        projectile.position.y >= terrain.height
      ) {
        projectile.active = false
        projectile = null
        nextTurn()
      } else {
        // collision with ground
        const gh = groundHeightAt(terrain, projectile.position.x)
        if (kind === 'scatter' && (projectile.scatterCountdown ?? 0) <= 0) {
          // burst into 7 mini-missiles + delayed shells
          const base = projectile
          projectile.active = false
          projectile = null
          const spread = 0.5
          for (let i = -3; i <= 3; i++) {
            const speedScale = 0.45 + Math.random() * 0.3
            const v = {
              x: base.velocity.x * speedScale + i * spread,
              y: base.velocity.y * speedScale - Math.abs(i) * spread * 0.5,
            }
            spawnShot(base.position.x, base.position.y, v, 'missile')
          }
          for (let k = 0; k < 4; k++) {
            setTimeout(() => {
              const v = {
                x: (Math.random() * 2 - 1) * 1.2,
                y: -Math.random() * 2.0,
              }
              spawnShot(base.position.x + (Math.random() * 20 - 10), base.position.y - Math.random() * 10, v, 'shell')
            }, 80 + k * 60)
          }
        } else if (projectile.position.y >= gh) {
          const center = { x: projectile.position.x, y: gh }
          let radius = 22
          if (kind === 'missile') radius = 28
          if (kind === 'nuke') radius = 80
          deformTerrain(center.x, center.y, radius)
          const hit = hitTankCheck(center, radius + 4, projectile.ownerIndex)
          if (hit != null) {
            const damage = kind === 'nuke' ? 80 : kind === 'laser' ? 30 : kind === 'missile' ? 30 : 20
            tanks[hit].health = Math.max(0, tanks[hit].health - damage)
            if (tanks[hit].health <= 0) {
              tanks[hit].alive = false
            }
            const points = kind === 'nuke' ? 500 : kind === 'laser' ? 300 : kind === 'missile' ? 220 : 100
            awardPoints(projectile.ownerIndex, points)
            awardFuel(projectile.ownerIndex, points / 10) // fuel bonus
          }
          playExplosion(kind === 'nuke')
          spawnParticles(center.x, center.y, kind === 'nuke' ? 60 : 14, kind === 'nuke' ? '#ffaa00' : '#8b5a00', kind === 'nuke' ? 3 : 2, particles)
          projectile.active = false
          projectile = null
          nextTurn()
        }
      }

      // continuous tank hit check along motion segment
      if (projectile && projectile.active) {
        for (let i = 0; i < tanks.length; i++) {
          if (!tanks[i].alive) continue
          const radius = 8
          if (segmentCircleIntersect(projectile.previous, projectile.position, tanks[i].position, radius) && i !== projectile.ownerIndex) {
            const center = { x: projectile.position.x, y: projectile.position.y }
            const blast = projectile.kind === 'nuke' ? 46 : projectile.kind === 'missile' ? 26 : 22
            deformTerrain(center.x, Math.max(center.y, groundHeightAt(terrain, center.x)), blast)
            const damage = projectile.kind === 'nuke' ? 50 : projectile.kind === 'laser' ? 30 : projectile.kind === 'missile' ? 25 : 20
            tanks[i].health = Math.max(0, tanks[i].health - damage)
            if (tanks[i].health <= 0) {
              tanks[i].alive = false
            }
            const points = projectile.kind === 'nuke' ? 500 : projectile.kind === 'laser' ? 300 : projectile.kind === 'missile' ? 220 : 100
            awardPoints(projectile.ownerIndex, points)
            awardFuel(projectile.ownerIndex, points / 10) // fuel bonus
            playExplosion(projectile.kind === 'nuke')
            spawnParticles(center.x, center.y, projectile.kind === 'nuke' ? 20 : 10, projectile.kind === 'nuke' ? '#ffaa00' : '#8b5a00', 2, particles)
            projectile.active = false
            projectile = null
            nextTurn()
            break
          }
        }
      }
    }

    // render
    if (paused && continueBtn.classList.contains('hidden')) { requestAnimationFrame(frame); return }

    // Clear canvas
    ctx!.clearRect(0, 0, canvas.width, canvas.height)

    renderTerrain(ctx!, terrain, landscape)
    renderParticles(ctx!, particles)
    for (const t of tanks) if (t.alive) renderTank(ctx!, t)
    if (projectile && projectile.active) renderProjectile(ctx!, projectile)

    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  return {
    terrain,
    tanks: tanks,
    projectile,
    particles,
    currentPlayerIndex,
    gravity,
    wind,
    landscape,
    weapon,
  }
}

// boot
const canvas = document.getElementById('game') as HTMLCanvasElement
function sizeCanvasToViewport() {
  const app = document.getElementById('app') as HTMLElement
  const hud = document.querySelector('.hud') as HTMLElement
  const appStyles = getComputedStyle(app)
  const paddingTop = parseFloat(appStyles.paddingTop || '0')
  const paddingBottom = parseFloat(appStyles.paddingBottom || '0')
  const avail = window.innerHeight - hud.offsetHeight - paddingTop - paddingBottom - 20
  const width = app.clientWidth
  // maintain 16:9 as default target aspect
  const targetH = Math.max(300, Math.min(avail, Math.round((width / 16) * 9)))
  const targetW = Math.round((targetH / 9) * 16)
  canvas.width = targetW
  canvas.height = targetH
}

if (!canvas) {
  console.error('Canvas element not found!')
} else {
  sizeCanvasToViewport()
  createGame(canvas)
  window.addEventListener('resize', () => {
    const ctx = canvas.getContext('2d')
    // preserve current frame sizing while not mid-round; safe to just resize and let next frame redraw
    sizeCanvasToViewport()
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  })
}
