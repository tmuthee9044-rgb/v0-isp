const { Routeros } = require("routeros-node")

// Replace with your Mikrotik router's details
const routerConfig = {
  host: "192.168.1.1", // IP address of your Mikrotik router
  port: 8728, // Default API port. Use 8729 for SSL.
  user: "api_user", // Your dedicated API username
  password: "your_strong_password", // The password for the API user
}

const routeros = new Routeros(routerConfig)

async function manageMikrotik() {
  try {
    // Connect to the router and log in
    const conn = await routeros.connect()
    console.log("Successfully connected to the router.")

    // Example: Fetch and print a list of active Hotspot users
    const activeUsers = await conn.write(["/ip/hotspot/active/print"])
    console.log("Active Hotspot users:", activeUsers)

    // Example: Add a new PPPoE user
    const newUser = await conn.write([
      "/ppp/secret/add",
      "=name=new_customer",
      "=password=customer_pass",
      "=service=pppoe",
      "=profile=default",
    ])
    console.log("Added new PPPoE user:", newUser)
  } catch (error) {
    console.error("An error occurred:", error)
  } finally {
    // Always destroy the connection to clean up resources
    routeros.destroy()
    console.log("Connection closed.")
  }
}

manageMikrotik()
