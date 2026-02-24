/* ===================================
   Notes Module for LedgerMate - ENHANCED
   Additional Features:
   - Rich text editor (contenteditable with toolbar)
   - PDF export (using jsPDF already in your project)
   - All previous features maintained
   =================================== */

// ===================================
// Notes State Extension
// ===================================
if (!state.notes) state.notes = [];
if (!state.note_folders) state.note_folders = [];
if (!state.note_versions) state.note_versions = [];
if (!state.note_attachments) state.note_attachments = [];

let currentNote = null;
let currentFolder = null;
let autoSaveTimer = null;
let recognition = null;
let isRecording = false;
let editorMode = 'markdown'; // 'markdown' or 'rich'

let isFoldersCollapsed = false;
let isNotesCollapsed = false;
let isMobileView = false;
let mobileSidebarOpen = false;

function detectMobile() {
  isMobileView = window.innerWidth <= 768;
}
// ===================================
// Database Initialization
// ===================================
async function initNotesDB() {
  // This should be called during app init after openDB
  // The stores will be created via ensureStore pattern in onupgradeneeded
  const dbVersion = 10; // Increment from current version
  
  // Note: In production, you'd update the openDB function to version 10
  // and add these stores in the ensureStore calls:
  /*
  In Common.js openDB function, add:
  ensureStore("notes", { keyPath: "id", autoIncrement: true }, ["title", "folderId", "pinned", "modified"]);
  ensureStore("note_versions", { keyPath: "id", autoIncrement: true }, ["noteId", "timestamp"]);
  ensureStore("note_attachments", { keyPath: "id", autoIncrement: true }, ["noteId"]);
  ensureStore("note_folders", { keyPath: "id", autoIncrement: true }, ["parentId"]);
  */
}

// ===================================
// Load Notes Data
// ===================================
async function loadNotesData() {
  try {
    state.notes = await getAll('notes');
    state.note_folders = await getAll('note_folders');
    state.note_versions = await getAll('note_versions');
    state.note_attachments = await getAll('note_attachments');
  } catch (err) {
    console.error('Error loading notes data:', err);
    // Initialize empty if stores don't exist yet
    state.notes = [];
    state.note_folders = [];
    state.note_versions = [];
    state.note_attachments = [];
  }
}

// ===================================
// Main Modal Function
// ===================================
async  function showNotesModal() {
  try { 
   // await loadNotesData();
    renderNotesModal();
  } catch (err) {
    console.error("Notes modal error:", err);
    showToast("Failed to load notes", "error");
  }
}

function renderNotesModal() {
  const modalHTML = `
    <div id="notesBackdrop" class="notes-backdrop">
      <div class="notes-modal-panel">
        <div class="w-full max-w-7xl h-[90vh] glass rounded-2xl notes-shadow overflow-hidden flex flex-col">
          
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">📝 Notes</h2>
              <button id="notesRefreshBtn" class="p-2 rounded-lg glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Refresh">
                🔄
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button id="notesExportBtn" class="px-3 py-2 text-sm rounded-lg glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                📤 Export JSON
              </button>
              <button id="notesCloseBtn" class="p-2 rounded-lg glass hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-2xl leading-none">
                ×
              </button>
            </div>
          </div>

          <!-- Main Content -->
          <div class="flex flex-1 min-h-0 relative">
            
            <!-- Left Sidebar -->
            <div class="notes-sidebar w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
              
              <!-- Search & Actions -->
              <div class="p-3 space-y-2 border-b border-gray-200 dark:border-gray-700">
                <input 
                  id="notesSearchInput" 
                  type="text" 
                  placeholder="🔍 Search notes..." 
                  class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <div class="flex gap-2">
                  <button id="newNoteBtn" class="flex-1 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium">
                    ➕ New Note
                  </button>
                  <button id="newFolderBtn" class="px-3 py-2 text-sm rounded-lg glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    📁
                  </button>
                </div>
              </div>

              <!-- Tags Filter -->
              <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">FILTER BY TAG</div>
                <div id="notesTagFilter" class="flex flex-wrap gap-1">
                  <!-- Tags will be rendered here -->
                </div>
              </div>

              <!-- Folders & Notes List -->
              <div class="flex-1 overflow-y-auto notes-scroll p-3 space-y-2">
                <div id="notesFolderList">
                  <!-- Folders will be rendered here -->
                </div>
                <div id="notesNotesList">
                  <!-- Notes will be rendered here -->
                </div>
              </div>

            </div>

            <!-- Right Content Area -->
            <div class="flex-1 flex flex-col bg-white dark:bg-gray-800">
              
              <div id="notesEmptyState" class="flex-1 flex items-center justify-center text-center p-8 empty-state">
                <div>
                  <div class="text-6xl mb-4">📝</div>
                  <h3 class="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">No Note Selected</h3>
                  <p class="text-gray-500 dark:text-gray-400">Select a note or create a new one to get started</p>
                </div>
              </div>

              <div id="notesEditorArea" class="hidden flex-1 flex flex-col min-h-0">
                
                <!-- Note Header -->
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                  <div class="flex items-start gap-3">
                    <input 
                      id="noteTitle" 
                      type="text" 
                      placeholder="Note Title" 
                      class="flex-1 text-2xl font-bold bg-transparent border-none focus:outline-none"
                    />
                    <button id="notePinBtn" class="p-2 rounded-lg glass hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors pin-icon" title="Pin Note">
                      📌
                    </button>
                  </div>
                  
                  <!-- Tags Input -->
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500 dark:text-gray-400">🏷️</span>
                    <input 
                      id="noteTagsInput" 
                      type="text" 
                      placeholder="Add tags (comma-separated)" 
                      class="flex-1 px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <!-- Folder Selection -->
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500 dark:text-gray-400">📁</span>
                    <select 
                      id="note_folderselect" 
                      class="flex-1 px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">No Folder</option>
                    </select>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-2 flex-wrap">
                    <button id="noteVoiceBtn" class="px-3 py-1 text-sm rounded-lg glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      🎤 Voice
                    </button>
                    <button id="noteAISummaryBtn" class="px-3 py-1 text-sm rounded-lg glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      🤖 AI Summary
                    </button>
                    <button id="note_versionsBtn" class="px-3 py-1 text-sm rounded-lg glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      📜 Versions
                    </button>
                    <button id="note_attachmentsBtn" class="px-3 py-1 text-sm rounded-lg glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      📎 Attachments
                    </button>
                    <button id="noteExportPDFBtn" class="px-3 py-1 text-sm rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors">
                      📄 Export PDF
                    </button>
                    <button id="noteDeleteBtn" class="ml-auto px-3 py-1 text-sm rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors">
                      🗑️ Delete
                    </button>
                  </div>

                  <!-- Auto-save indicator -->
                  <div id="noteSaveStatus" class="text-xs text-gray-500 dark:text-gray-400 italic"></div>
                </div>

                <!-- Editor Mode Toggle -->
                <div class="flex border-b border-gray-200 dark:border-gray-700">
                  <button id="noteMarkdownModeBtn" class="flex-1 px-4 py-2 text-sm font-medium border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400">
                    📝 Markdown
                  </button>
                  <button id="noteRichModeBtn" class="flex-1 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    🎨 Rich Text
                  </button>
                  <button id="notePreviewTab" class="flex-1 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    👁️ Preview
                  </button>
                </div>

                <!-- Rich Text Toolbar (hidden by default) -->
                <div id="richTextToolbar" class="hidden border-b border-gray-200 dark:border-gray-700 p-2 flex gap-1 flex-wrap bg-gray-50/50 dark:bg-gray-900/50">
                  <button data-cmd="bold" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Bold">
                    <strong>B</strong>
                  </button>
                  <button data-cmd="italic" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Italic">
                    <em>I</em>
                  </button>
                  <button data-cmd="underline" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Underline">
                    <u>U</u>
                  </button>
                  <button data-cmd="strikeThrough" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Strikethrough">
                    <s>S</s>
                  </button>
                  <span class="border-l border-gray-300 dark:border-gray-600 mx-1"></span>
                  <button data-cmd="insertUnorderedList" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Bullet List">
                    • List
                  </button>
                  <button data-cmd="insertOrderedList" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Numbered List">
                    1. List
                  </button>
                  <span class="border-l border-gray-300 dark:border-gray-600 mx-1"></span>
                  <button data-cmd="formatBlock:h1" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Heading 1">
                    H1
                  </button>
                  <button data-cmd="formatBlock:h2" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Heading 2">
                    H2
                  </button>
                  <button data-cmd="formatBlock:h3" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Heading 3">
                    H3
                  </button>
                  <button data-cmd="formatBlock:p" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Paragraph">
                    P
                  </button>
                  <span class="border-l border-gray-300 dark:border-gray-600 mx-1"></span>
                  <button data-cmd="justifyLeft" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Align Left">
                    ⬅
                  </button>
                  <button data-cmd="justifyCenter" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Align Center">
                    ↔
                  </button>
                  <button data-cmd="justifyRight" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Align Right">
                    ➡
                  </button>
                  <span class="border-l border-gray-300 dark:border-gray-600 mx-1"></span>
                  <input type="color" id="textColorPicker" class="w-8 h-8 rounded border-0 cursor-pointer" title="Text Color" />
                  <input type="color" id="bgColorPicker" class="w-8 h-8 rounded border-0 cursor-pointer" title="Background Color" />
                  <span class="border-l border-gray-300 dark:border-gray-600 mx-1"></span>
                  <button data-cmd="createLink" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Insert Link">
                    🔗
                  </button>
                  <button data-cmd="removeFormat" class="toolbar-btn px-3 py-1 text-sm rounded glass hover:bg-red-50 dark:hover:bg-red-900/20" title="Clear Formatting">
                    🚫
                  </button>
                </div>

                <!-- Editor Content -->
                <div class="flex-1 min-h-0 relative">
                  <!-- Markdown Editor -->
                  <textarea 
                    id="noteContentEditor" 
                    class="w-full h-full p-4 bg-transparent border-none resize-none focus:outline-none notes-editor notes-scroll font-mono text-sm"
                    placeholder="Start writing your note... (Supports Markdown)"
                  ></textarea>
                  
                  <!-- Rich Text Editor -->
                  <div 
                    id="noteRichEditor" 
                    contenteditable="true"
                     class="hidden absolute inset-0 overflow-y-auto p-4 notes-scroll">
                    style="min-height: 200px;"
                  ></div>
                  
                  <!-- Preview -->
                  <div id="noteContentPreview" class="hidden w-full h-full p-4 overflow-y-auto notes-scroll markdown-preview"></div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  `;

  // Remove any existing modals
  const existingBackdrop = document.getElementById('notesBackdrop');
  if (existingBackdrop) existingBackdrop.remove();

  // Insert modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Animate in
 setTimeout(() => {
  const backdrop = document.getElementById('notesBackdrop');
  if (backdrop) backdrop.classList.add('show');
}, 10);

  // Bind events
  bindNotesEvents();

  // Render content
  renderFoldersList();
  renderNotesList();
  renderTagsFilter();
}

