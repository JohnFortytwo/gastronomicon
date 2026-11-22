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
        src="/LOGO-light.jpg"
        alt="Gastronomicon"
        className="h-10 w-auto max-w-[46vw] object-contain object-left dark:hidden"
        onError={() => setFailed(true)}
      />
      <img
        src="/LOGO-dark.jpg"
        alt=""
        className="hidden h-10 w-auto max-w-[46vw] object-contain object-left dark:block"
        onError={() => setFailed(true)}
      />
    </>
  )
}
