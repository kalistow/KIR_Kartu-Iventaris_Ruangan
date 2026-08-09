// assets/js/config/supabase.js
const SUPABASE_URL = "https://dxkznpplvwetunzvudfv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a3pucHBsdndldHVuenZ1ZGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzMyNDYsImV4cCI6MjA5Njg0OTI0Nn0.-u2Zx_s1LvBy2G1WqH8BOkuvcJXKGCe_rH6lkv6lMRc";

let supabaseClient;
const isDemoMode = localStorage.getItem('simbar.isDemo') === 'true';

const mockRealtimeCallbacks = {};

class MockQueryBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.filters = [];
        this.sortColumn = null;
        this.sortAscending = true;
        this.limitCount = null;
        this.action = 'select'; // 'select', 'insert', 'update', 'delete'
        this.actionData = null;
    }

    select(fields) {
        // can be used as .select() or .select('*') or .select('id') after insert
        return this;
    }

    insert(data) {
        this.action = 'insert';
        this.actionData = data;
        return this;
    }

    update(data) {
        this.action = 'update';
        this.actionData = data;
        return this;
    }

    delete() {
        this.action = 'delete';
        return this;
    }

    eq(column, value) {
        this.filters.push((row) => row[column] === value);
        return this;
    }

    neq(column, value) {
        this.filters.push((row) => row[column] !== value);
        return this;
    }

    in(column, values) {
        const valSet = new Set(values);
        this.filters.push((row) => valSet.has(row[column]));
        return this;
    }

    order(column, options = {}) {
        this.sortColumn = column;
        this.sortAscending = options.ascending !== false;
        return this;
    }

    limit(count) {
        this.limitCount = count;
        return this;
    }

    // Support thenable for async/await
    async then(onFulfilled, onRejected) {
        try {
            const result = await this.execute();
            return onFulfilled(result);
        } catch (error) {
            if (onRejected) {
                return onRejected(error);
            }
            throw error;
        }
    }

    async execute() {
        // Retrieve database from localStorage
        let db = JSON.parse(localStorage.getItem(`simbar.demo.${this.tableName}`) || '[]');

        if (this.action === 'select') {
            let data = [...db];
            // Apply filters
            for (const filter of this.filters) {
                data = data.filter(filter);
            }
            // Apply sort
            if (this.sortColumn) {
                data.sort((a, b) => {
                    let valA = a[this.sortColumn];
                    let valB = b[this.sortColumn];
                    if (valA === undefined || valA === null) return 1;
                    if (valB === undefined || valB === null) return -1;
                    if (typeof valA === 'string') {
                        return this.sortAscending 
                            ? valA.localeCompare(valB) 
                            : valB.localeCompare(valA);
                    } else {
                        return this.sortAscending 
                            ? valA - valB 
                            : valB - valA;
                    }
                });
            }
            // Apply limit
            if (this.limitCount !== null) {
                data = data.slice(0, this.limitCount);
            }
            return { data, error: null };
        }

        if (this.action === 'insert') {
            const rowsToInsert = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
            const inserted = [];
            for (const row of rowsToInsert) {
                const newRow = { ...row };
                if (newRow.id === undefined) {
                    if (this.tableName === 'import_sessions') {
                        // Generate UUID for sessions
                        newRow.id = 'demo-uuid-' + Math.random().toString(36).substring(2, 11) + '-' + Math.random().toString(36).substring(2, 6);
                    } else {
                        const maxId = db.reduce((max, r) => typeof r.id === 'number' && r.id > max ? r.id : max, 0);
                        newRow.id = maxId + 1;
                    }
                }
                if (newRow.created_at === undefined) {
                    newRow.created_at = new Date().toISOString();
                }
                db.push(newRow);
                inserted.push(newRow);
            }
            localStorage.setItem(`simbar.demo.${this.tableName}`, JSON.stringify(db));
            
            // Trigger realtime callbacks
            const callbacks = mockRealtimeCallbacks[this.tableName] || [];
            setTimeout(() => {
                callbacks.forEach(cb => cb());
            }, 50);

            return { data: inserted, error: null };
        }

        if (this.action === 'update') {
            let updatedCount = 0;
            const updatedRows = [];
            db = db.map((row) => {
                let matches = true;
                for (const filter of this.filters) {
                    if (!filter(row)) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    updatedCount++;
                    const updatedRow = { ...row, ...this.actionData };
                    updatedRows.push(updatedRow);
                    return updatedRow;
                }
                return row;
            });
            localStorage.setItem(`simbar.demo.${this.tableName}`, JSON.stringify(db));

            // Trigger realtime callbacks
            const callbacks = mockRealtimeCallbacks[this.tableName] || [];
            setTimeout(() => {
                callbacks.forEach(cb => cb());
            }, 50);

            return { data: updatedRows, error: null };
        }

        if (this.action === 'delete') {
            const deletedRows = [];
            db = db.filter((row) => {
                let matches = true;
                for (const filter of this.filters) {
                    if (!filter(row)) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    deletedRows.push(row);
                    return false; // exclude
                }
                return true; // keep
            });
            localStorage.setItem(`simbar.demo.${this.tableName}`, JSON.stringify(db));

            // Trigger realtime callbacks
            const callbacks = mockRealtimeCallbacks[this.tableName] || [];
            setTimeout(() => {
                callbacks.forEach(cb => cb());
            }, 50);

            return { data: deletedRows, error: null };
        }

        return { data: null, error: new Error("Unknown action") };
    }
}

class MockSupabaseClient {
    from(tableName) {
        return new MockQueryBuilder(tableName);
    }

    channel(name) {
        return {
            on(event, filter, callback) {
                const table = filter.table;
                if (!mockRealtimeCallbacks[table]) {
                    mockRealtimeCallbacks[table] = [];
                }
                mockRealtimeCallbacks[table].push(callback);
                return this;
            },
            subscribe() {
                return this;
            }
        };
    }

    get auth() {
        return {
            async getSession() {
                return {
                    data: {
                        session: {
                            user: {
                                email: "demo@kesbangpol.id"
                            }
                        }
                    },
                    error: null
                };
            },
            async signOut() {
                return { error: null };
            }
        };
    }
}

// Function to initialize Demo Data if not already present
function initDemoData() {
    if (!localStorage.getItem('simbar.demo.assets')) {
        const seedAssets = window.DEMO_SEED_ASSETS || [];
        localStorage.setItem('simbar.demo.assets', JSON.stringify(seedAssets));
    }
    if (!localStorage.getItem('simbar.demo.master_bmd')) {
        const seedMasterBmd = window.DEMO_SEED_MASTER_BMD || [];
        localStorage.setItem('simbar.demo.master_bmd', JSON.stringify(seedMasterBmd));
    }
    if (!localStorage.getItem('simbar.demo.riwayat_barang')) {
        const seedRiwayat = window.DEMO_SEED_RIWAYAT || [];
        localStorage.setItem('simbar.demo.riwayat_barang', JSON.stringify(seedRiwayat));
    }
    if (!localStorage.getItem('simbar.demo.verification_queue')) {
        localStorage.setItem('simbar.demo.verification_queue', JSON.stringify([]));
    }
    if (!localStorage.getItem('simbar.demo.import_sessions')) {
        localStorage.setItem('simbar.demo.import_sessions', JSON.stringify([]));
    }
}

if (isDemoMode) {
    initDemoData();
    supabaseClient = new MockSupabaseClient();
    console.log("SIMBAR is running in DEMO MODE (Local Simulation).");
} else {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
