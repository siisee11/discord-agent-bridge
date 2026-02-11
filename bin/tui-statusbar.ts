#!/usr/bin/env bun

const ai = process.env.AGENT_STATUS_AI || 'unknown';
const cwd = process.env.AGENT_STATUS_CWD || process.cwd();
const channel = process.env.AGENT_STATUS_CHANNEL || 'not connected';

function render(): void {
  const width = process.stdout.columns || 120;
  const line = ` ai: ${ai} | cwd: ${cwd} | channel: ${channel} `;
  const clipped = line.length > width ? `${line.slice(0, Math.max(0, width - 1))}` : line;
  process.stdout.write(`\x1b[40m\x1b[97m\x1b[2K\r${clipped.padEnd(width, ' ')}\x1b[0m`);
}

process.stdout.write('\x1b[?25l');
render();

process.on('SIGWINCH', () => {
  render();
});

const timer = setInterval(() => {
  render();
}, 1000);

function cleanupAndExit(): void {
  clearInterval(timer);
  process.stdout.write('\x1b[2K\r\x1b[?25h');
  process.exit(0);
}

process.on('SIGTERM', cleanupAndExit);
process.on('SIGINT', cleanupAndExit);
process.stdin.resume();
