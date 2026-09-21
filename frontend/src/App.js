import { useEffect, useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const fallbackProjects = [
  { _id: 'p1', category: 'Gia công cơ khí', title: 'Hệ thống băng tải nhà máy', location: 'Bắc Ninh', year: '2025', image: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=1200&q=80' },
  { _id: 'p2', category: 'Kết cấu thép', title: 'Nhà xưởng công nghiệp 8.000m²', location: 'Hưng Yên', year: '2025', image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80' },
  { _id: 'p3', category: 'Hệ thống M&E', title: 'Dây chuyền và hệ thống phụ trợ', location: 'Hải Phòng', year: '2024', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80' },
];

const fallbackProducts = [
  { _id: 's1', name: 'Bộ truyền động công nghiệp', category: 'Truyền động', price: 4850000, unit: 'bộ', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80' },
  { _id: 's2', name: 'Vòng bi tải trọng cao', category: 'Linh kiện cơ khí', price: 780000, unit: 'chiếc', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80' },
  { _id: 's3', name: 'Tủ điện điều khiển', category: 'Thiết bị điện', price: null, unit: 'tủ', image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80' },
];

const services = [
  { icon: '01', title: 'Tư vấn kỹ thuật', text: 'Khảo sát, thiết kế giải pháp và tối ưu dây chuyền phù hợp với mục tiêu sản xuất.' },
  { icon: '02', title: 'Gia công cơ khí', text: 'Cắt, chấn, hàn, tiện CNC và chế tạo chi tiết theo bản vẽ với độ chính xác cao.' },
  { icon: '03', title: 'Thi công công nghiệp', text: 'Kết cấu thép, nhà xưởng, hệ thống M&E và lắp đặt thiết bị trọn gói.' },
  { icon: '04', title: 'Cung ứng thiết bị', text: 'Vật tư, linh kiện và thiết bị công nghiệp chính hãng cho mọi quy mô dự án.' },
];

function Icon({ name }) {
  const icons = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" /></>,
    cart: <><circle cx="9" cy="20" r="1"/><circle cx="20" cy="20" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="M18 6 6 18M6 6l12 12"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

function App() {
  const [projects, setProjects] = useState(fallbackProjects);
  const [products, setProducts] = useState(fallbackProducts);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/projects?featured=true`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API_URL}/products?featured=true`).then(r => r.ok ? r.json() : Promise.reject()),
    ]).then(([projectData, productData]) => {
      if (projectData.data?.length) setProjects(projectData.data);
      if (productData.data?.length) setProducts(productData.data);
    }).catch(() => {});
  }, []);

  const submitQuote = async (event) => {
    event.preventDefault();
    setSending(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.products = cart.map(item => ({ product: item._id, name: item.name, quantity: 1 }));
    try {
      const response = await fetch(`${API_URL}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error();
      setNotice('Yêu cầu đã được gửi. DK Industry sẽ liên hệ trong vòng 2 giờ làm việc.');
      event.currentTarget.reset(); setCart([]);
    } catch {
      setNotice('Đã ghi nhận thông tin trên giao diện demo. Hãy bật backend để lưu yêu cầu vào MongoDB.');
    } finally { setSending(false); }
  };

  const addToQuote = (product) => {
    setCart(items => items.some(item => item._id === product._id) ? items : [...items, product]);
    setQuoteOpen(true);
  };

  return (
    <div className="site-shell">
      <header className="header">
        <a className="brand" href="#home" aria-label="DK Industry trang chủ"><span className="brand-mark">DK</span><span>DK INDUSTRY<small>Engineering excellence</small></span></a>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a href="#about" onClick={() => setMenuOpen(false)}>Về chúng tôi</a><a href="#services" onClick={() => setMenuOpen(false)}>Dịch vụ</a><a href="#projects" onClick={() => setMenuOpen(false)}>Dự án</a><a href="#products" onClick={() => setMenuOpen(false)}>Sản phẩm</a><a href="#insights" onClick={() => setMenuOpen(false)}>Góc kỹ thuật</a>
        </nav>
        <div className="header-actions"><button className="cart-button" onClick={() => setQuoteOpen(true)}><Icon name="cart"/><span>{cart.length}</span></button><button className="primary small" onClick={() => setQuoteOpen(true)}>Nhận báo giá</button><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'}/></button></div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-overlay" />
          <div className="hero-content container">
            <div className="eyebrow"><span/>Kiến tạo giá trị bền vững</div>
            <h1>Giải pháp cơ khí<br/><em>chính xác & toàn diện.</em></h1>
            <p>Từ ý tưởng đến vận hành — DK Industry đồng hành cùng doanh nghiệp bằng năng lực tư vấn, chế tạo và thi công công nghiệp chuẩn xác.</p>
            <div className="hero-buttons"><button className="primary" onClick={() => setQuoteOpen(true)}>Trao đổi dự án <Icon name="arrow"/></button><a className="ghost" href="#projects">Xem năng lực</a></div>
          </div>
          <div className="hero-side"><span>Cuộn để khám phá</span><i/></div>
        </section>

        <section className="trust-strip"><div className="container stats"><div><strong>12+</strong><span>Năm kinh nghiệm</span></div><div><strong>350+</strong><span>Dự án hoàn thành</span></div><div><strong>98%</strong><span>Khách hàng hài lòng</span></div><div><strong>24/7</strong><span>Hỗ trợ kỹ thuật</span></div></div></section>

        <section className="section about" id="about"><div className="container split"><div className="section-intro"><div className="eyebrow dark"><span/>Về DK Industry</div><h2>Chúng tôi không chỉ<br/>gia công. Chúng tôi tạo ra<br/><em>giải pháp.</em></h2></div><div className="about-copy"><p className="lead">Kết hợp kinh nghiệm thực tiễn, công nghệ hiện đại và tinh thần trách nhiệm để mang đến những sản phẩm cơ khí đáp ứng chính xác yêu cầu của từng dự án.</p><p>Đội ngũ kỹ sư của chúng tôi kiểm soát xuyên suốt từ khảo sát, thiết kế, sản xuất đến lắp đặt và bảo trì.</p><a className="text-link" href="#services">Khám phá năng lực <Icon name="arrow"/></a></div></div></section>

        <section className="section services" id="services"><div className="container"><div className="section-heading"><div><div className="eyebrow dark"><span/>Năng lực cốt lõi</div><h2>Một đối tác.<br/><em>Trọn giải pháp.</em></h2></div><p>Hệ sinh thái dịch vụ khép kín giúp dự án đồng bộ, tối ưu chi phí và đảm bảo tiến độ.</p></div><div className="service-grid">{services.map(service => <article className="service-card" key={service.icon}><span className="service-number">{service.icon}</span><div className="service-icon">✦</div><h3>{service.title}</h3><p>{service.text}</p><a href="#quote" onClick={(e) => {e.preventDefault(); setQuoteOpen(true)}}>Tìm hiểu thêm <Icon name="arrow"/></a></article>)}</div></div></section>

        <section className="section projects" id="projects"><div className="container"><div className="section-heading light"><div><div className="eyebrow"><span/>Dự án tiêu biểu</div><h2>Năng lực được chứng minh<br/>bằng <em>công trình thực tế.</em></h2></div><a className="ghost" href="#contact">Xem toàn bộ dự án</a></div><div className="project-grid">{projects.slice(0,3).map((project, index) => <article className={`project-card project-${index + 1}`} key={project._id}><img src={project.image} alt={project.title}/><div className="project-shade"/><div className="project-info"><span>{project.category}</span><h3>{project.title}</h3><p>{project.location} · {project.year}</p></div></article>)}</div></div></section>

        <section className="section products" id="products"><div className="container"><div className="section-heading"><div><div className="eyebrow dark"><span/>Thiết bị & vật tư</div><h2>Sản phẩm chuẩn xác.<br/><em>Vận hành bền bỉ.</em></h2></div><p>Danh mục thiết bị được tuyển chọn từ các nhà sản xuất uy tín, đầy đủ chứng từ và hỗ trợ kỹ thuật.</p></div><div className="product-grid">{products.slice(0,3).map(product => <article className="product-card" key={product._id}><div className="product-image"><img src={product.image} alt={product.name}/><span>{product.category}</span></div><div className="product-body"><h3>{product.name}</h3><p>{product.price ? `${Number(product.price).toLocaleString('vi-VN')}đ / ${product.unit}` : 'Liên hệ báo giá dự án'}</p><button onClick={() => addToQuote(product)}>Thêm vào yêu cầu <Icon name="arrow"/></button></div></article>)}</div></div></section>

        <section className="section process"><div className="container"><div className="center-heading"><div className="eyebrow dark"><span/>Quy trình làm việc</div><h2>Rõ ràng trong từng <em>bước đi.</em></h2></div><div className="process-line">{[['01','Tiếp nhận yêu cầu'],['02','Khảo sát & tư vấn'],['03','Thiết kế & báo giá'],['04','Sản xuất & thi công'],['05','Nghiệm thu & bảo hành']].map(([num,title]) => <div className="process-step" key={num}><span>{num}</span><h3>{title}</h3></div>)}</div></div></section>

        <section className="section insights" id="insights"><div className="container"><div className="section-heading"><div><div className="eyebrow dark"><span/>Góc kỹ thuật</div><h2>Kiến thức từ<br/><em>người trong nghề.</em></h2></div><a className="text-link" href="#contact">Xem tất cả bài viết <Icon name="arrow"/></a></div><div className="insight-grid"><article className="featured-insight"><img src="https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80" alt="Kỹ sư kiểm tra máy móc"/><div><span>Kỹ thuật · 12.09.2026</span><h3>5 yếu tố quyết định chất lượng một chi tiết gia công CNC</h3><a href="#contact">Đọc bài viết <Icon name="arrow"/></a></div></article><div className="insight-list"><article><span>Xu hướng · 05.09.2026</span><h3>Tự động hóa nhà máy: bắt đầu từ đâu để tối ưu đầu tư?</h3></article><article><span>Vật liệu · 28.08.2026</span><h3>Cách lựa chọn thép phù hợp cho kết cấu nhà xưởng</h3></article><article><span>Kinh nghiệm · 17.08.2026</span><h3>Checklist nghiệm thu hệ thống cơ điện công nghiệp</h3></article></div></div></div></section>

        <section className="cta" id="contact"><div className="container cta-inner"><div><div className="eyebrow"><span/>Bắt đầu một dự án</div><h2>Bạn có một bài toán kỹ thuật?<br/><em>Hãy cùng chúng tôi giải quyết.</em></h2></div><button className="primary light-button" onClick={() => setQuoteOpen(true)}>Nhận tư vấn miễn phí <Icon name="arrow"/></button></div></section>
      </main>

      <footer><div className="container footer-grid"><div><a className="brand footer-brand" href="#home"><span className="brand-mark">DK</span><span>DK INDUSTRY<small>Engineering excellence</small></span></a><p>Giải pháp tư vấn, chế tạo và thi công cơ khí công nghiệp toàn diện.</p></div><div><h4>Liên kết</h4><a href="#about">Về chúng tôi</a><a href="#services">Dịch vụ</a><a href="#projects">Dự án</a><a href="#products">Sản phẩm</a></div><div><h4>Liên hệ</h4><p>0912 345 678</p><p>contact@dkindustry.vn</p><p>Hà Nội, Việt Nam</p></div></div><div className="container footer-bottom"><span>© 2026 DK Industry. All rights reserved.</span><span>Designed for industry.</span></div></footer>

      <a className="floating-phone" href="tel:0912345678" aria-label="Gọi DK Industry"><Icon name="phone"/></a>
      {quoteOpen && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setQuoteOpen(false)}><div className="quote-modal" id="quote"><button className="modal-close" onClick={() => setQuoteOpen(false)}><Icon name="close"/></button><div className="modal-copy"><div className="eyebrow"><span/>Yêu cầu tư vấn</div><h2>Cho chúng tôi biết<br/>bạn đang cần gì.</h2><p>Đội ngũ kỹ thuật sẽ phân tích yêu cầu và phản hồi trong vòng 2 giờ làm việc.</p><ul><li><Icon name="check"/>Tư vấn hoàn toàn miễn phí</li><li><Icon name="check"/>Bảo mật thông tin dự án</li><li><Icon name="check"/>Giải pháp đúng nhu cầu</li></ul></div><form onSubmit={submitQuote}><label>Họ và tên *<input name="name" required placeholder="Nguyễn Văn A"/></label><div className="form-row"><label>Số điện thoại *<input name="phone" required pattern="[0-9+ ]{9,15}" placeholder="0912 345 678"/></label><label>Email<input name="email" type="email" placeholder="email@company.vn"/></label></div><label>Nhu cầu của bạn<select name="serviceType" defaultValue=""><option value="" disabled>Chọn dịch vụ</option><option>Tư vấn kỹ thuật</option><option>Gia công cơ khí</option><option>Thi công công nghiệp</option><option>Cung ứng thiết bị</option></select></label><label>Ngân sách dự kiến<select name="budget"><option>Chưa xác định</option><option>Dưới 100 triệu</option><option>100 - 500 triệu</option><option>500 triệu - 2 tỷ</option><option>Trên 2 tỷ</option></select></label>{cart.length > 0 && <div className="selected-products"><strong>Sản phẩm đã chọn</strong>{cart.map(item => <span key={item._id}>{item.name}<button type="button" onClick={() => setCart(cart.filter(x => x._id !== item._id))}>×</button></span>)}</div>}<label>Mô tả yêu cầu<textarea name="message" rows="4" placeholder="Loại công trình, thông số, tiến độ mong muốn..."/></label><button className="primary submit" disabled={sending}>{sending ? 'Đang gửi...' : 'Gửi yêu cầu'} <Icon name="arrow"/></button>{notice && <div className="form-notice">{notice}</div>}</form></div></div>}
    </div>
  );
}

export default App;
