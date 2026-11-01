// Tipos, datos de demo y estado del complejo. Todo vive en el navegador (localStorage).
import { useSyncExternalStore } from 'react'
import { negocio, precioDe } from '../config/negocio'
import { ahoraMin, deClave, hoyClave, sumarDias } from './formato'

export type Metodo = 'efectivo' | 'transferencia' | 'mercadopago'
export const metodos: Record<Metodo, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', mercadopago: 'Mercado Pago' }

export type EstadoReserva = 'pendiente' | 'señada' | 'pagada' | 'cancelada'
export const estados: Record<EstadoReserva, string> = {
  pendiente: 'Falta la seña',
  señada: 'Señada',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
}

export type Reserva = {
  id: string
  canchaId: string
  dia: string
  inicio: number
  titular: string
  telefono: string
  precio: number
  seña: number
  estado: EstadoReserva
  origen: 'web' | 'whatsapp' | 'fijo'
  fijoId?: string
  metodo?: Metodo
}

export type Fijo = { id: string; canchaId: string; dow: number; inicio: number; titular: string; telefono: string; desde: string }
export type Venta = { id: string; dia: string; hora: number; itemId: string; monto: number; metodo: Metodo }
export type Solicitud = { id: string; nombre: string; telefono: string; dow: number; inicio: number; creada: string }

export type Estado = {
  version: number
  generado: string
  reservas: Reserva[]
  fijos: Fijo[]
  ventas: Venta[]
  solicitudes: Solicitud[]
}

const VERSION = 3
const CLAVE = 'tresmuros-demo'

function azar(semilla: number) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const nombres = ['Matías', 'Lucas', 'Franco', 'Nico', 'Santi', 'Tomás', 'Joaquín', 'Facu', 'Agus', 'Bruno', 'Gonza', 'Nacho', 'Lauti', 'Juli', 'Cami', 'Sofi', 'Vale', 'Flor', 'Euge', 'Pau', 'Mica', 'Ramiro', 'Pablo', 'Diego', 'Martín', 'Seba', 'Germán', 'Ceci', 'Lu', 'Romi']
const apellidos = ['González', 'Ferreyra', 'Bustos', 'Ledesma', 'Vera', 'Sosa', 'Romero', 'Díaz', 'Pereyra', 'Moyano', 'Heredia', 'Luna', 'Oviedo', 'Quinteros', 'Carranza', 'Allende', 'Funes', 'Cabrera']
const tel = (r: () => number) => `351 ${Math.floor(150 + r() * 650)}-${String(Math.floor(r() * 10000)).padStart(4, '0')}`

function generar(): Estado {
  const hoy = hoyClave()
  const ahora = ahoraMin()
  const r = azar(Number(hoy.replace(/-/g, '')) + 7)
  const persona = () => `${nombres[Math.floor(r() * nombres.length)]} ${apellidos[Math.floor(r() * apellidos.length)]}`

  // Turnos fijos semanales en horario pico
  const fijos: Fijo[] = []
  for (let i = 0; i < 26; i++) {
    const dow = 1 + Math.floor(r() * 5)
    const inicio = negocio.turnos[6 + Math.floor(r() * 5)]
    const canchaId = negocio.canchas[Math.floor(r() * 4)].id
    if (fijos.some((f) => f.dow === dow && f.inicio === inicio && f.canchaId === canchaId)) continue
    fijos.push({ id: `f${i}`, canchaId, dow, inicio, titular: persona(), telefono: tel(r), desde: sumarDias(hoy, -Math.floor(30 + r() * 300)) })
  }

  const reservas: Reserva[] = []
  let n = 0
  for (let d = -62; d <= 10; d++) {
    const dia = sumarDias(hoy, d)
    const dow = deClave(dia).getDay()
    for (const c of negocio.canchas) {
      for (const inicio of negocio.turnos) {
        const fijo = fijos.find((f) => f.dow === dow && f.inicio === inicio && f.canchaId === c.id)
        // Ocupación: noches y fines de semana llenos, siesta vacía
        let p = inicio >= 1110 ? 0.82 : inicio >= 1020 ? 0.62 : inicio < 600 ? 0.3 : inicio >= 780 && inicio < 1000 ? 0.16 : 0.32
        if (dow === 0 || dow === 6) p = inicio >= 1380 ? 0.4 : 0.66
        if (!c.techada && inicio >= 840 && inicio < 1020 && dow !== 0 && dow !== 6) p *= 0.6
        if (d > 0) p *= Math.max(0.25, 1 - d * 0.09)
        if (!fijo && r() > p) continue
        const pasada = d < 0 || (d === 0 && inicio + negocio.duracion <= ahora)
        const enCurso = d === 0 && inicio <= ahora && inicio + negocio.duracion > ahora
        let estado: EstadoReserva = 'señada'
        if (pasada) estado = r() < 0.04 ? 'cancelada' : 'pagada'
        else if (enCurso) estado = 'señada'
        else if (!fijo && r() < 0.14) estado = 'pendiente'
        reservas.push({
          id: `r${++n}`,
          canchaId: c.id,
          dia,
          inicio,
          titular: fijo?.titular ?? persona(),
          telefono: fijo?.telefono ?? tel(r),
          precio: precioDe(inicio),
          seña: estado === 'pendiente' ? 0 : fijo ? 0 : negocio.seña,
          estado,
          origen: fijo ? 'fijo' : r() < 0.62 ? 'web' : 'whatsapp',
          fijoId: fijo?.id,
          metodo: estado === 'pagada' ? (['efectivo', 'transferencia', 'mercadopago'] as Metodo[])[Math.floor(r() * 3)] : undefined,
        })
      }
    }
  }

  const ventas: Venta[] = []
  for (let d = -62; d <= 0; d++) {
    const dia = sumarDias(hoy, d)
    const cuantas = 8 + Math.floor(r() * 18)
    for (let i = 0; i < cuantas; i++) {
      const it = negocio.cantina[Math.floor(r() * negocio.cantina.length)]
      const h = 600 + Math.floor(r() * 840)
      if (d === 0 && h > ahora) continue
      ventas.push({ id: `v${ventas.length}`, dia, hora: h, itemId: it.id, monto: it.precio, metodo: r() < 0.5 ? 'efectivo' : 'mercadopago' })
    }
  }

  const solicitudes: Solicitud[] = [
    { id: 's1', nombre: 'Cami Heredia', telefono: '351 622-1098', dow: 2, inicio: 1200, creada: sumarDias(hoy, -1) },
    { id: 's2', nombre: 'Gonza Funes', telefono: '351 488-7730', dow: 4, inicio: 1290, creada: hoy },
  ]

  return { version: VERSION, generado: hoy, reservas, fijos, ventas, solicitudes }
}

