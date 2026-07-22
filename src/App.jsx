import Header from './sections/Header.jsx'
import { HeroCard, NextDoseCard } from './sections/Hero.jsx'
import { ScheduleCard, GlanceCard } from './sections/Schedule.jsx'
import { MedsCard, AdherenceCard } from './sections/Medications.jsx'
import { InventoryCard, QuickActionsCard } from './sections/Panels.jsx'
import { HistoryCard } from './sections/HistoryTips.jsx'
import { FooterBar } from './sections/FooterCTA.jsx'
import { ModalLayer } from './sections/Modals.jsx'
import { useFitScale } from './useFitScale.js'

const DESIGN_W = 1600
const DESIGN_H = 1000

export default function App() {
  const scale = useFitScale(DESIGN_W, DESIGN_H)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-page">
      {/* Fixed design canvas scaled + centered to always fit the viewport — no scrolling. */}
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="absolute left-1/2 top-1/2 flex flex-col gap-3 p-6"
      >
        <Header notifications={1} />

        <main className="grid min-h-0 flex-1 grid-cols-12 grid-rows-3 gap-3">
          {/* Row 1 */}
          <HeroCard className="col-span-5" />
          <ScheduleCard className="col-span-4" />
          <NextDoseCard className="col-span-3" />

          {/* Row 2 */}
          <MedsCard className="col-span-5" />
          <AdherenceCard className="col-span-4" />
          <GlanceCard className="col-span-3" />

          {/* Row 3 — three equal-width cards */}
          <InventoryCard className="col-span-4" />
          <QuickActionsCard className="col-span-4" />
          <HistoryCard className="col-span-4" />
        </main>

        <FooterBar className="h-6 shrink-0" />
      </div>

      {/* Overlays live outside the scaled canvas so they render full-size & centered. */}
      <ModalLayer />
    </div>
  )
}
