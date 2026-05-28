// CONFIGURACIÓN OFICIAL Y EMBEBIDA CON TUS CREDENCIALES REALES
const sbUrl = 'https://gojnsrpxdbywixatmntc.supabase.co'; 
const sbKey = 'sb_publishable_85Lv8ASFg0qXIVTipNdnbA_fwbH-lq_'; 

window.sbClient = null;
window.productos = [];
window.indexSeleccionado = null;
window.html5QrcodeScanner = null;

const urlLogoPredeterminado = "https://gojnsrpxdbywixatmntc.supabase.co/storage/v1/object/public/logos/golochinas_logo.png";

function inicializarSupabase() {
    const supabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
    if (supabaseLib) {
        try {
            window.sbClient = supabaseLib.createClient(sbUrl, sbKey);
            window.cargarInventarioDesdeNube();
            configurarBuscadorInteligente();
        } catch (err) {
            console.error(err);
            modificarEstadoConexion("❌ ERR_INIT", "bg-red-600");
        }
    } else {
        modificarEstadoConexion("❌ SIN_CDN", "bg-red-600");
    }
}

window.addEventListener('DOMContentLoaded', inicializarSupabase);

function modificarEstadoConexion(texto, claseFondo) {
    const badge = document.getElementById('sync-status');
    if (badge) {
        badge.innerText = texto;
        badge.className = `text-[9px] ${claseFondo} text-white px-2 py-0.5 rounded font-black inline-block`;
    }
}

window.cargarInventarioDesdeNube = async function() {
    if (!window.sbClient) return;
    modificarEstadoConexion("⏳ ACTUALIZANDO...", "bg-yellow-500");
    try {
        const { data, error } = await window.sbClient.from('productos').select('*');
        if (error) {
            modificarEstadoConexion("❌ ERROR API", "bg-red-600");
            return;
        }
        window.productos = (data || []).map(p => ({
            id: p.id,
            Nombre: (p.descripcion || '').toUpperCase(),
            SKU: (p.codigo_barra || '').toUpperCase(),
            Cantidad: parseInt(p.stock) || 0,
            'Costo unitario': parseFloat(p.c_und) || 0,
            'Precio de venta': parseFloat(p.pvp_und) || 0,
            'Precio Venta Mayor ($)': redondearMayorArriba(parseFloat(p.pvp_und) || 0),
            catDetal: (p.cu_d === true || p.cu_d === "true" || p.cu_d === 1),
            catMayor: (p.cu_m === true || p.cu_m === "true" || p.cu_m === 1)
        })).sort((a, b) => a.Nombre.localeCompare(b.Nombre));
        
        modificarEstadoConexion("✅ CONECTADO", "bg-green-600");
        renderizarTabla(window.productos);
    } catch (err) {
        modificarEstadoConexion("❌ FALLO RED", "bg-red-600");
    }
};

function configurarBuscadorInteligente() {
    const buscador = document.getElementById('buscador');
    const listaSugerencias = document.getElementById('suggestions-list');
    if (!buscador || !listaSugerencias) return;

    buscador.addEventListener('input', (e) => {
        const q = e.target.value.toUpperCase().trim();
        listaSugerencias.innerHTML = '';

        if (q === '') {
            listaSugerencias.style.display = 'none';
            window.renderizarTabla(window.productos);
            return;
        }

        const coincidenciaExactaSKU = window.productos.find(p => p.SKU === q);
        if (coincidenciaExactaSKU) {
            window.seleccionarProductoReal(coincidenciaExactaSKU.id);
            buscador.value = '';
            listaSugerencias.style.display = 'none';
            return;
        }

        const filtrados = window.productos.filter(p => p.Nombre.includes(q) || p.SKU.includes(q));
        
        if (filtrados.length > 0) {
            filtrados.slice(0, 10).forEach(p => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerText = `${p.Nombre} [${p.SKU || 'SIN SKU'}]`;
                div.addEventListener('click', () => {
                    window.seleccionarProductoReal(p.id);
                    buscador.value = '';
                    listaSugerencias.style.display = 'none';
                });
                listaSugerencias.appendChild(div);
            });
            listaSugerencias.style.display = 'block';
        } else {
            listaSugerencias.style.display = 'none';
        }

        window.renderizarTabla(filtrados);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== buscador) listaSugerencias.style.display = 'none';
    });
}

