# Arda — Centro Estetico Olistico | Gestionale

Applicazione web per la gestione del centro estetico **Arda**: appuntamenti, anagrafica clienti, storico trattamenti, catalogo servizi e login con ruoli.

Un **unico servizio** in produzione: Express espone le API `/api/*` e serve la build React/Vite dallo stesso dominio.

## Struttura del progetto

```
gestionale-arda/
├── server.js            # Express: API + file statici del frontend + fallback SPA
├── database.js          # Accesso dati: PostgreSQL se c'è DATABASE_URL, altrimenti JSON locale
├── whatsapp.js          # Generazione link wa.me per promemoria e messaggi
├── package.json         # Dipendenze backend + script di build del frontend
├── railway.json         # Build/start command per Railway
├── data/db.json         # Database locale (generato automaticamente, non versionato)
└── frontend/
    ├── index.html
    ├── vite.config.js   # Dev server su :3000 con proxy /api → :3001
    ├── public/logo.jpg
    └── src/
        ├── App.jsx      # Layout, sidebar, routing
        ├── config.js    # API_BASE_URL (vuoto in produzione → stesse origin)
        └── components/  # Dashboard, Appuntamenti, Clienti, Servizi, Trattamenti, Login, WhatsApp
```

## Sviluppo locale

```bash
# 1. Dipendenze backend
npm install

# 2. Backend su http://localhost:3001
npm run dev

# 3. Frontend su http://localhost:3000 (proxy /api verso :3001) — in un secondo terminale
npm run dev:frontend
```

Senza `DATABASE_URL` i dati finiscono in `data/db.json`. Per resettare, elimina quel file: viene ricreato con i dati iniziali.

### Build di produzione in locale

```bash
npm run build   # installa le dipendenze del frontend e genera frontend/dist
npm start       # Express serve frontend/dist su http://localhost:3001
```

## Deploy su Railway

1. Un solo servizio, collegato al repository GitHub.
2. Aggiungi il plugin **PostgreSQL** e collega la variabile `DATABASE_URL` al servizio.
3. `railway.json` esegue `npm install && npm --prefix frontend install && npm --prefix frontend run build` in build e `npm start` all'avvio.
4. Le tabelle vengono create automaticamente al primo avvio (`CREATE TABLE IF NOT EXISTS`) con operatori, utenti e password master di default.

Se `DATABASE_URL` manca o la connessione fallisce, il server ripiega sul JSON locale: su Railway il filesystem è **effimero**, quindi i dati andrebbero persi a ogni redeploy. Controlla nei log la riga `✅ Connesso a PostgreSQL`.

## Funzionalità

- **Dashboard:** appuntamenti del giorno e statistiche
- **Appuntamenti:** calendario con controllo dei conflitti orari per operatore (409 se la fascia si sovrappone)
- **Clienti:** anagrafica con telefono, email, note e allergie
- **Servizi:** catalogo con durata, prezzo, categoria; sconti protetti da password master per il ruolo dipendente
- **Storico trattamenti:** registro dei trattamenti effettuati per cliente
- **Login con ruoli:** admin e dipendente

## WhatsApp

L'integrazione è basata su **link `wa.me`**: il gestionale prepara il messaggio e apre WhatsApp (web o app), l'invio resta manuale.

- `GET /api/whatsapp/promemoria/:id` → link con il promemoria dell'appuntamento
- `GET /api/whatsapp/messaggio?numero=&messaggio=` → link con messaggio libero
- Dalla pagina **Appuntamenti**, il bottone 📱 apre il promemoria e segna `promemoriaInviato`

Le risposte dei clienti (SI/NO) vanno riportate manualmente sullo stato dell'appuntamento: non esiste un canale di ricezione. Per l'invio realmente automatico serve un provider ufficiale (es. Twilio/WhatsApp Business API).

## Autenticazione

- `POST /api/login` verifica username e password e restituisce un **token di sessione**; il frontend lo salva in `localStorage` e lo invia come `Authorization: Bearer <token>`.
- Tutte le altre route `/api/*` passano da un middleware che valida il token contro la tabella `sessioni` (in locale `sessioni` dentro `data/db.json`): senza token valido rispondono 401.
- Le sessioni durano 30 giorni e vengono revocate da `POST /api/logout` o alla scadenza.
- Le password sono salvate come hash **scrypt** (`scrypt$sale$hash`); all'avvio il server converte automaticamente eventuali password ancora in chiaro.
- CORS limitato a `http://localhost:3000`, `http://localhost:5173` e agli host extra indicati in `CORS_ORIGINS` (separati da virgola): in produzione il frontend è servito dallo stesso dominio, quindi non serve alcun header CORS.

Gli utenti e la password master di default sono creati dal seed in `database.js`. **Cambiali**: sono comparsi nelle versioni precedenti del repository e devono considerarsi compromessi.
