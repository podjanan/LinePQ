import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  priceSatang: integer('price_satang').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const barbers = sqliteTable('barbers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  lineUserId: text('line_user_id').notNull(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  serviceId: text('service_id').notNull().references(() => services.id),
  barberId: text('barber_id').notNull().references(() => barbers.id),
  appointmentDate: text('appointment_date').notNull(),
  appointmentTime: text('appointment_time').notNull(),
  status: text('status').notNull().default('awaiting_payment'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  uniqueIndex('idx_bookings_barber_slot').on(table.barberId, table.appointmentDate, table.appointmentTime),
]);

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull().references(() => bookings.id),
  amountSatang: integer('amount_satang').notNull(),
  slipObjectKey: text('slip_object_key').notNull(),
  transRef: text('trans_ref'),
  verificationStatus: text('verification_status').notNull().default('pending'),
  verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }),
}, (table) => [
  uniqueIndex('idx_payments_booking').on(table.bookingId),
  uniqueIndex('idx_payments_trans_ref').on(table.transRef),
]);
