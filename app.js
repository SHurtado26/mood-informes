"use strict";
(() => {
  // ───────── Utilidades
  const NS = "http://www.w3.org/2000/svg";
  const armar = (e, props, hijos) => {
    for (const [k, v] of Object.entries(props || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "text") e.textContent = v;
      else if (k === "estilo") for (const [a, b] of Object.entries(v)) e.style.setProperty(a, b);
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const h of hijos.flat(Infinity)) if (h !== null && h !== undefined && h !== false) e.append(h.nodeType ? h : document.createTextNode(String(h)));
    return e;
  };
  const el = (t, p, ...h) => armar(document.createElement(t), p, h);
  const sv = (t, p, ...h) => armar(document.createElementNS(NS, t), p, h);
  const $ = (id) => document.getElementById(id);
  const nf = new Intl.NumberFormat("es-CO");
  const num = (n) => (n === null || n === undefined ? "Sin dato" : nf.format(Math.round(n)));
  const dec = (n, d = 1) => (n === null || n === undefined ? "Sin dato" : n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }));
  const pct = (n, d = 1) => (n === null || n === undefined ? "Sin dato" : `${dec(n, d)} %`);
  const signo = (n) => (n > 0 ? `+${num(n)}` : num(n));
  const suma = (xs) => xs.reduce((t, x) => t + x, 0);
  const hay = (xs) => xs.filter((x) => x !== null && x !== undefined);
  const prom = (xs) => (xs.length ? suma(xs) / xs.length : null);
  const mediana = (xs) => {
    const v = hay(xs).sort((a, b) => a - b);
    if (!v.length) return null;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  };
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const MESL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const SEM = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const utc = (s) => new Date(`${s}T00:00:00Z`);
  const mas = (s, n) => { const d = utc(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const corta = (s) => `${utc(s).getUTCDate()} ${MES[utc(s).getUTCMonth()]}`;
  const larga = (s) => `${utc(s).getUTCDate()} de ${MESL[utc(s).getUTCMonth()]}`;
  const conDia = (s) => `${SEM[utc(s).getUTCDay()]} ${larga(s)}`;
  const mayus = (s) => s[0].toUpperCase() + s.slice(1);
  const rango = (a, b) => (a === b ? larga(a) : a.slice(0, 7) === b.slice(0, 7) ? `${utc(a).getUTCDate()} al ${larga(b)}` : `${larga(a)} al ${larga(b)}`);
  const logo = (cual, clase) => {
    const l = window.MOOD_LOGO[cual];
    return sv("svg", { viewBox: l.caja, class: clase, role: clase ? null : "img", "aria-label": clase ? null : "Mood", "aria-hidden": clase ? "true" : null }, sv("path", { d: l.d, "fill-rule": "nonzero" }));
  };
  const TIPO = { reel: "Reel", carrusel: "Carrusel", imagen: "Imagen" };

  // ───────── Ayuda al pasar el cursor
  const tip = $("tip");
  const mostrarTip = (titulo, filas, x, y) => {
    tip.replaceChildren(el("div", { text: titulo }), ...filas.map(([v, n]) => el("div", {}, el("b", { text: v }), ` ${n}`)));
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(8, x + 14), innerWidth - r.width - 8)}px`;
    tip.style.top = `${y + 18 + r.height > innerHeight ? Math.max(8, y - r.height - 12) : y + 18}px`;
  };
  const ocultarTip = () => { tip.hidden = true; };
  const ayuda = (nodo, titulo, filas) => {
    const datos = () => (typeof filas === "function" ? filas() : filas);
    nodo.addEventListener("pointermove", (e) => mostrarTip(titulo, datos(), e.clientX, e.clientY));
    nodo.addEventListener("pointerleave", ocultarTip);
    nodo.addEventListener("focus", () => { if (!nodo.matches(":focus-visible")) return; const r = nodo.getBoundingClientRect(); mostrarTip(titulo, datos(), r.left + r.width / 2, r.top); });
    nodo.addEventListener("blur", ocultarTip);
    return nodo;
  };
  // Dibuja al montar (sin parpadeo) y otra vez si cambia el ancho.
  const porMontar = [];
  const alAncho = (caja, dibujar) => {
    let w = 0;
    const medir = () => { const n = Math.floor(caja.clientWidth); if (n && n !== w) { w = n; dibujar(n); } };
    porMontar.push(medir);
    new ResizeObserver(medir).observe(caja);
  };
  const escala = (max) => {
    const b = Math.max(1, max), p = 10 ** Math.floor(Math.log10(b));
    const paso = [0.2, 0.5, 1, 2, 5, 10].map((k) => k * p).find((q) => b / q <= 4);
    return { paso, tope: Math.ceil(b / paso) * paso };
  };

  // ───────── Moods: cada cifra usa una combinación del sistema de color de la marca
  const MOODS = {
    vistas: { nombre: "Vistas", fondo: "#024159", letra: "#F8F6F0", acento: "#F36363", que: "Veces que se mostró contenido de la cuenta: reels, publicaciones, historias y perfil, con y sin pauta.", unidad: "vistas" },
    alcance: { nombre: "Personas alcanzadas al día", fondo: "#B7ADD9", letra: "#5c0133", acento: "#730240", que: "Personas distintas que vieron contenido de la cuenta cada día. Una persona puede repetirse entre días, por eso se muestra el promedio y no la suma.", unidad: "personas" },
    interacciones: { nombre: "Interacciones", fondo: "#730240", letra: "#F8F6F0", acento: "#B7ADD9", que: "Me gusta, comentarios, guardados y compartidos de las piezas, según el día en que se publicó cada una. Las más nuevas todavía pueden sumar.", unidad: "interacciones" },
    cuentas: { nombre: "Cuentas que interactúan al día", fondo: "#F79292", letra: "#02364a", acento: "#024159", que: "Cuentas distintas que interactuaron con el contenido cada día. Se muestra el promedio.", unidad: "cuentas" },
    seguidores: { nombre: "Seguidores: ganados menos perdidos", fondo: "#A6BBCE", letra: "#02364a", acento: "#024159", que: "Seguidores ganados menos los perdidos cada día.", unidad: "seguidores" },
  };
  const PARTES = [["likes", "Me gusta", "#2c7fb0"], ["comentarios", "Comentarios", "#e8574f"], ["guardados", "Guardados", "#7d6bbf"], ["compartidos", "Compartidos", "#a3306f"]];
  const MEDIDAS = { vistas: "Vistas", alcance: "Alcance", interacciones: "Interacciones", tasa: "Tasa de interacción", compartidos: "Compartidos", guardados: "Guardados", comentarios: "Comentarios" };
  const fmt = (m, v) => (m === "tasa" || m === "ver3" ? pct(v) : m === "segundos" ? `${dec(v)} s` : num(v));
  const estiloMood = (m) => ({ "--fondo": MOODS[m].fondo, "--letra": MOODS[m].letra, "--marca-c": MOODS[m].acento });

  let I, E;

  // ───────── Lectura de datos
  const diasConDato = () => I.diario.filter((d) => d.dia >= I.desde && d.vistas !== null).map((d) => d.dia);
  const tramo = (a, b) => I.diario.filter((d) => d.dia >= a && d.dia <= b);
  const previo = () => {
    const n = tramo(E.desde, E.hasta).length;
    return [mas(E.desde, -n), mas(E.desde, -1)];
  };
  const piezasEn = (a, b) => I.piezas.filter((p) => p.dia >= a && p.dia <= b);
  const valorDia = (m, d) => {
    if (m === "interacciones") return suma(I.piezas.filter((p) => p.dia === d.dia).map((p) => p.interacciones));
    if (m === "seguidores") return d.ganados === null || d.perdidos === null ? null : d.ganados - d.perdidos;
    return d[m];
  };
  const agregado = (m, a, b) => {
    const vs = hay(tramo(a, b).map((d) => valorDia(m, d)));
    if (!vs.length) return { valor: null, diario: null, n: 0 };
    return { valor: m === "alcance" || m === "cuentas" ? prom(vs) : suma(vs), diario: prom(vs), n: vs.length };
  };
  const enRango = () => piezasEn(E.desde, E.hasta);
  const filtradas = () => enRango().filter((p) => E.formato === "todos" || p.tipo === E.formato);

  // ───────── Intro y filtros
  function intro() {
    const ds = diasConDato();
    const falta = I.hasta > ds.at(-1);
    return el("section", { class: "intro" }, el("div", {},
      el("h1", { text: "Así estuvo el mood en Instagram" }),
      el("p", { text: `${I.titulo}: del ${rango(I.desde, I.hasta)} de ${I.hasta.slice(0, 4)}.${falta ? ` Los datos diarios llegan hasta el ${larga(ds.at(-1))}, el último día completo que entregó Metricool.` : ""}` }),
      subnav("resumen", [["cifras", "Las cifras"], ["hallazgos", "Lo que más dice"]])),
      el("div", { class: "escena" }, nube("¡Analicemos", "los números!"),
        el("img", { class: "muneco", src: "img/muneco.webp", width: 441, height: 753, alt: "El muñeco de Mood: un helado con gafas que camina" })));
  }
  function nube(...lineas) {
    const bolas = [[58, 56, 40, 34], [100, 38, 46, 32], [148, 52, 42, 34], [118, 72, 56, 30], [66, 76, 38, 24]];
    const chicas = [[152, 106, 10, 8], [170, 122, 6, 5]];
    const forma = (xs, extra) => xs.map(([cx, cy, rx, ry]) => sv("ellipse", { cx, cy, rx, ry, ...extra }));
    const borde = { fill: "#F8F6F0", stroke: "#024159", "stroke-width": 6 };
    return sv("svg", { class: "nube", viewBox: "10 0 188 132", role: "img", "aria-label": lineas.join(" ") },
      forma(bolas, borde), forma(bolas, { fill: "#F8F6F0" }), forma(chicas, { ...borde, "stroke-width": 3 }),
      lineas.map((t, i) => sv("text", { x: 104, y: 55 + i * 22, "text-anchor": "middle" }, t)));
  }
  const subnav = (donde, ops) => el("div", { class: "seg", role: "group", "aria-label": "Parte de esta sección" }, ops.map(([k, t]) =>
    el("button", { type: "button", "data-foco": `sub-${k}`, "aria-pressed": String(E.sub[donde] === k), onclick: () => { E.sub[donde] = k; refrescar(); }, text: t })));
  function filtros(conComparar) {
    const ds = diasConDato();
    const op = (v) => ds.map((d) => el("option", { value: d, selected: d === v, text: mayus(`${SEM[utc(d).getUTCDay()].slice(0, 3)} ${corta(d)}`) }));
    const todo = E.desde === ds[0] && E.hasta === ds.at(-1);
    return el("div", { class: "filtros", role: "group", "aria-label": "Fechas del informe" },
      el("label", {}, "Desde", el("select", { onchange: (e) => { E.desde = e.target.value; if (E.hasta < E.desde) E.hasta = E.desde; refrescar(); } }, op(E.desde))),
      el("label", {}, "Hasta", el("select", { onchange: (e) => { E.hasta = e.target.value; if (E.hasta < E.desde) E.desde = E.hasta; refrescar(); } }, op(E.hasta))),
      el("button", { class: "boton", type: "button", "aria-pressed": String(todo), onclick: () => { E.desde = ds[0]; E.hasta = ds.at(-1); refrescar(); }, text: "Todo el periodo" }),
      conComparar && el("button", { class: "boton", type: "button", "data-foco": "comparar", "aria-pressed": String(E.comparar), onclick: () => { E.comparar = !E.comparar; refrescar(); }, text: "Comparar con antes" }));
  }

  // ───────── Cifras y panel principal
  function cifras() {
    const [pa, pb] = previo();
    return el("div", { class: "cifras", role: "tablist", "aria-label": "Elige la cifra que quieres ver" },
      Object.entries(MOODS).map(([m, c]) => {
        const a = agregado(m, E.desde, E.hasta), b = agregado(m, pa, pb);
        let delta = "Toca para ver el detalle";
        if (E.comparar && a.valor !== null && b.valor !== null) {
          if (m === "seguidores") delta = `Antes: ${signo(b.valor)}${b.n !== a.n ? ` en ${b.n} días` : ""}`;
          else {
            const x = b.diario ? (100 * (a.diario - b.diario)) / b.diario : null;
            delta = x === null ? "Sin comparación" : `${x > 0 ? "▲" : x < 0 ? "▼" : "="} ${dec(Math.abs(x), 0)} % frente a ${num(b.valor)}`;
          }
        } else if (E.comparar) delta = "Sin comparación";
        const extra = m === "seguidores" && a.n && a.n < tramo(E.desde, E.hasta).length ? ` (${a.n} días con dato)` : "";
        return el("button", { type: "button", role: "tab", class: "cifra", "data-foco": `m-${m}`, "aria-selected": String(E.mood === m), estilo: estiloMood(m), onclick: () => { E.mood = m; refrescar(); } },
          el("span", { class: "rot", text: c.nombre }),
          el("span", { class: "val", text: m === "seguidores" && a.valor !== null ? signo(a.valor) : num(a.valor) }),
          el("span", { class: "delta", text: delta + extra }));
      }));
  }
  function panelMood() {
    const m = E.mood, c = MOODS[m], ds = tramo(E.desde, E.hasta);
    if (!E.dia || E.dia < E.desde || E.dia > E.hasta) {
      const con = ds.filter((d) => valorDia(m, d) !== null);
      E.dia = (con.length ? con.reduce((x, y) => (valorDia(m, y) > valorDia(m, x) ? y : x)) : ds[0]).dia;
    }
    const caja = el("div");
    const n = ds.length;
    const antes = ds.map((d) => { const q = I.diario.find((x) => x.dia === mas(d.dia, -n)); return q ? valorDia(m, q) : null; });
    alAncho(caja, (W) => columnasDia(caja, W, m, c, ds, antes));
    return el("section", { class: "mood", "aria-label": c.nombre, estilo: estiloMood(m) },
      logo("iso", "agua"),
      el("div", { class: "mood-int" },
        el("div", {},
          el("h2", { text: c.nombre }), el("p", { class: "que", text: c.que }),
          el("div", { estilo: { "margin-top": "18px" } }, caja),
          el("div", { class: "clave" },
            m === "seguidores" ? [["Ganados", c.acento], ["Perdidos", "transparent"]].map(([t, f]) => el("span", {}, el("i", { estilo: { background: f, border: `2px solid ${c.acento}` } }), t)) : el("span", {}, el("i", { estilo: { background: c.acento } }), rango(E.desde, E.hasta)),
            el("span", { text: "Toca un día para abrirlo" }))),
        panelDia()));
  }
  function columnasDia(caja, W, m, c, ds, antes) {
    const n = ds.length, H = 340, mg = { l: 4, r: 4, t: 108, b: m === "seguidores" ? 64 : 42 };
    const seg = m === "seguidores";
    const arriba = seg ? ds.map((d) => d.ganados) : ds.map((d) => valorDia(m, d));
    const abajo = seg ? ds.map((d) => d.perdidos) : [];
    const ant = E.comparar ? antes : antes.map(() => null);
    const max = Math.max(1, ...hay(arriba)), min = Math.min(0, ...hay(abajo).map((v) => -v));
    const y = (v) => mg.t + ((H - mg.t - mg.b) * (max - v)) / (max - min);
    const banda = (W - mg.l - mg.r) / n, an = Math.min(64, banda * 0.66);
    const g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, height: H, role: "group", "aria-label": `${c.nombre} por día` });
    const cab = banda >= 52;
    let parada = null;
    ds.forEach((d, i) => {
      const cx = mg.l + banda * (i + 0.5), x0 = cx - an / 2, sel = d.dia === E.dia;
      const grupo = sv("g", { class: "col", tabindex: 0, role: "button", "data-foco": `d-${d.dia}`, "aria-pressed": String(sel), "aria-label": `${conDia(d.dia)}: ${seg ? `${num(d.ganados)} ganados y ${num(d.perdidos)} perdidos` : num(arriba[i])}` });
      const barra = (v, alto0, relleno) => {
        if (v === null) return;
        const a = y(Math.max(v, alto0)), b = y(Math.min(v, alto0)), h = Math.max(2, b - a), r = Math.min(6, h / 2, an / 2);
        const dd = v >= 0 ? `M${x0} ${b}V${a + r}Q${x0} ${a} ${x0 + r} ${a}H${x0 + an - r}Q${x0 + an} ${a} ${x0 + an} ${a + r}V${b}Z` : `M${x0} ${a}V${a + h - r}Q${x0} ${a + h} ${x0 + r} ${a + h}H${x0 + an - r}Q${x0 + an} ${a + h} ${x0 + an} ${a + h - r}V${a}Z`;
        grupo.append(sv("path", { d: dd, fill: relleno ? c.acento : "none", stroke: c.acento, "stroke-width": relleno ? 0 : 2, opacity: sel ? 1 : 0.62 }));
      };
      grupo.append(sv("rect", { x: mg.l + banda * i, y: 0, width: banda, height: H, fill: "transparent" }));
      barra(arriba[i], 0, true);
      if (seg && d.perdidos !== null) barra(-d.perdidos, 0, false);
      if (arriba[i] === null) grupo.append(sv("text", { x: cx, y: y(0) - 8, "text-anchor": "middle" }, cab ? "Sin dato" : "s/d"));
      else if (cab || sel) grupo.append(sv("text", { x: cx, y: y(arriba[i]) - 8, "text-anchor": "middle", "font-weight": 700 }, seg ? `+${num(arriba[i])}` : num(arriba[i])));
      if (seg && d.perdidos !== null && cab) grupo.append(sv("text", { x: cx, y: y(-d.perdidos) + 15, "text-anchor": "middle" }, `−${num(d.perdidos)}`));
      if (sel) {
        // Dónde se para el muñeco: sobre la cifra del día.
        const pie = arriba[i] === null ? y(0) - 24 : y(arriba[i]) - 22;
        parada = { x: cx, y: pie };
      }
      const f = utc(d.dia);
      grupo.append(sv("text", { x: cx, y: H - 20, "text-anchor": "middle" }, SEM[f.getUTCDay()].slice(0, banda < 34 ? 1 : 3)), sv("text", { x: cx, y: H - 4, "text-anchor": "middle", style: "font-weight:800" }, f.getUTCDate()));
      const elegir = () => { E.dia = d.dia; refrescar(); };
      grupo.addEventListener("click", elegir);
      grupo.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); }
        const k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (k) { e.preventDefault(); caja.querySelectorAll(".col")[i + k]?.focus(); }
      });
      const filas = seg ? [[num(d.ganados), "ganados"], [num(d.perdidos), "perdidos"]] : [[num(arriba[i]), c.unidad]];
      if (ant[i] !== null) filas.push([seg ? signo(ant[i]) : num(ant[i]), `${seg ? "de saldo " : ""}el ${corta(mas(d.dia, -n))}`]);
      ayuda(grupo, mayus(conDia(d.dia)), filas);
      g.append(grupo);
    });
    g.append(sv("line", { x1: mg.l, x2: W - mg.r, y1: y(0), y2: y(0), stroke: "currentColor", "stroke-width": 1, opacity: 0.6 }));
    const muneco = el("img", { class: "guia", src: "img/muneco-pegatina.webp", alt: "", width: 48, height: 80, estilo: { left: `${parada.x - 24}px`, top: `${parada.y - 80}px` } });
    caja.style.position = "relative";
    caja.replaceChildren(g, muneco);
    // Salta desde donde estaba.
    const antesM = columnasDia.ultima;
    if (antesM && antesM.W === W && (antesM.x !== parada.x || antesM.y !== parada.y) && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const dx = antesM.x - parada.x, dy = antesM.y - parada.y;
      muneco.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: `translate(${dx / 2}px, ${Math.min(dy, 0) - 34}px) rotate(${dx > 0 ? -8 : 8}deg)`, offset: 0.5 }, { transform: "none" }], { duration: 420, easing: "ease-in-out" });
    }
    columnasDia.ultima = { ...parada, W };
  }
  function panelDia() {
    const d = I.diario.find((x) => x.dia === E.dia), ps = I.piezas.filter((p) => p.dia === E.dia);
    const par = (t, v) => el("div", {}, el("dt", { text: t }), el("dd", { text: v }));
    return el("div", { class: "dia-panel", "aria-live": "polite" },
      el("h3", { text: conDia(d.dia) }),
      el("dl", { class: "pares" }, par("Vistas", num(d.vistas)), par("Personas", num(d.alcance)), par("Cuentas activas", num(d.cuentas)), par("Saldo de seguidores", d.ganados === null ? "Sin dato" : signo(d.ganados - d.perdidos))),
      el("p", { estilo: { "font-size": "13.5px" }, text: ps.length ? "Lo que se publicó ese día:" : "Ese día no hubo reels ni publicaciones." }),
      ps.map((p) => el("button", { type: "button", class: "enlace", "data-foco": `pd-${p.id}`, onclick: () => abrir(p) }, p.titulo, el("small", { text: `${TIPO[p.tipo]}, ${num(p.vistas)} vistas. Ver ficha` }))));
  }

  // ───────── El recorrido: el muñeco va a la cabeza de la línea
  const RUTAS = { vistas: ["Vistas", "vistas"], alcance: ["Personas alcanzadas", "personas alcanzadas"], cuentas: ["Cuentas que interactúan", "cuentas que interactuaron"] };
  function recorrido() {
    if (E.recorrido) return E.recorrido; // se conserva entre refrescos para no reiniciar la animación
    const fin = diasConDato().at(-1), ini = mas(fin, -29);
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const MS_DIA = 230, PAUSA = 1500;
    let m = "vistas", ds = [], paradas = new Map(), G = null;
    let u = 0, activo = false, pausaHasta = 0, previo = 0, empezo = false, cuadro = 0;

    const fecha = el("p", { class: "rec-fecha" }), valor = el("p", { class: "rec-valor" }), nota = el("p", { class: "rec-nota" });
    const caja = el("div", { class: "rec-caja" });
    const boton = el("button", { type: "button", class: "boton", onclick: () => alternar() });
    const tablaCaja = el("div");
    const seg = el("div", { class: "seg", role: "group", "aria-label": "Dato del recorrido" }, Object.entries(RUTAS).map(([k, [n]]) =>
      el("button", { type: "button", "aria-pressed": String(k === m), onclick: (e) => { m = k; [...seg.children].forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); preparar(); dibujar(caja.clientWidth); reiniciar(); }, text: n })));

    const mejor = (d) => piezasEn(d, d).sort((a, b) => b.vistas - a.vistas)[0];
    function preparar() {
      ds = tramo(ini, fin).filter((d) => d[m] !== null);
      const maximo = (xs) => xs.reduce((a, b) => (b[m] > a[m] ? b : a));
      paradas = new Map([[ds.indexOf(maximo(ds)), "El punto más alto de los 30 días."]]);
      const q = ds.filter((d) => d.dia >= I.desde);
      const iq = ds.indexOf(maximo(q));
      if (!paradas.has(iq)) paradas.set(iq, "El punto más alto de esta quincena.");
      tablaCaja.replaceChildren(el("details", { class: "datos" }, el("summary", { text: "Ver los datos en tabla" }), el("div", { class: "desborde" }, el("table", {},
        el("thead", {}, el("tr", {}, ["Día", RUTAS[m][0]].map((t) => el("th", { scope: "col", text: t })))),
        el("tbody", {}, ds.map((d) => el("tr", {}, el("td", { text: mayus(conDia(d.dia)) }), el("td", { text: num(d[m]) }))))))));
    }
    function dibujar(W) {
      if (!W) return;
      const H = W < 560 ? 330 : 400, mg = { l: 52, r: 30, t: 104, b: 34 };
      const n = ds.length, vs = ds.map((d) => d[m]), esc = escala(Math.max(...vs));
      const x = (i) => mg.l + ((W - mg.l - mg.r) * i) / (n - 1), y = (v) => mg.t + (H - mg.t - mg.b) * (1 - v / esc.tope);
      const xs = vs.map((_, i) => x(i)), ys = vs.map(y), h = xs[1] - xs[0];
      // Curva monótona: pasa por cada dato y no inventa picos entre días.
      const pd = ys.slice(1).map((v, i) => (v - ys[i]) / h);
      const t = ys.map((_, i) => (i === 0 ? pd[0] : i === n - 1 ? pd[n - 2] : pd[i - 1] * pd[i] <= 0 ? 0 : (2 * pd[i - 1] * pd[i]) / (pd[i - 1] + pd[i])));
      const en = (k) => {
        const i = Math.min(n - 2, Math.max(0, Math.floor(k))), q = k - i, q2 = q * q, q3 = q2 * q;
        return { x: x(k), y: (2 * q3 - 3 * q2 + 1) * ys[i] + (q3 - 2 * q2 + q) * h * t[i] + (3 * q2 - 2 * q3) * ys[i + 1] + (q3 - q2) * h * t[i + 1],
          inc: ((6 * q2 - 6 * q) * ys[i] + (3 * q2 - 4 * q + 1) * h * t[i] + (6 * q - 6 * q2) * ys[i + 1] + (3 * q2 - 2 * q) * h * t[i + 1]) / h };
      };
      let d = `M${xs[0]} ${ys[0]}`;
      for (let i = 0; i < n - 1; i++) d += `C${xs[i] + h / 3} ${ys[i] + (t[i] * h) / 3} ${xs[i + 1] - h / 3} ${ys[i + 1] - (t[i + 1] * h) / 3} ${xs[i + 1]} ${ys[i + 1]}`;
      const g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, height: H, role: "slider", tabindex: 0, "aria-label": `${RUTAS[m][0]} por día. Usa las flechas para mover el muñeco`, "aria-valuemin": 0, "aria-valuemax": n - 1 });
      const iq = ds.findIndex((k) => k.dia >= I.desde);
      g.append(sv("rect", { x: x(iq) - h / 2, y: mg.t - 20, width: W - mg.r + h / 2 - x(iq) + h / 2, height: H - mg.b - mg.t + 20, fill: "#F8F6F0", opacity: 0.38, rx: 12 }),
        sv("text", { x: x(iq) - h / 2 + 8, y: H - mg.b - 10 }, W < 560 ? "" : "Esta quincena"));
      for (let v = esc.paso; v <= esc.tope + 1e-9; v += esc.paso) g.append(sv("line", { x1: mg.l, x2: W - mg.r, y1: y(v), y2: y(v), stroke: "#730240", opacity: 0.16 }), sv("text", { x: mg.l - 8, y: y(v) + 4, "text-anchor": "end" }, num(v)));
      g.append(sv("line", { x1: mg.l, x2: W - mg.r, y1: y(0), y2: y(0), stroke: "#730240", opacity: 0.6 }));
      const paso = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 110))));
      for (let i = n - 1; i >= 0; i -= paso) g.append(sv("text", { x: x(i), y: H - 8, "text-anchor": "middle" }, corta(ds[i].dia)));
      const recorte = sv("rect", { x: 0, y: 0, height: H, width: 0 });
      const linea = sv("path", { d, fill: "none", stroke: "#730240", "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" });
      const marcas = [...paradas.keys()].map((i) => sv("circle", { cx: xs[i], cy: ys[i], r: 6, fill: "#F8F6F0", stroke: "#730240", "stroke-width": 3 }));
      const area = sv("path", { d: `${d}V${y(0)}H${xs[0]}Z`, fill: "#730240", opacity: 0.12 });
      g.append(sv("defs", {}, sv("clipPath", { id: "rec-clip" }, recorte)), sv("g", { "clip-path": "url(#rec-clip)" }, area, linea, marcas));
      const muneco = el("img", { class: "rec-muneco", src: "img/muneco-pegatina.webp", alt: "", width: 54, height: 90 });
      caja.replaceChildren(g, muneco);
      G = { W, n, x, h, mg, en, recorte, muneco, g, giro: 0 };
      const dia = (e) => Math.min(n - 1, Math.max(0, Math.round((e.clientX - g.getBoundingClientRect().left - mg.l) / h)));
      let arrastra = false;
      g.addEventListener("pointerdown", (e) => { arrastra = true; frenar(); u = dia(e); pintar(); });
      g.addEventListener("pointermove", (e) => { if (arrastra || (!activo && empezo && e.pointerType === "mouse")) { u = dia(e); pintar(true); } });
      for (const f of ["pointerup", "pointercancel", "pointerleave"]) g.addEventListener(f, () => { arrastra = false; });
      g.addEventListener("keydown", (e) => {
        const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (k || e.key === "Home" || e.key === "End") { e.preventDefault(); frenar(); u = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : Math.min(n - 1, Math.max(0, Math.round(u) + k)); pintar(); }
      });
      pintar();
    }
    function pintar(todaLaLinea) {
      if (!G) return;
      const a = G.en(u), i = Math.round(u), d = ds[i];
      const completa = todaLaLinea || (!activo && empezo && pausaHasta === -1);
      G.recorte.setAttribute("width", completa ? G.W : a.x);
      const meta = activo && performance.now() >= pausaHasta ? Math.max(-16, Math.min(16, (Math.atan(a.inc) * 180) / Math.PI * 0.3)) : 0;
      G.giro += (meta - G.giro) * 0.2;
      const brinco = activo && performance.now() >= pausaHasta ? Math.abs(Math.sin(u * Math.PI * 1.6)) * 6 : 0;
      G.muneco.style.transform = `translate(${a.x - 27}px, ${a.y - 90 - brinco}px) rotate(${G.giro.toFixed(1)}deg)`;
      fecha.textContent = mayus(conDia(d.dia));
      valor.textContent = `${num(d[m])} ${RUTAS[m][1]}`;
      const p = mejor(d.dia);
      nota.textContent = [paradas.get(i), p ? `Ese día se publicó: ${p.titulo}` : "Ese día no hubo reels ni publicaciones."].filter(Boolean).join(" ");
      G.g.setAttribute("aria-valuenow", i);
      G.g.setAttribute("aria-valuetext", `${conDia(d.dia)}: ${num(d[m])} ${RUTAS[m][1]}`);
      boton.textContent = activo ? "Pausar" : u >= ds.length - 1 || completa ? "Volver a verlo" : empezo ? "Seguir" : "Ver el recorrido";
    }
    function paso(ahora) {
      if (!activo) return;
      if (!caja.isConnected) { activo = false; pausaHasta = 0; boton.textContent = "Seguir"; return; }
      const dt = Math.min(150, ahora - previo);
      previo = ahora;
      if (ahora >= pausaHasta) {
        const antes = u;
        u = Math.min(ds.length - 1, u + dt / MS_DIA);
        for (const i of paradas.keys()) if (antes < i && u >= i) { u = i; pausaHasta = ahora + PAUSA; }
        if (u >= ds.length - 1) { activo = false; pausaHasta = -1; }
      }
      pintar();
      if (activo) cuadro = requestAnimationFrame(paso);
    }
    function frenar() { activo = false; empezo = true; cancelAnimationFrame(cuadro); pausaHasta = -1; }
    function andar() { activo = true; empezo = true; pausaHasta = 0; previo = performance.now(); cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(paso); pintar(); }
    function reiniciar() {
      if (quieto) { frenar(); u = ds.length - 1; pintar(); return; }
      u = 0;
      andar();
    }
    function alternar() {
      if (activo) { activo = false; cancelAnimationFrame(cuadro); pausaHasta = 0; pintar(); }
      else if (u >= ds.length - 1 || pausaHasta === -1) { quieto ? (u = 0, andar()) : reiniciar(); }
      else andar();
    }
    preparar();
    const nodo = el("section", { class: "seccion" },
      el("header", {}, el("h2", { text: "El recorrido" }), el("p", { text: `Los 30 días hasta el ${larga(fin)}, paso a paso. Cuando termine, mueve el muñeco sobre la línea para volver a cualquier día. La franja clara es esta quincena.` })),
      el("div", { class: "rec" }, el("div", { class: "controles" }, seg, boton), el("div", { class: "rec-lee" }, fecha, valor, nota), caja, tablaCaja));
    alAncho(caja, dibujar);
    new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); if (!empezo) reiniciar(); } }, { threshold: 0.5 }).observe(caja);
    return (E.recorrido = nodo);
  }

  // ───────── Hallazgos
  function hallazgos() {
    if (!I.hallazgos.length) return null;
    return el("section", { class: "seccion" },
      el("p", { class: "nota", estilo: { margin: "0 0 12px" }, text: "Lectura de todo el periodo. Toca una tarjeta para abrir la publicación." }),
      el("div", { class: "hallazgos" }, I.hallazgos.map((h) => {
        const p = I.piezas.find((x) => x.id === h.pieza);
        return el("button", { type: "button", class: "hallazgo", "data-foco": `h-${h.pieza}`, estilo: estiloMood(h.tema), onclick: () => abrir(p) },
          el("b", { text: h.titulo }), el("span", { text: h.texto }), el("em", { text: `${num(p.vistas)} vistas, ${pct(p.tasa)} de interacción` }));
      })));
  }

  // ───────── Contenido
  const viva = (id) => document.querySelectorAll("[data-pieza]").forEach((n) => {
    const si = n.dataset.pieza === id;
    n.classList.toggle("viva", si);
    if (n.tagName === "g") n.querySelector(".pt").setAttribute("r", si ? 11 : 8);
  });
  const enlazar = (nodo, p) => { nodo.addEventListener("pointerenter", () => viva(p.id)); nodo.addEventListener("pointerleave", () => viva(null)); return nodo; };
  function contenido() {
    const ps = filtradas();
    const formatos = ["todos", ...Object.keys(TIPO).filter((t) => enRango().some((p) => p.tipo === t))];
    if (!formatos.includes(E.formato)) { E.formato = "todos"; return contenido(); }
    const orden = [...ps].sort((a, b) => (b[E.medida] ?? -1) - (a[E.medida] ?? -1));
    const max = Math.max(1e-9, ...orden.map((p) => p[E.medida] ?? 0));
    const lista = el("div", {}, orden.map((p) => enlazar(ayuda(el("button", { type: "button", class: "fila", "data-pieza": p.id, "data-foco": `r-${p.id}`, onclick: () => abrir(p) },
      el("span", { class: "cab" }, el("span", { class: "t", text: p.titulo }), el("span", { class: "n", text: fmt(E.medida, p[E.medida]) })),
      el("span", { class: "pista" }, el("span", { estilo: { width: `${(100 * (p[E.medida] ?? 0)) / max}%` } })),
      el("span", { class: "m", text: `${TIPO[p.tipo]}, ${corta(p.dia)}${p.enMedicion ? ". Aún sumando" : ""}` })),
      p.titulo, [[num(p.vistas), "vistas"], [num(p.alcance), "personas"], [num(p.interacciones), "interacciones"], [pct(p.tasa), "tasa"]]), p)));
    const cajaD = el("div");
    alAncho(cajaD, (W) => dispersion(cajaD, W, ps));
    return el("section", { class: "seccion", id: "contenido-piezas" },
      el("header", {}, el("h2", { text: "Publicaciones" }), el("p", { text: `${ps.length} ${ps.length === 1 ? "pieza" : "piezas"} del ${rango(E.desde, E.hasta)}. «Aún sumando» marca las que tienen menos de tres días publicadas.` })),
      filtros(),
      el("div", { class: "controles" }, subnav("publicaciones", [["ranking", "Cuál funcionó"], ["partes", "Cómo reaccionaron"]]), el("span", { class: "corte", "aria-hidden": "true" }),
        el("div", { class: "seg", role: "group", "aria-label": "Formato" }, formatos.map((f) => el("button", { type: "button", "data-foco": `f-${f}`, "aria-pressed": String(E.formato === f), onclick: () => { E.formato = f; refrescar(); }, text: f === "todos" ? "Todos los formatos" : f === "reel" ? "Reels" : f === "carrusel" ? "Carruseles" : "Imágenes" })))),
      ps.length ? el("div", { class: "rejilla dos" }, E.sub.publicaciones === "partes" ? [composicion(ps), retencion(ps)] : [
        el("div", { class: "tarjeta" }, el("h3", { text: "¿Cuál funcionó mejor?" }), el("p", { class: "baja", text: "Elige con qué medirlas." }),
          el("div", { class: "controles" }, el("select", { "aria-label": "Medida", "data-foco": "medida", onchange: (e) => { E.medida = e.target.value; refrescar(); } }, Object.entries(MEDIDAS).map(([k, v]) => el("option", { value: k, selected: k === E.medida, text: v })))), lista),
        el("div", { class: "tarjeta" }, el("h3", { text: "Alcance frente a reacción" }), el("p", { class: "baja", text: "Más a la derecha, más personas la vieron. Más arriba, mayor parte de esas personas reaccionó." }), cajaD, el("p", { class: "nota", text: "Tasa de interacción: interacciones por cada 100 personas alcanzadas." }))]) : el("p", { class: "nota", text: "No hay piezas con este filtro. Cambia las fechas o el formato." }));
  }
  function dispersion(caja, W, ps) {
    const H = 380, m = { l: 46, r: 16, t: 16, b: 44 };
    const ex = escala(Math.max(...ps.map((p) => p.alcance)) * 1.08), ey = escala(Math.max(...ps.map((p) => p.tasa)) * 1.08);
    const x = (v) => m.l + ((W - m.l - m.r) * v) / ex.tope, y = (v) => m.t + (H - m.t - m.b) * (1 - v / ey.tope);
    const g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, height: H, role: "group", "aria-label": "Alcance y tasa de interacción por pieza" });
    for (let v = 0; v <= ey.tope + 1e-9; v += ey.paso) g.append(sv("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "#ddd5bf" }), sv("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end" }, `${dec(v, ey.paso % 1 ? 1 : 0)} %`));
    for (let v = 0; v <= ex.tope + 1e-9; v += ex.paso) g.append(sv("text", { x: x(v), y: H - 24, "text-anchor": "middle" }, num(v)));
    g.append(sv("text", { x: (m.l + W - m.r) / 2, y: H - 4, "text-anchor": "middle" }, "Personas alcanzadas"));
    const color = { reel: "#2c7fb0", carrusel: "#e8574f", imagen: "#7d6bbf" };
    ps.forEach((p) => {
      // Si hay otro punto justo encima, la fecha va al lado para no taparlo.
      const lado = ps.some((q) => q !== p && Math.abs(x(q.alcance) - x(p.alcance)) < 42 && y(p.tasa) - y(q.tasa) >= 0 && y(p.tasa) - y(q.tasa) < 34);
      const n = sv("g", { "data-pieza": p.id, "data-foco": `x-${p.id}`, tabindex: 0, role: "button", "aria-label": `${p.titulo}: ${num(p.alcance)} personas, ${pct(p.tasa)}`, style: "cursor:pointer" },
        sv("circle", { cx: x(p.alcance), cy: y(p.tasa), r: 20, fill: "transparent" }), sv("circle", { class: "pt", cx: x(p.alcance), cy: y(p.tasa), r: 8, fill: color[p.tipo], stroke: "#F8F6F0", "stroke-width": 2 }),
        sv("text", lado ? { x: x(p.alcance) + 13, y: y(p.tasa) + 4, "text-anchor": "start" } : { x: x(p.alcance), y: y(p.tasa) - 13, "text-anchor": "middle" }, corta(p.dia)));
      n.addEventListener("click", () => abrir(p));
      n.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(p); } });
      g.append(enlazar(ayuda(n, p.titulo, [[num(p.alcance), "personas"], [pct(p.tasa), "de interacción"], [num(p.interacciones), "interacciones"]]), p));
    });
    const tipos = [...new Set(ps.map((p) => p.tipo))];
    caja.replaceChildren(g, tipos.length > 1 ? el("div", { class: "clave" }, tipos.map((t) => el("span", {}, el("i", { estilo: { background: color[t], "border-radius": "50%" } }), TIPO[t]))) : "");
  }
  function composicion(ps) {
    const ver = PARTES.filter(([k]) => !E.ocultos.has(k));
    const total = (p) => suma(ver.map(([k]) => p[k]));
    const filas = [...ps].sort((a, b) => total(b) - total(a));
    const max = Math.max(1, ...filas.map(total)), todoT = suma(filas.map(total));
    return el("div", { class: "tarjeta" }, el("h3", { text: "¿De qué están hechas las interacciones?" }), el("p", { class: "baja", text: "Prende y apaga cada tipo." }),
      el("div", { class: "controles" }, PARTES.map(([k, n, c]) => el("button", { type: "button", class: "interruptor", "data-foco": `c-${k}`, estilo: { "--c": c }, "aria-pressed": String(!E.ocultos.has(k)), onclick: () => { E.ocultos.has(k) ? E.ocultos.delete(k) : E.ocultos.size < 3 && E.ocultos.add(k); refrescar(); } }, el("i"), el("span", { text: `${n} ${num(suma(ps.map((p) => p[k])))}` })))),
      filas.map((p) => enlazar(el("button", { type: "button", class: "fila", "data-pieza": p.id, "data-foco": `k-${p.id}`, onclick: () => abrir(p) },
        el("span", { class: "cab" }, el("span", { class: "t", text: p.titulo }), el("span", { class: "n", text: num(total(p)) })),
        el("span", { class: "pista pila", estilo: { width: `${(100 * total(p)) / max}%` } }, ver.filter(([k]) => p[k]).map(([k, n, c]) => ayuda(el("span", { estilo: { background: c, flex: `${p[k]} 0 0` } }), p.titulo, [[num(p[k]), n.toLowerCase()]])))), p)),
      el("p", { class: "nota", text: `Suma de lo que está prendido: ${num(todoT)}.` }));
  }
  function retencion(ps) {
    const rs = ps.filter((p) => p.ver3 !== null);
    const k = E.retencion, filas = [...rs].sort((a, b) => b[k] - a[k]);
    const max = k === "ver3" ? 100 : Math.max(1, ...filas.map((p) => p[k]));
    return el("div", { class: "tarjeta" }, el("h3", { text: "¿Se quedaron a ver los reels?" }), el("p", { class: "baja", text: k === "ver3" ? "Parte de las vistas que pasó de los tres primeros segundos." : "Segundos que se vio cada reel, en promedio." }),
      el("div", { class: "controles" }, el("div", { class: "seg", role: "group", "aria-label": "Medida de los reels" }, [["ver3", "Pasaron de 3 segundos"], ["segundos", "Tiempo promedio"]].map(([a, t]) => el("button", { type: "button", "data-foco": `t-${a}`, "aria-pressed": String(k === a), onclick: () => { E.retencion = a; refrescar(); }, text: t })))),
      filas.length ? filas.map((p) => enlazar(ayuda(el("button", { type: "button", class: "fila", "data-pieza": p.id, "data-foco": `v-${p.id}`, onclick: () => abrir(p) },
        el("span", { class: "cab" }, el("span", { class: "t", text: p.titulo }), el("span", { class: "n", text: fmt(k, p[k]) })), el("span", { class: "pista" }, el("span", { estilo: { width: `${(100 * p[k]) / max}%`, background: "var(--s3)" } }))),
        p.titulo, [[pct(p.ver3), "pasó de 3 segundos"], [`${dec(p.segundos)} s`, "de tiempo promedio"]]), p)) : el("p", { class: "nota", text: "No hay reels con este filtro." }),
      filas.length ? el("p", { class: "nota", text: `Valor típico (mediana) de estos reels: ${fmt(k, mediana(filas.map((p) => p[k])))}.` }) : null);
  }

  // ───────── Audiencia
  function audiencia() {
    const SEXO = [["F", "Mujeres", "#2c7fb0"], ["M", "Hombres", "#e8574f"], ["U", "Sin especificar", "#7d6bbf"]];
    const ver = SEXO.filter(([k]) => !E.sexos.has(k));
    const tot = (f) => suma(ver.map(([k]) => f[k]));
    const ed = I.audiencia.edad, max = Math.max(1, ...ed.map(tot)), todo = suma(ed.map(tot)), gran = suma(ed.map((f) => f.F + f.M + f.U));
    const lug = E.lugar === "ciudades" ? I.audiencia.ciudades : I.audiencia.paises;
    let nombres = null;
    try { nombres = new Intl.DisplayNames(["es"], { type: "region" }); } catch { /* navegador sin soporte */ }
    const limpio = (n) => (E.lugar === "paises" ? (nombres ? nombres.of(n) : n) : n.split(",")[0]);
    const base = E.sinPrimero ? lug.slice(1) : lug, vis = base.slice(0, E.masLugares ? 20 : 8), mx = vis[0][1];
    return el("section", { class: "seccion" },
      el("header", {}, el("h2", { text: "Quién sigue a Mood" }), el("p", { text: `Seguidores al ${larga(I.capturado)}. Esta foto no cambia con las fechas elegidas.` })),
      el("div", { class: "rejilla dos" },
        el("div", { class: "tarjeta" }, el("h3", { text: "Edad y género" }), el("p", { class: "baja", text: "Prende y apaga cada grupo." }),
          el("div", { class: "controles" }, SEXO.map(([k, n, c]) => el("button", { type: "button", class: "interruptor", "data-foco": `s-${k}`, estilo: { "--c": c }, "aria-pressed": String(!E.sexos.has(k)), onclick: () => { E.sexos.has(k) ? E.sexos.delete(k) : E.sexos.size < 2 && E.sexos.add(k); refrescar(); } }, el("i"), el("span", { text: `${n} ${pct((100 * suma(ed.map((f) => f[k]))) / gran, 0)}` })))),
          ed.map((f) => el("div", { class: "fila" }, el("span", { class: "cab" }, el("span", { class: "t", text: `${f.edad} años` }), el("span", { class: "n", text: pct((100 * tot(f)) / todo, (100 * tot(f)) / todo < 1 ? 1 : 0) })),
            el("span", { class: "pista pila", estilo: { width: `${(100 * tot(f)) / max}%` } }, ver.filter(([k]) => f[k]).map(([k, n, c]) => ayuda(el("span", { estilo: { background: c, flex: `${f[k]} 0 0` } }), `${f.edad} años`, [[num(f[k]), n.toLowerCase()]]))))),
          el("p", { class: "nota", text: `Porcentajes sobre los ${num(todo)} seguidores que están prendidos.` })),
        el("div", { class: "tarjeta" }, el("h3", { text: "Dónde están" }), el("p", { class: "baja", text: "Porcentaje de los seguidores." }),
          el("div", { class: "controles" },
            el("div", { class: "seg", role: "group", "aria-label": "Lugar" }, [["ciudades", "Ciudades"], ["paises", "Países"]].map(([a, t]) => el("button", { type: "button", "data-foco": `l-${a}`, "aria-pressed": String(E.lugar === a), onclick: () => { E.lugar = a; E.sinPrimero = false; refrescar(); }, text: t }))),
            el("button", { type: "button", class: "interruptor", "data-foco": "primero", estilo: { "--c": "#2c7fb0" }, "aria-pressed": String(!E.sinPrimero), onclick: () => { E.sinPrimero = !E.sinPrimero; refrescar(); } }, el("i"), el("span", { text: limpio(lug[0][0]) }))),
          vis.map(([n, v]) => ayuda(el("div", { class: "fila", tabindex: 0 }, el("span", { class: "cab" }, el("span", { class: "t", text: limpio(n) }), el("span", { class: "n", text: pct(v) })), el("span", { class: "pista" }, el("span", { estilo: { width: `${(100 * v) / mx}%` } }))), E.lugar === "ciudades" ? n : limpio(n), [[pct(v, 2), "de los seguidores"]])),
          el("button", { type: "button", class: "boton", "data-foco": "maslug", estilo: { "margin-top": "10px" }, onclick: () => { E.masLugares = !E.masLugares; refrescar(); }, text: E.masLugares ? "Ver menos" : "Ver más" }))));
  }

  // ───────── Islas: taps NFC y fichas de Google
  const ISLAS = [["Le Meridiem", "#2c7fb0"], ["Buenavista 2", "#e8574f"], ["Parque Alegra", "#7d6bbf"]];
  const elegidas = () => ISLAS.filter(([n]) => E.isla === "todas" || E.isla === n);
  const diasRango = () => { const out = []; for (let d = E.desde; d <= E.hasta; d = mas(d, 1)) out.push(d); return out; };
  // Compara cada día con dato contra el mismo día del tramo anterior, para no mezclar días distintos.
  function pareado(valor) {
    const ds = diasRango(), n = ds.length;
    let a = 0, b = 0, k = 0;
    for (const d of ds) { const x = valor(d), y = valor(mas(d, -n)); if (x !== null && y !== null) { a += x; b += y; k++; } }
    return k ? { a, b, k } : null;
  }
  const textoDelta = (c) => (!E.comparar ? null : !c ? "Sin comparación" : c.b === 0 ? (c.a === 0 ? "Igual que antes" : "Antes: 0") : `${c.a > c.b ? "▲" : c.a < c.b ? "▼" : "="} ${dec(Math.abs((100 * (c.a - c.b)) / c.b), 0)} % frente a ${num(c.b)}`);
  // El stand de cada isla; la barra de abajo compara las tres islas entre sí.
  const stand = (nivel) => el("span", { class: "stand" }, el("img", { src: "img/stand.svg", width: 648, height: 712, alt: "" }),
    nivel === null ? null : el("span", { class: "nivel", "aria-hidden": "true" }, el("span", { estilo: { width: `${100 * Math.max(0, Math.min(1, nivel))}%` } })));
  function tarjetaIsla(nombre, color, { nivel, valor, rotulo, delta, pares }) {
    const sel = E.isla === nombre;
    return el("button", { type: "button", class: "isla", "data-foco": `isla-${nombre}`, "aria-pressed": String(sel), estilo: { "--c": color }, onclick: () => { E.isla = sel ? "todas" : nombre; refrescar(); } },
      stand(nivel),
      el("span", { class: "isla-t" }, el("b", { text: nombre }), el("span", { class: "isla-v", text: valor }), el("span", { text: rotulo }), delta ? el("span", { class: "isla-d", text: delta }) : null),
      el("span", { class: "isla-p" }, pares.map(([t, v]) => el("span", {}, t, el("b", { text: v })))));
  }
  // Columnas apiladas por isla; un día sin dato queda vacío y marcado.
  function columnasIslas(caja, W, { ejes, largos, valor, unidad, nombre }) {
    const H = 260, mg = { l: 40, r: 6, t: 20, b: 40 }, series = elegidas(), n = ejes.length;
    const tot = ejes.map((_, i) => { const v = series.map(([isla]) => valor(isla, i)); return v.every((x) => x === null) ? null : suma(hay(v)); });
    const e = escala(Math.max(1, ...hay(tot)));
    const y = (v) => mg.t + (H - mg.t - mg.b) * (1 - v / e.tope), banda = (W - mg.l - mg.r) / n, an = Math.min(48, banda * 0.66);
    const g = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, height: H, role: "group", "aria-label": nombre });
    for (let v = 0; v <= e.tope + 1e-9; v += e.paso) g.append(sv("line", { x1: mg.l, x2: W - mg.r, y1: y(v), y2: y(v), stroke: v ? "#ddd5bf" : "#8a9aa0" }), sv("text", { x: mg.l - 6, y: y(v) + 4, "text-anchor": "end" }, num(v)));
    const salto = Math.ceil(n / Math.max(1, Math.floor((W - mg.l) / 34)));
    ejes.forEach((t, i) => {
      const cx = mg.l + banda * (i + 0.5);
      const q = sv("g", { tabindex: 0, role: "img", "aria-label": `${largos[i]}: ${tot[i] === null ? "sin dato" : `${num(tot[i])} ${unidad}`}` }, sv("rect", { x: cx - banda / 2, y: 0, width: banda, height: H, fill: "transparent" }));
      let ac = 0;
      const pos = series.filter(([isla]) => valor(isla, i) > 0);
      pos.forEach(([isla, color], k) => {
        const v = valor(isla, i), y1 = y(ac + v), y0 = y(ac) - (k ? 2 : 0), h = Math.max(1, y0 - y1), rr = k === pos.length - 1 ? Math.min(4, h, an / 2) : 0, x0 = cx - an / 2;
        ac += v;
        q.append(sv("path", { d: `M${x0} ${y0}V${y0 - h + rr}Q${x0} ${y0 - h} ${x0 + rr} ${y0 - h}H${x0 + an - rr}Q${x0 + an} ${y0 - h} ${x0 + an} ${y0 - h + rr}V${y0}Z`, fill: color }));
      });
      if (tot[i] === null) q.append(sv("text", { x: cx, y: y(0) - 8, "text-anchor": "middle" }, banda >= 56 ? "Sin dato" : "s/d"));
      else if (banda >= 34) q.append(sv("text", { x: cx, y: y(tot[i]) - 6, "text-anchor": "middle", style: "font-weight:700" }, num(tot[i])));
      if (i % salto === 0) q.append(sv("text", { x: cx, y: H - 18, "text-anchor": "middle" }, t[0]), sv("text", { x: cx, y: H - 4, "text-anchor": "middle", style: "font-weight:700" }, t[1]));
      ayuda(q, largos[i], [...series.map(([isla]) => [num(valor(isla, i)), isla]), ...(series.length > 1 ? [[num(tot[i]), "en total"]] : [])]);
      g.append(q);
    });
    caja.replaceChildren(g, series.length > 1 ? el("div", { class: "clave" }, series.map(([n2, c]) => el("span", {}, el("i", { estilo: { background: c } }), n2))) : "");
  }
  const grafIslas = (op) => { const c = el("div"); alAncho(c, (W) => columnasIslas(c, W, op)); return c; };
  const ejeDias = (ds) => ({ ejes: ds.map((d) => [SEM[utc(d).getUTCDay()].slice(0, 3), utc(d).getUTCDate()]), largos: ds.map((d) => mayus(conDia(d))) });
  const barras = (xs, formato = num) => { const mx = Math.max(1e-9, ...xs.map((x) => x[1])); return xs.map(([n, v, c, sub]) => ayuda(el("div", { class: "fila", tabindex: 0 }, el("span", { class: "cab" }, el("span", { class: "t", text: n }), el("span", { class: "n", text: formato(v) })), el("span", { class: "pista" }, el("span", { estilo: { width: `${(100 * v) / mx}%`, background: c || null } })), sub ? el("span", { class: "m", text: sub }) : null), n, [[formato(v), sub || ""]])); };
  const todasLasIslas = () => (E.isla === "todas" ? null : el("button", { type: "button", class: "boton", "data-foco": "todas", onclick: () => { E.isla = "todas"; refrescar(); }, text: "Ver las tres islas" }));
  // Sección lista, a la espera de datos.
  function enEspera(titulo, texto, rotulo, pares, frase) {
    return el("section", { class: "seccion" }, el("header", {}, el("h2", { text: titulo }), el("p", { text: texto })),
      el("div", { class: "islas" }, ISLAS.map(([n, c]) => el("div", { class: "isla", estilo: { "--c": c } }, stand(null),
        el("span", { class: "isla-t" }, el("b", { text: n }), el("span", { class: "isla-v sin", text: "Sin dato" }), el("span", { text: rotulo })),
        el("span", { class: "isla-p" }, pares.map((t) => el("span", {}, t, el("b", { text: "–" }))))))),
      el("div", { class: "espera" }, el("img", { src: "img/muneco.webp", width: 441, height: 753, alt: "" }), nube(...frase)));
  }

  const TIPOS_TAP = { nfc: "Chip NFC", qr: "Código QR", directa: "Enlace directo" };
  function nfc() {
    const T = I.taps;
    const texto = "Cuánta gente toca el chip o escanea el código en el stand de cada isla.";
    if (!T || !T.filas.length) return enEspera("Taps en las islas", texto, "taps en la quincena", ["Chip NFC", "Código QR", "Mejor día"], ["Pronto verás", "los taps aquí"]);
    const tipos = Object.keys(TIPOS_TAP).filter((t) => T.filas.some((f) => f.tipo === t));
    const cubre = (d) => d >= T.desde && d <= T.hasta;
    const contar = (isla, d, tipo = E.tipoTap) => (cubre(d) ? suma(T.filas.filter((f) => f.dia === d && (!isla || f.isla === isla) && (tipo === "todos" || f.tipo === tipo)).map((f) => f.cuenta)) : null);
    const ds = diasRango(), total = (isla, tipo) => { const v = hay(ds.map((d) => contar(isla, d, tipo))); return v.length ? suma(v) : null; };
    const mx = Math.max(1, ...ISLAS.map(([n]) => total(n) ?? 0));
    const horas = T.filas.some((f) => f.hora !== null && f.hora !== undefined);
    const enH = (isla, h) => suma(T.filas.filter((f) => f.isla === isla && f.hora === h && f.dia >= E.desde && f.dia <= E.hasta && (E.tipoTap === "todos" || f.tipo === E.tipoTap)).map((f) => f.cuenta));
    const botones = {};
    for (const b of T.botones || []) if (b.dia >= E.desde && b.dia <= E.hasta && elegidas().some(([n]) => n === b.isla)) botones[b.boton] = (botones[b.boton] || 0) + b.cuenta;
    return el("section", { class: "seccion" }, el("header", {}, el("h2", { text: "Taps en las islas" }), el("p", { text: `${texto} Toca una isla para verla sola. Se cuentan toques, no personas.` })),
      filtros(true),
      tipos.length > 1 ? el("div", { class: "controles" }, el("div", { class: "seg", role: "group", "aria-label": "Tipo de entrada" }, ["todos", ...tipos].map((t) => el("button", { type: "button", "data-foco": `tt-${t}`, "aria-pressed": String(E.tipoTap === t), onclick: () => { E.tipoTap = t; refrescar(); }, text: t === "todos" ? "Todo" : TIPOS_TAP[t] })))) : null,
      el("div", { class: "islas" }, ISLAS.map(([n, c]) => {
        const t = total(n), mejor = ds.map((d) => [d, contar(n, d)]).filter((x) => x[1]).sort((a, b) => b[1] - a[1])[0];
        return tarjetaIsla(n, c, { nivel: (t ?? 0) / mx, valor: num(t), rotulo: t === 1 ? "tap" : "taps", delta: textoDelta(pareado((d) => contar(n, d))), pares: [...tipos.map((k) => [TIPOS_TAP[k], num(total(n, k))]), ["Mejor día", mejor ? corta(mejor[0]) : "–"]] });
      })),
      el("div", { class: "controles", estilo: { "margin-top": "10px" } }, todasLasIslas()),
      el("div", { class: "rejilla dos" },
        el("div", { class: "tarjeta" }, el("h3", { text: "Taps por día" }), el("p", { class: "baja", text: "«Sin dato» es un día sin lectura, no un día en cero." }), grafIslas({ ...ejeDias(ds), valor: (isla, i) => contar(isla, ds[i]), unidad: "taps", nombre: "Taps por día y por isla" })),
        horas ? el("div", { class: "tarjeta" }, el("h3", { text: "A qué hora llegan" }), el("p", { class: "baja", text: "Hora de Colombia, todo el tramo elegido." }), grafIslas({ ejes: [...Array(24).keys()].map((h) => ["", `${h}`]), largos: [...Array(24).keys()].map((h) => `De ${h}:00 a ${h}:59`), valor: (isla, h) => enH(isla, h), unidad: "taps", nombre: "Taps por hora y por isla" })) : null,
        Object.keys(botones).length ? el("div", { class: "tarjeta todo" }, el("h3", { text: "Qué botón oprimen" }), el("p", { class: "baja", text: "Un clic muestra interés: no confirma una reseña ni un registro." }), barras(Object.entries(botones).sort((a, b) => b[1] - a[1]))) : null));
  }

  const MED_G = { vistas: ["Veces vista", "veces vista"], ruta: ["Cómo llegar", "pidieron la ruta"], llamadas: ["Llamadas", "llamadas"], web: ["Clics al sitio", "clics al sitio"] };
  function google() {
    const G = I.google;
    const texto = "Las fichas de las tres islas en Búsqueda y Maps: cuánta gente las ve, cuánta pide la ruta y qué buscaba.";
    if (!G || !G.diario.length) return enEspera("Las islas en Google", texto, "veces vista en la quincena", ["Cómo llegar", "Reseñas", "Calificación"], ["Pronto verás", "Google aquí"]);
    const idx = new Map(G.diario.map((f) => [`${f.isla}|${f.dia}`, f]));
    const dato = (isla, d, k) => { const f = idx.get(`${isla}|${d}`); return !f ? null : k === "vistas" ? f.busqueda + f.maps : f[k]; };
    const ds = diasRango(), total = (isla, k) => { const v = hay(ds.map((d) => dato(isla, d, k))); return v.length ? suma(v) : null; };
    const m = E.medidaG, mx = Math.max(1, ...ISLAS.map(([n]) => total(n, m) ?? 0));
    const meses = [...new Set(G.busquedas.map((b) => b.mes))].sort().reverse(), mes = meses.includes(E.mesG) ? E.mesG : meses[0];
    const palabras = G.busquedas.filter((b) => b.mes === mes && elegidas().some(([n]) => n === b.isla)).sort((a, b) => b.personas - a.personas);
    const nomMes = (x) => `${mayus(MESL[Number(x.slice(5)) - 1])} ${x.slice(0, 4)}`;
    const color = Object.fromEntries(ISLAS);
    return el("section", { class: "seccion" }, el("header", {}, el("h2", { text: "Las islas en Google" }), el("p", { text: `${texto} Toca una isla para verla sola.` })),
      filtros(true),
      el("div", { class: "controles" }, el("div", { class: "seg", role: "group", "aria-label": "Dato de Google" }, Object.entries(MED_G).map(([k, [t]]) => el("button", { type: "button", "data-foco": `g-${k}`, "aria-pressed": String(m === k), onclick: () => { E.medidaG = k; refrescar(); }, text: t })))),
      el("div", { class: "islas" }, ISLAS.map(([n, c]) => {
        const t = total(n, m), re = G.resenas.find((x) => x.isla === n);
        return tarjetaIsla(n, c, { nivel: (t ?? 0) / mx, valor: num(t), rotulo: MED_G[m][1], delta: textoDelta(pareado((d) => dato(n, d, m))), pares: [...(m === "vistas" ? [["Cómo llegar", num(total(n, "ruta"))]] : [["Veces vista", num(total(n, "vistas"))]]), ["Reseñas", re ? num(re.total) : "–"], ["Calificación", re ? dec(re.promedio) : "–"]] });
      })),
      el("div", { class: "controles", estilo: { "margin-top": "10px" } }, todasLasIslas()),
      el("div", { class: "rejilla dos" },
        el("div", { class: "tarjeta" }, el("h3", { text: `${MED_G[m][0]} por día` }), el("p", { class: "baja", text: "Google entrega los datos con unos días de atraso." }), grafIslas({ ...ejeDias(ds), valor: (isla, i) => dato(isla, ds[i], m), unidad: MED_G[m][1], nombre: `${MED_G[m][0]} por día y por isla` })),
        el("div", { class: "tarjeta" }, el("h3", { text: "Qué buscaban" }), el("p", { class: "baja", text: "Personas por mes. Google no informa las búsquedas con muy pocas personas." }),
          meses.length > 1 ? el("div", { class: "controles" }, el("div", { class: "seg", role: "group", "aria-label": "Mes" }, meses.map((x) => el("button", { type: "button", "data-foco": `mes-${x}`, "aria-pressed": String(x === mes), onclick: () => { E.mesG = x; refrescar(); }, text: nomMes(x) })))) : mes ? el("p", { class: "m", text: nomMes(mes) }) : null,
          palabras.length ? barras(palabras.map((b) => [b.palabra, b.personas, color[b.isla], b.isla])) : el("p", { class: "nota", text: "Sin búsquedas informadas." })),
        el("div", { class: "tarjeta todo" }, el("h3", { text: "¿La vieron en Búsqueda o en Maps?" }),
          elegidas().map(([n]) => { const b = total(n, "busqueda"), mp = total(n, "maps"), t = (b ?? 0) + (mp ?? 0); return el("div", { class: "fila" }, el("span", { class: "cab" }, el("span", { class: "t", text: n }), el("span", { class: "n", text: t ? `${pct((100 * b) / t, 0)} Búsqueda, ${pct((100 * mp) / t, 0)} Maps` : "Sin dato" })),
            t ? el("span", { class: "pista pila" }, [[b, "#2c7fb0", "en Búsqueda"], [mp, "#a3306f", "en Maps"]].filter((x) => x[0]).map(([v, c, q]) => ayuda(el("span", { estilo: { background: c, flex: `${v} 0 0` } }), n, [[num(v), q]]))) : null); }),
          el("div", { class: "clave" }, [["Búsqueda", "#2c7fb0"], ["Maps", "#a3306f"]].map(([t, c]) => el("span", {}, el("i", { estilo: { background: c } }), t))))));
  }

  // ───────── Tabla
  const COLS = [["titulo", "Publicación"], ["dia", "Fecha"], ["tipo", "Formato"], ["vistas", "Vistas"], ["alcance", "Alcance"], ["interacciones", "Interacciones"], ["tasa", "Tasa"], ["likes", "Me gusta"], ["comentarios", "Coment."], ["guardados", "Guardados"], ["compartidos", "Compart."], ["ver3", "Pasó de 3 s"], ["segundos", "Segundos"]];
  function tabla() {
    const [k, asc] = E.orden;
    const ps = [...filtradas()].sort((a, b) => { const x = a[k] ?? -1, y = b[k] ?? -1; const r = typeof x === "string" || typeof y === "string" ? String(x).localeCompare(String(y), "es") : x - y; return asc ? r : -r; });
    const celda = (p, c) => (c === "titulo" ? el("button", { type: "button", "data-foco": `tb-${p.id}`, onclick: () => abrir(p), text: p.titulo }) : c === "dia" ? corta(p.dia) : c === "tipo" ? TIPO[p.tipo] : p[c] === null ? "No aplica" : fmt(c, p[c]));
    return el("section", { class: "seccion" },
      el("header", {}, el("h2", { text: "Todos los datos" }), el("p", { text: `Toca un encabezado para ordenar.${E.formato === "todos" ? "" : " Solo se muestra el formato elegido en Publicaciones."}` })), filtros(),
      el("div", { class: "tarjeta" }, el("div", { class: "desborde", tabindex: 0, role: "region", "aria-label": "Tabla de publicaciones" }, el("table", {},
        el("thead", {}, el("tr", {}, COLS.map(([c, n]) => el("th", { scope: "col", "aria-sort": c === k ? (asc ? "ascending" : "descending") : "none" }, el("button", { type: "button", "data-foco": `th-${c}`, "data-orden": c === k ? (asc ? "asc" : "desc") : null, onclick: () => { E.orden = c === k ? [c, !asc] : [c, c === "titulo"]; refrescar(); }, text: n }))))),
        el("tbody", {}, ps.map((p) => el("tr", {}, COLS.map(([c]) => el("td", {}, celda(p, c)))))))),
        el("div", { class: "controles", estilo: { margin: "16px 0 0" } }, el("button", { type: "button", class: "boton", "data-foco": "csv", onclick: () => bajar(ps), text: "Descargar en Excel (CSV)" })),
        el("details", { class: "datos" }, el("summary", { text: "Ver los datos por día" }), el("div", { class: "desborde" }, el("table", {},
          el("thead", {}, el("tr", {}, ["Día", "Vistas", "Alcance", "Cuentas que interactúan", "Ganados", "Perdidos", "Seguidores"].map((t) => el("th", { scope: "col", text: t })))),
          el("tbody", {}, tramo(E.desde, E.hasta).map((d) => el("tr", {}, [mayus(conDia(d.dia)), num(d.vistas), num(d.alcance), num(d.cuentas), num(d.ganados), num(d.perdidos), num(d.seguidores)].map((t) => el("td", { text: t }))))))))));
  }
  function bajar(ps) {
    const c = (v) => (typeof v === "number" ? String(v).replace(".", ",") : `"${String(v ?? "").replace(/"/g, '""')}"`);
    const filas = [[...COLS.map((x) => x[1]), "Enlace"], ...ps.map((p) => [...COLS.map(([k]) => p[k]), p.url])];
    const a = el("a", { href: URL.createObjectURL(new Blob(["﻿" + filas.map((f) => f.map(c).join(";")).join("\r\n")], { type: "text/csv" })), download: `mood-${I.id}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ───────── Ficha de una publicación
  function abrir(p) {
    ocultarTip();
    const ref = I.piezas.filter((x) => x.tipo === p.tipo && x.dia < I.desde && x.dia >= mas(I.desde, -30));
    const par = (t, v) => el("div", {}, el("dt", { text: t }), el("dd", { text: v }));
    const comp = ["vistas", "alcance", "tasa", "compartidos", ...(p.ver3 !== null ? ["ver3"] : [])].map((k) => {
      const med = mediana(ref.map((x) => x[k])), mx = Math.max(p[k], med) * 1.1 || 1;
      return el("div", { class: "fila" }, el("span", { class: "cab" }, el("span", { class: "t", text: k === "ver3" ? "Pasó de 3 segundos" : MEDIDAS[k] }), el("span", { class: "n", text: `${fmt(k, p[k])} frente a ${fmt(k, med)}` })),
        el("span", { class: "base" }, el("span", { estilo: { width: `${(100 * p[k]) / mx}%` } }), el("u", { estilo: { left: `${(100 * med) / mx}%` } })));
    });
    const f = $("ficha");
    f.replaceChildren(
      el("div", { class: "ficha-cab" }, el("p", { text: `${TIPO[p.tipo]}, ${conDia(p.dia)} a las ${p.hora}` }), el("h2", { id: "ficha-titulo", text: p.titulo }),
        el("button", { type: "button", class: "ficha-cerrar", "aria-label": "Cerrar", onclick: () => f.close(), text: "×" })),
      el("div", { class: "ficha-cuerpo" },
        p.enMedicion ? el("p", { class: "nota", estilo: { margin: 0 }, text: "Lleva menos de tres días publicada: sus cifras todavía pueden subir." }) : null,
        el("dl", { class: "pares" }, par("Vistas", num(p.vistas)), par("Personas", num(p.alcance)), par("Tasa", pct(p.tasa)), PARTES.map(([k, n]) => par(n, num(p[k]))), p.segundos !== null ? par("Tiempo promedio", `${dec(p.segundos)} s`) : null, p.nuevos !== null ? par("Seguidores nuevos", num(p.nuevos)) : null),
        ref.length >= 5 ? el("div", { class: "compara" }, el("h3", { text: `Frente a los demás ${p.tipo === "reel" ? "reels" : p.tipo === "carrusel" ? "carruseles" : "imágenes"}` }), comp, el("p", { class: "nota", estilo: { margin: 0 }, text: `La raya marca el valor típico (mediana) de ${ref.length} piezas de los 30 días anteriores al periodo, que llevan más tiempo sumando.` })) : null,
        p.texto ? el("div", { class: "copia", tabindex: 0, text: p.texto }) : null,
        el("a", { href: p.url, target: "_blank", rel: "noopener noreferrer", class: "boton", estilo: { "text-align": "center", "text-decoration": "none" }, text: "Ver en Instagram" })));
    f.showModal();
    f.scrollTop = 0;
  }
  $("ficha").addEventListener("click", (e) => { if (e.target === $("ficha")) $("ficha").close(); });

  // ───────── Pie y armado
  function lectura() {
    return el("section", { class: "seccion lectura" },
      el("h3", { text: "Cómo leer este informe" }),
      el("p", { text: `Fuente: Instagram de @mood.helados medido con Metricool. Datos capturados el ${larga(I.capturado)} de ${I.capturado.slice(0, 4)}. «Sin dato» significa que la herramienta no lo entregó, no que sea cero.` }),
      el("p", { text: "La comparación usa la misma cantidad de días justo antes del tramo elegido y el promedio diario, para que los días sin dato no la inclinen." }),
      el("p", { text: "No incluye el detalle de cada historia, la inversión en pauta, TikTok ni ventas. Las vistas de la cuenta sí suman lo que Instagram contó de historias y pauta." }),
      el("p", { text: `Taps de las islas: ${I.taps ? `contador de los stands, del ${rango(I.taps.desde, I.taps.hasta)}` : "todavía sin datos cargados"}. Fichas de Google: ${I.google ? `Perfil de Empresa de Google, capturado el ${larga(I.google.capturado)}` : "todavía sin conectar"}.` }));
  }
  const pie = () => $("pie").replaceChildren(logo("completo"), el("p", { text: "Preparado por BX3 para Mood." }));

  // ───────── Pregúntale a Mood: respuestas calculadas con los datos del informe, sin IA
  const norma = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
  function periodo() {
    const ds = diasConDato(), a = ds[0], b = ds.at(-1), n = tramo(a, b).length;
    return { a, b, pa: mas(a, -n), pb: mas(a, -1), piezas: piezasEn(a, b), dias: tramo(a, b) };
  }
  function cambio(m) {
    const P = periodo(), x = agregado(m, P.a, P.b), y = agregado(m, P.pa, P.pb);
    return { a: x, b: y, p: x.diario !== null && y.diario ? (100 * (x.diario - y.diario)) / y.diario : null };
  }
  const frase = (m, nombre) => {
    const c = cambio(m);
    if (c.a.valor === null) return `${nombre}: sin dato.`;
    const v = m === "alcance" || m === "cuentas" ? `${num(c.a.valor)} al día en promedio` : num(c.a.valor);
    return `${nombre}: ${v}${c.p === null ? "" : `, ${Math.round(c.p) === 0 ? "casi igual que" : c.p > 0 ? `subió ${dec(c.p, 0)} % frente a` : `bajó ${dec(-c.p, 0)} % frente a`} los días anteriores`}.`;
  };
  const tit = (p) => `«${p.titulo.replace(/«/g, "“").replace(/»/g, "”")}»`; // comillas internas distintas
  const sobre = () => { const P = periodo(); return `Del ${rango(P.a, P.b)}.`; };
  const aun = (p) => (p.enMedicion ? " Lleva menos de tres días publicada y todavía puede sumar." : "");
  const maxPor = (k, xs = periodo().piezas) => xs.filter((p) => p[k] !== null).sort((a, b) => b[k] - a[k])[0];
  function destacada(k, t, texto) {
    const p = maxPor(k);
    return p ? { t, p: [`${tit(p)} (${TIPO[p.tipo].toLowerCase()} del ${larga(p.dia)}): ${texto(p)}.${aun(p)}`], pieza: p, ir: ["publicaciones", "Ver publicaciones"] } : { t: "No hubo publicaciones en este periodo." };
  }
  const edadTop = () => { const e = I.audiencia.edad, tot = suma(e.map((f) => f.F + f.M + f.U)); return { tot, f: [...e].sort((a, b) => b.F + b.M + b.U - (a.F + a.M + a.U)).slice(0, 2), muj: (100 * suma(e.map((f) => f.F))) / tot, hom: (100 * suma(e.map((f) => f.M))) / tot }; };
  const tapsDe = () => ISLAS.map(([n]) => [n, suma(I.taps.filas.filter((f) => f.isla === n && f.dia >= I.desde && f.dia <= I.hasta).map((f) => f.cuenta))]).sort((a, b) => b[1] - a[1]);

  // Cada pregunta: texto sugerido, pistas para reconocerla (con su peso) y respuesta.
  const PREGUNTAS = [
    { id: "resumen", q: "¿Cómo nos fue esta quincena?", pistas: [[/como (nos|les|le) fue|como vamos|como estuvo|como va/, 3], [/resumen|en general|balance/, 3], [/quincena/, 1]], r: () => ({ t: sobre(), p: [frase("vistas", "Vistas"), frase("alcance", "Personas alcanzadas"), frase("interacciones", "Interacciones"), `Publicaciones: ${num(periodo().piezas.length)}.`], ir: ["resumen", "Ver el resumen"] }) },
    { id: "cambio", q: "¿Subimos o bajamos?", pistas: [[/subi|aument|crec|mejoramos/, 2], [/baj|cay|caid|disminu|empeor/, 2], [/compar|frente a|quincena pasada|semana pasada|antes|anterior/, 2]], r: () => {
      const P = periodo(), c = cambio("seguidores");
      return { t: `Comparado con el ${rango(P.pa, P.pb)}:`, p: [frase("vistas", "Vistas"), frase("alcance", "Personas alcanzadas"), frase("interacciones", "Interacciones"), frase("cuentas", "Cuentas que interactúan"), c.a.valor === null ? null : `Saldo de seguidores: ${signo(c.a.valor)} en ${c.a.n} días con dato${c.b.valor === null ? "" : `; antes, ${signo(c.b.valor)} en ${c.b.n}`}.`], ir: ["resumen", "Ver las cifras"] };
    } },
    { id: "porque", q: "¿Por qué cambiaron las cifras?", pistas: [[/por ?q|\bxq\b|a que se debe|causa|razon|motivo|explica/, 9]], r: () => (I.respuestas?.porque ? { t: "Lectura de BX3:", p: [I.respuestas.porque], ir: ["resumen", "Ver las cifras"] } : { t: "Los datos muestran cuánto cambió, pero no la causa.", p: ["Esa lectura te la da BX3. Lo que sí se ve: en «Recorrido» está qué se publicó cada día."], ir: ["recorrido", "Ver el recorrido"] }) },
    { id: "mejor", q: "¿Cuál publicación funcionó mejor?", pistas: [[/(mejor|mas vista|mas visto|gano|exitos|destac)/, 2], [/publicacion|reel|post|video|pieza|contenido|carrusel/, 2], [/funciono|gusto mas/, 2]], r: (t = "") => {
      const tipo = /reel|video/.test(t) ? "reel" : /carrusel/.test(t) ? "carrusel" : null;
      const xs = periodo().piezas.filter((p) => !tipo || p.tipo === tipo), v = maxPor("vistas", xs), k = maxPor("tasa", xs);
      return v ? { t: "Depende de cómo se mida:", p: [`La más vista: ${tit(v)}, con ${num(v.vistas)} vistas.${aun(v)}`, k === v ? `También tuvo la mayor tasa de interacción: ${pct(k.tasa)}.` : `La que más hizo reaccionar a quienes la vieron: ${tit(k)}, con ${pct(k.tasa)} de interacción.${aun(k)}`], pieza: v, ir: ["publicaciones", "Comparar todas"] } : { t: "No hubo publicaciones en este periodo." };
    } },
    { id: "menos", q: "¿Cuál se vio menos?", pistas: [[/peor|menos vist|menos funciono|funciono menos|vio menos|mas baj[ao]/, 4], [/publicacion|reel|post|pieza/, 1]], r: () => { const p = [...periodo().piezas].sort((a, b) => a.vistas - b.vistas)[0]; return p ? { t: `${tit(p)}`, p: [`Fue la menos vista: ${num(p.vistas)} vistas. Su tasa de interacción fue ${pct(p.tasa)}.${aun(p)}`], pieza: p, ir: ["publicaciones", "Comparar todas"] } : { t: "No hubo publicaciones en este periodo." }; } },
    { id: "compartio", q: "¿Qué compartió más la gente?", pistas: [[/compart/, 4]], r: () => destacada("compartidos", "Lo más compartido:", (p) => `${num(p.compartidos)} veces compartida`) },
    { id: "guardo", q: "¿Qué guardó más la gente?", pistas: [[/guard/, 4]], r: () => destacada("guardados", "Lo más guardado:", (p) => `${num(p.guardados)} veces guardada`) },
    { id: "comento", q: "¿Qué comentó más la gente?", pistas: [[/coment/, 4]], r: () => destacada("comentarios", "Lo más comentado:", (p) => `${num(p.comentarios)} comentarios`) },
    { id: "dia", q: "¿Qué día nos vieron más?", pistas: [[/(que|cual|mejor).*dia|pico|dia .*(mas|mejor)/, 4], [/vieron|vistas/, 1]], r: () => {
      const d = periodo().dias.filter((x) => x.vistas !== null).sort((a, b) => b.vistas - a.vistas)[0], ps = I.piezas.filter((p) => p.dia === d.dia);
      return { t: `${mayus(conDia(d.dia))}: ${num(d.vistas)} vistas.`, p: [ps.length ? `Ese día se publicó ${tit(ps[0])}. Coincidió con el pico, pero no se puede saber cuánto vino de esa pieza.` : "Ese día no hubo reels ni publicaciones."], pieza: ps[0], ir: ["recorrido", "Ver el recorrido"] };
    } },
    { id: "seguidores", q: "¿Cuántos seguidores ganamos?", pistas: [[/seguidor|followers/, 4], [/ganamos|perdimos|cuantos/, 1]], r: () => {
      const ds = periodo().dias, g = hay(ds.map((d) => d.ganados)), pe = hay(ds.map((d) => d.perdidos)), u = ds.filter((d) => d.seguidores !== null).at(-1);
      return { t: g.length ? `Ganamos ${num(suma(g))} y perdimos ${num(suma(pe))}: saldo de ${signo(suma(g) - suma(pe))}.` : "Sin dato de seguidores.", p: [g.length < ds.length ? `Hay dato de ${g.length} de ${ds.length} días.` : null, u ? `Total al ${larga(u.dia)}: ${num(u.seguidores)} seguidores.` : null], ir: ["resumen", "Ver las cifras"], mood: "seguidores" };
    } },
    { id: "quien", q: "¿Quién nos sigue?", pistas: [[/quien.*(sigue|ve)|quienes|audiencia|publico/, 4], [/edad|mujer|hombre|genero|años/, 4]], r: () => { const e = edadTop(); return { t: `${pct(e.muj, 0)} son mujeres y ${pct(e.hom, 0)} hombres.`, p: [`Las edades más fuertes: ${e.f.map((f) => `${f.edad} años (${pct((100 * (f.F + f.M + f.U)) / e.tot, 0)})`).join(" y ")}.`, "El resto no especifica su género en Instagram."], ir: ["audiencia", "Ver la audiencia"] }; } },
    { id: "donde", q: "¿De dónde son?", pistas: [[/donde|ciudad|pais|barranquilla|lugar/, 4]], r: () => { const c = I.audiencia.ciudades.slice(0, 4); return { t: `${c[0][0].split(",")[0]}: ${pct(c[0][1])} de los seguidores.`, p: [`Le siguen ${c.slice(1).map(([n, v]) => `${n.split(",")[0]} (${pct(v)})`).join(", ")}.`], ir: ["audiencia", "Ver la audiencia"] }; } },
    { id: "reels", q: "¿Se quedan viendo los reels?", pistas: [[/3 segundos|tres segundos|retencion|se quedan|quedaron|tiempo/, 4], [/reel|video/, 1]], r: () => { const rs = periodo().piezas.filter((p) => p.ver3 !== null), b = maxPor("ver3", rs); return rs.length ? { t: `En el reel típico, ${pct(mediana(rs.map((p) => p.ver3)))} de las vistas pasó de 3 segundos.`, p: [`El mejor: ${tit(b)}, con ${pct(b.ver3)}.`], pieza: b, ir: ["publicaciones", "Ver publicaciones"] } : { t: "No hubo reels en este periodo." }; } },
    { id: "cuantas", q: "¿Cuánto publicamos?", pistas: [[/cuant.*(public|reels|post|carrusel)/, 5]], r: () => { const ps = periodo().piezas, n = (t) => ps.filter((p) => p.tipo === t).length; return { t: `${num(ps.length)} publicaciones.`, p: [`Reels: ${n("reel")}. Carruseles: ${n("carrusel")}. Imágenes: ${n("imagen")}. Las historias no se cuentan.`], ir: ["publicaciones", "Verlas"] }; } },
    { id: "taps", q: "¿Qué isla tuvo más taps?", pistas: [[/tap|nfc|chip|stand|\bqr\b/, 5], [/isla|meridiem|buenavista|alegra/, 2]], r: () => { if (!I.taps?.filas.length) return { t: "Todavía no hay taps cargados.", p: ["Cuando estén, aparecerán aquí y en la pestaña Taps NFC."], ir: ["nfc", "Ver la pestaña"] }; const x = tapsDe(); return { t: `${x[0][0]}: ${num(x[0][1])} taps.`, p: [`${x.slice(1).map(([n, v]) => `${n}: ${num(v)}`).join(". ")}. Son toques, no personas.`], ir: ["nfc", "Ver los taps"] }; } },
    { id: "google", q: "¿Cómo nos ven en Google?", pistas: [[/google|maps|reseña|resena|ruta|como llegar|ficha/, 5]], r: () => { if (!I.google?.diario.length) return { t: "Las fichas de Google todavía no están conectadas.", p: ["Cuando lo estén, verás aquí cuánta gente las ve y cuánta pide la ruta."], ir: ["google", "Ver la pestaña"] }; const x = ISLAS.map(([n]) => { const f = I.google.diario.filter((q) => q.isla === n && q.dia >= I.desde && q.dia <= I.hasta); return [n, suma(f.map((q) => q.busqueda + q.maps)), suma(f.map((q) => q.ruta))]; }).sort((a, b) => b[1] - a[1]); return { t: `${x[0][0]} fue la más vista: ${num(x[0][1])} veces.`, p: x.map(([n, v, k]) => `${n}: ${num(v)} veces vista y ${num(k)} pidieron la ruta.`), ir: ["google", "Ver Google"] }; } },
    { id: "periodo", q: "¿De qué fechas son los datos?", pistas: [[/fecha|periodo|actualiz|hasta cuando|hasta que dia|de cuando|fuente|de donde sal/, 5]], r: () => ({ t: sobre(), p: [`Son datos de Instagram medidos con Metricool, capturados el ${larga(I.capturado)} de ${I.capturado.slice(0, 4)}.`], ir: ["datos", "Cómo leer el informe"] }) },
    { id: "dalcance", q: "¿Qué es el alcance?", pistas: [[/(que|signific|diferencia).*alcance|alcance.*(que es|signific)/, 6]], r: () => ({ t: "Alcance: personas distintas que vieron el contenido.", p: ["Si una persona ve lo mismo tres veces, cuenta una sola en alcance y tres en vistas."] }) },
    { id: "dvistas", q: "¿Qué son las vistas?", pistas: [[/(que son|signific).*vistas/, 6]], r: () => ({ t: "Vistas: cuántas veces se mostró el contenido.", p: ["Una misma persona puede sumar varias. Incluye reels, publicaciones, historias y perfil."] }) },
    { id: "dtasa", q: "¿Qué es la tasa de interacción?", pistas: [[/(que|signific).*(tasa|engagement)|(tasa|engagement).*(que es|signific)/, 6], [/tasa|engagement/, 3]], r: () => ({ t: "De cada 100 personas que vieron la pieza, cuántas interacciones hubo.", p: ["Sirve para comparar piezas que tuvieron alcances muy distintos."] }) },
    { id: "dinter", q: "¿Qué son las interacciones?", pistas: [[/(que son|signific).*interaccion/, 6], [/interaccion/, 1]], r: () => ({ t: "Me gusta, comentarios, guardados y compartidos, sumados.", p: [frase("interacciones", "En este periodo")], ir: ["publicaciones", "Ver de qué están hechas"] }) },
  ];
  const FUERA = [
    [/\bventas?\b|vend|factur|ingreso|\bplata\b|dinero|gananc|rentab/, "las ventas"], [/pauta|anuncio|invers|\bads\b|publicidad|promocion pag/, "la pauta ni la inversión"], [/historia|stories|story/, "el detalle de las historias"],
    [/tiktok|tik tok|facebook|youtube|whatsapp/, "otras redes"], [/competencia|competidor|otras marcas/, "a la competencia"], [/rappi|didi|domicilio|pedido/, "los pedidos a domicilio"], [/que hora|mejor hora|horario|cuando publicar/, "cuál es la mejor hora para publicar"],
  ];
  const SUGERIDAS = ["resumen", "cambio", "mejor", "compartio", "dia", "seguidores", "quien", "taps"];
  function responder(texto) {
    const t = norma(texto);
    if (!t) return null;
    if (/^(hola|buenas|buenos dias|buenas tardes|hey)\b/.test(t) && t.split(" ").length < 4) return { t: "¡Hola! Pregúntame por este informe.", sug: SUGERIDAS };
    if (/^(gracias|muchas gracias|listo|ok|vale|perfecto)\b/.test(t) && t.split(" ").length < 4) return { t: "¡Con gusto!", sug: SUGERIDAS };
    const f = FUERA.find(([re]) => re.test(t));
    if (f) return { t: `Este informe no mide ${f[1]}.`, p: ["Pregúntale a BX3."], sug: SUGERIDAS.slice(0, 4) };
    const puntos = PREGUNTAS.map((q) => [q, suma(q.pistas.map(([re, v]) => (re.test(t) ? v : 0)))]).sort((a, b) => b[1] - a[1]);
    if (puntos[0][1] < 2) return { t: "Eso no lo sé responder con este informe.", p: ["Pregúntale a BX3, o prueba con una de estas:"], sug: SUGERIDAS };
    if (puntos[0][1] === 2 && puntos[1][1] === 2) return { t: "¿Te refieres a una de estas?", sug: puntos.filter((x) => x[1] === 2).slice(0, 4).map((x) => x[0].id) };
    return puntos[0][0].r(t);
  }
  // ───────── IA: solo si hay servidor configurado en config.js; si falla, responde el asistente de siempre
  const IA = (() => {
    const url = (window.MOOD_IA?.url || "").replace(/\/$/, "");
    let historial = [];
    const guardar = (v) => { try { v ? localStorage.setItem("mood-acceso", v) : localStorage.removeItem("mood-acceso"); } catch { /* sin almacenamiento */ } IA_ACCESO = v || ""; };
    let IA_ACCESO = "";
    try { IA_ACCESO = localStorage.getItem("mood-acceso") || ""; } catch { /* sin almacenamiento */ }
    return {
      activa: () => Boolean(url),
      tieneAcceso: () => Boolean(IA_ACCESO),
      acceso: guardar,
      olvidar: () => { historial = []; },
      async preguntar(pregunta) {
        const corte = new AbortController(), reloj = setTimeout(() => corte.abort(), 30000);
        try {
          const res = await fetch(url, { method: "POST", signal: corte.signal, headers: { "Content-Type": "application/json", "X-Mood-Acceso": IA_ACCESO }, body: JSON.stringify({ informe: I.id, pregunta, historial }) });
          const d = await res.json().catch(() => ({}));
          if (res.ok && typeof d.respuesta === "string") { historial = [...historial, { pregunta, respuesta: d.respuesta }].slice(-4); return d; }
          return { error: d.error || "ia" };
        } catch { return { error: "conexion" }; } finally { clearTimeout(reloj); }
      },
    };
  })();
  const Asistente = (() => {
    const charla = el("div", { class: "as-charla", role: "log", "aria-live": "polite", "aria-label": "Conversación" });
    const entrada = el("input", { type: "text", id: "as-texto", maxlength: 300, autocomplete: "off", placeholder: "Escribe tu pregunta", "aria-label": "Escribe tu pregunta" });
    const ventana = el("section", { class: "as-ventana", role: "dialog", "aria-label": "Pregúntale a Mood", hidden: true },
      el("div", { class: "as-cab" }, el("img", { src: "img/muneco-pegatina.webp", alt: "", width: 157, height: 260 }), el("div", {}, el("b", { text: "Pregúntale a Mood" }), el("span", { text: IA.activa() ? "Lo que escribas lo responde una IA con este informe" : "Respondo solo con los datos de este informe" })), el("button", { type: "button", class: "as-cerrar", "aria-label": "Cerrar", onclick: () => cerrar(true), text: "×" })),
      charla,
      el("form", { class: "as-forma", onsubmit: (e) => { e.preventDefault(); const t = entrada.value.trim(); if (!t) return; entrada.value = ""; preguntar(t); } }, entrada, el("button", { type: "submit", text: "Enviar" })));
    const boton = el("button", { type: "button", class: "as-boton", "aria-expanded": "false", onclick: () => (ventana.hidden ? abrirV() : cerrar(true)) }, el("img", { src: "img/muneco-pegatina.webp", alt: "", width: 157, height: 260 }), el("span", { text: "Pregúntale a Mood" }));
    const chips = (ids) => el("div", { class: "as-chips" }, ids.map((id) => { const q = PREGUNTAS.find((x) => x.id === id); return el("button", { type: "button", onclick: () => preguntar(q.q, q), text: q.q }); }));
    const angosto = () => matchMedia("(max-width: 759px)").matches;
    function decir(a) {
      const acciones = [];
      if (a.pieza) acciones.push(el("button", { type: "button", onclick: () => abrir(a.pieza), text: "Abrir la publicación" }));
      if (a.ir && a.ir[0] !== "ninguna") acciones.push(el("button", { type: "button", onclick: () => { if (a.mood) E.mood = a.mood; if (a.ir[0] === "resumen") E.sub.resumen = "cifras"; ir(a.ir[0]); if (angosto()) cerrar(); }, text: a.ir[1] }));
      const g = el("div", { class: "as-msj" }, a.ia ? el("span", { class: "as-ia", text: "Respuesta de IA" }) : null, a.t ? el("b", { text: a.t }) : null, (a.p || []).filter(Boolean).map((t) => el("p", { text: t })), acciones.length ? el("div", { class: "as-acc" }, acciones) : null);
      charla.append(g, a.sug ? chips(a.sug) : "");
      return g;
    }
    let ocupado = false, pendiente = null;
    const MOTIVOS = { limite_dia: "Por hoy se acabaron las preguntas a la IA.", limite_hora: "Hiciste muchas preguntas seguidas a la IA. Intenta más tarde.", conexion: "No pude conectar con la IA.", informe: "La IA todavía no tiene este informe.", pregunta: "Esa pregunta es muy larga." };
    function pedirAcceso(t, fallo) {
      pendiente = t;
      const campo = el("input", { type: "password", autocomplete: "off", "aria-label": "Código de acceso", placeholder: "Código de acceso" });
      charla.append(el("div", { class: "as-msj" }, el("b", { text: fallo ? "Ese código no es válido." : "Para preguntarle a la IA necesitas un código." }),
        el("p", { text: "Te lo da BX3. La IA (Claude) lee este informe y tu pregunta para responder; puede equivocarse. No escribas datos personales." }),
        el("form", { class: "as-codigo", onsubmit: (e) => { e.preventDefault(); const v = campo.value.trim(); if (!v) return; IA.acceso(v); e.target.closest(".as-msj").remove(); const p = pendiente; pendiente = null; conIA(p); } }, campo, el("button", { type: "submit", text: "Continuar" })),
        el("div", { class: "as-acc" }, el("button", { type: "button", onclick: (e) => { e.target.closest(".as-msj").remove(); const p = pendiente; pendiente = null; sinIA(p); }, text: "Seguir sin IA" }))));
      charla.scrollTop = charla.scrollHeight;
      campo.focus();
    }
    function cerrarTurno(a, q) {
      if (!a.sug) charla.append(chips(SUGERIDAS.filter((id) => !q || id !== q.id).slice(0, 4)));
    }
    function sinIA(t, motivo) {
      const a = responder(t);
      if (!a) return;
      const g = decir(motivo ? { ...a, p: [...(a.p || []), `${motivo} Esta respuesta salió de las preguntas listas.`] } : a);
      cerrarTurno(a);
      g.scrollIntoView({ block: "nearest" });
    }
    async function conIA(t) {
      if (ocupado) return;
      if (!IA.tieneAcceso()) return pedirAcceso(t);
      ocupado = true;
      entrada.disabled = true;
      const id = I.id;
      const espera = el("div", { class: "as-msj as-piensa" }, "Revisando el informe", el("i"), el("i"), el("i"));
      charla.append(espera);
      charla.scrollTop = charla.scrollHeight;
      const d = await IA.preguntar(t);
      espera.remove();
      ocupado = false;
      entrada.disabled = false;
      if (id !== I.id) return; // cambió de informe mientras esperaba
      if (d.error === "acceso") { IA.acceso(""); return pedirAcceso(t, true); }
      if (d.error) return sinIA(t, MOTIVOS[d.error] || "La IA no está disponible en este momento.");
      const g = decir({ ia: true, p: [d.respuesta], pieza: I.piezas.find((p) => p.id === d.publicacion), ir: d.pestana && Object.hasOwn(VISTAS, d.pestana) ? [d.pestana, `Ver ${VISTAS[d.pestana][0]}`] : null });
      cerrarTurno({});
      g.scrollIntoView({ block: "nearest" });
      if (!angosto()) entrada.focus();
    }
    function preguntar(t, q) {
      if (ocupado) return;
      charla.querySelectorAll(".as-chips").forEach((c) => c.remove());
      const yo = el("div", { class: "as-yo", text: t });
      charla.append(yo);
      if (!q && IA.activa()) return conIA(t);
      const a = q ? q.r() : responder(t);
      if (!a) return;
      decir(a);
      cerrarTurno(a, q);
      charla.scrollTop = yo.offsetTop - charla.offsetTop - 8;
    }
    function saludar() {
      charla.replaceChildren();
      IA.olvidar();
      const P = periodo();
      decir({ t: "¡Hola! Soy el muñeco de Mood.", p: [`Puedo contarte qué pasó del ${rango(P.a, P.b)}. Toca una pregunta o escríbela.`], sug: SUGERIDAS });
    }
    function abrirV() { ventana.hidden = false; boton.setAttribute("aria-expanded", "true"); document.body.classList.add("as-abierto"); if (!angosto()) entrada.focus(); }
    function cerrar(foco) { ventana.hidden = true; boton.setAttribute("aria-expanded", "false"); document.body.classList.remove("as-abierto"); if (foco) boton.focus(); }
    ventana.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(true); });
    return { montar() { if (!boton.isConnected) document.body.append(boton, ventana); saludar(); } };
  })();

  // ───────── Pestañas
  const VISTAS = {
    resumen: ["Resumen", () => (E.sub.resumen === "hallazgos" ? [intro(), hallazgos()] : [intro(), filtros(true), cifras(), panelMood()])],
    recorrido: ["Recorrido", () => [recorrido()]],
    publicaciones: ["Publicaciones", () => [contenido()]],
    audiencia: ["Audiencia", () => [audiencia()]],
    nfc: ["Taps NFC", () => [nfc()]],
    google: ["Google", () => [google()]],
    datos: ["Datos", () => [tabla(), lectura()]],
  };
  let vista = "resumen";
  const deDireccion = () => { const v = location.hash.slice(1); return Object.hasOwn(VISTAS, v) ? v : "resumen"; };
  function pestanas() {
    const botones = Object.entries(VISTAS).map(([k, [n]]) => el("button", { type: "button", role: "tab", id: `tab-${k}`, "aria-controls": "contenido", onclick: () => ir(k), text: n }));
    $("pestanas").replaceChildren(...botones);
    $("pestanas").addEventListener("keydown", (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      e.preventDefault();
      const i = botones.indexOf(document.activeElement);
      const b = botones[(i + k + botones.length) % botones.length];
      b.focus(); b.click();
    });
  }
  function marcarPestana() {
    for (const b of $("pestanas").children) {
      const si = b.id === `tab-${vista}`;
      b.setAttribute("aria-selected", String(si));
      b.tabIndex = si ? 0 : -1;
      if (si) { const n = $("pestanas"); n.scrollTo({ left: b.offsetLeft - n.clientWidth / 2 + b.clientWidth / 2, behavior: "instant" }); }
    }
    $("contenido").setAttribute("aria-labelledby", `tab-${vista}`);
  }
  function ir(v) {
    if (v !== vista) { try { history.pushState(null, "", `#${v}`); } catch { /* abierto como archivo local */ } }
    vista = v;
    marcarPestana();
    refrescar();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  window.addEventListener("popstate", () => { if (!I) return; vista = deDireccion(); marcarPestana(); refrescar(); window.scrollTo({ top: 0, behavior: "instant" }); });

  function refrescar() {
    ocultarTip();
    const foco = document.activeElement?.dataset?.foco, y = scrollY;
    $("contenido").replaceChildren(...VISTAS[vista][1]().filter(Boolean));
    $("contenido").dataset.vista = vista;
    porMontar.splice(0).forEach((f) => f());
    window.scrollTo({ top: y, behavior: "instant" });
    if (foco) document.querySelector(`[data-foco="${CSS.escape(foco)}"]`)?.focus({ preventScroll: true });
  }
  const error = (t) => $("contenido").replaceChildren(el("p", { class: "estado", role: "alert", text: t }));
  function cargar(id) {
    const listo = () => {
      I = window.INFORMES?.[id];
      if (!I) return error("No se encontró este informe. Elige otro en la lista de arriba.");
      const ds = diasConDato();
      if (!ds.length) return error("Este informe todavía no tiene datos.");
      E = { desde: ds[0], hasta: ds.at(-1), comparar: true, mood: "vistas", dia: null, formato: "todos", medida: "vistas", ocultos: new Set(), sexos: new Set(), retencion: "ver3", lugar: "ciudades", sinPrimero: false, masLugares: false, orden: ["vistas", false], sub: { resumen: "cifras", publicaciones: "ranking" }, isla: "todas", tipoTap: "todos", medidaG: "vistas", mesG: null };
      document.title = `Mood en Instagram: ${I.titulo.toLowerCase()}`;
      pie();
      vista = deDireccion();
      $("pestanas").hidden = false;
      marcarPestana();
      refrescar();
      Asistente.montar();
    };
    if (window.INFORMES?.[id]) return listo();
    // La versión cambia cada 10 minutos para que nadie vea datos viejos guardados en su navegador.
    document.head.append(el("script", { src: `datos/${id}.js?v=${Math.floor(Date.now() / 6e5)}`, onload: listo, onerror: () => error("No se pudo cargar el informe. Revisa tu conexión e intenta de nuevo.") }));
  }
  pestanas();
  $("marca").replaceChildren(logo("logo"));
  const lista = window.INDICE || [];
  const sel = $("selector-informe");
  sel.replaceChildren(...lista.map((x) => el("option", { value: x.id, text: `${corta(x.desde)} al ${corta(x.hasta)} ${x.hasta.slice(0, 4)}` })));
  const pedido = new URLSearchParams(location.search).get("informe");
  const inicial = lista.some((x) => x.id === pedido) ? pedido : lista[0]?.id;
  if (!inicial) return error("Todavía no hay informes publicados.");
  sel.value = inicial;
  sel.addEventListener("change", () => { const u = new URL(location.href); u.searchParams.set("informe", sel.value); try { history.replaceState(null, "", u); } catch { /* abierto como archivo local */ } cargar(sel.value); });
  cargar(inicial);
})();
