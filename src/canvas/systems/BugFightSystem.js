/* ─── BUG FIGHT SYSTEM ───
   Bugs spread across entire canvas attacking workstations.
   Agents equip weapons and hunt them down. 10-15 second fight.
   ──────────────────────── */

import Bug from '../entities/Bug.js';
import ZapBeam from '../entities/ZapBeam.js';
import { AGENT_STATES } from '../entities/Agent.js';

const ZAP_RANGE = 45;
const MAX_BUGS = 14;
const WAVE_INTERVAL = 3.0; // seconds between waves
const CHASE_DELAY = 1.8; // seconds before agents start chasing (let bugs spread first)
const WEAPON_TYPES = ['beam', 'sword', 'shield'];

export default class BugFightSystem {
  constructor(world) {
    this.world = world;
    this.waveTimer = 0;
    this.wavesSpawned = 0;
    this.maxWaves = 4; // More waves = longer fight (10-15s)
    this.fightTimer = 0;
  }

  spawnBugs(count) {
    const { bugZone, bugs, nodes } = this.world;
    if (!bugZone) return;
    const cx = bugZone.x + bugZone.w / 2;
    const cy = bugZone.y + bugZone.h / 2;

    for (let i = 0; i < count && bugs.length < MAX_BUGS; i++) {
      const bug = new Bug(
        cx + (Math.random() - 0.5) * bugZone.w * 0.5,
        cy + (Math.random() - 0.5) * bugZone.h * 0.5,
        { x: cx, y: cy },
      );

      // Bugs target random workstations to "attack"
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
        // Assign weapon type based on agent id
        best.weaponType = WEAPON_TYPES[(best.homeNode + best.id) % WEAPON_TYPES.length];
        bug.targetAgent = best;
        bug.state = 'fleeing';
      }
    }
  }

  update(dt) {
    const world = this.world;
    if (!world.bugFightActive) return;

    this.fightTimer += dt;

    // Spawn waves — spread over time for 10-15s total
    if (this.wavesSpawned < this.maxWaves) {
      this.waveTimer += dt;
      if (this.waveTimer > WAVE_INTERVAL) {
        this.spawnBugs(4 + Math.floor(Math.random() * 3));
        this.waveTimer = 0;
      }
    }

    // Assign chasers — delay so bugs spread across canvas first
    if (this.fightTimer > CHASE_DELAY) {
      this.assignChasers();
    }

    // Check for zap-range hits
    for (const agent of world.agents) {
      if (agent.state !== AGENT_STATES.BUG_CHASE || !agent.chasingBug) continue;
      const bug = agent.chasingBug;
      const dist = Math.hypot(agent.x - bug.x, agent.y - bug.y);

      if (dist < ZAP_RANGE && bug.state === 'fleeing') {
        bug.state = 'being_zapped';
        const beam = new ZapBeam(agent, bug);
        world.beams.push(beam);
      }

      if (bug.state === 'returning' || bug.life <= 0) {
        agent.chasingBug = null;
        agent.weaponType = null;
        agent.returnHome();
      }
    }

    // Update bugs
    world.bugs.forEach(b => b.update(dt, world.time, world));

    // Update beams
    world.beams.forEach(b => b.update(dt));

    // Cleanup
    world.bugs = world.bugs.filter(b => b.life > 0);
    world.beams = world.beams.filter(b => b.life > 0);

    // Auto-end after 15 seconds or when all bugs cleared
    if (world.bugs.length === 0 && this.wavesSpawned >= this.maxWaves) {
      this.reset();
      world.bugZone.targetLidOpen = 0;
      world.dispatch('BUG_CONTAINED');
    }
    if (this.fightTimer > 16) {
      // Force end
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
