import type { Product, Project } from "@/types"

export const fallbackProjects: Project[] = [
  { _id: "p1", category: "Gia công cơ khí", title: "Hệ thống băng tải nhà máy", location: "Bắc Ninh", year: "2025", image: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=1200&q=82" },
  { _id: "p2", category: "Kết cấu thép", title: "Nhà xưởng công nghiệp 8.000m²", location: "Hưng Yên", year: "2025", image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=82" },
  { _id: "p3", category: "Hệ thống M&E", title: "Dây chuyền và hệ thống phụ trợ", location: "Hải Phòng", year: "2024", image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=82" },
]

export const fallbackProducts: Product[] = [
  { _id: "s1", name: "Bộ truyền động công nghiệp", category: "Truyền động", price: 4850000, unit: "bộ", image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=82" },
  { _id: "s2", name: "Vòng bi tải trọng cao", category: "Linh kiện cơ khí", price: 780000, unit: "chiếc", image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=82" },
  { _id: "s3", name: "Tủ điện điều khiển", category: "Thiết bị điện", price: null, unit: "tủ", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=82" },
]
