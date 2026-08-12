import { useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Heart,
  Leaf,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { Link, NavLink, useNavigate ,useLocation} from "react-router-dom";
import Tinyleaf from "@assets/images/tinyleaf.svg";

import Logo from "@assets/images/Navbar/snaNavbarLogo.svg";
import { useAuth } from "@context/AuthProvider";
import { useCart } from "@hooks/useCart";
import { useWishlist } from "@hooks/useWishlist";

const navLinkClass = ({ isActive }) =>
  `font-medium transition-colors ${isActive ? "text-[#079447]" : "text-[#333] hover:text-[#079447]"}`;

const CountBadge = ({ value }) =>
  value > 0 ? (
    <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-[#079447] px-1 text-center text-[11px] font-bold leading-5 text-white">
      {value > 99 ? "99+" : value}
    </span>
  ) : null;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
console.log(location.pathname)
  const { user, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();
  const { items: wishlist } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  let cartCount = cart.items.reduce(
    (total, item) => total + Number(item.quantity),
    0,
  );

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
    setMobileMenuOpen(false);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      navigate("/");
    } finally {
      setIsSigningOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] w-[94vw] items-center px-4 sm:px-6 lg:px-0">
        <Link to="/" className="shrink-0" aria-label="SNA Sundaram Home">
          <img src={Logo} alt="SNA Sundaram Logo" className="h-12 w-auto" />
        </Link>

        <form
          onSubmit={submitSearch}
          className="ml-14 hidden w-[355px] md:block lg:ml-16"
        >
          <div className="flex h-10 items-center rounded-full border border-gray-300 px-4 focus-within:border-[#12A94B]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              placeholder="Search products…"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none"
            />
            <button aria-label="Search" className="text-[#12A94B]">
              <Search size={20} strokeWidth={2.5} />
            </button>
          </div>
        </form>

        <nav className="ml-auto hidden items-center gap-8 lg:flex">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/ourstory" className={navLinkClass}>
            Our Story
          </NavLink>
          <NavLink to="/products" className={navLinkClass}>
            Products
          </NavLink>
          <NavLink to="/contactus" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>

        <div className="ml-8 hidden items-center gap-6 lg:flex">
          <Link
            to={isAuthenticated ? "/profile" : "/auth/login"}
            title={user ? `${user.first_name}'s account` : "Sign in"}
            className={location.pathname === "/profile"
      ? "text-[#079447]"
      : "text-[#333] hover:text-[#079447]"}
          >
            <UserRound size={23} />
          </Link>
          <Link
            to={isAuthenticated ? "/wishlist" : "/auth/login"}
            className="relative text-[#C92828]"
            aria-label="Wishlist"
          >
            <Heart size={24} fill="currentColor" />
           {isAuthenticated&&<CountBadge value={wishlist.length} />} 
          </Link>
          <Link
            to={isAuthenticated ? "/cart" : "/auth/login"}
            className={location.pathname === "/cart"
      ? "text-[#079447] relative"
      : "text-[#333] hover:text-[#079447] relative"}
            aria-label="Shopping cart"
          >
            <ShoppingCart size={25} />
            {isAuthenticated && <CountBadge value={cartCount} />}
          </Link>
          {isAuthenticated && (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="text-gray-500 transition hover:text-red-600"
              aria-label="Sign out"
            >
              <LogOut size={21} />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-4 lg:hidden">
          <Link
            to={isAuthenticated ? "/profile" : "/auth/login"}
            aria-label="Account"
            className={location.pathname === "/profile"
      ? "text-[#079447] relative"
      : "text-[#333] hover:text-[#079447]"}
          >
            <UserRound size={21} />
          </Link>
          <Link
            to={isAuthenticated ? "/cart" : "/auth/login"}
            className={location.pathname === "/cart"
      ? "text-[#079447] relative"
      : "text-[#333] hover:text-[#079447] relative"}
            aria-label="Shopping cart"
          >
            <ShoppingCart size={23} />
            <CountBadge value={cartCount} />
          </Link>
          <button
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <form
        onSubmit={submitSearch}
        className="border-t border-gray-100 px-4 py-3 md:hidden"
      >
        <div className="flex h-10 items-center rounded-full border border-gray-300 px-4 focus-within:border-[#12A94B]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            placeholder="Search products…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button aria-label="Search" className="text-[#12A94B]">
            <Search size={20} />
          </button>
        </div>
      </form>

      <div
        className={`overflow-hidden border-t border-gray-100 bg-white transition-all duration-300 lg:hidden ${mobileMenuOpen ? "max-h-[460px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <nav className="space-y-1 px-5 py-4">
        {[
  ["/", "Home"],
  ["/ourstory", "Our Story"],
  ["/products", "Products"],
  ["/contactus", "Contact Us"],
  [isAuthenticated ? "/wishlist" : "/auth/login", "Wishlist"],
].map(([to, label]) => (
  <NavLink
    key={`${to}-${label}`}
    to={to}
    end={to === "/"}
    onClick={() => setMobileMenuOpen(false)}
    className={({ isActive }) =>
      `flex items-center gap-2 border-b border-gray-100 py-3 transition-colors ${
        isActive
          ? "font-medium text-[#079447]"
          : "text-gray-700 hover:text-[#079447]"
      }`
    }
  >
    {({ isActive }) => (
      <>

        <span>{label}</span>
        {isActive && (
          <img
            className="h-auto w-[17px]"
            alt="Tiny leaf"
            aria-hidden="true"
            src={Tinyleaf}
          />
        )}

      
      </>
    )}
  </NavLink>
))}
          {isAuthenticated && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="block w-full py-3 text-left text-red-600"
            >
              Sign out
            </button>
          )}
        </nav>
      </div>

      {showLogoutConfirm && createPortal(
        <div className="fixed inset-0 z-[60] grid place-items-center bg-gray-950/45 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle size={24} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-gray-900">
              Sign out of your account?
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              You will need to sign in again to access your account, orders, and saved addresses.
            </p>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isSigningOut}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Keep me signed in
              </button>
              <button
                type="button"
                onClick={confirmSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isSigningOut && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />}
                {isSigningOut ? "Signing out…" : "Yes, sign out"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
};

export default Navbar;
