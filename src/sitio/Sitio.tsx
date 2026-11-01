import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { negocio, precioDe, type Cancha } from '../config/negocio'
import { capital, fechaCorta, fechaRelativa, hora, hoyClave, pesos, sumarDias, ahoraMin } from '../lib/formato'
import { libres, pedirFijo, reservar, useDatos, type Reserva } from '../lib/datos'
import { Dialogo, useRevelar } from '../lib/ui'

const PRODUCTO = 'Turnero'
const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function BarraDemo() {
  return (
    <div className="barra-demo">
      <p>Demo de {PRODUCTO} para complejos de pádel. El club es inventado y las reservas son de prueba.</p>
      <Link to="/admin">Ver el panel del club →</Link>
    </div>
  )
}

type Eleccion = { dia: string; inicio: number; cancha: Cancha }

/** El tablero: cada horario es una "salida", con las canchas libres como puertas. */
function Tablero({ elegir }: { elegir: (x: Eleccion) => void }) {
  const e = useDatos()
  const hoy = hoyClave()
  const [dia, setDia] = useState(hoy)
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i))
  const lib = useMemo(() => libres(e, dia), [e, dia])
  const minimo = dia === hoy ? ahoraMin() + 10 : 0
  const filas = negocio.turnos
    .filter((t) => t >= minimo)
    .map((inicio) => ({ inicio, canchas: lib.filter((l) => l.inicio === inicio).map((l) => l.cancha) }))

  return (
    <div className="tablero" data-ui>
      <div className="tablero-dias" role="tablist" aria-label="Día">
        {dias.map((d) => (
          <button key={d} role="tab" aria-selected={d === dia} className={d === dia ? 'activa' : ''} onClick={() => setDia(d)}>
            {d === hoy ? 'Hoy' : d === sumarDias(hoy, 1) ? 'Mañana' : capital(fechaCorta(d))}
          </button>
        ))}
      </div>
      <table key={dia}>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Canchas libres</th>
            <th className="solo-ancho">Tarifa</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={4} className="tablero-vacio">No quedan turnos hoy. Mirá mañana.</td>
            </tr>
          )}
          {filas.map((f, i) => (
            <tr key={f.inicio} className={f.canchas.length ? '' : 'completo'} style={{ ['--i' as string]: i }}>
              <td className="tablero-hora">{hora(f.inicio)}</td>
              <td>
                <div className="puertas">
                  {negocio.canchas.map((c) => {
                    const libre = f.canchas.some((x) => x.id === c.id)
                    return (
                      <button
                        key={c.id}
                        className="puerta"
                        disabled={!libre}
                        onClick={() => elegir({ dia, inicio: f.inicio, cancha: c })}
                        aria-label={`${c.nombre} a las ${hora(f.inicio)}${libre ? '' : ', ocupada'}`}
                      >
                        {c.id.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </td>
              <td className="solo-ancho">{pesos(precioDe(f.inicio))}</td>
              <td className="tablero-estado">
                {f.canchas.length === 0 ? 'Completo' : f.canchas.length === 1 ? 'Última' : `${f.canchas.length} libres`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Reservar({ eleccion, cerrar }: { eleccion: Eleccion | null; cerrar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')
  const [pago, setPago] = useState<'nada' | 'pagando' | 'ok'>('nada')
  const [hecha, setHecha] = useState<Reserva | null>(null)

  useEffect(() => {
    if (eleccion) {
      setPago('nada')
      setHecha(null)
    }
  }, [eleccion])

  if (!eleccion) return <Dialogo abierto={false} cerrar={cerrar} titulo="">{null}</Dialogo>
  const precio = precioDe(eleccion.inicio)

  function confirmar(ev: FormEvent) {
    ev.preventDefault()
    if (!eleccion) return
    setHecha(reservar({ canchaId: eleccion.cancha.id, dia: eleccion.dia, inicio: eleccion.inicio, titular: nombre, telefono: tel, origen: 'web', señada: pago === 'ok' }))
  }

  return (
    <Dialogo abierto={!!eleccion} cerrar={cerrar} titulo={hecha ? 'Tarjeta de embarque' : 'Reservar cancha'} ancho={520}>
      {hecha ? (
        <div className="embarque">
          <dl>
            <div><dt>Pasajero</dt><dd>{hecha.titular}</dd></div>
            <div><dt>Día</dt><dd>{capital(fechaRelativa(hecha.dia))}</dd></div>
            <div><dt>Hora</dt><dd className="grande">{hora(hecha.inicio)}</dd></div>
            <div><dt>Puerta</dt><dd className="grande">{eleccion.cancha.id.slice(1)}</dd></div>
            <div><dt>Seña</dt><dd>{hecha.estado === 'señada' ? `${pesos(negocio.seña)} pagada` : 'A pagar en el club'}</dd></div>
            <div><dt>Saldo</dt><dd>{pesos(hecha.precio - hecha.seña)}</dd></div>
          </dl>
          <p>Llegá 10 minutos antes. Si no podés venir, avisanos por WhatsApp hasta 6 horas antes y te devolvemos la seña.</p>
          <div className="acciones">
            <button className="btn btn-acento" onClick={cerrar}>Listo</button>
            <Link className="enlace" to={`/admin?dia=${hecha.dia}`}>Así lo ve el club →</Link>
          </div>
        </div>
      ) : (
        <form className="form-reserva" onSubmit={confirmar}>
          <p className="resumen">
            <strong>{eleccion.cancha.nombre}</strong> · {eleccion.cancha.detalle}
            <br />
            {capital(fechaRelativa(eleccion.dia))} de {hora(eleccion.inicio)} a {hora(eleccion.inicio + negocio.duracion)} · {pesos(precio)}
          </p>
          <label>
            Nombre y apellido
            <input required value={nombre} onChange={(ev) => setNombre(ev.target.value)} autoComplete="name" />
          </label>
          <label>
            WhatsApp
            <input required value={tel} onChange={(ev) => setTel(ev.target.value)} inputMode="tel" placeholder="351 000-0000" autoComplete="tel" />
          </label>
          <div className="pago">
            {pago === 'ok' ? (
              <p className="pago-ok">Seña de {pesos(negocio.seña)} aprobada con Mercado Pago</p>
            ) : (
              <button
                type="button"
                className="btn btn-mp"
                disabled={pago === 'pagando'}
                onClick={() => {
                  setPago('pagando')
                  setTimeout(() => setPago('ok'), 1100)
                }}
              >
                {pago === 'pagando' ? 'Procesando pago…' : `Señar ${pesos(negocio.seña)} con Mercado Pago`}
              </button>
            )}
            <small>Pago simulado: es una demo. El resto ({pesos(precio - negocio.seña)}) se paga en el club.</small>
          </div>
          <button className="btn btn-acento" disabled={!nombre || !tel}>
            {pago === 'ok' ? 'Confirmar reserva' : 'Reservar sin seña'}
          </button>
        </form>
      )}
    </Dialogo>
  )
}

function Actividades() {
  const ref = useRevelar<HTMLElement>()
  return (
    <section id="actividades" className="actividades" ref={ref}>
      <img src="img/canchas.jpg" alt="Canchas de pádel azules entre árboles, vistas desde arriba" width={1920} height={1280} loading="lazy" />
      <div className="actividades-texto revela">
        <h2>Clases y torneos</h2>
        <p>Clases, americanos y torneos todas las semanas. Si venís solo, te armamos el partido.</p>
      </div>
      <div className="papeletas">
        {negocio.actividades.map((a, i) => (
          <article key={a.titulo} className="papeleta revela" style={{ ['--alto' as string]: `${[38, 30, 44, 34][i]}svh`, ['--giro' as string]: `${[-1.5, 0, 1.2, 0][i]}deg` }}>
            <h3>{a.titulo}</h3>
            <p className="papeleta-corte" aria-hidden="true">- - - - - - - - - - - - -</p>
            <p><strong>{a.cuando}</strong></p>
            <p>{a.texto}</p>
            <p>{pesos(a.precio)} {a.unidad}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Tarifa() {
  const ref = useRevelar<HTMLElement>()
  return (
    <section id="precios" className="tarifa-seccion" ref={ref} aria-labelledby="tarifa-titulo">
      <div className="pasaje revela">
        <div className="pasaje-principal">
          <h2 id="tarifa-titulo">Cancha, 90 minutos</h2>
          <ul>
            <li><span>Antes de las 17</span><strong>{pesos(negocio.precios.valle)}</strong></li>
            <li><span>Desde las 17 y fines de semana</span><strong>{pesos(negocio.precios.pico)}</strong></li>
            <li><span>Seña con Mercado Pago</span><strong>{pesos(negocio.seña)}</strong></li>
            <li><span>Paleta en alquiler</span><strong>{pesos(3000)}</strong></li>
          </ul>
        </div>
        <div className="pasaje-talon">
          <p className="pasaje-precio"><small>desde</small>{pesos(negocio.precios.valle)}</p>
          <a className="btn btn-acento btn-ancho" href="#inicio">Elegir horario</a>
        </div>
      </div>
    </section>
  )
}

function Pasos() {
  const ref = useRevelar<HTMLElement>()
  const pasos = [
    ['Elegís cancha y hora.', 'En el tablero ves en vivo qué canchas quedan libres, hoy y toda la semana.'],
    ['Señás con Mercado Pago.', `Son ${pesos(negocio.seña)}. La cancha queda a tu nombre al instante.`],
    ['Te llega la confirmación.', 'Por WhatsApp, con el recordatorio el mismo día.'],
    ['Jugás y pagás el resto acá.', 'Efectivo, transferencia o Mercado Pago.'],
  ]
  return (
    <section className="pasos" ref={ref} aria-label="Cómo reservar">
      {pasos.map(([t, d], i) => (
        <div key={t} className="paso revela" style={{ ['--col' as string]: 1 + i * 2 }}>
          {i === 0 ? <h2>{t}</h2> : <p className="paso-linea">{t}</p>}
          <p>{d}</p>
        </div>
      ))}
    </section>
  )
}

function Fijo() {
  const ref = useRevelar<HTMLElement>()
  const [enviado, setEnviado] = useState(false)
  const [d, setD] = useState({ nombre: '', telefono: '', dow: 2, inicio: 1200 })
  return (
    <section id="fijo" className="cupon-seccion" ref={ref}>
      <form
        className="cupon revela"
        onSubmit={(ev) => {
          ev.preventDefault()
          pedirFijo(d)
          setEnviado(true)
        }}
      >
        <div className="cupon-texto">
          <h2>Pedí tu turno fijo</h2>
          <p>El mismo día y hora todas las semanas, sin volver a reservar. Te confirmamos por WhatsApp en el día.</p>
        </div>
        {enviado ? (
          <div className="cupon-campos cupon-listo">
            <p><strong>¡Listo, {d.nombre.split(' ')[0]}!</strong> Pediste los {diasSemana[d.dow]} a las {hora(d.inicio)}. Te escribimos para confirmarlo.</p>
            <Link className="enlace" to="/admin/fijos">Así le llega al club →</Link>
          </div>
        ) : (
          <div className="cupon-campos">
            <label><span className="oculto">Nombre</span><input required placeholder="Nombre y apellido" value={d.nombre} onChange={(ev) => setD({ ...d, nombre: ev.target.value })} /></label>
            <label><span className="oculto">WhatsApp</span><input required placeholder="WhatsApp" inputMode="tel" value={d.telefono} onChange={(ev) => setD({ ...d, telefono: ev.target.value })} /></label>
            <label>
              <span className="oculto">Día</span>
              <select value={d.dow} onChange={(ev) => setD({ ...d, dow: Number(ev.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 0].map((x) => <option key={x} value={x}>Todos los {diasSemana[x]}</option>)}
              </select>
            </label>
            <label>
              <span className="oculto">Hora</span>
              <select value={d.inicio} onChange={(ev) => setD({ ...d, inicio: Number(ev.target.value) })}>
                {negocio.turnos.map((t) => <option key={t} value={t}>A las {hora(t)}</option>)}
              </select>
            </label>
            <button className="cupon-enviar">Pedir turno fijo</button>
          </div>
        )}
      </form>
    </section>
  )
}

function Pie() {
  return (
    <footer className="pie">
      <div className="pie-arriba">
        <p><strong>{negocio.nombre}</strong><br />{negocio.direccion}, {negocio.barrio}, {negocio.ciudad}</p>
        <p>Todos los días de 8:00 a 00:30.<br />Vestuarios, cantina y estacionamiento.</p>
        <a href="#inicio">Volver arriba ↑</a>
      </div>
      <a className="pie-contacto" href={`https://wa.me/54${negocio.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
        {negocio.whatsapp}
      </a>
      <div className="pie-abajo">
        <span><a href={`https://instagram.com/${negocio.instagram}`}>Instagram</a> · <Link to="/admin">Panel del club</Link></span>
        <span className="creditos">
          Fotos: <a href="https://commons.wikimedia.org/wiki/File:Multiple_Paddle_tennis_players_engage_in_a_lively_match_on_blue_courts_surrounded_by_lush_greenery.jpg">Nenad Stojković</a>, CC BY 2.0;{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Padel_court_Nsambya.jpg">Samson Ssemakadde</a>, CC0;{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Mejorset_Full_Panoramic_Padel_Court_Delivered_by_SG_Padel.jpg">OCHAPPS</a>, CC BY-SA 4.0;{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Padel_en_el_Cos_Sports_Plaza.jpg">Virpana</a>, CC0; vía Wikimedia Commons
        </span>
        <span>{negocio.ciudad} · {new Date().getFullYear()}</span>
      </div>
    </footer>
  )
}

export default function Sitio() {
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)
  useEffect(() => {
    document.title = `${negocio.nombre} · Reservá cancha en ${negocio.barrio}`
  }, [])
  return (
    <div className="sitio">
      <BarraDemo />
      <nav className="nav">
        <a href="#inicio" className="nav-marca">{negocio.corto}</a>
        <div className="nav-links">
          <a href="#actividades">Actividades</a>
          <a href="#precios">Precios</a>
          <a href="#fijo">Turno fijo</a>
        </div>
        <a href="#tablero" className="btn btn-acento btn-chico">Reservar</a>
      </nav>
      <header id="inicio" className="portada">
        <div className="portada-texto">
          <h1>Jugá hoy</h1>
          <p>
            {negocio.nombre}: cuatro canchas en {negocio.barrio}, {negocio.ciudad}. Tocá una cancha libre, señá con Mercado Pago y
            listo.
          </p>
        </div>
        <div id="tablero" className="portada-tablero">
          <Tablero elegir={setEleccion} />
        </div>
        <figure className="portada-foto">
          <img src="img/cancha-vidrio.jpg" alt="Cancha de pádel de blindex con césped azul" width={1600} height={1060} />
        </figure>
      </header>
      <main>
        <Actividades />
        <Tarifa />
        <Pasos />
        <figure className="banda-foto">
          <img src="img/panoramica.jpg" alt="Cancha panorámica de vidrio con luces, al aire libre" width={1439} height={1039} loading="lazy" />
        </figure>
        <Fijo />
      </main>
      <Pie />
      <Reservar eleccion={eleccion} cerrar={() => setEleccion(null)} />
    </div>
  )
}
