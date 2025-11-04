import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all"
    const search = searchParams.get("search") || ""
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const logs = await sql`
      -- Payment activities
      SELECT 
        'payment-' || p.id as id,
        p.created_at as timestamp,
        'payment' as activity_type,
        CASE 
          WHEN p.status = 'completed' THEN 'Payment received: ' || p.payment_method || ' - KES ' || p.amount::text
          WHEN p.status = 'pending' THEN 'Payment pending: ' || p.payment_method || ' - KES ' || p.amount::text
          WHEN p.status = 'failed' THEN 'Payment failed: ' || p.payment_method || ' - KES ' || p.amount::text
          ELSE 'Payment ' || p.status || ': ' || p.payment_method || ' - KES ' || p.amount::text
        END as description,
        p.amount,
        NULL as admin_user,
        NULL as ip_address,
        p.status,
        p.created_at as sort_timestamp
      FROM payments p
      WHERE p.customer_id = ${customerId}
      
      UNION ALL
      
      -- Invoice activities
      SELECT 
        'invoice-' || i.id as id,
        i.created_at as timestamp,
        'invoice' as activity_type,
        'Invoice ' || i.invoice_number || ' ' || i.status || ' - KES ' || i.amount::text as description,
        i.amount as amount,
        NULL as admin_user,
        NULL as ip_address,
        i.status,
        i.created_at as sort_timestamp
      FROM invoices i
      WHERE i.customer_id = ${customerId}
      
      UNION ALL
      
      -- Credit note activities
      SELECT 
        'credit-' || cn.id as id,
        cn.created_at as timestamp,
        'credit_note' as activity_type,
        'Credit note ' || cn.credit_note_number || ' issued - KES ' || cn.amount::text || 
        CASE WHEN cn.reason IS NOT NULL THEN ' (' || cn.reason || ')' ELSE '' END as description,
        cn.amount,
        NULL as admin_user,
        NULL as ip_address,
        cn.status,
        cn.created_at as sort_timestamp
      FROM credit_notes cn
      WHERE cn.customer_id = ${customerId}
      
      UNION ALL
      
      -- User activity logs (login, logout, view_bill, etc.)
      SELECT 
        'user-activity-' || ual.id as id,
        ual.created_at as timestamp,
        CASE 
          WHEN ual.activity IN ('login', 'logout') THEN 'login'
          WHEN ual.activity IN ('view_bill', 'view_invoice') THEN 'billing_view'
          WHEN ual.activity IN ('make_payment', 'payment_request') THEN 'payment'
          ELSE 'portal_activity'
        END as activity_type,
        COALESCE(ual.description, ual.activity) as description,
        NULL as amount,
        NULL as admin_user,
        ual.ip_address::text as ip_address,
        'info' as status,
        ual.created_at as sort_timestamp
      FROM user_activity_logs ual
      WHERE ual.user_id = ${customerId}
      
      UNION ALL
      
      -- Admin activity logs
      SELECT 
        'admin-' || al.id as id,
        al.created_at as timestamp,
        'admin_action' as activity_type,
        'Admin action: ' || al.action ||
        CASE 
          WHEN al.resource_type IS NOT NULL THEN ' on ' || al.resource_type 
          ELSE '' 
        END as description,
        NULL as amount,
        al.admin_id::text as admin_user,
        al.ip_address::text as ip_address,
        'info' as status,
        al.created_at as sort_timestamp
      FROM admin_logs al
      WHERE (al.resource_type = 'customer' AND al.resource_id = ${customerId})
      
      UNION ALL
      
      -- M-Pesa transaction logs
      SELECT 
        'mpesa-' || ml.id as id,
        ml.created_at as timestamp,
        'mpesa' as activity_type,
        CASE 
          WHEN ml.result_code = 0 THEN 'M-Pesa payment successful - ' || COALESCE(ml.transaction_id, '') || ' - KES ' || ml.amount::text
          WHEN ml.result_code IS NOT NULL AND ml.result_code != 0 THEN 'M-Pesa payment failed - ' || COALESCE(ml.result_desc, 'Unknown error')
          ELSE 'M-Pesa transaction - ' || ml.phone_number
        END as description,
        ml.amount,
        NULL as admin_user,
        NULL as ip_address,
        CASE 
          WHEN ml.result_code = 0 THEN 'success'
          WHEN ml.result_code IS NOT NULL THEN 'error'
          ELSE 'pending'
        END as status,
        ml.created_at as sort_timestamp
      FROM mpesa_logs ml
      WHERE ml.customer_id = ${customerId}
      
      UNION ALL
      
      -- Service changes
      SELECT 
        'service-' || cs.id as id,
        cs.created_at as timestamp,
        'service_change' as activity_type,
        'Service ' || cs.status || ': ' || COALESCE(sp.name, 'Unknown Service') || 
        CASE 
          WHEN cs.monthly_fee IS NOT NULL THEN ' - KES ' || cs.monthly_fee::text || '/month'
          ELSE ''
        END as description,
        cs.monthly_fee as amount,
        NULL as admin_user,
        NULL as ip_address,
        cs.status,
        cs.created_at as sort_timestamp
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId}
      
      UNION ALL
      
      -- System logs related to customer
      SELECT 
        'system-' || sl.id as id,
        sl.created_at as timestamp,
        CASE 
          WHEN sl.category = 'admin' THEN 'admin_action'
          WHEN sl.category = 'system' THEN 'system_action'
          WHEN sl.category = 'user' THEN 'portal_activity'
          ELSE 'system_action'
        END as activity_type,
        sl.message as description,
        NULL as amount,
        sl.user_id::text as admin_user,
        sl.ip_address::text as ip_address,
        sl.level as status,
        sl.created_at as sort_timestamp
      FROM system_logs sl
      WHERE sl.customer_id = ${customerId}
         OR sl.message ILIKE '%customer ' || ${customerId} || '%'
         OR sl.message ILIKE '%customer_id: ' || ${customerId} || '%'
      
      ORDER BY sort_timestamp DESC
      LIMIT ${limit}
    `

    let filteredLogs = logs

    if (type !== "all") {
      filteredLogs = logs.filter((log: any) => log.activity_type === type)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredLogs = filteredLogs.filter(
        (log: any) =>
          log.description.toLowerCase().includes(searchLower) ||
          (log.admin_user && log.admin_user.toLowerCase().includes(searchLower)) ||
          (log.ip_address && log.ip_address.toLowerCase().includes(searchLower)) ||
          (log.status && log.status.toLowerCase().includes(searchLower)),
      )
    }

    return NextResponse.json({
      success: true,
      logs: filteredLogs,
      total: filteredLogs.length,
    })
  } catch (error) {
    console.error("Error fetching customer logs:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch customer logs" }, { status: 500 })
  }
}