// ===================================
// Event Bindings
// ===================================
function bindNotesEvents() {
  // Close modal
  document.getElementById('notesCloseBtn').onclick = closeNotesModal;
  document.getElementById('notesBackdrop').onclick = (e) => {
    if (e.target.id === 'notesBackdrop') closeNotesModal();
  };

  // Actions
  document.getElementById('newNoteBtn').onclick = createNewNote;
  document.getElementById('newFolderBtn').onclick = createNewFolder;
  document.getElementById('notesRefreshBtn').onclick = () => {
    loadNotesData().then(() => {
      renderFoldersList();
      renderNotesList();
      renderTagsFilter();
      if (currentNote) loadNote(currentNote.id);
    });
  };
  document.getElementById('notesExportBtn').onclick = exportNotesAsJSON;

  // Search
  document.getElementById('notesSearchInput').oninput = (e) => {
    const query = e.target.value.toLowerCase();
    filterNotesList(query);
  };

  // Editor events
  const titleInput = document.getElementById('noteTitle');
  const contentEditor = document.getElementById('noteContentEditor');
  const richEditor = document.getElementById('noteRichEditor');
  const tagsInput = document.getElementById('noteTagsInput');
  const folderSelect = document.getElementById('note_folderselect');

  if (titleInput) titleInput.oninput = () => scheduleAutoSave();
  if (contentEditor) contentEditor.oninput = () => scheduleAutoSave();
  if (richEditor) richEditor.oninput = () => scheduleAutoSave();
  if (tagsInput) tagsInput.onchange = () => scheduleAutoSave();
  if (folderSelect) folderSelect.onchange = () => scheduleAutoSave();

  // Pin button
  document.getElementById('notePinBtn').onclick = togglePinNote;

  // Delete button
  document.getElementById('noteDeleteBtn').onclick = deleteCurrentNote;

  // Mode tabs
  document.getElementById('noteMarkdownModeBtn').onclick = () => switchEditorMode('markdown');
  document.getElementById('noteRichModeBtn').onclick = () => switchEditorMode('rich');
  document.getElementById('notePreviewTab').onclick = () => switchEditorMode('preview');

  // Voice button
  document.getElementById('noteVoiceBtn').onclick = toggleVoiceRecording;

  // AI Summary button
  document.getElementById('noteAISummaryBtn').onclick = generateAISummary;

  // Versions button
  document.getElementById('note_versionsBtn').onclick = showVersionHistory;

  // Attachments button
  document.getElementById('note_attachmentsBtn').onclick = showAttachmentsPanel;

  // PDF Export button
  document.getElementById('noteExportPDFBtn').onclick = exportNoteToPDF;

  // Rich text toolbar
  bindRichTextToolbar();
}