function redondearMayorArriba(pvp) { return Math.ceil((pvp * 0.95) * 100) / 100; }

window.procesarDesgloseAutomatico = function() {
    const base = parseFloat(document.getElementById('calc-costo-base').value) || 0;
    const iva = parseFloat(document.getElementById('calc-iva-tipo').value) || 0;
    const total = base * (1 + iva);
    document.getElementById('calc-costo-total-iva').value = total.toFixed(2);
    const unidades = parseInt(document.getElementById('calc-unidades-internas').value) || 1;
    document.getElementById('form-costo').value = (total / unidades).toFixed(6);
    window.calcularMargenesSugeridos();
    window.calcularMargenManual();
};

window.calcularMargenesSugeridos = function() {
    const c = parseFloat(document.getElementById('form-costo').value) || 0;
    document.getElementById('sug-min').innerText = c > 0 ? (c / 0.70).toFixed(2) : '0.00';
    document.getElementById('sug-max').innerText = c > 0 ? (c / 0.65).toFixed(2) : '0.00';
};

window.calcularMargenManual = function() {
    const c = parseFloat(document.getElementById('form-costo').value) || 0;
    const pvp = parseFloat(document.getElementById('form-pvp').value) || 0;
    const lbl = document.getElementById('lbl-margen-form');
    if (pvp > 0 && lbl) {
        const m = (((pvp - c) / pvp) * 100).toFixed(1);
        lbl.innerText = m + "%";
        lbl.className = m < 15 ? "text-md font-black text-red-600" : "text-md font-black text-green-600";
        document.getElementById('form-pvp-mayor').value = redondearMayorArriba(pvp).toFixed(2);
    }
};

window.limpiarFormularioEdicion = function() {
    window.indexSeleccionado = null;
    ['form-nombre', 'form-sku', 'form-costo', 'calc-costo-base', 'calc-costo-total-iva', 'form-pvp', 'form-pvp-mayor', 'form-cantidad'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('cat-detal').checked = true;
    document.getElementById('cat-mayor').checked = false;
    document.getElementById('sug-min').innerText = '0.00';
    document.getElementById('sug-max').innerText = '0.00';
    if(document.getElementById('lbl-margen-form')) document.getElementById('lbl-margen-form').innerText = '0.0%';
};

function renderizarTabla(lista) {
    const cuerpo = document.getElementById('cuerpo-tabla');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';
    let totalInv = 0;
    
    if (lista.length === 0) {
        cuerpo.innerHTML = `<tr><td colspan="9" class="text-center p-8 text-gray-400">Sin resultados en el inventario.</td></tr>`;
        return;
    }

    lista.forEach((p) => {
        totalInv += (p['Costo unitario'] * p.Cantidad);
        const m = p['Precio de venta'] > 0 ? (((p['Precio de venta'] - p['Costo unitario']) / p['Precio de venta']) * 100).toFixed(1) : 0;
        const clMargen = m < 15 ? 'margen-alerta' : 'margen-excelente';
        
        cuerpo.innerHTML += `
            <tr onclick="window.seleccionarProductoReal('${p.id}')">
                <td class="font-bold">${p.Nombre}</td>
                <td class="text-center">${p.SKU || 'N/A'}</td>
                <td class="text-right font-black">${p.Cantidad}</td>
                <td class="text-right font-mono">$${p['Costo unitario'].toFixed(2)}</td>
                <td class="text-right font-mono text-blue-800">$${p['Precio de venta'].toFixed(2)}</td>
                <td class="text-right font-mono text-orange-700">$${p['Precio Venta Mayor ($)'].toFixed(2)}</td>
                <td class="text-center"><span class="${clMargen}">${m}%</span></td>
                <td class="text-center">
                    ${p.catDetal ? '<span class="price-box box-detal">D</span>' : ''}
                    ${p.catMayor ? '<span class="price-box box-mayor">M</span>' : ''}
                </td>
                <td class="text-center">
                    <div class="flex gap-1 justify-center" onclick="event.stopPropagation();">
                        <button onclick="window.imprimirEtiquetaUnica('${p.id}')" class="bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] px-2 py-1 rounded shadow uppercase">🏷️ ETIQUETA</button>
                        <button onclick="window.eliminarProductoReal('${p.id}')" class="bg-red-600 hover:bg-red-700 text-white font-black text-[9px] px-2 py-1 rounded shadow uppercase">X</button>
                    </div>
                </td>
            </tr>`;
    });
    document.getElementById('lbl-total-inv').innerText = totalInv.toFixed(2);
}

window.seleccionarProductoReal = function(id) {
    const idx = window.productos.findIndex(p => p.id === id);
    if (idx === -1) return;
    window.indexSeleccionado = idx;
    const p = window.productos[idx];
    
    document.getElementById('form-nombre').value = p.Nombre;
    document.getElementById('form-sku').value = p.SKU;
    document.getElementById('form-cantidad').value = p.Cantidad;
    document.getElementById('form-costo').value = p['Costo unitario'];
    document.getElementById('form-pvp').value = p['Precio de venta'];
    document.getElementById('cat-detal').checked = p.catDetal;
    document.getElementById('cat-mayor').checked = p.catMayor;
    
    window.calcularMargenManual();
    window.calcularMargenesSugeridos();
    document.getElementById('formulario-edicion').scrollIntoView({ behavior: 'smooth' });
};

window.activarEscanerCamara = function() {
    document.getElementById('contenedor-lector-camara').classList.remove('hidden');
    document.getElementById('start-scan-btn').classList.add('hidden');
    document.getElementById('stop-scan-btn').classList.remove('hidden');

    window.html5QrcodeScanner = new Html5Qrcode("reader");
    window.html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 280, height: 160 } },
        (decodedText) => {
            const codigo = String(decodedText).trim().toUpperCase();
            document.getElementById('form-sku').value = codigo;
            const existente = window.productos.find(p => p.SKU === codigo);
            if(existente) { window.seleccionarProductoReal(existente.id); }
            window.detenerEscanerCamara();
        },
        () => {}
    ).catch(() => {
        alert("No se pudo iniciar la cámara.");
        window.detenerEscanerCamara();
    });
};

