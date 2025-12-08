import { neon as neonClient } from "@neondatabase/serverless"

// Create and export the neon function as default
const neon = (connectionString: string) => {
  return neonClient(connectionString)
}

export default neon
