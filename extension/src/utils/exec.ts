import { execFile } from 'node:child_process';

export type ExecFn = (
  command: string,
  args: string[],
  options?: { cwd?: string; env?: Record<string, string> }
) => Promise<{ stdout: string; stderr: string; code: number }>;

/**
 * Promisified execFile with output capture. Never rejects — callers inspect `code`.
 */
export const runCommand: ExecFn = (command, args, options = {}) =>
  new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : process.env,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          code: error ? (typeof (error as { code?: number | string }).code === 'number' ? ((error as { code: number }).code) : 1) : 0
        });
      }
    );
  });

/** Run and throw with combined output when the exit code is non-zero. */
export async function runOrThrow(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: Record<string, string> }
): Promise<{ stdout: string; stderr: string; code: number }> {
  const result = await runCommand(command, args, options);
  if (result.code !== 0) {
    throw new Error(
      `Command failed (${command} ${args.join(' ')}):\n${result.stderr || result.stdout || 'no output'}`
    );
  }
  return result;
}
