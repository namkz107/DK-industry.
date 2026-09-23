import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "@/components/app-layout"
import { RequireAuth } from "@/components/require-auth"
import { RequireCustomer } from "@/components/require-customer"
import { RequireStaff } from "@/components/require-staff"
import { RequireAdmin } from "@/components/require-admin"

export const router = createBrowserRouter([{ element: <AppLayout />, children: [
  { path: "/", lazy: async () => { const module = await import("@/pages/home-page"); return { Component: module.HomePage } } },
  { path: "/gioi-thieu", lazy: async () => { const module = await import("@/pages/about-page"); return { Component: module.AboutPage } } },
  { path: "/dich-vu", lazy: async () => { const module = await import("@/pages/services-page"); return { Component: module.ServicesPage } } },
  { path: "/du-an", lazy: async () => { const module = await import("@/pages/projects-page"); return { Component: module.ProjectsPage } } },
  { path: "/san-pham", lazy: async () => { const module = await import("@/pages/products-page"); return { Component: module.ProductsPage } } },
  { path: "/dang-nhap", lazy: async () => { const module = await import("@/pages/login-page"); return { Component: module.LoginPage } } },
  { path: "/dang-ky", lazy: async () => { const module = await import("@/pages/register-page"); return { Component: module.RegisterPage } } },
  { element: <RequireAuth />, children: [
    { path: "/tai-khoan", lazy: async () => { const module = await import("@/pages/account-page"); return { Component: module.AccountPage } } },
    { element: <RequireCustomer />, children: [
      { path: "/tai-khoan/ho-so", lazy: async () => { const module = await import("@/pages/customer-profile-page"); return { Component: module.CustomerProfilePage } } },
      { path: "/gio-hang", lazy: async () => { const module = await import("@/pages/cart-page"); return { Component: module.CartPage } } },
      { path: "/tai-khoan/don-hang", lazy: async () => { const module = await import("@/pages/orders-page"); return { Component: module.OrdersPage } } },
      { path: "/tai-khoan/yeu-cau", lazy: async () => { const module = await import("@/pages/requests-page"); return { Component: module.RequestsPage } } },
    ] },
    { element: <RequireStaff />, children: [
      { path: "/staff", lazy: async () => { const module = await import("@/pages/staff-dashboard-page"); return { Component: module.StaffDashboardPage } } },
      { path: "/staff/leads", lazy: async () => { const module = await import("@/pages/staff-leads-page"); return { Component: module.StaffLeadsPage } } },
      { path: "/staff/requests", lazy: async () => { const module = await import("@/pages/staff-requests-page"); return { Component: module.StaffRequestsPage } } },
      { path: "/staff/orders", lazy: async () => { const module = await import("@/pages/staff-orders-page"); return { Component: module.StaffOrdersPage } } },
    ] },
    { element: <RequireAdmin />, children: [
      { path: "/admin", lazy: async () => { const module = await import("@/pages/admin-dashboard-page"); return { Component: module.AdminDashboardPage } } },
      { path: "/admin/nhan-su", lazy: async () => { const module = await import("@/pages/admin-users-page"); return { Component: module.AdminUsersPage } } },
      { path: "/admin/noi-dung", lazy: async () => { const module = await import("@/pages/admin-content-page"); return { Component: module.AdminContentPage } } },
      { path: "/admin/nhat-ky", lazy: async () => { const module = await import("@/pages/admin-audit-page"); return { Component: module.AdminAuditPage } } },
    ] },
  ] },
  { path: "*", lazy: async () => { const module = await import("@/pages/not-found-page"); return { Component: module.NotFoundPage } } },
]}])
