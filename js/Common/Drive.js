 
const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FOLDER = "LedgerMate_Backups";

const STORAGE_KEYS = {
  CLIENT_ID: "drive_client_id",
  USER_EMAIL: "drive_user_email",
  ACCESS_TOKEN: "drive_access_token",
  TOKEN_EXPIRY: "drive_token_expiry",
  FOLDER_ID: "drive_folder_id",
  LAST_BACKUP: "drive_last_backup",
  LAST_SYNC: "drive_last_sync",
  AUTO_LOAD_ENABLED: "drive_auto_load_enabled",
  AUTO_LOAD_MODE: "drive_auto_load_mode", // "latest" | "pinned"
  AUTO_LOAD_FILE_ID: "drive_auto_load_file_id",
};

let tokenClient = null;

const DriveSync = {
  /* =========================================================
     INIT & AUTH
     ========================================================= */
  async init() {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        return reject(
          new Error(
            "Google Identity Services not loaded.\nAdd: <script src='https://accounts.google.com/gsi/client'></script>"
          )
        );
      }

      try {
        const clientId = this.getClientId();
        if (!clientId) return reject(new Error("Client ID not configured."));

        if (!tokenClient) {
          tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: DRIVE_SCOPES,
            prompt: "consent",
          });
        }

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  getClientId() {
    return localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
  },

  setClientId(clientId) {
    if (!clientId.includes(".apps.googleusercontent.com"))
      throw new Error("Invalid Google OAuth Client ID");

    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
    tokenClient = null;
  },

  isClientIdConfigured() {
    return !!this.getClientId();
  },

  /* =========================================================
     AUTH: SIGN IN / TOKEN MGMT
     ========================================================= */
  async signIn() {
    if (!this.isClientIdConfigured())
      throw new Error("Client ID not configured.");

    await this.init();

    if (this.hasValidToken()) {
      showToast?.("Already connected as " + this.getStoredEmail(), "success");
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        tokenClient.callback = async (response) => {
          if (response.error) return reject(new Error(response.error));

          const expiresIn = response.expires_in || 3600;
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
          localStorage.setItem(
            STORAGE_KEYS.TOKEN_EXPIRY,
            String(Date.now() + expiresIn * 1000)
          );

          try {
            const email = await this.getUserEmail(response.access_token);
            localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
          } catch (_) {}

          showToast?.("Connected to Drive", "success");
          resolve();
        };

        tokenClient.requestAccessToken({ prompt: "consent" });
      } catch (err) {
        reject(err);
      }
    });
  },

  async signOut() {
    const token = this.getToken();
    if (token && google?.accounts?.id) {
      google.accounts.id.revoke(token, () => {});
    }

    // keep client id & auto-load settings
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.FOLDER_ID);

    showToast?.("Disconnected from Drive", "info");
  },

  hasValidToken() {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

    if (!token || !expiry) return false;

    if (Date.now() >= Number(expiry)) {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      return false;
    }

    return true;
  },

  getToken() {
    return this.hasValidToken()
      ? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      : null;
  },

  getStoredEmail() {
    return localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || "Unknown";
  },

  isConnected() {
    return !!this.getToken();
  },

  async getUserEmail(token) {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)",
      { headers: { Authorization: "Bearer " + token } }
    );
    const j = await res.json();
    return j?.user?.emailAddress || "Unknown";
  },

  /* =========================================================
     AUTO-LOAD SETTINGS (HYBRID)
     ========================================================= */
  isAutoLoadEnabled() {
    return localStorage.getItem(STORAGE_KEYS.AUTO_LOAD_ENABLED) === "true";
  },

  setAutoLoadEnabled(enabled) {
    localStorage.setItem(STORAGE_KEYS.AUTO_LOAD_ENABLED, enabled ? "true" : "false");
  },

  getAutoLoadMode() {
    return localStorage.getItem(STORAGE_KEYS.AUTO_LOAD_MODE) || "latest";
  },

  setAutoLoadMode(mode) {
    if (mode !== "latest" && mode !== "pinned") mode = "latest";
    localStorage.setItem(STORAGE_KEYS.AUTO_LOAD_MODE, mode);
  },

  getAutoLoadFileId() {
    return localStorage.getItem(STORAGE_KEYS.AUTO_LOAD_FILE_ID);
  },

  setAutoLoadFileId(fileId) {
    if (!fileId) localStorage.removeItem(STORAGE_KEYS.AUTO_LOAD_FILE_ID);
    else localStorage.setItem(STORAGE_KEYS.AUTO_LOAD_FILE_ID, fileId);
  },

  /* =========================================================
     BACKUP FOLDER MGMT
     ========================================================= */
  async ensureFolder() {
    const token = this.getToken();
    if (!token) throw new Error("Not connected");

    const cached = localStorage.getItem(STORAGE_KEYS.FOLDER_ID);
    if (cached) return cached;

    const q = `mimeType='application/vnd.google-apps.folder' and name='${DRIVE_FOLDER}' and trashed=false`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=files(id,name)`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const j = await res.json();

    if (j.files?.length) {
      localStorage.setItem(STORAGE_KEYS.FOLDER_ID, j.files[0].id);
      return j.files[0].id;
    }

    // create
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: DRIVE_FOLDER,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    const folder = await createRes.json();
    localStorage.setItem(STORAGE_KEYS.FOLDER_ID, folder.id);
    return folder.id;
  },

  /* =========================================================
     UPLOAD (BASE64 ENCODED)
     ========================================================= */
  async uploadBackup(data, folderId = null) {
    const token = this.getToken();
    if (!token) throw new Error("Not connected");

    if (!folderId) folderId = await this.ensureFolder();

    const now = new Date();
    const name =
      "LedgerMate_" + now.toISOString().slice(0, 19).replace(/[:T]/g, "_") + ".json";

    const metadata = {
      name,
      mimeType: "application/json",
      parents: [folderId],
    };

    const jsonText = JSON.stringify(data);
    const base64 = btoa(unescape(encodeURIComponent(jsonText)));
    const blob = new Blob([base64], { type: "application/json" });

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", blob);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size",
      { method: "POST", headers: { Authorization: "Bearer " + token }, body: form }
    );

    const j = await res.json();
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, now.toISOString());
    showToast?.("Backup uploaded: " + j.name, "success");
    return j;
  },

  /* =========================================================
     LIST BACKUPS
     ========================================================= */
  async listBackups(folderId = null) {
    const token = this.getToken();
    if (!token) throw new Error("Not connected");

    if (!folderId) folderId = await this.ensureFolder();

    const q = `'${folderId}' in parents and mimeType='application/json' and trashed=false`;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const j = await res.json();
    return j.files || [];
  },

  /* =========================================================
     DOWNLOAD & DECODE BASE64
     ========================================================= */
  async downloadBackup(fileId) {
    const token = this.getToken();
    if (!token) throw new Error("Not connected");

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const base64 = await res.text();
    const jsonText = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(jsonText);
  },

  /* =========================================================
     RESTORE BACKUP
     ========================================================= */
  async restoreBackup(fileId) {
    try {
      const data = await this.downloadBackup(fileId);
      await fullImportJSONText(JSON.stringify(data), "Drive");

      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      showToast?.("Backup restored successfully", "success");
      //location.reload();
    } catch (err) {
      showToast?.("Restore failed: " + err.message, "error");
    }
  },

  /* =========================================================
     GET LATEST BACKUP
     ========================================================= */
  async getLatestBackupFile() {
    const files = await this.listBackups();
    if (!files?.length) return null;

    return files.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    )[0];
  },

  /* =========================================================
     AUTO-LOAD (Hybrid: Latest / Pinned)
     ========================================================= */
  async autoLoadConfiguredBackup() {
    if (!this.isAutoLoadEnabled()) return;
    if (!this.isConnected()) return;

    const mode = this.getAutoLoadMode();

    if (mode === "pinned") {
      const pinned = this.getAutoLoadFileId();
      if (pinned) {
        await this.restoreBackup(pinned);
        return;
      }
      // fallback
    }

    // LATEST
    const latest = await this.getLatestBackupFile();
    if (latest) await this.restoreBackup(latest.id);
  },

  /* =========================================================
     AUTO-BACKUP EVERY 3 DAYS
     ========================================================= */
  async autoBackupIfDue(data) {
    if (!this.isConnected()) return;

    const last = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    const lastTime = last ? new Date(last).getTime() : 0;
    const now = Date.now();
    const three = 3 * 24 * 60 * 60 * 1000;

    if (now - lastTime > three) {
      await this.uploadBackup(data);
    }
  },

  /* =========================================================
     DELETE BACKUP
     ========================================================= */
  async deleteBackupFile(fileId) {
    const token = this.getToken();
    if (!token) throw new Error("Not connected");

    // protect pinned backup
    if (fileId === this.getAutoLoadFileId()) {
      showToast?.("Cannot delete pinned backup", "warning");
      return false;
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });

    if (res.ok) {
      showToast?.("Backup deleted", "success");
      return true;
    }

    showToast?.("Delete failed", "error");
    return false;
  },

  /* =========================================================
     ESCAPE HTML
     ========================================================= */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  },

  /* =========================================================
     MAIN UI MODAL
     ========================================================= */
  async showDriveSyncModal() {
    if (!this.isClientIdConfigured()) return this.showConfigModal();

    await this.init();

    const connected = this.isConnected();
    const email = this.getStoredEmail();
    const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

    const autoEnabled = this.isAutoLoadEnabled();
    const mode = this.getAutoLoadMode();
    const pinnedFileId = this.getAutoLoadFileId();

    let files = connected ? await this.listBackups() : [];

    const list = files
      .map((f) => {
        const sizeKB = Math.round((f.size || 0) / 1024);
        const isPinned = pinnedFileId === f.id;

        return `
          <div class="glass flex justify-between items-center p-3 mb-2 border border-white/20 rounded-lg ${isPinned ? "ring-2 ring-indigo-400 bg-indigo-50/10" : "hover:bg-white/10"}">
            <div class="flex-1">
              <p class="font-semibold text-sm text-indigo-600">${this.escapeHtml(f.name)}</p>
              <p class="text-xs text-gray-500">${new Date(f.createdTime).toLocaleString()} • ${sizeKB} KB</p>
            </div>

            <div class="flex gap-2">
              <button class="selectPinBtn bg-indigo-500 text-white px-2 py-1 rounded text-xs" data-id="${f.id}" title="Pin this backup">📌</button>
              <button class="restoreBtn bg-emerald-500 text-white px-2 py-1 rounded text-xs" data-id="${f.id}">⬇ Restore</button>
              <button class="deleteBackupBtn bg-red-500 text-white px-2 py-1 rounded text-xs ${isPinned ? "opacity-50 cursor-not-allowed" : ""}" data-id="${f.id}" ${isPinned ? "disabled" : ""}>🗑️</button>
            </div>
          </div>
        `;
      })
      .join("");

    const html = `
      <div class="space-y-4">
        <h3 class="font-semibold text-lg text-indigo-600">☁️ Google Drive Sync</h3>

        ${
          connected
            ? `<p class="text-xs text-gray-500">Connected as ${email}</p>`
            : `<p class="text-xs text-red-500">Not connected</p>`
        }

        <div class="flex gap-2">
          <button id="btnDriveConnect" class="px-3 py-2 rounded bg-indigo-500 text-white">${connected ? "🔄 Refresh" : "🔑 Connect"}</button>
          <button id="btnDriveUpload" class="px-3 py-2 rounded bg-emerald-500 text-white" ${!connected ? "disabled style='opacity:0.5'" : ""}>☁️ Upload</button>
          <button id="btnDriveLogout" class="px-3 py-2 rounded bg-rose-500 text-white" ${!connected ? "disabled style='opacity:0.5'" : ""}>🚪 Logout</button>
        </div>

        <!-- AUTOLOAD BLOCK -->
        <div class="glass border p-3 rounded">
          <div class="flex items-center gap-3">
            <input type="checkbox" id="autoLoadToggle" ${autoEnabled ? "checked" : ""}>
            <label class="text-sm">Auto-load on App Open</label>
          </div>

          <div class="mt-2">
            <label class="text-xs">Mode:</label>
            <select id="autoLoadModeSelect" class="text-xs px-2 py-1 rounded border">
              <option value="latest" ${mode === "latest" ? "selected" : ""}>Latest Backup</option>
              <option value="pinned" ${mode === "pinned" ? "selected" : ""}>Pinned Backup</option>
            </select>
          </div>
        </div>

        <h4 class="font-semibold mt-4">Backups</h4>
        <div class="max-h-64 overflow-y-auto border rounded p-2">
          ${list || "<p class='text-gray-500 text-center'>No backups found</p>"}
        </div>
      </div>
    `;

    showSimpleModal("☁️ Google Drive Sync", html);

    /* ---------------------------------------------
       UI Events
       --------------------------------------------- */
    const self = this;

    document.getElementById("btnDriveConnect").onclick = async () => {
      await self.signIn();
      await self.showDriveSyncModal();
    };

    document.getElementById("btnDriveUpload").onclick = async () => {
      await self.signIn();
      await self.uploadBackup(state); // your state object
      await self.showDriveSyncModal();
    };

    document.getElementById("btnDriveLogout").onclick = async () => {
      await self.signOut();
      await self.showDriveSyncModal();
    };

    document.getElementById("autoLoadToggle").onchange = (e) => {
      this.setAutoLoadEnabled(e.target.checked);
      showToast?.(
        e.target.checked
          ? "Auto-load enabled"
          : "Auto-load disabled",
        "info"
      );
    };

    document.getElementById("autoLoadModeSelect").onchange = (e) => {
      this.setAutoLoadMode(e.target.value);
      showToast?.("Mode updated", "success");
    };

    /* Pinned backup selection */
    document.querySelectorAll(".selectPinBtn").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        this.setAutoLoadFileId(id);
        this.setAutoLoadMode("pinned");

        showToast?.("Pinned backup selected", "success");
        self.showDriveSyncModal();
      };
    });

    /* Restore */
    document.querySelectorAll(".restoreBtn").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Restore this backup?")) return;
        await self.restoreBackup(btn.dataset.id);
      };
    });

    /* Delete */
    document.querySelectorAll(".deleteBackupBtn").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const name =
          btn.closest("div").querySelector("p")?.textContent || "backup";

        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

        const ok = await self.deleteBackupFile(id);
        if (ok) await self.showDriveSyncModal();
      };
    });
  },
  
  // ====================== CONFIGURATION MODAL ======================
  async showConfigModal() {
    try {
      const clientId = this.getClientId() || "";

      const html = `
        <div class='space-y-4 p-4 max-h-[80vh] overflow-y-auto'>
          <h3 class='font-semibold text-lg text-indigo-600'>⚙️ Drive Sync Configuration</h3>

          <div class='border rounded p-3 bg-yellow-50'>
            <p class='text-sm text-yellow-800'>
              <strong>⚠️ Setup Required:</strong> Add your Google OAuth 2.0 Client ID from Google Cloud Console
            </p>
          </div>

          <div class='space-y-2'>
            <label class='block'>
              <p class='text-sm font-medium text-gray-700'>Google OAuth Client ID</p>
              <input 
                type='text' 
                id='clientIdInput' 
                class='w-full mt-1 px-3 py-2 border border-gray-300 rounded text-sm'
                placeholder='xxxx.apps.googleusercontent.com'
                value='${this.escapeHtml(clientId)}'
              >
              <p class='text-xs text-gray-500 mt-1'>
                Get from: <code>console.cloud.google.com → APIs → Credentials → OAuth 2.0 Client ID</code>
              </p>
            </label>
          </div>

          <div class='flex gap-2'>
            <button class='glass px-3 py-2 rounded bg-indigo-500 text-white' id='btnSaveConfig'>
              ✅ Save Configuration
            </button>
            <button class='glass px-3 py-2 rounded bg-gray-400 text-white' id='btnCancelConfig'>
              ❌ Cancel
            </button>
          </div>
        </div>
      `;

      if (typeof showSimpleModal === "function") {
        showSimpleModal("⚙️ Drive Configuration", html);
      } else {
        console.log("Modal not available");
        return;
      }

      const self = this;

      const saveBtn = document.getElementById("btnSaveConfig");
      if (saveBtn) {
        saveBtn.onclick = () => {
          const input = document.getElementById("clientIdInput");
          const clientIdValue = input.value.trim();

          if (!clientIdValue) {
            if (typeof showToast === "function") {
              showToast("❌ Please enter Client ID", "error");
            }
            return;
          }

          try {
            self.setClientId(clientIdValue);
            if (typeof showToast === "function") {
              showToast("✅ Configuration saved successfully", "success");
            }
            // Close modal
            const modal = document.querySelector('[role="dialog"]');
            if (modal) modal.remove();
            self.showDriveSyncModal();
          } catch (err) {
            if (typeof showToast === "function") {
              showToast("❌ Invalid Client ID: " + err.message, "error");
            }
          }
        };
      }

      const cancelBtn = document.getElementById("btnCancelConfig");
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          const modal = document.querySelector('[role="dialog"]');
          if (modal) modal.remove();
        };
      }

    } catch (err) {
      console.error("❌ showConfigModal error:", err);
      if (typeof showToast === "function") {
        showToast("❌ Error: " + err.message, "error");
      }
    }
  },
};

/* GLOBAL DELETE HANDLER (EVENT DELEGATION) */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".deleteBackupBtn");
  if (!btn) return;
  if (btn.disabled) return;

  const id = btn.dataset.id;
  if (!confirm("Delete this backup?")) return;

  const ok = await DriveSync.deleteBackupFile(id);
  if (ok) DriveSync.showDriveSyncModal();
});

/* AUTO INIT ON LOAD */
window.addEventListener("load", async () => {
  try {
    if (DriveSync.isClientIdConfigured()) {
      await DriveSync.init();
      await DriveSync.autoLoadConfiguredBackup();
    }
  } catch (_) {}
});

window.DriveSync = DriveSync;
