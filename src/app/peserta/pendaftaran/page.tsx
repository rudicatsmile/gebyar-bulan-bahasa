"use client";

import * as React from "react";
import { PesertaPendaftaranClient } from "./pendaftaran-client";

// useSearchParams() harus dibungkus Suspense agar halaman bisa di-prerender saat build
export default function PesertaPendaftaranStatusPage() {
  return (
    <React.Suspense>
      <PesertaPendaftaranClient />
    </React.Suspense>
  );
}
