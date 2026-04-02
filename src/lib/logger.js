/**
 * Utilitário simples de logging para a aplicação Unidade Viva.
 * Em produção (import.meta.env.PROD) os logs são suprimidos.
 * Em desenvolvimento, exibe no console com timestamp.
 */
const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;

export const logger = {
  info: (message, ...args) => {
    if (!isProd) console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
  },
  error: (message, error, ...args) => {
    if (!isProd) console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error, ...args);
  },
  warn: (message, ...args) => {
    if (!isProd) console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
  },
};
