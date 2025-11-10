import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Kenyan names and data for realistic customer generation
const kenyanFirstNames = [
  "John",
  "Mary",
  "Peter",
  "Grace",
  "David",
  "Faith",
  "James",
  "Joyce",
  "Samuel",
  "Catherine",
  "Daniel",
  "Margaret",
  "Joseph",
  "Elizabeth",
  "Michael",
  "Rose",
  "Francis",
  "Jane",
  "Paul",
  "Lucy",
  "Stephen",
  "Agnes",
  "Robert",
  "Susan",
  "Anthony",
  "Nancy",
  "Charles",
  "Helen",
  "George",
  "Ruth",
  "Thomas",
  "Sarah",
  "William",
  "Rebecca",
  "Richard",
  "Martha",
  "Christopher",
  "Esther",
  "Kenneth",
  "Lydia",
  "Moses",
  "Mercy",
  "Isaac",
  "Priscilla",
  "Jacob",
  "Eunice",
  "Benjamin",
  "Tabitha",
  "Joshua",
  "Naomi",
]

const kenyanLastNames = [
  "Kamau",
  "Wanjiku",
  "Mwangi",
  "Njeri",
  "Kiprotich",
  "Chebet",
  "Otieno",
  "Akinyi",
  "Maina",
  "Wambui",
  "Kiplagat",
  "Jepkemei",
  "Ochieng",
  "Adhiambo",
  "Karanja",
  "Wanjiru",
  "Rotich",
  "Chepkemoi",
  "Owino",
  "Awino",
  "Mutua",
  "Kavata",
  "Kiptoo",
  "Jepkorir",
  "Macharia",
  "Wangari",
  "Lagat",
  "Chepkoech",
  "Omondi",
  "Atieno",
  "Kimani",
  "Njoki",
  "Ruto",
  "Jepchirchir",
  "Odongo",
  "Apiyo",
  "Githui",
  "Wanjiku",
  "Koech",
  "Jemutai",
]

const kenyanCities = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Malindi",
  "Kitale",
  "Garissa",
  "Kakamega",
  "Machakos",
  "Meru",
  "Nyeri",
  "Kericho",
  "Embu",
  "Migori",
  "Homa Bay",
  "Naivasha",
  "Voi",
  "Wajir",
]

const businessTypes = [
  "Retail",
  "Restaurant",
  "Hotel",
  "School",
  "Hospital",
  "Office",
  "Manufacturing",
  "Agriculture",
  "Transport",
  "Construction",
  "Technology",
  "Finance",
  "Real Estate",
  "Entertainment",
  "Consulting",
]

