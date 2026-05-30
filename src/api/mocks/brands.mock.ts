import type { CarBrand, CarModel } from '@/types/car'

export const brandsMock: CarBrand[] = [
  { id: 1, name: 'BMW' },
  { id: 2, name: 'Mercedes-Benz' },
  { id: 3, name: 'Audi' },
  { id: 4, name: 'Toyota' },
  { id: 5, name: 'Kia' },
  { id: 6, name: 'Hyundai' },
  { id: 7, name: 'Volkswagen' },
  { id: 8, name: 'Lada' },
]

const b = (id: number): CarBrand => brandsMock.find((x) => x.id === id)!

export const modelsMock: CarModel[] = [
  // BMW
  { id: 101, name: '3 серия', brand: b(1) },
  { id: 102, name: '4 серия', brand: b(1) },
  { id: 103, name: '5 серия', brand: b(1) },
  { id: 104, name: 'X5', brand: b(1) },
  // Mercedes-Benz
  { id: 201, name: 'C-Class', brand: b(2) },
  { id: 202, name: 'E-Class', brand: b(2) },
  { id: 203, name: 'GLC', brand: b(2) },
  // Audi
  { id: 301, name: 'A4', brand: b(3) },
  { id: 302, name: 'A6', brand: b(3) },
  { id: 303, name: 'Q5', brand: b(3) },
  // Toyota
  { id: 401, name: 'Camry', brand: b(4) },
  { id: 402, name: 'RAV4', brand: b(4) },
  { id: 403, name: 'Land Cruiser', brand: b(4) },
  // Kia
  { id: 501, name: 'Rio', brand: b(5) },
  { id: 502, name: 'Sportage', brand: b(5) },
  // Hyundai
  { id: 601, name: 'Solaris', brand: b(6) },
  { id: 602, name: 'Creta', brand: b(6) },
  // Volkswagen
  { id: 701, name: 'Polo', brand: b(7) },
  { id: 702, name: 'Tiguan', brand: b(7) },
  // Lada
  { id: 801, name: 'Vesta', brand: b(8) },
  { id: 802, name: 'Granta', brand: b(8) },
]
