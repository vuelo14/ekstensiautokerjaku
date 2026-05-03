// ==UserScript==
// @name         Auto Fill Kerjaku Indramayu
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Otomatis mengisi form aktivitas dari data copy-paste Excel (TSV)
// @author       Wawan Siswanto
// @match        https://kerjaku.indramayukab.go.id/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // --- Membuat UI Floating Panel ---
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.right = '20px';
    panel.style.width = '90%';
    panel.style.maxWidth = '340px';
    panel.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    panel.style.backdropFilter = 'blur(16px)';
    panel.style.webkitBackdropFilter = 'blur(16px)';
    panel.style.color = '#1f2937';
    panel.style.padding = '0';
    panel.style.border = '1px solid rgba(255, 255, 255, 0.4)';
    panel.style.borderRadius = '16px';
    panel.style.zIndex = '999999';
    panel.style.boxShadow = '0 10px 40px -10px rgba(0,0,0,0.2), 0 0 20px rgba(99, 102, 241, 0.1)';
    panel.style.fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    panel.style.fontSize = '13px';
    panel.style.overflow = 'hidden';
    panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    panel.innerHTML = `
        <div id="tm-drag-handle" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 16px; cursor: move; display: flex; align-items: center; justify-content: space-between;">
            <h3 style="margin: 0; font-size: 16px; color: white; font-weight: 400; display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                Bot Auto Fill Kerjaku
            </h3>
            <div style="display: flex; gap: 8px; align-items: center;">
                <span style="background: rgba(255,255,255,0.25); padding: 3px 8px; border-radius: 6px; font-size: 10px; color: white; font-weight: 600; letter-spacing: 0.5px;">v1.1</span>
                <button id="tm-btn-close" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; padding: 0;" onmouseover="this.style.background='rgba(255,255,255,0.4)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'" title="Sembunyikan Panel">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
        
        <div style="padding: 20px;">
            <div style="margin-bottom: 16px;">
                <label style="display:block; margin-bottom: 6px; font-weight: 600; color: #4b5563; font-size: 12px;">1. PASTE DATA EXCEL (KOLOM A - J)</label>
                <textarea id="tm-excel-data" rows="5" style="width:100%; box-sizing:border-box; padding: 12px; font-size:12px; font-family: 'Fira Code', 'Consolas', monospace; border: 1px solid #d1d5db; border-radius: 10px; outline: none; resize: vertical; transition: all 0.2s; background: rgba(255,255,255,0.8);" placeholder="Paste data dari Excel di sini..." onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.1)'" onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"></textarea>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display:block; margin-bottom: 6px; font-weight: 600; color: #4b5563; font-size: 12px;">2. FILTER KOLOM J (KOSONG = SEMUA)</label>
                <input type="text" id="tm-filter-j" style="width:100%; box-sizing:border-box; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 10px; outline: none; transition: all 0.2s; background: rgba(255,255,255,0.8);" placeholder="Misal: PROSES atau YES" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.1)'" onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display:block; margin-bottom: 6px; font-weight: 600; color: #4b5563; font-size: 12px;">3. DELAY / JEDA (DETIK)</label>
                <input type="number" id="tm-delay" value="2" step="0.5" style="width:100%; box-sizing:border-box; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 10px; outline: none; transition: all 0.2s; background: rgba(255,255,255,0.8);" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.1)'" onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
            </div>
            
            <button id="tm-btn-start" style="width:100%; padding: 14px; background: linear-gradient(135deg, #10b981, #059669); color:white; border:none; cursor:pointer; font-weight: 600; border-radius: 10px; font-size: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: center; gap: 8px;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(16, 185, 129, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.2)'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Mulai Auto Fill
            </button>
            <button id="tm-btn-stop" style="display:none; width:100%; padding: 14px; background: linear-gradient(135deg, #ef4444, #dc2626); color:white; border:none; cursor:pointer; font-weight: 600; border-radius: 10px; font-size: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); align-items: center; justify-content: center; gap: 8px;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(239, 68, 68, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.2)'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                Berhenti
            </button>
            
            <div id="tm-status" style="margin-top: 20px; padding: 12px 14px; background: #f3f4f6; border-left: 4px solid #9ca3af; border-radius: 8px; font-size: 12px; color: #4b5563; word-break: break-word; transition: all 0.3s;">
                <strong style="display: block; margin-bottom: 4px; color: #374151;">Status:</strong> <span style="opacity: 0.9;">Menunggu instruksi...</span>
            </div>
            
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px dashed #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #9ca3af;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Tekan <kbd style="background: #f3f4f6; padding: 2px 5px; border-radius: 4px; border: 1px solid #d1d5db; font-family: monospace; font-weight: 600; color: #374151;">Ctrl</kbd> + <kbd style="background: #f3f4f6; padding: 2px 5px; border-radius: 4px; border: 1px solid #d1d5db; font-family: monospace; font-weight: 600; color: #374151;">Q</kbd> untuk Tampil/Sembunyi
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // --- Membuat Tombol FAB (Floating Action Button) ---
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.bottom = '20px';
    toggleBtn.style.right = '20px';
    toggleBtn.style.width = '56px';
    toggleBtn.style.height = '56px';
    toggleBtn.style.borderRadius = '28px';
    toggleBtn.style.backgroundColor = '#6366f1';
    toggleBtn.style.color = 'white';
    toggleBtn.style.border = 'none';
    toggleBtn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
    toggleBtn.style.zIndex = '999998';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.display = 'none'; // Sembunyikan default karena panel terbuka
    toggleBtn.title = 'Buka Bot Auto Fill';
    document.body.appendChild(toggleBtn);

    function togglePanel() {
        if (panel.style.opacity === '0' || panel.style.display === 'none') {
            panel.style.display = 'block';
            toggleBtn.style.display = 'none';
            // Trigger reflow
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

    // --- Fitur Drag & Drop Panel ---
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const dragHandle = panel.querySelector('#tm-drag-handle');
    dragHandle.title = 'Tahan dan geser kotak ini';

    // Event Mouse
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
        panel.style.transition = 'none'; // Disable transition during drag
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
        panel.style.right = 'auto'; // Hapus right supaya properti left bekerja
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; // Re-enable transition
        }
    });

    // Event Touch (Mobile Android/iOS)
    dragHandle.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        isDragging = true;
        offsetX = touch.clientX - panel.getBoundingClientRect().left;
        offsetY = touch.clientY - panel.getBoundingClientRect().top;
        panel.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        panel.style.left = `${touch.clientX - offsetX}px`;
        panel.style.top = `${touch.clientY - offsetY}px`;
        panel.style.right = 'auto';
        e.preventDefault(); // Mencegah layar scrolling saat panel digeser
    }, { passive: false });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }
    });

    // --- Inisialisasi Elemen & State ---
    const btnStart = document.getElementById('tm-btn-start');
    const btnStop = document.getElementById('tm-btn-stop');
    const statusDiv = document.getElementById('tm-status');

    let isRunning = false;

    // Fungsi utilitas untuk memberikan jeda waktu
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Fungsi untuk menetapkan nilai input dan memancarkan event agar script web menyadarinya
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined) {
            el.value = value.trim();
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    btnStop.addEventListener('click', () => {
        isRunning = false;
        btnStart.style.display = 'flex';
        btnStop.style.display = 'none';
        statusDiv.innerHTML = '<strong style="display: block; margin-bottom: 4px; color: #991b1b;">Status:</strong> <span style="color: #ef4444;">Dihentikan oleh user.</span>';
        statusDiv.style.borderLeftColor = '#ef4444';
        statusDiv.style.background = '#fef2f2';
    });

    btnStart.addEventListener('click', async () => {
        const data = document.getElementById('tm-excel-data').value.trim();
        const filterJ = document.getElementById('tm-filter-j').value.trim().toLowerCase();
        let delaySecs = parseFloat(document.getElementById('tm-delay').value);
        if (isNaN(delaySecs)) delaySecs = 2;
        const delayMs = delaySecs * 1000;

        if (!data) {
            alert('Silakan paste data dari Excel terlebih dahulu!');
            return;
        }

        // Pisahkan data per baris
        const lines = data.split('\n');

        isRunning = true;
        btnStart.style.display = 'none';
        btnStop.style.display = 'flex';
        statusDiv.innerHTML = '<strong style="display: block; margin-bottom: 4px; color: #92400e;">Status:</strong> <span style="color: #d97706;">Memulai proses...</span>';
        statusDiv.style.borderLeftColor = '#f59e0b';
        statusDiv.style.background = '#fffbeb';

        let processed = 0;

        for (let i = 0; i < lines.length; i++) {
            if (!isRunning) break;

            const line = lines[i].replace(/\r$/, ''); // Bersihkan carriage return
            const cols = line.split('\t'); // Pisahkan kolom (Excel copy menghasilkan format TSV - Tab Separated Values)

            if (cols.length < 1 || line.trim() === '') continue; // Lewati baris kosong

            // Kolom J berada pada index 9 (A=0, B=1, ... J=9)
            const valJ = (cols.length > 9) ? cols[9].trim().toLowerCase() : "";

            // Lakukan pengecekan filter Kolom J
            if (filterJ !== "") {
                if (valJ !== filterJ) {
                    console.log(`Baris ${i + 1} dilewati (Filter Kolom J = "${valJ}", tidak cocok).`);
                    continue;
                }
            } else {
                // Jika filter kosong dan data kurang dari sampai kolom H (minimal untuk input), lewati
                if (cols.length < 8) {
                    console.log(`Baris ${i + 1} dilewati (Data tidak lengkap sampai kolom H).`);
                    continue;
                }
            }

            statusDiv.innerHTML = `<strong style="display: block; margin-bottom: 4px; color: #92400e;">Status:</strong> <span style="color: #d97706; font-weight: 500;">Memproses baris ke-${i + 1}...</span><br><span style="font-size: 11px; opacity: 0.8; margin-top: 4px; display: block;">Aktivitas: ${cols[3] ? cols[3].substring(0, 25) + '...' : ''}</span>`;

            // 1. Lakukan Klik tombol Tambah Aktivitas
            const btnTambah = document.querySelector('a[data-action="collapse"][title="Tambah Aktivitas"]');
            if (btnTambah) {
                btnTambah.click();
            } else {
                console.log("Tombol 'Tambah Aktivitas' tidak ditemukan di halaman ini.");
            }

            // Tunggu animasi form muncul
            await sleep(delayMs);
            if (!isRunning) break;

            // 2. Eksekusi pengisian form berdasarkan id input dan mapping kolom A-J
            setValue('tanggal', cols[0]);       // Kolom A (Index 0)
            setValue('jam_mulai', cols[1]);     // Kolom B (Index 1)
            setValue('jam_berakhir', cols[2]);  // Kolom C (Index 2)
            setValue('aktivitas', cols[3]);     // Kolom D (Index 3)
            setValue('catatan', cols[4]);       // Kolom E (Index 4)
            setValue('bk_id', cols[5]);         // Kolom F (Index 5)
            setValue('output', cols[6]);        // Kolom G (Index 6)
            setValue('output_stn', cols[7]);    // Kolom H (Index 7)

            processed++;

            const btnSimpan = document.getElementById('btn-save'); // GANTI DENGAN ID TOMBOL SIMPAN YANG BENAR
            if (btnSimpan) {
                btnSimpan.click();
                await sleep(delayMs); // Tunggu proses simpan ke server berjalan
            }

            // Berikan jeda tambahan sebelum memproses baris berikutnya
            await sleep(delayMs);
        }

        if (isRunning) {
            statusDiv.innerHTML = `<strong style="display: block; margin-bottom: 4px; color: #065f46;">Status:</strong> <span style="color: #10b981; font-weight: 500;">Selesai! Berhasil memproses ${processed} baris.</span>`;
            statusDiv.style.borderLeftColor = '#10b981';
            statusDiv.style.background = '#ecfdf5';
            btnStart.style.display = 'flex';
            btnStop.style.display = 'none';
            isRunning = false;
        }
    });

    // Fitur toggle (Show/Hide) panel dengan animasi
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key.toLowerCase() === 'q') {
            togglePanel();
        }
    });
})();
