import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, MapPin, Plus, ShieldCheck, ShoppingBag, UserRound, X } from "lucide-react";
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
    queryKey: QUERY_KEYS.orders,
    queryFn: () => listOrders({ page: 1, limit: 10 }),
  });
  console.log("orders", orders.data);
  const saveProfile = useMutation({
    mutationFn: () =>
      updateProfileRequest({ ...profile, phone: profile.phone || null }),
    onSuccess: async () => {
      await refreshUser();
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
  const closeAddressForm = () => {
    setAddress(emptyAddress);
    setEditingAddressId(null);
    setShowAddressForm(false);
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
    <main className="min-h-[70vh] bg-[#f7faf8] py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-14">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#075d32] px-6 py-8 text-white shadow-xl shadow-emerald-950/10 sm:px-9 sm:py-10">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20" />
        <div className="absolute -bottom-24 right-32 h-48 w-48 rounded-full border-[28px] border-emerald-400/10" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/20">
              {user?.first_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">My account</p>
              <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Hello, {user?.first_name}</h1>
              <p className="mt-1 text-sm text-emerald-100">Manage your details, addresses and orders.</p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-emerald-50 ring-1 ring-white/15">
            <ShieldCheck size={17} /> Account secured
          </div>
        </div>
      </header>

      <div className="mt-7 grid gap-7 lg:grid-cols-2">
        <section className="rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-[#079447]"><UserRound size={20} /></div>
            <div><h2 className="text-2xl font-semibold text-gray-900">Personal details</h2><p className="mt-1 text-sm text-gray-500">Keep your contact information up to date.</p></div>
          </div>
          <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">{profile.first_name} {profile.last_name}</p>
            <p className="mt-1">{user?.email}</p>
            {profile.phone && <p className="mt-1">{profile.phone}</p>}
          </div>
          <button onClick={() => setShowProfileForm(true)} className="mt-4 rounded-xl bg-[#079447] px-4 py-2.5 text-sm font-semibold text-white">Edit profile</button>
          {showProfileForm && (
          <Modal title="Edit personal details" onClose={() => setShowProfileForm(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile.mutate();
            }}
            className="mt-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                First name
                <input
                  required
                  value={profile.first_name}
                  onChange={(event) =>
                    setProfile({ ...profile, first_name: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-sm font-medium">
                Last name
                <input
                  required
                  value={profile.last_name}
                  onChange={(event) =>
                    setProfile({ ...profile, last_name: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Email
              <input
                disabled
                value={user?.email || ""}
                className={`${fieldClass} bg-gray-50 text-gray-500`}
              />
            </label>
            <label className="block text-sm font-medium">
              Mobile
              <input
                value={profile.phone}
                onChange={(event) =>
                  setProfile({ ...profile, phone: event.target.value })
                }
                className={fieldClass}
              />
            </label>
            <button
              disabled={saveProfile.isPending}
              className="flex items-center gap-2 rounded-xl bg-[#079447] px-5 py-3 font-semibold text-white disabled:opacity-70"
            >
              {saveProfile.isPending && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent" />}
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </button>
          </form>
          </Modal>
          )}
          {/* {user?.referral_code && (
            <div className="mt-6 rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                Your referral code
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-900">
                {user.referral_code}
              </p>
            </div>
          )} */}
        </section>

        <section className="rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-[#079447]"><MapPin size={20} /></div><div><h2 className="text-2xl font-semibold text-gray-900">Saved addresses</h2><p className="mt-1 text-sm text-gray-500">Choose where your orders should be delivered.</p></div></div>
            <button
              onClick={() =>
                showAddressForm ? closeAddressForm() : setShowAddressForm(true)
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-[#079447] transition hover:bg-emerald-100"
            >
              {showAddressForm ? "Cancel" : <><Plus size={16} /> Add address</>}
            </button>
          </div>
          {addresses.isLoading ? (
            <div className="py-12">
              <Spinner />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {addresses.data?.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {item.full_name}{" "}
                        {item.is_default ? (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        {item.address_line_1}
                        {item.address_line_2 ? `, ${item.address_line_2}` : ""}
                        <br />
                        {item.city}, {item.state} {item.postal_code}
                        <br />
                        {item.phone}
                      </p>
                    </div>
                    <div className="flex h-fit gap-3 text-xs font-medium">
                      <button
                        onClick={() => startEditingAddress(item)}
                        className="text-[#079447]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeAddress.mutate(item.id)}
                        disabled={removeAddress.isPending}
                        className="flex items-center gap-1 text-red-600 disabled:opacity-70"
                      >
                        {removeAddress.isPending &&
                          removeAddress.variables === item.id && (
                            <Spinner className="h-3 w-3 border-2 border-red-600 border-t-transparent" />
                          )}
                        {removeAddress.isPending && removeAddress.variables === item.id
                          ? "Deleting"
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                  {!item.is_default && (
                    <button
                      onClick={() => makeDefault.mutate(item.id)}
                      disabled={makeDefault.isPending}
                      className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#079447] disabled:opacity-70"
                    >
                      {makeDefault.isPending &&
                        makeDefault.variables === item.id && (
                          <Spinner className="h-3 w-3 border-2 border-[#079447] border-t-transparent" />
                        )}
                      {makeDefault.isPending && makeDefault.variables === item.id
                        ? "Setting default"
                        : "Make default"}
                    </button>
                  )}
                </article>
              ))}
              {!addresses.data?.length && !showAddressForm && (
                <p className="py-8 text-center text-sm text-gray-500">
                  No saved addresses.
                </p>
              )}
            </div>
          )}
          {showAddressForm && (
            <Modal
              title={editingAddressId ? "Edit address" : "Add a new address"}
              onClose={closeAddressForm}
            >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (editingAddressId) editAddress.mutate();
                else addAddress.mutate();
              }}
              className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 sm:grid-cols-2 sm:p-5"
            >
              <AddressInput
                label="Full name"
                name="full_name"
                value={address}
                setValue={setAddress}
                className="sm:col-span-2"
              />
              <AddressInput
                label="Mobile"
                name="phone"
                value={address}
                setValue={setAddress}
              />
              <AddressInput
                label="PIN code"
                name="postal_code"
                value={address}
                setValue={setAddress}
              />
              <AddressInput
                label="Address line 1"
                name="address_line_1"
                value={address}
                setValue={setAddress}
                className="sm:col-span-2"
              />
              <AddressInput
                label="Address line 2"
                name="address_line_2"
                value={address}
                setValue={setAddress}
                className="sm:col-span-2"
                required={false}
              />
              <AddressInput
                label="City"
                name="city"
                value={address}
                setValue={setAddress}
              />
              <AddressInput
                label="District"
                name="district"
                value={address}
                setValue={setAddress}
                required={false}
              />
              <AddressInput
                label="State"
                name="state"
                value={address}
                setValue={setAddress}
                className="sm:col-span-2"
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={address.is_default}
                  onChange={(event) =>
                    setAddress({ ...address, is_default: event.target.checked })
                  }
                />{" "}
                Make default
              </label>
              <button
                disabled={addAddress.isPending || editAddress.isPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#079447] px-5 py-3 font-semibold text-white disabled:opacity-70 sm:col-span-2"
              >
                {(addAddress.isPending || editAddress.isPending) && (
                  <Spinner className="h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {editingAddressId
                  ? editAddress.isPending
                    ? "Saving…"
                    : "Save address"
                  : addAddress.isPending
                    ? "Adding…"
                    : "Add address"}
              </button>
            </form>
            </Modal>
          )}
        </section>
      </div>

      <section className="mt-7 max-w-[570px] rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-[#079447]"><KeyRound size={20} /></div><div><h2 className="text-2xl font-semibold text-gray-900">Change password</h2><p className="mt-1 text-sm text-gray-500">Use a new password with at least 8 characters.</p></div></div>
        <button onClick={() => setShowPasswordForm(true)} className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-[#079447]">Change password</button>
        {showPasswordForm && (
        <Modal title="Change password" onClose={() => setShowPasswordForm(false)}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (password.new_password !== password.confirm_password) {
              toast.error("New passwords do not match");
              return;
            }
            changePassword.mutate(password);
          }}
          className="mt-6 space-y-4"
        >
          <PasswordInput
            label="Current password"
            name="current_password"
            value={password}
            setValue={setPassword}
          />
          <PasswordInput
            label="New password"
            name="new_password"
            value={password}
            setValue={setPassword}
          />
          <PasswordInput
            label="Confirm new password"
            name="confirm_password"
            value={password}
            setValue={setPassword}
          />
          <button
            disabled={changePassword.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#079447] px-5 py-3 font-semibold text-white disabled:opacity-70"
          >
            {changePassword.isPending && (
              <Spinner className="h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            {changePassword.isPending ? "Changing password…" : "Change password"}
          </button>
        </form>
        </Modal>
        )}
      </section>

      <section className="mt-7 rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-[#079447]"><ShoppingBag size={20} /></div><div><h2 className="text-2xl font-semibold text-gray-900">Recent orders</h2><p className="mt-1 text-sm text-gray-500">Your latest purchases at a glance.</p></div></div>
        {orders.isLoading ? (
          <div className="py-12">
            <Spinner />
          </div>
        ) : !orders.data?.items?.length ? (
          <p className="py-10 text-center text-gray-500">
            You have not placed any orders yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-3">Order</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.items.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100">
                    <td className="py-4 font-semibold text-gray-900">
                      {order.order_code}
                    </td>
                    <td>
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="capitalize">
                      {String(order.status).replaceAll("_", " ")}
                    </td>
                    <td className="capitalize">{order.payment_status}</td>
                    <td className="text-right font-semibold">
                      {formatCurrency(order.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </main>
  );
};

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
  className = "",
  required = true,
}) => (
  <label className={`text-sm font-medium ${className}`}>
    {label}
    <input
      required={required}
      value={value[name]}
      onChange={(event) => setValue({ ...value, [name]: event.target.value })}
      className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#079447]"
    />
  </label>
);

const PasswordInput = ({ label, name, value, setValue }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="relative mt-1.5 block">
        <input
          required
          minLength={8}
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
    </label>
  );
};

export default Profile;
