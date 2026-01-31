/**
 * useServeClient Hook
 *
 * Re-exports the serve client context hook for convenient importing.
 * Use this hook to access the selected client in Serve mode.
 *
 * Usage:
 *   import { useServeClient } from '@/app/_features/shell/hooks/useServeClient'
 *
 *   function MyComponent() {
 *     const { selectedClient, setSelectedClient, clients } = useServeClient()
 *     // ...
 *   }
 */

export {
  useServeClient,
  useServeClientSafe,
} from "../contexts/ServeClientContext";
