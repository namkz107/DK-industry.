import type { Product, Project, Service } from "@/types"

export const fallbackProjects: Project[] = [
  { _id: "p1", category: "Gia công cơ khí", title: "Hệ thống băng tải nhà máy", location: "Bắc Ninh", year: "2025", image: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=1200&q=82" },
  { _id: "p2", category: "Kết cấu thép", title: "Nhà xưởng công nghiệp 8.000m²", location: "Hưng Yên", year: "2025", image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=82" },
  { _id: "p3", category: "Hệ thống M&E", title: "Dây chuyền và hệ thống phụ trợ", location: "Hải Phòng", year: "2024", image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=82" },
]

export const fallbackProducts: Product[] = [
  { _id: "s1", name: "Bộ truyền động công nghiệp", category: "Truyền động", price: 4850000, unit: "bộ", image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=82" },
  { _id: "s2", name: "Vòng bi tải trọng cao", category: "Linh kiện cơ khí", price: 780000, unit: "chiếc", image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=82" },
  { _id: "s3", name: "Tủ điện điều khiển", category: "Thiết bị điện", price: null, unit: "tủ", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=82" },
  { _id: "s4", name: "Băng tải con lăn công nghiệp", category: "Băng tải & tự động hóa", price: null, unit: "hệ thống", image: "https://images.unsplash.com/photo-1586864387789-628af9feed72?auto=format&fit=crop&w=900&q=82" },
  { _id: "s5", name: "Bàn thao tác lắp ráp", category: "Thiết bị nhà xưởng", price: null, unit: "bộ", image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=82" },
  { _id: "s6", name: "Giá kệ công nghiệp tải nặng", category: "Thiết bị nhà xưởng", price: null, unit: "bộ", image: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=82" },
  { _id: "s7", name: "Xe đẩy hàng inox", category: "Sản phẩm inox", price: 3200000, unit: "chiếc", image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=82" },
  { _id: "s8", name: "Tủ đồ phòng sạch", category: "Thiết bị phòng sạch", price: null, unit: "tủ", image: "https://images.unsplash.com/photo-1581093458791-9d42e3c8f59b?auto=format&fit=crop&w=900&q=82" },
  { _id: "s9", name: "Chụp hút khói bếp inox", category: "Thiết bị bếp inox", price: null, unit: "bộ", image: "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=900&q=82" },
]

export const fallbackServices: Service[] = [
  { _id: "dv1", name: "Cắt Fiber Laser CNC", slug: "cat-fiber-laser-cnc", summary: "Cắt thép, inox, nhôm và đồng theo bản vẽ với mép cắt sạch, tốc độ cao.", capabilities: ["Cắt kim loại tấm", "Cắt biên dạng phức tạp", "Khắc đánh dấu"], materials: ["Thép", "Inox", "Nhôm", "Đồng"], applications: ["Chi tiết máy", "Vỏ tủ điện", "Nội thất kim loại"], image: "https://images.unsplash.com/photo-1565439312106-298fa03a5364?auto=format&fit=crop&w=1200&q=82" },
  { _id: "dv2", name: "Chấn gấp kim loại CNC", slug: "chan-gap-kim-loai-cnc", summary: "Tạo hình kim loại tấm chính xác cho cả đơn mẫu và sản xuất hàng loạt.", capabilities: ["Chấn góc", "Uốn định hình", "Đột dập"], materials: ["Thép tấm", "Inox", "Nhôm"], applications: ["Vỏ máy", "Tủ công nghiệp", "Kết cấu tấm"], image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=82" },
  { _id: "dv3", name: "Gia công cơ khí chính xác", slug: "gia-cong-co-khi-chinh-xac", summary: "Phay CNC, tiện CNC, cắt dây EDM và mài theo dung sai kỹ thuật.", capabilities: ["Phay CNC", "Tiện CNC", "Cắt dây EDM", "Mài phẳng"], materials: ["Thép hợp kim", "Nhôm", "Inox", "Nhựa kỹ thuật"], applications: ["Chi tiết máy", "Khuôn mẫu", "Linh kiện"], image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=82" },
  { _id: "dv4", name: "Thiết kế & chế tạo Jig", slug: "thiet-ke-che-tao-jig", summary: "Đồ gá gia công, Jig kiểm tra và Jig lắp ráp theo quy trình thực tế.", capabilities: ["Jig gia công", "Jig kiểm tra", "Jig lắp ráp"], materials: ["Nhôm", "Bakelite", "POM", "Thép"], applications: ["Điện tử", "Ô tô xe máy", "Sản xuất hàng loạt"], image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=82" },
  { _id: "dv5", name: "Hàn & hoàn thiện kim loại", slug: "han-hoan-thien-kim-loai", summary: "Hàn MIG/TIG, xử lý mối hàn, đánh bóng và sơn phủ hoàn thiện.", capabilities: ["Hàn MIG/TIG", "Hàn laser", "Đánh bóng", "Sơn tĩnh điện"], materials: ["Thép", "Inox", "Nhôm"], applications: ["Khung máy", "Bồn bể", "Nội thất inox"], image: "https://images.unsplash.com/photo-1605218427368-35b3a9116a31?auto=format&fit=crop&w=1200&q=82" },
  { _id: "dv6", name: "Chế tạo hệ thống công nghiệp", slug: "che-tao-he-thong-cong-nghiep", summary: "Băng tải, bàn thao tác, giá kệ và kết cấu phụ trợ theo mặt bằng nhà máy.", capabilities: ["Băng tải", "Bàn thao tác", "Giá kệ", "Khung bảo vệ máy"], materials: ["Thép sơn", "Inox", "Nhôm định hình"], applications: ["Nhà máy", "Kho vận", "Dây chuyền lắp ráp"], image: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=1200&q=82" },
]
