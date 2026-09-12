"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from "@repo/ui"
import { resetDemoWorkspace } from "../actions"

/**
 * "Perfect demo" reset — wipes and re-seeds the demo workspace with fresh,
 * relative-to-today data. Rendered only for the demo account; the server
 * action enforces the same gate.
 */
export function ResetDemoButton() {
  const router = useRouter()
  const [running, setRunning] = useState(false)

  async function handleReset() {
    setRunning(true)
    try {
      const result = await resetDemoWorkspace()
      if (result.success) {
        toast.success("Demo workspace reset — everything is fresh as of today.")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Demo reset failed. Check the server logs.")
    } finally {
      setRunning(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={running}>
          {running ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RotateCcw className="size-4" />
          )}
          {running ? "Resetting demo…" : "Reset demo data"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset the demo workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            This wipes the demo workspace and re-seeds it with fresh data dated
            today — plays, briefing, meetings, billing, people, and memory. It
            takes about two minutes. Only do this right before a demo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset}>Reset demo</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
