// ==UserScript==
// @name         Auto Fill Kerjaku Indramayu bertenaga AI Gemini
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Otomatis mengisi form aktivitas Kerjaku Indramayu menggunakan Google Gemini AI atau copy-paste Excel (TSV)
// @author       Wawan Siswanto
// @match        https://kerjaku.indramayukab.go.id/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // --- Katalog Referensi Aktivitas Baku Kerjaku (Default) ---
    const REF_ACTIVITIES = [
        { nama: "Mengikuti Apel pagi/sore", id: "4802", satuan: "Kegiatan" },
        { nama: "Dokumentasi Kegiatan", id: "6621", satuan: "Kegiatan" },
        { nama: "koordinasi dengan instansi lain", id: "7924", satuan: "Kegiatan" },
        { nama: "administrasi kepegawaian", id: "6540", satuan: "Data" },
        { nama: "Melakukan Perjalanan Dinas Luar Daerah", id: "3080", satuan: "Kegiatan" },
        { nama: "Briefing", id: "8117", satuan: "Kegiatan" },
        { nama: "Mengikuti diklat/bimtek/workshop/kursus", id: "5729", satuan: "Kegiatan" },
        { nama: "Melaksanakan kegiatan", id: "6866", satuan: "Kegiatan" },
        { nama: "Menghadiri pelantikan jabatan", id: "5609", satuan: "Kegiatan" },
        { nama: "mengaji", id: "7542", satuan: "Kegiatan" },
        { nama: "Menerima Laporan", id: "4768", satuan: "Kegiatan" },
        { nama: "Mengikuti Upacara", id: "6920", satuan: "Kegiatan" },
        { nama: "Memberikan pelayanan dan menerima pengaduan", id: "2820", satuan: "Kegiatan" },
        { nama: "Konsultasi/melaporkan kepada pimpinan Wali Kota/wakil Wali Kota/sekretaris daerah", id: "3053", satuan: "Kegiatan" },
        { nama: "Menghadiri Acara Ceremonial", id: "5607", satuan: "Kegiatan" },
        { nama: "Menangani surat Rekomendasi", id: "4429", satuan: "Kegiatan" },
        { nama: "Memantau Kebersihan Kantor", id: "1821", satuan: "Kegiatan" },
        { nama: "Mendampingi kunjungan dinas", id: "5078", satuan: "Kegiatan" },
        { nama: "Melaksanakan monitoring", id: "6948", satuan: "Kegiatan" },
        { nama: "melaksanakan administrasi barang", id: "6758", satuan: "Kegiatan" },
        { nama: "Memverifikasi dan memparaf surat", id: "4745", satuan: "Kegiatan" },
        { nama: "Melakukan monitoring dan evaluasi kinerja pegawai", id: "1108", satuan: "Kegiatan" },
        { nama: "Menerima tamu", id: "3521", satuan: "Kegiatan" },
        { nama: "Rapat Koordinasi Dinas", id: "5411", satuan: "Kegiatan" },
        { nama: "Rapat koordinasi", id: "5410", satuan: "Kegiatan" },
        { nama: "Konsultasi/koordinasi dengan atasan", id: "6725", satuan: "Laporan" },
        { nama: "Membuat laporan", id: "2794", satuan: "laporan per kegiatan" },
        { nama: "Mendisposisi surat", id: "4391", satuan: "laporan" },
        { nama: "Administrasi Umum", id: "7569", satuan: "laporan" },
        { nama: "memberikan arahan/petunjuk", id: "7933", satuan: "laporan" }
    ];

    // --- Helper Storage (Mendukung chrome.storage.local & localStorage) ---
    const storage = {
        get: (keys) => new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(keys, resolve);
            } else {
                const res = {};
                const list = Array.isArray(keys) ? keys : [keys];
                list.forEach(k => {
                    res[k] = localStorage.getItem('tm_kerjaku_' + k);
                });
                resolve(res);
            }
        }),
        set: (items) => new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set(items, resolve);
            } else {
                Object.keys(items).forEach(k => {
                    localStorage.setItem('tm_kerjaku_' + k, items[k]);
                });
                resolve();
            }
        })
    };

    // --- State Global ---
    let isRunning = false;
    let generatedActivities = []; // List aktivitas hasil AI

    // --- Membuat UI Floating Panel ---
    const panel = document.createElement('div');
    panel.id = 'tm-kerjaku-panel';
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.right = '20px';
    panel.style.width = '92%';
    panel.style.maxWidth = '390px';
    panel.style.maxHeight = '90vh';
    panel.style.backgroundColor = 'rgba(255, 255, 255, 0.96)';
    panel.style.backdropFilter = 'blur(16px)';
    panel.style.webkitBackdropFilter = 'blur(16px)';
    panel.style.color = '#1f2937';
    panel.style.padding = '0';
    panel.style.border = '1px solid rgba(229, 231, 235, 0.8)';
    panel.style.borderRadius = '16px';
    panel.style.zIndex = '999999';
    panel.style.boxShadow = '0 12px 40px -10px rgba(0,0,0,0.25), 0 0 20px rgba(99, 102, 241, 0.15)';
    panel.style.fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    panel.style.fontSize = '12px';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.overflow = 'hidden';
    panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    panel.innerHTML = `
        <!-- Header Panel -->
        <div id="tm-drag-handle" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 14px 16px; cursor: move; display: flex; align-items: center; justify-content: space-between; user-select: none; border-top-left-radius: 15px; border-top-right-radius: 15px;">
            <h3 style="margin: 0; font-size: 15px; color: white; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                Auto Fill Kerjaku
            </h3>
            <div style="display: flex; gap: 8px; align-items: center;">
                <span style="background: rgba(255,255,255,0.25); padding: 2px 7px; border-radius: 6px; font-size: 10px; color: white; font-weight: 700; letter-spacing: 0.5px;">v2.0 AI</span>
                <button id="tm-btn-close" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="Sembunyikan Panel (Ctrl+Q)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>

        <!-- Tab Switcher -->
        <div style="display: flex; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; padding: 4px;">
            <button id="tm-tab-ai" style="flex: 1; padding: 8px 10px; border: none; background: white; border-radius: 8px; font-weight: 600; font-size: 12px; color: #4f46e5; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Mode AI Gemini
            </button>
            <button id="tm-tab-manual" style="flex: 1; padding: 8px 10px; border: none; background: transparent; border-radius: 8px; font-weight: 500; font-size: 12px; color: #6b7280; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Mode Excel (TSV)
            </button>
        </div>

        <!-- Scrollable Content Body -->
        <div id="tm-content-body" style="padding: 16px; overflow-y: auto; max-height: calc(90vh - 120px);">
            
            <!-- SECTION 1: MODE AI GEMINI -->
            <div id="tm-view-ai">
                <!-- API Key -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <label style="font-weight: 600; color: #374151; font-size: 11px;">1. GOOGLE GEMINI API KEY</label>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" style="font-size: 10px; color: #4f46e5; text-decoration: none; font-weight: 500;">Dapatkan API Key ↗</a>
                    </div>
                    <div style="position: relative; display: flex; align-items: center;">
                        <input type="password" id="tm-api-key" placeholder="AIzaSy..." style="width: 100%; box-sizing: border-box; padding: 8px 34px 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 11px; font-family: monospace; outline: none; background: white;">
                        <button id="tm-toggle-key-eye" type="button" style="position: absolute; right: 6px; background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px; display: flex; align-items: center;" title="Lihat/Sembunyikan Key">
                            <svg id="tm-eye-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </div>
                    <span id="tm-key-saved-badge" style="font-size: 10px; color: #059669; display: none; margin-top: 2px;">✓ API Key tersimpan otomatis di browser</span>
                </div>

                <!-- Model Selection & Fallback Info -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <label style="font-weight: 600; color: #374151; font-size: 11px;">2. MODEL AI GEMINI</label>
                        <span style="font-size: 10px; color: #059669; font-weight: 500;">Auto-Fallback Aktif</span>
                    </div>
                    <select id="tm-select-model" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 11px; background: white; outline: none;">
                        <option value="gemini-3.5-flash" selected>gemini-3.5-flash (Default - Rekomendasi)</option>
                        <option value="gemini-3.6-flash">gemini-3.6-flash</option>
                        <option value="gemini-3.7-flash">gemini-3.7-flash</option>
                        <option value="gemini-3.5-pro">gemini-3.5-pro (Penalaran Kompleks)</option>
                    </select>
                    <div style="font-size: 10px; color: #6b7280; margin-top: 3px;">
                        Jika model pertama limit kuota atau gagal, bot otomatis mencoba model fallback berikutnya.
                    </div>
                </div>

                <!-- Pilihan Tanggal & Mode Rentang -->
                <div style="margin-bottom: 12px; background: #f9fafb; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <label style="font-weight: 600; color: #374151; font-size: 11px;">3. TANGGAL AKTIVITAS</label>
                        <div style="display: flex; gap: 8px; font-size: 11px;">
                            <label style="cursor: pointer; display: flex; align-items: center; gap: 3px;">
                                <input type="radio" name="tm-date-mode" value="single" checked> 1 Hari
                            </label>
                            <label style="cursor: pointer; display: flex; align-items: center; gap: 3px;">
                                <input type="radio" name="tm-date-mode" value="range"> Rentang Hari
                            </label>
                        </div>
                    </div>

                    <!-- Single Date Input -->
                    <div id="tm-box-single-date">
                        <input type="date" id="tm-input-date" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; background: white;">
                    </div>

                    <!-- Range Date Inputs -->
                    <div id="tm-box-range-date" style="display: none; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <span style="font-size: 10px; color: #6b7280;">Dari:</span>
                            <input type="date" id="tm-input-date-start" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; background: white;">
                        </div>
                        <div>
                            <span style="font-size: 10px; color: #6b7280;">Sampai:</span>
                            <input type="date" id="tm-input-date-end" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; background: white;">
                        </div>
                    </div>
                </div>

                <!-- Jam Kerja & Pengaturan Jeda 1 Menit -->
                <div style="margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                        <label style="display: block; font-weight: 600; color: #374151; font-size: 11px; margin-bottom: 4px;">JAM MULAI</label>
                        <input type="time" id="tm-work-start" value="07:30" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; background: white;">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 600; color: #374151; font-size: 11px; margin-bottom: 4px;">JAM SELESAI</label>
                        <input type="time" id="tm-work-end" value="16:00" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; background: white;">
                    </div>
                </div>

                <div style="margin-bottom: 12px; font-size: 11px; color: #4b5563; display: flex; align-items: center; gap: 6px;">
                    <input type="checkbox" id="tm-check-ishoma" checked style="cursor: pointer;">
                    <label for="tm-check-ishoma" style="cursor: pointer;">Sertakan istirahat siang (12:00 - 13:00)</label>
                </div>

                <!-- Input Prompt / Deskripsi Tugas -->
                <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <label style="font-weight: 600; color: #374151; font-size: 11px;">4. DESKRIPSI TUGAS / PROMPT</label>
                    </div>
                    <textarea id="tm-prompt-text" rows="3" placeholder="Contoh: Hari ini saya melakukan briefing dengan sekretariat, menghadiri bimtek di diskominfo, mengelola data pengaduan disnaker, mengelola aplikasi srikandi..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 11px; border: 1px solid #d1d5db; border-radius: 8px; outline: none; resize: vertical; background: white; line-height: 1.4;"></textarea>
                    <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
                        ⚡ <em>AI otomatis membagi durasi dan memberi <strong>jeda tepat 1 menit</strong> antar aktivitas agar tidak tumpang tindih.</em>
                    </div>
                </div>

                <!-- Tombol Generate AI -->
                <button id="tm-btn-generate-ai" style="width: 100%; padding: 10px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border: none; cursor: pointer; font-weight: 600; border-radius: 8px; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 3px 10px rgba(79, 70, 229, 0.25); transition: all 0.2s;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    Generate Aktivitas dengan Gemini
                </button>

                <!-- Container Preview Aktivitas -->
                <div id="tm-preview-container" style="display: none; margin-top: 14px; border-top: 1px dashed #d1d5db; padding-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 600; font-size: 11px; color: #1f2937;">
                            HASIL GENERATE (<span id="tm-preview-count">0</span> Aktivitas)
                        </span>
                        <button id="tm-btn-clear-preview" type="button" style="background: none; border: none; color: #ef4444; font-size: 11px; cursor: pointer; text-decoration: underline;">
                            Hapus Semua
                        </button>
                    </div>

                    <!-- List Kartu Aktivitas -->
                    <div id="tm-preview-list" style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 2px;">
                        <!-- Item kartu dimasukkan via script -->
                    </div>

                    <!-- Tombol Eksekusi AI -->
                    <div style="margin-top: 12px; display: flex; gap: 8px;">
                        <button id="tm-btn-start-ai" style="flex: 1; padding: 11px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; cursor: pointer; font-weight: 600; border-radius: 8px; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            Mulai Auto Fill ke Kerjaku
                        </button>
                        <button id="tm-btn-stop-ai" style="display: none; flex: 1; padding: 11px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; cursor: pointer; font-weight: 600; border-radius: 8px; font-size: 13px; align-items: center; justify-content: center; gap: 6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                            Berhenti
                        </button>
                    </div>
                </div>
            </div>

            <!-- SECTION 2: MODE MANUAL EXCEL -->
            <div id="tm-view-manual" style="display: none;">
                <div style="margin-bottom: 14px;">
                    <label style="display:block; margin-bottom: 5px; font-weight: 600; color: #4b5563; font-size: 11px;">PASTE DATA EXCEL (KOLOM A - J)</label>
                    <textarea id="tm-excel-data" rows="6" style="width:100%; box-sizing:border-box; padding: 8px; font-size:11px; font-family: monospace; border: 1px solid #d1d5db; border-radius: 8px; outline: none; resize: vertical; background: white;" placeholder="Paste data dari Excel di sini..."></textarea>
                </div>
                
                <div style="margin-bottom: 14px;">
                    <label style="display:block; margin-bottom: 5px; font-weight: 600; color: #4b5563; font-size: 11px;">FILTER KOLOM J (KOSONG = SEMUA)</label>
                    <input type="text" id="tm-filter-j" style="width:100%; box-sizing:border-box; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; outline: none; font-size: 11px; background: white;" placeholder="Misal: PROSES atau YES">
                </div>

                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button id="tm-btn-start-manual" style="flex: 1; padding: 11px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; cursor: pointer; font-weight: 600; border-radius: 8px; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        Mulai Auto Fill Manual
                    </button>
                    <button id="tm-btn-stop-manual" style="display: none; flex: 1; padding: 11px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; cursor: pointer; font-weight: 600; border-radius: 8px; font-size: 13px; align-items: center; justify-content: center; gap: 6px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                        Berhenti
                    </button>
                </div>
            </div>

            <!-- Jeda / Delay Setting Bersama -->
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-weight: 600; color: #4b5563; font-size: 11px;">JEDA FORM / ANTI-BAN (DETIK):</label>
                <input type="number" id="tm-delay" value="2" step="0.5" min="0.5" style="width: 70px; box-sizing: border-box; padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; text-align: center; background: white;">
            </div>

            <!-- Status Box -->
            <div id="tm-status" style="margin-top: 14px; padding: 10px 12px; background: #f3f4f6; border-left: 4px solid #9ca3af; border-radius: 8px; font-size: 11px; color: #4b5563; word-break: break-word; transition: all 0.3s;">
                <strong style="display: block; margin-bottom: 2px; color: #374151;">Status:</strong> <span id="tm-status-text" style="opacity: 0.9;">Siap digunakan.</span>
            </div>

            <div style="margin-top: 14px; font-size: 10px; color: #9ca3af; text-align: center; display: flex; align-items: center; justify-content: center; gap: 4px;">
                Tekan <kbd style="background: #f3f4f6; padding: 1px 4px; border-radius: 4px; border: 1px solid #d1d5db; font-family: monospace; font-weight: 600; color: #4b5563;">Ctrl</kbd> + <kbd style="background: #f3f4f6; padding: 1px 4px; border-radius: 4px; border: 1px solid #d1d5db; font-family: monospace; font-weight: 600; color: #4b5563;">Q</kbd> untuk Sembunyikan Panel
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // --- Floating Action Button (FAB) untuk Buka/Tutup ---
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.bottom = '20px';
    toggleBtn.style.right = '20px';
    toggleBtn.style.width = '52px';
    toggleBtn.style.height = '52px';
    toggleBtn.style.borderRadius = '26px';
    toggleBtn.style.backgroundColor = '#4f46e5';
    toggleBtn.style.color = 'white';
    toggleBtn.style.border = 'none';
    toggleBtn.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.4)';
    toggleBtn.style.zIndex = '999998';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.display = 'none';
    toggleBtn.title = 'Buka Bot Auto Fill Kerjaku (Ctrl+Q)';
    document.body.appendChild(toggleBtn);

    function togglePanel() {
        if (panel.style.display === 'none' || panel.style.opacity === '0') {
            panel.style.display = 'flex';
            toggleBtn.style.display = 'none';
            void panel.offsetWidth;
            panel.style.opacity = '1';
            panel.style.transform = 'scale(1)';
        } else {
            panel.style.opacity = '0';
            panel.style.transform = 'scale(0.95)';
            toggleBtn.style.display = 'flex';
            toggleBtn.style.alignItems = 'center';
            toggleBtn.style.justifyContent = 'center';
            setTimeout(() => {
                if (panel.style.opacity === '0') {
                    panel.style.display = 'none';
                }
            }, 300);
        }
    }

    toggleBtn.addEventListener('click', togglePanel);
    document.getElementById('tm-btn-close').addEventListener('click', togglePanel);

    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key.toLowerCase() === 'q') {
            togglePanel();
        }
    });

    // --- Drag & Drop Panel ---
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    const dragHandle = panel.querySelector('#tm-drag-handle');

    dragHandle.addEventListener('mousedown', (e) => {
        if (e.target.closest('#tm-btn-close')) return;
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
        panel.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
        panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }
    });

    // --- Inisialisasi Nilai Default Tanggal & Preference ---
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const inputDate = document.getElementById('tm-input-date');
    const inputDateStart = document.getElementById('tm-input-date-start');
    const inputDateEnd = document.getElementById('tm-input-date-end');
    inputDate.value = todayStr;
    inputDateStart.value = todayStr;
    inputDateEnd.value = todayStr;

    // Load saved API Key & Model
    storage.get(['gemini_api_key', 'gemini_model']).then((data) => {
        if (data.gemini_api_key) {
            document.getElementById('tm-api-key').value = data.gemini_api_key;
            document.getElementById('tm-key-saved-badge').style.display = 'inline';
        }
        if (data.gemini_model && !data.gemini_model.includes('gemini-1') && !data.gemini_model.includes('gemini-2')) {
            document.getElementById('tm-select-model').value = data.gemini_model;
        } else {
            document.getElementById('tm-select-model').value = 'gemini-3.5-flash';
            storage.set({ gemini_model: 'gemini-3.5-flash' });
        }
    });

    // Simpan API Key saat user mengetik
    const apiKeyInput = document.getElementById('tm-api-key');
    apiKeyInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        storage.set({ gemini_api_key: val });
        document.getElementById('tm-key-saved-badge').style.display = val ? 'inline' : 'none';
    });

    // Simpan Model saat diganti
    const selectModel = document.getElementById('tm-select-model');
    selectModel.addEventListener('change', (e) => {
        storage.set({ gemini_model: e.target.value });
    });

    // Toggle Eye API Key
    const toggleEye = document.getElementById('tm-toggle-key-eye');
    toggleEye.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleEye.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        } else {
            apiKeyInput.type = 'password';
            toggleEye.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        }
    });

    // --- Tab Switcher Handlers ---
    const tabAi = document.getElementById('tm-tab-ai');
    const tabManual = document.getElementById('tm-tab-manual');
    const viewAi = document.getElementById('tm-view-ai');
    const viewManual = document.getElementById('tm-view-manual');

    tabAi.addEventListener('click', () => {
        tabAi.style.background = 'white';
        tabAi.style.color = '#4f46e5';
        tabAi.style.fontWeight = '600';
        tabAi.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';

        tabManual.style.background = 'transparent';
        tabManual.style.color = '#6b7280';
        tabManual.style.fontWeight = '500';
        tabManual.style.boxShadow = 'none';

        viewAi.style.display = 'block';
        viewManual.style.display = 'none';
    });

    tabManual.addEventListener('click', () => {
        tabManual.style.background = 'white';
        tabManual.style.color = '#4f46e5';
        tabManual.style.fontWeight = '600';
        tabManual.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';

        tabAi.style.background = 'transparent';
        tabAi.style.color = '#6b7280';
        tabAi.style.fontWeight = '500';
        tabAi.style.boxShadow = 'none';

        viewManual.style.display = 'block';
        viewAi.style.display = 'none';
    });

    // --- Radio Mode Tanggal Handlers ---
    const dateRadios = document.querySelectorAll('input[name="tm-date-mode"]');
    const boxSingleDate = document.getElementById('tm-box-single-date');
    const boxRangeDate = document.getElementById('tm-box-range-date');

    dateRadios.forEach(r => {
        r.addEventListener('change', (e) => {
            if (e.target.value === 'single') {
                boxSingleDate.style.display = 'block';
                boxRangeDate.style.display = 'none';
            } else {
                boxSingleDate.style.display = 'none';
                boxRangeDate.style.display = 'grid';
            }
        });
    });

    // --- Helper Status UI ---
    const statusBox = document.getElementById('tm-status');
    const statusText = document.getElementById('tm-status-text');

    function updateStatus(message, type = 'normal') {
        statusText.innerHTML = message;
        if (type === 'process') {
            statusBox.style.borderLeftColor = '#f59e0b';
            statusBox.style.background = '#fffbeb';
        } else if (type === 'success') {
            statusBox.style.borderLeftColor = '#10b981';
            statusBox.style.background = '#ecfdf5';
        } else if (type === 'error') {
            statusBox.style.borderLeftColor = '#ef4444';
            statusBox.style.background = '#fef2f2';
        } else {
            statusBox.style.borderLeftColor = '#9ca3af';
            statusBox.style.background = '#f3f4f6';
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper menetapkan value form web Kerjaku
    function setValue(idOrName, value) {
        if (value === undefined || value === null) return;
        const valStr = String(value).trim();
        let el = document.getElementById(idOrName);
        if (!el) {
            el = document.querySelector(`input[name="${idOrName}"], textarea[name="${idOrName}"], select[name="${idOrName}"]`);
        }
        if (el) {
            el.value = valStr;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // --- Format Tanggal DD/MM/YYYY ---
    function formatDateIndo(dateStr) {
        // Input YYYY-MM-DD
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    // --- Generator Daftar Tanggal Kerja (Skip Sabtu & Minggu) ---
    function getWorkingDays(startDateStr, endDateStr) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const days = [];

        const cur = new Date(start);
        while (cur <= end) {
            const dayOfWeek = cur.getDay(); // 0 = Minggu, 6 = Sabtu
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const yyyy = cur.getFullYear();
                const mm = String(cur.getMonth() + 1).padStart(2, '0');
                const dd = String(cur.getDate()).padStart(2, '0');
                days.push(`${dd}/${mm}/${yyyy}`);
            }
            cur.setDate(cur.getDate() + 1);
        }
        return days;
    }

    // --- Auto-Search & Matching ke /Aktivitas/search Kerjaku ---
    async function lookupKerjakuActivity(keyword, fallbackNama, fallbackBkId, fallbackSatuan) {
        // 1. PRIORITAS TERTINGGI: Cek apakah sudah cocok dengan Katalog Resmi Anda (REF_ACTIVITIES)
        if (fallbackBkId) {
            const byId = REF_ACTIVITIES.find(a => String(a.id) === String(fallbackBkId));
            if (byId) {
                return {
                    id: String(byId.id),
                    content: byId.nama,
                    satuan: byId.satuan,
                    waktu: 30
                };
            }
        }

        if (fallbackNama) {
            const lowerFall = fallbackNama.toLowerCase().trim();
            const byName = REF_ACTIVITIES.find(a =>
                a.nama.toLowerCase() === lowerFall ||
                lowerFall.includes(a.nama.toLowerCase()) ||
                a.nama.toLowerCase().includes(lowerFall)
            );
            if (byName) {
                return {
                    id: String(byName.id),
                    content: byName.nama,
                    satuan: byName.satuan,
                    waktu: 30
                };
            }
        }

        // Cek juga berdasarkan keyword ke katalog lokal REF_ACTIVITIES
        const query = (keyword || fallbackNama || "").trim().toLowerCase();
        if (query.length >= 3) {
            const localByKeyword = REF_ACTIVITIES.find(a => a.nama.toLowerCase().includes(query));
            if (localByKeyword) {
                return {
                    id: String(localByKeyword.id),
                    content: localByKeyword.nama,
                    satuan: localByKeyword.satuan,
                    waktu: 30
                };
            }
        }

        // 2. Jika BENAR-BENAR TIDAK ADA di katalog resmi Anda, baru cari ke server Kerjaku
        if (query.length >= 2) {
            try {
                const res = await fetch('https://kerjaku.indramayukab.go.id/Aktivitas/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: 'word=' + encodeURIComponent(query)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        // Lakukan skoring cerdas untuk memilih aktivitas yang paling relevan secara semantik
                        const queryWords = query.split(/\s+/).filter(w => w.length >= 3);
                        const unrelatedTerms = ['pbb', 'bphtb', 'pajak', 'retribusi', 'puskesmas', 'rsud', 'kelurahan', 'kecamatan'];

                        const scored = data.map(item => {
                            const title = item.content.toLowerCase();
                            let score = 0;

                            // Tambah poin jika kata kunci cocok
                            queryWords.forEach(w => {
                                if (title.includes(w)) score += 10;
                            });

                            // Penalti besar jika mengambil urusan dinas lain yang spesifik (misal PBB/BPHTB untuk pengaduan umum)
                            unrelatedTerms.forEach(term => {
                                if (title.includes(term) && !query.includes(term)) {
                                    score -= 25;
                                }
                            });

                            return { ...item, score };
                        });

                        scored.sort((a, b) => b.score - a.score);
                        const best = scored[0];

                        return {
                            id: String(best.id),
                            content: best.content,
                            satuan: best.satuan || 'Kegiatan',
                            waktu: best.waktu || 30
                        };
                    }
                }
            } catch (e) {
                console.warn('Gagal memanggil endpoint /Aktivitas/search Kerjaku:', e);
            }
        }

        // 3. Fallback jika ada ID yang ditentukan
        if (fallbackBkId && fallbackNama) {
            return {
                id: String(fallbackBkId),
                content: fallbackNama,
                satuan: fallbackSatuan || 'Kegiatan',
                waktu: 30
            };
        }

        // 4. Default aman
        return {
            id: REF_ACTIVITIES[0].id,
            content: REF_ACTIVITIES[0].nama,
            satuan: REF_ACTIVITIES[0].satuan,
            waktu: 30
        };
    }

    // --- Sanitasi Waktu: Memastikan Jeda 1 Menit & Tidak Beririsan ---
    function enforceOneMinuteGap(activities) {
        // Kelompokkan per tanggal
        const byDate = {};
        activities.forEach(item => {
            if (!byDate[item.tanggal]) byDate[item.tanggal] = [];
            byDate[item.tanggal].push(item);
        });

        const result = [];

        Object.keys(byDate).forEach(d => {
            const list = byDate[d];
            let prevEndMinutes = null;

            list.forEach(act => {
                const parseMin = (t) => {
                    const [h, m] = t.split(':').map(Number);
                    return h * 60 + m;
                };
                const formatMin = (mins) => {
                    const h = String(Math.floor(mins / 60)).padStart(2, '0');
                    const m = String(mins % 60).padStart(2, '0');
                    return `${h}:${m}`;
                };

                let start = parseMin(act.jam_mulai);
                let end = parseMin(act.jam_berakhir);

                // Jika jam mulai kurang atau sama dengan jam selesai sebelumnya, geser + 1 menit!
                if (prevEndMinutes !== null && start <= prevEndMinutes) {
                    start = prevEndMinutes + 1;
                    if (end <= start) {
                        end = start + 30; // minimal durasi 30 menit
                    }
                }

                act.jam_mulai = formatMin(start);
                act.jam_berakhir = formatMin(end);
                prevEndMinutes = end;

                result.push(act);
            });
        });

        return result;
    }

    // --- Panggilan API Gemini dengan Mekanisme Multi-Model Fallback ---
    async function callGeminiWithFallback(apiKey, prompt, preferredModel) {
        // Model fallback berurutan sesuai ketersediaan (khusus v3.5 ke atas)
        const modelList = [
            preferredModel,
            'gemini-3.5-flash',
            'gemini-3.6-flash',
            'gemini-3.7-flash',
            'gemini-3.5-pro'
        ];
        const uniqueModels = [...new Set(modelList.filter(Boolean))];

        let lastError = null;

        for (const model of uniqueModels) {
            try {
                updateStatus(`Menghubungi Gemini AI (Model: <strong>${model}</strong>)...`, 'process');
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            temperature: 0.2,
                            responseMimeType: 'application/json'
                        }
                    })
                });

                if (resp.ok) {
                    const json = await resp.json();
                    const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!textContent) {
                        throw new Error(`Model ${model} tidak memberikan teks balasan.`);
                    }
                    const cleanJson = textContent.replace(/```json\n?|```/g, '').trim();
                    const parsed = JSON.parse(cleanJson);
                    return { success: true, modelUsed: model, data: parsed };
                } else {
                    const errData = await resp.json().catch(() => ({}));
                    const errMsg = errData.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
                    console.warn(`Model ${model} gagal:`, errMsg);
                    lastError = new Error(`[${model}] ${errMsg}`);

                    // Jika API Key tidak valid (400), jangan coba model lain
                    if (resp.status === 400 && errMsg.toLowerCase().includes('api key')) {
                        throw lastError;
                    }
                }
            } catch (err) {
                console.warn(`Error saat memanggil ${model}:`, err);
                lastError = err;
                if (err.message && err.message.toLowerCase().includes('api key not valid')) {
                    throw err;
                }
            }
        }

        throw lastError || new Error('Gagal menghubungi seluruh model Gemini AI.');
    }

    // --- Event Handler: Generate Aktivitas dengan Gemini ---
    const btnGenerateAi = document.getElementById('tm-btn-generate-ai');
    const previewContainer = document.getElementById('tm-preview-container');
    const previewList = document.getElementById('tm-preview-list');
    const previewCount = document.getElementById('tm-preview-count');
    const btnClearPreview = document.getElementById('tm-btn-clear-preview');

    btnGenerateAi.addEventListener('click', async () => {
        const apiKey = document.getElementById('tm-api-key').value.trim();
        if (!apiKey) {
            alert('Silakan masukkan Google Gemini API Key terlebih dahulu!');
            document.getElementById('tm-api-key').focus();
            return;
        }

        const userPrompt = document.getElementById('tm-prompt-text').value.trim();
        if (!userPrompt) {
            alert('Silakan isi deskripsi tugas atau aktivitas yang dikerjakan!');
            document.getElementById('tm-prompt-text').focus();
            return;
        }

        // Tentukan daftar tanggal
        const isRange = document.querySelector('input[name="tm-date-mode"]:checked').value === 'range';
        let targetDates = [];
        if (isRange) {
            const startD = document.getElementById('tm-input-date-start').value;
            const endD = document.getElementById('tm-input-date-end').value;
            if (!startD || !endD) {
                alert('Silakan pilih rentang tanggal mulai dan tanggal selesai!');
                return;
            }
            targetDates = getWorkingDays(startD, endD);
            if (targetDates.length === 0) {
                alert('Tidak ada hari kerja (Senin-Jumat) pada rentang tanggal tersebut!');
                return;
            }
        } else {
            const sDate = document.getElementById('tm-input-date').value;
            if (!sDate) {
                alert('Silakan pilih tanggal aktivitas!');
                return;
            }
            targetDates = [formatDateIndo(sDate)];
        }

        const workStart = document.getElementById('tm-work-start').value || "07:30";
        const workEnd = document.getElementById('tm-work-end').value || "16:00";
        const checkIshoma = document.getElementById('tm-check-ishoma').checked;
        const selectedModel = document.getElementById('tm-select-model').value;

        // Susun Prompt Terstruktur untuk Gemini
        const systemPrompt = `Kamu adalah asisten profesional pencatat aktivitas e-kinerja ASN (Aplikasi Kerjaku Pemerintah Kabupaten Indramayu).
