import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"

const sql = neon(process.env.DATABASE_URL!)

export interface ServiceActivationRequest {
  customer_service_id: number
  customer_id: number
  service_plan_id: number
  activation_type: "new" | "upgrade" | "downgrade" | "suspend" | "resume"
  priority?: number
  scheduled_date?: Date
  configuration_overrides?: Record<string, any>
}

export interface ActivationStep {
  name: string
  description: string
  handler: (context: ActivationContext) => Promise<StepResult>
  rollback?: (context: ActivationContext) => Promise<void>
  timeout_ms?: number
}

export interface ActivationContext {
  activation_id: number
  customer_service_id: number
  customer_id: number
  service_plan_id: number
  assigned_device?: any
  assigned_ip?: string
  configuration: Record<string, any>
  bandwidth_profile: Record<string, any>
  qos_profile: Record<string, any>
}

export interface StepResult {
  success: boolean
  message: string
  data?: Record<string, any>
  error?: string
}

export class ServiceActivationEngine {
  private static instance: ServiceActivationEngine
  private activationSteps: Map<string, ActivationStep[]> = new Map()

  static getInstance(): ServiceActivationEngine {
    if (!ServiceActivationEngine.instance) {
      ServiceActivationEngine.instance = new ServiceActivationEngine()
      ServiceActivationEngine.instance.initializeSteps()
    }
    return ServiceActivationEngine.instance
  }

  private initializeSteps() {
    // Define activation steps for different service types
    this.activationSteps.set("new", [
      {
        name: "validate_service_plan",
        description: "Validate service plan and customer eligibility",
        handler: this.validateServicePlan.bind(this),
      },
      {
        name: "allocate_ip_address",
        description: "Allocate IP address from available pool",
        handler: this.allocateIPAddress.bind(this),
        rollback: this.releaseIPAddress.bind(this),
      },
      {
        name: "assign_network_device",
        description: "Assign appropriate network device",
        handler: this.assignNetworkDevice.bind(this),
      },
      {
        name: "configure_bandwidth",
        description: "Configure bandwidth allocation and QoS",
        handler: this.configureBandwidth.bind(this),
        rollback: this.removeBandwidthConfig.bind(this),
      },
      {
        name: "deploy_configuration",
        description: "Deploy configuration to network device",
        handler: this.deployConfiguration.bind(this),
        rollback: this.rollbackConfiguration.bind(this),
      },
      {
        name: "verify_connectivity",
        description: "Verify service connectivity and performance",
        handler: this.verifyConnectivity.bind(this),
      },
      {
        name: "activate_service",
        description: "Activate service and update customer record",
        handler: this.activateService.bind(this),
      },
    ])

    this.activationSteps.set("upgrade", [
      {
        name: "validate_upgrade",
        description: "Validate upgrade path and requirements",
        handler: this.validateUpgrade.bind(this),
      },
      {
        name: "update_bandwidth",
        description: "Update bandwidth allocation",
        handler: this.updateBandwidth.bind(this),
      },
      {
        name: "deploy_updated_config",
        description: "Deploy updated configuration",
        handler: this.deployConfiguration.bind(this),
      },
      {
        name: "verify_upgrade",
        description: "Verify upgraded service performance",
        handler: this.verifyConnectivity.bind(this),
      },
    ])

    this.activationSteps.set("suspend", [
      {
        name: "suspend_service",
        description: "Suspend customer service",
        handler: this.suspendService.bind(this),
      },
      {
        name: "apply_suspension_policy",
        description: "Apply bandwidth restrictions",
        handler: this.applySuspensionPolicy.bind(this),
      },
    ])
  }

