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
├── .railway/railway.ts  # Infrastruttura Railway (IaC): repo, build, start, DATABASE_URL
├── data/db.json         # Database locale (generato automaticamente, non versionato)
└── frontend/
    ├── index.html
    ├── vite.config.js   # Dev server su :3000 con proxy /api → :3001
    ├── public/logo.jpg
    └── src/
        ├── App.jsx      # Layout, sidebar, routing
        ├── config.js    # API_BASE_URL (vuoto in produzione → stesse origin)
        ├── utils/       # ricerca.js (confronto testi), apriWhatsApp.js (apertura scheda)
        └── components/  # Dashboard, Appuntamenti, Clienti, Servizi, Trattamenti, Operatori,
                         # Login, WhatsApp, Impostazioni, SelezioneCliente (ricerca cliente riutilizzata)
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

1. Un solo servizio, collegato al repository GitHub: i push su `main` deployano da soli.
2. Il servizio **Postgres** dello stesso progetto fornisce `DATABASE_URL`.
3. `.railway/railway.ts` (Infrastructure as Code) dichiara repo e branch, `buildCommand` (`npm install && npm --prefix frontend install && npm --prefix frontend run build`), `startCommand` (`npm start`), restart `ON_FAILURE` con 10 tentativi e `DATABASE_URL = ${{Postgres.DATABASE_URL}}`. Senza quest'ultima dichiarazione `railway config apply` cancellerebbe la variabile. Le modifiche si applicano con `railway config apply`.
4. Le tabelle vengono create automaticamente al primo avvio (`CREATE TABLE IF NOT EXISTS`) con operatori, utenti e password master di default.

Se `DATABASE_URL` manca o la connessione fallisce, il server ripiega sul JSON locale: su Railway il filesystem è **effimero**, quindi i dati andrebbero persi a ogni redeploy. Controlla nei log la riga `✅ Connesso a PostgreSQL`.

## Funzionalità

- **Dashboard:** appuntamenti del giorno e statistiche
- **Appuntamenti:** calendario con controllo dei conflitti orari per operatore (409 se la fascia si sovrappone); il cliente si sceglie con una casella di ricerca (nome, cognome o telefono, anche con accenti e ordine invertito) invece di scorrere l'elenco
- **Clienti:** anagrafica con telefono, email, note e allergie; la lista è filtrabile con la stessa ricerca
- **Servizi:** catalogo con durata, prezzo, categoria; sconti protetti da password master per il ruolo dipendente
- **Storico trattamenti:** registro dei trattamenti effettuati per cliente
- **Login con ruoli:** admin e dipendente
- **Impostazioni:** cambio della propria password, reset degli account e password master (le ultime due solo admin)

## WhatsApp

L'integrazione è basata su **link `wa.me`**: il gestionale prepara il messaggio e apre WhatsApp (web o app), l'invio resta manuale.

- `GET /api/whatsapp/promemoria/:id` → link con il promemoria dell'appuntamento
- `GET /api/whatsapp/messaggio?numero=&messaggio=` → link con messaggio libero
- Dalla pagina **Appuntamenti**, il bottone 📱 apre il promemoria e segna `promemoriaInviato`; la riga passa a **⏳ In attesa** con i bottoni ✅ e ❌
- Ogni promemoria apre una scheda di WhatsApp: `api.whatsapp.com` risponde con `Cross-Origin-Opener-Policy: same-origin-allow-popups`, che recide il legame con la scheda del gestionale, quindi la scheda aperta non è più né riusabile né chiudibile da codice (`utils/apriWhatsApp.js`). Se il browser blocca il popup il promemoria **non** viene segnato come inviato
- La risposta del cliente arriva sul telefono di chi gestisce il centro: un click su ✅ o ❌ la registra sull'appuntamento (`whatsappConferma`, `dataConferma`) e ne allinea lo stato (`confermato`/`annullato`). Il bottone ↺ annulla una risposta registrata per errore

Non esiste un canale di ricezione: il gestionale non legge le risposte da WhatsApp, si limita a registrare quella che l'operatore ha letto sul telefono. `promemoriaInviato` viene segnato all'apertura del link `wa.me`, quindi non garantisce che il messaggio sia stato poi davvero inviato. Per un'automazione completa (il cliente risponde "SI" e l'appuntamento si aggiorna da solo) serve un provider ufficiale — Meta WhatsApp Business API o Twilio — con webhook pubblico e numero di telefono dedicato.

## Autenticazione

- `POST /api/login` verifica username e password e restituisce un **token di sessione**; il frontend lo salva in `localStorage` e lo invia come `Authorization: Bearer <token>`.
- Tutte le altre route `/api/*` passano da un middleware che valida il token contro la tabella `sessioni` (in locale `sessioni` dentro `data/db.json`): senza token valido rispondono 401.
- Le sessioni durano 30 giorni e vengono revocate da `POST /api/logout` o alla scadenza. Il cambio password **non** revoca le sessioni già aperte: restano valide fino alla scadenza.
- Le password sono salvate come hash **scrypt** (`scrypt$sale$hash`); all'avvio il server converte automaticamente eventuali password ancora in chiaro, compresa la password master (`migraPasswordMasterInChiaro`).
- La pagina **Impostazioni** gestisce le credenziali: `POST /api/password` cambia la propria (serve la password attuale), `GET /api/utenti` e `PUT /api/utenti/:id/password` (solo admin) elencano e reimpostano gli account, `PUT /api/password-master` (solo admin) cambia la password richiesta per gli sconti. Una nuova password deve avere almeno 10 caratteri e non può essere una di quelle predefinite.
- Gli errori di credenziali rispondono **403**, non 401: l'interceptor axios del frontend chiude la sessione su qualunque 401, quindi un 401 butterebbe fuori l'operatore per un semplice errore di digitazione.
- Se si entra con una password predefinita, `POST /api/login` risponde con `passwordDaCambiare: true` e il gestionale mostra un avviso in cima a ogni pagina finché la password non viene cambiata.
- CORS limitato a `http://localhost:3000`, `http://localhost:5173` e agli host extra indicati in `CORS_ORIGINS` (separati da virgola): in produzione il frontend è servito dallo stesso dominio, quindi non serve alcun header CORS.

Gli utenti e la password master di default sono creati dal seed in `database.js`: `admin`/`admin123`, `dipendente`/`dip123` e master `master2026`. **Cambiali dalla pagina Impostazioni**: sono comparsi nelle versioni precedenti del repository e devono considerarsi compromessi.
