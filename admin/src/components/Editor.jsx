import { useEffect, useState } from "react";
import { api } from "../api";
import BannerFields from "./BannerFields";
import ProductFields from "./ProductFields";

export default function Editor({
  type,
  item,
  products,
  categories,
  onClose,
  onSave,
  onBannerSaved,
  onProductSaved,
  onError,
  onNotice,
}) {
  const [form, setForm] = useState(item || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving) onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  function field(key, label, inputType = "text", inputProps = {}) {
    const { required = true, ...restInputProps } = inputProps;

    return (
      <label>
        {label}
        <input
          type={inputType}
          value={form[key] ?? ""}
          onChange={(event) =>
            setForm({
              ...form,
              [key]:
                inputType === "number"
                  ? event.target.value === ""
                    ? ""
                    : Number(event.target.value)
                  : event.target.value,
            })
          }
          required={required}
          {...restInputProps}
        />
      </label>
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;

    const formElement = event.currentTarget;
    setSaving(true);

    try {
      if (type === "product") {
        const productFormData = new FormData(formElement);
        const requestedName = normalizeProductName(
          productFormData.get("name"),
        );
        const duplicateProduct = (products || []).some(
          (product) =>
            String(product.id) !== String(item?.id) &&
            normalizeProductName(product.name) === requestedName,
        );

        if (duplicateProduct) {
          throw new Error(
            "Product name already exists. Please use a different name.",
          );
        }

        await api(`/products${item ? `/${item.id}` : ""}`, {
          method: item ? "PUT" : "POST",
          body: productFormData,
        });

        await onProductSaved();
        return;
      }

      if (type === "banner") {
        const bannerFormData = new FormData(formElement);

        await api(`/banners${item ? `/${item.id}` : ""}`, {
          method: item ? "PUT" : "POST",
          body: bannerFormData,
        });

        await onBannerSaved();
        return;
      }

      await onSave(type, form);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Unable to save changes",
      );
    } finally {
      setSaving(false);
    }
  }

  const defaultStatus =
    type === "faq" || type === "cmsPage" ? "Published" : "Active";
  const secondStatus = type === "user" ? "Disabled" : "Draft";

  return (
    <div className="overlay" role="presentation">
      <form
        className="modal"
        onSubmit={submit}
        aria-busy={saving}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <header>
          <h2 id="editor-title">
            {item ? "Edit" : "Add"} {type}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close editor"
          >
            ×
          </button>
        </header>

        {type === "product" && (
          <ProductFields
            form={form}
            setForm={setForm}
            item={item}
            field={field}
            onNotice={onNotice}
            categories={categories}
          />
        )}

        {type === "category" && (
          <>
            {field("name", "Category name")}
            {field("slug", "Slug (leave empty to generate)", "text", {
              required: false,
            })}
            <label>
              Parent category
              <select
                value={form.parent_id || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    parent_id: event.target.value
                      ? Number(event.target.value)
                      : "",
                  })
                }
              >
                <option value="">Top level category</option>
                {(categories || [])
                  .filter(
                    (category) =>
                      String(category.id) !== String(item?.id),
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                value={form.description || ""}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>
            {field("sort_order", "Sort order", "number", {
              min: "0",
              step: "1",
              required: false,
            })}
          </>
        )}

        {type === "variant" && (
          <>
            <label>
              Product
              <select
                value={form.product_id || ""}
                onChange={(event) =>
                  setForm({ ...form, product_id: Number(event.target.value) })
                }
                required
              >
                <option value="">Select</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              {field("brand", "Brand")}
              {field("sku", "SKU")}
            </div>
            <div className="row">
              {field("color", "Colour")}
              {field("size", "Size")}
            </div>
            <div className="row">
              {field("price", "Price", "number", {
                min: "0",
                step: "0.01",
              })}
              {field("stock", "Stock", "number", {
                min: "0",
                step: "1",
              })}
            </div>
          </>
        )}

        {type === "banner" && (
          <BannerFields
            form={form}
            setForm={setForm}
            item={item}
            products={products}
            categories={categories}
          />
        )}

        {type === "faq" && (
          <>
            {field("question", "Question")}
            <label>
              Answer
              <textarea
                value={form.answer || ""}
                onChange={(event) =>
                  setForm({ ...form, answer: event.target.value })
                }
                required
              />
            </label>
          </>
        )}

        {type === "cmsPage" && (
          <>
            {field("title", "Page title")}
            <label>
              Page slug
              <input value={form.slug || ""} readOnly />
            </label>
            <label>
              Page content
              <textarea
                className="cms-content-editor"
                value={form.content || ""}
                onChange={(event) =>
                  setForm({ ...form, content: event.target.value })
                }
                required
              />
            </label>
          </>
        )}

        {type === "user" && (
          <>
            {field("name", "Full name")}
            {field("email", "Email", "email")}
            <label>
              Role
              <select
                value={form.role || "Product Manager"}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value })
                }
              >
                <option>Super Admin</option>
                <option>Product Manager</option>
                <option>Order Manager</option>
              </select>
            </label>
            <label>
              {item
                ? "New password (leave empty to keep current)"
                : "Password"}
              <input
                type="password"
                value={form.password || ""}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                required={!item}
                minLength="12"
                maxLength="72"
                autoComplete="new-password"
              />
              <small>
                12–72 UTF-8 bytes with uppercase, lowercase, number and
                special character.
              </small>
            </label>
          </>
        )}

        <label>
          Status
          <select
            value={form.status || defaultStatus}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value })
            }
          >
            <option>{defaultStatus}</option>
            <option>{secondStatus}</option>
          </select>
        </label>
        <footer>
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving
              ? item
                ? "Updating…"
                : "Saving…"
              : item
                ? "Update"
                : "Save"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function normalizeProductName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}
