# Changelog

Semua perubahan yang signifikan pada proyek Ekstensi Auto Fill Kerjaku akan didokumentasikan di file ini.

## [1.1] - 2026-05-03

### Ditambahkan (Added)
- **Desain UI Glassmorphism**: Panel UI dirombak total menjadi desain modern tembus pandang bergaya kaca (*glassmorphism*), dengan dukungan efek bayangan, border melengkung, dan tipografi yang jauh lebih elegan.
- **Mobile Support (Touch Events)**: Dukungan penuh untuk perangkat seluler. Kotak panel kini bisa ditahan dan digeser menggunakan sentuhan jari (Android/iOS) berkat *event* `touchstart`, `touchmove`, dan `touchend`.
- **Floating Action Button (FAB)**: Menambahkan tombol melayang dengan ikon bot di pojok kanan bawah. Tombol ini otomatis muncul ketika panel disembunyikan, sangat membantu pengguna smartphone yang tidak memiliki _keyboard_ fisik.
- **Tombol Tutup Panel (Minimize)**: Menambahkan tombol silang 'X' pada *header* panel untuk menyembunyikan panel melalui klik layar.
- **Lebar Responsif (Responsive Width)**: Menyesuaikan lebar panel menjadi dinamis (`width: 90%`, `max-width: 340px`) sehingga tampil rapi di ukuran layar smartphone sekecil apa pun.
- **Warna Status Dinamis**: Panel indikator log *status* kini berubah-ubah gaya secara otomatis (Kuning saat proses berjalan, Hijau saat tugas selesai, Merah saat pengguna menekan stop).
- **Animasi Transisi (Smooth Animation)**: Aksi menyembunyikan panel atau memunculkan panel kini dihiasi dengan animasi *fade out* dan animasi *scale* yang halus.

### Diubah (Changed)
- Desain *button* (tombol) kini memanfaatkan perpaduan warna *gradient* cerah dan disisipkan dengan ikon-ikon SVG.
- Input data teks menggunakan struktur font khusus (`monospace`) untuk meningkatkan keterbacaan data mentah (raw text) dari Excel.

---

## [1.0] - Versi Perdana

### Ditambahkan (Added)
- **Fungsi Inti**: Bot otomatis untuk mengisi *form* kegiatan harian portal "Kerjaku" Indramayu berdasarkan data hasil *copy-paste* aplikasi Excel (format TSV).
- **Auto Mapping**: Mendeteksi otomatis urutan teks dari kolom A sampai J untuk mencocokkan Tanggal, Jam, Aktivitas, Catatan, hingga Output.
- **Filter Kolom J**: Memberikan opsi untuk menyortir atau memfilter baris mana yang ingin diproses.
- **Custom Delay**: Menyediakan input waktu tunggu fleksibel (dalam detik) untuk memastikan _server_ merespons tiap aksi penambahan data tanpa *error*.
- **Drag & Drop Basic**: Panel UI _basic_ melayang di atas *website* yang bisa digeser dengan menggunakan kursor (mouse) dan fitur *shortcut* *keyboard* `Ctrl + Q`.
