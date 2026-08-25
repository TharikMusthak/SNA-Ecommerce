import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MapPin, Plus, ShieldCheck, ShoppingBag, UserRound, X } from "lucide-react";
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
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#079447] focus:ring-4 focus:ring-emerald-50";
  const inlineErrorClass = "mt-0.5 min-h-4 text-[11px] leading-4 text-red-600";
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
    if (!address.phone.trim()) errors.phone = "Phone number is required";
    else if (!phoneRegex.test(address.phone.trim())) errors.phone = "Enter a valid phone number";
    if (!address.address_line_1.trim()) errors.address_line_1 = "Address line 1 is required";
    if (!address.city.trim()) errors.city = "City is required";
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
    else if (!strongPasswordRegex.test(password.new_password)) errors.new_password = "Use 8+ chars with upper, lower, number, and symbol";
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
        <header className="mb-4 overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-gray-100 p-5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#079447] text-lg font-bold text-white">
              {user?.first_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Hello,</p>
              <h1 className="truncate text-xl font-semibold text-gray-900 sm:text-2xl">
                {user?.first_name} {user?.last_name}
              </h1>
            </div>
          </div>
          {/* <div className="flex flex-wrap gap-2 p-4">
            <button
              type="button"
              onClick={() => scrollToSection("personal-information")}
              className="rounded-full bg-[#079447] px-4 py-2 text-sm font-semibold text-white"
            >
              Personal information
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("manage-addresses")}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Addresses
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("login-security")}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Change Password
            </button>
          </div> */}
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
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validateProfile()) return;
              saveProfile.mutate(profile);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                First name
                <input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className={fieldClass} />
                <p className={inlineErrorClass}>{profileErrors.first_name || " "}</p>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Last name
                <input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className={fieldClass} />
                <p className={inlineErrorClass}>{profileErrors.last_name || " "}</p>
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Mobile number
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={fieldClass} />
              <p className={inlineErrorClass}>{profileErrors.phone || " "}</p>
            </label>
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
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validateAddress()) return;
              (editingAddressId ? editAddress : addAddress).mutate();
            }}
          >
            <AddressInput label="Full name" name="full_name" value={address} setValue={setAddress} error={addressErrors.full_name} />
            <AddressInput label="Phone" name="phone" value={address} setValue={setAddress} error={addressErrors.phone} />
            <AddressInput label="Address line 1" name="address_line_1" value={address} setValue={setAddress} error={addressErrors.address_line_1} className="sm:col-span-2" />
            <AddressInput label="Address line 2" name="address_line_2" value={address} setValue={setAddress} error={addressErrors.address_line_2} className="sm:col-span-2" required={false} />
            <AddressInput label="Landmark" name="landmark" value={address} setValue={setAddress} error={addressErrors.landmark} required={false} />
            <AddressInput label="City" name="city" value={address} setValue={setAddress} error={addressErrors.city} />
            <AddressInput label="District" name="district" value={address} setValue={setAddress} error={addressErrors.district} required={false} />
            <AddressInput label="State" name="state" value={address} setValue={setAddress} error={addressErrors.state} />
            <AddressInput label="PIN code" name="postal_code" value={address} setValue={setAddress} error={addressErrors.postal_code} maxLength={6} />
            <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
              Address type
              <select value={address.address_type} onChange={(e) => setAddress({ ...address, address_type: e.target.value })} className={fieldClass}>
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </label>
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
            className="mt-6 space-y-4"
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
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <header className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-bold text-gray-900">Order #: {order.order_code}</h3><p className="mt-1 text-xs text-gray-500">{order.items?.length || 0} products · {new Date(order.created_at).toLocaleString("en-IN")}</p></div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${isCod ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>{isCod ? "Cash on Delivery (COD)" : "Online payment · Paid"}</span>
      </header>
      <div className="grid gap-3 bg-gray-50/60 px-5 py-4 text-sm sm:grid-cols-4">
        <div><span className="block text-[11px] font-bold uppercase text-gray-400">Status</span><b className="mt-1 block capitalize text-gray-800">{String(order.status).replaceAll("_", " ")}</b></div>
        <div><span className="block text-[11px] font-bold uppercase text-gray-400">Date of delivery</span><b className="mt-1 block text-gray-800">Not scheduled</b></div>
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

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-end bg-gray-950/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
    <div className="max-h-[calc(100dvh-0.75rem)] w-full overflow-y-auto overscroll-contain rounded-t-[2rem] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:max-w-xl sm:rounded-[2rem] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#079447]">Account settings</p>
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
  required = true,
  maxLength
}) => (
  <label className={`text-sm font-medium ${className}`}>
    {label}
    <input
      required={required}
      value={value[name]}
      onChange={(event) => setValue({ ...value, [name]: event.target.value })}
      className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#079447] focus:ring-4 focus:ring-emerald-50"
    maxLength={maxLength}

    />
    <p className="mt-0.5 min-h-4 text-[11px] leading-4 text-red-600">
      {error || " "}
    </p>
  </label>
);

const PasswordInput = ({ label, name, value, setValue, error }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="relative mt-1.5 block">
        <input
          required
           type={isVisible ? "text" : "password"}
          autoComplete={name === "current_password" ? "current-password" : "new-password"}
          value={value[name]}
          onChange={(event) => setValue({ ...value, [name]: event.target.value })}
          className="w-full rounded-xl border border-gray-300 py-3 pl-4 pr-12 text-sm outline-none transition focus:border-[#079447] focus:ring-4 focus:ring-emerald-50"
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-gray-400 transition hover:text-[#079447]"
        >
          {isVisible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
      <p className="mt-0.5 min-h-4 text-[11px] leading-4 text-red-600">
        {error || " "}
      </p>
    </label>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200 bg-[#f7f8fa] p-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{label}</p>
    <p className="mt-1.5 truncate text-sm font-semibold text-gray-900">{value}</p>
  </div>
);

export default Profile;
