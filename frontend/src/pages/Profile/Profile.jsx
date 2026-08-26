import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Eye, EyeOff, MapPin, Plus, ShieldCheck, ShoppingBag, Sparkles, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";

import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@api/address.api";
import { apiErrorMessage } from "@api/axios";
import { changePasswordRequest, updateProfileRequest } from "@api/user.api";
import Spinner from "@components/ui/Spinner/Spinner";
import { QUERY_KEYS } from "@config/constants";
import { useAuth } from "@context/AuthProvider";
import { listOrders } from "@services/order.service";
import formatCurrency from "@utils/formatCurrency";
import { assetUrl } from "@utils/helpers";
import fallbackImage from "@assets/images/product1.png";

const emptyAddress = {
  full_name: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  landmark: "",
  city: "",
  district: "",
  state: "Tamil Nadu",
  country: "India",
  postal_code: "",
  address_type: "home",
  is_default: false,
};

const emptyPassword = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
const pinCodeRegex = /^\d{6}$/;
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState(() => ({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  }));
  const [address, setAddress] = useState(emptyAddress);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [password, setPassword] = useState(emptyPassword);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [addressErrors, setAddressErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
    const [orderScope, setOrderScope] = useState("all");


  const addresses = useQuery({
    queryKey: QUERY_KEYS.addresses,
    queryFn: async () => {
      const savedAddresses = (await getAddresses()).data.data || [];
      return savedAddresses.map((item) => ({
        ...item,
        is_default: Number(item.is_default) === 1,
      }));
    },
  });
  const orders = useQuery({
    queryKey: [...QUERY_KEYS.orders, orderScope],
    queryFn: () => listOrders({ page: 1, limit: 10, scope: orderScope }),
  });


  const visibleOrders = (orders.data?.items || []).filter((order) =>
    orderScope !== "cod" || String(order.payment_method || order.payment?.provider || "").toLowerCase() === "cod",
  ); 

  const saveProfile = useMutation({
    mutationFn: (nextProfile) =>
      updateProfileRequest({ ...nextProfile, phone: nextProfile.phone || null }),
    onSuccess: async (_, nextProfile) => {
      await refreshUser();
      setProfile(nextProfile);
      setShowProfileForm(false);
      toast.success("Profile updated");
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, "Profile could not be updated")),
  });
  const addAddress = useMutation({
    mutationFn: () => createAddress(address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.addresses });
      setAddress(emptyAddress);
      setShowAddressForm(false);
      toast.success("Address added");
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, "Address could not be added")),
  });
  const editAddress = useMutation({
    mutationFn: () => updateAddress(editingAddressId, address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.addresses });
      setAddress(emptyAddress);
      setEditingAddressId(null);
      setShowAddressForm(false);
      toast.success("Address updated");
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, "Address could not be updated")),
  });
  const changePassword = useMutation({
    mutationFn: ({ current_password, new_password, confirm_password }) =>
      changePasswordRequest({
        current_password,
        password: new_password,
        password_confirmation: confirm_password,
      }),
    onSuccess: () => {
      setPassword(emptyPassword);
      setShowPasswordForm(false);
      toast.success("Password changed successfully");
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, "Password could not be changed")),
  });
  const removeAddress = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.addresses }),
  });
  const makeDefault = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.addresses }),
  });

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (!element) return;
    const navbarOffset = 96;
    const top = window.scrollY + element.getBoundingClientRect().top - navbarOffset;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  };
  const validateProfile = () => {
    const errors = {};
    if (!profile.first_name.trim()) errors.first_name = "First name is required";
    if (!profile.last_name.trim()) errors.last_name = "Last name is required";
    if (profile.phone && !phoneRegex.test(profile.phone.trim())) errors.phone = "Enter a valid phone number";
    setProfileErrors(errors);
    return !Object.keys(errors).length;
  };
  const validateAddress = () => {
    const errors = {};
    if (!address.full_name.trim()) errors.full_name = "Name is required";
    if (!address.phone.trim()) errors.phone = "Mobile phone number is required";
    else if (!phoneRegex.test(address.phone.trim())) errors.phone = "Enter a valid phone number";
    if (!address.address_line_1.trim()) errors.address_line_1 = "Address line 1 is required";
    if (!address.city.trim()) errors.city = "City is required";
    if (!address.district.trim()) errors.district = "District is required";
    if (!address.state.trim()) errors.state = "State is required";
    if (!address.postal_code.trim()) errors.postal_code = "PIN code is required";
    else if (!pinCodeRegex.test(address.postal_code.trim())) errors.postal_code = "Enter a valid 6-digit PIN code";
    setAddressErrors(errors);
    return !Object.keys(errors).length;
  };
  const validatePassword = () => {
    const errors = {};
    if (!password.current_password) errors.current_password = "Current password is required";
    if (!password.new_password) errors.new_password = "New password is required";
    else if (password.new_password.length < 12) errors.new_password = "Password must be at least 12 characters";
    else if (!strongPasswordRegex.test(password.new_password)) errors.new_password = "Use 12+ chars with upper, lower, number, and symbol";
    if (!password.confirm_password) errors.confirm_password = "Please confirm your password";
    else if (password.confirm_password !== password.new_password) errors.confirm_password = "Passwords do not match";
    setPasswordErrors(errors);
    return !Object.keys(errors).length;
  };
  const closeAddressForm = () => {
    setAddress(emptyAddress);
    setEditingAddressId(null);
    setShowAddressForm(false);
    setAddressErrors({});
  };
  const startEditingAddress = (item) => {
    const { id, ...addressValues } = item;
    setAddress({
      ...emptyAddress,
      ...addressValues,
      is_default: Boolean(addressValues.is_default),
    });
    setEditingAddressId(id);
    setShowAddressForm(true);
  };

  return (
    <main className="min-h-screen bg-[#f1f3f6] py-5 sm:py-8">
      <div className="mx-auto max-w-[1240px] px-3 sm:px-5">
        {/* ── Hero Header (ContactUs style) ── */}
        <header className="relative mb-4 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0f2a1e_0%,#123627_55%,#0b5130_100%)] p-7 text-white shadow-[0_24px_60px_rgba(13,35,25,0.18)] sm:p-10">
          {/* decorative rings */}
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[45px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full border-[40px] border-white/5" />

          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: avatar + name */}
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-[#000]/20 ring-2 ring-[#7ee3a8]/40 text-2xl font-bold text-[#7ee3a8]">
                  {user?.first_name?.[0]?.toUpperCase()+user?.last_name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#079447] ring-2 ring-[#0f2a1e]">
                  <CheckCircle2 size={12} className="text-white" />
                </span>
              </div>
              {/* Name + badge */}
              <div>
                <div className="mb-1 flex items-center gap-2 text-[#7ee3a8]">
                  <Sparkles size={14} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">My Account</p>
                </div>
                <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                  {user?.first_name} {user?.last_name}
                </h1>
                {user?.email && (
                  <p className="mt-1 text-sm text-white/60">{user.email}</p>
                )}
              </div>
            </div>

            {/* Right: quick-action pills */}
        
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit overflow-hidden bg-white shadow-sm">
            <nav className="divide-y divide-gray-100 hidden lg:block">
              <button type="button" onClick={() => scrollToSection("personal-information")} className="flex w-full items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-gray-50">
                <UserRound size={19} className="text-[#079447]" />
                <span className="font-medium text-gray-700">Personal information</span>
              </button>
              <button type="button" onClick={() => scrollToSection("manage-addresses")} className="flex w-full items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-gray-50">
                <MapPin size={19} className="text-[#079447]" />
                <span className="font-medium text-gray-700">Manage addresses</span>
              </button>
              <button type="button" onClick={() => scrollToSection("login-security")} className="flex w-full items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-gray-50">
                <ShieldCheck size={19} className="text-[#079447]" />
                <span className="font-medium text-gray-700">Change Password</span>
              </button>
              <button type="button" onClick={() => scrollToSection("my-orders")} className="flex w-full items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-gray-50">
                <ShoppingBag size={19} className="text-[#079447]" />
                <span className="font-medium text-gray-700">Orders</span>
              </button>
            </nav>
          </aside>

          <div className="space-y-4">
            <section id="personal-information" className="bg-white shadow-sm scroll-mt-24">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Personal information</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Manage your personal details</p>
                </div>
                <button type="button" onClick={() => setShowProfileForm(true)} className="text-sm font-semibold text-[#079447] hover:underline">Edit</button>
              </div>
              <div className="px-5 py-5 sm:px-7">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="First name" value={profile.first_name || "—"} />
                  <InfoRow label="Last name" value={profile.last_name || "—"} />
                  <InfoRow label="Email address" value={user?.email || "—"} />
                  <InfoRow label="Mobile number" value={profile.phone || "—"} />
                </div>
              </div>
            </section>

            <section id="manage-addresses" className="bg-white shadow-sm scroll-mt-24">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Manage addresses</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Your saved delivery addresses</p>
                </div>
                <button type="button" onClick={() => (showAddressForm ? closeAddressForm() : setShowAddressForm(true))} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#079447]">
                  <Plus size={16} />
                  ADD NEW ADDRESS
                </button>
              </div>
              <div className="p-5 sm:p-7">
                {addresses.isLoading ? (
                  <div className="py-12"><Spinner /></div>
                ) : !addresses.data?.length ? (
                  <div className="py-10 text-center">
                    <MapPin size={42} className="mx-auto text-gray-300" />
                    <p className="mt-3 text-sm text-gray-500">No saved addresses</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.data.map((item) => (
                      <article key={item.id} className="border border-gray-200 bg-white">
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-900">{item.full_name}</h3>
                              <span className="rounded-sm bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">{item.address_type || "Home"}</span>
                              {item.is_default && <span className="rounded-sm bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#079447]">Default</span>}
                            </div>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                              {item.address_line_1}{item.address_line_2 ? `, ${item.address_line_2}` : ""}{item.landmark ? `, ${item.landmark}` : ""}
                              <br />
                              {item.city}, {item.district ? `${item.district}, ` : ""}{item.state} - {item.postal_code}
                            </p>
                            <p className="mt-2 text-sm font-medium text-gray-800">{item.phone}</p>
                          </div>
                          <div className="flex shrink-0 items-start gap-4 text-xs font-semibold">
                            <button type="button" onClick={() => startEditingAddress(item)} className="text-[#079447] hover:underline">EDIT</button>
                            {!item.is_default && (
                              <button type="button" onClick={() => makeDefault.mutate(item.id)} disabled={makeDefault.isPending} className="text-[#079447] hover:underline disabled:opacity-50">
                                MAKE DEFAULT
                              </button>
                            )}
                            <button type="button" onClick={() => removeAddress.mutate(item.id)} disabled={removeAddress.isPending} className="text-red-500 hover:underline disabled:opacity-50">
                              DELETE
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section id="login-security" className="bg-white shadow-sm scroll-mt-24">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Keep your password updated for better security</p>
                </div>
                <button type="button" onClick={() => setShowPasswordForm(true)} className="text-sm font-semibold text-[#079447] hover:underline">Change password</button>
              </div>
               
            </section>

            <section id="my-orders" className="bg-white shadow-sm scroll-mt-24">
              <div className="border-b border-gray-100 px-5 py-4 sm:px-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">My Orders</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Track and manage your recent purchases</p>
                  </div>
                  <div className="inline-flex w-fit rounded-sm border border-gray-200 bg-white">
                    {[
                      ["all", "All"],
                      ["current", "Current"],
                      ["cod", "COD"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setOrderScope(value)}
                        className={`border-r border-gray-200 px-4 py-2 text-xs font-semibold last:border-r-0 ${
                          orderScope === value ? "bg-[#079447] text-white" : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                {orders.isLoading ? (
                  <div className="py-12"><Spinner /></div>
                ) : !visibleOrders.length ? (
                  <div className="py-12 text-center">
                    <ShoppingBag size={44} className="mx-auto text-gray-300" />
                    <p className="mt-3 text-sm text-gray-500">You have not placed any orders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleOrders.map((order) => (
                      <CustomerOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {showProfileForm && (
        <Modal title="Edit Personal Information" onClose={() => { setShowProfileForm(false); setProfileErrors({}); }}>
          <form
            className="mt-6 space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validateProfile()) return;
              saveProfile.mutate(profile);
            }}
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <input
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  placeholder="First name"
                  maxLength={50}
                  aria-invalid={Boolean(profileErrors.first_name)}
                  className={`w-full rounded-xl border ${
                    profileErrors.first_name
                      ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                      : "border-gray-200 bg-white text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                  } px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400`}
                />
                <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                  {profileErrors.first_name && (
                    <>
                      <AlertCircle size={12} className="shrink-0 text-red-600" />
                      <span>{profileErrors.first_name}</span>
                    </>
                  )}
                </p>
              </div>

              <div>
                <input
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  placeholder="Last name"
                  maxLength={50}
                  aria-invalid={Boolean(profileErrors.last_name)}
                  className={`w-full rounded-xl border ${
                    profileErrors.last_name
                      ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                      : "border-gray-200 bg-white text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                  } px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400`}
                />
                <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                  {profileErrors.last_name && (
                    <>
                      <AlertCircle size={12} className="shrink-0 text-red-600" />
                      <span>{profileErrors.last_name}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Mobile number"
                maxLength={15}
                inputMode="tel"
                aria-invalid={Boolean(profileErrors.phone)}
                className={`w-full rounded-xl border ${
                  profileErrors.phone
                    ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                    : "border-gray-200 bg-white text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                } px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400`}
              />
              <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                {profileErrors.phone && (
                  <>
                    <AlertCircle size={12} className="shrink-0 text-red-600" />
                    <span>{profileErrors.phone}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowProfileForm(false); setProfileErrors({}); }} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
              <button type="submit" disabled={saveProfile.isPending} className="rounded-xl bg-[#079447] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddressForm && (
        <Modal title={editingAddressId ? "Edit Address" : "Add New Address"} onClose={closeAddressForm}>
          <form
            className="mt-6 grid gap-2.5 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validateAddress()) return;
              (editingAddressId ? editAddress : addAddress).mutate();
            }}
          >
            <AddressInput label="Full name" name="full_name" value={address} setValue={setAddress} error={addressErrors.full_name} maxLength={50} />
            <AddressInput label="Phone number" name="phone" value={address} setValue={setAddress} error={addressErrors.phone} maxLength={15} />
            <AddressInput label="Address line 1" name="address_line_1" value={address} setValue={setAddress} error={addressErrors.address_line_1} className="sm:col-span-2" maxLength={150} />
            <AddressInput label="Address line 2 (optional)" name="address_line_2" value={address} setValue={setAddress} error={addressErrors.address_line_2} className="sm:col-span-2" required={false} maxLength={150} />
            <AddressInput label="Landmark (optional)" name="landmark" value={address} setValue={setAddress} error={addressErrors.landmark} required={false} maxLength={100} />
            <AddressInput label="City" name="city" value={address} setValue={setAddress} error={addressErrors.city} maxLength={50} />
            <AddressInput label="District" name="district" value={address} setValue={setAddress} error={addressErrors.district} maxLength={50} />
            <AddressInput label="State" name="state" value={address} setValue={setAddress} error={addressErrors.state} maxLength={50} />
            <AddressInput label="PIN code" name="postal_code" value={address} setValue={setAddress} error={addressErrors.postal_code} maxLength={6} />
            <div className="sm:col-span-2">
              <select
                value={address.address_type}
                onChange={(e) => setAddress({ ...address, address_type: e.target.value })}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#333] outline-none transition-all focus:border-[#079447] focus:ring-4 focus:ring-emerald-50"
              >
                <option value="home">Address type: Home</option>
                <option value="work">Address type: Work</option>
                <option value="other">Address type: Other</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeAddressForm} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
              <button type="submit" disabled={addAddress.isPending || editAddress.isPending} className="rounded-xl bg-[#079447] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{editingAddressId ? "Update" : "Add"}</button>
            </div>
          </form>
        </Modal>
      )}

      {showPasswordForm && (
        <Modal title="Change Password" onClose={() => { setShowPasswordForm(false); setPasswordErrors({}); }}>
          <form
            className="mt-6 space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validatePassword()) return;
              changePassword.mutate(password);
            }}
          >
            <PasswordInput label="Current password" name="current_password" value={password} setValue={setPassword} error={passwordErrors.current_password} />
            <PasswordInput label="New password" name="new_password" value={password} setValue={setPassword} error={passwordErrors.new_password} />
            <PasswordInput label="Confirm password" name="confirm_password" value={password} setValue={setPassword} error={passwordErrors.confirm_password} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowPasswordForm(false); setPasswordErrors({}); }} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
              <button type="submit" disabled={changePassword.isPending} className="rounded-xl bg-[#079447] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Update</button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );

};

function CustomerOrderCard({ order }) {
  const address = parseAddress(order.shipping_address_json);
  const isCod = String(order.payment_method).toLowerCase() === "cod";
  const deliveryDate = formatDeliveryDate(
    order.delivery_date ||
      order.estimated_delivery_date ||
      order.expected_delivery_date ||
      order.delivery_by ||
      order.eta ||
      order.expected_delivery_at ||
      order.delivery_date_time,
  );
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <header className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-bold text-gray-900">Order #: {order.order_code}</h3><p className="mt-1 text-xs text-gray-500">{order.items?.length || 0} products · {new Date(order.created_at).toLocaleString("en-IN")}</p></div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${isCod ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>{isCod ? "Cash on Delivery (COD)" : "Online payment · Paid"}</span>
      </header>
      <div className="grid gap-3 bg-gray-50/60 px-5 py-4 text-sm sm:grid-cols-4">
        <div><span className="block text-[11px] font-bold uppercase text-gray-400">Status</span><b className="mt-1 block capitalize text-gray-800">{String(order.status).replaceAll("_", " ")}</b></div>
        <div><span className="block text-[11px] font-bold uppercase text-gray-400">Date of delivery</span><b className="mt-1 block text-gray-800">{deliveryDate || "Not scheduled"}</b></div>
        <div><span className="block text-[11px] font-bold uppercase text-gray-400">Delivered to</span><b className="mt-1 block text-gray-800">{[address.city,address.state,address.postal_code].filter(Boolean).join(", ") || "Not recorded"}</b></div>
        <div><span className="block text-[11px] font-bold uppercase text-gray-400">Total</span><b className="mt-1 block text-gray-900">{formatCurrency(order.amount)}</b><small className="capitalize text-gray-500">{isCod ? `COD · ${order.payment_status}` : order.payment_status}</small></div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {(order.items || []).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3"><img src={assetUrl(item.product_image, fallbackImage)} alt={item.product_name} className="h-14 w-14 rounded-lg bg-gray-50 object-contain p-1" /><div className="min-w-0 flex-1"><b className="block truncate text-sm text-gray-900">{item.product_name}</b><small className="block text-gray-500">Quantity: {item.quantity} · {formatCurrency(item.unit_price)}</small><small className="block text-gray-400">{item.sku || "Standard product"}</small></div><strong className="text-sm text-gray-900">{formatCurrency(item.total_amount)}</strong></div>)}
      </div>
    </article>
  );
}

function parseAddress(value) {
  try { return typeof value === "string" ? JSON.parse(value) : value || {}; }
  catch { return {}; }
}

function formatDeliveryDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = date.toLocaleDateString("en-US", { day: "numeric" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  return `Delivery by ${month} ${day}, ${weekday}`;
}

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-end bg-gray-950/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
    <div className="max-h-[calc(100dvh-0.75rem)] w-full overflow-y-auto overscroll-contain rounded-t-[2rem] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:max-w-xl sm:rounded-[2rem] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
           <h3 className="mt-1 text-2xl font-semibold text-gray-900">{title}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-xl bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

const AddressInput = ({
  label,
  name,
  value,
  setValue,
  error,
  className = "",
  maxLength = 100
}) => (
  <div className={className}>
    <input
      value={value[name]}
      onChange={(event) => setValue({ ...value, [name]: event.target.value })}
      placeholder={label}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-xl border ${
        error
          ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
          : "border-gray-200 bg-white text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
      } px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400`}
      maxLength={maxLength}
    />
    <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
      {error && (
        <>
          <AlertCircle size={12} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </>
      )}
    </p>
  </div>
);

const PasswordInput = ({ label, name, value, setValue, error }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <span className="relative block">
        <input
          type={isVisible ? "text" : "password"}
          autoComplete={name === "current_password" ? "current-password" : "new-password"}
          value={value[name]}
          onChange={(event) => setValue({ ...value, [name]: event.target.value })}
          placeholder={label}
          maxLength={128}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl border ${
            error
              ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
              : "border-gray-200 bg-white text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
          } py-2.5 pl-3.5 pr-11 text-sm outline-none transition-all placeholder:text-gray-400`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-gray-400 transition hover:text-[#079447]"
        >
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
        {error && (
          <>
            <AlertCircle size={12} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </>
        )}
      </p>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200 bg-[#f7f8fa] p-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{label}</p>
    <p className="mt-1.5 truncate text-sm font-semibold text-gray-900">{value}</p>
  </div>
);

export default Profile;
