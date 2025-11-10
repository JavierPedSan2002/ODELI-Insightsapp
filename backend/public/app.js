// --- Variables Globales ---
const BASE_URL = 'https://unlegal-adina-nonmaterialistically.ngrok-free.dev';
const API_URL = `${BASE_URL}/api/respuestas`;

let satisfaccionChart;    // Instancia del gráfico de barras
let donutChart;           // Instancia del gráfico donut (nivel global)
let mostrandoDonut = false; // Indica qué gráfico está visible

const preguntas = [
  "La información que recibo de mi equipo y líderes es clara y suficiente para realizar mi trabajo",
  "Mi jefe o líder me proporciona orientación y apoyo adecuado para cumplir mis responsabilidades",
  "Mis relaciones con mis compañeros son respetuosas,colaborativas y libres de conflictos frecuentes.",
  "Me siento motivado(a) y comprometido(a) con las tareas y objetivos de mi puesto.",
  "Mi entorno laboral promueve mi bienestar emocional y me permite expresar mis necesiades sin temor.",
  "Los roles, funciones y procesos de mi área están claramente definidos y facilitan mi desempeño.",
  "Mi esfuerzo y contribución son reconocidos y existen oportunidades de desarrollo profesional.",
  "Cuento con los recursos y herramientas necesarias para desempeñar mi trabajo de manera eficiente y segura.",
  "Mi carga de trabajo es adecuada y me permite cumplir mis tareas sin generar estrés excesivo.",
  "Me siento seguro(a) de proponer ideas, mejoras o expresar mi opinión sobre los procesos y proyectos."
];

const opciones = ["Muy Mal", "Mal", "Regular", "Bien", "Excelente"];

/* ===================================
   GESTIÓN DE VISTAS (SPA)
   =================================== */
function handleView(viewId) {
  // Ocultar todas las vistas
  document.querySelectorAll('.content-view').forEach(section => section.classList.add('hidden'));

  // Mostrar la solicitada
  const activeSection = document.getElementById(viewId);
  if (activeSection) activeSection.classList.remove('hidden');

  // Actualizar el nav (activo)
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active-nav', 'bg-gray-700'));
  const activeLink = document.querySelector(`[data-view="${viewId}"]`);
  if (activeLink) activeLink.classList.add('active-nav', 'bg-gray-700');

  // Cargar datos solo cuando corresponde
  if (viewId === 'grafico') fetchAndRenderAnalytics();
  if (viewId === 'tabulado') fetchAndRenderTabulated();
}

/* ===================================
   GENERACIÓN DE PREGUNTAS
   =================================== */
function generarPreguntas() {
  const preguntasDiv = document.getElementById('preguntas');
  if (!preguntasDiv) return;
  preguntasDiv.innerHTML = '';

  preguntas.forEach((pregunta, index) => {
    const qId = `q${index + 1}`;
    let optionsHtml = '';

    opciones.forEach((opcion, i) => {
      const value = i + 1;
      const optionId = `${qId}-${value}`;
      // Mantengo required en los radios pero lo dejo en el primer radio del grupo
      // (HTML5 trata required por grupo si todos comparten name)
      optionsHtml += `
        <div class="flex items-center justify-center p-2">
          <input type="radio" id="${optionId}" name="${qId}" value="${value}" ${i === 0 ? 'required' : ''} class="custom-radio-input" />
          <label for="${optionId}" title="${opcion}" class="custom-radio-label"></label>
          <span class="md:hidden ml-2 text-sm text-gray-600">${opcion}</span>
        </div>`;
    });

    const row = document.createElement('div');
    row.classList.add('question-row', 'grid', 'grid-cols-1', 'md:grid-cols-[1.5fr_3fr]', 'gap-4', 'py-4', 'items-center', 'rounded-lg');
    row.innerHTML = `
      <div class="font-medium text-gray-700 pl-1">
        <span class="text-primary-blue font-semibold mr-2">${index + 1}.</span> ${pregunta}
      </div>
      <div class="grid grid-cols-5 md:gap-2">${optionsHtml}</div>`;
    preguntasDiv.appendChild(row);
  });
}

/* ===================================
   AUXILIARES PARA LEER PREGUNTAS ABIERTAS
   =================================== */