// ===================================
// Rich Text Toolbar Bindings
// ===================================
function bindRichTextToolbar() {
  const toolbar = document.getElementById('richTextToolbar');
  if (!toolbar) return;

  // Command buttons
  toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      
      if (cmd.includes(':')) {
        const [command, value] = cmd.split(':');
        document.execCommand(command, false, value);
      } else if (cmd === 'createLink') {
        const url = prompt('Enter URL:');
        if (url) document.execCommand('createLink', false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
      
      document.getElementById('noteRichEditor').focus();
    };
  });

  // Color pickers
  document.getElementById('textColorPicker').onchange = (e) => {
    document.execCommand('foreColor', false, e.target.value);
    document.getElementById('noteRichEditor').focus();
  };

  document.getElementById('bgColorPicker').onchange = (e) => {
    document.execCommand('backColor', false, e.target.value);
    document.getElementById('noteRichEditor').focus();
  };
}

// ===================================
// Switch Editor Mode
// ===================================
function switchEditorMode(mode) {
  const markdownBtn = document.getElementById('noteMarkdownModeBtn');
  const richBtn = document.getElementById('noteRichModeBtn');
  const previewBtn = document.getElementById('notePreviewTab');
  const markdownEditor = document.getElementById('noteContentEditor');
  const richEditor = document.getElementById('noteRichEditor');
  const preview = document.getElementById('noteContentPreview');
  const toolbar = document.getElementById('richTextToolbar');

  // Reset all
  markdownBtn.classList.remove('border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400');
  markdownBtn.classList.add('border-transparent', 'text-gray-500');
  richBtn.classList.remove('border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400');
  richBtn.classList.add('border-transparent', 'text-gray-500');
  previewBtn.classList.remove('border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400');
  previewBtn.classList.add('border-transparent', 'text-gray-500');
  
  markdownEditor.classList.add('hidden');
  richEditor.classList.add('hidden');
  preview.classList.add('hidden');
  toolbar.classList.add('hidden');

  if (mode === 'markdown') {
    markdownBtn.classList.add('border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400');
    markdownBtn.classList.remove('border-transparent', 'text-gray-500');
    markdownEditor.classList.remove('hidden');
    editorMode = 'markdown';
    
    // Sync from rich to markdown if switching
    if (currentNote && currentNote.richContent) {
      markdownEditor.value = htmlToMarkdown(currentNote.richContent);
    }
  } else if (mode === 'rich') {
    richBtn.classList.add('border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400');
    richBtn.classList.remove('border-transparent', 'text-gray-500');
    richEditor.classList.remove('hidden');
    toolbar.classList.remove('hidden');
    editorMode = 'rich';
    
    // Sync from markdown to rich if switching
    if (currentNote && !currentNote.richContent) {
      richEditor.innerHTML = renderMarkdown(markdownEditor.value);
    }
  } else if (mode === 'preview') {
    previewBtn.classList.add('border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400');
    previewBtn.classList.remove('border-transparent', 'text-gray-500');
    preview.classList.remove('hidden');
    
    // Render preview from current mode
    const content = editorMode === 'rich' ? richEditor.innerHTML : renderMarkdown(markdownEditor.value);
    preview.innerHTML = content;
  }
}

// ===================================
// HTML to Markdown Converter (Basic)
// ===================================
function htmlToMarkdown(html) {
  if (!html) return '';
  
  let md = html;
  
  // Remove HTML tags with markdown equivalents
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__');
  md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
  md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  });
  md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
    let counter = 1;
    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
  });
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<\/p>/gi, '\n\n');
  md = md.replace(/<p[^>]*>/gi, '');
  md = md.replace(/<div[^>]*>/gi, '');
  md = md.replace(/<\/div>/gi, '\n');
  
  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');
  
  return md.trim();
}

// ===================================
// Close Modal
// ===================================
function closeNotesModal() {
  // Save before closing
  if (currentNote) {
    clearTimeout(autoSaveTimer);
    saveCurrentNote();
  }

  const backdrop = document.getElementById('notesBackdrop');
  if (backdrop) {
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 300);
  }
  
  currentNote = null;
  currentFolder = null;
  editorMode = 'markdown';
}

// ===================================
// Render Functions
// ===================================
function renderFoldersList() {
  const container = document.getElementById('notesFolderList');
  if (!container) return;

  const folders = state.note_folders || [];
  if (folders.length === 0) {
    container.innerHTML = '';
    return;
  }

  
const html = `
  <div class="mb-2">
    <div id="foldersToggleBtn"
         class="flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
      <span>📁 FOLDERS</span>
      <span id="foldersArrow" class="transition-transform duration-200">▾</span>
    </div>

    <div id="foldersContent" class="space-y-1 overflow-hidden transition-all duration-300">
      <div class="folder-item px-3 py-2 rounded-lg glass ${!currentFolder ? 'active' : ''}" data-folder-id="">
        📂 All Notes
      </div>
      ${folders.map(folder => `
        <div class="folder-item px-3 py-2 rounded-lg glass ${currentFolder?.id === folder.id ? 'active' : ''}" data-folder-id="${folder.id}">
          📁 ${folder.name}
          <button class="float-right text-xs text-red-500 hover:text-red-700 delete-folder-btn" data-folder-id="${folder.id}">×</button>
        </div>
      `).join('')}
    </div>
  </div>
`;

  container.innerHTML = html;

  // Bind folder clicks
  container.querySelectorAll('.folder-item').forEach(el => {
    el.onclick = (e) => {
      if (e.target.classList.contains('delete-folder-btn')) {
        e.stopPropagation();
        deleteFolder(e.target.dataset.folderId);
        return;
      }
      const folderId = el.dataset.folderId;
      currentFolder = folderId ? folders.find(f => f.id === folderId) : null;
      renderFoldersList();
      renderNotesList();
    };
  });
  // Collapsible toggle
// Collapsible toggle
const toggleBtn = document.getElementById('foldersToggleBtn');
const content = document.getElementById('foldersContent');
const arrow = document.getElementById('foldersArrow');

if (toggleBtn && content && arrow) {

  // Apply current state
  if (isFoldersCollapsed) {
    content.style.maxHeight = '0px';
    arrow.style.transform = 'rotate(-90deg)';
  } else {
    content.style.maxHeight = content.scrollHeight + 'px';
    arrow.style.transform = 'rotate(0deg)';
  }

  toggleBtn.onclick = () => {
    isFoldersCollapsed = !isFoldersCollapsed;

    if (isFoldersCollapsed) {
      content.style.maxHeight = '0px';
      arrow.style.transform = 'rotate(-90deg)';
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
      arrow.style.transform = 'rotate(0deg)';
    }
  };
} 
}
 function renderNotesList() {
  const container = document.getElementById('notesNotesList');
  if (!container) return;

  let notes = state.notes || [];

  // Filter by folder
  if (currentFolder) {
    notes = notes.filter(n => n.folderId === currentFolder.id);
  }

  // Sort: pinned first, then modified date
  notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.modified || b.created) - new Date(a.modified || a.created);
  });

  if (notes.length === 0) {
    container.innerHTML = `
      <div class="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
        No notes in this folder
      </div>`;
    return;
  }

  const html = `
    <div class="mb-2">
      <div id="notesToggleBtn"
           class="flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
        <span>🗒 NOTES</span>
        <span id="notesArrow" class="transition-transform duration-200">▾</span>
      </div>

      <div id="notesContent" class="space-y-2 overflow-hidden transition-all duration-300">
        ${notes.map(note => {

          const content = note.richContent || note.content || '';
          const excerpt = content
            .replace(/<[^>]*>/g, '')
            .replace(/\n/g, ' ')
            .substring(0, 80);

          return `
            <div class="note-item px-3 py-3 rounded-xl glass hover:scale-[1.02] transition-all duration-200 
              ${currentNote?.id === note.id ? 'active ring-2 ring-indigo-500' : ''}" 
              data-note-id="${note.id}">
              
              <div class="font-semibold text-sm truncate">
                ${note.pinned ? '📌 ' : ''}${note.title || 'Untitled'}
              </div>

              <div class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                ${excerpt || 'No content'}
              </div>

            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Bind note clicks
  container.querySelectorAll('.note-item').forEach(el => {
    el.onclick = () => {
      const noteId = el.dataset.noteId;
      loadNote(noteId);
    };
  });

  // Collapsible logic
  const toggleBtn = document.getElementById('notesToggleBtn');
  const contentDiv = document.getElementById('notesContent');
  const arrow = document.getElementById('notesArrow');

  if (toggleBtn && contentDiv && arrow) {

    if (isNotesCollapsed) {
      contentDiv.style.maxHeight = '0px';
      arrow.style.transform = 'rotate(-90deg)';
    } else {
      contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
    }

    toggleBtn.onclick = () => {
      isNotesCollapsed = !isNotesCollapsed;

      if (isNotesCollapsed) {
        contentDiv.style.maxHeight = '0px';
        arrow.style.transform = 'rotate(-90deg)';
      } else {
        contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
        arrow.style.transform = 'rotate(0deg)';
      }
    };
  }
}

