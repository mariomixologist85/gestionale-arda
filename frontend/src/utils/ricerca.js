// Confronto testi per le ricerche: ignora maiuscole, minuscole e accenti
export function normalizza(testo) {
  return (testo || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Tutti i termini cercati devono comparire in almeno uno dei campi; una ricerca
// di sole cifre (almeno 2) vale come ricerca sul telefono anche se è formattato
export function corrisponde(campi, query) {
  const q = normalizza(query)
  if (!q) return true

  const testi = campi.map(normalizza)
  const cifre = q.replace(/\D/g, '')
  if (cifre.length >= 2 && testi.some(t => t.replace(/\D/g, '').includes(cifre))) {
    return true
  }

  return q
    .split(/\s+/)
    .filter(Boolean)
    .every(term => testi.some(t => t.includes(term)))
}

export function nomeCompleto(cliente) {
  return `${cliente.nome} ${cliente.cognome}`
}
