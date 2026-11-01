import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import { BarChart3, CalendarRange, Globe, Menu, Repeat, RotateCcw, Wallet } from 'lucide-react'
import { negocio } from '../config/negocio'
import { ahoraMin, capital, fechaCorta, fechaLarga, hora, hoyClave, pesos, sumarDias } from '../lib/formato'
import { actualizarReserva, estados, metodos, reiniciar, useDatos, vender, type Metodo } from '../lib/datos'
import { Dialogo } from '../lib/ui'

type Ctx = { verReserva: (id: string) => void }
export const usePanel = () => useOutletContext<Ctx>()

const menu = [
  { a: '/admin', texto: 'Canchas del día', icono: CalendarRange, fin: true },
  { a: '/admin/fijos', texto: 'Turnos fijos', icono: Repeat },
  { a: '/admin/caja', texto: 'Caja y cantina', icono: Wallet },
  { a: '/admin/reportes', texto: 'Reportes', icono: BarChart3 },
]

export function Layout() {
  const e = useDatos()
  const [abierto, setAbierto] = useState(false)
  const [reserva, setReserva] = useState<string | null>(null)
  const lugar = useLocation()
  useEffect(() => {
    document.title = `Panel · ${negocio.nombre}`
    setAbierto(false)
  }, [lugar.pathname])
  const ctx = useMemo<Ctx>(() => ({ verReserva: setReserva }), [])
  return (
    <div className="admin">
      <aside className={`lateral ${abierto ? 'lateral-abierta' : ''}`}>
        <div className="producto">
          <span className="producto-marca producto-marca-pelota" aria-hidden="true">3M</span>
          <span>
            <strong>{negocio.nombre}</strong>
            <small>{negocio.barrio}</small>
          </span>
        </div>
        <nav className="menu">
          {menu.map(({ a, texto, icono: I, fin }) => (
            <NavLink key={a} to={a} end={fin}>
              <I size={17} strokeWidth={1.8} aria-hidden="true" />
              {texto}
              {a === '/admin/fijos' && e.solicitudes.length > 0 && <span className="insignia">{e.solicitudes.length}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="lateral-pie">
          <NavLink to="/" className="menu-secundario"><Globe size={16} strokeWidth={1.8} aria-hidden="true" /> Ver la web de reservas</NavLink>
          <button className="menu-secundario" onClick={reiniciar}><RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" /> Reiniciar demo</button>
          <p className="hecho-con">Hecho con Turnero · demo</p>
        </div>
      </aside>
      <header className="superior">
        <button className="btn-icono solo-telefono" onClick={() => setAbierto(!abierto)} aria-label="Menú"><Menu size={20} /></button>
        <p className="superior-texto">{capital(fechaLarga(hoyClave()))} · abierto de 8:00 a 00:30</p>
        <Link to="/" className="boton boton-chico">Reservar como cliente</Link>
      </header>
      <main className="hoja-admin">
        <Outlet context={ctx} />
      </main>
      <DetalleReserva id={reserva} cerrar={() => setReserva(null)} />
    </div>
  )
}

function DetalleReserva({ id, cerrar }: { id: string | null; cerrar: () => void }) {
  const e = useDatos()
  const r = e.reservas.find((x) => x.id === id)
  const [metodo, setMetodo] = useState<Metodo>('efectivo')
  if (!r) return <Dialogo abierto={false} cerrar={cerrar} titulo="">{null}</Dialogo>
  const cancha = negocio.canchas.find((c) => c.id === r.canchaId)!
  const fijo = e.fijos.find((f) => f.id === r.fijoId)
  const msj = encodeURIComponent(`Hola ${r.titular.split(' ')[0]}! Te esperamos ${fechaCorta(r.dia)} a las ${hora(r.inicio)} en la ${cancha.nombre} de ${negocio.nombre}.`)
  return (
    <Dialogo abierto cerrar={cerrar} titulo={`${cancha.nombre} · ${hora(r.inicio)}`}>
      <dl className="ficha">
        <div><dt>Titular</dt><dd>{r.titular}</dd></div>
        <div><dt>WhatsApp</dt><dd>{r.telefono}</dd></div>
        <div><dt>Día</dt><dd>{capital(fechaLarga(r.dia))}</dd></div>
        <div><dt>Reservó por</dt><dd>{r.origen === 'fijo' ? `Turno fijo desde ${fechaCorta(fijo?.desde ?? r.dia)}` : r.origen === 'web' ? 'Web' : 'WhatsApp'}</dd></div>
        <div><dt>Estado</dt><dd><span className={`estado estado-${r.estado}`}>{estados[r.estado]}</span></dd></div>
        <div><dt>Precio</dt><dd>{pesos(r.precio)}</dd></div>
        <div><dt>Seña</dt><dd>{r.seña ? pesos(r.seña) : '—'}</dd></div>
        <div className="ficha-total"><dt>Saldo</dt><dd>{r.estado === 'pagada' ? 'Pagado' : pesos(r.precio - r.seña)}</dd></div>
      </dl>
      {(r.estado === 'señada' || r.estado === 'pendiente') && (
        <div className="cobro">
          <label className="campo">
            Cobrar saldo con
            <select value={metodo} onChange={(ev) => setMetodo(ev.target.value as Metodo)}>
              {Object.entries(metodos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <button className="boton boton-primario" onClick={() => { actualizarReserva(r.id, { estado: 'pagada', metodo }); cerrar() }}>
            Cobrar {pesos(r.precio - r.seña)}
          </button>
        </div>
      )}
      <div className="acciones-fila">
        <a className="boton" href={`https://wa.me/54${r.telefono.replace(/\D/g, '')}?text=${msj}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
        {r.estado === 'pendiente' && <button className="boton" onClick={() => actualizarReserva(r.id, { estado: 'señada', seña: negocio.seña })}>Marcar seña recibida</button>}
        {r.estado !== 'cancelada' && r.estado !== 'pagada' && <button className="boton boton-peligro" onClick={() => { actualizarReserva(r.id, { estado: 'cancelada' }); cerrar() }}>Cancelar y liberar</button>}
      </div>
    </Dialogo>
  )
}

// ——— Canchas del día ———

export function Canchas() {
  const e = useDatos()
  const { verReserva } = usePanel()
  const [q, setQ] = useSearchParams()
  const hoy = hoyClave()
  const dia = q.get('dia') ?? hoy
  const ahora = ahoraMin()

  const d = useMemo(() => {
    const delDia = e.reservas.filter((r) => r.dia === dia && r.estado !== 'cancelada')
    const total = negocio.canchas.length * negocio.turnos.length
    const cobrado =
      e.reservas.filter((r) => r.dia === dia && r.estado === 'pagada').reduce((s, r) => s + r.precio - r.seña, 0) +
      e.reservas.filter((r) => r.dia === dia && r.estado !== 'cancelada').reduce((s, r) => s + r.seña, 0) +
      e.ventas.filter((v) => v.dia === dia).reduce((s, v) => s + v.monto, 0)
    const sinSeña = e.reservas.filter((r) => r.estado === 'pendiente' && r.dia >= hoy).sort((a, b) => (a.dia + a.inicio).localeCompare(b.dia + b.inicio))
    const libresPico = negocio.canchas.length * negocio.turnos.filter((t) => t >= negocio.pico).length - delDia.filter((r) => r.inicio >= negocio.pico).length
    return { delDia, ocupacion: delDia.length / total, cobrado, sinSeña, libresPico, aCobrar: delDia.filter((r) => r.estado !== 'pagada').reduce((s, r) => s + r.precio - r.seña, 0) }
  }, [e, dia, hoy])

  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 1))

  return (
    <div className="pantalla">
      <div className="titulo-fila">
        <div>
          <h1>Canchas del día</h1>
          <p>{capital(fechaLarga(dia))} · {d.delDia.length} reservas de {negocio.canchas.length * negocio.turnos.length} turnos</p>
        </div>
        <div className="segmentos">
          {semana.map((x) => (
            <button key={x} className={x === dia ? 'activa' : ''} onClick={() => setQ({ dia: x })}>
              {x === hoy ? 'Hoy' : capital(fechaCorta(x))}
            </button>
          ))}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><span>Ocupación</span><strong>{Math.round(d.ocupacion * 100)}%</strong><small>{d.libresPico} turnos libres en horario pico</small></div>
        <div className="kpi"><span>Cobrado</span><strong>{pesos(d.cobrado)}</strong><small>señas, saldos y cantina del día</small></div>
        <div className="kpi"><span>Por cobrar</span><strong>{pesos(d.aCobrar)}</strong><small>saldos de las reservas del día</small></div>
        <div className="kpi"><span>Sin seña</span><strong className={d.sinSeña.length ? 'mal' : ''}>{d.sinSeña.length}</strong><small>reservas de hoy en adelante</small></div>
      </div>

      <div className="grilla-rail">
        <section className="tarjeta">
          <div className="tarjeta-cabeza">
            <h2>Grilla</h2>
            <Link className="enlace-chico" to="/">Las canchas libres se ven en la web</Link>
          </div>
          <div className="grilla-canchas" style={{ ['--turnos' as string]: negocio.turnos.length }}>
            <span />
            {negocio.turnos.map((t) => <span key={t} className="grilla-hora">{hora(t)}</span>)}
            {negocio.canchas.map((c) => (
              <div className="grilla-fila" key={c.id}>
                <span className="grilla-cancha">{c.nombre}<small>{c.techada ? 'Techada' : 'Aire libre'}</small></span>
                {negocio.turnos.map((t) => {
                  const r = d.delDia.find((x) => x.canchaId === c.id && x.inicio === t)
                  const enCurso = dia === hoy && t <= ahora && ahora < t + negocio.duracion
                  if (!r) return <span key={t} className={`celda-libre ${enCurso ? 'en-curso' : ''}`}>{dia === hoy && t + negocio.duracion <= ahora ? '' : 'Libre'}</span>
                  return (
                    <button key={t} className={`celda-reserva celda-${r.estado} ${r.origen === 'fijo' ? 'celda-fijo' : ''} ${enCurso ? 'en-curso' : ''}`} onClick={() => verReserva(r.id)} title={`${r.titular} · ${estados[r.estado]}`}>
                      <strong>{r.titular.split(' ')[0]} {r.titular.split(' ')[1]?.[0]}.</strong>
                      <span>{r.origen === 'fijo' ? 'Fijo' : estados[r.estado]}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <ul className="leyenda">
            <li><span className="muestra muestra-señada" /> Señada</li>
            <li><span className="muestra muestra-pendiente" /> Falta la seña</li>
            <li><span className="muestra muestra-pagada" /> Pagada</li>
            <li><span className="muestra muestra-fijo" /> Turno fijo</li>
          </ul>
        </section>

        <aside className="rail">
          <h2 className="rail-titulo">Falta la seña</h2>
          <div className="tarjeta tarjeta-lista">
            {d.sinSeña.length === 0 && <p className="vacio">Todas las reservas están señadas.</p>}
            <ul className="lista">
              {d.sinSeña.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <button onClick={() => verReserva(r.id)}>
                    <span className="lista-hora">{hora(r.inicio)}</span>
                    <span className="lista-texto">{r.titular}<small>{capital(fechaCorta(r.dia))} · {negocio.canchas.find((c) => c.id === r.canchaId)!.nombre}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <h2 className="rail-titulo">Cantina rápida</h2>
          <div className="tarjeta cantina">
            {negocio.cantina.map((it) => (
              <button key={it.id} className="boton boton-chico" onClick={() => vender({ dia: hoy, hora: ahoraMin(), itemId: it.id, monto: it.precio, metodo: 'efectivo' })}>
                {it.nombre} <span className="tenue">{pesos(it.precio)}</span>
              </button>
            ))}
            <p className="ayuda">Cada toque suma una venta en efectivo a la caja de hoy.</p>
          </div>
          {e.solicitudes.length > 0 && (
            <>
              <h2 className="rail-titulo">Piden turno fijo</h2>
              <div className="tarjeta">
                <p className="vacio">{e.solicitudes.length} {e.solicitudes.length === 1 ? 'persona pidió' : 'personas pidieron'} un turno fijo desde la web.</p>
                <Link to="/admin/fijos" className="boton boton-chico boton-ancho">Revisar pedidos</Link>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