function renderTagsFilter() {
  const container = document.getElementById('notesTagFilter');
  if (!container) return;

  // Collect all unique tags
  const allTags = new Set();
  (state.notes || []).forEach(note => {
    if (note.tags) {
      note.tags.forEach(tag => allTags.add(tag));
    }
  });

  if (allTags.size === 0) {
    container.innerHTML = '<div class="text-xs text-gray-400">No tags yet</div>';
    return;
  }

  const html = Array.from(allTags).map(tag => 
    `<span class="tag-badge" data-tag="${tag}">${tag}</span>`
  ).join('');

  container.innerHTML = html;

  // Bind tag filter clicks
  container.querySelectorAll('.tag-badge').forEach(el => {
    el.onclick = () => {
      el.classList.toggle('active');
      filterNotesByTags();
    };
  });
}

function filterNotesList(query) {
  const notes = document.querySelectorAll('.note-item');
  notes.forEach(el => {
    const noteId = el.dataset.noteId;
    const note = state.notes.find(n => String(n.id) === String(noteId));
    if (!note) return;

    const searchText = `${note.title} ${note.content || ''} ${note.richContent || ''}`.toLowerCase();
    if (searchText.includes(query)) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

function filterNotesByTags() {
  const activeTags = Array.from(document.querySelectorAll('.tag-badge.active')).map(el => el.dataset.tag);
  
  if (activeTags.length === 0) {
    // Show all notes
    renderNotesList();
    return;
  }

  const notes = document.querySelectorAll('.note-item');
  notes.forEach(el => {
    const noteId = el.dataset.noteId;
    const note = state.notes.find(n =>String(n.id) === String(noteId));
    if (!note || !note.tags) {
      el.style.display = 'none';
      return;
    }

    const hasTag = activeTags.some(tag => note.tags.includes(tag));
    el.style.display = hasTag ? '' : 'none';
  });
}

function renderFolderDropdown() {
  const select = document.getElementById('note_folderselect');
  if (!select) return;

  const folders = state.note_folders || [];
  const html = `
    <option value="">No Folder</option>
    ${folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
  `;
  select.innerHTML = html;

  if (currentNote && currentNote.folderId) {
    select.value = currentNote.folderId;
  }
}

// ===================================
// Create New Note
// ===================================
async function createNewNote() {
  // Save current note if any
  if (currentNote) {
    await saveCurrentNote();
  }

  const newNote = {
    id: uid('note'),
    title: '',
    content: '',
    richContent: '',
    tags: [],
    folderId: currentFolder ? currentFolder.id : '',
    pinned: false,
    created: new Date().toISOString(),
    modified: new Date().toISOString()
  };

  await put('notes', newNote);
  state.notes.push(newNote);

  renderNotesList();
  loadNote(newNote.id);

  showToast('New note created', 'success');
}

// ===================================
// Create New Folder
// ===================================
async function createNewFolder() {
  const name = prompt('Enter folder name:');
  if (!name || !name.trim()) return;

  const folder = {
    id: uid('folder'),
    name: name.trim(),
    parentId: '', // For future nested folders
    created: new Date().toISOString()
  };

  await put('note_folders', folder);
  state.note_folders.push(folder);

  renderFoldersList();
  showToast('Folder created', 'success');
}

// ===================================
// Delete Folder
// ===================================
async function deleteFolder(folderId) {
  if (!confirm('Delete this folder? Notes inside will not be deleted.')) return;

  await del('note_folders', folderId);
  state.note_folders = state.note_folders.filter(f => f.id !== folderId);

  // Remove folder reference from notes
  const notesInFolder = state.notes.filter(n => n.folderId === folderId);
  for (const note of notesInFolder) {
    note.folderId = '';
    await put('notes', note);
  }

  if (currentFolder?.id === folderId) {
    currentFolder = null;
  }

  renderFoldersList();
  renderNotesList();
  showToast('Folder deleted', 'success');
}

// ===================================
// Load Note
// ===================================
function loadNote(noteId) {
  const note = state.notes.find(n => String(n.id) === String(noteId));
  if (!note) return;

  // Save previous note
  if (currentNote && currentNote.id !== noteId) {
    saveCurrentNote();
  }

  currentNote = note;

  // Show editor area
  document.getElementById('notesEmptyState').classList.add('hidden');
  document.getElementById('notesEditorArea').classList.remove('hidden');

  // Load content
  document.getElementById('noteTitle').value = note.title || '';
  document.getElementById('noteContentEditor').value = note.content || '';
  document.getElementById('noteRichEditor').innerHTML = note.richContent || '';
  document.getElementById('noteTagsInput').value = (note.tags || []).join(', ');

  // Update folder dropdown
  renderFolderDropdown();

  // Update pin button
  const pinBtn = document.getElementById('notePinBtn');
  if (note.pinned) {
    pinBtn.style.filter = 'grayscale(0%)';
    pinBtn.title = 'Unpin Note';
  } else {
    pinBtn.style.filter = 'grayscale(100%)';
    pinBtn.title = 'Pin Note';
  }

  // Highlight in list
  renderNotesList();

  // Reset to markdown mode
  switchEditorMode('markdown');

  // Clear save status
  document.getElementById('noteSaveStatus').textContent = '';
  if (isMobileView && mobileSidebarOpen) {
  toggleMobileSidebar();
}
}

// ===================================
// Save Current Note
// ===================================
async function saveCurrentNote() {
  if (!currentNote) return;

  // Create version before saving
  await createNoteVersion();

  const title = document.getElementById('noteTitle').value;
  const markdownContent = document.getElementById('noteContentEditor').value;
  const richContent = document.getElementById('noteRichEditor').innerHTML;
  const tagsText = document.getElementById('noteTagsInput').value;
  const folderId = document.getElementById('note_folderselect').value;

  const tags = tagsText.split(',').map(t => t.trim()).filter(t => t);

  currentNote.title = title;
  currentNote.content = markdownContent;
  currentNote.richContent = richContent;
  currentNote.tags = tags;
  currentNote.folderId = folderId;
  currentNote.modified = new Date().toISOString();

  await put('notes', currentNote);

  // Update in state
  const index = state.notes.findIndex(n => n.id === currentNote.id);
  if (index !== -1) {
    state.notes[index] = currentNote;
  }

  document.getElementById('noteSaveStatus').textContent = '✅ Saved';
  setTimeout(() => {
    document.getElementById('noteSaveStatus').textContent = '';
  }, 10000);

  renderNotesList();
  renderTagsFilter();
}

// ===================================
// Auto-save with Debounce
// ===================================
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  document.getElementById('noteSaveStatus').textContent = '💾 Saving...';
  autoSaveTimer = setTimeout(() => {
    saveCurrentNote();
  }, 10000);
}

// ===================================
// Toggle Pin
// ===================================
async function togglePinNote() {
  if (!currentNote) return;

  currentNote.pinned = !currentNote.pinned;
  await put('notes', currentNote);

  const index = state.notes.findIndex(n => n.id === currentNote.id);
  if (index !== -1) {
    state.notes[index] = currentNote;
  }

  const pinBtn = document.getElementById('notePinBtn');
  if (currentNote.pinned) {
    pinBtn.style.filter = 'grayscale(0%)';
    pinBtn.title = 'Unpin Note';
    showToast('Note pinned', 'success');
  } else {
    pinBtn.style.filter = 'grayscale(100%)';
    pinBtn.title = 'Pin Note';
    showToast('Note unpinned', 'info');
  }

  renderNotesList();
}

// ===================================
// Delete Note
// ===================================
async function deleteCurrentNote() {
  if (!currentNote) return;
  if (!confirm('Delete this note permanently?')) return;

  // Delete versions
  const versions = state.note_versions.filter(v => v.noteId === currentNote.id);
  for (const v of versions) {
    await del('note_versions', v.id);
  }
  state.note_versions = state.note_versions.filter(v => v.noteId !== currentNote.id);

  // Delete attachments
  const attachments = state.note_attachments.filter(a => a.noteId === currentNote.id);
  for (const a of attachments) {
    await del('note_attachments', a.id);
  }
  state.note_attachments = state.note_attachments.filter(a => a.noteId !== currentNote.id);

  // Delete note
  await del('notes', currentNote.id);
  state.notes = state.notes.filter(n => n.id !== currentNote.id);

  currentNote = null;

  document.getElementById('notesEmptyState').classList.remove('hidden');
  document.getElementById('notesEditorArea').classList.add('hidden');

  renderNotesList();
  renderTagsFilter();
  showToast('Note deleted', 'success');
}

// ===================================
// Markdown Renderer (Basic)
// ===================================
function renderMarkdown(text) {
  if (!text) return '<p class="text-gray-400">No content to preview</p>';

  let html = text;

  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Lists
  html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gim, '<blockquote>$1</blockquote>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

// ===================================
// Version History
// ===================================
async function createNoteVersion() {
  if (!currentNote || (!currentNote.content && !currentNote.richContent)) return;

  const version = {
    id: uid('version'),
    noteId: currentNote.id,
    content: currentNote.content,
    richContent: currentNote.richContent,
    timestamp: new Date().toISOString()
  };

  await put('note_versions', version);
  state.note_versions.push(version);
}
function showVersionHistory() {
  if (!currentNote) return;

  const versions = state.note_versions
    .filter(v => v.noteId === currentNote.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (versions.length === 0) {
    showToast('No version history available', 'info');
    return;
  }

  // Remove existing modal if open
  const existing = document.getElementById('versionHistoryModal');
  if (existing) existing.remove();

  const modalHTML = `
    <div id="versionHistoryModal" 
         class="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">

      <div class="bg-white dark:bg-gray-900 w-[95%] max-w-lg max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b">
          <h3 class="font-bold text-lg">📜 Version History</h3>
          <button id="closeVersionModal" class="text-2xl">×</button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3 notes-scroll">

          ${versions.map(v => {
            const date = new Date(v.timestamp).toLocaleString('en-IN');
            const content = v.richContent || v.content || '';
            const preview = content.replace(/<[^>]*>/g, '').substring(0, 120);

            return `
              <div class="p-3 rounded-xl glass">
                <div class="text-xs text-gray-500 mb-1">${date}</div>
                <div class="text-sm mb-2 line-clamp-3">${preview || 'No content'}...</div>

                <button class="restore-version-btn px-3 py-1 text-xs rounded-lg bg-indigo-600 text-white"
                        data-version-id="${v.id}">
                  ↩️ Restore
                </button>
              </div>
            `;
          }).join('')}

        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Close modal
  document.getElementById('closeVersionModal').onclick = () => {
    document.getElementById('versionHistoryModal').remove();
  };

  // Close on backdrop click
  document.getElementById('versionHistoryModal').onclick = (e) => {
    if (e.target.id === 'versionHistoryModal') {
      document.getElementById('versionHistoryModal').remove();
    }
  };

  // Restore buttons
  document.querySelectorAll('.restore-version-btn').forEach(btn => {
    btn.onclick = async () => {
      const versionId = btn.dataset.versionId;
      const version = versions.find(v => v.id === versionId);
      if (!version) return;

      if (!confirm('Restore this version? Current content will be saved as a new version.')) return;

      // Save current as version
      await createNoteVersion();

      // Restore content
      currentNote.content = version.content || '';
      currentNote.richContent = version.richContent || '';
      currentNote.modified = new Date().toISOString();

      await put('notes', currentNote);

      // Update editors
      document.getElementById('noteContentEditor').value = currentNote.content;
      document.getElementById('noteRichEditor').innerHTML = currentNote.richContent;

      document.getElementById('versionHistoryModal').remove();
      showToast('Version restored', 'success');
    };
  });
}

// ===================================
// Attachments
// ===================================
 function showAttachmentsPanel() {
  if (!currentNote) return;

  const attachments = state.note_attachments.filter(a => a.noteId === currentNote.id);

  // Remove existing attachments modal if open
  const existing = document.getElementById('attachmentsModal');
  if (existing) existing.remove();

  const modalHTML = `
    <div id="attachmentsModal" 
         class="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">

      <div class="bg-white dark:bg-gray-900 w-[95%] max-w-md max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b">
          <h3 class="font-bold text-lg">📎 Attachments</h3>
          <button id="closeAttachmentsModal" class="text-2xl">×</button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">

          <input type="file" id="attachmentFileInput" multiple class="hidden" />
          
          <button id="addAttachmentBtn" 
            class="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            ➕ Add Attachment
          </button>

          ${attachments.length === 0 
            ? `<div class="text-center text-gray-500 py-6">No attachments</div>`
            : attachments.map(a => {
                const size = a.size ? (a.size / 1024).toFixed(2) + ' KB' : 'Unknown';
                const date = new Date(a.uploadedAt).toLocaleString('en-IN');

                return `
                  <div class="p-3 rounded-xl glass flex items-center justify-between">
                    <div class="pr-2">
                      <div class="font-semibold text-sm truncate">${a.filename}</div>
                      <div class="text-xs text-gray-500">${size} • ${date}</div>
                    </div>

                    <div class="flex gap-2">
                      <button class="download-attachment-btn px-3 py-1 text-xs rounded-lg bg-emerald-500 text-white"
                        data-attachment-id="${a.id}">
                        ⬇️
                      </button>

                      <button class="delete-attachment-btn px-3 py-1 text-xs rounded-lg bg-red-500 text-white"
                        data-attachment-id="${a.id}">
                        🗑️
                      </button>
                    </div>
                  </div>
                `;
              }).join('')
          }
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Close
  document.getElementById('closeAttachmentsModal').onclick = () => {
    document.getElementById('attachmentsModal').remove();
  };

  // Close on backdrop click
  document.getElementById('attachmentsModal').onclick = (e) => {
    if (e.target.id === 'attachmentsModal') {
      document.getElementById('attachmentsModal').remove();
    }
  };

  // Add file
  document.getElementById('addAttachmentBtn').onclick = () => {
    document.getElementById('attachmentFileInput').click();
  };

  document.getElementById('attachmentFileInput').onchange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      await addAttachment(file);
    }

    document.getElementById('attachmentsModal').remove();
    showAttachmentsPanel();
  };

  // Download
  document.querySelectorAll('.download-attachment-btn').forEach(btn => {
    btn.onclick = () => {
      downloadAttachment(btn.dataset.attachmentId);
    };
  });

  // Delete
  document.querySelectorAll('.delete-attachment-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this attachment?')) return;

      await del('note_attachments', btn.dataset.attachmentId);
      state.note_attachments = state.note_attachments.filter(a => a.id !== btn.dataset.attachmentId);

      document.getElementById('attachmentsModal').remove();
      showAttachmentsPanel();
      showToast('Attachment deleted', 'success');
    };
  });
}

