// Test fixture: Next.js framework violations
// Simulates: src/app/dashboard/page.tsx with 'use client'
"use client";

import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch("/api/data").then(r => r.json()).then(setData); }, []);
  return <div>{JSON.stringify(data)}</div>;
}
