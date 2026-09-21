require('dotenv').config();
const connectDatabase = require('./config/database');
const Product = require('./models/Product');
const Project = require('./models/Project');
const Lead = require('./models/Lead');

const products = [
  { name: 'Bộ truyền động công nghiệp', slug: 'bo-truyen-dong-cong-nghiep', sku: 'DK-TD-001', category: 'Truyền động', price: 4850000, unit: 'bộ', stock: 18, featured: true, image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80' },
  { name: 'Vòng bi tải trọng cao', slug: 'vong-bi-tai-trong-cao', sku: 'DK-VB-002', category: 'Linh kiện cơ khí', price: 780000, unit: 'chiếc', stock: 60, featured: true, image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80' },
  { name: 'Tủ điện điều khiển', slug: 'tu-dien-dieu-khien', sku: 'DK-TD-003', category: 'Thiết bị điện', priceOnRequest: true, unit: 'tủ', stock: 4, featured: true, image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80' }
];
const projects = [
  { title: 'Hệ thống băng tải nhà máy', slug: 'he-thong-bang-tai-nha-may', category: 'Gia công cơ khí', location: 'Bắc Ninh', year: '2025', featured: true, image: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Nhà xưởng công nghiệp 8.000m²', slug: 'nha-xuong-cong-nghiep-8000m2', category: 'Kết cấu thép', location: 'Hưng Yên', year: '2025', featured: true, image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Dây chuyền và hệ thống phụ trợ', slug: 'day-chuyen-va-he-thong-phu-tro', category: 'Hệ thống M&E', location: 'Hải Phòng', year: '2024', featured: true, image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80' }
];

const leads = [
  { name: 'Nguyễn Văn Minh', phone: '0912345678', email: 'minh@example.com', serviceType: 'Gia công cơ khí', budget: '100 - 500 triệu', message: 'Cần gia công cụm chi tiết theo bản vẽ kỹ thuật.', status: 'new', source: 'seed' },
  { name: 'Trần Hoàng Nam', phone: '0987654321', email: 'nam@example.com', serviceType: 'Thi công công nghiệp', budget: '500 triệu - 2 tỷ', message: 'Yêu cầu khảo sát và báo giá kết cấu nhà xưởng.', status: 'contacted', source: 'seed' },
  { name: 'Công ty An Phát', phone: '0905123456', email: 'purchasing@anphat.example', serviceType: 'Cung ứng thiết bị', budget: 'Trên 2 tỷ', message: 'Cần báo giá thiết bị cho dây chuyền sản xuất mới.', status: 'quoted', source: 'seed' }
];

async function seed() {
  await connectDatabase();
  await Promise.all([Product.deleteMany({}), Project.deleteMany({}), Lead.deleteMany({ source: 'seed' })]);
  const [createdProducts, createdProjects, createdLeads] = await Promise.all([
    Product.insertMany(products),
    Project.insertMany(projects),
    Lead.insertMany(leads)
  ]);
  console.log(`Seed complete: ${createdProducts.length} products, ${createdProjects.length} projects, ${createdLeads.length} leads`);
  process.exit(0);
}
seed().catch(error => { console.error(error); process.exit(1); });
