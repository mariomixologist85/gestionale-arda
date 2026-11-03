const { test } = require('node:test');
const assert = require('node:assert/strict');
const carica = () => import('../frontend/src/utils/resoconto.js');

test('resoconto: solo confermati, valori in centesimi e nessuna modifica ai dati', async () => {
  const { calcolaResoconto } = await carica();
  const servizi = Object.freeze([Object.freeze({ id: 's1', prezzo: '0.10' }), Object.freeze({ id: 's2', prezzo: '0.20' }), Object.freeze({ id: 'gratis', prezzo: 0 })]);
  const appuntamenti = Object.freeze([
    { id: 'a1', servizioId: 's1', data: '2026-11-03', stato: 'confermato' },
    { id: 'a2', servizioId: 's2', data: '2026-11-03', stato: 'confermato' },
    { id: 'a3', servizioId: 'gratis', data: '2026-11-04', stato: 'confermato' },
    { id: 'a4', servizioId: 's1', data: '2026-11-03', stato: 'completato' },
    { id: 'a5', servizioId: 's1', data: '2026-11-03', stato: 'pending' },
    { id: 'a6', servizioId: 's1', data: '2026-11-03', stato: 'annullato' },
    { id: 'a7', servizioId: 's1', data: '2026-12-01', stato: 'confermato' }
  ].map(Object.freeze));
  const report = calcolaResoconto(appuntamenti, servizi, '2026-11');
  assert.equal(report.centesimi, 30);
  assert.equal(report.confermati, 3);
  assert.equal(report.senzaPrezzo, 0);
  assert.equal(report.giorni[2].centesimi, 30);
  assert.equal(report.giorni[3].centesimi, 0);
  assert.equal(report.giorni[3].senzaPrezzo, 0);
  assert.equal(report.giorni[2].appuntamenti.length, 2);
  assert(!Object.hasOwn(appuntamenti[0], 'centesimi'));
});

test('prezzi mancanti, servizi rimossi e date errate sono segnalati senza inventare incassi', async () => {
  const { calcolaResoconto } = await carica();
  const report = calcolaResoconto([
    { id: 'a1', servizioId: 'eliminato', servizioNome: 'Massaggio', data: '2026-11-03', stato: 'confermato' },
    { id: 'a2', servizioId: 'senza-prezzo', data: '2026-11-03', stato: 'confermato' },
    { id: 'a3', servizioId: 's1', data: '2026-11-31', stato: 'confermato' },
    { id: 'a4', servizioId: 's1', data: '2026-11-04', stato: 'confermato' }
  ], [{ id: 's1', nome: 'Massaggio', prezzo: '70.50' }, { id: 'senza-prezzo', prezzo: null }], '2026-11');
  assert.equal(report.confermati, 3);
  assert.equal(report.senzaPrezzo, 2);
  assert.equal(report.dateNonValide, 1);
  assert.equal(report.centesimi, 7050);
  assert.equal(report.giorni[2].appuntamenti[0].centesimi, null);
  assert.equal(report.giorni[2].appuntamenti[1].centesimi, null);
});

test('la stima usa il listino corrente e non deduce pagamenti o sconti dallo storico', async () => {
  const { calcolaResoconto } = await carica();
  const appuntamenti = [{ id: 'a1', data: '2026-11-03', stato: 'confermato', servizioId: 's1', prezzo: 10, sconto: 50 }];
  assert.equal(calcolaResoconto(appuntamenti, [{ id: 's1', prezzo: 70 }], '2026-11').centesimi, 7000);
  assert.equal(calcolaResoconto(appuntamenti, [{ id: 's1', prezzo: 80 }], '2026-11').centesimi, 8000);
});

test('mesi, anno bisestile e prezzi decimali validi e non validi', async () => {
  const { calcolaResoconto, prezzoInCentesimi } = await carica();
  assert.equal(calcolaResoconto([], [], '2028-02').giorni.length, 29);
  assert.equal(calcolaResoconto([], [], '2026-02').giorni.length, 28);
  assert.equal(calcolaResoconto([], [], '2026-12').giorni.length, 31);
  assert.throws(() => calcolaResoconto([], [], '2026-13'), /Mese/);
  assert.equal(prezzoInCentesimi('12,50'), 1250);
  assert.equal(prezzoInCentesimi('12.345'), 1235);
  assert.equal(prezzoInCentesimi(0), 0);
  for (const valore of [null, undefined, '', ' ', true, -1, Infinity, NaN, 'errato', '1.000,00']) assert.equal(prezzoInCentesimi(valore), null);
});
