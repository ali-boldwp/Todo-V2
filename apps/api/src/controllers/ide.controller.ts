import { Request, Response } from 'express';

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

export const getPluginUpdateChannel = (_req: Request, res: Response) => {
    const latestVersion = (process.env.DEVREGION_WEBSTORM_PLUGIN_VERSION || '0.1.1').trim();
    const downloadUrl = (process.env.DEVREGION_WEBSTORM_PLUGIN_DOWNLOAD_URL || 'https://beta.devregion.com/downloads/devmanager-webstorm-plugin.zip').trim();
    const releaseNotesUrl = (process.env.DEVREGION_WEBSTORM_PLUGIN_RELEASE_NOTES_URL || '').trim();
    const message = (process.env.DEVREGION_WEBSTORM_PLUGIN_UPDATE_MESSAGE || 'A newer DevManager plugin update is available.').trim();
    const minSupportedVersion = (process.env.DEVREGION_WEBSTORM_PLUGIN_MIN_SUPPORTED_VERSION || '').trim();
    const mandatory = /^true$/i.test((process.env.DEVREGION_WEBSTORM_PLUGIN_MANDATORY || '').trim());
    const currentVersion = String(_req.query.currentVersion || '').trim();

    res.json({
        pluginId: 'com.devmanager.webstorm.plugin',
        latestVersion,
        downloadUrl,
        releaseNotesUrl: releaseNotesUrl || null,
        message,
        minSupportedVersion: minSupportedVersion || null,
        mandatory,
        updateAvailable: currentVersion ? isVersionGreater(latestVersion, currentVersion) : null,
        checkedAt: new Date().toISOString(),
    });
};
