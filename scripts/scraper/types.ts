export interface ScrapedProduct {
  name: string
  brand: string
  category: string
  imageUrl: string
  unitType: 'weight' | 'each' | 'volume'
  barcode?: string
  price: number
  currency: 'SGD' | 'MYR'
  quantity: number
  unit: string
  storeName: string
  dateObserved: string // YYYY-MM-DD
}