function cargar(): Estado {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Estado | null
    if (e && e.version === VERSION && e.generado === hoyClave()) return e
  } catch {
    /* sin almacenamiento */
  }
  return generar()
}

let estado = cargar()
const oyentes = new Set<() => void>()
function guardar(e: Estado) {
  estado = e
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e))
  } catch {
    /* modo privado */
  }
  oyentes.forEach((f) => f())
}
const suscribir = (f: () => void) => {
  oyentes.add(f)
  return () => {
    oyentes.delete(f)
  }
}
export const useDatos = () => useSyncExternalStore(suscribir, () => estado)

// ——— Acciones ———
export const reiniciar = () => guardar(generar())

export function reservar(d: Omit<Reserva, 'id' | 'precio' | 'estado' | 'seña'> & { señada: boolean }) {
  const { señada, ...resto } = d
  const nueva: Reserva = { ...resto, id: `r${Date.now()}`, precio: precioDe(d.inicio), seña: señada ? negocio.seña : 0, estado: señada ? 'señada' : 'pendiente' }
  guardar({ ...estado, reservas: [...estado.reservas, nueva] })
  return nueva
}
export const actualizarReserva = (id: string, c: Partial<Reserva>) =>
  guardar({ ...estado, reservas: estado.reservas.map((x) => (x.id === id ? { ...x, ...c } : x)) })
export const vender = (v: Omit<Venta, 'id'>) => guardar({ ...estado, ventas: [...estado.ventas, { ...v, id: `v${Date.now()}` }] })
export const pedirFijo = (s: Omit<Solicitud, 'id' | 'creada'>) =>
  guardar({ ...estado, solicitudes: [...estado.solicitudes, { ...s, id: `s${Date.now()}`, creada: hoyClave() }] })

/** Acepta una solicitud: crea el turno fijo y reserva las próximas 4 semanas en la cancha libre. */
export function aceptarSolicitud(id: string, canchaId: string) {
  const s = estado.solicitudes.find((x) => x.id === id)
  if (!s) return
  const fijo: Fijo = { id: `f${Date.now()}`, canchaId, dow: s.dow, inicio: s.inicio, titular: s.nombre, telefono: s.telefono, desde: hoyClave() }
  const nuevas: Reserva[] = []
  for (let d = 0; d < 28; d++) {
    const dia = sumarDias(hoyClave(), d)
    if (deClave(dia).getDay() !== s.dow) continue
    if (ocupada(estado, canchaId, dia, s.inicio)) continue
    nuevas.push({ id: `r${Date.now()}${d}`, canchaId, dia, inicio: s.inicio, titular: s.nombre, telefono: s.telefono, precio: precioDe(s.inicio), seña: 0, estado: 'señada', origen: 'fijo', fijoId: fijo.id })
  }
  guardar({ ...estado, fijos: [...estado.fijos, fijo], reservas: [...estado.reservas, ...nuevas], solicitudes: estado.solicitudes.filter((x) => x.id !== id) })
}
export const rechazarSolicitud = (id: string) => guardar({ ...estado, solicitudes: estado.solicitudes.filter((x) => x.id !== id) })
export const darDeBajaFijo = (id: string) =>
  guardar({
    ...estado,
    fijos: estado.fijos.filter((f) => f.id !== id),
    reservas: estado.reservas.map((x) => (x.fijoId === id && x.dia >= hoyClave() && x.estado !== 'pagada' ? { ...x, estado: 'cancelada' } : x)),
  })

// ——— Consultas ———
export const ocupada = (e: Estado, canchaId: string, dia: string, inicio: number) =>
  e.reservas.some((x) => x.canchaId === canchaId && x.dia === dia && x.inicio === inicio && x.estado !== 'cancelada')

export function libres(e: Estado, dia: string) {
  const minimo = dia === hoyClave() ? ahoraMin() + 10 : 0
  return negocio.turnos.flatMap((inicio) =>
    inicio < minimo ? [] : negocio.canchas.filter((c) => !ocupada(e, c.id, dia, inicio)).map((c) => ({ inicio, cancha: c })),
  )
}