window.detenerEscanerCamara = function() {
    if (window.html5QrcodeScanner) {
        window.html5QrcodeScanner.stop().then(() => {
            window.html5QrcodeScanner = null;
            document.getElementById('contenedor-lector-camara').classList.add('hidden');
            document.getElementById('start-scan-btn').classList.remove('hidden');
            document.getElementById('stop-scan-btn').classList.add('hidden');
        }).catch(() => {});
    }
};

window.guardarCambiosProducto = async function(imprimir = false) {
    if (!window.sbClient) return;
    
    const nombre = document.getElementById('form-nombre').value.toUpperCase().trim();
    if(!nombre) { alert("Por favor, introduce el Nombre del Producto."); return; }

    const payload = {
        descripcion: nombre,
        codigo_barra: document.getElementById('form-sku').value.toUpperCase().trim(),
        stock: parseInt(document.getElementById('form-cantidad').value) || 0,
        c_und: parseFloat(document.getElementById('form-costo').value) || 0,
        pvp_und: parseFloat(document.getElementById('form-pvp').value) || 0,
        cu_d: document.getElementById('cat-detal').checked,
        cu_m: document.getElementById('cat-mayor').checked
    };
    
    if (window.indexSeleccionado !== null) {
        payload.id = window.productos[window.indexSeleccionado].id;
    }
    
    modificarEstadoConexion("⏳ GUARDANDO...", "bg-yellow-500");
    const { data, error } = await window.sbClient.from('productos').upsert([payload]).select();
    
    if(!error) {
        await window.cargarInventarioDesdeNube();
        if (imprimir && data && data.length > 0) {
            window.imprimirEtiquetaUnica(data[0].id);
        } else {
            alert("✅ Guardado exitosamente en la nube.");
        }
        window.limpiarFormularioEdicion();
    } else {
        alert("❌ Error al guardar datos: " + error.message);
        window.cargarInventarioDesdeNube();
    }
};

window.accionGuardarYImprimir = () => window.guardarCambiosProducto(true);

