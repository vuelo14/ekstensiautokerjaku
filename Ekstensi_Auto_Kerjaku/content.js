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
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.width = '320px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    panel.style.color = '#fff';
    panel.style.padding = '15px';
    panel.style.borderRadius = '8px';
    panel.style.zIndex = '999999';
    panel.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    panel.style.fontFamily = 'sans-serif';
    panel.style.fontSize = '12px';

    panel.innerHTML = `
        <h3 style="margin-top:0; font-size:14px; color:#4CAF50; border-bottom:1px solid #555; padding-bottom:5px;">🚀 Bot Auto Fill Kerjaku</h3>
        
        <label style="display:block; margin-bottom:5px;">1. Paste Data Excel (Copy Kolom A sampai J):</label>
        <textarea id="tm-excel-data" rows="8" style="width:100%; box-sizing:border-box; margin-bottom:10px; font-size:11px; font-family: monospace; padding:5px;" placeholder="Paste data dari Excel di sini..."></textarea>
        
        <label style="display:block; margin-bottom:5px;">2. Filter Kolom J (Kosongkan = ambil semua):</label>
        <input type="text" id="tm-filter-j" style="width:100%; box-sizing:border-box; margin-bottom:10px; padding:6px; border-radius:4px; border:1px solid #555;" placeholder="Misal: PROSES atau YES">
        
        <label style="display:block; margin-bottom:5px;">3. Waktu Tunggu / Delay (Detik):</label>
        <input type="number" id="tm-delay" value="2" step="0.5" style="width:100%; box-sizing:border-box; margin-bottom:10px; padding:6px; border-radius:4px; border:1px solid #555;">
        
        <button id="tm-btn-start" style="width:100%; padding:10px; background-color:#4CAF50; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:4px; transition: 0.2s;">Mulai Auto Fill</button>
        <button id="tm-btn-stop" style="display:none; width:100%; padding:10px; background-color:#f44336; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:4px; margin-top:5px;">Berhenti / Stop</button>
        
        <div id="tm-status" style="margin-top:10px; color:#ffeb3b; word-break: break-word; font-weight:bold; background:#333; padding:5px; border-radius:4px;">Status: Menunggu instruksi...</div>
        
        <div style="margin-top:10px; font-size:10px; color:#aaa; line-height:1.4;">
            <b>Tips:</b> Tekan <code>Ctrl + Q</code> untuk Sembunyikan / Tampilkan Panel ini.
        </div>
    `;

    document.body.appendChild(panel);

    // --- Fitur Drag & Drop Panel ---
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const dragHandle = panel.querySelector('h3');
    dragHandle.style.cursor = 'move';
    dragHandle.title = 'Tahan dan geser kotak ini';

    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
        panel.style.right = 'auto'; // Hapus right supaya properti left bekerja
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
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
        btnStart.style.display = 'block';
        btnStop.style.display = 'none';
        statusDiv.innerText = "Status: Dihentikan oleh user.";
        statusDiv.style.color = '#f44336';
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
        btnStop.style.display = 'block';
        statusDiv.style.color = '#ffeb3b';

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

            statusDiv.innerText = `Status: Memproses baris ke-${i + 1}...\nAktivitas: ${cols[3] ? cols[3].substring(0, 20) + '...' : ''}`;

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

            // 3. (Opsional) Jika di halaman terdapat form submit / tombol simpan,
            // Script ini saat ini di-set untuk membiarkan Anda menekan tombol Simpan secara *manual*,
            // Atau Anda bisa menghilangkan tanda komentar di bawah ini jika ingin otomatis klik tombol simpan:


            const btnSimpan = document.getElementById('btn-save'); // GANTI DENGAN ID TOMBOL SIMPAN YANG BENAR
            if (btnSimpan) {
                btnSimpan.click();
                await sleep(delayMs); // Tunggu proses simpan ke server berjalan
            }


            // Berikan jeda tambahan sebelum memproses baris berikutnya
            await sleep(delayMs);
        }

        if (isRunning) {
            statusDiv.innerText = `Status: Selesai! Berhasil memproses ${processed} baris.`;
            statusDiv.style.color = '#4CAF50';
            btnStart.style.display = 'block';
            btnStop.style.display = 'none';
            isRunning = false;
        }
    });

    // Fitur toggle (Show/Hide) panel
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key.toLowerCase() === 'q') {
            panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
        }
    });
})();
