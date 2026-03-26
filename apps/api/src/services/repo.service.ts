import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const REPOS_ROOT = process.env.REPOS_ROOT || '/var/devmanager/repos';

/**
 * Clone or update a GitHub repo for a project.
 * Returns the local path to the cloned repo.
 */
export async function cloneOrPullRepo(
    projectId: string,
    repoOwner: string,
    repoName: string,
    githubToken: string
): Promise<string> {
    const repoPath = path.join(REPOS_ROOT, projectId);
    const cloneUrl = `https://x-access-token:${githubToken}@github.com/${repoOwner}/${repoName}.git`;

    if (fs.existsSync(path.join(repoPath, '.git'))) {
        // Already cloned — pull latest from default branch
        await execAsync('git pull --ff-only', { cwd: repoPath });
    } else {
        fs.mkdirSync(repoPath, { recursive: true });
        // Shallow clone for speed — depth 1 is enough for code context
        await execAsync(`git clone --depth=1 "${cloneUrl}" .`, { cwd: repoPath });
    }

    return repoPath;
}

/**
 * Delete a project's local repo directory.
 */
export async function deleteRepo(projectId: string): Promise<void> {
    const repoPath = path.join(REPOS_ROOT, projectId);
    if (fs.existsSync(repoPath)) {
        await execAsync(`rm -rf "${repoPath}"`);
    }
}

/**
 * Return the expected local path for a project repo.
 */
export function getRepoPath(projectId: string): string {
    return path.join(REPOS_ROOT, projectId);
}

/**
 * Check whether a project's repo has been cloned locally.
 */
export function repoExists(projectId: string): boolean {
    return fs.existsSync(path.join(REPOS_ROOT, projectId, '.git'));
}

/**
 * Get a brief file tree summary for the repo (top 2 levels) to inject as context.
 */
export async function getRepoFileTree(projectId: string): Promise<string> {
    const repoPath = path.join(REPOS_ROOT, projectId);
    if (!repoExists(projectId)) return '';
    try {
        const { stdout } = await execAsync(
            'find . -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.next/*" -maxdepth 3 -type f | sort | head -100',
            { cwd: repoPath }
        );
        return stdout.trim();
    } catch {
        return '';
    }
}

/**
 * Get package.json content for tech stack detection.
 */
export async function getPackageJson(projectId: string): Promise<any | null> {
    const pkgPath = path.join(REPOS_ROOT, projectId, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
        return null;
    }
}
