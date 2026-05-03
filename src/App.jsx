import { useState, useEffect, useRef, useCallback } from 'react';
import { TreePine, Bug, Leaf, Flower, Shield, Zap, Sprout, Heart } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────
const ROWS = 5;
const COLS = 9;
const TICK = 100;          // ms per game tick
const CELL = 76;           // px per grid cell
const BASE_SPD = 0.038;    // cols per tick at 1× speed  (~0.38 cols/s)
const MAX_VIT = 500;
const START_NUT = 150;
const WAVE_BREAK = 5000;   // ms between waves

// ── Plant Definitions ──────────────────────────────────────────────────────
const PLANTS = {
  LAVENDER: {
    id: 'LAVENDER', name: 'Lavender', cost: 50, maxHp: 100,
    genRate: 8000, genAmt: 25,
    desc: '+25 Nutrients / 8 s',
    bg: 'bg-purple-600', border: 'border-purple-900', Icon: Flower,
  },
  NIGHTSHADE: {
    id: 'NIGHTSHADE', name: 'Nightshade', cost: 100, maxHp: 150,
    fireRate: 2000, damage: 20, projSpd: 0.22,
    desc: 'Venom Bolt · 20 dmg',
    bg: 'bg-indigo-700', border: 'border-indigo-900', Icon: Zap,
  },
  THISTLE: {
    id: 'THISTLE', name: 'Thistle', cost: 50, maxHp: 500,
    desc: 'Wall · 500 HP',
    bg: 'bg-green-700', border: 'border-green-900', Icon: Shield,
  },
  SAGE: {
    id: 'SAGE', name: 'Sage', cost: 75, maxHp: 100,
    healRate: 3000, healAmt: 10,
    desc: 'Purify + Heal adj.',
    bg: 'bg-emerald-600', border: 'border-emerald-900', Icon: Sprout,
  },
};

// ── Enemy Definitions ──────────────────────────────────────────────────────
const ENEMIES = {
  FUNGAL_ANT: {
    id: 'FUNGAL_ANT', name: 'Fungal Ant',
    maxHp: 50, speed: 1.0, blightChance: 0.20, blightInterval: 2000,
    atkDmg: 30, atkRate: 1000, reward: 10, sz: 22,
    bg: 'bg-amber-600', ring: 'ring-amber-900',
  },
  SPORE_BEETLE: {
    id: 'SPORE_BEETLE', name: 'Spore Beetle',
    maxHp: 200, speed: 0.5, blightChance: 1.00, blightInterval: 2000,
    atkDmg: 40, atkRate: 1200, reward: 20, sz: 30,
    bg: 'bg-stone-600', ring: 'ring-stone-900',
  },
  CORDYCEPS_WASP: {
    id: 'CORDYCEPS_WASP', name: 'Cordyceps Wasp',
    maxHp: 40, speed: 1.5, blightChance: 0.20, blightInterval: 2000,
    atkDmg: 20, atkRate: 800, reward: 15, sz: 18, canHop: true,
    bg: 'bg-yellow-400', ring: 'ring-yellow-700',
  },
};