Tugasmu adalah menyusun rincian jadwal aktivitas kerja harian yang logis, realistis, dan formal berdasarkan instruksi tugas pengguna.

DAFTAR KATALOG AKTIVITAS RESMI BESERTA KODE bk_id DAN SATUAN:
${JSON.stringify(REF_ACTIVITIES.map(a => ({ aktivitas: a.nama, bk_id: a.id, satuan: a.satuan })), null, 2)}

ATURAN WAJIB & KETAT:
1. HANYA BUAT AKTIVITAS YANG DISEBUTKAN PENGGUNA (SANGAT PENTING):
   - DILARANG KERAS menambah aktivitas di luar yang diminta/disebutkan oleh pengguna (JANGAN menambahkan Apel pagi, Upacara, Senam, Kebersihan, Mengaji, dsb. jika pengguna TIDAK MENYEBUTKANNYA di deskripsi tugas)!
   - Jika pengguna menyebutkan N kegiatan (misal 4 kegiatan), maka hasil generate WAJIB HANYA berisi N kegiatan tersebut.
2. PEMBAGIAN WAKTU PROPORSIONAL:
   - Jam kerja dimulai pukul ${workStart} dan berakhir pukul ${workEnd}.
   - Seluruh rentang jam kerja (${workStart} s/d ${workEnd}) harus dibagi secara proporsional dan merata HANYA kepada kegiatan yang disebutkan oleh pengguna.
   - Kegiatan pertama langsung dimulai pada pukul ${workStart}.
