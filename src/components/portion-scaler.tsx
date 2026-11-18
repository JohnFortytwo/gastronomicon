"use client"

import { Minus, Plus } from "lucide-react"
import {
  ADULT_COEFFICIENT,
  GOURMAND_COEFFICIENT,
  KID_COEFFICIENT,
} from "@/lib/kitchen/constants"
import { formatCzechNumber } from "@/lib/kitchen/format"
import {
  equivalentPortions,
  scaleFactor,
  totalCalories,
  type EaterCounts,
} from "@/lib/kitchen/portions"
import type { TableDefaults } from "@/types/recipe-view"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ROWS = [
  { key: "adults", label: "Dospělý", coefficient: ADULT_COEFFICIENT, hint: "plná porce" },
  { key: "kids", label: "Dítě", coefficient: KID_COEFFICIENT, hint: "menší porce" },
  { key: "gourmands", label: "Žrout", coefficient: GOURMAND_COEFFICIENT, hint: "pořádný hlad" },
] as const

type Props = {
  counts: EaterCounts
  defaults: TableDefaults
  basePortions: number
  caloriesPerPortion: number | null
  calorieTableName: string | null
  onChange: (counts: EaterCounts) => void
}

export function PortionScaler({
  counts,
  defaults,
  basePortions,
  caloriesPerPortion,
  calorieTableName,
  onChange,
}: Props) {
  const equivalent = equivalentPortions(counts)
  const factor = scaleFactor(equivalent, basePortions)
  const calories = totalCalories(caloriesPerPortion, equivalent)

  function update(key: keyof EaterCounts, delta: number) {
    const next = Math.min(30, Math.max(0, counts[key] + delta))
    onChange({ ...counts, [key]: next })
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm" aria-label="Přepočet porcí">
      <div className="flex">
        <div className="flex w-11 items-center justify-center border-r border-dashed border-primary/40 bg-primary/10">
          <span className="font-mono text-[10px] tracking-[0.35em] text-primary [writing-mode:vertical-rl] rotate-180">
            VSTUPENKA
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between border-b border-dashed px-4 py-3">
            <p className="font-heading text-lg">Stůl</p>
            <p className="font-mono text-xs text-muted-foreground">č. 42</p>
          </div>
          {ROWS.map((row) => (
            <div key={row.key} className="flex items-center gap-3 border-b border-dashed px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium">{row.label}</p>
                <p className="text-sm text-muted-foreground">
                  {row.hint} · koef. {formatCzechNumber(row.coefficient, 1, 1)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Ubrat: ${row.label}`}
                  disabled={counts[row.key] === 0}
                  onClick={() => update(row.key, -1)}
                >
                  <Minus />
                </Button>
                <span className="w-8 text-center font-mono text-xl tabular-nums">{counts[row.key]}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Přidat: ${row.label}`}
                  disabled={counts[row.key] >= 30}
                  onClick={() => update(row.key, 1)}
                >
                  <Plus />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t bg-secondary/60 px-4 py-3">
        <Button
          type="button"
          variant="secondary"
          className={cn("rounded-full")}
          onClick={() =>
            onChange({
              adults: defaults.adults,
              kids: defaults.kids,
              gourmands: defaults.gourmands,
            })
          }
        >
          Můj výchozí stůl
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full bg-card"
          onClick={() => onChange({ adults: 1, kids: 0, gourmands: 0 })}
        >
          Jen pro mě
        </Button>
      </div>
      <div className="space-y-1 px-4 py-4">
        <p className="text-base">
          Ekvivalent{" "}
          <span className="font-mono font-medium">{formatCzechNumber(equivalent)}</span>{" "}
          {equivalent === 1 ? "porce" : "porcí"} · násobek{" "}
          <span className="font-mono font-medium">{formatCzechNumber(factor)}</span>×
        </p>
        {equivalent === 0 ? (
          <p className="text-sm text-muted-foreground">Přidejte aspoň jednoho strávníka.</p>
        ) : null}
        {calories != null ? (
          <p className="text-sm text-muted-foreground">
            Na stůl <span className="font-mono text-foreground">{formatCzechNumber(calories, 0)} kcal</span>
            {caloriesPerPortion != null ? (
              <>
                {" "}
                · {formatCzechNumber(caloriesPerPortion, 0)} kcal / porci
                {calorieTableName ? <span className="italic"> ({calorieTableName})</span> : null}
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">U tohohle receptu kalorie zatím nejsou.</p>
        )}
      </div>
    </section>
  )
}
