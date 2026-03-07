import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import IdeUpdateConfig from '../models/IdeUpdateConfig';
import fs from 'fs';
import path from 'path';

const parseVersionParts = (version: string): number[] =>
    version
        .split(/[^0-9]+/)
        .map((part) => Number(part))
        .filter((part) => Number.isFinite(part));

const isVersionGreater = (candidate: string, current: string): boolean => {
    const a = parseVersionParts(candidate);
    const b = parseVersionParts(current);
    const maxLength = Math.max(a.length, b.length);

    for (let index = 0; index < maxLength; index += 1) {
        const left = a[index] ?? 0;
        const right = b[index] ?? 0;
        if (left > right) return true;
        if (left < right) return false;
    }

    return false;
};

const normalizeUrlOrEmpty = (value: unknown): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    throw new Error('URLs must start with http:// or https://');
};

const buildEnvFallback = () => ({
    latestVersion: (process.env.DEVREGION_IDE_PLUGIN_VERSION || process.env.DEVREGION_WEBSTORM_PLUGIN_VERSION || '0.1.1').trim(),
    downloadUrl: (
        process.env.DEVREGION_IDE_PLUGIN_DOWNLOAD_URL ||
        process.env.DEVREGION_WEBSTORM_PLUGIN_DOWNLOAD_URL ||
        'https://beta.devregion.com/downloads/devmanager-ide-plugin.zip'
    ).trim(),
    installUrl: (process.env.DEVREGION_IDE_PLUGIN_INSTALL_URL || process.env.DEVREGION_WEBSTORM_PLUGIN_INSTALL_URL || '').trim(),
    releaseNotesUrl: (process.env.DEVREGION_IDE_PLUGIN_RELEASE_NOTES_URL || process.env.DEVREGION_WEBSTORM_PLUGIN_RELEASE_NOTES_URL || '').trim(),
    message: (process.env.DEVREGION_IDE_PLUGIN_UPDATE_MESSAGE || process.env.DEVREGION_WEBSTORM_PLUGIN_UPDATE_MESSAGE || 'A newer DevManager IDE plugin update is available.').trim(),
    minSupportedVersion: (process.env.DEVREGION_IDE_PLUGIN_MIN_SUPPORTED_VERSION || process.env.DEVREGION_WEBSTORM_PLUGIN_MIN_SUPPORTED_VERSION || '').trim(),
    mandatory: /^true$/i.test((process.env.DEVREGION_IDE_PLUGIN_MANDATORY || process.env.DEVREGION_WEBSTORM_PLUGIN_MANDATORY || '').trim()),
});

const loadEffectiveConfig = async () => {
    const dbConfig = await IdeUpdateConfig.findOne().lean();
    if (dbConfig) {
        return {
            source: 'database' as const,
            latestVersion: String(dbConfig.latestVersion || '').trim(),
            downloadUrl: String(dbConfig.downloadUrl || '').trim(),
            installUrl: String(dbConfig.installUrl || '').trim(),
            releaseNotesUrl: String(dbConfig.releaseNotesUrl || '').trim(),
            message: String(dbConfig.message || '').trim(),
            minSupportedVersion: String(dbConfig.minSupportedVersion || '').trim(),
            mandatory: Boolean(dbConfig.mandatory),
        };
    }
    return { source: 'env' as const, ...buildEnvFallback() };
};

const sanitizeFileName = (name: string): string =>
    name.replace(/[^a-zA-Z0-9._-]/g, '_');

