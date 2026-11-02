import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { negocio, precioDe, type Cancha } from '../config/negocio'
import { ahoraMin, capital, fechaCorta, fechaRelativa, hora, hoyClave, pesos, sumarDias } from '../lib/formato'
import { ocupada, pedirFijo, reservar, useDatos, type Reserva } from '../lib/datos'
import { CanchaDibujo } from '../lib/cancha'
import { estadoCompetencia, VistaCompetencia } from '../lib/Competencia'
import { Dialogo } from '../lib/ui'

const PRODUCTO = 'Turnero'
const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const whatsapp = `https://wa.me/54${negocio.whatsapp.replace(/\D/g, '')}`

function BarraDemo() {
  return (
    <div className="barra-demo">
      <p>Demo de {PRODUCTO} para complejos de pádel. El club es inventado y las reservas son de prueba.</p>
      <Link to="/admin">Ver el panel del club</Link>
    </div>
  )
}

function Marca() {
  return (
    <Link to="/" className="marca">
      <span className="marca-icono" aria-hidden="true">
        <svg viewBox="0 0 28 28" width="28" height="28">
          <rect x="1" y="5" width="26" height="18" rx="3" fill="currentColor" />
          <path d="M14 5v18M6 14h16M6 5v18M22 5v18" stroke="#fff" strokeWidth="1.6" fill="none" />
        </svg>
      </span>
      {negocio.nombre}
    </Link>
  )
}

function Cabecera() {
  return (
    <header className="cabecera">
      <Marca />
      <nav className="cabecera-menu" aria-label="Secciones">
        <a href="#reservar">Reservar</a>
        <a href="#torneos">Torneos y ligas</a>
        <a href="#club">El club</a>
      </nav>
    </header>
  )
}

type Eleccion = { dia: string; inicio: number; cancha: Cancha }

