"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithAI = chatWithAI;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const SYSTEM_PROMPT = `You are an AI task creation assistant for a project management tool. Your job is to guide users through creating tasks naturally through conversation.

Current task draft state:
- projectId: string | null
- title: string
- description: string
- priority: 'high' | 'medium' | 'low'
- assigneeId: string | null
- dueDate: string | null (ISO date format YYYY-MM-DD)

Available projects: {{PROJECTS}}
Available team members: {{TEAM_MEMBERS}}

Your job is to collect missing information in this order:
1. Title (task name) - always required, ask first
2. Project - which project does this belong to
3. Priority - high, medium, or low
4. Assignee - who should do this task
5. Due date - when should it be completed

Once you have all required information (title, project, priority, assignee, optional due date), confirm with the user before creating the task.

IMPORTANT: You must ALWAYS respond with valid JSON in this exact format:
{"reply": "your response text", "taskDraft": { ... updated draft ... }, "action": "continue|confirm|create|error", "suggestions": ["option1", "option2"]}

Rules:
- Extract information from natural language (e.g., "ASAP" → high priority, "next Monday" → due date)
- When action is "confirm", present the full task summary and ask "Should I create this task?"
- When action is "create", the task is ready - user has confirmed
- When action is "continue", ask follow-up questions for missing fields
- Provide helpful suggestions based on available options
- Be conversational and friendly
- Always respond in JSON format only, no other text`;
async function chatWithAI(messages, taskDraft, _projectId, projects, teamMembers) {
    try {
        const projectNames = projects.map(p => `${p.name} (id: ${p._id})`).join(', ') || 'No projects available';
        const memberNames = teamMembers.map(m => `${m.firstName} ${m.lastName} (id: ${m._id})`).join(', ') || 'No team members';
        const systemMessage = SYSTEM_PROMPT
            .replace('{{PROJECTS}}', projectNames)
            .replace('{{TEAM_MEMBERS}}', memberNames);
        const conversationHistory = [
            { role: 'system', content: systemMessage },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            {
                role: 'user',
                content: `Current draft state: ${JSON.stringify(taskDraft)}. User's latest message was the last message in the conversation. Determine what information to extract and what to ask next. Respond with JSON only.`
            }
        ];
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });
        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
            throw new Error('Empty response from AI');
        }
        const parsed = JSON.parse(responseContent);
        return parsed;
    }
    catch (error) {
        console.error('AI chat error:', error.message);
        return {
            reply: 'Sorry, I encountered an error. Please try again.',
            taskDraft,
            action: 'error',
        };
    }
}