  async processActivation(
    request: ServiceActivationRequest,
  ): Promise<{ success: boolean; activation_id?: number; error?: string }> {
    try {
      // Create activation record
      const [activation] = await sql`
        INSERT INTO service_activations (
          customer_service_id,
          customer_id,
          service_plan_id,
          activation_type,
          status,
          started_at
        ) VALUES (
          ${request.customer_service_id},
          ${request.customer_id},
          ${request.service_plan_id},
          ${request.activation_type},
          'in_progress',
          NOW()
        ) RETURNING *
      `

      await ActivityLogger.logAdminActivity(
        `Service activation started: ${request.activation_type} for customer ${request.customer_id}`,
        "system",
        {
          activation_id: activation.id,
          customer_id: request.customer_id,
          service_plan_id: request.service_plan_id,
          activation_type: request.activation_type,
        },
      )

      // Get activation steps for this type
      const steps = this.activationSteps.get(request.activation_type) || []
      if (steps.length === 0) {
        throw new Error(`No activation steps defined for type: ${request.activation_type}`)
      }

      // Build activation context
      const context = await this.buildActivationContext(activation.id, request)

      // Execute steps
      let currentStep = 0
      const executedSteps: string[] = []

      try {
        for (const step of steps) {
          currentStep++
          await this.updateActivationProgress(activation.id, currentStep, step.name)

          await this.logActivationStep(activation.id, step.name, "started")

          const startTime = Date.now()
          const result = await this.executeStepWithTimeout(step, context)
          const executionTime = Date.now() - startTime

          if (result.success) {
            await this.logActivationStep(activation.id, step.name, "completed", result, executionTime)
            executedSteps.push(step.name)

            // Update context with step results
            if (result.data) {
              Object.assign(context, result.data)
            }
          } else {
            await this.logActivationStep(activation.id, step.name, "failed", result, executionTime)
            throw new Error(`Step ${step.name} failed: ${result.error || result.message}`)
          }
        }

        // Mark activation as completed
        await sql`
          UPDATE service_activations 
          SET status = 'completed', completed_at = NOW()
          WHERE id = ${activation.id}
        `

        await ActivityLogger.logAdminActivity(
          `Service activation completed successfully for customer ${request.customer_id}`,
          "system",
          {
            activation_id: activation.id,
            steps_completed: executedSteps.length,
            total_steps: steps.length,
          },
        )

        return { success: true, activation_id: activation.id }
      } catch (error) {
        // Rollback executed steps in reverse order
        await this.rollbackActivation(activation.id, steps, executedSteps, context)

        await sql`
          UPDATE service_activations 
          SET status = 'failed', failed_reason = ${error instanceof Error ? error.message : "Unknown error"}
          WHERE id = ${activation.id}
        `

        await ActivityLogger.logAdminActivity(
          `Service activation failed for customer ${request.customer_id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          "system",
          {
            activation_id: activation.id,
            error: error instanceof Error ? error.message : "Unknown error",
            steps_completed: executedSteps.length,
          },
        )

        return { success: false, error: error instanceof Error ? error.message : "Activation failed" }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to start activation" }
    }
  }

  private async buildActivationContext(
    activation_id: number,
    request: ServiceActivationRequest,
  ): Promise<ActivationContext> {
    // Get service plan details
    const [servicePlan] = await sql`
      SELECT * FROM service_plans WHERE id = ${request.service_plan_id}
    `

    // Get provisioning template
    const [template] = await sql`
      SELECT * FROM service_provisioning_templates 
      WHERE service_plan_id = ${request.service_plan_id} 
      AND is_active = true
      LIMIT 1
    `

    return {
      activation_id,
      customer_service_id: request.customer_service_id,
      customer_id: request.customer_id,
      service_plan_id: request.service_plan_id,
      configuration: {
        ...template?.configuration_template,
        ...request.configuration_overrides,
      },
      bandwidth_profile: template?.bandwidth_profile || {},
      qos_profile: template?.qos_policy || {},
    }
  }

  private async executeStepWithTimeout(step: ActivationStep, context: ActivationContext): Promise<StepResult> {
    const timeout = step.timeout_ms || 30000 // 30 second default timeout

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Step ${step.name} timed out after ${timeout}ms`))
      }, timeout)

