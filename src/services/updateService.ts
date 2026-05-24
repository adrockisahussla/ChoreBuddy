import { NativeModules, Platform } from 'react-native';

const { ApkUpdater } = NativeModules as {
  ApkUpdater?: {
    versionName: string;
    versionCode: number;
    installFromUrl: (url: string) => Promise<string>;
  };
};

const REPO = 'adrockisahussla/ChoreBuddy';

export const CURRENT_VERSION = ApkUpdater?.versionName || '0';
export const CURRENT_VERSION_CODE = ApkUpdater?.versionCode || 0;

export interface ReleaseInfo {
  latestVersion: string;
  apkUrl: string;
  releaseUrl: string;
  body: string;
  isNewer: boolean;
}

/** Pulls the latest GitHub release for the repo and reports whether a
 *  newer version is available. Compares semver-ish "1.7" vs current. */
export async function checkLatestRelease(): Promise<ReleaseInfo | null> {
  const r = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers: { Accept: 'application/vnd.github+json' } },
  );
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  const j = await r.json();
  const tag: string = j.tag_name || '';
  const latestVersion = tag.replace(/^v/, '');
  const apkAsset = (j.assets || []).find((a: any) =>
    typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.apk'),
  );
  if (!latestVersion || !apkAsset) return null;
  return {
    latestVersion,
    apkUrl: apkAsset.browser_download_url,
    releaseUrl: j.html_url || '',
    body: j.body || '',
    isNewer: compareVersions(latestVersion, CURRENT_VERSION) > 0,
  };
}

/** Downloads the APK and dispatches the Android install intent. The
 *  system update dialog handles the actual install. Resolves once the
 *  download completes + intent fires. */
export async function installApk(url: string): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('Updates only supported on Android');
  if (!ApkUpdater) throw new Error('ApkUpdater native module not linked (rebuild required)');
  await ApkUpdater.installFromUrl(url);
}

function compareVersions(a: string, b: string): number {
  const as = a.split('.').map(n => parseInt(n, 10) || 0);
  const bs = b.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const x = as[i] || 0; const y = bs[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}
