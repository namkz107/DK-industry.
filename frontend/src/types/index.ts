export interface Product {
  _id: string
  name: string
  category: string
  description?: string
  price?: number | null
  unit?: string
  image: string
  stock?: number
  priceOnRequest?: boolean
  sku?: string
}

export interface Project {
  _id: string
  title: string
  category: string
  location?: string
  year?: string
  description?: string
  image: string
}

export interface Service {
  _id: string
  name: string
  slug: string
  summary: string
  description?: string
  capabilities: string[]
  materials: string[]
  applications: string[]
  image: string
}

export interface ApiList<T> {
  success: boolean
  count: number
  data: T[]
}
