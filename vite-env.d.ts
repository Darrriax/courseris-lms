/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_SERVICE_URL: string
  readonly VITE_COURSE_SERVICE_URL: string
  readonly VITE_LEARNING_SERVICE_URL: string
  readonly VITE_PAYMENT_SERVICE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
