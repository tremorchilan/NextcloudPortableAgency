import * as fs from 'node:fs';
import { safeJsonParse, writeJsonAtomic } from '../utils/files';
import { defaultEmpireState, type AgentActivity, type EmpireState, type EmpirePaths } from './types';

/**
 * Tracks `.empire/state.json`: which agent last worked, agent session counts,
 * service status, and the stack status. All writes are atomic (temp+rename).
 */
export class StateManager {
  read(paths: EmpirePaths): EmpireState {
    const state = safeJsonParse<Partial<EmpireState>>(paths.statePath, defaultEmpireState());
    return {
      ...defaultEmpireState(),
      ...state,
      schemaVersion: state.schemaVersion ?? 1
    };
  }

  update(paths: EmpirePaths, patch: Partial<EmpireState>): EmpireState {
    const current = this.read(paths);
    const next: EmpireState = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    fs.mkdirSync(paths.empireDir, { recursive: true });
    writeJsonAtomic(paths.statePath, next);
    return next;
  }

  /** Record that an agent started a session; sets lastAgent and bumps its counter. */
  recordAgentSession(paths: EmpirePaths, agentId: string, now: string): EmpireState {
    const current = this.read(paths);
    const agents = current.agents.filter((a) => a.agent !== agentId);
    const previous = current.agents.find((a) => a.agent === agentId);
    const entry: AgentActivity = {
      agent: agentId,
      lastActiveAt: now,
      sessions: (previous?.sessions ?? 0) + 1
    };
    agents.push(entry);
    return this.update(paths, { lastAgent: agentId, agents, stackStatus: current.stackStatus });
  }

  setServiceStatus(paths: EmpirePaths, name: string, status: string): EmpireState {
    const current = this.read(paths);
    const services = current.services.filter((s) => s.name !== name);
    services.push({ name, status });
    return this.update(paths, { services });
  }

  setStackStatus(paths: EmpirePaths, stackStatus: string): EmpireState {
    return this.update(paths, { stackStatus });
  }
}
