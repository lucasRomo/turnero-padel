// Placas para compartir el fixture, la tabla o el cuadro. Se dibujan en un canvas, sin servicios externos.
import { negocio } from '../config/negocio'
import { campeon, ganador, rondas, tabla, type Competencia, type Partido } from './competencias'
import { capital, deClave, hora } from './formato'

export type Estilo = { id: string; nombre: string; fondo: string; texto: string; tenue: string; acento: string; banda: string; bandaTexto: string; piso: string; pisoLinea: string }

export const estilos: Estilo[] = [
  { id: 'club', nombre: 'Club', fondo: '#ffffff', texto: '#0d2347', tenue: '#5a6577', acento: '#1f56c4', banda: '#0d2347', bandaTexto: '#ffffff', piso: '#2f6fd6', pisoLinea: '#ffffff' },
  { id: 'noche', nombre: 'Noche', fondo: '#0d2347', texto: '#ffffff', tenue: '#a9b6cc', acento: '#d7f04a', banda: '#d7f04a', bandaTexto: '#0d2347', piso: '#2f6fd6', pisoLinea: '#ffffff' },
  { id: 'cancha', nombre: 'Cancha', fondo: '#1f56c4', texto: '#ffffff', tenue: '#c9d8f5', acento: '#ffffff', banda: '#ffffff', bandaTexto: '#1f56c4', piso: '#0d2347', pisoLinea: '#ffffff' },
  { id: 'cesped', nombre: 'Césped', fondo: '#17633d', texto: '#ffffff', tenue: '#bfe0cb', acento: '#d7f04a', banda: '#d7f04a', bandaTexto: '#17633d', piso: '#2f6fd6', pisoLinea: '#ffffff' },
]

export type Contenido = { tipo: 'ronda'; ronda: string } | { tipo: 'tabla' } | { tipo: 'cuadro' }
export type Formato = 'post' | 'historia'
export const medidas: Record<Formato, [number, number]> = { post: [1080, 1350], historia: [1080, 1920] }

const FUENTE = 'Barlow'
const fecha = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
const canchaNombre = (id: string) => negocio.canchas.find((c) => c.id === id)?.nombre ?? ''

/** Escribe una línea achicando la letra hasta que entre en el ancho. */
function texto(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, ancho: number, peso: number, tamaño: number, color: string, alinear: CanvasTextAlign = 'left') {
  let s = tamaño
  do {
    ctx.font = `${peso} ${s}px ${FUENTE}, system-ui, sans-serif`
    s -= 1
  } while (ctx.measureText(t).width > ancho && s > 12)
  ctx.fillStyle = color
  ctx.textAlign = alinear
  ctx.fillText(t, x, y)
}

/** La cancha vista desde arriba, chica, arriba a la derecha: es la firma de las placas del club. */
function canchaFirma(ctx: CanvasRenderingContext2D, x: number, y: number, ancho: number, piso: string, linea: string) {
  const alto = ancho / 2
  ctx.fillStyle = piso
  ctx.beginPath()
  ctx.roundRect(x, y, ancho, alto, 10)
  ctx.fill()
  ctx.strokeStyle = linea
  ctx.lineWidth = 3
  const m = 8
  ctx.strokeRect(x + m, y + m, ancho - m * 2, alto - m * 2)
  const saque = (ancho - m * 2) * 0.1525
  ctx.beginPath()
  ctx.moveTo(x + m + saque, y + m)
  ctx.lineTo(x + m + saque, y + alto - m)
  ctx.moveTo(x + ancho - m - saque, y + m)
  ctx.lineTo(x + ancho - m - saque, y + alto - m)
  ctx.moveTo(x + m + saque, y + alto / 2)
  ctx.lineTo(x + ancho - m - saque, y + alto / 2)
  ctx.stroke()
  ctx.lineWidth = 6
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(x + ancho / 2, y + 2)
  ctx.lineTo(x + ancho / 2, y + alto - 2)
  ctx.stroke()
  ctx.setLineDash([])
}

