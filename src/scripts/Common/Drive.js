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
  AUTO_LOAD_MODE: "drive_auto_load_mode",
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
     AUTO-LOAD SETTINGS
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
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const j = await res.json();

    if (j.files?.length) {
      localStorage.setItem(STORAGE_KEYS.FOLDER_ID, j.files[0].id);
      return j.files[0].id;
    }

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
     UPLOAD BACKUP
     ========================================================= */
  async uploadBackup(data, folderId = null) {
    try {
      console.log("📤 Starting backup upload...");

      const token = this.getToken();
      if (!token) throw new Error("Not connected to Drive");

      if (!folderId) {
        folderId = await this.ensureFolder();
      }

      const now = new Date();
      const fileName = "LedgerMate_" + now.toISOString().slice(0, 19).replace(/[:T]/g, "_") + ".json";

      console.log("🔐 Encoding data...");
      const jsonString = JSON.stringify(data);
      const encodedText = btoa(unescape(encodeURIComponent(jsonString)));

      const metadata = {
        name: fileName,
        mimeType: "text/plain",
        parents: [folderId],
      };

      console.log("🚀 Uploading to Drive...");

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", new Blob([encodedText], { type: "text/plain" }));

      const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
          },
          body: form,
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Upload error response:", errorText);
        throw new Error(`Upload failed: ${res.status}`);
      }

      const result = await res.json();

      console.log("✅ Backup uploaded successfully");
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, now.toISOString());
      showToast?.("☁️ Backup uploaded: " + result.name, "success");

      return result;

    } catch (err) {
      console.error("❌ Upload error:", err);
      showToast?.("❌ Upload failed: " + err.message, "error");
      throw err;
    }
  },

  /* =========================================================
     LIST BACKUPS
     ========================================================= */
  async listBackups(folderId = null) {
    try {
      console.log("📋 Fetching backup list...");

      const token = this.getToken();
      if (!token) throw new Error("Not connected to Drive");

      if (!folderId) {
        folderId = await this.ensureFolder();
      }

      const q = `'${folderId}' in parents and name contains '.json' and trashed=false`;

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime,size)&orderBy=createdTime%20desc&pageSize=50`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`List failed: ${res.status}`);
      }

      const data = await res.json();
      const files = data.files || [];

      console.log("✅ Found " + files.length + " backups");
      return files;

    } catch (err) {
      console.error("❌ List backups error:", err);
      return [];
    }
  },

  /* =========================================================
     DOWNLOAD & DECODE
     ========================================================= */
 async downloadBackup(fileId) {
    try {
      console.log("📥 Downloading backup...");

      const token = this.getToken();
      if (!token) throw new Error("Not connected to Drive");

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Download failed: ${res.status}`);
      }

     // console.log("📥 Downloaded, decoding...");

      let encodedText = await res.text();
     // console.log("Raw text length:", encodedText.length);
     // console.log("Raw text start:", encodedText.substring(0, 50));

      encodedText = encodedText.trim();

      // Remove surrounding quotes if present
      if (encodedText.startsWith('"') && encodedText.endsWith('"')) {
        encodedText = encodedText.slice(1, -1);
      }

    //  console.log("After cleanup length:", encodedText.length);

     // console.log("🔓 Decoding data...");

      try {
        const decodedText = decodeURIComponent(escape(atob(encodedText)));
    //    console.log("Decoded text start:", decodedText.substring(0, 100));
        
        const data = JSON.parse(decodedText);

       // console.log("✅ Backup downloaded and decoded successfully");
       // console.log("✅ Data type:", typeof data);
       // console.log("✅ Data keys:", data ? Object.keys(data).slice(0, 5) : "null");

        return data;
      } catch (decodeErr) {
        console.error("Decode/Parse error:", decodeErr);
        throw new Error("Failed to decode backup: " + decodeErr.message);
      }

    } catch (err) {
      console.error("❌ Download error:", err);
      showToast?.("❌ Download failed: " + err.message, "error");
      throw err;
    }
  },
  /* =========================================================
     RESTORE BACKUP
     ========================================================= */
  async restoreBackup(fileId, source = "Unknown") {
    try {
     // console.log("🔄 Restoring backup...");

      const data = await this.downloadBackup(fileId);

      //console.log("📊 Received data type:", typeof data);
     // console.log("📊 Data is array?:", Array.isArray(data));
     // console.log("📊 Data keys:", data ? Object.keys(data).slice(0, 5) : "null");

      if (!data) {
        throw new Error("No data received from backup");
      }

      // Data can be object or already a string
      let restoreData = data;
      if (typeof data === "string") {
        restoreData = JSON.parse(data);
      }

      if (typeof restoreData !== "object") {
        throw new Error(`Invalid data type: ${typeof restoreData}`);
      }

     // console.log("💾 Restoring to database...");
        if (source !== "Drive") {
        if (typeof seedDefaults === "function") {
          await seedDefaults();
        }
      }
      if (typeof fullImportJSONText === "function") {
      //  console.log("Using fullImportJSONText function");
        const jsonString = JSON.stringify(restoreData);
        await fullImportJSONText(jsonString, "Drive");
      } else {
        console.log("Fallback: Using direct state assignment");
        if (typeof state !== "undefined") {
          Object.assign(state, restoreData);

          if (typeof onDataChange === "function") {
            for (const key in restoreData) {
              if (restoreData.hasOwnProperty(key)) {
                await onDataChange(key, restoreData[key]);
              }
            }
          }
        }
      }
      if (source !== "Drive") {
        if (typeof loadAllFromDB === "function") {
          await loadAllFromDB();
        } 
        if (typeof renderAll === "function") {
        renderAll();
      }
    }
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString()); 
    //  console.log("✅ Backup restored");
      if (source === "Drive") {
        showToast?.("☁️ Restored from Drive", "success");
      }else{
        showToast?.("✅ Backup restored successfully", "success");
      }

    } catch (err) {
      console.error("❌ Restore error:", err);
      console.error("Error details:", err.stack);
      showToast?.("❌ Restore failed: " + err.message, "error");
    }
  },

  /* =========================================================
     DELETE BACKUP
     ========================================================= */
  async deleteBackupFile(fileId) {
    try {
      const token = this.getToken();
      if (!token) throw new Error("Not connected");

      if (fileId === this.getAutoLoadFileId()) {
        showToast?.("⚠️ Cannot delete pinned backup", "warning");
        return false;
      }

      console.log("🗑️ Deleting backup...");

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }

      console.log("✅ Backup deleted");
      showToast?.("🗑️ Backup deleted", "success");

      return true;

    } catch (err) {
      console.error("❌ Delete error:", err);
      showToast?.("❌ Delete failed: " + err.message, "error");
      return false;
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
     AUTO-LOAD BACKUP
     ========================================================= */
  async autoLoadConfiguredBackup() {
    try {
      if (!this.isAutoLoadEnabled()) {
        console.log("⏭️ Auto-load disabled");
        return;
      }

      if (!this.isConnected()) {
        console.log("⏭️ Not connected to Drive");
        return;
      }

      const mode = this.getAutoLoadMode();
      let fileId = null;

      if (mode === "pinned") {
        fileId = this.getAutoLoadFileId();
        if (!fileId) {
          console.log("⏭️ No pinned backup");
          return;
        }
      } else {
        const files = await this.listBackups();
        if (files.length === 0) {
          console.log("⏭️ No backups found");
          return;
        }
        fileId = files[0].id;
      }

      console.log("⏰ Auto-loading backup...");
      await this.restoreBackup(fileId);

    } catch (err) {
      console.warn("⚠️ Auto-load failed:", err.message);
    }
  },

  /* =========================================================
     AUTO-BACKUP IF DUE
     ========================================================= */
  async autoBackupIfDue(data) {
    try {
      if (!this.isConnected()) {
        console.log("⏭️ Not connected, skipping auto-backup");
        return;
      }

      const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      const lastTime = lastBackup ? new Date(lastBackup).getTime() : 0;
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;

      if (now - lastTime > threeDays) {
        console.log("⏰ Auto-backup due, uploading...");
        await this.uploadBackup(data);
      } else {
        const hoursLeft = Math.round((threeDays - (now - lastTime)) / (60 * 60 * 1000));
        console.log(`⏭️ Next auto-backup in ${hoursLeft} hours`);
      }

    } catch (err) {
      console.warn("⚠️ Auto-backup failed:", err.message);
    }
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
              <button class="restoreBtn bg-emerald-500 text-white px-2 py-1 rounded text-xs" data-id="${f.id}">🔄</button>
               <button class="downloadBackupBtn bg-blue-500 text-white px-2 py-1 rounded text-xs" data-id="${f.id}" data-name="${this.escapeHtml(f.name)}" title="Download backup file">📥</button>
              <button class="deleteBackupBtn bg-red-500 text-white px-2 py-1 rounded text-xs ${isPinned ? "opacity-50 cursor-not-allowed" : ""}" data-id="${f.id}" ${isPinned ? "disabled" : ""}>🗑️</button>
            </div>
          </div>
        `;
      })
      .join("");

    const html = `
      <div class="space-y-4"> 
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

    const self = this;

    document.getElementById("btnDriveConnect").addEventListener("click", async () => {
      await self.signIn();
      await self.showDriveSyncModal();
    });

    document.getElementById("btnDriveUpload").addEventListener("click", async () => {
      await self.signIn();
      const txt = await FinalJson();
      await self.uploadBackup(txt);
      await self.showDriveSyncModal();
    });

    document.getElementById("btnDriveLogout").addEventListener("click", async () => {
      await self.signOut();
      await self.showDriveSyncModal();
    });

    document.getElementById("autoLoadToggle").addEventListener("change", (e) => {
      this.setAutoLoadEnabled(e.target.checked);
      showToast?.(
        e.target.checked
          ? "Auto-load enabled"
          : "Auto-load disabled",
        "info"
      );
    });

    document.getElementById("autoLoadModeSelect").addEventListener("change", (e) => {
      this.setAutoLoadMode(e.target.value);
      showToast?.("Mode updated", "success");
    });

    document.querySelectorAll(".selectPinBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        this.setAutoLoadFileId(id);
        this.setAutoLoadMode("pinned");
        showToast?.("Pinned backup selected", "success");
        self.showDriveSyncModal();
      });
    });

    document.querySelectorAll(".restoreBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Restore this backup?")) return;
        await self.restoreBackup(btn.dataset.id);
      });
    });

    document.querySelectorAll(".deleteBackupBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const name =
          btn.closest("div").querySelector("p")?.textContent || "backup";

        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

        const ok = await self.deleteBackupFile(id);
        if (ok) await self.showDriveSyncModal();
      });
    });
    document.querySelectorAll(".downloadBackupBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fileId = btn.dataset.id;
        const fileName = btn.dataset.name;
        
        try {
          showToast?.("📥 Downloading...", "info");
          
          const token = self.getToken();
          if (!token) throw new Error("Not connected");

          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
              headers: { Authorization: "Bearer " + token },
            }
          );

          if (!res.ok) throw new Error(`Download failed: ${res.status}`);

          const blob = await res.blob();

          // Create download link
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          showToast?.("✅ Downloaded: " + fileName, "success");

        } catch (err) {
          console.error("❌ Download error:", err);
          showToast?.("❌ Download failed: " + err.message, "error");
        }
      });
    });

  },

  /* =========================================================
     CONFIGURATION MODAL
     ========================================================= */
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
        saveBtn.addEventListener("click", () => {
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
            const modal = document.querySelector('[role="dialog"]');
            if (modal) modal.remove();
            self.showDriveSyncModal();
          } catch (err) {
            if (typeof showToast === "function") {
              showToast("❌ Invalid Client ID: " + err.message, "error");
            }
          }
        });
      }

      const cancelBtn = document.getElementById("btnCancelConfig");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          const modal = document.querySelector('[role="dialog"]');
          if (modal) modal.remove();
        });
      }

    } catch (err) {
      console.error("❌ showConfigModal error:", err);
      if (typeof showToast === "function") {
        showToast("❌ Error: " + err.message, "error");
      }
    }
  },
};
 

window.DriveSync = DriveSync;