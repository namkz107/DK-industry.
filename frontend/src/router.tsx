import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "@/components/app-layout"
import { RequireAuth } from "@/components/require-auth"
import { RequireCustomer } from "@/components/require-customer"

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
  ] },
  { path: "*", lazy: async () => { const module = await import("@/pages/not-found-page"); return { Component: module.NotFoundPage } } },
]}])