      step
        .handler(context)
        .then((result) => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  // Step implementations
  private async validateServicePlan(context: ActivationContext): Promise<StepResult> {
    const [servicePlan] = await sql`
      SELECT * FROM service_plans WHERE id = ${context.service_plan_id} AND is_active = true
    `

    if (!servicePlan) {
      return { success: false, error: "Service plan not found or inactive" }
    }

    return { success: true, message: "Service plan validated", data: { service_plan: servicePlan } }
  }

  private async allocateIPAddress(context: ActivationContext): Promise<StepResult> {
    // Find available IP from customer pool
    const [availableIP] = await sql`
      SELECT ip.ip_address, ip.pool_id
      FROM ip_address_assignments ip
      JOIN ip_address_pools pool ON ip.pool_id = pool.id
      WHERE ip.status = 'available' 
      AND pool.pool_type = 'customer'
      AND pool.is_active = true
      LIMIT 1
    `

    if (!availableIP) {
      return { success: false, error: "No available IP addresses in customer pool" }
    }

    // Assign IP to customer service
    await sql`
      UPDATE ip_address_assignments 
      SET 
        customer_service_id = ${context.customer_service_id},
        status = 'assigned',
        lease_start = NOW()
      WHERE ip_address = ${availableIP.ip_address}
    `

    return {
      success: true,
      message: `IP address ${availableIP.ip_address} allocated`,
      data: { assigned_ip: availableIP.ip_address },
    }
  }

  private async assignNetworkDevice(context: ActivationContext): Promise<StepResult> {
    // Find suitable device based on service requirements
    const [device] = await sql`
      SELECT * FROM network_devices 
      WHERE status = 'active' 
      AND device_type IN ('router', 'switch')
      ORDER BY cpu_usage ASC, memory_usage ASC
      LIMIT 1
    `

    if (!device) {
      return { success: false, error: "No available network devices" }
    }

    // Update activation with assigned device
    await sql`
      UPDATE service_activations 
      SET assigned_device_id = ${device.id}
      WHERE id = ${context.activation_id}
    `

    return {
      success: true,
      message: `Device ${device.device_name} assigned`,
      data: { assigned_device: device },
    }
  }

  private async configureBandwidth(context: ActivationContext): Promise<StepResult> {
    const bandwidth = context.bandwidth_profile

    if (!bandwidth.download_mbps || !bandwidth.upload_mbps) {
      return { success: false, error: "Bandwidth profile not defined" }
    }

    // Create bandwidth allocation record
    await sql`
      INSERT INTO bandwidth_allocations (
        device_id,
        customer_service_id,
        allocated_download_mbps,
        allocated_upload_mbps,
        burst_download_mbps,
        burst_upload_mbps,
        priority_level
      ) VALUES (
        ${context.assigned_device?.id},
        ${context.customer_service_id},
        ${bandwidth.download_mbps},
        ${bandwidth.upload_mbps},
        ${bandwidth.burst_download_mbps || bandwidth.download_mbps * 1.5},
        ${bandwidth.burst_upload_mbps || bandwidth.upload_mbps * 1.5},
        ${bandwidth.priority_level || 3}
      )
    `

    return {
      success: true,
      message: `Bandwidth configured: ${bandwidth.download_mbps}/${bandwidth.upload_mbps} Mbps`,
    }
  }

  private async deployConfiguration(context: ActivationContext): Promise<StepResult> {
    // In a real implementation, this would connect to network devices
    // and deploy actual configuration via SNMP, SSH, or device APIs

    // Simulate configuration deployment
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Update device configuration record
    await sql`
      UPDATE network_devices 
      SET 
        configuration = configuration || ${JSON.stringify(context.configuration)},
        updated_at = NOW()
      WHERE id = ${context.assigned_device?.id}
    `

    return { success: true, message: "Configuration deployed successfully" }
  }

  private async verifyConnectivity(context: ActivationContext): Promise<StepResult> {
    // Simulate connectivity verification
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In real implementation, would ping customer IP, check bandwidth, etc.
    const connectivityOk = Math.random() > 0.1 // 90% success rate

    if (!connectivityOk) {
      return { success: false, error: "Connectivity verification failed" }
    }

    return { success: true, message: "Connectivity verified" }
  }

  private async activateService(context: ActivationContext): Promise<StepResult> {
    await sql`
      UPDATE customer_services 
      SET 
        status = 'active',
        activated_at = NOW(),
        last_payment_date = NOW(),
        next_billing_date = NOW() + INTERVAL '1 month'
      WHERE id = ${context.customer_service_id}
    `

    return { success: true, message: "Service activated successfully" }
  }

  // Rollback implementations
  private async rollbackActivation(
    activation_id: number,
    steps: ActivationStep[],
    executedSteps: string[],
    context: ActivationContext,
  ): Promise<void> {
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const stepName = executedSteps[i]
      const step = steps.find((s) => s.name === stepName)

      if (step?.rollback) {
        try {
          await step.rollback(context)
          await this.logActivationStep(activation_id, `rollback_${stepName}`, "completed")
        } catch (error) {
          await this.logActivationStep(activation_id, `rollback_${stepName}`, "failed", {
            success: false,
            message: "Rollback failed",
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    }
  }

  private async releaseIPAddress(context: ActivationContext): Promise<void> {
    if (context.assigned_ip) {
      await sql`
        UPDATE ip_address_assignments 
        SET 
          customer_service_id = NULL,
          status = 'available',
          lease_start = NULL
        WHERE ip_address = ${context.assigned_ip}
      `
    }
  }

  private async removeBandwidthConfig(context: ActivationContext): Promise<void> {
    await sql`
      DELETE FROM bandwidth_allocations 
      WHERE customer_service_id = ${context.customer_service_id}
    `
  }

  private async rollbackConfiguration(context: ActivationContext): Promise<void> {
    // Remove deployed configuration from device
    // In real implementation, would connect to device and remove config
  }

  // Additional step implementations for other activation types
  private async validateUpgrade(context: ActivationContext): Promise<StepResult> {
    return { success: true, message: "Upgrade validated" }
  }

  private async updateBandwidth(context: ActivationContext): Promise<StepResult> {
    return { success: true, message: "Bandwidth updated" }
  }

  private async suspendService(context: ActivationContext): Promise<StepResult> {
    await sql`
      UPDATE customer_services 
      SET status = 'suspended'
      WHERE id = ${context.customer_service_id}
    `
    return { success: true, message: "Service suspended" }
  }

  private async applySuspensionPolicy(context: ActivationContext): Promise<StepResult> {
    // Apply limited bandwidth for suspended services
    await sql`
      UPDATE bandwidth_allocations 
      SET 
        allocated_download_mbps = 1,
        allocated_upload_mbps = 1
      WHERE customer_service_id = ${context.customer_service_id}
    `
    return { success: true, message: "Suspension policy applied" }
  }

  // Utility methods
  private async updateActivationProgress(activation_id: number, step: number, stepName: string): Promise<void> {
    await sql`
      UPDATE service_activations 
      SET current_step = ${step}, updated_at = NOW()
      WHERE id = ${activation_id}
    `
  }

  private async logActivationStep(
    activation_id: number,
    stepName: string,
    status: string,
    result?: StepResult,
    executionTime?: number,
  ): Promise<void> {
    await sql`
      INSERT INTO service_activation_logs (
        activation_id,
        step_name,
        step_status,
        step_details,
        execution_time_ms,
        error_message
      ) VALUES (
        ${activation_id},
        ${stepName},
        ${status},
        ${JSON.stringify(result || {})},
        ${executionTime || null},
        ${result?.error || null}
      )
    `
  }
}

export const serviceActivationEngine = ServiceActivationEngine.getInstance()
