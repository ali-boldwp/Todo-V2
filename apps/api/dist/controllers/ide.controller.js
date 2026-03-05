"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadIdePluginPackage = exports.saveIdeUpdateConfig = exports.getIdeUpdateConfig = exports.getPluginUpdateChannel = void 0;
const IdeUpdateConfig_1 = __importDefault(require("../models/IdeUpdateConfig"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parseVersionParts = (version) => version
    .split(/[^0-9]+/)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
const isVersionGreater = (candidate, current) => {
    const a = parseVersionParts(candidate);
    const b = parseVersionParts(current);
    const maxLength = Math.max(a.length, b.length);
    for (let index = 0; index < maxLength; index += 1) {
        const left = a[index] ?? 0;
        const right = b[index] ?? 0;
        if (left > right)
            return true;
        if (left < right)
            return false;
    }
    return false;
};
const normalizeUrlOrEmpty = (value) => {
    const raw = String(value || '').trim();
    if (!raw)
        return '';
    if (/^https?:\/\//i.test(raw))
        return raw;
    throw new Error('URLs must start with http:// or https://');
};
const buildEnvFallback = () => ({
    latestVersion: (process.env.DEVREGION_WEBSTORM_PLUGIN_VERSION || '0.1.1').trim(),
    downloadUrl: (process.env.DEVREGION_WEBSTORM_PLUGIN_DOWNLOAD_URL || 'https://beta.devregion.com/downloads/devmanager-webstorm-plugin.zip').trim(),
    installUrl: (process.env.DEVREGION_WEBSTORM_PLUGIN_INSTALL_URL || '').trim(),
    releaseNotesUrl: (process.env.DEVREGION_WEBSTORM_PLUGIN_RELEASE_NOTES_URL || '').trim(),
    message: (process.env.DEVREGION_WEBSTORM_PLUGIN_UPDATE_MESSAGE || 'A newer DevManager plugin update is available.').trim(),
    minSupportedVersion: (process.env.DEVREGION_WEBSTORM_PLUGIN_MIN_SUPPORTED_VERSION || '').trim(),
    mandatory: /^true$/i.test((process.env.DEVREGION_WEBSTORM_PLUGIN_MANDATORY || '').trim()),
});
const loadEffectiveConfig = async () => {
    const dbConfig = await IdeUpdateConfig_1.default.findOne().lean();
    if (dbConfig) {
        return {
            source: 'database',
            latestVersion: String(dbConfig.latestVersion || '').trim(),
            downloadUrl: String(dbConfig.downloadUrl || '').trim(),
            installUrl: String(dbConfig.installUrl || '').trim(),
            releaseNotesUrl: String(dbConfig.releaseNotesUrl || '').trim(),
            message: String(dbConfig.message || '').trim(),
            minSupportedVersion: String(dbConfig.minSupportedVersion || '').trim(),
            mandatory: Boolean(dbConfig.mandatory),
        };
    }
    return { source: 'env', ...buildEnvFallback() };
};
const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
const extractVersionFromFileName = (fileName) => {
    const match = fileName.match(/(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
    return match?.[1] || '';
};
const ensureUploadDir = (dirPath) => {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
};
const getPublicBaseUrl = (req) => {
    const configured = String(process.env.FRONTEND_BASE_URL || '').trim();
    if (configured)
        return configured.replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host') || 'localhost:3001'}`;
};
const getPluginUpdateChannel = async (req, res) => {
    try {
        const config = await loadEffectiveConfig();
        const currentVersion = String(req.query.currentVersion || '').trim();
        res.json({
            pluginId: 'com.devmanager.webstorm.plugin',
            latestVersion: config.latestVersion,
            downloadUrl: config.downloadUrl,
            installUrl: config.installUrl || null,
            releaseNotesUrl: config.releaseNotesUrl || null,
            message: config.message,
            minSupportedVersion: config.minSupportedVersion || null,
            mandatory: config.mandatory,
            updateAvailable: currentVersion ? isVersionGreater(config.latestVersion, currentVersion) : null,
            checkedAt: new Date().toISOString(),
            source: config.source,
        });
    }
    catch (error) {
        res.status(500).json({ message: error?.message || 'Server error' });
    }
};
exports.getPluginUpdateChannel = getPluginUpdateChannel;
const getIdeUpdateConfig = async (_req, res) => {
    try {
        const config = await loadEffectiveConfig();
        res.json({
            ...config,
            installUrl: config.installUrl || '',
            releaseNotesUrl: config.releaseNotesUrl || '',
            minSupportedVersion: config.minSupportedVersion || '',
        });
    }
    catch (error) {
        res.status(500).json({ message: error?.message || 'Server error' });
    }
};
exports.getIdeUpdateConfig = getIdeUpdateConfig;
const saveIdeUpdateConfig = async (req, res) => {
    try {
        const latestVersion = String(req.body?.latestVersion || '').trim();
        const downloadUrl = normalizeUrlOrEmpty(req.body?.downloadUrl);
        const installUrl = normalizeUrlOrEmpty(req.body?.installUrl);
        const releaseNotesUrl = normalizeUrlOrEmpty(req.body?.releaseNotesUrl);
        const message = String(req.body?.message || '').trim();
        const minSupportedVersion = String(req.body?.minSupportedVersion || '').trim();
        const mandatory = Boolean(req.body?.mandatory);
        if (!latestVersion)
            return res.status(400).json({ message: 'latestVersion is required' });
        if (!downloadUrl)
            return res.status(400).json({ message: 'downloadUrl is required' });
        const updated = await IdeUpdateConfig_1.default.findOneAndUpdate({}, {
            latestVersion,
            downloadUrl,
            installUrl: installUrl || undefined,
            releaseNotesUrl: releaseNotesUrl || undefined,
            message: message || undefined,
            minSupportedVersion: minSupportedVersion || undefined,
            mandatory,
        }, { new: true, upsert: true });
        res.json({
            source: 'database',
            latestVersion: updated.latestVersion,
            downloadUrl: updated.downloadUrl,
            installUrl: updated.installUrl || '',
            releaseNotesUrl: updated.releaseNotesUrl || '',
            message: updated.message || '',
            minSupportedVersion: updated.minSupportedVersion || '',
            mandatory: Boolean(updated.mandatory),
        });
    }
    catch (error) {
        res.status(400).json({ message: error?.message || 'Invalid payload' });
    }
};
exports.saveIdeUpdateConfig = saveIdeUpdateConfig;
const uploadIdePluginPackage = async (req, res) => {
    try {
        const body = req.body;
        if (!Buffer.isBuffer(body) || body.length === 0) {
            return res.status(400).json({ message: 'Upload body is empty. Send plugin ZIP bytes.' });
        }
        const rawName = String(req.header('x-file-name') || req.query.fileName || 'devmanager-webstorm-plugin.zip').trim();
        const safeFileName = sanitizeFileName(rawName.endsWith('.zip') ? rawName : `${rawName}.zip`);
        const timestamp = Date.now();
        const finalName = `${timestamp}-${safeFileName}`;
        const inferredVersion = extractVersionFromFileName(safeFileName);
        if (!inferredVersion) {
            return res.status(400).json({
                message: 'Version not found in filename. Use a name like devmanager-webstorm-plugin-0.1.2.zip',
            });
        }
        const existingConfig = await IdeUpdateConfig_1.default.findOne().select('latestVersion').lean();
        const previousVersion = String(existingConfig?.latestVersion || '').trim();
        if (previousVersion && !isVersionGreater(inferredVersion, previousVersion)) {
            return res.status(400).json({
                message: `Uploaded version (${inferredVersion}) must be higher than current latest version (${previousVersion}).`,
            });
        }
        // Keep upload storage aligned with app.ts static "/downloads" root: apps/api/uploads
        const uploadDir = path_1.default.resolve(__dirname, '../../uploads/ide');
        ensureUploadDir(uploadDir);
        const filePath = path_1.default.join(uploadDir, finalName);
        fs_1.default.writeFileSync(filePath, body);
        const publicBase = getPublicBaseUrl(req);
        const downloadPath = `/downloads/ide/${finalName}`;
        const downloadUrl = `${publicBase}${downloadPath}`;
        const previousConfig = await IdeUpdateConfig_1.default.findOne().lean();
        const updatedConfig = await IdeUpdateConfig_1.default.findOneAndUpdate({}, {
            latestVersion: inferredVersion,
            downloadUrl,
            installUrl: downloadUrl,
            message: String(previousConfig?.message || buildEnvFallback().message || '').trim() || undefined,
            releaseNotesUrl: String(previousConfig?.releaseNotesUrl || '').trim() || undefined,
            minSupportedVersion: String(previousConfig?.minSupportedVersion || '').trim() || undefined,
            mandatory: Boolean(previousConfig?.mandatory),
        }, { new: true, upsert: true });
        return res.json({
            fileName: finalName,
            size: body.length,
            downloadPath,
            downloadUrl,
            installUrl: downloadUrl,
            inferredVersion,
            previousVersion: previousVersion || null,
            effectiveConfig: {
                latestVersion: updatedConfig.latestVersion,
                downloadUrl: updatedConfig.downloadUrl,
                installUrl: updatedConfig.installUrl || '',
                releaseNotesUrl: updatedConfig.releaseNotesUrl || '',
                message: updatedConfig.message || '',
                minSupportedVersion: updatedConfig.minSupportedVersion || '',
                mandatory: Boolean(updatedConfig.mandatory),
            },
            uploadedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        return res.status(500).json({ message: error?.message || 'Failed to upload plugin package' });
    }
};
exports.uploadIdePluginPackage = uploadIdePluginPackage;
