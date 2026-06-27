export const APP_BUILD = {
  version: import.meta.env.VITE_APP_VERSION ?? '0.1.0-rc.4-dev',
  buildLabel: import.meta.env.VITE_APP_BUILD_LABEL ?? 'local',
};
