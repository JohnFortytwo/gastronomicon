"use client"

import { useState } from "react"

export function BrandLogo() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className="font-heading text-xl leading-none">Gastronomicon</span>
  }

  return (
    <>
      <img
        src="/brand/logo-light.png"
        alt="Gastronomicon"
        className="h-10 w-auto max-w-[46vw] object-contain object-left dark:hidden"
        onError={() => setFailed(true)}
      />
      <img
        src="/brand/logo-dark.png"
        alt=""
        className="hidden h-10 w-auto max-w-[46vw] object-contain object-left dark:block"
        onError={() => setFailed(true)}
      />
    </>
  )
}
