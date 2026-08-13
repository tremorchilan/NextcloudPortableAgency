import { runCommand, type ExecFn } from './exec';

export interface ContainerStatus {
  name: string;
  service: string;
  state: string;
  status: string;
  health?: string;
}

/** Docker CLI wrapper — all docker interactions of the extension flow through here. */
export class DockerCli {
  constructor(private exec: ExecFn = runCommand) {}

  async isAvailable(): Promise<boolean> {
    const r = await this.exec('docker', ['--version']);
    return r.code === 0;
  }

  async composeAvailable(): Promise<boolean> {
    const r = await this.exec('docker', ['compose', 'version']);
    return r.code === 0;
  }

  async composeUp(cwd: string, env: Record<string, string> = {}): Promise<{ stdout: string; stderr: string; code: number }> {
    return this.exec('docker', ['compose', 'up', '-d'], { cwd, env });
  }

  async composeDown(cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
    return this.exec('docker', ['compose', 'down'], { cwd });
  }

  async composePs(cwd: string): Promise<ContainerStatus[]> {
    const r = await this.exec('docker', ['compose', 'ps', '--format', 'json'], { cwd });
    if (r.code !== 0) return [];
    const out: ContainerStatus[] = [];
    for (const line of r.stdout.split('\n').map((l) => l.trim()).filter(Boolean)) {
      try {
        const j = JSON.parse(line) as Record<string, unknown>;
        out.push({
          name: String(j.Name ?? ''),
          service: String(j.Service ?? ''),
          state: String(j.State ?? 'unknown'),
          status: String(j.Status ?? ''),
          health: j.Health ? String(j.Health) : undefined
        });
      } catch {
        // tolerate lines we can't parse
      }
    }
    return out;
  }

  async composePull(cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
    return this.exec('docker', ['compose', 'pull'], { cwd });
  }
}