3. Target Tanggal yang harus dibuatkan: ${targetDates.join(', ')} (Format DD/MM/YYYY). Buat aktivitas untuk SETIAP tanggal tersebut.
${checkIshoma ? '4. Waktu istirahat/ISHOMA adalah pukul 12:00 - 13:00. Aktivitas sebelum siang berakhir maksimal pukul 12:00, dan aktivitas siang dimulai kembali pukul 13:01.' : ''}
5. ATURAN JEDA WAKTU (ANTI-OVERLAP):
   - Antara satu aktivitas selesai dengan aktivitas berikutnya dimulai WAJIB diberi JEDA TEPAT 1 MENIT.
   - Contoh: Aktivitas 1 jam 07:30 - 08:30, maka Aktivitas 2 WAJIB dimulai pukul 08:31!
   - TIDAK BOLEH ADA WAKTU YANG BERTABRAKAN ATAU BERIRISAN (NO OVERLAPPING)!
6. Pilihlah nama 'aktivitas', 'bk_id', dan 'output_stn' yang paling cocok dari DAFTAR KATALOG AKTIVITAS RESMI di atas.
7. 'search_keyword': berikan kata kunci pencarian singkat (1-3 kata) untuk dicari ke sistem Kerjaku (misal: "briefing", "bimtek", "pengaduan", "srikandi", "rapat").
8. 'catatan': uraian pekerjaan detail, formal, dan mencerminkan kinerja ASN/pegawai pemerintah daerah yang bertanggung jawab.
9. 'output': isi angka 1.
10. Format output WAJIB HANYA berupa JSON Array murni:
[
  {
    "tanggal": "DD/MM/YYYY",
    "jam_mulai": "HH:mm",
    "jam_berakhir": "HH:mm",
    "aktivitas": "Nama resmi aktivitas dari katalog",
    "search_keyword": "kata kunci",
    "bk_id": "kode id",
    "catatan": "Uraian detail pekerjaan yang dilakukan...",
    "output": 1,
    "output_stn": "Kegiatan/Data/Laporan"
  }
]