async function addAttachment(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const attachment = {
        id: uid('attach'),
        noteId: currentNote.id,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        data: e.target.result, // Base64
        uploadedAt: new Date().toISOString()
      };

      await put('note_attachments', attachment);
      state.note_attachments.push(attachment);

      showToast(`Attachment "${file.name}" added`, 'success');
      resolve();
    };
    reader.readAsDataURL(file);
  });
}

function downloadAttachment(id) {
  const attachment = state.note_attachments.find(a => a.id === id);
  if (!attachment) return;

  const link = document.createElement('a');
  link.href = attachment.data;
  link.download = attachment.filename;
  link.click();

  showToast('Attachment downloaded', 'success');
}

// ===================================
// Voice Recording (Web Speech API)
// ===================================
function toggleVoiceRecording() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice input not supported in this browser', 'error');
    return;
  }

  if (isRecording) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

function startVoiceRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    const btn = document.getElementById('noteVoiceBtn');
    btn.innerHTML = '🔴 Recording...';
    btn.classList.add('recording-indicator');
    showToast('Voice recording started', 'info');
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        transcript += event.results[i][0].transcript + ' ';
      }
    }

    if (transcript) {
      if (editorMode === 'markdown') {
        const editor = document.getElementById('noteContentEditor');
        editor.value += transcript;
      } else if (editorMode === 'rich') {
        const editor = document.getElementById('noteRichEditor');
        editor.innerHTML += transcript;
      }
      scheduleAutoSave();
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopVoiceRecording();
    showToast('Voice recording error', 'error');
  };

  recognition.onend = () => {
    stopVoiceRecording();
  };

  recognition.start();
}