export async function dibujarAfiche(canvas: HTMLCanvasElement, c: Competencia, contenido: Contenido, estilo: Estilo, formato: Formato) {
  await document.fonts.load(`700 40px ${FUENTE}`).catch(() => undefined)
  await document.fonts.load(`500 40px ${FUENTE}`).catch(() => undefined)
  const [w, h] = medidas[formato]
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = estilo.fondo
  ctx.fillRect(0, 0, w, h)

  const m = 84
  const util = w - m * 2
  let y = formato === 'historia' ? 200 : 130

  // Cabecera: club, competencia y qué se muestra
  canchaFirma(ctx, w - m - 200, y - 46, 200, estilo.piso, estilo.pisoLinea)
  texto(ctx, negocio.nombre, m, y, util - 240, 600, 34, estilo.tenue)
  y += 86
  texto(ctx, c.nombre, m, y, util, 800, 84, estilo.texto)
  y += 56
  texto(ctx, capital(c.categoria), m, y, util, 500, 38, estilo.tenue)
  y += 50

  const rs = rondas(c)
  const titulo =
    contenido.tipo === 'tabla' ? 'Tabla de posiciones' : contenido.tipo === 'cuadro' ? 'Cuadro final' : contenido.ronda
  const sub =
    contenido.tipo === 'ronda'
      ? capital(fecha.format(deClave(rs.find((r) => r.ronda === contenido.ronda)?.partidos[0]?.dia ?? c.partidos[0].dia)))
      : contenido.tipo === 'tabla'
        ? `${c.partidos.filter((p) => p.sets).length} de ${c.partidos.length} partidos jugados`
        : ''
  ctx.fillStyle = estilo.banda
  const bandaAlto = 92
  ctx.beginPath()
  ctx.roundRect(m, y, util, bandaAlto, 14)
  ctx.fill()
  texto(ctx, titulo, m + 32, y + 62, util / 2, 800, 46, estilo.bandaTexto)
  if (sub) texto(ctx, sub, w - m - 32, y + 60, util / 2 - 40, 600, 32, estilo.bandaTexto, 'right')
  y += bandaAlto + 56

  const pie = h - (formato === 'historia' ? 170 : 96)

  if (contenido.tipo === 'tabla') {
    const filas = tabla(c.parejas, c.partidos).slice(0, formato === 'historia' ? 12 : 8)
    const alto = Math.min(96, (pie - y - 60) / (filas.length + 1))
    const cols = [w - m - 250, w - m - 160, w - m]
    texto(ctx, 'PJ', cols[0], y, 80, 600, 28, estilo.tenue, 'right')
    texto(ctx, 'PG', cols[1], y, 80, 600, 28, estilo.tenue, 'right')
    texto(ctx, 'Pts', cols[2], y, 80, 600, 28, estilo.tenue, 'right')
    y += alto * 0.75
    filas.forEach((f, i) => {
      const yy = y + i * alto + alto * 0.55
      if (i === 0) {
        ctx.fillStyle = estilo.acento
        ctx.globalAlpha = 0.16
        ctx.fillRect(m - 16, yy - alto * 0.62, util + 32, alto * 0.9)
        ctx.globalAlpha = 1
      }
      texto(ctx, String(i + 1), m, yy, 50, 800, 40, estilo.acento)
      texto(ctx, f.pareja.nombre, m + 64, yy, cols[0] - m - 150, 600, 40, estilo.texto)
      texto(ctx, String(f.pj), cols[0], yy, 80, 500, 38, estilo.texto, 'right')
      texto(ctx, String(f.pg), cols[1], yy, 80, 500, 38, estilo.texto, 'right')
      texto(ctx, String(f.pts), cols[2], yy, 90, 800, 42, estilo.texto, 'right')
    })
  } else {
    const lista: Partido[] =
      contenido.tipo === 'cuadro'
        ? rs.filter((r) => !r.ronda.startsWith('Zona')).flatMap((r) => r.partidos)
        : rs.find((r) => r.ronda === contenido.ronda)?.partidos ?? []
    const nombre = (id: string | null) => c.parejas.find((p) => p.id === id)?.nombre ?? 'A definir'
    const cam = contenido.tipo === 'cuadro' ? campeon(c) : null
    const alto = Math.min(190, (pie - y - (cam ? 170 : 40)) / Math.max(lista.length, 1))
    let rondaPrevia = ''
    lista.forEach((p, i) => {
      const yy = y + i * alto
      const g = ganador(p)
      const etiqueta = contenido.tipo === 'cuadro' ? (p.ronda !== rondaPrevia ? p.ronda : '') : ''
      rondaPrevia = p.ronda
      const arriba = contenido.tipo === 'cuadro' ? `${p.ronda}` : `${hora(p.inicio)}  ${canchaNombre(p.canchaId)}`
      texto(ctx, etiqueta || arriba, m, yy + alto * 0.24, util / 2, 600, Math.min(30, alto * 0.18), estilo.tenue)
      const tam = Math.min(44, alto * 0.25)
      texto(ctx, nombre(p.a), m, yy + alto * 0.5, util - 200, g === p.a ? 800 : 500, tam, estilo.texto)
      texto(ctx, nombre(p.b), m, yy + alto * 0.78, util - 200, g === p.b ? 800 : 500, tam, estilo.texto)
      if (p.sets) {
        p.sets.forEach(([a, b], k) => {
          const x = w - m - (p.sets!.length - 1 - k) * 62
          texto(ctx, String(a), x, yy + alto * 0.5, 60, a > b ? 800 : 500, tam, a > b ? estilo.acento : estilo.tenue, 'right')
          texto(ctx, String(b), x, yy + alto * 0.78, 60, b > a ? 800 : 500, tam, b > a ? estilo.acento : estilo.tenue, 'right')
        })
      } else if (contenido.tipo === 'cuadro') {
        texto(ctx, `${hora(p.inicio)}`, w - m, yy + alto * 0.64, 160, 600, tam * 0.8, estilo.tenue, 'right')
      }
    })
    if (cam) {
      const yy = pie - 120
      ctx.fillStyle = estilo.banda
      ctx.beginPath()
      ctx.roundRect(m, yy, util, 96, 14)
      ctx.fill()
      texto(ctx, `Campeones: ${cam.nombre}`, m + 32, yy + 62, util - 64, 800, 42, estilo.bandaTexto)
    }
  }

  texto(ctx, `${negocio.direccion}, ${negocio.barrio}`, m, pie + 40, util / 2, 500, 28, estilo.tenue)
  texto(ctx, `WhatsApp ${negocio.whatsapp}`, w - m, pie + 40, util / 2, 600, 28, estilo.tenue, 'right')
}

/** Comparte la imagen con el menú del teléfono (WhatsApp, Instagram); si no se puede, la descarga. */
export async function compartirImagen(canvas: HTMLCanvasElement, nombre: string, mensaje: string) {
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'))
  if (!blob) return 'error'
  const archivo = new File([blob], `${nombre}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], text: mensaje })
      return 'compartido'
    } catch {
      return 'cancelado'
    }
  }
  descargar(blob, `${nombre}.png`)
  return 'descargado'
}

export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
