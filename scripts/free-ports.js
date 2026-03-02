#!/usr/bin/env node
const { execSync } = require('child_process');

const ports = process.argv.slice(2).map((p) => Number(p)).filter((p) => Number.isInteger(p) && p > 0);

if (ports.length === 0) {
    process.exit(0);
}

const killOnWindows = (port) => {
    try {
        const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        const pids = Array.from(
            new Set(
                output
                    .split(/\r?\n/)
                    .map((line) => line.trim().split(/\s+/).pop())
                    .filter((pid) => pid && /^\d+$/.test(pid))
            )
        );

        for (const pid of pids) {
            if (pid === String(process.pid)) continue;
            try {
                execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                console.log(`Freed port ${port} (killed PID ${pid})`);
            } catch {
                // Ignore per-PID failures
            }
        }
    } catch {
        // No process found on this port
    }
};

if (process.platform === 'win32') {
    for (const port of ports) killOnWindows(port);
} else {
    // Keep behavior safe on non-Windows environments.
    console.log(`Skipping port cleanup on ${process.platform}: ${ports.join(', ')}`);
}
