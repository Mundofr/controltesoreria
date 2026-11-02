const KEY = 'tesoreria_rayito_luz_v3';
let ADMIN_PASS = 'rayito';
let isAdmin = false;

const $ = id => document.getElementById(id);
const nowMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
let data = { school: 'Rayito de Luz', teacher: '', assistant: '', fee: 0, feeCopias: 0, startMonth: nowMonth(), people: [], payments: [] };

try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && Array.isArray(saved.people) && Array.isArray(saved.payments)) {
    data = { ...data, ...saved };
  }
} catch (e) { console.warn('Error cargando datos:', e); }

function showToast(message, type = 'success') {
  const container = $('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Control del Modal de Administrador
const modal = $('adminModal');
$('openModalBadge').onclick = () => {
  if (isAdmin) {
    if (confirm('¿Deseas cerrar la sesión de administrador y pasar a modo lectura?')) {
      isAdmin = false;
      updateAdminUI();
      showToast('Sesión de administrador cerrada.');
    }
  } else {
    $('adminPassInput').value = '';
    modal.style.display = 'flex';
    $('adminPassInput').focus();
  }
};

$('cancelModalBtn').onclick = () => { modal.style.display = 'none'; };

$('confirmModalBtn').onclick = () => {
  const pass = $('adminPassInput').value;
  if (pass === ADMIN_PASS) {
    isAdmin = true;
    modal.style.display = 'none';
    updateAdminUI();
    showToast('Modo administrador activado con éxito.', 'success');
  } else {
    showToast('Contraseña incorrecta.', 'error');
    $('adminPassInput').focus();
  }
};

$('adminPassInput').onkeydown = (e) => { if (e.key === 'Enter') $('confirmModalBtn').click(); };

function updateAdminUI() {
  if (isAdmin) {
    $('adminStatusLabel').textContent = 'Modo Admin 🔓';
    $('personPanel').classList.remove('locked-section');
    $('personPanel').classList.add('unlocked-section');
    $('configPanel').classList.remove('locked-section');
    $('configPanel').classList.add('unlocked-section');
    $('paymentPanel').classList.remove('locked-section');
    $('paymentPanel').classList.add('unlocked-section');
  } else {
    $('adminStatusLabel').textContent = 'Modo Lectura 🔒';
    $('personPanel').classList.add('locked-section');
    $('personPanel').classList.remove('unlocked-section');
    $('configPanel').classList.add('locked-section');
    $('configPanel').classList.remove('unlocked-section');
    $('paymentPanel').classList.add('locked-section');
    $('paymentPanel').classList.remove('unlocked-section');
  }
}

function checkAdmin() {
  if (!isAdmin) {
    showToast('Acción protegida. Haz clic en el estado superior para iniciar sesión.', 'error');
    return false;
  }
  return true;
}

// Colapsar / Mostrar Configuración
let configVisible = true;
$('toggleConfigBtn').onclick = () => {
  configVisible = !configVisible;
  $('configContent').style.display = configVisible ? 'block' : 'none';
  $('toggleConfigBtn').textContent = configVisible ? 'Ocultar 🔼' : 'Mostrar 🔽';
};

const money = n => 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthLabel = m => { if (!m) return ''; const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function save() { localStorage.setItem(KEY, JSON.stringify(data)); render(); }

// Función robusta para calcular los meses entre el inicio y el mes evaluado seleccionado
function monthsBetween(a, b) {
  if (!a || !b || a > b) return [];
  let [y, m] = a.split('-').map(Number), [ey, em] = b.split('-').map(Number), out = [];
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`); m++;
    if (m === 13) { m = 1; y++; } if (out.length > 600) break;
  }
  return out;
}

function feeFor(type) { return Number(type === 'copias' ? data.feeCopias : data.fee) || 0; }

function totalsFor(personId, month, type) {
  const dueMonths = monthsBetween(data.startMonth, month);
  let paid = 0, debt = 0, pending = [];
  for (const m of dueMonths) {
    const amount = data.payments
      .filter(p => p.personId === personId && p.month === m && (p.type || 'auxiliar') === type)
      .reduce((s, p) => s + Number(p.amount), 0);
    paid += amount;
    const left = Math.max(0, feeFor(type) - amount);
    debt += left;
    if (left > 0.009) pending.push(m);
  }
  return { paid, debt, pending, dueMonths };
}

function updateSuggestedAmount() {
  const type = $('payType').value;
  const fAux = Number(data.fee) || 0;
  const fCop = Number(data.feeCopias) || 0;
  if (type === 'both') $('payAmount').value = (fAux + fCop) > 0 ? (fAux + fCop).toFixed(2) : '';
  else if (type === 'auxiliar') $('payAmount').value = fAux > 0 ? fAux.toFixed(2) : '';
  else if (type === 'copias') $('payAmount').value = fCop > 0 ? fCop.toFixed(2) : '';
}
$('payType').addEventListener('change', updateSuggestedAmount);

function render() {
  $('teacherName').value = data.teacher || '';
  $('assistantName').value = data.assistant || '';
  $('fee').value = data.fee || '';
  $('feeCopias').value = data.feeCopias || '';
  $('startMonth').value = data.startMonth || nowMonth();

  // Si el usuario no ha escogido un mes de visualización, toma el actual por defecto.
  if (!$('viewMonth').value) {
    $('viewMonth').value = nowMonth();
  }

  const month = $('viewMonth').value;
  if (!$('payMonth').value) $('payMonth').value = nowMonth();
  $('payPerson').innerHTML = '<option value="">Selecciona una persona</option>' + data.people.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');

  const summaries = data.people.map(p => ({
    p, auxiliar: totalsFor(p.id, month, 'auxiliar'), copias: totalsFor(p.id, month, 'copias')
  }));


  // --- CÁLCULO DE PAGOS SEPARADOS ---
  const paidAuxAll = data.payments
    .filter(p => (p.type || 'auxiliar') === 'auxiliar')
    .reduce((s, p) => s + Number(p.amount), 0);

  const paidCopAll = data.payments
    .filter(p => p.type === 'copias')
    .reduce((s, p) => s + Number(p.amount), 0);

  const paidAll = paidAuxAll + paidCopAll;
  const debtAll = summaries.reduce((s, x) => s + x.auxiliar.debt + x.copias.debt, 0);
  const pendingAll = summaries.reduce((s, x) => s + x.auxiliar.pending.length + x.copias.pending.length, 0);

  // --- ASIGNACIÓN A LOS ELEMENTOS HTML ---
  $('sMembers').textContent = data.people.length;
  $('sPaid').textContent = money(paidAll);
  $('sAuxPaid').textContent = money(paidAuxAll);
  $('sCopPaid').textContent = money(paidCopAll);
  $('sDebt').textContent = money(debtAll);
  $('sPending').textContent = pendingAll;





  const q = $('filter').value.trim().toLowerCase();
  const visible = summaries.filter(x => x.p.name.toLowerCase().includes(q));

  // Tabla detallada con columnas independientes para Auxiliar y Copias
  $('statusBody').innerHTML = visible.length ? visible.map(x => {
    const totalDebt = x.auxiliar.debt + x.copias.debt;
    const totalPaid = x.auxiliar.paid + x.copias.paid;
    const status = totalDebt < 0.01 ? 'Al día' : totalPaid > 0 ? 'Abono parcial' : 'Pendiente';
    const cls = totalDebt < 0.01 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

    return `<tr>
     <td><span class="member">${esc(x.p.name)}</span><div class="sub">${x.auxiliar.dueMonths.length} mes(es) evaluados</div></td>
     <td>${money(x.auxiliar.paid)}</td>
     <td><b>${money(x.auxiliar.debt)}</b></td>
     <td>${money(x.copias.paid)}</td>
     <td><b>${money(x.copias.debt)}</b></td>
     <td><span class="pill ${cls}">${status}</span></td>
     <td class="no-print"><button class="danger" onclick="deletePerson('${x.p.id}')">Quitar</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">No hay registros cargados.</td></tr>';

  const payments = [...data.payments].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  $('historyBody').innerHTML = payments.length ? payments.map(p => {
    const person = data.people.find(x => x.id === p.personId);
    const typeStr = (p.type === 'copias') ? 'Copias' : 'Auxiliar';
    const formattedDate = p.createdAt ? new Date(p.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—';
    return `<tr>
     <td>${formattedDate}</td>
     <td>${esc(person?.name || 'Integrante eliminado')}</td>
     <td><span class="pill ${p.type === 'copias' ? 'paid' : 'partial'}">${typeStr}</span></td>
     <td>${esc(monthLabel(p.month))}</td>
     <td><b>${money(p.amount)}</b></td>
     <td>${esc(p.note || '—')}</td>
     <td class="no-print"><button class="danger" onclick="deletePayment('${p.id}')">Eliminar</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">Todavía no hay pagos registrados.</td></tr>';

  updateAdminUI();
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

$('saveConfig').onclick = () => {
  if (!checkAdmin()) return;
  const fee = Number($('fee').value), feeCopias = Number($('feeCopias').value), start = $('startMonth').value;
  const teacher = $('teacherName').value.trim(), assistant = $('assistantName').value.trim();
  if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(feeCopias) || feeCopias < 0 || !start) {
    showToast('Ingresa montos válidos para las cuotas.', 'error'); return;
  }
  data.fee = fee; data.feeCopias = feeCopias; data.startMonth = start;
  data.teacher = teacher; data.assistant = assistant;
  save(); updateSuggestedAmount();
  showToast('Configuración guardada.');
  configVisible = false;
  $('configContent').style.display = 'none';
  $('toggleConfigBtn').textContent = 'Mostrar 🔽';
};

$('addPerson').onclick = () => {
  if (!checkAdmin()) return;
  const name = $('personName').value.trim();
  if (!name) { showToast('Escribe el nombre del integrante.', 'error'); return; }
  if (data.people.some(p => p.name.toLowerCase() === name.toLowerCase())) { showToast('Ese integrante ya está registrado.', 'error'); return; }
  data.people.push({ id: generateId(), name }); $('personName').value = ''; save();
  showToast('Integrante agregado correctamente.');
};

$('addPayment').onclick = () => {
  if (!checkAdmin()) return;
  const personId = $('payPerson').value, month = $('payMonth').value;
  const type = $('payType').value, amount = Number($('payAmount').value);
  const note = $('payNote').value.trim();
  const now = new Date().toISOString();

  if (!personId || !month || !['auxiliar', 'copias', 'both'].includes(type) || !Number.isFinite(amount) || amount <= 0) {
    showToast('Selecciona integrante, tipo, mes y monto válido.', 'error'); return;
  }

  if (type === 'both') {
    const feeAux = feeFor('auxiliar');
    const paidAux = data.payments.filter(p => p.personId === personId && p.month === month && p.type === 'auxiliar').reduce((s, p) => s + Number(p.amount), 0);
    const debtAux = Math.max(0, feeAux - paidAux);
    let amountAux = 0, amountCop = 0;

    if (debtAux > 0) {
      if (amount <= debtAux) { amountAux = amount; amountCop = 0; }
      else { amountAux = debtAux; amountCop = amount - debtAux; }
    } else { amountAux = 0; amountCop = amount; }

    const noteLabel = note ? `${note} (Pago combinado)` : 'Pago combinado';
    if (amountAux > 0) data.payments.push({ id: generateId(), personId, month, type: 'auxiliar', amount: amountAux, note: noteLabel, createdAt: now });
    if (amountCop > 0) data.payments.push({ id: generateId(), personId, month, type: 'copias', amount: amountCop, note: noteLabel, createdAt: now });
  } else {
    data.payments.push({ id: generateId(), personId, month, type, amount, note, createdAt: now });
  }

  $('payAmount').value = ''; $('payNote').value = ''; save(); showToast('Pago registrado correctamente.');
};

$('viewMonth').onchange = render;
$('filter').oninput = render;
$('refresh').onclick = render;

window.deletePerson = pid => {
  if (!checkAdmin()) return;
  if (!confirm('¿Eliminar este integrante y sus pagos?')) return;
  data.people = data.people.filter(p => p.id !== pid);
  data.payments = data.payments.filter(p => p.personId !== pid); save();
  showToast('Integrante eliminado.');
};

window.deletePayment = pid => {
  if (!checkAdmin()) return;
  if (!confirm('¿Eliminar este registro de pago?')) return;
  data.payments = data.payments.filter(p => p.id !== pid); save();
  showToast('Pago eliminado.');
};

$('printStatusPdfBtn').onclick = () => {
  const m = $('viewMonth').value || nowMonth();
  const t = data.teacher ? `Miss: ${data.teacher}` : '';
  const a = data.assistant ? `Auxiliar: ${data.assistant}` : '';
  const staffStr = [t, a].filter(Boolean).join(' | ');

  $('printStatusStaffInfo').textContent = staffStr ? `Personal a cargo: ${staffStr}` : '';
  $('printStatusSubTitle').textContent = `Situación evaluada hasta el mes de: ${monthLabel(m)} (Emisión: ${new Date().toLocaleDateString('es-PE')})`;
  
  document.body.classList.add('print-status');
  window.print();
  document.body.classList.remove('print-status');
};

$('printHistoryPdfBtn').onclick = () => {
  const t = data.teacher ? `Miss: ${data.teacher}` : '';
  const a = data.assistant ? `Auxiliar: ${data.assistant}` : '';
  const staffStr = [t, a].filter(Boolean).join(' | ');

  $('printHistoryStaffInfo').textContent = staffStr ? `Personal a cargo: ${staffStr}` : '';
  $('printHistorySubTitle').textContent = `Fecha de emisión: ${new Date().toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' })}`;
  
  document.body.classList.add('print-history');
  window.print();
  document.body.classList.remove('print-history');
};

$('exportBtn').onclick = () => download('respaldo_tesoreria_rayito.json', JSON.stringify(data, null, 2), 'application/json');
$('csvBtn').onclick = () => {
  const month = $('viewMonth').value || nowMonth();
  const rows = [['Integrante', 'Auxiliar pagado', 'Deuda Auxiliar', 'Copias pagado', 'Deuda Copias', 'Estado']];
  for (const p of data.people) {
    const a = totalsFor(p.id, month, 'auxiliar'), c = totalsFor(p.id, month, 'copias');
    const debt = a.debt + c.debt, paid = a.paid + c.paid;
    rows.push([p.name, a.paid.toFixed(2), a.debt.toFixed(2), c.paid.toFixed(2), c.debt.toFixed(2), debt < 0.01 ? 'Al día' : paid > 0 ? 'Abono parcial' : 'Pendiente']);
  }
  download('reporte_tesoreria.csv', '\uFEFF' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n'), 'text/csv;charset=utf-8');
};

function download(name, content, type) {
  const blob = new Blob([content], { type }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

$('clearBtn').onclick = () => {
  if (!checkAdmin()) return;
  if (confirm('¿Seguro que deseas reiniciar todos los datos del sistema?')) {
    data = { school: 'Rayito de Luz', teacher: '', assistant: '', fee: 0, feeCopias: 0, startMonth: nowMonth(), people: [], payments: [] }; save();
    showToast('Sistema reiniciado.', 'error');
  }
};

render();