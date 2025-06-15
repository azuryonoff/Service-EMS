const { ipcRenderer } = require('electron');

const status = document.getElementById('status');
const settingsModal = document.getElementById('settings-modal');
const gradeModal = document.getElementById('grade-modal');
const nomInput = document.getElementById('nom');
const gradeInput = document.getElementById('grade');
const gradeSelect = document.getElementById('grade-select'); // modal grade
const tokenInput = document.getElementById('token');

async function loadConfig() {
    const config = await ipcRenderer.invoke('read-config');
    tokenInput.value = config.token || '';
    nomInput.value = config.nom || '';
    gradeInput.value = config.grade || '';
}

window.onload = loadConfig;

// Toast popup function with manual close
let toastTimeout;

function showToast(message, duration = 1500) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.classList.add('show');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

document.getElementById('toast-close').onclick = () => {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
    if (toastTimeout) clearTimeout(toastTimeout);
};

document.getElementById('send').onclick = async () => {
    showToast("⏳ Envoi...");
    const result = await ipcRenderer.invoke('send-service');
    showToast(result);
};

for (let action of ['pause', 'reprise', 'fin']) {
    document.getElementById(action).onclick = async () => {
        showToast(`⏳ Modification...`);
        const result = await ipcRenderer.invoke('modifier-message', action);
        showToast(result);
    };
}

document.getElementById('close-btn').onclick = () => ipcRenderer.send('close-app');
document.getElementById('min-btn').onclick = () => ipcRenderer.send('minimize-app');

// Paramètres modal open/close
document.getElementById('settings-btn').onclick = () => {
    settingsModal.style.display = 'flex';
    loadConfig();
};

document.getElementById('close-settings').onclick = () => {
    settingsModal.style.display = 'none';
};

// Enregistrer les paramètres
document.getElementById('save').onclick = async () => {
    const newConfig = {
        token: tokenInput.value.trim(),
        nom: nomInput.value.trim(),
        grade: gradeInput.value.trim()
    };
    const res = await ipcRenderer.invoke('save-config', newConfig);
    if (res.success) {
        showToast("✅ Paramètres enregistrés !");
        document.getElementById('grade-modal').style.display = 'none';
    } else {
        showToast("❌ Erreur à l'enregistrement.");
    }
};

document.getElementById('grade-btn').onclick = () => {
    gradeModal.style.display = 'flex';
};
document.getElementById('close-grade').onclick = () => {
    gradeModal.style.display = 'none';
};
document.getElementById('demander').onclick = async () => {
  const selectedGrade = gradeSelect.value;
  showToast("⏳ Envoi de la demande...");
  const result = await ipcRenderer.invoke('send-grade', selectedGrade);
  showToast(result);
  document.getElementById('grade-modal').style.display = 'none';
};

async function loadConfig() {
    const config = await ipcRenderer.invoke('read-config');
    tokenInput.value = config.token || '';
    nomInput.value = config.nom || '';
    gradeInput.value = config.grade || '';

    // Récupère et affiche la version
    const version = await ipcRenderer.invoke('get-version');
    const versionSpan = document.getElementById('app-version');
    if (versionSpan) versionSpan.textContent = version;
}