window.imprimirEtiquetaUnica = function(id) {
    const p = window.productos.find(prod => prod.id === id);
    if (!p) return;
    
    document.body.className = "imprimiendo-etiqueta";
    const area = document.getElementById('area-impresion');
    
    const fecha = new Date();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const ano = fecha.getFullYear();
    const fechaImpresion = `${mes}/${ano}`;
    
    area.innerHTML = `
        <div class="etiqueta-pro">
            <img src="${urlLogoPredeterminado}" style="display:block; margin:0 auto 10px auto; max-height:90px; object-fit:contain;">
            <div class="etiqueta-nombre">${p.Nombre}</div>
            <div class="etiqueta-precio">$${p['Precio de venta'].toFixed(2)}</div>
            <div style="font-size: 14px; font-weight: 900; margin-top: -2px; margin-bottom: 2px; text-transform: uppercase;">CALCULADO A BCV</div>
            <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">${fechaImpresion}</div>
        </div>
    `;
    window.print();
    setTimeout(() => { document.body.className = ""; area.innerHTML = ""; }, 500);
};

window.generarCatDetal = function() {
    const filtrados = window.productos.filter(p => p.catDetal);
    if(filtrados.length === 0) { alert("No hay productos habilitados para Detal."); return; }
    
    document.body.className = "imprimiendo-catalogo";
    const area = document.getElementById('area-impresion');
    
    let html = `<div class="contenedor-listado"><div class="titulo-listado">Golochinas 289 - Catálogo Detal</div><div class="listado-columnas">`;
    html += `<table class="cat-tabla"><thead><tr><th>Descripción / Artículo</th><th>Precio Detal</th></tr></thead><tbody>`;
    filtrados.forEach(p => {
        html += `<tr><td>${p.Nombre}</td><td class="cat-precio-destaque">$${p['Precio de venta'].toFixed(2)}</td></tr>`;
    });
    html += `</tbody></table></div></div>`;
    
    area.innerHTML = html;
    window.print();
    setTimeout(() => { document.body.className = ""; area.innerHTML = ""; }, 500);
};

window.generarCatMayor = function() {
    const filtrados = window.productos.filter(p => p.catMayor);
    if(filtrados.length === 0) { alert("No hay productos habilitados para Mayor."); return; }
    
    document.body.className = "imprimiendo-catalogo";
    const area = document.getElementById('area-impresion');
    
    let html = `<div class="contenedor-listado"><div class="titulo-listado">Golochinas 289 - Listado de Mayor</div><div class="listado-columnas">`;
    html += `<table class="cat-tabla"><thead><tr><th>Descripción / Artículo</th><th>Precio Mayor</th></tr></thead><tbody>`;
    filtrados.forEach(p => {
        html += `<tr><td>${p.Nombre}</td><td class="cat-precio-destaque">$${p['Precio Venta Mayor ($)'].toFixed(2)}</td></tr>`;
    });
    html += `</tbody></table></div></div>`;
    
    area.innerHTML = html;
    window.print();
    setTimeout(() => { document.body.className = ""; area.innerHTML = ""; }, 500);
};

window.eliminarProductoReal = async function(id) {
    if (!window.sbClient) return;
    const p = window.productos.find(prod => prod.id === id);
    if (confirm(`¿Eliminar permanentemente del inventario en la nube?\n\n${p.Nombre}`)) {
        await window.sbClient.from('productos').delete().eq('id', id);
        window.cargarInventarioDesdeNube();
    }
};

