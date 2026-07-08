let conditionChartInstance = null;
let roomsChartInstance = null;

function updateDashboardStats(assets) {
    const counts = { total: 0, baik: 0, kurang: 0, rusak: 0 };
    const roomQtyMap = {};

    // Dynamically get active rooms from KIR management (OFFICIAL_ROOMS + custom rooms from localStorage)
    // This automatically adapts when the pengurus adds or removes rooms in Manajemen KIR
    const activeRooms = new Set(getActiveRooms(assets));

    assets.forEach(a => {
        if (a.status === 'Dimusnahkan' || a.status === 'Dihibahkan' || a.status === 'Dilelang') return;

        // Only count assets whose room is registered in the active KIR room list
        const room = a.ruangan;
        if (!room || !activeRooms.has(room)) return;

        const qty = a.jumlah || 1;
        counts.total += qty;

        if (a.kondisi === 'Baik') counts.baik += qty;
        else if (a.kondisi === 'Kurang Baik') counts.kurang += qty;
        else if (a.kondisi === 'Rusak Berat') counts.rusak += qty;

        roomQtyMap[room] = (roomQtyMap[room] || 0) + qty;
    });
    
    const totalEl = document.getElementById('total-count');
    const goodEl = document.getElementById('good-count');
    const lessGoodEl = document.getElementById('lessgood-count');
    const damagedEl = document.getElementById('damaged-count');
    
    if (totalEl) totalEl.textContent = fmt(counts.total);
    if (goodEl) goodEl.textContent = fmt(counts.baik);
    if (lessGoodEl) lessGoodEl.textContent = fmt(counts.kurang);
    if (damagedEl) damagedEl.textContent = fmt(counts.rusak);

    // Update Charts if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
        renderConditionChart(counts);
        renderRoomsChart(roomQtyMap);
    }
}

function renderConditionChart(counts) {
    const ctx = document.getElementById('conditionChart')?.getContext('2d');
    if (!ctx) return;

    const dataVals = [counts.baik, counts.kurang, counts.rusak];

    if (conditionChartInstance) {
        conditionChartInstance.data.datasets[0].data = dataVals;
        conditionChartInstance.update();
    } else {
        conditionChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Baik', 'Kurang Baik', 'Rusak Berat'],
                datasets: [{
                    data: dataVals,
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Roboto Flex',
                                size: 11,
                                weight: 'bold'
                            },
                            color: '#4b6680',
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: 'Roboto Flex', weight: 'bold' },
                        bodyFont: { family: 'Roboto Flex', weight: 'bold' },
                        padding: 10,
                        cornerRadius: 8
                    }
                },
                cutout: '70%'
            }
        });
    }
}

function renderRoomsChart(roomQtyMap) {
    const ctx = document.getElementById('roomsChart')?.getContext('2d');
    if (!ctx) return;

    // Get Top 5 Rooms by total assets qty
    const topRooms = Object.entries(roomQtyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = topRooms.map(r => r[0]);
    const dataVals = topRooms.map(r => r[1]);

    if (roomsChartInstance) {
        roomsChartInstance.data.labels = labels;
        roomsChartInstance.data.datasets[0].data = dataVals;
        roomsChartInstance.update();
    } else {
        roomsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Aset',
                    data: dataVals,
                    backgroundColor: '#3b82f6',
                    hoverBackgroundColor: '#2563eb',
                    borderRadius: 8,
                    maxBarThickness: 32
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: 'Roboto Flex', weight: 'bold' },
                        bodyFont: { family: 'Roboto Flex', weight: 'bold' },
                        padding: 10,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                family: 'Roboto Flex',
                                size: 10,
                                weight: 'bold'
                            },
                            color: '#4b6680'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Roboto Flex',
                                size: 9,
                                weight: 'bold'
                            },
                            color: '#4b6680'
                        }
                    }
                }
            }
        });
    }
}

