"use server"

import { createClient } from "@/app/_lib/supabase/server"
import { DEMO_EMAIL, runDemoSeed } from "./seed-demo-workspace"

type ResetDemoResult = { success: true } | { success: false; error: string }

/**
 * Wipe and re-seed the demo workspace ("perfect demo" state). Available only
 * to the demo account itself — the gate is enforced here, server-side, never
 * by hiding the button alone.
 */
export async function resetDemoWorkspace(): Promise<ResetDemoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== DEMO_EMAIL) {
    return { success: false, error: "Demo reset is only available on the demo account." }
  }

  try {
    await runDemoSeed()
    return { success: true }
  } catch (error) {
    console.error("[demo] reset failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Demo reset failed.",
    }
  }
}
