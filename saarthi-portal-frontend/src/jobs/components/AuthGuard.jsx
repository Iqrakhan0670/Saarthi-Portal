"use client"

import { Outlet, Navigate } from "react-router-dom"

const AuthGuard = () => {
  const token = localStorage.getItem("token")

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default AuthGuard