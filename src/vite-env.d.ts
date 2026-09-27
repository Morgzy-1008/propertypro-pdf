/// <reference types="vite/client" />

declare const __APP_BUILD_TIME__: number;

interface Window {
  __triggerUpdatePromptForTesting?: (forced?: boolean) => void;
  __getAppBuildTime?: () => number;
}