function stopVoiceRecording() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  isRecording = false;
  const btn = document.getElementById('noteVoiceBtn');
  btn.innerHTML = '🎤 Voice';
  btn.classList.remove('recording-indicator');
  showToast('Voice recording stopped', 'info');
}

// ===================================
// AI Summary
// ===================================
async function generateAISummary() {
  if (!currentNote) {
    showToast('No content to summarize', 'info');
    return;
  }

  const content = currentNote.richContent || currentNote.content || '';
  if (!content) {
    showToast('No content to summarize', 'info');
    return;
  }

  showToast('Generating summary...', 'info');

  // Remove HTML tags for plain text
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Offline basic summary (first 3 sentences)
  const sentences = plainText.split(/[.!?]+/).filter(s => s.trim());
  const summary = sentences.slice(0, 3).join('. ') + '.';

  // Option: Call API for better summary
  // const apiSummary = await callAISummaryAPI(plainText);

  const html = `
    <div class="p-4">
      <h3 class="font-bold text-lg mb-3">🤖 AI Summary</h3>
      <div class="p-4 rounded-lg glass mb-3">
        <div class="text-sm mb-2 font-semibold text-gray-500 dark:text-gray-400">Basic Summary:</div>
        <p class="text-sm">${summary}</p>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400 italic">
        Note: This is a basic offline summary. For advanced AI summaries, integrate with an API.
      </div>
      <button id="copyAISummaryBtn" class="mt-3 w-full px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
        📋 Copy Summary
      </button>
    </div>
  `;

  showSimpleModal('AI Summary', html);

  document.getElementById('copyAISummaryBtn').onclick = () => {
    navigator.clipboard.writeText(summary);
    showToast('Summary copied to clipboard', 'success');
  };
}

