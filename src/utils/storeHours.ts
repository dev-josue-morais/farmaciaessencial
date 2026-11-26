export interface OpeningDay {
  enabled: boolean
  open: string
  close: string
}

export type OpeningSchedule = Record<string, OpeningDay>

const businessTimeZone = 'America/Sao_Paulo'

export function isWithinOpeningHours(schedule: unknown, now = new Date()): boolean {
  if (schedule == null) return true
  if (typeof schedule !== 'object' || Array.isArray(schedule)) return false

  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: businessTimeZone,
  }).format(now).toLowerCase()
  const day = (schedule as Record<string, unknown>)[weekday]
  if (typeof day !== 'object' || day === null || Array.isArray(day)) return false

  const openingDay = day as Partial<OpeningDay>
  if (openingDay.enabled !== true || !openingDay.open || !openingDay.close) return false
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openingDay.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(openingDay.close)) {
    return false
  }
  if (openingDay.open >= openingDay.close) return false

  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: businessTimeZone,
  }).formatToParts(now)
  const currentTime = `${parts.find((part) => part.type === 'hour')?.value}:${parts.find((part) => part.type === 'minute')?.value}`
  return currentTime >= openingDay.open && currentTime < openingDay.close
}