window.eliminarTodoSupabaseOpcion = async function(silencioso = false) {
    if (!window.sbClient) return false;
    if (!silencioso) {
        if (!confirm("⚠️ ¿Estás seguro de borrar TODO el inventario de la nube? Esto no se puede deshacer.")) return false;
    }
    const { error } = await window.sbClient.from('productos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && !silencioso) alert("Error al vaciar nube: " + error.message);
    return !error;
};

window.limpiarTodoElSistema = () => { if(confirm("¿Limpiar vista de datos local?")) { window.productos = []; renderizarTabla([]); } };

window.sincronizarDesdeGoogleSheets = async function() {
    if (!window.sbClient) return;
    let url = localStorage.getItem('golochinas_sheets_url');
    if (url) {
        const cambiarEnlace = confirm("¿Usar el Google Sheet guardado anteriormente?\n\n(Cancelar si deseas registrar uno nuevo)");
        if (!cambiarEnlace) url = null;
    }
    if (!url) {
        url = prompt("Introduce el enlace largo de Google Sheet publicado como CSV:");
        if (!url) return;
        localStorage.setItem('golochinas_sheets_url', url);
    }
    
    modificarEstadoConexion("⏳ LEYENDO GOOGLE SHEETS...", "bg-yellow-500");
    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error();
        const csvTexto = await respuesta.text();
        
        const workbook = XLSX.read(csvTexto, {type: 'string'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        const loteProductos = json.map(item => ({
            descripcion: String(item.Nombre || '').trim().toUpperCase(),
            codigo_barra: item.SKU ? String(item.SKU).trim().toUpperCase() : null,
            stock: parseInt(item.Stock) || 0,
            c_und: parseFloat(item.Costo) || 0,
            pvp_und: parseFloat(item.PVP) || 0,
            cu_d: item.EsDetal ? (String(item.EsDetal).toLowerCase() === 'si') : true,
            cu_m: item.EsMayor ? (String(item.EsMayor).toLowerCase() === 'si') : false
        })).filter(p => p.descripcion !== "");

        if (loteProductos.length === 0) {
            alert("⚠️ Archivo vacío.");
            window.cargarInventarioDesdeNube();
            return;
        }

        modificarEstadoConexion("⏳ REEMPLAZANDO NUBE...", "bg-yellow-500");
        
        const exitoVaciar = await window.eliminarTodoSupabaseOpcion(true);
        if (!exitoVaciar) {
            alert("❌ Error de seguridad al limpiar la base de datos previa.");
            window.cargarInventarioDesdeNube();
            return;
        }

        const { error } = await window.sbClient.from('productos').insert(loteProductos);
        if (!error) alert(`🎉 ¡Sincronización Perfecta! Tu nube tiene exactamente los ${loteProductos.length} productos de Google Sheets.`);
        else alert("❌ Error al insertar: " + error.message);
        await window.cargarInventarioDesdeNube();
    } catch (err) {
        alert("❌ Error de lectura.");
        window.cargarInventarioDesdeNube();
    }
};

window.sincronizarInventario = function(event) {
    const file = event.target.files[0];
    if (!file || !window.sbClient) return;
    modificarEstadoConexion("⏳ PROCESANDO EXCEL...", "bg-yellow-500");
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            
            const loteProductos = json.map(item => ({
                descripcion: String(item.Nombre || '').trim().toUpperCase(),
                codigo_barra: item.SKU ? String(item.SKU).trim().toUpperCase() : null,
                stock: parseInt(item.Stock) || 0,
                c_und: parseFloat(item.Costo) || 0,
                pvp_und: parseFloat(item.PVP) || 0,
                cu_d: item.EsDetal ? (String(item.EsDetal).toLowerCase() === 'si') : true,
                cu_m: item.EsMayor ? (String(item.EsMayor).toLowerCase() === 'si') : false
            })).filter(p => p.descripcion !== "");

            await window.eliminarTodoSupabaseOpcion(true);

            const { error } = await window.sbClient.from('productos').insert(loteProductos);
            if (!error) alert(`🎉 ¡Excel Cargado! Se reemplazó la nube con tus ${loteProductos.length} artículos nuevos.`);
            else alert("❌ Error: " + error.message);
            await window.cargarInventarioDesdeNube();
        } catch (err) { 
            alert("❌ Error crítico.");
            window.cargarInventarioDesdeNube();
        }
    };
    reader.readAsArrayBuffer(file);
};

window.descargarInventario = function() {
    if (window.productos.length === 0) return;
    const data = window.productos.map(p => ({
        Nombre: p.Nombre, SKU: p.SKU, Stock: p.Cantidad, Costo: p['Costo unitario'], PVP: p['Precio de venta'], EsDetal: p.catDetal ? 'si':'no', EsMayor: p.catMayor ? 'si':'no'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Inventario_Golochinas.xlsx");
};