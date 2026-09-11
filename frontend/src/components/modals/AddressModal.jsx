import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, X } from "lucide-react";
import toast from "react-hot-toast";

import { createAddress, updateAddress } from "@api/address.api";
import { apiErrorMessage } from "@api/axios";
import { QUERY_KEYS } from "@config/constants";

const emptyAddressModalState = {
  full_name: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  district: "",
  state: "Tamil Nadu",
  country: "India",
  postal_code: "",
  address_type: "home",
  is_default: true,
};

export default function AddressModal({
  isOpen,
  onClose,
  onSuccess,
  editingAddress = null,
  submitButtonText,
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(emptyAddressModalState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingAddress) {
        setFormData({
          full_name: editingAddress.full_name || "",
          phone: editingAddress.phone || "",
          address_line_1: editingAddress.address_line_1 || "",
          address_line_2: editingAddress.address_line_2 || "",
          city: editingAddress.city || "",
          district: editingAddress.district || "",
          state: editingAddress.state || "Tamil Nadu",
          country: editingAddress.country || "India",
          postal_code: editingAddress.postal_code || "",
          address_type: editingAddress.address_type || "home",
          is_default: editingAddress.is_default ?? true,
        });
      } else {
        setFormData(emptyAddressModalState);
      }
      setErrors({});
    }
  }, [isOpen, editingAddress]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.full_name.trim()) errs.full_name = "Full name is required";
    if (!formData.phone.trim()) errs.phone = "Phone number is required";
    else if (!/^[0-9+\-\s()]{7,15}$/.test(formData.phone.trim()))
      errs.phone = "Enter a valid phone number";
    if (!formData.address_line_1.trim())
      errs.address_line_1 = "Address line 1 is required";
    if (!formData.city.trim()) errs.city = "City is required";
    if (!formData.state.trim()) errs.state = "State is required";
    if (!formData.postal_code.trim())
      errs.postal_code = "6-digit PIN code is required";
    else if (!/^\d{6}$/.test(formData.postal_code.trim()))
      errs.postal_code = "Enter valid 6-digit PIN code";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      let res;
      if (editingAddress?.id) {
        res = await updateAddress(editingAddress.id, formData);
        toast.success("Delivery address updated successfully!");
      } else {
        res = await createAddress(formData);
        toast.success("Delivery address added successfully!");
      }

      const resData = res?.data?.data || res?.data || res;
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.addresses });

      if (onSuccess) {
        onSuccess(resData?.id || resData);
      }
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save address"));
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = Boolean(editingAddress?.id);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-[#079447]" />
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? "Edit Delivery Address" : "Add Delivery Address"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Full Name"
                className={`mt-1 w-full rounded-xl border ${
                  errors.full_name
                    ? "border-red-400 bg-red-50/20"
                    : "border-gray-200"
                } px-3 py-2 text-xs outline-none focus:border-[#079447]`}
              />
              {errors.full_name && (
                <p className="mt-0.5 text-[10px] text-red-600">
                  {errors.full_name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">
                Phone Number *
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Phone Number"
                className={`mt-1 w-full rounded-xl border ${
                  errors.phone
                    ? "border-red-400 bg-red-50/20"
                    : "border-gray-200"
                } px-3 py-2 text-xs outline-none focus:border-[#079447]`}
              />
              {errors.phone && (
                <p className="mt-0.5 text-[10px] text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">
              Address Line 1 (House No, Building, Street) *
            </label>
            <input
              type="text"
              value={formData.address_line_1}
              onChange={(e) =>
                setFormData({ ...formData, address_line_1: e.target.value })
              }
              placeholder="Address Line 1"
              className={`mt-1 w-full rounded-xl border ${
                errors.address_line_1
                  ? "border-red-400 bg-red-50/20"
                  : "border-gray-200"
              } px-3 py-2 text-xs outline-none focus:border-[#079447]`}
            />
            {errors.address_line_1 && (
              <p className="mt-0.5 text-[10px] text-red-600">
                {errors.address_line_1}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">
              Address Line 2 (Area, Landmark)
            </label>
            <input
              type="text"
              value={formData.address_line_2}
              onChange={(e) =>
                setFormData({ ...formData, address_line_2: e.target.value })
              }
              placeholder="Address Line 2"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#079447]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="City"
                className={`mt-1 w-full rounded-xl border ${
                  errors.city
                    ? "border-red-400 bg-red-50/20"
                    : "border-gray-200"
                } px-3 py-2 text-xs outline-none focus:border-[#079447]`}
              />
              {errors.city && (
                <p className="mt-0.5 text-[10px] text-red-600">{errors.city}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">
                PIN Code *
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.postal_code}
                onChange={(e) =>
                  setFormData({ ...formData, postal_code: e.target.value })
                }
                placeholder="PIN Code"
                className={`mt-1 w-full rounded-xl border ${
                  errors.postal_code
                    ? "border-red-400 bg-red-50/20"
                    : "border-gray-200"
                } px-3 py-2 text-xs outline-none focus:border-[#079447]`}
              />
              {errors.postal_code && (
                <p className="mt-0.5 text-[10px] text-red-600">
                  {errors.postal_code}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                placeholder="State"
                className={`mt-1 w-full rounded-xl border ${
                  errors.state
                    ? "border-red-400 bg-red-50/20"
                    : "border-gray-200"
                } px-3 py-2 text-xs outline-none focus:border-[#079447]`}
              />
              {errors.state && (
                <p className="mt-0.5 text-[10px] text-red-600">{errors.state}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">
                Address Type
              </label>
              <select
                value={formData.address_type}
                onChange={(e) =>
                  setFormData({ ...formData, address_type: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#079447]"
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#079447] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#057a3a] disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : submitButtonText ||
                  (isEdit ? "Update Address" : "Save & Deliver Here")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
