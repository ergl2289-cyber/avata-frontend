import type {
  CarListItem,
  DriveType,
  FuelType,
  ModerationStatus,
  Transmission,
} from '@/types/car'

const NBSP = ' '

/** Group thousands with non-breaking spaces: 1839000 -> "1 839 000". */
export function groupThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

/** "1 839 000 ₽" */
export function formatPrice(price: number): string {
  return `${groupThousands(price)}${NBSP}₽`
}

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

/** Listing date like "17 мая, 14:41" (day + genitive month + time, no year). */
export function formatListingDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.getDate()
  const month = MONTHS_GENITIVE[d.getMonth()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month}, ${hh}:${mm}`
}

/** "139 800 км" */
export function formatMileage(mileage: number): string {
  return `${groupThousands(mileage)}${NBSP}км`
}

/** Short gearbox code used in card titles. */
export function transmissionCode(t: Transmission | null | undefined): string {
  switch (t) {
    case 'automatic':
      return 'AT'
    case 'manual':
      return 'MT'
    case 'robot':
      return 'AMT'
    case 'cvt':
      return 'CVT'
    default:
      return ''
  }
}

/** Full human gearbox label (detail screen). */
export function transmissionLabel(t: Transmission | null | undefined): string {
  switch (t) {
    case 'automatic':
      return 'Автомат'
    case 'manual':
      return 'Механика'
    case 'robot':
      return 'Робот'
    case 'cvt':
      return 'Вариатор'
    default:
      return '—'
  }
}

export function fuelLabel(f: FuelType | null | undefined): string {
  switch (f) {
    case 'petrol':
      return 'Бензин'
    case 'diesel':
      return 'Дизель'
    case 'electric':
      return 'Электро'
    case 'hybrid':
      return 'Гибрид'
    default:
      return '—'
  }
}

export function moderationLabel(s: ModerationStatus): string {
  switch (s) {
    case 'draft':
      return 'Черновик'
    case 'pending':
      return 'На модерации'
    case 'approved':
      return 'Активно'
    case 'rejected':
      return 'Отклонено'
    default:
      return ''
  }
}

export function driveLabel(d: DriveType | null | undefined): string {
  switch (d) {
    case 'fwd':
      return 'Передний'
    case 'rwd':
      return 'Задний'
    case 'awd':
      return 'Полный'
    default:
      return '—'
  }
}

/**
 * One-line spec summary for the search-results card, e.g.
 * "Бензин 2.0 (184 л.с.), автомат, задний, седан". Missing fields are skipped.
 */
export function carSpecLine(
  specs: CarListItem['technical_specs'] | null | undefined,
): string {
  if (!specs) return ''
  const parts: string[] = []

  // Engine: "Бензин 2.0 (184 л.с.)"
  const engineBits: string[] = []
  if (specs.fuel_type) engineBits.push(fuelLabel(specs.fuel_type))
  if (specs.engine_volume != null) engineBits.push(specs.engine_volume.toFixed(1))
  let engine = engineBits.join(' ')
  if (specs.engine_power != null) engine += `${engine ? ' ' : ''}(${specs.engine_power} л.с.)`
  if (engine) parts.push(engine)

  if (specs.transmission) parts.push(transmissionLabel(specs.transmission).toLowerCase())
  if (specs.drive_type) parts.push(driveLabel(specs.drive_type).toLowerCase())
  if (specs.body_type) parts.push(specs.body_type.toLowerCase())

  return parts.join(', ')
}

/**
 * Card title per reference: brand + model [+ engine volume] [+ gearbox code].
 * e.g. "BMW 3 серия 2.0 AT"
 */
export function carTitle(car: Pick<CarListItem, 'model' | 'technical_specs'>): string {
  const parts = [car.model.brand.name, car.model.name]
  const vol = car.technical_specs?.engine_volume
  if (vol != null) parts.push(vol.toFixed(1))
  const tc = transmissionCode(car.technical_specs?.transmission)
  if (tc) parts.push(tc)
  return parts.join(' ')
}
