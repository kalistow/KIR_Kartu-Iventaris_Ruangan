// assets/js/utils/formatters.js

const fmt = n => {
  if (n === null || n === undefined) return '0';
  const num = parseFloat(n);
  return isNaN(num) ? '0' : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

window.badgeForKondisi = function(kondisi) {
    if (kondisi === 'Baik') return '<span class="text-green-600 font-extrabold text-sm flex items-center justify-center gap-1"><span class="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span> Baik</span>';
    if (kondisi === 'Kurang Baik') return '<span class="text-yellow-600 font-extrabold text-sm flex items-center justify-center gap-1"><span class="w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_5px_rgba(234,179,8,0.8)]"></span> Kurang Baik</span>';
    if (kondisi === 'Rusak Berat') return '<span class="text-red-600 font-extrabold text-sm flex items-center justify-center gap-1"><span class="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span> Rusak Berat</span>';
    return '-';
};
