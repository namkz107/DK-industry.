export interface Product {
  _id: string
  name: string
  category: string
  description?: string
  price?: number | null
  unit?: string
  image: string
  stock?: number
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

export interface ApiList<T> {
  success: boolean
  count: number
  data: T[]
}