const servicePlans = [
  { name: "5 Mbps Home", price: 2500 },
  { name: "10 Mbps Home", price: 3500 },
  { name: "20 Mbps Home", price: 5000 },
  { name: "50 Mbps Business", price: 8000 },
  { name: "100 Mbps Business", price: 15000 },
  { name: "200 Mbps Enterprise", price: 25000 },
]

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generatePhoneNumber(): string {
  const prefixes = [
    "0701",
    "0702",
    "0703",
    "0704",
    "0705",
    "0706",
    "0707",
    "0708",
    "0709",
    "0710",
    "0711",
    "0712",
    "0713",
    "0714",
    "0715",
    "0716",
    "0717",
    "0718",
    "0719",
    "0720",
    "0721",
    "0722",
    "0723",
    "0724",
    "0725",
    "0726",
    "0727",
    "0728",
    "0729",
    "0730",
    "0731",
    "0732",
    "0733",
    "0734",
    "0735",
    "0736",
    "0737",
    "0738",
    "0739",
    "0740",
    "0741",
    "0742",
    "0743",
    "0744",
    "0745",
    "0746",
    "0747",
    "0748",
    "0749",
    "0750",
    "0751",
    "0752",
    "0753",
    "0754",
    "0755",
    "0756",
    "0757",
    "0758",
    "0759",
    "0760",
    "0761",
    "0762",
    "0763",
    "0764",
    "0765",
    "0766",
    "0767",
    "0768",
    "0769",
    "0770",
    "0771",
    "0772",
    "0773",
    "0774",
    "0775",
    "0776",
    "0777",
    "0778",
    "0779",
    "0780",
    "0781",
    "0782",
    "0783",
    "0784",
    "0785",
    "0786",
    "0787",
    "0788",
    "0789",
    "0790",
    "0791",
    "0792",
    "0793",
    "0794",
    "0795",
    "0796",
    "0797",
    "0798",
    "0799",
  ]
  const prefix = getRandomElement(prefixes)
  const suffix = Math.floor(Math.random() * 900000) + 100000
  return `${prefix}${suffix}`
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"]
  const separators = ["", ".", "_"]
  const separator = getRandomElement(separators)
  const domain = getRandomElement(domains)
  const number = Math.random() > 0.7 ? Math.floor(Math.random() * 99) : ""
  return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${number}@${domain}`
}

function generateCustomer(index: number) {
  const firstName = getRandomElement(kenyanFirstNames)
  const lastName = getRandomElement(kenyanLastNames)
  const customerType = getRandomElement(["individual", "business", "school"])
  const servicePlan = getRandomElement(servicePlans)
  const city = getRandomElement(kenyanCities)

  return {
    name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    email: generateEmail(firstName, lastName),
    phone: generatePhoneNumber(),
    alternate_phone: Math.random() > 0.7 ? generatePhoneNumber() : null,
    customer_type: customerType,
    status: getRandomElement(["active", "suspended", "inactive"]),
    address: `${Math.floor(Math.random() * 999) + 1} ${getRandomElement(["Kenyatta", "Uhuru", "Moi", "Kimathi", "Nyerere", "Mandela", "University", "School", "Hospital", "Market"])} ${getRandomElement(["Road", "Avenue", "Street", "Drive", "Lane"])}, ${city}`,
    city: city,
    postal_code: `${Math.floor(Math.random() * 90000) + 10000}`,
    country: "Kenya",
    national_id: `${Math.floor(Math.random() * 90000000) + 10000000}`,
    date_of_birth: new Date(
      1970 + Math.floor(Math.random() * 40),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    )
      .toISOString()
      .split("T")[0],
    gender: getRandomElement(["male", "female"]),
    plan: servicePlan.name,
    monthly_fee: servicePlan.price,
    balance: Math.floor(Math.random() * 20000) - 5000, // Random balance between -5000 and 15000
    connection_quality: getRandomElement(["excellent", "good", "fair", "poor"]),
    payment_method: getRandomElement(["mpesa", "bank", "cash", "card"]),
    billing_cycle: getRandomElement(["monthly", "quarterly", "annually"]),
    auto_renewal: Math.random() > 0.3,
    installation_date: new Date(
      2020 + Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    )
      .toISOString()
      .split("T")[0],
    last_payment_date:
      Math.random() > 0.2
        ? new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split("T")[0]
        : null,
    business_type: customerType === "business" ? getRandomElement(businessTypes) : null,
    company_size: customerType === "business" ? getRandomElement(["small", "medium", "large"]) : null,
    vat_pin: customerType === "business" ? `P${Math.floor(Math.random() * 900000000) + 100000000}` : null,
    referral_source: getRandomElement(["website", "social_media", "referral", "advertisement", "walk_in"]),
    data_usage_gb: Math.floor(Math.random() * 500) + 10,
    router_allocated: Math.random() > 0.3,
    ip_allocated: Math.random() > 0.3,
    created_at: new Date(
      2020 + Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
      Math.floor(Math.random() * 24),
      Math.floor(Math.random() * 60),
    ).toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function POST() {
  try {
    console.log("[v0] Starting bulk customer seeding...")

    const batchSize = 100
    const totalCustomers = 10000
    const batches = Math.ceil(totalCustomers / batchSize)

    let totalInserted = 0

    for (let batch = 0; batch < batches; batch++) {
      const customers = []
      const currentBatchSize = Math.min(batchSize, totalCustomers - batch * batchSize)

      // Generate customers for this batch
      for (let i = 0; i < currentBatchSize; i++) {
        customers.push(generateCustomer(batch * batchSize + i))
      }

      // Prepare batch insert query
      const values = customers
        .map((customer, index) => {
          const paramOffset = index * 35
          return `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${paramOffset + 4}, $${paramOffset + 5}, $${paramOffset + 6}, $${paramOffset + 7}, $${paramOffset + 8}, $${paramOffset + 9}, $${paramOffset + 10}, $${paramOffset + 11}, $${paramOffset + 12}, $${paramOffset + 13}, $${paramOffset + 14}, $${paramOffset + 15}, $${paramOffset + 16}, $${paramOffset + 17}, $${paramOffset + 18}, $${paramOffset + 19}, $${paramOffset + 20}, $${paramOffset + 21}, $${paramOffset + 22}, $${paramOffset + 23}, $${paramOffset + 24}, $${paramOffset + 25}, $${paramOffset + 26}, $${paramOffset + 27}, $${paramOffset + 28}, $${paramOffset + 29}, $${paramOffset + 30}, $${paramOffset + 31}, $${paramOffset + 32}, $${paramOffset + 33}, $${paramOffset + 34}, $${paramOffset + 35})`
        })
        .join(", ")

      const params = customers.flatMap((customer) => [
        customer.name,
        customer.first_name,
        customer.last_name,
        customer.email,
        customer.phone,
        customer.alternate_phone,
        customer.customer_type,
        customer.status,
        customer.address,
        customer.city,
        customer.postal_code,
        customer.country,
        customer.national_id,
        customer.date_of_birth,
        customer.gender,
        customer.plan,
        customer.monthly_fee,
        customer.balance,
        customer.connection_quality,
        customer.payment_method,
        customer.billing_cycle,
        customer.auto_renewal,
        customer.installation_date,
        customer.last_payment_date,
        customer.business_type,
        customer.company_size,
        customer.vat_pin,
        customer.referral_source,
        customer.data_usage_gb,
        customer.router_allocated,
        customer.ip_allocated,
        customer.created_at,
        customer.updated_at,
        customer.created_at,
        customer.updated_at,
      ])

      const insertQuery = `
        INSERT INTO customers (
          name, first_name, last_name, email, phone, alternate_phone, customer_type, status, address, city,
          postal_code, country, national_id, date_of_birth, gender, plan, monthly_fee, balance, connection_quality, payment_method,
          billing_cycle, auto_renewal, installation_date, last_payment_date, business_type, company_size, vat_pin, referral_source,
          data_usage_gb, router_allocated, ip_allocated, created_at, updated_at, created_at, updated_at
        ) VALUES ${values}
        ON CONFLICT (email) DO NOTHING
      `

      const result = await sql(insertQuery, params)
      totalInserted += result.length || currentBatchSize

      console.log(
        `[v0] Batch ${batch + 1}/${batches} completed. Inserted ${currentBatchSize} customers. Total: ${totalInserted}`,
      )
    }

    console.log(`[v0] Bulk seeding completed. Total customers inserted: ${totalInserted}`)

    return Response.json({
      success: true,
      message: `Successfully seeded ${totalInserted} customers`,
      totalInserted,
      batches: batches,
    })
  } catch (error) {
    console.error("[v0] Error seeding bulk customers:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to seed customers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
