# Arda - Centro Estetico Olistico | Gestionale

Applicazione web per la gestione del centro estetico **Arda** con prenotazioni, anagrafica clienti, storico trattamenti, schede cliente e sistema di autenticazione.

## 🚀 Versione Online

Il gestionale è disponibile online per essere usato dall'iPad del centro estetico.

**URL Produzione:** https://arda-centro.it (da configurare)

### Accesso Rapido dall'iPad
1. Apri Safari
2. Vai su https://arda-centro.it
3. Login: admin / admin123
4. **Aggiungi alla Home:** Condividi → "Aggiungi alla schermata Home"

---

## 🎨 Branding

Il gestionale utilizza la palette elegante del logo Arda:
- **Oro** (#C9A961) - Colore primario
- **Marrone scuro** (#2C1810) - Sfondo sidebar e accenti
- **Beige** (#D4B896, #E8D5B7) - Colori secondari

- **Frontend:** React + Bootstrap + Vite
- **Backend:** Node.js + Express
- **Database:** JSON locale (file-based)

## Funzionalità

- **Dashboard:** Panoramica appuntamenti del giorno e statistiche
- **Appuntamenti:** Calendario interattivo con gestione prenotazioni e **controllo conflitti orari**
- **Clienti:** Anagrafica completa con schede cliente
- **Servizi:** Catalogo servizi con durata, prezzo e **gestione sconti**
- **Storico Trattamenti:** Registro trattamenti effettuati per cliente
- **Sistema di Autenticazione:** Login con ruoli (Admin/Dipendente)
- **Password Master:** Per modifiche speciali (es. sconti) quando si è dipendenti

## 🔐 Credenziali di Accesso

### Admin (Amministratore)
- **Username:** admin
- **Password:** admin123
- **Permessi:** Accesso completo, può applicare sconti direttamente

### Dipendente
- **Username:** dipendente
- **Password:** dip123
- **Permessi:** Visualizzazione e operazioni base, per sconti deve inserire password master

### Password Master
- **Password:** master2026
- **Utilizzo:** Richiesta al dipendente per applicare sconti o modifiche speciali

## 🚫 Controllo Conflitti Appuntamenti

Il sistema impedisce automaticamente di prenotare lo stesso operatore in fasce orarie sovrapposte. Se si tenta di creare un appuntamento in conflitto, verrà mostrato un messaggio di errore con i dettagli del conflitto.

## 📱 Integrazione WhatsApp

Il gestionale include l'integrazione completa con WhatsApp per l'invio automatico di promemoria e messaggi ai clienti.

### Configurazione WhatsApp

1. Vai alla pagina **WhatsApp** nel menu laterale
2. Scansiona il **QR code** con il tuo telefono:
   - Apri WhatsApp
   - Vai su **Impostazioni** → **Dispositivi collegati**
   - Clicca **Collega dispositivo**
   - Scansiona il QR code mostrato
3. Una volta connesso, il sistema può inviare e ricevere messaggi

### Funzionalità WhatsApp

#### Promemoria Automatici
- Ogni giorno alle **9:00**, il sistema invia automaticamente promemoria per gli appuntamenti del giorno successivo
- Il messaggio include: data, ora, servizio e operatore
- Il cliente può rispondere **SI** per confermare o **NO** per annullare
- Lo stato dell'appuntamento viene aggiornato automaticamente

#### Invio Messaggi Manuali
- Dalla pagina WhatsApp, puoi inviare messaggi manuali a qualsiasi numero
- Utile per comunicazioni personalizzate

#### Stato Conferme
- Nella pagina **Appuntamenti**, vedi lo stato di conferma WhatsApp di ogni appuntamento:
  - 📱 - Promemoria non ancora inviato (clicca per inviare)
  - ⏳ In attesa - Promemoria inviato, in attesa di risposta
  - ✅ Confermato - Cliente ha confermato
  - ❌ Annullato - Cliente ha annullato

### Note Importanti
- Il numero WhatsApp deve essere lo stesso usato per registrare il cliente
- Il QR code scade dopo alcuni minuti, se necessario rigenerarlo
- WhatsApp deve rimanere connesso per ricevere le risposte dei clienti

Le dipendenze sono già installate. Se necessario reinstallarle:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Avvio dell'applicazione

### 1. Avvia il backend (terminale 1)

```bash
cd backend
npm start
```

Il server backend sarà attivo su `http://localhost:3001`

### 2. Avvia il frontend (terminale 2)

```bash
cd frontend
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:3000`

## Struttura del progetto

```
gestionale-centro-estetico/
├── backend/
│   ├── server.js          # Server Express con API
│   ├── data/              # Database JSON
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Componenti React
│   │   ├── App.jsx        # Componente principale
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Stili globali
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Utilizzo

1. Apri il browser su `http://localhost:3000`
2. Inizia aggiungendo i **Servizi** offerti dal centro
3. Registra i **Clienti** nell'anagrafica
4. Crea **Appuntamenti** dal calendario
5. Registra i **Trattamenti** effettuati nello storico

## Operatori predefiniti

Il sistema include 3 operatori di esempio:
- Maria Rossi (Massaggi)
- Laura Bianchi (Estetica)
- Anna Verdi (Manicure)

## Note

- I dati sono salvati in `backend/data/db.json`
- Per resettare i dati, elimina il file `db.json` (verrà ricreato automaticamente)
- L'applicazione è responsive e funziona su PC, tablet e smartphone
