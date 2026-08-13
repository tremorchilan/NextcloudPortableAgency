import { DockerCli } from '../utils/docker';
import type { EmpirePaths } from '../core/types';

export interface DockgeStatus {
  url: string;
  running: boolean;
  stackRunning: boolean;
}

/**
 * Dockge quick access (whitepaper §3.1 / P2): resolves Dockge's URL inside an
 * Empire and checks whether the stack is up so the UI can offer to start it.
 * Dockge itself runs as-is inside the Empire — we never reimplement it.
 */
export class DockgeLauncher {
  constructor(private docker: DockerCli) {}

  async status(paths: EmpirePaths, port: number): Promise<DockgeStatus> {
    const containers = await this.docker.composePs(paths.root);
    const dockge = containers.find((c) => c.service === 'dockge');
    const running = dockge?.state === 'running';
    const stackRunning = containers.some((c) => c.state === 'running');
    return {
      url: `http://127.0.0.1:${port}`,
      running,
      stackRunning
    };
  }
}
