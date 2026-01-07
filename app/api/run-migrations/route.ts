import { NextResponse } from "next/server"
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export async function POST() {
  try {
    console.log("[v0] Starting database migrations...")

    await sql`
      -- Fix customer_services sequence
      DROP SEQUENCE IF EXISTS customer_services_id_seq CASCADE;
      CREATE SEQUENCE customer_services_id_seq;
      ALTER SEQUENCE customer_services_id_seq OWNED BY customer_services.id;
      SELECT setval('customer_services_id_seq', COALESCE((SELECT MAX(id) FROM customer_services), 0) + 1, false);
      ALTER TABLE customer_services ALTER COLUMN id SET DEFAULT nextval('customer_services_id_seq');
      ALTER TABLE customer_services ALTER COLUMN id SET NOT NULL;
    `
    console.log("[v0] Fixed customer_services sequence")

    await sql`
      -- Fix customer_billing_configurations sequence
      DROP SEQUENCE IF EXISTS customer_billing_configurations_id_seq CASCADE;
      CREATE SEQUENCE customer_billing_configurations_id_seq;
      ALTER SEQUENCE customer_billing_configurations_id_seq OWNED BY customer_billing_configurations.id;
      SELECT setval('customer_billing_configurations_id_seq', COALESCE((SELECT MAX(id) FROM customer_billing_configurations), 0) + 1, false);
      ALTER TABLE customer_billing_configurations ALTER COLUMN id SET DEFAULT nextval('customer_billing_configurations_id_seq');
      ALTER TABLE customer_billing_configurations ALTER COLUMN id SET NOT NULL;
    `
    console.log("[v0] Fixed customer_billing_configurations sequence")

    await sql`
      -- Fix invoices sequence
      DROP SEQUENCE IF EXISTS invoices_id_seq CASCADE;
      CREATE SEQUENCE invoices_id_seq;
      ALTER SEQUENCE invoices_id_seq OWNED BY invoices.id;
      SELECT setval('invoices_id_seq', COALESCE((SELECT MAX(id) FROM invoices), 0) + 1, false);
      ALTER TABLE invoices ALTER COLUMN id SET DEFAULT nextval('invoices_id_seq');
      ALTER TABLE invoices ALTER COLUMN id SET NOT NULL;
    `
    console.log("[v0] Fixed invoices sequence")

    await sql`
      -- Fix payments sequence
      DROP SEQUENCE IF EXISTS payments_id_seq CASCADE;
      CREATE SEQUENCE payments_id_seq;
      ALTER SEQUENCE payments_id_seq OWNED BY payments.id;
      SELECT setval('payments_id_seq', COALESCE((SELECT MAX(id) FROM payments), 0) + 1, false);
      ALTER TABLE payments ALTER COLUMN id SET DEFAULT nextval('payments_id_seq');
      ALTER TABLE payments ALTER COLUMN id SET NOT NULL;
    `
    console.log("[v0] Fixed payments sequence")

    await sql`
      -- Fix invoice_items sequence
      DROP SEQUENCE IF EXISTS invoice_items_id_seq CASCADE;
      CREATE SEQUENCE invoice_items_id_seq;
      ALTER SEQUENCE invoice_items_id_seq OWNED BY invoice_items.id;
      SELECT setval('invoice_items_id_seq', COALESCE((SELECT MAX(id) FROM invoice_items), 0) + 1, false);
      ALTER TABLE invoice_items ALTER COLUMN id SET DEFAULT nextval('invoice_items_id_seq');
      ALTER TABLE invoice_items ALTER COLUMN id SET NOT NULL;
    `
    console.log("[v0] Fixed invoice_items sequence")

    await sql`
      -- Fix account_balances sequence
      DROP SEQUENCE IF EXISTS account_balances_id_seq CASCADE;
      CREATE SEQUENCE account_balances_id_seq;
      ALTER SEQUENCE account_balances_id_seq OWNED BY account_balances.id;
      SELECT setval('account_balances_id_seq', COALESCE((SELECT MAX(id) FROM account_balances), 0) + 1, false);
      ALTER TABLE account_balances ALTER COLUMN id SET DEFAULT nextval('account_balances_id_seq');
      ALTER TABLE account_balances ALTER COLUMN id SET NOT NULL;
    `
    console.log("[v0] Fixed account_balances sequence")

    await sql`
      -- Fix system_logs sequence
      DROP SEQUENCE IF EXISTS system_logs_id_seq CASCADE;
      CREATE SEQUENCE system_logs_id_seq;
      ALTER SEQUENCE system_logs_id_seq OWNED BY system_logs.id;
      SELECT setval('system_logs_id_seq', COALESCE((SELECT MAX(id) FROM system_logs), 0) + 1, false);
      ALTER TABLE system_logs ALTER COLUMN id SET DEFAULT nextval('system_logs_id_seq');
      ALTER TABLE system_logs ALTER COLUMN id SET NOT NULL;
    `
    console.log("[v0] Fixed system_logs sequence")

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
      CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status);
      CREATE INDEX IF NOT EXISTS idx_customer_services_service_plan_id ON customer_services(service_plan_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
      CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
    `
    console.log("[v0] Added performance indexes")

    return NextResponse.json({
      success: true,
      message: "All migrations completed successfully",
      migrationsRun: [
        "Fixed customer_services sequence",
        "Fixed customer_billing_configurations sequence",
        "Fixed invoices sequence",
        "Fixed payments sequence",
        "Fixed invoice_items sequence",
        "Fixed account_balances sequence",
        "Fixed system_logs sequence",
        "Added performance indexes",
      ],
    })
  } catch (error: any) {
    console.error("[v0] Migration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
