"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneOrPullRepo = cloneOrPullRepo;
exports.deleteRepo = deleteRepo;
exports.getRepoPath = getRepoPath;
exports.repoExists = repoExists;
exports.getRepoFileTree = getRepoFileTree;
exports.getPackageJson = getPackageJson;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const REPOS_ROOT = process.env.REPOS_ROOT || '/var/devmanager/repos';
/**
 * Clone or update a GitHub repo for a project.
 * Returns the local path to the cloned repo.
 */
async function cloneOrPullRepo(projectId, repoOwner, repoName, githubToken) {
    const repoPath = path_1.default.join(REPOS_ROOT, projectId);
    const cloneUrl = `https://x-access-token:${githubToken}@github.com/${repoOwner}/${repoName}.git`;
    if (fs_1.default.existsSync(path_1.default.join(repoPath, '.git'))) {
        // Already cloned — pull latest from default branch
        await execAsync('git pull --ff-only', { cwd: repoPath });
    }
    else {
        fs_1.default.mkdirSync(repoPath, { recursive: true });
        // Shallow clone for speed — depth 1 is enough for code context
        await execAsync(`git clone --depth=1 "${cloneUrl}" .`, { cwd: repoPath });
    }
    return repoPath;
}
/**
 * Delete a project's local repo directory.
 */
async function deleteRepo(projectId) {
    const repoPath = path_1.default.join(REPOS_ROOT, projectId);
    if (fs_1.default.existsSync(repoPath)) {
        await execAsync(`rm -rf "${repoPath}"`);
    }
}
/**
 * Return the expected local path for a project repo.
 */
function getRepoPath(projectId) {
    return path_1.default.join(REPOS_ROOT, projectId);
}
/**
 * Check whether a project's repo has been cloned locally.
 */
function repoExists(projectId) {
    return fs_1.default.existsSync(path_1.default.join(REPOS_ROOT, projectId, '.git'));
}
/**
 * Get a brief file tree summary for the repo (top 2 levels) to inject as context.
 */
async function getRepoFileTree(projectId) {
    const repoPath = path_1.default.join(REPOS_ROOT, projectId);
    if (!repoExists(projectId))
        return '';
    try {
        const { stdout } = await execAsync('find . -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.next/*" -maxdepth 3 -type f | sort | head -100', { cwd: repoPath });
        return stdout.trim();
    }
    catch {
        return '';
    }
}
/**
 * Get package.json content for tech stack detection.
 */
async function getPackageJson(projectId) {
    const pkgPath = path_1.default.join(REPOS_ROOT, projectId, 'package.json');
    if (!fs_1.default.existsSync(pkgPath))
        return null;
    try {
        return JSON.parse(fs_1.default.readFileSync(pkgPath, 'utf8'));
    }
    catch {
        return null;
    }
}
