// --- Variables Globales ---
const BASE_URL = 'https://unlegal-adina-nonmaterialistically.ngrok-free.dev'; 
const API_URL = `${BASE_URL}/api/respuestas`;

let satisfaccionChart; // Instancia del gráfico

const preguntas = [
  "Facilidad de uso de la plataforma.",
  "Velocidad de respuesta del sistema.",
  "El contenido del proyecto cumple sus expectativas de negocio.",
  "Navegación entre secciones es intuitiva.",
  "Estética y diseño son profesionales y atractivos.",
  "Resúmenes gráficos le proporcionan valor claro.",
  "Información de contacto está bien organizada y accesible.",
  "Recomendación de esta plataforma a otros equipos/clientes.",
  "El resumen tabulado es fácil de exportar y usar.",
  "En general, la plataforma cumple con sus necesidades de análisis."
];

const opciones = ["Muy Mal", "Mal", "Regular", "Bien", "Excelente"];

// ===================================
// GESTIÓN DE VISTAS (SPA)
// ===================================
function handleView(viewId) {
  document.querySelectorAll('.content-view').forEach(section => section.classList.add('hidden'));
  const activeSection = document.getElementById(viewId);
  if (activeSection) activeSection.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active-nav', 'bg-gray-700'));
  const activeLink = document.querySelector(`[data-view="${viewId}"]`);
  if (activeLink) activeLink.classList.add('active-nav', 'bg-gray-700');

  if (viewId === 'grafico') fetchAndRenderAnalytics();
  if (viewId === 'tabulado') fetchAndRenderTabulated();
}

// ===================================
// GENERACIÓN DE PREGUNTAS
// ===================================
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
      optionsHtml += `
        <div class="flex items-center justify-center p-2">
          <input type="radio" id="${optionId}" name="${qId}" value="${value}" required class="custom-radio-input" />
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

// ===================================
// ENVÍO DEL FORMULARIO
// ===================================
async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const MENSAJE_DIV = document.getElementById('mensaje');

  submitButton.disabled = true;
  MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-gray-700 bg-yellow-50 border border-yellow-200';
  MENSAJE_DIV.textContent = `Enviando datos a ${API_URL}...`;

  const empleado = form.elements['empleado'].value;
  const departamento = form.elements['departamento'].value;

  const respuestas = preguntas.map((pregunta, index) => {
    const questionName = `q${index + 1}`;
    const selectedInput = form.querySelector(`input[name="${questionName}"]:checked`);
    if (!selectedInput) return null;

    const valorNumerico = parseInt(selectedInput.value, 10);
    const opcionTexto = opciones[valorNumerico - 1];

    return { pregunta, valor: valorNumerico, opcion: opcionTexto };
  }).filter(r => r !== null);

  if (respuestas.length !== preguntas.length) {
    MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
    MENSAJE_DIV.textContent = "¡Atención! Por favor, responda todas las preguntas antes de enviar.";
    submitButton.disabled = false;
    return;
  }

  const data = { empleado, departamento, respuestas, fechaEnvio: new Date().toISOString() };

  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (res.ok) {
      MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-green-700 bg-green-100 border border-green-300';
      MENSAJE_DIV.textContent = result.mensaje || "✅ Encuesta enviada con éxito.";
      form.reset();
      generarPreguntas();
    } else {
      MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
      MENSAJE_DIV.textContent = result.mensaje || `❌ Error ${res.status}: Fallo al enviar los datos.`;
      console.error('Error del servidor:', result);
    }
  } catch (err) {
    MENSAJE_DIV.className = 'mt-8 p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
    MENSAJE_DIV.textContent = `❌ Error de conexión. Revise que el servidor y ngrok estén activos.`;
    console.error("Error al enviar la encuesta:", err);
  } finally {
    submitButton.disabled = false;
  }
}

// ===================================
// CÁLCULO DE PROMEDIOS
// ===================================
function calculateAverages(data) {
  if (!data || data.length === 0) return [];

  const questionSums = new Array(preguntas.length).fill(0);
  const questionCounts = new Array(preguntas.length).fill(0);

  data.forEach(survey => {
    survey.respuestas.forEach(r => {
      const index = preguntas.indexOf(r.pregunta);
      if (index !== -1) {
        questionSums[index] += r.valor;
        questionCounts[index] += 1;
      }
    });
  });

  return preguntas.map((pregunta, index) => {
    const count = questionCounts[index];
    const avg = count > 0 ? (questionSums[index] / count).toFixed(2) : 0;
    return { pregunta: `${index + 1}. ${pregunta.substring(0, 40)}...`, promedio: parseFloat(avg) };
  });
}

// ===================================
// PROMEDIO POR DEPARTAMENTO
// ===================================
function calculateAveragesByDept(data) {
  if (!data || data.length === 0) return {};

  const deptData = {};
  data.forEach(survey => {
    const dept = survey.departamento || 'N/A';
    if (!deptData[dept]) deptData[dept] = Array(preguntas.length).fill(0).map(() => ({ sum:0, count:0 }));

    survey.respuestas.forEach((r, i) => {
      deptData[dept][i].sum += r.valor;
      deptData[dept][i].count += 1;
    });
  });

  const result = {};
  for (const dept in deptData) {
    result[dept] = deptData[dept].map(q => q.count > 0 ? parseFloat((q.sum / q.count).toFixed(2)) : 0);
  }
  return result;
}

// ===================================
// DIBUJAR GRÁFICO
// ===================================
function renderChart(averages, averagesByDept = {}) {
  const ctx = document.getElementById('satisfaccionChart').getContext('2d');

  if (satisfaccionChart) satisfaccionChart.destroy();

  const labels = averages.map(a => a.pregunta);
  const datasets = [{ 
    label: 'Promedio General', 
    data: averages.map(a => a.promedio),
    backgroundColor: averages.map(val => val >= 4 ? '#2563eb' : val >= 3 ? '#7e22ce' : '#f97316')
  }];

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
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero:true, max:5, title: { display:true, text:'Promedio de Calificación' } },
        x: { display:false }
      },
      plugins: {
        legend: { position:'bottom' },
        tooltip: {
          callbacks: { label: ctx => `Promedio: ${ctx.parsed.y}` }
        }
      }
    }
  });
}

// ===================================
// OBTENER DATOS Y RENDERIZAR
// ===================================
async function fetchAndRenderAnalytics() {
  const statusDiv = document.getElementById('grafico-status');
  statusDiv.className = 'p-3 text-sm rounded-lg text-gray-700 bg-yellow-50 border border-yellow-200';
  statusDiv.textContent = `Cargando datos analíticos desde ${API_URL}...`;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Error ${res.status}`);

    const data = await res.json();
    if (!data.length) {
      statusDiv.className = 'p-3 text-sm rounded-lg text-gray-700 bg-blue-100 border border-blue-300';
      statusDiv.textContent = 'No hay encuestas enviadas para generar gráficos.';
      if (satisfaccionChart) satisfaccionChart.destroy();
      return;
    }

    const averages = calculateAverages(data);
    const averagesByDept = calculateAveragesByDept(data);
    renderChart(averages, averagesByDept);
    statusDiv.className = 'hidden';

  } catch (error) {
    statusDiv.className = 'p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
    statusDiv.textContent = `❌ Error al conectar con el servidor: ${error.message}`;
    console.error(error);
  }
}

