import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "@/components/app-layout"
import { RequireAuth } from "@/components/require-auth"

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
  ] },
  { path: "*", lazy: async () => { const module = await import("@/pages/not-found-page"); return { Component: module.NotFoundPage } } },
]}])
