const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');
const fetch = require('node-fetch');
const { autoUpdater } = require('electron-updater');

const configPath = path.join(app.getPath('userData'), 'config.json');
const defaultConfig = { token: "", nom: "", grade: "", musicEnabled: false };
const ChannelId = '1068531881500491796'; // Ton salon Discord

autoUpdater.allowPrerelease = true;
autoUpdater.forceDevUpdateConfig = true;

// Crée le fichier config si absent
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
}

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 383,
    height: 400,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createMainWindow();
  autoUpdater.checkForUpdatesAndNotify();
});

// ----- Fermeture & Minimise -----
ipcMain.on('close-app', () => app.quit());
ipcMain.on('minimize-app', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

// ----- Lecture & sauvegarde de la config -----
ipcMain.handle('read-config', async () => {
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading config file:', e);
    return defaultConfig;
  }
});

ipcMain.handle('save-config', async (event, newConfig) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    console.log('Configuration saved:', newConfig);
    return { success: true };
  } catch (e) {
    console.error('Error saving config file:', e);
    return { success: false, error: e.message };
  }
});

// ----- Envoi du message de service -----
ipcMain.handle('send-service', async () => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath));
    if (!config.token || !config.nom || !config.grade) return "❌ Configuration incomplète.";

    const heure = moment().tz("Europe/Paris").format("HH:mm");
    const message = `🖊️Nom & Prénom : ${config.nom}
🔎Grade : <@&${config.grade}>
⏱️Heure prise de service : ${heure}
❌Heure fin de service :`;

    const response = await fetch(`https://discord.com/api/v9/channels/${ChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Erreur Discord:", error);
      return "❌ Échec de l'envoi.";
    }

    return "✅ Message envoyé.";
  } catch (e) {
    console.error(e);
    return "❌ Erreur interne.";
  }
});

// ----- Modifier le message (pause, reprise, fin) -----
ipcMain.handle('modifier-message', async (event, action) => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath));
    if (!config.token || !config.nom || !config.grade) return "❌ Configuration incomplète.";

    const res = await fetch(`https://discord.com/api/v9/channels/${ChannelId}/messages?limit=50`, {
      headers: { Authorization: config.token },
    });

    if (!res.ok) return "❌ Impossible de récupérer les messages.";
    const messages = await res.json();

    const msg = messages.find(m =>
      m.author?.id &&
      m.content.includes(`🖊️Nom & Prénom : ${config.nom}`) &&
      m.content.includes(`🔎Grade : <@&${config.grade}>`)
    );

    if (!msg) return "❌ Aucun message de prise de service trouvé.";

    const heure = moment().tz("Europe/Paris").format("HH:mm");
    let nouveauTexte = msg.content;

    if (action === 'pause') {
      nouveauTexte = nouveauTexte.replace(/❌Heure fin de service :/, `⏳Pause : ${heure}\n❌Heure fin de service :`);
    } else if (action === 'reprise') {
      nouveauTexte = nouveauTexte.replace(/❌Heure fin de service :/, `⏱️Reprise : ${heure}\n❌Heure fin de service :`);
    } else if (action === 'fin') {
      nouveauTexte = nouveauTexte.replace(/❌Heure fin de service :.*/, `❌Heure fin de service : ${heure}`);
    }

    const update = await fetch(`https://discord.com/api/v9/channels/${ChannelId}/messages/${msg.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: nouveauTexte }),
    });

    if (!update.ok) {
      const error = await update.text();
      console.error(error);
      return "❌ Échec de la mise à jour.";
    }

    return "✅ Message modifié.";
  } catch (e) {
    console.error(e);
    return "❌ Erreur interne.";
  }
});

// ----- Envoi du message de grade -----
ipcMain.handle('send-grade', async (event, grade) => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath));
    if (!config.token || !config.nom || !grade) return "❌ Configuration incomplète.";

    const message = `🖊️ Nom & Prénom : ${config.nom}
⚖️ Organisation : EMS
🔎 Grade : <@&${grade}>`;

    const response = await fetch(`https://discord.com/api/v9/channels/911981410892533786/messages`, {
      method: 'POST',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Erreur Discord:", error);
      return "❌ Échec de l'envoi.";
    }

    return "✅ Message envoyé.";
  } catch (e) {
    console.error(e);
    return "❌ Erreur interne.";
  }
});

autoUpdater.on('update-available', () => {
  console.log('🔄 Mise à jour disponible...');
  if (mainWindow) {
    mainWindow.webContents.send('update-toast', '🔄 Mise à jour disponible, téléchargement en cours...');
  }
});

autoUpdater.on('update-downloaded', () => {
  console.log('✅ Mise à jour téléchargée. Redémarrage pour installation...');
  if (mainWindow) {
    mainWindow.webContents.send('update-toast', '✅ Mise à jour téléchargée ! Redémarrage...');
  }
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 2500);
});

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('send-medoc', async (event, data) => {
  try {
    const { debut, fin, livraison } = data;
    const config = JSON.parse(fs.readFileSync(configPath));

    if (!config.token || !config.nom) return "❌ Configuration incomplète.";

    const message = `💊 Stock de médicaments au début : ${debut}
💊 Stock de médicaments à la fin : ${fin}
🚚 Livraison x${livraison}`;

    const response = await fetch(`https://discord.com/api/v9/channels/1101141434066817184/messages`, {
      method: 'POST',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Erreur Discord:", error);
      return "❌ Échec de l'envoi.";
    }

    return "✅ Message envoyé.";
  } catch (e) {
    console.error(e);
    return "❌ Erreur interne.";
  }
});
