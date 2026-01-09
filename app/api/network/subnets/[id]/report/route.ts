import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { addLetterheadToPDF, addFooterToPDF, getCompanyLetterhead } from "@/lib/letterhead"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const subnetId = params.id

    // Fetch subnet details
    const subnetQuery = await sql`
      SELECT 
        s.*,
        nd.name as router_name,
        nd.ip_address as router_ip,
        l.name as location_name
      FROM ip_subnets s
      LEFT JOIN network_devices nd ON s.router_id = nd.id
      LEFT JOIN locations l ON nd.location_id = l.id
      WHERE s.id = ${subnetId}
    `

    if (subnetQuery.length === 0) {
      return NextResponse.json({ error: "Subnet not found" }, { status: 404 })
    }

    const subnet = subnetQuery[0]

    // Fetch IP address statistics
    const ipStatsQuery = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM ip_addresses
      WHERE subnet_id = ${subnetId}
      GROUP BY status
    `

    const ipStats = ipStatsQuery.reduce(
      (acc: any, row: any) => {
        acc[row.status] = Number(row.count)
        return acc
      },
      { available: 0, assigned: 0, reserved: 0 },
    )

    // Fetch assigned IPs with customer details
    const assignedIPsQuery = await sql`
      SELECT 
        ia.ip_address,
        ia.assigned_date,
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.business_name,
        cs.id as service_id,
        sp.name as service_plan_name,
        sp.download_speed,
        sp.upload_speed
      FROM ip_addresses ia
      INNER JOIN customer_services cs ON ia.service_id = cs.id
      INNER JOIN customers c ON cs.customer_id = c.id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE ia.subnet_id = ${subnetId}
        AND ia.status = 'assigned'
      ORDER BY ia.ip_address
    `

    // Get company letterhead
    const letterhead = await getCompanyLetterhead()

    // Generate PDF
    const doc = new jsPDF()
    const fileName = `subnet-report-${subnet.cidr.replace(/\//g, "-")}-${Date.now()}.pdf`

    addLetterheadToPDF(doc, letterhead, "IP Subnet Report")

    let yPosition = 80 // Start content after letterhead

    // Document title
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("IP Subnet Report", 20, yPosition)
    yPosition += 10

    // Subnet information section
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Subnet Information", 20, yPosition)
    yPosition += 8

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const subnetInfo = [
      ["CIDR Block:", subnet.cidr],
      ["Subnet Name:", subnet.name || "N/A"],
      ["Type:", subnet.type?.toUpperCase() || "N/A"],
      ["Router:", `${subnet.router_name || "Unknown"} (${subnet.router_ip || "N/A"})`],
      ["Location:", subnet.location_name || "N/A"],
      ["Gateway:", subnet.gateway || "N/A"],
      ["VLAN ID:", subnet.vlan_id ? String(subnet.vlan_id) : "N/A"],
      ["Created:", new Date(subnet.created_at).toLocaleDateString()],
    ]

    subnetInfo.forEach(([label, value]) => {
      doc.text(label, 20, yPosition)
      doc.text(value, 80, yPosition)
      yPosition += 6
    })

    yPosition += 5

    // IP Address Statistics section
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("IP Address Statistics", 20, yPosition)
    yPosition += 8

    const totalIPs = subnet.total_ips_generated || 0
    const utilization = totalIPs > 0 ? Math.round((ipStats.assigned / totalIPs) * 100) : 0
    ;(doc as any).autoTable({
      startY: yPosition,
      head: [["Metric", "Count", "Percentage"]],
      body: [
        ["Total IP Addresses", totalIPs.toString(), "100%"],
        ["Assigned", ipStats.assigned.toString(), `${utilization}%`],
        [
          "Available",
          ipStats.available.toString(),
          totalIPs > 0 ? `${Math.round((ipStats.available / totalIPs) * 100)}%` : "0%",
        ],
        [
          "Reserved",
          ipStats.reserved.toString(),
          totalIPs > 0 ? `${Math.round((ipStats.reserved / totalIPs) * 100)}%` : "0%",
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      margin: { left: 20, right: 20 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // Assigned IP Addresses section
    if (assignedIPsQuery.length > 0) {
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Assigned IP Addresses", 20, yPosition)
      yPosition += 5

      const tableData = assignedIPsQuery.map((ip: any) => [
        ip.ip_address,
        ip.business_name || `${ip.first_name || ""} ${ip.last_name || ""}`.trim(),
        ip.service_plan_name || "N/A",
        ip.download_speed && ip.upload_speed ? `${ip.download_speed}/${ip.upload_speed} Mbps` : "N/A",
        ip.assigned_date ? new Date(ip.assigned_date).toLocaleDateString() : "N/A",
      ])
      ;(doc as any).autoTable({
        startY: yPosition,
        head: [["IP Address", "Customer", "Service Plan", "Speed", "Assigned Date"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 45 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
        },
      })
    }

    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      addFooterToPDF(doc, letterhead, i, totalPages)
    }

    // Return PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error generating subnet report:", error)
    return NextResponse.json({ error: "Failed to generate subnet report" }, { status: 500 })
  }
}
