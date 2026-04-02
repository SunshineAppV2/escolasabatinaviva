/**
 * Utilitário simples de logging para a aplicação Unidade Viva.
 * Em produção, pode ser substituído por Sentry ou similar.
 */
export const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
  },
  error: (message, error, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
  }
};