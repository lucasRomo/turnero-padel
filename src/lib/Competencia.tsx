import { useEffect, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import { negocio } from '../config/negocio'
import { compartirImagen, descargar, dibujarAfiche, estilos, medidas, type Contenido, type Formato } from './afiche'
import {
  campeon,
  etiquetaOrigen,
  ganador,
  parejasDeZona,
  rondaActual,
  rondas,
  tabla,
  zonasDe,
  type Competencia,
  type Partido,
  type Sets,
} from './competencias'
import { capital, fechaLarga, hora } from './formato'
import { Dialogo } from './ui'

const canchaNombre = (id: string) => negocio.canchas.find((c) => c.id === id)?.nombre ?? ''

/** "Fecha 5 este sábado", "Terminó", etc. para la tarjeta de la competencia. */
export function estadoCompetencia(c: Competencia) {
  const cam = campeon(c)
  if (cam) return { terminada: true, texto: `Campeones: ${cam.nombre}` }
  const r = rondaActual(c)
  const p = rondas(c).find((x) => x.ronda === r)!.partidos[0]
  return { terminada: false, texto: `${r}: ${fechaLarga(p.dia)}` }
}

function Resultado({ p, editable, guardar }: { p: Partido; editable?: boolean; guardar?: (s: Sets | undefined) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState(p.sets?.map(([a, b]) => `${a}-${b}`).join(' ') ?? '')
  if (editable && abierto)
    return (
      <form
        className="comp-cargar"
        onSubmit={(ev) => {
          ev.preventDefault()
          const sets = texto
            .trim()
            .split(/\s+/)
            .map((s) => s.split('-').map(Number) as [number, number])
            .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
          guardar?.(sets.length ? sets : undefined)
          setAbierto(false)
        }}
      >
        <label>
          <span className="oculto">Resultado por sets</span>
          <input autoFocus value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="6-4 3-6 7-5…" inputMode="numeric" />
        </label>
        <button className="comp-boton comp-boton-lleno">Guardar</button>
      </form>
    )
  if (!p.sets)
    return editable && p.a && p.b ? (
      <button className="comp-boton" onClick={() => setAbierto(true)}>
        Cargar resultado
      </button>
    ) : null
  return (
    <span className="comp-sets">
      {p.sets.map(([a, b], i) => (
        <span key={i} className="comp-set">
          <b className={a > b ? 'gana' : ''}>{a}</b>
          <b className={b > a ? 'gana' : ''}>{b}</b>
        </span>
      ))}
      {editable && (
        <button className="comp-editar" onClick={() => setAbierto(true)} aria-label="Corregir resultado">
          Corregir
        </button>
      )}
    </span>
  )
}

function PartidoFila({ c, p, editable, guardar, mostrarRonda }: { c: Competencia; p: Partido; editable?: boolean; guardar?: (id: string, s: Sets | undefined) => void; mostrarRonda?: boolean }) {
  const g = ganador(p)
  const nombre = (id: string | null, o?: Partido['desdeA']) => (id ? c.parejas.find((x) => x.id === id)?.nombre : etiquetaOrigen(o))
  return (
    <li className="comp-partido">
      <p className="comp-partido-cuando">
        {mostrarRonda && <strong>{p.ronda}</strong>}
        {capital(fechaLarga(p.dia)).replace(/ de \w+$/, '').replace(',', '')}, {hora(p.inicio)}, {canchaNombre(p.canchaId)}
      </p>
      <div className="comp-partido-cuerpo">
        <p className="comp-parejas">
          <span className={g && g === p.a ? 'gana' : !p.a ? 'falta' : ''}>{nombre(p.a, p.desdeA)}</span>
          <span className={g && g === p.b ? 'gana' : !p.b ? 'falta' : ''}>{nombre(p.b, p.desdeB)}</span>
        </p>
        <Resultado key={p.sets?.join() ?? 'sin'} p={p} editable={editable} guardar={(s) => guardar?.(p.id, s)} />
      </div>
    </li>
  )
}

function TablaPosiciones({ filas, clasifican = 0 }: { filas: ReturnType<typeof tabla>; clasifican?: number }) {
  return (
    <div className="comp-tabla-marco">
      <table className="comp-tabla">
        <thead>
          <tr>
            <th className="num">#</th>
            <th>Pareja</th>
            <th className="num">PJ</th>
            <th className="num">PG</th>
            <th className="num">PP</th>
            <th className="num ancho">Sets</th>
            <th className="num ancho">Games</th>
            <th className="num">Pts</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.pareja.id} className={i < clasifican ? 'clasifica' : ''}>
              <td className="num">{i + 1}</td>
              <td>{f.pareja.nombre}</td>
              <td className="num">{f.pj}</td>
              <td className="num">{f.pg}</td>
              <td className="num">{f.pp}</td>
              <td className="num ancho">{f.sf}-{f.sc}</td>
              <td className="num ancho">{f.gf}-{f.gc}</td>
              <td className="num"><strong>{f.pts}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Vista = 'fixture' | 'tabla' | 'zonas' | 'cuadro'

export function VistaCompetencia({ c, editable, guardar }: { c: Competencia; editable?: boolean; guardar?: (partidoId: string, s: Sets | undefined) => void }) {
  const rs = rondas(c)
  const esLiga = c.formato === 'liga'
  const [vista, setVista] = useState<Vista>(esLiga ? 'fixture' : 'cuadro')
  const [ronda, setRonda] = useState(rondaActual(c))
  const [compartir, setCompartir] = useState(false)
  const cam = campeon(c)
  const vistas: [Vista, string][] = esLiga ? [['fixture', 'Fixture'], ['tabla', 'Tabla']] : [['cuadro', 'Cuadro'], ['zonas', 'Zonas']]
  const delaRonda = rs.find((r) => r.ronda === ronda) ?? rs[0]

  return (
    <div className="comp">
      {cam && (
        <p className="comp-campeon">
          Campeones: <strong>{cam.nombre}</strong>
        </p>
      )}
      <div className="comp-barra">
        <div className="comp-pestanas" role="tablist">
          {vistas.map(([v, t]) => (
            <button key={v} role="tab" aria-selected={vista === v} className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
              {t}
            </button>
          ))}
        </div>
        <button className="comp-boton comp-boton-lleno" onClick={() => setCompartir(true)}>
          <Share2 size={17} aria-hidden="true" /> Compartir
        </button>
      </div>

      {vista === 'fixture' && (
        <>
          <div className="comp-rondas" role="tablist" aria-label="Fecha">
            {rs.map((r) => (
              <button key={r.ronda} role="tab" aria-selected={r.ronda === ronda} className={r.ronda === ronda ? 'activa' : ''} onClick={() => setRonda(r.ronda)}>
                {r.ronda.replace('Fecha ', '')}
              </button>
            ))}
          </div>
          <h3 className="comp-subtitulo">
            {delaRonda.ronda}, {fechaLarga(delaRonda.partidos[0].dia)}
          </h3>
          <ul className="comp-partidos">
            {delaRonda.partidos.map((p) => (
              <PartidoFila key={p.id} c={c} p={p} editable={editable} guardar={guardar} />
            ))}
          </ul>
        </>
      )}

      {vista === 'tabla' && (
        <>
          <TablaPosiciones filas={tabla(c.parejas, c.partidos)} />
          <p className="comp-nota">Partido ganado suma 3 puntos. Desempata la diferencia de sets y después la de games.</p>
        </>
      )}

      {vista === 'zonas' && (
        <div className="comp-zonas">
          {zonasDe(c).map((z) => (
            <section key={z} className="comp-zona">
              <h3 className="comp-subtitulo">Zona {z}</h3>
              <TablaPosiciones filas={tabla(parejasDeZona(c, z), c.partidos.filter((p) => p.ronda === `Zona ${z}`))} clasifican={2} />
              <ul className="comp-partidos">
                {rs.find((r) => r.ronda === `Zona ${z}`)!.partidos.map((p) => (
                  <PartidoFila key={p.id} c={c} p={p} editable={editable} guardar={guardar} />
                ))}
              </ul>
            </section>
          ))}
          <p className="comp-nota">Pasan los dos primeros de cada zona a cuartos de final.</p>
        </div>
      )}

      {vista === 'cuadro' && (
        <div className="comp-cuadro">
          {rs
            .filter((r) => !r.ronda.startsWith('Zona'))
            .map((r) => (
              <section key={r.ronda} className="comp-llave">
                <h3 className="comp-subtitulo">{r.ronda}</h3>
                <ul className="comp-partidos">
                  {r.partidos.map((p) => (
                    <PartidoFila key={p.id} c={c} p={p} editable={editable} guardar={guardar} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      <Compartir
        c={c}
        abierto={compartir}
        cerrar={() => setCompartir(false)}
        inicial={vista === 'tabla' ? { tipo: 'tabla' } : vista === 'fixture' ? { tipo: 'ronda', ronda } : vista === 'cuadro' ? { tipo: 'cuadro' } : { tipo: 'ronda', ronda: rs[0].ronda }}
      />
    </div>
  )
}

/** Elegir qué compartir, con qué diseño y en qué formato; vista previa en vivo. */
function Compartir({ c, abierto, cerrar, inicial }: { c: Competencia; abierto: boolean; cerrar: () => void; inicial: Contenido }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [contenido, setContenido] = useState<Contenido>(inicial)
  const [estilo, setEstilo] = useState(estilos[0])
  const [formato, setFormato] = useState<Formato>('post')
  const [aviso, setAviso] = useState('')
  const rs = rondas(c)

  useEffect(() => {
    if (abierto) {
      setContenido(inicial)
      setAviso('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    if (abierto && lienzo.current) dibujarAfiche(lienzo.current, c, contenido, estilo, formato)
  }, [abierto, c, contenido, estilo, formato])

  const opciones: [string, Contenido][] = [
    ...(c.formato === 'liga' ? ([['tabla', { tipo: 'tabla' }]] as [string, Contenido][]) : ([['cuadro', { tipo: 'cuadro' }]] as [string, Contenido][])),
    ...rs.map((r) => [r.ronda, { tipo: 'ronda', ronda: r.ronda }] as [string, Contenido]),
  ]
  const clave = contenido.tipo === 'ronda' ? contenido.ronda : contenido.tipo
  const nombreArchivo = `${c.nombre}-${clave}`.toLowerCase().replace(/[^a-z0-9ñáéíóú]+/g, '-')
  const mensaje = `${c.nombre} (${c.categoria}) en ${negocio.nombre}`
  const [w, h] = medidas[formato]

  return (
    <Dialogo abierto={abierto} cerrar={cerrar} titulo="Compartir" ancho={860}>
      <div className="afiche">
        <div className="afiche-vista" style={{ aspectRatio: `${w} / ${h}` }}>
          <canvas ref={lienzo} aria-label={`Vista previa: ${c.nombre}, ${clave}`} />
        </div>
        <div className="afiche-opciones">
          <label className="afiche-campo">
            Qué mostrar
            <select value={clave} onChange={(ev) => setContenido(opciones.find(([k]) => k === ev.target.value)![1])}>
              {opciones.map(([k]) => (
                <option key={k} value={k}>
                  {k === 'tabla' ? 'Tabla de posiciones' : k === 'cuadro' ? 'Cuadro final' : k}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="afiche-campo">
            <legend>Diseño</legend>
            <div className="afiche-estilos">
              {estilos.map((x) => (
                <button key={x.id} type="button" aria-pressed={estilo.id === x.id} className={estilo.id === x.id ? 'activo' : ''} onClick={() => setEstilo(x)}>
                  <span className="afiche-muestra" style={{ background: x.fondo, color: x.texto, boxShadow: `inset 0 -10px 0 ${x.banda}` }} aria-hidden="true">
                    Aa
                  </span>
                  {x.nombre}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="afiche-campo">
            <legend>Formato</legend>
            <div className="comp-pestanas">
              {(['post', 'historia'] as Formato[]).map((f) => (
                <button key={f} type="button" aria-pressed={formato === f} className={formato === f ? 'activa' : ''} onClick={() => setFormato(f)}>
                  {f === 'post' ? 'Publicación' : 'Historia'}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="afiche-acciones">
            <button
              className="comp-boton comp-boton-lleno comp-boton-ancho"
              onClick={async () => {
                const r = await compartirImagen(lienzo.current!, nombreArchivo, mensaje)
                setAviso(r === 'descargado' ? 'Se descargó la imagen. Adjuntala en WhatsApp o Instagram.' : r === 'compartido' ? 'Listo, compartido.' : '')
              }}
            >
              Mandar por WhatsApp
            </button>
            <button
              className="comp-boton comp-boton-ancho"
              onClick={() =>
                lienzo.current!.toBlob((b) => {
                  if (b) descargar(b, `${nombreArchivo}.png`)
                  setAviso('Imagen descargada.')
                }, 'image/png')
              }
            >
              Descargar imagen
            </button>
            <p className="comp-nota" aria-live="polite">
              {aviso || 'En el celular abre el menú para compartir; en la computadora descarga la imagen.'}
            </p>
          </div>
        </div>
      </div>
    </Dialogo>
  )
}
