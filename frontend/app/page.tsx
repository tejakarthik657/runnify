import { redirect } from 'next/navigation'

/**
 * ROOT ENTRY POINT
 * Protocol: Immediate handoff to /landing
 * Reason: Landing page houses the full-viewport Map Layer (Spec 5.1)
 */
export default function Home() {
    // Server-side redirect ensures no UI jitter
    redirect('/landing')
}