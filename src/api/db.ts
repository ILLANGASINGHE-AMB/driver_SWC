// Data-access layer mirroring the relevant subset of ../../db.js's Supabase
// call shapes/table contracts, so DriverApp and the desktop app write
// byte-compatible rows to the same backend. Deliberately does NOT carry
// over db.js's legacy settings-table JSON fallback for trips (that exists
// only for pre-Supabase data resilience) — this is a fresh Supabase-only
// client. logAction() below is the one exception: it's the CURRENT
// mechanism (not a legacy fallback) the desktop app's "Recent Actions"
// page reads from, so driver actions need to write through it too to stay
// visible to admins.
import { supabase } from '../supabaseClient';
import type { Customer, Driver, Item, Order, OrderInput, OrderItemInput, Trip, Vehicle } from '../types';

async function q<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message);
  }
  return (data ?? ([] as unknown as T)) as T;
}

async function qAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, pageSize = 1000): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows: T[] = await q(build(from, from + pageSize - 1));
    all = all.concat(rows || []);
    if (!rows || rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export const db = {
  // ── Settings ──────────────────────────────
  async getSetting(key: string): Promise<string | null> {
    const rows = await q(supabase.from('settings').select('value').eq('key', key).limit(1));
    return rows.length ? (rows[0] as { value: string }).value : null;
  },
  async setSetting(key: string, value: string): Promise<void> {
    await q(supabase.from('settings').upsert({ key, value }, { onConflict: 'key' }));
  },

  // ── Audit trail (same settings-table mechanism the desktop app's
  //    Recent Actions page reads — see db.js:773-793) ──
  async logAction(actionType: string, description: string, details: Record<string, unknown>, category: string, userDisplayName: string): Promise<void> {
    try {
      const raw = await db.getSetting('recent_system_actions');
      const actions = raw ? JSON.parse(raw) : [];
      actions.unshift({
        id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        timestamp: new Date().toISOString(),
        action_type: actionType,
        category,
        description,
        details: details || {},
        user: userDisplayName
      });
      if (actions.length > 1000) actions.length = 1000;
      await db.setSetting('recent_system_actions', JSON.stringify(actions));
    } catch (e) {
      console.error('logAction failed:', e);
    }
  },

  // ── Driver (own profile, RLS-scoped) ──────
  async getDriverByAuthUserId(authUserId: string): Promise<Driver | null> {
    const rows = await q(supabase.from('drivers').select('*').eq('auth_user_id', authUserId).limit(1));
    return (rows[0] as Driver) || null;
  },

  // ── Vehicles (shared, read-only for drivers) ──
  async getVehicles(): Promise<Vehicle[]> {
    return qAll((from, to) => supabase.from('vehicles').select('*').order('vehicle_no').order('id').range(from, to));
  },
  async getVehicle(id: number | string): Promise<Vehicle | null> {
    const rows = await q(supabase.from('vehicles').select('*').eq('id', id).limit(1));
    return (rows[0] as Vehicle) || null;
  },
  async updateVehicleStatus(id: number | string, status: string): Promise<void> {
    await q(supabase.from('vehicles').update({ status }).eq('id', id));
  },
  async updateDriverStatus(id: number, status: string): Promise<void> {
    await q(supabase.from('drivers').update({ status }).eq('id', id));
  },

  // ── Customers (shared) ────────────────────
  async getCustomers(): Promise<Customer[]> {
    return qAll((from, to) => supabase.from('customers').select('*').order('hotel_name').order('id').range(from, to));
  },
  async addCustomer(data: Partial<Customer>): Promise<number> {
    const rows = await q(supabase.from('customers').insert({ created_date: new Date().toISOString(), ...data }).select());
    return (rows[0] as Customer).id;
  },
  async getCustomer(id: number): Promise<Customer | null> {
    const rows = await q(supabase.from('customers').select('*').eq('id', id).limit(1));
    return (rows[0] as Customer) || null;
  },

  // ── Items catalog (shared) ────────────────
  async getItems(): Promise<Item[]> {
    return qAll((from, to) => supabase.from('items').select('*').order('item_id').range(from, to));
  },

  // ── Trips (RLS-scoped to the logged-in driver once the migration is
  //    applied — see supabase_driver_app_migration.sql) ──
  async getTrips(): Promise<Trip[]> {
    return qAll((from, to) =>
      supabase
        .from('trips')
        .select('*')
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    );
  },
  async generateTripId(): Promise<string> {
    const { data, error } = await supabase.rpc('next_trip_id');
    if (error) throw new Error(error.message);
    return data as string;
  },
  async addTrip(data: Partial<Trip> & { driver_id: number; driver_name: string }): Promise<Trip> {
    const tripId = await db.generateTripId();
    const record = {
      id: 'trip_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      trip_id: tripId,
      driver_id: data.driver_id,
      driver_name: data.driver_name,
      vehicle_id: data.vehicle_id ?? null,
      vehicle_no: data.vehicle_no ?? null,
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      start_time: data.start_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      starting_km: data.starting_km ?? 0,
      selected_customers: data.selected_customers || [],
      notes: data.notes || '',
      end_date: null,
      end_time: null,
      final_km: null,
      distance_km: null,
      status: 'In Progress' as const,
      created_at: new Date().toISOString()
    };
    await q(supabase.from('trips').insert(record));
    return record as Trip;
  },
  async updateTrip(id: string, data: Partial<Trip>): Promise<void> {
    await q(supabase.from('trips').update(data).eq('id', id));
  },

  // ── Orders (shared — full order list, no per-driver filtering) ──
  async getOrders(): Promise<Order[]> {
    return qAll((from, to) => supabase.from('orders').select('*').order('created_at', { ascending: false }).range(from, to));
  },
  async createOrderWithItems(orderData: OrderInput, items: OrderItemInput[]): Promise<number> {
    const { data, error } = await supabase.rpc('create_order_with_items', { p_order: orderData, p_items: items });
    if (error) { console.error('create_order_with_items failed:', error); throw new Error(error.message); }
    return data as number;
  },
  async generateBatchId(): Promise<string> {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const { data, error } = await supabase.rpc('next_batch_id', { prefix: `LND-${mm}${yy}-` });
    if (error) throw new Error(error.message);
    return data as string;
  },
  async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const { data, error } = await supabase.rpc('next_invoice_number', { prefix: `INV-${mm}${yy}-` });
    if (error) throw new Error(error.message);
    return data as string;
  },
  async addInvoice(data: Record<string, unknown>): Promise<number> {
    const rows = await q(supabase.from('invoices').insert(data).select());
    return (rows[0] as { id: number }).id;
  }
};
