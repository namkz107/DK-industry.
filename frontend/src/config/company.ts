export const company = {
  name: "CTY CPTV ĐẦU TƯ XD TM ĐĂNG KHOA",
  phone: "0965243386",
  phoneLabel: "096 5243 386",
  email: "namkz107@gmail.com",
  address: "Cụm 3, thôn Duyên Trường, Xã Duyên Thái (Hồng Vân cũ), Huyện Thường Tín, Thành phố Hà Nội, Việt Nam",
  taxCode: import.meta.env.VITE_COMPANY_TAX_CODE || "",
  registrationNumber: import.meta.env.VITE_COMPANY_REGISTRATION_NUMBER || "",
  legalRepresentative: import.meta.env.VITE_COMPANY_LEGAL_REPRESENTATIVE || "",
}

export const companyMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(company.address)}`