// ===================================
// TABLA DE DATOS
// ===================================
async function fetchAndRenderTabulated() {
  const statusDiv = document.getElementById('tabulado-status');
  const tbody = document.querySelector('#tablaRespuestas tbody');
  const thead = document.querySelector('#tablaRespuestas thead');

  statusDiv.className = 'p-3 text-sm rounded-lg text-gray-700 bg-yellow-50 border border-yellow-200 mb-4';
  statusDiv.textContent = `Cargando tabla de datos desde ${API_URL}...`;
  tbody.innerHTML = '';
  thead.innerHTML = '';

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Error ${res.status}`);

    const data = await res.json();
    if (!data.length) {
      statusDiv.className = 'p-3 text-sm rounded-lg text-gray-700 bg-blue-100 border border-blue-300 mb-4';
      statusDiv.textContent = 'No hay encuestas enviadas para mostrar en la tabla.';
      tbody.innerHTML = `<tr><td colspan="${preguntas.length+3}" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No hay datos para mostrar.</td></tr>`;
      return;
    }

    let headerHtml = '<tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>';
    headerHtml += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>';
    headerHtml += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depto</th>';
    preguntas.forEach((p, i) => headerHtml += `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q${i+1}</th>`);
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    let rowsHtml = '';
    data.forEach(item => {
      rowsHtml += `<tr class="bg-white border-b"><td class="px-6 py-4 text-sm text-gray-500">${new Date(item.fechaEnvio).toLocaleString()}</td>`;
      rowsHtml += `<td class="px-6 py-4 text-sm text-gray-500">${item.empleado}</td>`;
      rowsHtml += `<td class="px-6 py-4 text-sm text-gray-500">${item.departamento}</td>`;
      item.respuestas.forEach(r => rowsHtml += `<td class="px-6 py-4 text-sm text-gray-500 text-center">${r.valor}</td>`);
      rowsHtml += '</tr>';
    });
    tbody.innerHTML = rowsHtml;
    statusDiv.className = 'hidden';
  } catch (error) {
    statusDiv.className = 'p-3 text-sm rounded-lg text-red-700 bg-red-100 border border-red-300';
    statusDiv.textContent = `❌ Error al cargar la tabla: ${error.message}`;
    console.error(error);
  }
}

// ===================================
// EVENTOS
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  // Genera preguntas SOLO cuando se entra a la encuesta
  generarPreguntas();

  // Asocia el submit del formulario correcto (formulario de encuesta)
  const encuestaForm = document.getElementById('encuestaForm');
  if (encuestaForm) encuestaForm.addEventListener('submit', handleFormSubmit);

  // Controla el cambio de vistas
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => handleView(item.dataset.view));
  });

  // Mostrar por defecto la vista de "Acerca de nosotros"
  handleView('informacion');

  // === Botón para exportar gráfico a PDF ===
  const exportBtn = document.getElementById('exportPdfBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const canvas = document.getElementById('satisfaccionChart');
      if (!canvas) return alert('El gráfico aún no se ha cargado.');
      const imgData = canvas.toDataURL('image/png');

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('grafico.pdf');
    });
  }
});