DESKRIPSI TUGAS DARI PENGGUNA:
"""${userPrompt}"""
`;

        btnGenerateAi.disabled = true;
        btnGenerateAi.style.opacity = '0.7';
        btnGenerateAi.innerHTML = '⏳ Menghubungi Gemini AI...';

        try {
            const aiResult = await callGeminiWithFallback(apiKey, systemPrompt, selectedModel);
            let items = aiResult.data;
            if (!Array.isArray(items) && items.activities) {
                items = items.activities;
            }

            if (!Array.isArray(items) || items.length === 0) {
                throw new Error('Gemini tidak mengembalikan daftar aktivitas dalam format yang valid.');
            }

            // Terapkan perlindungan jeda 1 menit
            items = enforceOneMinuteGap(items);

            updateStatus(`Mencocokkan ${items.length} aktivitas ke database Kerjaku...`, 'process');

            // Cocokkan ke database Kerjaku (/Aktivitas/search)
            for (let i = 0; i < items.length; i++) {
                const match = await lookupKerjakuActivity(items[i].search_keyword, items[i].aktivitas, items[i].bk_id, items[i].output_stn);
                if (match) {
                    items[i].bk_id = match.id;
                    items[i].aktivitas = match.content;
                    items[i].output_stn = match.satuan;
                }
            }

            generatedActivities = items;
            renderPreviewList();

            updateStatus(`Berhasil membuat <strong>${items.length} aktivitas</strong> menggunakan model <em>${aiResult.modelUsed}</em>. Silakan periksa pratinjau di bawah.`, 'success');
        } catch (err) {
            console.error('Error generate AI:', err);
            updateStatus(`Gagal membuat aktivitas: ${err.message}`, 'error');
            alert(`Error: ${err.message}`);
        } finally {
            btnGenerateAi.disabled = false;
            btnGenerateAi.style.opacity = '1';
            btnGenerateAi.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                Generate Aktivitas dengan Gemini
            `;
        }
    });

    // --- Render List Preview Kartu Aktivitas ---
    function renderPreviewList() {
        previewList.innerHTML = '';
        previewCount.innerText = generatedActivities.length;

        if (generatedActivities.length === 0) {
            previewContainer.style.display = 'none';
            return;
        }

        previewContainer.style.display = 'block';

        generatedActivities.forEach((act, idx) => {
            const card = document.createElement('div');
            card.style.background = '#f9fafb';
            card.style.border = '1px solid #e5e7eb';
            card.style.borderRadius = '8px';
            card.style.padding = '8px 10px';
            card.style.fontSize = '11px';
            card.style.position = 'relative';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span style="background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">${act.tanggal}</span>
                        <span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">${act.jam_mulai} - ${act.jam_berakhir}</span>
                    </div>
                    <button class="tm-btn-del-item" data-index="${idx}" style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 2px;" title="Hapus baris ini" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#9ca3af'">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div style="margin-bottom: 4px;">
                    <select class="tm-select-act" data-index="${idx}" style="width: 100%; box-sizing: border-box; font-size: 11px; font-weight: 600; color: #1f2937; border: 1px solid #d1d5db; border-radius: 6px; padding: 4px; background: white; outline: none;">
                        ${REF_ACTIVITIES.map(ref => `
                            <option value="${ref.id}" data-nama="${ref.nama}" data-satuan="${ref.satuan}" ${String(ref.id) === String(act.bk_id) ? 'selected' : ''}>
                                ${ref.nama} (${ref.satuan})
                            </option>
                        `).join('')}
                        ${!REF_ACTIVITIES.some(ref => String(ref.id) === String(act.bk_id)) ? `
                            <option value="${act.bk_id}" data-nama="${act.aktivitas}" data-satuan="${act.output_stn}" selected>
                                ${act.aktivitas} (${act.output_stn})
                            </option>
                        ` : ''}
                    </select>
                </div>
                <div>
                    <textarea class="tm-input-note" data-index="${idx}" rows="2" style="width: 100%; box-sizing: border-box; font-size: 10px; color: #4b5563; border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px; resize: vertical; outline: none; background: #fff; line-height: 1.3;" placeholder="Uraian catatan...">${act.catatan}</textarea>
                </div>
            `;

            previewList.appendChild(card);
        });

        // Event listener saat pengguna mengganti dropdown aktivitas
        previewList.querySelectorAll('.tm-select-act').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                const opt = e.target.options[e.target.selectedIndex];
                generatedActivities[index].bk_id = opt.value;
                generatedActivities[index].aktivitas = opt.getAttribute('data-nama');
                generatedActivities[index].output_stn = opt.getAttribute('data-satuan');
            });
        });

        // Event listener saat pengguna mengedit uraian catatan
        previewList.querySelectorAll('.tm-input-note').forEach(txt => {
            txt.addEventListener('input', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                generatedActivities[index].catatan = e.target.value;
            });
        });

        // Event listener tombol hapus baris preview
        previewList.querySelectorAll('.tm-btn-del-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                generatedActivities.splice(index, 1);
                renderPreviewList();
            });
        });
    }

    btnClearPreview.addEventListener('click', () => {
        if (confirm('Kosongkan semua daftar pratinjau aktivitas?')) {
            generatedActivities = [];
            renderPreviewList();
            updateStatus('Daftar pratinjau telah dikosongkan.', 'normal');
        }
    });

    // --- Mesin Eksekusi Auto Fill ke Form Kerjaku ---
    async function executeAutoFill(itemsList, startBtn, stopBtn) {
        if (!itemsList || itemsList.length === 0) {
            alert('Tidak ada data aktivitas yang akan diisi!');
            return;
        }

        let delaySecs = parseFloat(document.getElementById('tm-delay').value);
        if (isNaN(delaySecs) || delaySecs < 0.5) delaySecs = 2;
        const delayMs = delaySecs * 1000;

        isRunning = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'flex';

        updateStatus(`Memulai pengisian <strong>${itemsList.length} aktivitas</strong> ke formulir Kerjaku...`, 'process');

        let successCount = 0;

        for (let i = 0; i < itemsList.length; i++) {
            if (!isRunning) break;

            const item = itemsList[i];

            updateStatus(`Mengisi baris <strong>${i + 1} dari ${itemsList.length}</strong>...<br><span style="font-size:10px;">${item.tanggal} (${item.jam_mulai} - ${item.jam_berakhir}): ${item.aktivitas}</span>`, 'process');

            // 1. Klik tombol Tambah Aktivitas pada web Kerjaku
            const btnTambah = document.querySelector('a[data-action="collapse"][title="Tambah Aktivitas"]');
            if (btnTambah) {
                btnTambah.click();
            } else {
                console.warn("Tombol 'Tambah Aktivitas' tidak ditemukan di halaman ini.");
            }

            await sleep(delayMs);
            if (!isRunning) break;

            // 2. Isi Formulir Aktivitas
            setValue('tanggal', item.tanggal);
            setValue('jam_mulai', item.jam_mulai);
            setValue('jam_berakhir', item.jam_berakhir);
            setValue('aktivitas', item.aktivitas);
            setValue('catatan', item.catatan);
            setValue('output', String(item.output || 1));

            // Set ID Aktivitas (bk_id)
            setValue('bk_id', String(item.bk_id));
            const nameBk = document.querySelector('input[name="bk_id"]');
            if (nameBk) {
                nameBk.value = String(item.bk_id);
                nameBk.dispatchEvent(new Event('input', { bubbles: true }));
                nameBk.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Set Satuan Output (output_stn)
            setValue('output_stn', item.output_stn || 'Kegiatan');
            const nameStn = document.querySelector('input[name="output_stn"]');
            if (nameStn) {
                nameStn.value = item.output_stn || 'Kegiatan';
                nameStn.dispatchEvent(new Event('input', { bubbles: true }));
                nameStn.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 3. Simpan Form (Klik tombol Simpan)
            const btnSimpan = document.getElementById('btn-save');
            if (btnSimpan) {
                btnSimpan.click();
                await sleep(delayMs);
            }

            successCount++;
            await sleep(delayMs);
        }

        if (isRunning) {
            updateStatus(`Selesai! Berhasil menyimpan <strong>${successCount} aktivitas</strong> ke sistem Kerjaku.`, 'success');
        } else {
            updateStatus(`Dihentikan oleh pengguna setelah memproses <strong>${successCount} aktivitas</strong>.`, 'error');
        }

        isRunning = false;
        startBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }

    // Handler Tombol Eksekusi AI
    const btnStartAi = document.getElementById('tm-btn-start-ai');
    const btnStopAi = document.getElementById('tm-btn-stop-ai');

    btnStartAi.addEventListener('click', () => {
        executeAutoFill(generatedActivities, btnStartAi, btnStopAi);
    });

    btnStopAi.addEventListener('click', () => {
        isRunning = false;
    });

    // Handler Tombol Eksekusi Manual (Excel TSV)
    const btnStartManual = document.getElementById('tm-btn-start-manual');
    const btnStopManual = document.getElementById('tm-btn-stop-manual');

    btnStopManual.addEventListener('click', () => {
        isRunning = false;
    });

    btnStartManual.addEventListener('click', () => {
        const rawData = document.getElementById('tm-excel-data').value.trim();
        const filterJ = document.getElementById('tm-filter-j').value.trim().toLowerCase();

        if (!rawData) {
            alert('Silakan paste data dari Excel terlebih dahulu!');
            return;
        }

        const lines = rawData.split('\n');
        const parsedItems = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\r$/, '');
            const cols = line.split('\t');
            if (cols.length < 1 || line.trim() === '') continue;

            const valJ = (cols.length > 9) ? cols[9].trim().toLowerCase() : "";

            if (filterJ !== "") {
                if (valJ !== filterJ) continue;
            } else {
                if (cols.length < 8) continue;
            }

            parsedItems.push({
                tanggal: cols[0],
                jam_mulai: cols[1],
                jam_berakhir: cols[2],
                aktivitas: cols[3],
                catatan: cols[4],
                bk_id: cols[5],
                output: cols[6] || 1,
                output_stn: cols[7] || 'Kegiatan'
            });
        }

        executeAutoFill(parsedItems, btnStartManual, btnStopManual);
    });

})();
