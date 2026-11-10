# working-simulator

Página web estática que, vista de pasada, parece VS Code o IntelliJ en uso: escribe código, ejecuta consultas, revisa contenedores y corre comandos en la terminal. Pensada para dejarla en un monitor mientras lees o investigas en otro lado.

Todo el contenido es genérico (utils, DTOs, interfaces, helpers, consultas a catálogos de la base, logs técnicos). No muestra dashboards, CRUDs ni pantallas de negocio.

## Por qué existe

Doy mis estimaciones y cumplo mis tareas, y muchas veces termino antes. Ese tiempo que sobra lo uso para leer, investigar y probar herramientas nuevas, que al final también es parte de ser mejor desarrollador.

El problema: para mi jefe eso se ve mal. Él quiere verme siempre escribiendo código, y lo entiendo, pero si el trabajo comprometido ya está hecho, no debería importar qué hago con el tiempo restante. Cuando pasa por mi lugar y ve un artículo o la documentación de una herramienta, parece que no estoy trabajando.

Así que hice esta página: la dejo corriendo en un monitor mientras leo en el otro o en el celular, y desde lejos se ve lo que él espera ver: código, consultas, contenedores y la consola en movimiento.

Si tienes el mismo problema, es para ti también.

## Uso

1. Abre la página y ponla en pantalla completa (`F11` o el botón del dock).
2. Lleva el mouse al borde inferior para mostrar el dock, o usa `Ctrl+Shift+.`.
3. Elige:
   - **Editor**: VS Code o IntelliJ.
   - **Escena**: Escribiendo código, Consultas, Contenedores o Consola.
   - **Cambiar escena cada**: 5, 10 (por defecto), 15, 30, 60 min o No rotar.
4. El dock se oculta solo. Tus preferencias se guardan en el navegador (`localStorage`).

El puntero que se mueve es dibujado por la página: un navegador no puede mover el mouse real, así que el real se oculta mientras el dock está cerrado.

## Correr en local

Usa módulos ES, así que necesita un servidor estático (abrir el `index.html` con doble clic no funciona):

```bash
npx serve .
# o
python -m http.server 8000
```

## Publicar en GitHub Pages

1. Sube el repo a GitHub.
2. *Settings → Pages → Build and deployment → Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. No hay nada que compilar: se publica tal cual.

## Pruebas

Lógica pura (generadores, tokenizador, tecleo, puntero, preferencias, rotación, scheduler, wake lock) con el test runner de Node, sin dependencias. Requiere Node 22 o superior:

```bash
node --test "tests/*.test.js"
```

Para ver horas de comportamiento en minutos: `?speed=10` acelera todos los tiempos. `?scene=query` arranca en una escena concreta.

## Limitaciones

- Si la política de tu empresa bloquea la PC por inactividad, la página no lo puede evitar. Pide al navegador que no apague la pantalla (Screen Wake Lock), y el dock indica si está activo: "Pantalla protegida" o "Pantalla puede apagarse".
- Aguanta un vistazo de lejos, no una revisión de cerca.
- No guarda ni envía datos a ningún lado.
