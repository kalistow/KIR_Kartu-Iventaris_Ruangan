const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://dxkznpplvwetunzvudfv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a3pucHBsdndldHVuenZ1ZGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzMyNDYsImV4cCI6MjA5Njg0OTI0Nn0.-u2Zx_s1LvBy2G1WqH8BOkuvcJXKGCe_rH6lkv6lMRc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeleted() {
    try {
        console.log("Mengambil aset yang berstatus selain KIR, Non-KIR, atau Belum Terpetakan...");
        const { data, error } = await supabase
            .from('assets')
            .select('id, nama_barang, status, ruangan, jumlah, harga')
            .not('status', 'in', '("KIR","Non-KIR","Belum Terpetakan","Masih Harus Dicari")');

        if (error) throw error;
        console.log(`=== ASET TERHAPUS/RIWAYAT (${data.length} barang) ===`);
        console.log(JSON.stringify(data, null, 2));

        // Mari cek juga statistik status unik di kolom status
        const { data: allStatuses, error: stErr } = await supabase
            .from('assets')
            .select('status');
        if (stErr) throw stErr;
        
        const counts = {};
        allStatuses.forEach(x => {
            counts[x.status] = (counts[x.status] || 0) + 1;
        });
        console.log("\n=== STATISTIK STATUS SEMUA ASET DI DB ===");
        console.log(counts);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkDeleted();