function collectOpenAnswers() {
  // Intentamos leer desde el formulario de preguntas abiertas si existe
  const abiertasForm = document.getElementById('abiertasForm');
  const abiertas = [];

  if (abiertasForm) {
    // Tomamos todos los textareas dentro de ese formulario
    const textareas = abiertasForm.querySelectorAll('textarea');
    textareas.forEach((ta, idx) => {
      const val = ta.value ? ta.value.trim() : '';
      if (val) {
        // Si el textarea tiene un name lo usamos, si no generamos una etiqueta genérica
        const label = ta.name ? ta.name : `abierta_${idx + 1}`;
        abiertas.push({ pregunta: label, respuestaAbierta: val });
      }
    });
  }

  // También permitimos IDs específicos (por compatibilidad con versiones previas)
  // (ejemplo: 'pregunta1-abierta', 'pregunta2-abierta')
  const fallbackIds = ['pregunta1-abierta', 'pregunta2-abierta'];
  fallbackIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value && el.value.trim()) {
      abiertas.push({ pregunta: id, respuestaAbierta: el.value.trim() });
    }
  });

  return abiertas;
}

/* ===================================
   ENVIAR ENCUESTA
   =================================== */
async function sendSurvey(form) {
  const submitButton = form.querySelector('button[type="submit"]');
  const MENSAJE_DIV = document.getElementById('mensaje');

  if (submitButton) submitButton.disabled = true;
  MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-gray-700 bg-yellow-50 border border-yellow-200';
  MENSAJE_DIV.textContent = `Enviando datos a ${API_URL}...`;

  // Datos básicos
  const empleado = form.elements['empleado'] ? form.elements['empleado'].value.trim() : '';
  const departamento = form.elements['departamento'] ? form.elements['departamento'].value : '';

  // Validación mínima campos obligatorios
  if (!empleado || !departamento) {
    MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
    MENSAJE_DIV.textContent = "Por favor complete Nombre y Departamento antes de enviar.";
    if (submitButton) submitButton.disabled = false;
    return;
  }

  // Respuestas cerradas (radio buttons)
  const respuestas = preguntas.map((pregunta, index) => {
    const questionName = `q${index + 1}`;
    const selectedInput = form.querySelector(`input[name="${questionName}"]:checked`);
    if (!selectedInput) return null;

    const valorNumerico = parseInt(selectedInput.value, 10);
    const opcionTexto = opciones[valorNumerico - 1];

    return { pregunta, valor: valorNumerico, opcion: opcionTexto };
  }).filter(r => r !== null);

  // Validación: todas las preguntas cerradas deben tener respuesta
  if (respuestas.length !== preguntas.length) {
    MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
    MENSAJE_DIV.textContent = "¡Atención! Por favor, responda todas las preguntas cerradas antes de enviar.";
    if (submitButton) submitButton.disabled = false;
    return;
  }

  // Respuestas abiertas: las recogemos desde el formulario de abiertas (si existe)
  const abiertas = collectOpenAnswers();

  // Construcción final del payload
  const todasLasRespuestas = [...respuestas, ...abiertas];
  const data = { empleado, departamento, respuestas: todasLasRespuestas, fechaEnvio: new Date().toISOString() };

  try {
    // Enviar
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // Leer respuesta de forma segura (puede no ser JSON)
    let resultText = '';
    try {
      resultText = await res.text();
      // Intentar parsear JSON si parece JSON
      try {
        resultText = JSON.parse(resultText);
      } catch (e) {
        // si no parsea, lo dejamos como texto plano
      }
    } catch (e) {
      // no pasa nada
    }

    if (res.ok) {
      MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-green-700 bg-green-100 border border-green-300';
      const okMessage = (resultText && resultText.mensaje) ? resultText.mensaje : "✅ Encuesta enviada con éxito.";
      MENSAJE_DIV.textContent = okMessage;

      // limpiar: formulario y textareas abiertas
      form.reset();
      // limpiar textareas del formulario de abiertas si existen
      const abiertasForm = document.getElementById('abiertasForm');
      if (abiertasForm) {
        abiertasForm.querySelectorAll('textarea').forEach(t => t.value = '');
        // opcional: resetear nombres/selecciones si los hubiera
        abiertasForm.reset && abiertasForm.reset();
      }

      // regenerar preguntas (vuelve a renderizar radios) para evitar problemas con estados previos
      generarPreguntas();

      // No cambiar la vista automáticamente (evita "brincar" a otra sección).
      // En lugar de eso, ponemos el foco en el primer campo para buena UX
      const firstInput = document.querySelector('#encuestaForm input, #encuestaForm select, #encuestaForm textarea');
      if (firstInput) firstInput.focus();
    } else {
      MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
      const errMessage = (resultText && resultText.mensaje) ? resultText.mensaje : `❌ Error ${res.status}: Fallo al enviar los datos.`;
      MENSAJE_DIV.textContent = errMessage;
      console.error('Error del servidor:', resultText);
    }
  } catch (err) {
    MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
    MENSAJE_DIV.textContent = `❌ Error de conexión. Revise que el servidor y ngrok estén activos.`;
    console.error("Error al enviar la encuesta:", err);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

/* ===================================
   ENVÍO DEL FORMULARIO (handler ligado al submit)
   =================================== */
async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  await sendSurvey(form);
}

/* ===================================
   CÁLCULO DE PROMEDIOS
   =================================== */
function calculateAverages(data) {
  if (!data || data.length === 0) return [];

  const questionSums = new Array(preguntas.length).fill(0);
  const questionCounts = new Array(preguntas.length).fill(0);

  data.forEach(survey => {
    if (!Array.isArray(survey.respuestas)) return;
    survey.respuestas.forEach(r => {
      // r.pregunta debe coincidir con item en preguntas
      const index = preguntas.indexOf(r.pregunta);
      if (index === -1) return;
      // Solo sumar si existe valor numérico
      if (typeof r.valor === 'number') {
        questionSums[index] += r.valor;
        questionCounts[index] += 1;
      }
    });
  });

  return preguntas.map((pregunta, index) => {
    const count = questionCounts[index];
    const avg = count > 0 ? (questionSums[index] / count) : 0;
    return { pregunta: `${index + 1}. ${pregunta.substring(0, 40)}...`, promedio: parseFloat(avg.toFixed(2)) };
  });
}

/* Función auxiliar para calcular el promedio general (externa a calculateAverages) */
function calcularPromedioGeneral(averages) {
  if (!averages || averages.length === 0) return 0;
  const suma = averages.reduce((acc, a) => acc + (a.promedio || 0), 0);
  return parseFloat((suma / averages.length).toFixed(2));
}

/* ===================================
   PROMEDIO POR DEPARTAMENTO
   =================================== */
function calculateAveragesByDept(data) {
  if (!data || data.length === 0) return {};

  const deptData = {};
  data.forEach(survey => {
    const dept = survey.departamento || 'N/A';
    if (!deptData[dept]) deptData[dept] = Array(preguntas.length).fill(0).map(() => ({ sum: 0, count: 0 }));

    if (!Array.isArray(survey.respuestas)) return;
    survey.respuestas.forEach((r) => {
      const idx = preguntas.indexOf(r.pregunta);
      if (idx !== -1 && typeof r.valor === 'number') {
        deptData[dept][idx].sum += r.valor;
        deptData[dept][idx].count += 1;
      }
    });
  });

  const result = {};
  for (const dept in deptData) {
    result[dept] = deptData[dept].map(q => q.count > 0 ? parseFloat((q.sum / q.count).toFixed(2)) : 0);
  }
  return result;
}

/* ===================================
   DIBUJAR GRÁFICO DE BARRAS
   =================================== */
  function renderChart(averages, averagesByDept = {}) {
    const canvas = document.getElementById('satisfaccionChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (satisfaccionChart) satisfaccionChart.destroy();

    const labels = averages.map(a => a.pregunta);
    const datasets = [{
      label: 'Promedio General',
      data: averages.map(a => a.promedio),
      backgroundColor: averages.map(v => v.promedio >= 4 ? '#2563eb' : v.promedio >= 3 ? '#7e22ce' : '#f97316')
    }];

    // Incluir promedios por departamento como datasets opcionales (si existen)
    for (const dept in averagesByDept) {
      datasets.push({
        label: `Depto: ${dept}`,
        data: averagesByDept[dept],
        backgroundColor: averagesByDept[dept].map(val => val >= 4 ? '#00c853' : val >= 3 ? '#ffeb3b' : '#ff1744')
      });
    }

    satisfaccionChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false, // importante para que ocupe todo el contenedor
        scales: {
          y: { beginAtZero: true, max: 5, title: { display: true, text: 'Promedio de Calificación' } },
          x: { display: true }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: { label: (ctx) => `Promedio: ${ctx.parsed.y}` }
          },
          title: {
            display: true,
            text: 'Calificación Promedio por Pregunta'
          }
        }
      }
    });
  }

  /* ===================================
    RENDER DONUT (NIVEL GLOBAL)
    =================================== */
  function renderDonutChart(promedioGeneral) {
    const canvas = document.getElementById('promedioPieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (donutChart) donutChart.destroy();

    const restante = Math.max(0, 5 - promedioGeneral);

    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Nivel Global de Satisfacción', 'Restante hasta 5'],
        datasets: [{
          data: [promedioGeneral, restante],
          backgroundColor: ['#2563eb', '#e5e7eb'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}`
            }
          },
          title: {
            display: true,
            text: `Nivel global de satisfacción: ${promedioGeneral.toFixed(2)} / 5`
          }
        }
      }
    });
  }

  /* ===================================
    TABLA DE DATOS
=================================== */

  async function fetchAndRenderTabulated() {
    const statusDiv = document.getElementById('tabulado-status');
    const tbody = document.querySelector('#tablaRespuestas tbody');
    const thead = document.querySelector('#tablaRespuestas thead');

    if (!statusDiv || !tbody || !thead) return;

    statusDiv.className = 'p-3 text-sm rounded-lg text-gray-700 bg-yellow-50 border border-yellow-200 mb-4';
    statusDiv.textContent = `Cargando tabla de datos desde ${API_URL}...`;
    tbody.innerHTML = '';
    thead.innerHTML = '';

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        statusDiv.className = 'p-3 text-sm rounded-lg text-gray-700 bg-blue-100 border border-blue-300 mb-4';
        statusDiv.textContent = 'No hay encuestas enviadas para mostrar en la tabla.';
        tbody.innerHTML = `<tr><td colspan="${preguntas.length + 4}" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No hay datos para mostrar.</td></tr>`;
        return;
      }

      // --- Encabezado ---
      let headerHtml = `
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depto</th>
      `;
      preguntas.forEach((p, i) => {
        headerHtml += `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q${i + 1}</th>`;
      });
      headerHtml += `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th></tr>`;
      thead.innerHTML = headerHtml;

      // --- Filas ---
      let rowsHtml = '';
      data.forEach((item) => {
        rowsHtml += `
          <tr class="bg-white border-b">
            <td class="px-6 py-4 text-sm text-gray-500">${new Date(item.fechaEnvio).toLocaleString()}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${item.empleado || ''}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${item.departamento || ''}</td>
        `;

        preguntas.forEach(p => {
          const resp = Array.isArray(item.respuestas) ? item.respuestas.find(r => r.pregunta === p) : null;
          const display = (resp && typeof resp.valor === 'number') ? resp.valor : '';
          rowsHtml += `<td class="px-6 py-4 text-sm text-gray-500 text-center">${display}</td>`;
        });

        // 🔹 Botón "Ver abiertas"
        rowsHtml += `
          <td class="px-6 py-4 text-center">
            <button 
              class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-lg ver-respuestas"
              data-respuestas='${JSON.stringify(item.respuestas || [])}'>
              Ver abiertas
            </button>
          </td>
        </tr>`;
      });

      tbody.innerHTML = rowsHtml;
      statusDiv.className = 'hidden';
    } catch (error) {
      statusDiv.className = 'p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
      statusDiv.textContent = `❌ Error al cargar la tabla: ${error.message}`;
      console.error(error);
    }
  }

  /* ===================================
   OBTENER Y RENDERIZAR GRÁFICAS
   =================================== */
  async function fetchAndRenderCharts() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.warn("⚠️ No hay datos disponibles para mostrar las gráficas.");
        return;
      }

      // Calcular promedios
      const averages = calculateAverages(data);
      const averagesByDept = calculateAveragesByDept(data);
      const promedioGlobal = calcularPromedioGeneral(averages);

      // Renderizar las gráficas
      renderChart(averages, averagesByDept);
      renderDonutChart(promedioGlobal);

    } catch (err) {
      console.error("❌ Error al obtener o renderizar gráficas:", err);
    }
  }

  /* ===================================
    EVENTOS (DOM Ready)
  =================================== */
  document.addEventListener('DOMContentLoaded', async () => {
  try {
    generarPreguntas();

    // 🔹 Carga los datos tabulados (tabla)
    await fetchAndRenderTabulated();

    // 🔹 Carga las gráficas (si la función existe)
    if (typeof fetchAndRenderCharts === "function") {
      await fetchAndRenderCharts();
    } else {
      console.warn("⚠️ No se encontró la función fetchAndRenderCharts(). Las gráficas no se mostrarán.");
    }

    // === Formularios ===
    const encuestaForm = document.getElementById('encuestaForm');
    if (encuestaForm) encuestaForm.addEventListener('submit', handleFormSubmit);

    const btnEnviar = document.getElementById('btnEnviar');
    if (btnEnviar && encuestaForm) {
      btnEnviar.addEventListener('click', (e) => {
        e.preventDefault();
        sendSurvey(encuestaForm);
      });
    }

    // === Navegación ===
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (ev) => {
        ev.preventDefault();
        const view = item.dataset.view;
        if (view) handleView(view);
      });
    });

    // === Botones de cambio de gráfica ===
    const btnBarras = document.getElementById('btnBarras');
    const btnDonut = document.getElementById('btnDonut');
    const chartContainer = document.getElementById('chartContainer');
    const pieContainer = document.getElementById('pieContainer');

    if (btnBarras && btnDonut && chartContainer && pieContainer) {
      btnBarras.addEventListener('click', () => {
        if (mostrandoDonut) {
          chartContainer.classList.remove('translate-x-full', '-translate-x-full');
          chartContainer.classList.add('translate-x-0');
          pieContainer.classList.remove('translate-x-0');
          pieContainer.classList.add('translate-x-full');
          btnBarras.classList.add('bg-primary-blue', 'text-white');
          btnDonut.classList.remove('bg-primary-blue', 'text-white');
          btnDonut.classList.add('bg-gray-300', 'text-gray-700');
          mostrandoDonut = false;
          if (satisfaccionChart) setTimeout(() => { satisfaccionChart.resize(); satisfaccionChart.update(); }, 300);
        }
      });

      btnDonut.addEventListener('click', () => {
        if (!mostrandoDonut) {
          chartContainer.classList.remove('translate-x-0');
          chartContainer.classList.add('-translate-x-full');
          pieContainer.classList.remove('translate-x-full');
          pieContainer.classList.add('translate-x-0');
          btnDonut.classList.add('bg-primary-blue', 'text-white');
          btnBarras.classList.remove('bg-primary-blue', 'text-white');
          btnBarras.classList.add('bg-gray-300', 'text-gray-700');
          mostrandoDonut = true;
          if (donutChart) setTimeout(() => { donutChart.resize(); donutChart.update(); }, 300);
        }
      });
    }

    // === Exportar a PDF ===
    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        let canvas = mostrandoDonut
          ? document.getElementById('promedioPieChart')
          : document.getElementById('satisfaccionChart');

        if (!canvas) return alert('El gráfico aún no se ha cargado.');

        try {
          const imgData = canvas.toDataURL('image/png');
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          const fileName = mostrandoDonut ? 'nivel_global_satisfaccion.pdf' : 'grafico_barras_resultados.pdf';
          pdf.save(fileName);
        } catch (err) {
          alert('Error al exportar el gráfico a PDF.');
          console.error(err);
        }
      });
    }

    // === Modal de respuestas abiertas ===
    const modal = document.getElementById('modalRespuestas');
    const contenido = document.getElementById('contenidoRespuestas');
    const cerrarModal = document.getElementById('cerrarModal');

    document.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('ver-respuestas')) {
        const respuestas = JSON.parse(e.target.dataset.respuestas || '[]');
        const abiertas = respuestas.filter(r => r.respuestaAbierta && r.respuestaAbierta.trim() !== '');
        contenido.innerHTML = abiertas.length
          ? abiertas.map(r => `
              <div class="border-b pb-2 mb-2">
                <p class="font-semibold text-gray-800">${r.pregunta}</p>
                <p class="text-gray-600">${r.respuestaAbierta}</p>
              </div>`).join('')
          : '<p class="text-gray-500">Sin respuestas abiertas.</p>';
        modal.classList.remove('hidden');
      }
    });

    if (cerrarModal) cerrarModal.addEventListener('click', () => modal.classList.add('hidden'));

  } catch (err) {
    console.error("❌ Error general al iniciar la página:", err);
  }

  // Mostrar por defecto la vista de "Acerca de nosotros"
  handleView('informacion');
});


