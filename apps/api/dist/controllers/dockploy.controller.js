"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDockployConnectionStatus = exports.saveDockployConfig = exports.getDockployConfig = void 0;
const DockployConfig_1 = __importDefault(require("../models/DockployConfig"));
const sanitizeConfigForResponse = (config) => {
    if (!config)
        return null;
    const obj = typeof config.toObject === 'function' ? config.toObject() : config;
    return {
        ...obj,
        apiToken: obj?.apiToken ? '********' : '',
        hasApiToken: Boolean(obj?.apiToken),
    };
};
const isAscii = (value) => /^[\x00-\x7F]*$/.test(value);
const validateDockployToken = (token) => {
    if (!token || !token.trim())
        return 'Dockploy API token is empty.';
    if (!isAscii(token)) {
        return 'Dockploy API token contains invalid characters. Re-copy the token as plain text (no smart quotes/dashes).';
    }
    return null;
};
const normalizeDockployPathTemplate = (template, fallback) => {
    const raw = String(template || fallback).trim() || fallback;
    return raw.replace(/\/api\/v1\//gi, '/api/');
};
const verifyDockployConnection = async (baseUrl, apiToken) => {
    const tokenError = validateDockployToken(apiToken);
    if (tokenError) {
        return { ok: false, endpoint: null, message: tokenError };
    }
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
    const candidates = [
        '/api/project.all',
        '/api/v1/project.all',
        '/project.all',
        '/api/apps',
        '/api/application',
        '/api/applications',
        '/api/v1/apps',
        '/api/v1/application',
        '/api/v1/applications',
        '/apps',
        '/application',
        '/applications',
    ];
    let lastError = 'Unable to connect to Dockploy';
    const tried = [];
    let unauthorizedEndpoint = null;
    let forbiddenEndpoint = null;
    for (const path of candidates) {
        const url = `${normalizedBaseUrl}${path}`;
        tried.push(path);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-api-key': apiToken,
                    Accept: 'application/json',
                },
            });
            if (response.ok) {
                return { ok: true, endpoint: path, message: 'Connection successful' };
            }
            const body = await response.text();
            if (response.status === 401) {
                unauthorizedEndpoint = path;
                lastError = `Unauthorized (401). Check Dockploy API token and permissions for ${path}.`;
            }
            else if (response.status === 403) {
                forbiddenEndpoint = path;
                lastError = `Forbidden (403). Token is valid but lacks permission for ${path}.`;
            }
            else if (response.status === 404) {
                lastError = `Endpoint ${path} not found (404).`;
            }
            else {
                lastError = `Endpoint ${path} failed (${response.status}) ${body || ''}`.trim();
            }
        }
        catch (error) {
            lastError = `Endpoint ${path} failed: ${error?.message || 'network error'}`;
        }
    }
    if (unauthorizedEndpoint) {
        return {
            ok: false,
            endpoint: unauthorizedEndpoint,
            message: `Unauthorized (401). Check Dockploy API token and permissions for ${unauthorizedEndpoint}.`,
        };
    }
    if (forbiddenEndpoint) {
        return {
            ok: false,
            endpoint: forbiddenEndpoint,
            message: `Forbidden (403). Token is valid but lacks permission for ${forbiddenEndpoint}.`,
        };
    }
    if (lastError.includes('not found (404)')) {
        return {
            ok: false,
            endpoint: null,
            message: `Could not find a supported Dockploy apps endpoint. Tried: ${tried.join(', ')}`,
        };
    }
    return { ok: false, endpoint: null, message: lastError };
};
const getDockployConfig = async (_req, res) => {
    try {
        const config = await DockployConfig_1.default.findOne();
        res.json(sanitizeConfigForResponse(config));
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getDockployConfig = getDockployConfig;
const saveDockployConfig = async (req, res) => {
    try {
        const baseUrlRaw = String(req.body?.baseUrl || '').trim();
        const apiTokenRaw = String(req.body?.apiToken || '').trim();
        const deployPathTemplate = normalizeDockployPathTemplate(String(req.body?.deployPathTemplate || '/api/application/{appId}/deploy'), '/api/application/{appId}/deploy');
        const appStatusPathTemplate = normalizeDockployPathTemplate(String(req.body?.appStatusPathTemplate || '/api/application/{appId}'), '/api/application/{appId}');
        if (!baseUrlRaw)
            return res.status(400).json({ message: 'baseUrl is required' });
        if (!deployPathTemplate.includes('{appId}'))
            return res.status(400).json({ message: 'deployPathTemplate must include {appId}' });
        if (!appStatusPathTemplate.includes('{appId}'))
            return res.status(400).json({ message: 'appStatusPathTemplate must include {appId}' });
        const baseUrl = baseUrlRaw.replace(/\/+$/, '');
        const existing = await DockployConfig_1.default.findOne();
        const apiToken = apiTokenRaw || existing?.apiToken || '';
        if (!apiToken)
            return res.status(400).json({ message: 'apiToken is required' });
        const tokenError = validateDockployToken(apiToken);
        if (tokenError)
            return res.status(400).json({ message: tokenError });
        const connection = await verifyDockployConnection(baseUrl, apiToken);
        const endpointDiscoveryFailed = !connection.ok && connection.message.includes('Could not find a supported Dockploy apps endpoint');
        if (!connection.ok && !endpointDiscoveryFailed) {
            return res.status(400).json({
                message: `Dockploy connection test failed. ${connection.message}`,
            });
        }
        const config = await DockployConfig_1.default.findOneAndUpdate({}, { baseUrl, apiToken, deployPathTemplate, appStatusPathTemplate }, { new: true, upsert: true });
        res.json({
            ...sanitizeConfigForResponse(config),
            connectionVerified: connection.ok,
            connectionMessage: connection.message,
            endpointDiscoveryFailed,
        });
    }
    catch (error) {
        res.status(500).json({ message: error?.message || 'Server error' });
    }
};
exports.saveDockployConfig = saveDockployConfig;
const getDockployConnectionStatus = async (_req, res) => {
    try {
        const config = await DockployConfig_1.default.findOne();
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
    }
    catch (error) {
        return res.status(500).json({ message: error?.message || 'Failed to check Dockploy connection status' });
    }
};
exports.getDockployConnectionStatus = getDockployConnectionStatus;