const extractVersionFromFileName = (fileName: string): string => {
    const match = fileName.match(/(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
    return match?.[1] || '';
};

const ensureUploadDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const getPublicBaseUrl = (req: Request): string => {
    const configured = String(process.env.FRONTEND_BASE_URL || '').trim();
    if (configured) return configured.replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host') || 'localhost:3001'}`;
};

export const getPluginUpdateChannel = async (req: Request, res: Response) => {
    try {
        const config = await loadEffectiveConfig();
        const currentVersion = String(req.query.currentVersion || '').trim();

        res.json({
            pluginId: 'com.devmanager.ide.plugin',
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
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Server error' });
    }
};

export const getIdeUpdateConfig = async (_req: AuthRequest, res: Response) => {
    try {
        const config = await loadEffectiveConfig();
        res.json({
            ...config,
            installUrl: config.installUrl || '',
            releaseNotesUrl: config.releaseNotesUrl || '',
            minSupportedVersion: config.minSupportedVersion || '',
        });
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Server error' });
    }
};

export const saveIdeUpdateConfig = async (req: AuthRequest, res: Response) => {
    try {
        const latestVersion = String(req.body?.latestVersion || '').trim();
        const downloadUrl = normalizeUrlOrEmpty(req.body?.downloadUrl);
        const installUrl = normalizeUrlOrEmpty(req.body?.installUrl);
        const releaseNotesUrl = normalizeUrlOrEmpty(req.body?.releaseNotesUrl);
        const message = String(req.body?.message || '').trim();
        const minSupportedVersion = String(req.body?.minSupportedVersion || '').trim();
        const mandatory = Boolean(req.body?.mandatory);

        if (!latestVersion) return res.status(400).json({ message: 'latestVersion is required' });
        if (!downloadUrl) return res.status(400).json({ message: 'downloadUrl is required' });

        const updated = await IdeUpdateConfig.findOneAndUpdate(
            {},
            {
                latestVersion,
                downloadUrl,
                installUrl: installUrl || undefined,
                releaseNotesUrl: releaseNotesUrl || undefined,
                message: message || undefined,
                minSupportedVersion: minSupportedVersion || undefined,
                mandatory,
            },
            { new: true, upsert: true }
        );

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
    } catch (error: any) {
        res.status(400).json({ message: error?.message || 'Invalid payload' });
    }
};

export const uploadIdePluginPackage = async (req: AuthRequest, res: Response) => {
    try {
        const body = req.body as Buffer;
        if (!Buffer.isBuffer(body) || body.length === 0) {
            return res.status(400).json({ message: 'Upload body is empty. Send plugin ZIP bytes.' });
        }

        const rawName = String(req.header('x-file-name') || req.query.fileName || 'devmanager-ide-plugin.zip').trim();
        const safeFileName = sanitizeFileName(rawName.endsWith('.zip') ? rawName : `${rawName}.zip`);
        const timestamp = Date.now();
        const finalName = `${timestamp}-${safeFileName}`;
        const inferredVersion = extractVersionFromFileName(safeFileName);
        if (!inferredVersion) {
            return res.status(400).json({
                message: 'Version not found in filename. Use a name like devmanager-ide-plugin-0.1.2.zip',
            });
        }

        const existingConfig = await IdeUpdateConfig.findOne().select('latestVersion').lean();
        const previousVersion = String(existingConfig?.latestVersion || '').trim();
        if (previousVersion && !isVersionGreater(inferredVersion, previousVersion)) {
            return res.status(400).json({
                message: `Uploaded version (${inferredVersion}) must be higher than current latest version (${previousVersion}).`,
            });
        }

        // Keep upload storage aligned with app.ts static "/downloads" root: apps/api/uploads
        const uploadDir = path.resolve(__dirname, '../../uploads/ide');
        ensureUploadDir(uploadDir);

        const filePath = path.join(uploadDir, finalName);
        fs.writeFileSync(filePath, body);

        const publicBase = getPublicBaseUrl(req);
        const downloadPath = `/downloads/ide/${finalName}`;
        const downloadUrl = `${publicBase}${downloadPath}`;

        const previousConfig = await IdeUpdateConfig.findOne().lean();
        const updatedConfig = await IdeUpdateConfig.findOneAndUpdate(
            {},
            {
                latestVersion: inferredVersion,
                downloadUrl,
                installUrl: downloadUrl,
                message: String(previousConfig?.message || buildEnvFallback().message || '').trim() || undefined,
                releaseNotesUrl: String(previousConfig?.releaseNotesUrl || '').trim() || undefined,
                minSupportedVersion: String(previousConfig?.minSupportedVersion || '').trim() || undefined,
                mandatory: Boolean(previousConfig?.mandatory),
            },
            { new: true, upsert: true }
        );

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
    } catch (error: any) {
        return res.status(500).json({ message: error?.message || 'Failed to upload plugin package' });
    }
};
