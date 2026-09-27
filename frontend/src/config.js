// Configurazione API URL
// In sviluppo usa il proxy di Vite (/api), in produzione usa la variabile d'ambiente
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
