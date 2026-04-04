import { resolveServerUrl } from './opencode.service';
import { repoExists, getRepoFileTree, getPackageJson, cloneOrPullRepo } from './repo.service';

// OpenCode server URL used when no project repo is available (global fallback)
const GLOBAL_OPENCODE_URL = process.env.OPENCODE_URL || 'http://localhost:5001';

export interface TaskDraft {
    projectId?: string | null;
    title?: string;
    description?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
    aiPrompt?: string; // original user description used to generate the plan
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AIChatResponse {
    reply: string;
    taskDraft: TaskDraft;
    action: 'continue' | 'create' | 'confirm' | 'error';
    suggestions?: string[];
}

interface Project {
    _id: string;
    name: string;
    repoLocalPath?: string;
    githubRepoOwner?: string;
    githubRepoName?: string;
}

interface TeamMember {
    _id: string;
    firstName: string;
    lastName: string;
}

async function ensureProjectRepoAvailable(currentProject: Project | undefined): Promise<Project | undefined> {
    const projectId = currentProject?._id?.toString?.();
    if (!currentProject || !projectId) return currentProject;
    if (repoExists(projectId)) return currentProject;
    if (!currentProject.githubRepoOwner || !currentProject.githubRepoName) return currentProject;

    try {
        const GithubConfig = (await import('../models/GithubConfig')).default;
        const githubConfig = await GithubConfig.findOne().select('personalAccessToken');
        if (!githubConfig?.personalAccessToken) return currentProject;

        const repoLocalPath = await cloneOrPullRepo(
            projectId,
            currentProject.githubRepoOwner,
            currentProject.githubRepoName,
            githubConfig.personalAccessToken
        );

        const ProjectModel = (await import('../models/Project')).default;
        await ProjectModel.findByIdAndUpdate(projectId, {
            repoLocalPath,
            repoClonedAt: new Date(),
        });

        return {
            ...currentProject,
            repoLocalPath,
        };
    } catch (error: any) {
        console.warn(`[ai.service] Failed to auto-setup repo for project ${projectId}:`, error?.message || error);
        return currentProject;
    }
}

// ─── OpenCode API helpers ────────────────────────────────────────────────────

async function createSession(baseUrl: string, title: string): Promise<string> {
    const res = await fetch(`${baseUrl}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`OpenCode createSession failed: ${res.status}`);
    const data: any = await res.json();
    return data.id;
}

async function deleteSession(baseUrl: string, sessionId: string): Promise<void> {
    await fetch(`${baseUrl}/session/${sessionId}`, { method: 'DELETE' }).catch(() => { });
}

async function sendAndWaitForReply(
    baseUrl: string,
    sessionId: string,
    text: string,
    maxWaitMs = 90000
): Promise<string> {
    // Send user message
    const res = await fetch(`${baseUrl}/session/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            parts: [{ type: 'text', text }],
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenCode sendMessage failed: ${res.status} ${err}`);
    }

    // Poll for assistant reply completion
    const deadline = Date.now() + maxWaitMs;
    let lastMessageLength = 0;
    let stableCount = 0;

    // Small initial wait to let process kick off
    await new Promise(r => setTimeout(r, 500)); 

    while (Date.now() < deadline) {
        const listRes = await fetch(`${baseUrl}/session/${sessionId}/message`);
        if (!listRes.ok) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }

        const data: any = await listRes.json();
        const messages: any[] = Array.isArray(data) ? data : [];

        const assistantMsgs = messages.filter(
            (m: any) => m.info?.role === 'assistant'
        );

        if (assistantMsgs.length === 0) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }

        const last = assistantMsgs[assistantMsgs.length - 1];

        // Extract text content from parts
        const parts: any[] = last.parts || [];
        const text = parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('\n')
            .trim();

        // Check multiple completion signals OpenCode may use
        const status = last.info?.status;
        const isFinished =
            status?.finishedAt != null ||
            last.info?.finishedAt != null ||
            status?.type === 'completed' ||
            status?.type === 'error' ||
            status === 'completed' ||
            // Stable text length across 3 polls (3 seconds) is a reliable fallback
            (text.length > 50 && text.length === lastMessageLength && ++stableCount >= 3);

        if (text.length !== lastMessageLength) {
            lastMessageLength = text.length;
            stableCount = 0;
        }

        if (!isFinished) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }

        if (text) return text;
    }

    throw new Error('Antigravity did not respond within the timeout period');
}

// ─── System prompt builder ───────────────────────────────────────────────────

async function buildPrompt(
    messages: ChatMessage[],
    taskDraft: TaskDraft,
    projects: Project[],
    teamMembers: TeamMember[],
    currentProject: Project | undefined
): Promise<string> {
    const projectNames = projects
        .map(p => `${p.name} (id: ${p._id})`)
        .join(', ') || 'No projects';

    const memberNames = teamMembers
        .map(m => `${m.firstName} ${m.lastName} (id: ${m._id})`)
        .join(', ') || 'No team members';

    const today = new Date().toISOString().split('T')[0];

    // Build repo context block if we have a cloned repo
    let repoContext = '';
    const projectIdStr = currentProject?._id?.toString?.();
    if (projectIdStr && repoExists(projectIdStr)) {
        const fileTree = await getRepoFileTree(projectIdStr);
        const pkg = await getPackageJson(projectIdStr);

        const stack: string[] = [];
        if (pkg?.dependencies) stack.push(...Object.keys(pkg.dependencies).slice(0, 15));
        if (pkg?.devDependencies) stack.push(...Object.keys(pkg.devDependencies).slice(0, 10));

        repoContext = `
=== CODEBASE CONTEXT ===
Project repo is available. Use it to generate accurate, file-specific implementation plans.

Tech stack (from package.json):
${stack.length ? stack.join(', ') : 'Unknown'}

File tree (top 3 levels, excluding node_modules/dist/.git):
${fileTree || 'Not available'}
========================
`;
    }

    const conversationHistory = messages.length
        ? messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
        : '';

    return `You are an AI task planning assistant embedded in a project management tool called DevManager.
Your role: understand the task the user wants to do, generate a detailed implementation plan, and collect task metadata.

Available projects: ${projectNames}
Available team members: ${memberNames}
Today's date: ${today}
${repoContext}
INSTRUCTIONS FOR STREAMING RESPONSES:
1. Open your response by talking to the user conversationally. This text will be streamed live to the user.
2. After your conversational reply, you MUST append a strict JSON block wrapped in \`\`\`json and \`\`\` bounds. 
3. The JSON block MUST contain the updated task draft and metadata.

FORMAT OF JSON METADATA TO APPEND AT THE END:
\`\`\`json
{
  "taskDraft": {
    "title": "", 
    "projectId": null, 
    "priority": "medium", 
    "assigneeId": null, 
    "dueDate": null, 
    "description": "", 
    "aiPrompt": ""
  }, 
  "action": "continue|confirm|create|error", 
  "suggestions": ["..."]
}
\`\`\`

Rules:
- aiPrompt = user's original task description (set immediately, never change)
- description = full implementation plan (generate once you know title + project)
- action "confirm" = show plan summary + ask "Shall I create this task?"
- action "create" = user confirmed, ready to save
- Provide 2-4 quick-reply suggestions inside the JSON.

${conversationHistory ? `Conversation so far:\n${conversationHistory}` : ''}

Current task draft state: ${JSON.stringify(taskDraft)}

Remember: Start with conversational text, then output the JSON metadata block. Do NOT just output JSON.`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function* streamAndWaitForReply(
    baseUrl: string,
    sessionId: string,
    text: string,
    maxWaitMs = 90000
): AsyncGenerator<string, void, unknown> {
    const res = await fetch(`${baseUrl}/session/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: [{ type: 'text', text }] }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenCode sendMessage failed: ${res.status} ${err}`);
    }

    const deadline = Date.now() + maxWaitMs;
    let lastYieldedLength = 0;
    let stableCount = 0;

    await new Promise(r => setTimeout(r, 500));

    while (Date.now() < deadline) {
        const listRes = await fetch(`${baseUrl}/session/${sessionId}/message`);
        if (!listRes.ok) {
            await new Promise(r => setTimeout(r, 500));
            continue;
        }

        const data: any = await listRes.json();
        const messages: any[] = Array.isArray(data) ? data : [];
        const assistantMsgs = messages.filter((m: any) => m.info?.role === 'assistant');

        if (assistantMsgs.length === 0) {
            await new Promise(r => setTimeout(r, 500));
            continue;
        }

        const last = assistantMsgs[assistantMsgs.length - 1];
        const parts: any[] = last.parts || [];
        const currentText = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('\n').trimStart();

        if (currentText.length > lastYieldedLength) {
            const chunk = currentText.substring(lastYieldedLength);
            yield chunk;
            lastYieldedLength = currentText.length;
            stableCount = 0;
        } else {
            const status = last.info?.status;
            const isFinished =
                status?.finishedAt != null ||
                last.info?.finishedAt != null ||
                status?.type === 'completed' ||
                status?.type === 'error' ||
                status === 'completed' ||
                (currentText.length > 50 && ++stableCount >= 20); // 10 seconds of streaming timeout

            if (isFinished) {
                return;
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
}

export async function* streamChatWithAI(
    messages: ChatMessage[],
    taskDraft: TaskDraft,
    projectId: string | undefined,
    projects: Project[],
    teamMembers: TeamMember[]
): AsyncGenerator<{ type: 'delta' | 'done' | 'error', text?: string, error?: string, parsed?: AIChatResponse }, void, unknown> {
    let sessionId: string | null = null;
    let opencodeBase: string = GLOBAL_OPENCODE_URL;

    try {
        let currentProject = projectId ? projects.find(p => p._id.toString() === projectId.toString()) : undefined;
        currentProject = await ensureProjectRepoAvailable(currentProject);
        opencodeBase = await resolveServerUrl(currentProject?._id, currentProject?.repoLocalPath);

        const prompt = await buildPrompt(messages, taskDraft, projects, teamMembers, currentProject);
        sessionId = await createSession(opencodeBase, `task-plan-${Date.now()}`);

        let fullReply = '';
        for await (const chunk of streamAndWaitForReply(opencodeBase, sessionId, prompt)) {
            fullReply += chunk;
            yield { type: 'delta', text: chunk };
        }

        const jsonMatch = fullReply.match(/```json\s*([\s\S]*?)\s*```/is);
        let parsed: any = null;
        if (jsonMatch) {
            try { parsed = JSON.parse(jsonMatch[1]); } catch (e) {}
        }
        if (!parsed) {
            const fallbackMatch = fullReply.match(/\{[\s\S]*\}/s);
            if (fallbackMatch) {
                 try { parsed = JSON.parse(fallbackMatch[0]); } catch (e) {}
            }
        }
        
        const unparsedText = fullReply.replace(/```json\s*([\s\S]*?)\s*```/is, '').trim();

        if (parsed) {
            yield { type: 'done', parsed: { ...parsed, reply: unparsedText } };
        } else {
             yield { type: 'done', parsed: { reply: unparsedText, taskDraft, action: 'continue' } };
        }

    } catch (error: any) {
        console.error('[ai.service] streamChat error:', error.message);
        yield { type: 'error', error: 'Sorry, I had trouble connecting to AI. Please try again.' };
    } finally {
        if (sessionId) {
            deleteSession(opencodeBase, sessionId).catch(() => { });
        }
    }
}

export async function chatWithAI(
    messages: ChatMessage[],
    taskDraft: TaskDraft,
    projectId: string | undefined,
    projects: Project[],
    teamMembers: TeamMember[]
): Promise<AIChatResponse> {
    let sessionId: string | null = null;
    let opencodeBase: string = GLOBAL_OPENCODE_URL;

    try {
        // Find the current project (if any)
        let currentProject = projectId
            ? projects.find(p => p._id.toString() === projectId.toString())
            : undefined;

        currentProject = await ensureProjectRepoAvailable(currentProject);

        // Resolve the best OpenCode server (per-project with repo context, or global fallback)
        opencodeBase = await resolveServerUrl(
            currentProject?._id,
            currentProject?.repoLocalPath
        );

        // Build full prompt
        const prompt = await buildPrompt(messages, taskDraft, projects, teamMembers, currentProject);

        // Create ephemeral session
        sessionId = await createSession(opencodeBase, `task-plan-${Date.now()}`);

        // Send prompt and wait for reply
        const rawReply = await sendAndWaitForReply(opencodeBase, sessionId, prompt);

        // Strip any accidental markdown fences and parse JSON
        const jsonText = rawReply
            .replace(/^```json\s*/im, '')
            .replace(/^```\s*/im, '')
            .replace(/\s*```$/im, '')
            .trim();

        const parsed = JSON.parse(jsonText) as AIChatResponse;
        return parsed;

    } catch (error: any) {
        console.error('[ai.service] chatWithAI error:', error.message);
        return {
            reply: 'Sorry, I had trouble connecting to AI. Please try again.',
            taskDraft,
            action: 'error',
        };
    } finally {
        // Clean up session
        if (sessionId) {
            deleteSession(opencodeBase, sessionId).catch(() => { });
        }
    }
}