// Placeholder for API-based AI summary
async function callAISummaryAPI(content) {
  // Example:
  // const response = await fetch('https://api.example.com/summarize', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ text: content })
  // });
  // const data = await response.json();
  // return data.summary;
  
  return 'API summary not configured';
}
function decodeHtmlEntities(text) {
  const txt = document.createElement("textarea");
  txt.innerHTML = text;
  return txt.value;
}
// ===================================
// PDF Export (using jsPDF)
// ===================================
async function exportNoteToPDF() {
  if (!currentNote) {
    showToast('No note to export', 'info');
    return;
  }

  if (!window.jspdf || !window.html2canvas) {
    showToast('PDF libraries not loaded', 'error');
    return;
  }

  showToast('Generating PDF...', 'info');

  try {
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: "a4"
    });

    /* ===============================
       PROFESSIONAL FILENAME
    =============================== */

    const cleanTitle = (currentNote.title || "Untitled")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 80);

    const now = new Date();
    const datePart = now.toISOString().split("T")[0];
    const timePart = now.toTimeString().slice(0,5).replace(":", "-");

    const fileName = `${cleanTitle}_${datePart}_${timePart}.pdf`;

    /* ===============================
       GET EXACT EDITOR CONTENT
    =============================== */

    let editorHTML; 
    if (editorMode === "rich") {
      editorHTML = document.getElementById("noteRichEditor").innerHTML;
    } else {
      editorHTML = renderMarkdown(
        document.getElementById("noteContentEditor").value
      );
    }

    /* ===============================
       CREATE RENDER CONTAINER
    =============================== */

    const container = document.createElement("div");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20; // same as doc.html margin

    container.style.width = (pageWidth - margin * 2) + "px";
    container.style.padding = "0px";
    container.style.background = "#ffffff";
    container.style.color = "#000000";
    container.style.fontFamily = "Arial, Helvetica, sans-serif";
    container.style.fontSize = "12px";

    container.innerHTML = `
  <style>
    .pdf-header {
      position: relative;
      margin-bottom: 15px;
    }

    .pdf-meta {
      position: absolute;
      top: 0;
      right: 0;
      font-size: 9px;
      color: #666;
      text-align: right;
      line-height: 1.4;
    }

    .pdf-title {
      text-align: center;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      padding-top: 5px;
    }

    .pdf-content {
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
    }
  </style>

  <div class="pdf-header">
    <div class="pdf-meta">
      Created: ${new Date(currentNote.created).toLocaleString('en-IN')}<br/>
      Modified: ${new Date(currentNote.modified).toLocaleString('en-IN')}
    </div> 
    <div class="pdf-title">
      ${currentNote.title || "Untitled Note"}
    </div>
  </div> 
  <hr style="margin:15px 0;" /> 
  <div class="pdf-content">
    ${editorHTML}
  </div>
`;

    // Force black text (prevent dark-mode white text issue)
    container.querySelectorAll("*").forEach(el => {
      el.style.color = "#000";
    });

    document.body.appendChild(container);

    await new Promise(r => setTimeout(r, 100));

    /* ===============================
       RENDER HTML TO PDF
    =============================== */

    await doc.html(container, {
      margin: margin,
      autoPaging: "text",
      html2canvas: {
        scale: 1
      }
    });

    document.body.removeChild(container);

    /* ===============================
       FOOTER PAGE NUMBERS
    =============================== */

    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(
        `${currentNote.title || "Untitled Note"} | Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: "center" }
      );
    } 
    doc.save(fileName); 
    showToast("PDF exported successfully", "success");

  } catch (err) {
    console.error(err);
    showToast("PDF export failed", "error");
  }
}
// ===================================
// Export Notes as JSON
// ===================================
function exportNotesAsJSON() {
  const exportData = {
    notes: state.notes,
    folders: state.note_folders,
    versions: state.note_versions,
    attachments: state.note_attachments,
    exportedAt: new Date().toISOString()
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `notes_backup_${nowISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);

  showToast('Notes exported successfully', 'success');
}

// ===================================
// Export for integration
// ===================================
if (typeof window !== 'undefined') {
  window.showNotesModal = showNotesModal;
  window.loadNotesData = loadNotesData;
  window.initNotesDB = initNotesDB;
}

// ===================================
// MOBILE ENHANCEMENTS
// Add these functions to Notes_Mobile.js
// ===================================
// ===================================
// MOBILE COLLAPSIBLE SIDEBAR FIX
// ===================================

// Initialize mobile state when modal opens
function initMobileNotesView() {
  detectMobile();
  
  if (isMobileView) {
    // Ensure sidebar starts collapsed on mobile
    setTimeout(() => {
      const sidebar = document.getElementById('notesSidebar');
      const overlay = document.getElementById('mobileSidebarOverlay');
      const toggle = document.getElementById('mobileMenuToggle');
      
      if (sidebar) {
        sidebar.classList.remove('show');
        mobileSidebarOpen = false;
      }
      if (overlay) overlay.classList.remove('show');
      if (toggle) toggle.innerHTML = '☰';
      
      // Add mobile menu toggle if not present
      addMobileMenuToggle();
      
      // Add swipe listeners
      addSwipeListeners();
      
      // Add FAB
      addMobileFAB();
    }, 100);
  }
}

// Add mobile menu toggle button
function addMobileMenuToggle() {
  if (!isMobileView) return;
  
  // Remove existing toggle
  const existingToggle = document.getElementById('mobileMenuToggle');
  if (existingToggle) existingToggle.remove();
  
  // Create toggle button
  const toggle = document.createElement('button');
  toggle.id = 'mobileMenuToggle';
  toggle.className = 'mobile-menu-toggle';
  toggle.innerHTML = '☰';
  toggle.setAttribute('aria-label', 'Toggle notes menu');
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'mobileSidebarOverlay';
  overlay.className = 'mobile-sidebar-overlay';
  overlay.onclick = toggleMobileSidebar;
  
  // Add to modal
  const modal = document.getElementById('notesBackdrop');
  if (modal) {
    modal.appendChild(toggle);
    modal.appendChild(overlay);
  }
  
  // Add click handler
  toggle.onclick = toggleMobileSidebar;
}

// Add Floating Action Button for mobile
function addMobileFAB() {
  if (!isMobileView) return;
  
  // Remove existing FAB
  const existingFAB = document.getElementById('notesFAB');
  if (existingFAB) existingFAB.remove();
  
  // Create FAB
  const fab = document.createElement('button');
  fab.id = 'notesFAB';
  fab.className = 'notes-fab';
  fab.innerHTML = '✏️';
  fab.setAttribute('aria-label', 'Create new note');
  
  // Add to modal
  const modal = document.getElementById('notesBackdrop');
  if (modal) {
    modal.appendChild(fab);
  }
  
  // Add click handler
  fab.onclick = () => {
    createNewNote();
    triggerHaptic('light');
    
    // On mobile, close sidebar after creating note
    if (mobileSidebarOpen) {
      toggleMobileSidebar();
    }
  };
}

