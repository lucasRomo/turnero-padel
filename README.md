# Turnero · demo para complejos de pádel

Demo visual de un sistema de reservas de canchas. **Tres Muros Pádel** es un club inventado para la demo.
Es todo frontend: los datos de prueba se generan solos y se guardan en el navegador.

- **Web pública** (`#/`): un tablero tipo aeropuerto con las canchas libres en vivo, reserva con seña simulada de
  Mercado Pago, actividades, tarifas y pedido de turno fijo.
- **Panel del club** (`#/admin`): grilla de canchas del día, señas pendientes, turnos fijos y pedidos desde la web,
  caja y cantina, reportes con mapa de calor de ocupación.

Lo que se reserva en la web aparece en el panel. **Reiniciar demo** vuelve todo a cero.

## Correrlo

```bash
npm install
npm run dev
```

## Publicarlo en GitHub Pages

Subir a la rama `main` de un repo y activar **Settings → Pages → Source: GitHub Actions**.
El workflow `.github/workflows/deploy.yml` publica solo en cada push.

## Adaptarlo a un club real

Todo está en [`src/config/negocio.ts`](src/config/negocio.ts): nombre, dirección, canchas, horarios de turnos,
tarifas valle y pico, seña, cantina y actividades. Las fotos van en `public/img/` (hoy son fotos libres de
Wikimedia Commons con sus créditos en el pie, no son de ningún club en particular).
