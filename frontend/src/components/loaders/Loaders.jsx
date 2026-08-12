import React from 'react'
import Logo from "@assets/images/Navbar/snaNavbarLogo.svg";

const Loaders = () => {
  return (
     <main className="grid min-h-screen place-items-center overflow-hidden bg-[#f7faf8] px-5">
            <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-emerald-100 bg-white px-8 py-10 text-center shadow-xl shadow-emerald-950/5">
              <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-emerald-100/70" />
              <div className="absolute -bottom-16 -right-10 h-40 w-40 rounded-full border-[20px] border-emerald-50" />
              <div className="relative">
                <img
                  src={Logo}
                  alt="SNA Sundaram"
                  className="mx-auto h-14 w-auto object-contain"
                />
                <div className="mx-auto mt-8 h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-[#079447]" />
                <h1 className="mt-6 text-lg font-semibold text-gray-900">
                  Preparing your healthy shopping experience
                </h1>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Just a moment while we securely load your account.
                </p>
              </div>
            </div>
          </main>
  )
}

export default Loaders