/** Reservar mirando las canchas: se elige día y hora, y se ve cuál está libre. */
function Reservar({ elegir }: { elegir: (x: Eleccion) => void }) {
  const e = useDatos()
  const hoy = hoyClave()
  const [dia, setDia] = useState(hoy)
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i))
  const minimo = dia === hoy ? ahoraMin() + 10 : 0
  const horarios = negocio.turnos.filter((t) => t >= minimo)
  const libresEn = (t: number) => negocio.canchas.filter((c) => !ocupada(e, c.id, dia, t)).length
  const primeroLibre = horarios.find((t) => libresEn(t) > 0)
  const [inicio, setInicio] = useState<number | null>(null)
  const turno = inicio !== null && horarios.includes(inicio) ? inicio : primeroLibre ?? null

  return (
    <section id="reservar" className="reservar">
      <div className="seccion-cabeza">
        <h2>Reservá cancha</h2>
        <p>Turnos de 90 minutos. Elegí el día y la hora, y tocá una cancha libre.</p>
      </div>

      <div className="dias" role="tablist" aria-label="Día">
        {dias.map((d) => (
          <button key={d} role="tab" aria-selected={d === dia} className={d === dia ? 'activa' : ''} onClick={() => { setDia(d); setInicio(null) }}>
            <span>{d === hoy ? 'Hoy' : d === sumarDias(hoy, 1) ? 'Mañana' : capital(fechaCorta(d).split(' ')[0])}</span>
            <strong>{Number(d.slice(8))}</strong>
          </button>
        ))}
      </div>

      {horarios.length === 0 ? (
        <p className="vacio">No quedan turnos hoy. Mirá mañana.</p>
      ) : (
        <>
          <div className="horarios" role="tablist" aria-label="Hora">
            {horarios.map((t) => {
              const n = libresEn(t)
              return (
                <button key={t} role="tab" aria-selected={t === turno} className={t === turno ? 'activa' : ''} disabled={n === 0} onClick={() => setInicio(t)}>
                  <strong>{hora(t)}</strong>
                  <span>{n === 0 ? 'Completo' : n === 1 ? '1 libre' : `${n} libres`}</span>
                </button>
              )
            })}
          </div>

          {turno !== null && (
            <div className="canchas" aria-live="polite">
              <p className="canchas-titulo">
                {capital(fechaRelativa(dia))} de {hora(turno)} a {hora(turno + negocio.duracion)}, {pesos(precioDe(turno))} la cancha
              </p>
              <ul className="canchas-grilla">
                {negocio.canchas.map((c) => {
                  const libre = !ocupada(e, c.id, dia, turno)
                  return (
                    <li key={c.id}>
                      <button className={`cancha ${libre ? 'libre' : 'ocupada'}`} disabled={!libre} onClick={() => elegir({ dia, inicio: turno, cancha: c })}>
                        <CanchaDibujo className={libre ? 'libre' : 'ocupada'}>
                          <span className="cancha-numero">{c.id.slice(1)}</span>
                        </CanchaDibujo>
                        <span className="cancha-pie">
                          <span>
                            <strong>{c.nombre}</strong>
                            <small>{c.detalle}</small>
                          </span>
                          <span className="cancha-estado">{libre ? 'Reservar' : 'Ocupada'}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function FormReserva({ eleccion, cerrar }: { eleccion: Eleccion | null; cerrar: () => void }) {
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
    <Dialogo abierto={!!eleccion} cerrar={cerrar} titulo={hecha ? 'Cancha reservada' : `${eleccion.cancha.nombre}, ${hora(eleccion.inicio)}`} ancho={480}>
      {hecha ? (
        <div className="hecha">
          <CanchaDibujo className="libre">
            <span className="cancha-numero">{eleccion.cancha.id.slice(1)}</span>
          </CanchaDibujo>
          <dl className="datos-lista">
            <div><dt>A nombre de</dt><dd>{hecha.titular}</dd></div>
            <div><dt>Cuándo</dt><dd>{capital(fechaRelativa(hecha.dia))}, {hora(hecha.inicio)} a {hora(hecha.inicio + negocio.duracion)}</dd></div>
            <div><dt>Seña</dt><dd>{hecha.estado === 'señada' ? `${pesos(negocio.seña)} pagada` : 'A pagar en el club'}</dd></div>
            <div><dt>Saldo en el club</dt><dd>{pesos(hecha.precio - hecha.seña)}</dd></div>
          </dl>
          <p className="tenue">Te llega la confirmación por WhatsApp. Si no podés venir, avisanos hasta 6 horas antes y te devolvemos la seña.</p>
          <div className="acciones">
            <button className="btn btn-primario" onClick={cerrar}>Listo</button>
            <Link className="btn btn-secundario" to={`/admin?dia=${hecha.dia}`}>Así lo ve el club</Link>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={confirmar}>
          <p className="form-resumen">
            {capital(fechaRelativa(eleccion.dia))} de {hora(eleccion.inicio)} a {hora(eleccion.inicio + negocio.duracion)}. {eleccion.cancha.detalle}. <strong>{pesos(precio)}</strong>
          </p>
          <label>
            Nombre y apellido
            <input required name="nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} autoComplete="name" />
          </label>
          <label>
            WhatsApp
            <input required name="telefono" type="tel" value={tel} onChange={(ev) => setTel(ev.target.value)} inputMode="tel" placeholder="351 000-0000…" autoComplete="tel" />
          </label>
          {pago === 'ok' ? (
            <p className="pago-ok">Seña de {pesos(negocio.seña)} aprobada con Mercado Pago</p>
          ) : (
            <button type="button" className="btn btn-mp" disabled={pago === 'pagando'} onClick={() => { setPago('pagando'); setTimeout(() => setPago('ok'), 1100) }}>
              {pago === 'pagando' ? 'Procesando pago…' : `Señar ${pesos(negocio.seña)} con Mercado Pago`}
            </button>
          )}
          <p className="tenue chico">Pago simulado: es una demo. El resto, {pesos(precio - negocio.seña)}, se paga en el club.</p>
          <button className="btn btn-primario" disabled={!nombre || !tel}>
            {pago === 'ok' ? 'Confirmar reserva' : 'Reservar sin seña'}
          </button>
        </form>
      )}
    </Dialogo>
  )
}

function Torneos() {
  const e = useDatos()
  return (
    <section id="torneos" className="torneos">
      <div className="seccion-cabeza">
        <h2>Torneos y ligas</h2>
        <p>Fixture, resultados y tablas al día. Los cargamos apenas termina cada partido.</p>
      </div>
      <ul className="torneos-lista">
        {e.competencias.map((c) => {
          const est = estadoCompetencia(c)
          return (
            <li key={c.id}>
              <Link to={`/competencia/${c.id}`} className="torneo">
                <span className={`torneo-icono ${c.formato}`} aria-hidden="true">
                  <Trophy size={20} />
                </span>
                <span className="torneo-texto">
                  <strong>{c.nombre}</strong>
                  <span>
                    {capital(c.categoria)}, {c.formato === 'liga' ? `liga de ${c.parejas.length} parejas` : `torneo de ${c.parejas.length} parejas`}
                  </span>
                  <span className={est.terminada ? 'torneo-fin' : 'torneo-proximo'}>{est.texto}</span>
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="tenue">¿Querés anotarte en la próxima? Escribinos por <a href={whatsapp}>WhatsApp</a>.</p>
    </section>
  )
}

function Club() {
  const [enviado, setEnviado] = useState(false)
  const [d, setD] = useState({ nombre: '', telefono: '', dow: 2, inicio: 1200 })
  return (
    <section id="club" className="club">
      <div className="seccion-cabeza">
        <h2>El club</h2>
        <p>
          {negocio.direccion}, {negocio.barrio}, {negocio.ciudad}. Todos los días de 8:00 a 00:30, con vestuarios, cantina y estacionamiento.
        </p>
      </div>

      <div className="club-grilla">
        <article className="club-bloque">
          <h3>Precios</h3>
          <table className="precios">
            <tbody>
              <tr><th scope="row">Cancha antes de las 17</th><td>{pesos(negocio.precios.valle)}</td></tr>
              <tr><th scope="row">Desde las 17 y fines de semana</th><td>{pesos(negocio.precios.pico)}</td></tr>
              <tr><th scope="row">Seña online</th><td>{pesos(negocio.seña)}</td></tr>
              <tr><th scope="row">Alquiler de paleta</th><td>{pesos(3000)}</td></tr>
            </tbody>
          </table>
          <p className="tenue chico">Precio por cancha, 90 minutos, para los cuatro.</p>
        </article>

        <article className="club-bloque">
          <h3>Clases y actividades</h3>
          <ul className="actividades">
            {negocio.actividades.map((a) => (
              <li key={a.titulo}>
                <p>
                  <strong>{a.titulo}</strong>
                  <span>{pesos(a.precio)} {a.unidad}</span>
                </p>
                <p className="tenue">{a.cuando}. {a.texto}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="club-bloque club-foto">
          <img src="img/cancha-noche.jpg" alt="Cancha de pádel techada con luces encendidas" width={1600} height={1067} loading="lazy" />
        </article>

        <article className="club-bloque">
          <h3>Turno fijo</h3>
          <p className="tenue">El mismo día y hora todas las semanas, sin volver a reservar.</p>
          {enviado ? (
            <p className="pago-ok">
              Listo, {d.nombre.split(' ')[0]}. Pediste los {diasSemana[d.dow]} a las {hora(d.inicio)}. Te escribimos para confirmarlo.{' '}
              <Link to="/admin/fijos">Así le llega al club</Link>
            </p>
          ) : (
            <form className="form" onSubmit={(ev) => { ev.preventDefault(); pedirFijo(d); setEnviado(true) }}>
              <label>Nombre y apellido<input required name="nombre" autoComplete="name" value={d.nombre} onChange={(ev) => setD({ ...d, nombre: ev.target.value })} /></label>
              <label>WhatsApp<input required name="telefono" type="tel" autoComplete="tel" inputMode="tel" value={d.telefono} onChange={(ev) => setD({ ...d, telefono: ev.target.value })} /></label>
              <div className="form-fila">
                <label>
                  Día
                  <select value={d.dow} onChange={(ev) => setD({ ...d, dow: Number(ev.target.value) })}>
                    {[1, 2, 3, 4, 5, 6, 0].map((x) => <option key={x} value={x}>{capital(diasSemana[x])}</option>)}
                  </select>
                </label>
                <label>
                  Hora
                  <select value={d.inicio} onChange={(ev) => setD({ ...d, inicio: Number(ev.target.value) })}>
                    {negocio.turnos.map((t) => <option key={t} value={t}>{hora(t)}</option>)}
                  </select>
                </label>
              </div>
              <button className="btn btn-secundario">Pedir turno fijo</button>
            </form>
          )}
        </article>
      </div>
    </section>
  )
}

function Pie() {
  return (
    <footer className="pie">
      <div className="pie-cuerpo">
        <Marca />
        <p>
          {negocio.direccion}, {negocio.barrio}, {negocio.ciudad}
        </p>
        <p>
          <a href={whatsapp}>WhatsApp {negocio.whatsapp}</a>
          {'  '}
          <a href={`https://instagram.com/${negocio.instagram}`}>Instagram</a>
          {'  '}
          <Link to="/admin">Panel del club</Link>
        </p>
        <p className="creditos">
          Fotos de Wikimedia Commons: <a href="https://commons.wikimedia.org/wiki/File:Padel_en_el_Cos_Sports_Plaza.jpg">Virpana</a> (CC0),{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Padel_court_Nsambya.jpg">Samson Ssemakadde</a> (CC0).
        </p>
      </div>
    </footer>
  )
}

export default function Sitio() {
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)
  useEffect(() => {
    document.title = `${negocio.nombre}, reservá cancha en ${negocio.barrio}`
  }, [])
  return (
    <div className="sitio">
      <BarraDemo />
      <Cabecera />
      <header className="portada">
        <img src="img/cancha-vidrio.jpg" alt="Cancha de pádel de blindex con césped azul" width={1600} height={1060} fetchPriority="high" />
        <div className="portada-texto">
          <h1>{negocio.nombre}</h1>
          <p>
            Cuatro canchas en {negocio.barrio}, {negocio.ciudad}. Reservás online y señás con Mercado Pago.
          </p>
        </div>
      </header>
      <main>
        <Reservar elegir={setEleccion} />
        <Torneos />
        <Club />
      </main>
      <Pie />
      <FormReserva eleccion={eleccion} cerrar={() => setEleccion(null)} />
    </div>
  )
}

/** Página pública de una liga o torneo: es el link que se manda por WhatsApp. */
export function CompetenciaPublica() {
  const { id } = useParams()
  const e = useDatos()
  const c = e.competencias.find((x) => x.id === id)
  const resumen = useMemo(() => (c ? estadoCompetencia(c) : null), [c])
  useEffect(() => {
    if (c) document.title = `${c.nombre}, ${c.categoria} · ${negocio.nombre}`
    window.scrollTo(0, 0)
  }, [c])
  return (
    <div className="sitio">
      <BarraDemo />
      <header className="cabecera">
        <Link to="/" className="volver" aria-label="Volver al club">
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <Marca />
      </header>
      <main className="competencia-pagina">
        {!c ? (
          <p className="vacio">No encontramos esa competencia. <Link to="/">Volver al club</Link></p>
        ) : (
          <>
            <div className="seccion-cabeza">
              <h1>{c.nombre}</h1>
              <p>
                {capital(c.categoria)}, {c.parejas.length} parejas. {resumen && !resumen.terminada ? resumen.texto : ''}
              </p>
            </div>
            <VistaCompetencia key={c.id} c={c} />
          </>
        )}
      </main>
    </div>
  )
}
