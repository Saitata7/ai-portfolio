/* ─── BUG FIGHT SYSTEM ───
   Bugs spread across entire canvas attacking workstations.
   Agents equip guns and shoot them down. Cinematic gunfight.
   ──────────────────────── */

import Bug from '../entities/Bug.js';
import Bullet from '../entities/Bullet.js';
import { AGENT_STATES } from '../entities/Agent.js';

const SHOOT_RANGE = 120; // agents shoot from distance
const CHASE_STOP_RANGE = 80; // stop chasing, start shooting
const SHOOT_COOLDOWN = 0.45; // seconds between shots
const WAVE_INTERVAL = 3.0;
const CHASE_DELAY = 1.8;

function getTierLimits(tier) {
  if (tier === 'xs') return { maxBugs: 6, maxWaves: 2, perWave: 3 };
  if (tier === 'sm') return { maxBugs: 10, maxWaves: 3, perWave: 4 };
  return { maxBugs: 14, maxWaves: 4, perWave: 6 };
}

export default class BugFightSystem {
  constructor(world) {
    this.world = world;
    this.waveTimer = 0;
    this.wavesSpawned = 0;
    this.fightTimer = 0;
  }

  spawnBugs(count) {
    const { bugZone, bugs, nodes } = this.world;
    if (!bugZone) return;
    const cx = bugZone.x + bugZone.w / 2;
    const cy = bugZone.y + bugZone.h / 2;
    const { maxBugs } = getTierLimits(this.world.layoutTier);

    for (let i = 0; i < count && bugs.length < maxBugs; i++) {
      const bug = new Bug(
        cx + (Math.random() - 0.5) * bugZone.w * 0.5,
        cy + (Math.random() - 0.5) * bugZone.h * 0.5,
        { x: cx, y: cy },
      );

      const targetNode = nodes[Math.floor(Math.random() * nodes.length)];
      bug.attackTarget = { x: targetNode.x, y: targetNode.y };

      bug.escape(cx, cy);
      bugs.push(bug);
    }
    this.wavesSpawned++;
  }

  assignChasers() {
    const { agents, bugs } = this.world;
    const freeBugs = bugs.filter(
      b => (b.state === 'escaping' || b.state === 'fleeing') && !b.targetAgent,
    );
    const freeAgents = agents.filter(
      a => [AGENT_STATES.IDLE, AGENT_STATES.WALK_HOME].includes(a.state) && !a.chasingBug,
    );

    for (const bug of freeBugs) {
      let best = null, bestDist = Infinity;
      for (const agent of freeAgents) {
        if (agent.chasingBug) continue;
        const d = Math.hypot(agent.x - bug.x, agent.y - bug.y);
        if (d < bestDist) { bestDist = d; best = agent; }
      }
      if (best) {
        best.state = AGENT_STATES.BUG_CHASE;
        best.chasingBug = bug;
        best.weaponType = 'gun';
        best.shootCooldown = 0.3; // short initial delay before first shot
        bug.targetAgent = best;
        bug.state = 'fleeing';
      }
    }
  }

  update(dt) {
    const world = this.world;
    if (!world.bugFightActive) return;

    this.fightTimer += dt;

    // Spawn waves
    const limits = getTierLimits(world.layoutTier);
    if (this.wavesSpawned < limits.maxWaves) {
      this.waveTimer += dt;
      if (this.waveTimer > WAVE_INTERVAL) {
        this.spawnBugs(limits.perWave - 2 + Math.floor(Math.random() * 3));
        this.waveTimer = 0;
      }
    }

    // Assign chasers
    if (this.fightTimer > CHASE_DELAY) {
      this.assignChasers();
    }

    // Agents chase + shoot
    for (const agent of world.agents) {
      if (agent.state !== AGENT_STATES.BUG_CHASE || !agent.chasingBug) continue;
      const bug = agent.chasingBug;
      const dist = Math.hypot(agent.x - bug.x, agent.y - bug.y);

      // Shoot cooldown
      if (agent.shootCooldown > 0) agent.shootCooldown -= dt;

      // In shoot range? Fire!
      if (dist < SHOOT_RANGE && bug.state === 'fleeing' && agent.shootCooldown <= 0) {
        const bullet = new Bullet(agent, bug);
        world.beams.push(bullet);
        agent.shootCooldown = SHOOT_COOLDOWN;
        // Recoil kick
        agent.surprise = 0.3;
      }

      // Bug dead or returning? Release agent
      if (bug.state === 'returning' || bug.life <= 0) {
        agent.chasingBug = null;
        agent.weaponType = null;
        agent.returnHome();
      }
    }

    // Update bugs
    world.bugs.forEach(b => b.update(dt, world.time, world));

    // Update bullets
    world.beams.forEach(b => b.update(dt));

    // Cleanup
    world.bugs = world.bugs.filter(b => b.life > 0);
    world.beams = world.beams.filter(b => b.life > 0);

    // Auto-end
    if (world.bugs.length === 0 && this.wavesSpawned >= limits.maxWaves) {
      this.reset();
      world.bugZone.targetLidOpen = 0;
      world.dispatch('BUG_CONTAINED');
    }
    if (this.fightTimer > 16) {
      this.sealVault();
    }
  }

  sealVault() {
    const { bugs, bugZone } = this.world;
    if (!bugZone) return;
    const cx = bugZone.x + bugZone.w / 2;
    const cy = bugZone.y + bugZone.h / 2;

    bugs.forEach(b => {
      if (b.state !== 'returning') {
        b.startReturn(cx, cy);
        if (b.targetAgent) {
          b.targetAgent.chasingBug = null;
          b.targetAgent.weaponType = null;
          b.targetAgent.returnHome();
          b.targetAgent = null;
        }
      }
    });
  }

  reset() {
    this.waveTimer = 0;
    this.wavesSpawned = 0;
    this.fightTimer = 0;
  }
}
