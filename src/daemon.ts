/**
 * Daemon manager for running bridge server in background
 * Each project gets its own daemon process with separate port, PID file, and log file
 */

import { spawn } from 'child_process';
import { createConnection } from 'net';
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, openSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DAEMON_DIR = join(homedir(), '.discord-agent-bridge');
const BASE_PORT = 18470;
const PORT_RANGE = 1000;

export class DaemonManager {
  /**
   * Get a deterministic port for a project name
   */
  static getProjectPort(projectName: string): number {
    let hash = 0;
    for (let i = 0; i < projectName.length; i++) {
      hash = ((hash << 5) - hash + projectName.charCodeAt(i)) | 0;
    }
    return BASE_PORT + (Math.abs(hash) % PORT_RANGE);
  }

  private static pidFile(projectName: string): string {
    return join(DAEMON_DIR, `${projectName}.pid`);
  }

  private static logFile(projectName: string): string {
    return join(DAEMON_DIR, `${projectName}.log`);
  }

  /**
   * Check if something is listening on the given port
   */
  static isRunning(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const conn = createConnection({ port, host: '127.0.0.1' });
      conn.on('connect', () => {
        conn.destroy();
        resolve(true);
      });
      conn.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Start the bridge server as a detached background process for a specific project
   */
  static startDaemon(entryPoint: string, projectName: string, port: number): number {
    if (!existsSync(DAEMON_DIR)) {
      mkdirSync(DAEMON_DIR, { recursive: true });
    }

    const logFile = DaemonManager.logFile(projectName);
    const pidFile = DaemonManager.pidFile(projectName);

    const out = openSync(logFile, 'a');
    const err = openSync(logFile, 'a');

    const child = spawn('node', [entryPoint], {
      detached: true,
      stdio: ['ignore', out, err],
      env: {
        ...process.env,
        HOOK_SERVER_PORT: String(port),
      },
    });

    child.unref();

    const pid = child.pid!;
    writeFileSync(pidFile, String(pid));

    return pid;
  }

  /**
   * Stop the daemon for a specific project
   */
  static stopDaemon(projectName: string): boolean {
    const pidFile = DaemonManager.pidFile(projectName);

    if (!existsSync(pidFile)) {
      return false;
    }

    try {
      const pid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10);
      process.kill(pid, 'SIGTERM');
      unlinkSync(pidFile);
      return true;
    } catch {
      try { unlinkSync(pidFile); } catch { /* ignore */ }
      return false;
    }
  }

  /**
   * Wait for the daemon to start listening on a port
   */
  static async waitForReady(port: number, timeoutMs: number = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await DaemonManager.isRunning(port)) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  }

  static getLogFile(projectName: string): string {
    return DaemonManager.logFile(projectName);
  }

  static getPidFile(projectName: string): string {
    return DaemonManager.pidFile(projectName);
  }
}