// ── Waves ──────────────────────────────────────────────────────────────────
const WAVES = [
  // Wave 1 — tutorial ants
  [
    { type: 'FUNGAL_ANT', lane: 2, delay: 0 },
    { type: 'FUNGAL_ANT', lane: 0, delay: 2500 },
    { type: 'FUNGAL_ANT', lane: 4, delay: 5000 },
    { type: 'FUNGAL_ANT', lane: 1, delay: 7500 },
    { type: 'FUNGAL_ANT', lane: 3, delay: 10000 },
  ],
  // Wave 2 — beetles arrive
  [
    { type: 'FUNGAL_ANT',   lane: 0, delay: 0 },
    { type: 'FUNGAL_ANT',   lane: 3, delay: 1500 },
    { type: 'SPORE_BEETLE', lane: 2, delay: 3000 },
    { type: 'FUNGAL_ANT',   lane: 1, delay: 5000 },
    { type: 'SPORE_BEETLE', lane: 4, delay: 6500 },
    { type: 'FUNGAL_ANT',   lane: 2, delay: 8000 },
    { type: 'SPORE_BEETLE', lane: 0, delay: 10000 },
    { type: 'FUNGAL_ANT',   lane: 4, delay: 12000 },
  ],
  // Wave 3 — wasps join
  [
    { type: 'CORDYCEPS_WASP', lane: 1, delay: 0 },
    { type: 'CORDYCEPS_WASP', lane: 3, delay: 800 },
    { type: 'FUNGAL_ANT',     lane: 0, delay: 2000 },
    { type: 'SPORE_BEETLE',   lane: 2, delay: 3500 },
    { type: 'CORDYCEPS_WASP', lane: 4, delay: 4500 },
    { type: 'FUNGAL_ANT',     lane: 2, delay: 6000 },
    { type: 'SPORE_BEETLE',   lane: 1, delay: 7500 },
    { type: 'CORDYCEPS_WASP', lane: 0, delay: 9000 },
    { type: 'SPORE_BEETLE',   lane: 4, delay: 11000 },
    { type: 'FUNGAL_ANT',     lane: 3, delay: 13000 },
  ],
  // Wave 4 — boss rush
  [
    { type: 'CORDYCEPS_WASP', lane: 0, delay: 0 },
    { type: 'CORDYCEPS_WASP', lane: 2, delay: 400 },
    { type: 'CORDYCEPS_WASP', lane: 4, delay: 800 },
    { type: 'CORDYCEPS_WASP', lane: 1, delay: 1200 },
    { type: 'CORDYCEPS_WASP', lane: 3, delay: 1600 },
    { type: 'SPORE_BEETLE',   lane: 0, delay: 4000 },
    { type: 'SPORE_BEETLE',   lane: 2, delay: 5000 },
    { type: 'SPORE_BEETLE',   lane: 4, delay: 6000 },
    { type: 'FUNGAL_ANT',     lane: 1, delay: 7000 },
    { type: 'FUNGAL_ANT',     lane: 3, delay: 7500 },
    { type: 'SPORE_BEETLE',   lane: 1, delay: 10000 },
    { type: 'SPORE_BEETLE',   lane: 3, delay: 11000 },
    { type: 'CORDYCEPS_WASP', lane: 0, delay: 13000 },
    { type: 'CORDYCEPS_WASP', lane: 2, delay: 13500 },
    { type: 'CORDYCEPS_WASP', lane: 4, delay: 14000 },
    { type: 'SPORE_BEETLE',   lane: 0, delay: 17000 },
    { type: 'SPORE_BEETLE',   lane: 2, delay: 18000 },
    { type: 'SPORE_BEETLE',   lane: 4, delay: 19000 },
  ],
];

// ── Helpers ────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => ++_uid;

const mkGrid = () =>
  Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ plant: null, blighted: false }))
  );

const mkEnemy = (type, lane, t) => ({
  id: uid(), type, lane,
  x: 9.6,
  hp: ENEMIES[type].maxHp,
  attacking: false,
  attackingTree: false,
  hasHopped: false,
  lastAtk: t,
  lastBlight: t,
});

const mkProjectile = (lane, x, damage, speed) => ({
  id: uid(), lane, x, damage, speed,
});

const initState = () => ({
  phase: 'menu',
  vitality: MAX_VIT,
  nutrients: START_NUT,
  grid: mkGrid(),
  enemies: [],
  projectiles: [],
  floats: [],          // floating text popups
  selected: null,      // selected plant type id
  waveIdx: 0,
  waveStart: null,
  spawned: 0,
  betweenWaves: false,
  breakStart: null,
  gt: 0,              // game time ms
});

