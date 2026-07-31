/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_BOT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
