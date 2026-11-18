const TIME_ZONE = "Europe/Prague"

function zoneOffsetMs(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0")

  const wallClock = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  )
  return wallClock - instant.getTime()
}

export function pragueMonthStartIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const utcGuess = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
  const adjusted = new Date(utcGuess.getTime() - zoneOffsetMs(utcGuess))
  return new Date(utcGuess.getTime() - zoneOffsetMs(adjusted)).toISOString()
}
