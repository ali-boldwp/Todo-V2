import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import DockployConfig from '../models/DockployConfig';

const sanitizeConfigForResponse = (config: any) => {
    if (!config) return null;
    const obj = typeof config.toObject === 'function' ? config.toObject() : config;
    return {
        ...obj,
        apiToken: obj?.apiToken ? '********' : '',
        hasApiToken: Boolean(obj?.apiToken),
    };
};

const isAscii = (value: string) => /^[\x00-\x7F]*$/.test(value);

const validateDockployToken = (token: string): string | null => {
    if (!token || !token.trim()) return 'Dockploy API token is empty.';
    if (!isAscii(token)) {
        return 'Dockploy API token contains invalid characters. Re-copy the token as plain text (no smart quotes/dashes).';
    }
    return null;
};

const verifyDockployConnection = async (baseUrl: string, apiToken: string) => {
    const tokenError = validateDockployToken(apiToken);
    if (tokenError) {
        return { ok: false, endpoint: null, message: tokenError };
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
    const candidates = [
        '/api/apps',
        '/api/application',
        '/api/applications',
    ];
    const authHeaderCandidates: Array<Record<string, string>> = [
        { Authorization: `Bearer ${apiToken}` },
        { 'x-api-key': apiToken },
        { Authorization: apiToken },
    ];
    let lastError = 'Unable to connect to Dockploy';

    for (const path of candidates) {
        const url = `${normalizedBaseUrl}${path}`;
        for (const authHeaders of authHeaderCandidates) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...authHeaders,
                        Accept: 'application/json',
                    },
                });

                if (response.ok) {
                    return { ok: true, endpoint: path, message: 'Connection successful' };
                }

                const body = await response.text();
                if (response.status === 401) {
                    lastError = `Unauthorized (401). Check Dockploy API token and permissions for ${path}.`;
                } else {
                    lastError = `Endpoint ${path} failed (${response.status}) ${body || ''}`.trim();
                }
            } catch (error: any) {
                lastError = `Endpoint ${path} failed: ${error?.message || 'network error'}`;
            }
        }
    }

    return { ok: false, endpoint: null, message: lastError };
};

export const getDockployConfig = async (_req: AuthRequest, res: Response) => {
    try {
        const config = await DockployConfig.findOne();
        res.json(sanitizeConfigForResponse(config));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const saveDockployConfig = async (req: AuthRequest, res: Response) => {
    try {
        const baseUrlRaw = String(req.body?.baseUrl || '').trim();
        const apiTokenRaw = String(req.body?.apiToken || '').trim();
        const deployPathTemplate = String(req.body?.deployPathTemplate || '/api/apps/{appId}/deploy').trim();
        const appStatusPathTemplate = String(req.body?.appStatusPathTemplate || '/api/apps/{appId}').trim();

        if (!baseUrlRaw) return res.status(400).json({ message: 'baseUrl is required' });
        if (!deployPathTemplate.includes('{appId}')) return res.status(400).json({ message: 'deployPathTemplate must include {appId}' });
        if (!appStatusPathTemplate.includes('{appId}')) return res.status(400).json({ message: 'appStatusPathTemplate must include {appId}' });

        const baseUrl = baseUrlRaw.replace(/\/+$/, '');
        const existing = await DockployConfig.findOne();
        const apiToken = apiTokenRaw || existing?.apiToken || '';
        if (!apiToken) return res.status(400).json({ message: 'apiToken is required' });
        const tokenError = validateDockployToken(apiToken);
        if (tokenError) return res.status(400).json({ message: tokenError });

        const connection = await verifyDockployConnection(baseUrl, apiToken);
        if (!connection.ok) {
            return res.status(400).json({
                message: `Dockploy connection test failed. ${connection.message}`,
            });
        }

        const config = await DockployConfig.findOneAndUpdate(
            {},
            { baseUrl, apiToken, deployPathTemplate, appStatusPathTemplate },
            { new: true, upsert: true }
        );

        res.json(sanitizeConfigForResponse(config));
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Server error' });
    }
};

export const getDockployConnectionStatus = async (_req: AuthRequest, res: Response) => {
    try {
        const config = await DockployConfig.findOne();
        if (!config?.baseUrl || !config?.apiToken) {
            return res.json({
                connected: false,
                configured: false,
                message: 'Dockploy is not configured yet',
            });
        }

        const result = await verifyDockployConnection(config.baseUrl, config.apiToken);

        return res.json({
            connected: result.ok,
            configured: true,
            endpoint: result.endpoint,
            message: result.message,
        });
    } catch (error: any) {
        return res.status(500).json({ message: error?.message || 'Failed to check Dockploy connection status' });
    }
};