// Enhanced toggle function with haptic feedback
function toggleMobileSidebar() {
  const sidebar = document.getElementById('notesSidebar');
  const overlay = document.getElementById('mobileSidebarOverlay');
  const toggle = document.getElementById('mobileMenuToggle');
  
  if (!sidebar || !overlay) return;
  
  mobileSidebarOpen = !mobileSidebarOpen;
  
  if (mobileSidebarOpen) {
    sidebar.classList.add('show');
    overlay.classList.add('show');
    toggle.innerHTML = '✕';
    toggle.style.transform = 'rotate(0deg)';
    triggerHaptic('light');
  } else {
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
    toggle.innerHTML = '☰';
    toggle.style.transform = 'rotate(0deg)';
    triggerHaptic('light');
  }
}

// Auto-collapse sidebar when a note is selected (mobile)
function autoCollapseOnNoteSelect() {
  if (isMobileView && mobileSidebarOpen) {
    // Small delay to show the selection effect
    setTimeout(() => {
      toggleMobileSidebar();
    }, 300);
  }
}

// Override loadNote function to auto-collapse on mobile
const originalLoadNote = loadNote;
loadNote = function(noteId) {
  // Call original function
  originalLoadNote(noteId);
  
  // Auto-collapse on mobile after loading note
  autoCollapseOnNoteSelect();
};

// Override createNewNote to show editor immediately on mobile
const originalCreateNewNote = createNewNote;
createNewNote = async function() {
  await originalCreateNewNote();
  
  // On mobile, ensure sidebar is collapsed after creating new note
  if (isMobileView && mobileSidebarOpen) {
    toggleMobileSidebar();
  }
};

// Add CSS for mobile collapsible
function addMobileCollapsibleStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Mobile sidebar positioning */
    @media (max-width: 768px) {
      .notes-sidebar {
        position: fixed !important;
        top: 0;
        left: 0;
        width: 85%;
        max-width: 320px;
        height: 100vh;
        z-index: 100000;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        border-right: 1px solid rgba(0, 0, 0, 0.1);
      }
      
      .dark .notes-sidebar {
        background: rgba(15, 23, 42, 0.98);
        border-right-color: rgba(255, 255, 255, 0.1);
      }
      
      .notes-sidebar.show {
        transform: translateX(0);
      }
      
      .mobile-sidebar-overlay.show {
        opacity: 1;
        pointer-events: auto;
      }
      
      /* Editor area full width when sidebar collapsed */
      .notes-editor-container {
        width: 100% !important;
      }
      
      /* Animation for FAB */
      .notes-fab {
        animation: fabFadeIn 0.3s ease-out;
      }
      
      @keyframes fabFadeIn {
        from {
          opacity: 0;
          transform: scale(0.5) rotate(-90deg);
        }
        to {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
      }
      
      /* Mobile menu toggle animation */
      .mobile-menu-toggle {
        animation: toggleFadeIn 0.3s ease-out;
      }
      
      @keyframes toggleFadeIn {
        from {
          opacity: 0;
          transform: scale(0.5);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      /* Pull to refresh indicator */
      .pull-to-refresh {
        position: absolute;
        top: -40px;
        left: 0;
        width: 100%;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #667eea;
        font-size: 14px;
        transition: transform 0.2s;
      }
    }
  `;
  document.head.appendChild(style);
}

// Enhanced renderNotesModal to include mobile sidebar ID
const originalRenderNotesModal = renderNotesModal;
renderNotesModal = function() {
  // Call original
  originalRenderNotesModal();
  detectMobile();
  addResponsiveNotesStyles(); 
  // Add sidebar ID for mobile manipulation
  setTimeout(() => {
    const sidebar = document.querySelector('.notes-sidebar');
    if (sidebar) {
      sidebar.id = 'notesSidebar';
    }
    
    // Initialize mobile view
    initMobileNotesView();
    
    // Add mobile styles
    addMobileCollapsibleStyles();
    
    // Add pull to refresh
    if (isMobileView) {
      addPullToRefresh();
    }
    
    // Handle note item clicks for auto-collapse
    document.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', () => {
        if (isMobileView) {
          autoCollapseOnNoteSelect();
        }
      });
    });
  }, 200);
};
function addResponsiveNotesStyles() {
  const style = document.createElement('style');
  style.textContent = `
  
  /* Tablet */
  @media (max-width: 1024px) {
    .notes-sidebar {
      width: 260px !important;
    }
  }

  /* Mobile */
  @media (max-width: 768px) {
    
    .notes-modal-panel {
      padding: 0 !important;
    }

    .notes-sidebar {
      position: fixed !important;
      left: 0;
      top: 0;
      width: 85%;
      max-width: 320px;
      height: 100%;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 9999;
      background: white;
    }

    .dark .notes-sidebar {
      background: #0f172a;
    }

    .notes-sidebar.show {
      transform: translateX(0);
    }

    .note-item {
      padding: 14px !important;
      border-radius: 14px !important;
    }

    .folder-item {
      padding: 14px !important;
      border-radius: 14px !important;
    }

    .notes-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #6366f1;
      color: white;
      font-size: 22px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
      z-index: 10000;
    }

  }
  `;
  document.head.appendChild(style);
}
function triggerHaptic(type = 'light') {
  if (!('vibrate' in navigator)) return;

  if (type === 'light') {
    navigator.vibrate(10);
  } else if (type === 'medium') {
    navigator.vibrate(30);
  } else if (type === 'heavy') {
    navigator.vibrate([20, 10, 20]);
  }
}
function addSwipeListeners() {
  if (!isMobileView) return;

  let startX = 0;
  let endX = 0;

  const backdrop = document.getElementById('notesBackdrop');
  if (!backdrop) return;

  backdrop.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].screenX;
  });

  backdrop.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  function handleSwipe() {
    const diff = endX - startX;

    // Swipe Right → Open
    if (diff > 70 && !mobileSidebarOpen) {
      toggleMobileSidebar();
    }

    // Swipe Left → Close
    if (diff < -70 && mobileSidebarOpen) {
      toggleMobileSidebar();
    }
  }
}
function addPullToRefresh() {
  if (!isMobileView) return;

  const editorArea = document.querySelector('.notes-scroll');
  if (!editorArea) return;

  let startY = 0;
  let isPulling = false;

  editorArea.addEventListener('touchstart', (e) => {
    if (editorArea.scrollTop === 0) {
      startY = e.touches[0].clientY;
    }
  });

  editorArea.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;

    if (editorArea.scrollTop === 0 && currentY - startY > 80) {
      isPulling = true;
    }
  });

  editorArea.addEventListener('touchend', () => {
    if (isPulling) {
      isPulling = false;
      triggerHaptic('medium');

      loadNotesData().then(() => {
        renderFoldersList();
        renderNotesList();
        renderTagsFilter();
        showToast('Notes refreshed', 'success');
      });
    }
  });
}
// Export enhanced functions
if (typeof window !== 'undefined') {
  window.initMobileNotesView = initMobileNotesView;
  window.autoCollapseOnNoteSelect = autoCollapseOnNoteSelect;
  window.addMobileMenuToggle = addMobileMenuToggle;
  window.addMobileFAB = addMobileFAB;
  window.addSwipeListeners = addSwipeListeners;
  window.addPullToRefresh = addPullToRefresh;
  
}