// ── Core tick ──────────────────────────────────────────────────────────────
function tick(s) {
  if (s.phase !== 'playing') return s;

  const gt = s.gt + TICK;

  // Clone mutable slices
  const grid = s.grid.map(r =>
    r.map(c => ({ ...c, plant: c.plant ? { ...c.plant } : null }))
  );
  let enemies     = s.enemies.map(e => ({ ...e }));
  let projectiles = s.projectiles.map(p => ({ ...p }));
  let nutrients   = s.nutrients;
  let vitality    = s.vitality;
  const floats    = s.floats.filter(f => gt - f.t < 1200);

  let { waveIdx, waveStart, spawned, betweenWaves, breakStart } = s;

  // ── Spawn enemies ────────────────────────────────────────────────────────
  if (!betweenWaves && waveStart !== null && waveIdx < WAVES.length) {
    const wave    = WAVES[waveIdx];
    const elapsed = gt - waveStart;
    while (spawned < wave.length && wave[spawned].delay <= elapsed) {
      enemies.push(mkEnemy(wave[spawned].type, wave[spawned].lane, gt));
      spawned++;
    }
  }

  // ── Enemy logic ──────────────────────────────────────────────────────────
  const deadSet = new Set();

  for (let i = 0; i < enemies.length; i++) {
    const e   = enemies[i];
    const def = ENEMIES[e.type];
    const spd = def.speed * BASE_SPD;
    const nx  = e.x - spd;

    // Find the nearest blocking plant (rightmost plant whose col + 0.5 >= nx
    // and that the enemy hasn't yet moved past)
    let blockCol = -1;
    for (let c = COLS - 1; c >= 0; c--) {
      if (grid[e.lane][c]?.plant && c + 0.5 >= nx && e.x > c - 0.05) {
        blockCol = c;
        break;
      }
    }

    const blocked  = blockCol >= 0;
    const atWall   = !blocked && nx <= 0.1;

    if (blocked) {
      if (def.canHop && !e.hasHopped) {
        // Hop over the first plant encountered
        enemies[i] = { ...e, x: blockCol - 0.9, hasHopped: true, attacking: false };
      } else {
        // Attack the plant
        enemies[i] = { ...e, attacking: true, attackingTree: false };
        if (gt - e.lastAtk >= def.atkRate) {
          const plant = grid[e.lane][blockCol].plant;
          if (plant) {
            plant.hp -= def.atkDmg;
            enemies[i].lastAtk = gt;
            if (plant.hp <= 0) {
              grid[e.lane][blockCol].plant = null;
              nutrients += def.reward;
              floats.push({ id: uid(), text: `+${def.reward}💧`, c: blockCol, r: e.lane, t: gt, col: 'text-yellow-300' });
            }
          }
        }
      }
    } else if (atWall) {
      // Attack Heart-Tree: 10 vitality per second
      enemies[i] = { ...e, x: 0.15, attacking: true, attackingTree: true };
      if (gt - e.lastAtk >= 1000) {
        vitality -= 10;
        enemies[i].lastAtk = gt;
      }
    } else {
      enemies[i] = { ...e, x: Math.max(0.1, nx), attacking: false, attackingTree: false };
    }

    // Blight tile under enemy
    const cur = enemies[i];
    if (gt - cur.lastBlight >= def.blightInterval) {
      enemies[i] = { ...cur, lastBlight: gt };
      const tc = Math.max(0, Math.min(COLS - 1, Math.floor(cur.x)));
      if (Math.random() < def.blightChance) {
        grid[cur.lane][tc].blighted = true;
      }
    }

    if (enemies[i].hp <= 0) deadSet.add(enemies[i].id);
  }

  enemies = enemies.filter(e => !deadSet.has(e.id));

  // ── Projectile logic ─────────────────────────────────────────────────────
  const deadProj = new Set();

  for (let i = 0; i < projectiles.length; i++) {
    const p   = projectiles[i];
    const npx = p.x + p.speed;

    if (npx > COLS + 0.5) { deadProj.add(p.id); continue; }

    let hit = false;
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (e.lane === p.lane && Math.abs(e.x - npx) < 0.55) {
        enemies[j] = { ...e, hp: e.hp - p.damage };
        if (enemies[j].hp <= 0) deadSet.add(enemies[j].id);
        deadProj.add(p.id);
        hit = true;
        break;
      }
    }
    if (!hit) projectiles[i] = { ...p, x: npx };
  }

  projectiles = projectiles.filter(p => !deadProj.has(p.id));
  enemies     = enemies.filter(e => !deadSet.has(e.id));

  // ── Plant actions ─────────────────────────────────────────────────────────
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell  = grid[r][c];
      if (!cell.plant) continue;
      const plant = cell.plant;
      const pdef  = PLANTS[plant.type];

      if (plant.type === 'LAVENDER') {
        if (plant.lastGen == null) plant.lastGen = gt;
        if (gt - plant.lastGen >= pdef.genRate) {
          nutrients += pdef.genAmt;
          plant.lastGen = gt;
          floats.push({ id: uid(), text: `+${pdef.genAmt}💧`, c, r, t: gt, col: 'text-yellow-300' });
        }
      }

      if (plant.type === 'NIGHTSHADE') {
        if (plant.lastFired == null) plant.lastFired = gt;
        const hasTarget = enemies.some(e => e.lane === r && e.x > c);
        if (hasTarget && gt - plant.lastFired >= pdef.fireRate) {
          projectiles.push(mkProjectile(r, c + 0.9, pdef.damage, pdef.projSpd));
          plant.lastFired = gt;
        }
      }

      if (plant.type === 'SAGE') {
        if (plant.lastHeal == null) plant.lastHeal = gt;
        if (gt - plant.lastHeal >= pdef.healRate) {
          plant.lastHeal = gt;
          const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
          for (const [ar, ac] of adj) {
            if (ar >= 0 && ar < ROWS && ac >= 0 && ac < COLS) {
              if (grid[ar][ac].plant) {
                const ap   = grid[ar][ac].plant;
                ap.hp = Math.min(PLANTS[ap.type].maxHp, ap.hp + pdef.healAmt);
              }
              // Gradual purification of adjacent tiles
              grid[ar][ac].blighted = false;
            }
          }
        }
      }
    }
  }

  // ── Wave progression ──────────────────────────────────────────────────────
  const allSpawned = waveStart !== null && waveIdx < WAVES.length && spawned >= WAVES[waveIdx].length;
  const allDead    = enemies.length === 0;

  if (!betweenWaves && allSpawned && allDead && waveStart !== null) {
    if (waveIdx >= WAVES.length - 1) {
      return { ...s, grid, enemies, projectiles, nutrients, vitality, floats, gt, phase: 'won' };
    }
    betweenWaves = true;
    breakStart   = gt;
  }

  if (betweenWaves && breakStart !== null && gt - breakStart >= WAVE_BREAK) {
    betweenWaves = false;
    waveIdx++;
    waveStart = gt;
    spawned   = 0;
    breakStart = null;
  }

  if (vitality <= 0) {
    return { ...s, grid, enemies, projectiles, nutrients, vitality: 0, floats, gt, phase: 'lost',
      waveIdx, waveStart, spawned, betweenWaves, breakStart };
  }

  return { ...s, grid, enemies, projectiles, nutrients, vitality, floats, gt,
    waveIdx, waveStart, spawned, betweenWaves, breakStart };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function BloomBlight() {
  const [state, setState] = useState(initState());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Game loop
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const id = setInterval(() => setState(prev => tick(prev)), TICK);
    return () => clearInterval(id);
  }, [state.phase]);

  const startGame = useCallback(() => {
    setState({ ...initState(), phase: 'playing', waveStart: 0 });
  }, []);

  const pickPlant = useCallback(type => {
    setState(prev => ({ ...prev, selected: prev.selected === type ? null : type }));
  }, []);

  const clickCell = useCallback((r, c) => {
    setState(prev => {
      if (prev.phase !== 'playing' || !prev.selected) return prev;
      const pdef = PLANTS[prev.selected];
      const cell = prev.grid[r][c];
      if (cell.plant) return prev;
      if (cell.blighted && prev.selected !== 'SAGE') return prev;
      if (prev.nutrients < pdef.cost) return prev;

      const grid = prev.grid.map(row => row.map(cl => ({ ...cl, plant: cl.plant ? { ...cl.plant } : null })));
      grid[r][c].plant = { type: prev.selected, hp: pdef.maxHp, maxHp: pdef.maxHp,
        lastFired: prev.gt, lastGen: prev.gt, lastHeal: prev.gt };

      // Sage: immediately purify own tile + adjacent
      if (prev.selected === 'SAGE') {
        grid[r][c].blighted = false;
        [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([ar, ac]) => {
          if (ar >= 0 && ar < ROWS && ac >= 0 && ac < COLS) grid[ar][ac].blighted = false;
        });
      }

      return { ...prev, grid, nutrients: prev.nutrients - pdef.cost, selected: null };
    });
  }, []);

  const { phase, vitality, nutrients, grid, enemies, projectiles, floats,
    selected, waveIdx, betweenWaves, breakStart, gt } = state;

  const vitPct   = (vitality / MAX_VIT) * 100;
  const vitColor = vitPct > 55 ? 'bg-green-500' : vitPct > 25 ? 'bg-yellow-500' : 'bg-red-600';
  const treeAttacked = enemies.some(e => e.attackingTree);

  const waveLabel = betweenWaves
    ? `Wave ${waveIdx + 1} cleared!  Next in ${Math.max(0, Math.ceil((WAVE_BREAK - (gt - (breakStart ?? gt))) / 1000))}s…`
    : state.waveStart !== null
    ? `Wave ${waveIdx + 1} / ${WAVES.length}`
    : '';

  // ── Menu ─────────────────────────────────────────────────────────────────
  if (phase === 'menu') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center p-10 rounded-2xl bg-gray-900 border border-green-900 shadow-2xl max-w-md w-full mx-4">
        <TreePine size={60} className="mx-auto text-green-500 mb-3" />
        <h1 className="text-4xl font-bold text-green-400 mb-1">Bloom &amp; Blight</h1>
        <p className="text-gray-400 text-sm mb-5">Defend the Heart-Tree. Survive all 4 waves.</p>
        <div className="text-left bg-gray-800 rounded-xl p-4 mb-5 text-xs text-gray-300 space-y-1">
          <p className="text-gray-500 font-semibold uppercase tracking-wider mb-2">Herbs</p>
          <p><span className="text-purple-400 font-bold">Lavender 50💧</span> — +25 Nutrients every 8 s</p>
          <p><span className="text-indigo-400 font-bold">Nightshade 100💧</span> — Fires Venom Bolts (20 dmg)</p>
          <p><span className="text-green-400 font-bold">Thistle 50💧</span> — 500 HP wall</p>
          <p><span className="text-emerald-400 font-bold">Sage 75💧</span> — Purifies Blighted tiles + heals adjacent</p>
          <p className="text-gray-500 font-semibold uppercase tracking-wider mt-3 mb-2">The Infected</p>
          <p><span className="text-amber-400 font-bold">Fungal Ant</span> — 50 HP · 1× speed · 20% blight</p>
          <p><span className="text-stone-400 font-bold">Spore Beetle</span> — 200 HP · 0.5× speed · 100% blight</p>
          <p><span className="text-yellow-400 font-bold">Cordyceps Wasp</span> — 40 HP · 1.5× speed · hops 1 plant</p>
        </div>
        <button onClick={startGame}
          className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl text-lg transition-colors shadow-lg">
          Begin Defense
        </button>
      </div>
    </div>
  );

  // ── Win ──────────────────────────────────────────────────────────────────
  if (phase === 'won') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center p-10 rounded-2xl bg-gray-900 border border-green-500 shadow-2xl">
        <TreePine size={70} className="mx-auto text-green-400 mb-4" />
        <h1 className="text-4xl font-bold text-green-300 mb-2">The Bloom Endures!</h1>
        <p className="text-gray-300 mb-1">Heart-Tree Vitality remaining: <span className="text-green-400 font-bold">{vitality}</span></p>
        <p className="text-gray-500 text-sm mb-6">All four waves defeated. The Blight recedes…</p>
        <button onClick={startGame}
          className="px-8 py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl text-lg transition-colors">
          Play Again
        </button>
      </div>
    </div>
  );

  // ── Loss ─────────────────────────────────────────────────────────────────
  if (phase === 'lost') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center p-10 rounded-2xl bg-gray-900 border border-red-800 shadow-2xl">
        <TreePine size={70} className="mx-auto text-red-600 mb-4" />
        <h1 className="text-4xl font-bold text-red-400 mb-2">The Blight Consumes…</h1>
        <p className="text-gray-300 mb-1">Heart-Tree Vitality depleted.</p>
        <p className="text-gray-500 text-sm mb-6">Fell on Wave {waveIdx + 1}. Plant faster next time.</p>
        <button onClick={startGame}
          className="px-8 py-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl text-lg transition-colors">
          Try Again
        </button>
      </div>
    </div>
  );

  // ── Playing ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden select-none">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-wrap shrink-0">
        {Object.values(PLANTS).map(pdef => {
          const { Icon } = pdef;
          const canAfford = nutrients >= pdef.cost;
          const isSel     = selected === pdef.id;
          return (
            <button key={pdef.id} onClick={() => pickPlant(pdef.id)} disabled={!canAfford}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all
                ${isSel     ? 'border-white bg-white/20 scale-105 shadow-white/20 shadow-md'
                : canAfford ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-400'
                            : 'border-gray-700 bg-gray-900 opacity-40 cursor-not-allowed'}`}>
              <Icon size={14} className={canAfford ? 'text-white' : 'text-gray-500'} />
              <span className={canAfford ? 'text-white' : 'text-gray-500'}>{pdef.name}</span>
              <span className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-gray-600'}`}>{pdef.cost}💧</span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-yellow-400 font-bold text-sm">💧 {nutrients}</span>
          {waveLabel && (
            <span className={`text-xs px-2 py-1 rounded-md font-semibold
              ${betweenWaves ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-300'}`}>
              {waveLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── HEART-TREE PANEL ── */}
        <div className="flex flex-col items-center py-3 px-2 bg-gray-900 border-r border-gray-800 w-14 shrink-0">
          <TreePine size={26}
            className={`mb-1 transition-colors ${treeAttacked ? 'text-red-500 animate-attack' : 'text-green-500'}`} />
          <div className="text-center text-gray-400 font-semibold leading-tight mb-2"
            style={{ fontSize: 9 }}>HEART<br/>TREE</div>
          {/* Vertical vitality bar */}
          <div className="flex-1 w-4 bg-gray-800 rounded-full overflow-hidden relative" style={{ minHeight: 140 }}>
            <div className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ${vitColor}`}
              style={{ height: `${vitPct}%` }} />
          </div>
          <div className="mt-1 text-xs font-bold text-gray-300">{vitality}</div>
          <Heart size={12} className={`mt-0.5 ${vitPct < 30 ? 'text-red-500 animate-attack' : 'text-red-400'}`} />
        </div>

        {/* ── GRID ── */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-3">
          <div className="flex flex-col gap-1">
            {/* Grid container */}
            <div className="relative border border-gray-700 rounded"
              style={{ width: COLS * CELL, height: ROWS * CELL }}>

              {/* ── Cells ── */}
              {grid.map((row, r) => row.map((cell, c) => {
                const canPlace = selected &&
                  !cell.plant &&
                  (!cell.blighted || selected === 'SAGE') &&
                  nutrients >= (PLANTS[selected]?.cost ?? Infinity);
                return (
                  <div key={`${r}-${c}`} onClick={() => clickCell(r, c)}
                    className={`absolute border transition-colors
                      ${cell.blighted
                          ? 'bg-purple-950 border-purple-800'
                          : (r + c) % 2 === 0 ? 'bg-gray-900 border-gray-800' : 'bg-gray-950 border-gray-800'}
                      ${canPlace ? 'cursor-pointer hover:bg-green-950 hover:border-green-700' : 'cursor-default'}`}
                    style={{ left: c * CELL, top: r * CELL, width: CELL, height: CELL }}>

                    {/* Blight spore icon */}
                    {cell.blighted && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-20 text-xl pointer-events-none">🍄</div>
                    )}

                    {/* Plant */}
                    {cell.plant && (() => {
                      const pd  = PLANTS[cell.plant.type];
                      const { Icon: PI } = pd;
                      const hp  = cell.plant.hp / cell.plant.maxHp;
                      return (
                        <div className={`absolute inset-1 rounded-md border-2 flex flex-col items-center justify-center gap-0.5 ${pd.bg} ${pd.border}`}>
                          <PI size={18} className="text-white drop-shadow" />
                          <div className="w-full px-1.5">
                            <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all
                                ${hp > 0.5 ? 'bg-green-400' : hp > 0.25 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                style={{ width: `${hp * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              }))}

              {/* ── Projectiles ── */}
              {projectiles.map(p => (
                <div key={p.id} className="absolute rounded-full bg-green-400 shadow-md shadow-green-400/60 z-10 pointer-events-none"
                  style={{ width: 10, height: 10, left: p.x * CELL - 5, top: p.lane * CELL + CELL / 2 - 5 }} />
              ))}

              {/* ── Enemies ── */}
              {enemies.map(e => {
                const def  = ENEMIES[e.type];
                const hpPct = e.hp / def.maxHp;
                const left  = (e.x - 0.5) * CELL;
                const top   = e.lane * CELL;
                return (
                  <div key={e.id} className="absolute z-20 pointer-events-none flex flex-col items-center justify-center"
                    style={{ left, top, width: CELL, height: CELL }}>
                    <div className={`rounded-full border-2 border-black/40 flex items-center justify-center
                      ${def.bg} ${e.attacking ? 'animate-attack' : ''}`}
                      style={{ width: def.sz, height: def.sz }}>
                      <Bug size={Math.floor(def.sz * 0.55)} className="text-white" />
                    </div>
                    {/* HP bar */}
                    <div className="mt-0.5 rounded-full overflow-hidden bg-black/50" style={{ width: 30, height: 4 }}>
                      <div className={`h-full rounded-full ${hpPct > 0.5 ? 'bg-red-400' : hpPct > 0.25 ? 'bg-orange-500' : 'bg-red-700'}`}
                        style={{ width: `${hpPct * 100}%` }} />
                    </div>
                  </div>
                );
              })}

              {/* ── Floating text ── */}
              {floats.map(f => (
                <div key={f.id}
                  className={`absolute z-30 text-xs font-bold pointer-events-none float-nutrient ${f.col}`}
                  style={{ left: f.c * CELL + CELL * 0.3, top: f.r * CELL + 4 }}>
                  {f.text}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-1 text-xs text-gray-500 justify-center">
              <span><span className="text-amber-500">■</span> Fungal Ant</span>
              <span><span className="text-stone-400">■</span> Spore Beetle</span>
              <span><span className="text-yellow-400">■</span> Cordyceps Wasp</span>
              <span><span className="text-purple-700">■</span> Blighted tile</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Selected plant tooltip ── */}
      {selected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50
          bg-gray-900 border border-gray-600 rounded-xl px-4 py-2 text-xs text-gray-300 shadow-2xl flex items-center gap-3">
          <Leaf size={14} className="text-green-400" />
          <span><span className="text-white font-bold">{PLANTS[selected].name}</span> — {PLANTS[selected].desc}</span>
          {selected !== 'SAGE' && <span className="text-purple-400">· Cannot place on Blighted tiles</span>}
          <button onClick={() => setState(p => ({ ...p, selected: null }))}
            className="ml-2 text-red-400 hover:text-red-300 font-bold">✕</button>
        </div>
      )}
    </div>
  );
}
