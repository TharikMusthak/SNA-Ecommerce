import { useMemo, useState } from "react";
import ImagePreviewField from "./ImagePreviewField";

export default function BannerFields({
  form,
  setForm,
  item,
  products = [],
  categories = [],
}) {
  const [productSearch, setProductSearch] = useState("");
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return query
      ? products.filter((product) =>
          String(product.name || "")
            .toLowerCase()
            .includes(query),
        )
      : products;
  }, [productSearch, products]);
  const redirectType = form.redirect_type || "none";

  const setRedirectType = (value) =>
    setForm({
      ...form,
      redirect_type: value,
      product_id: value === "product" ? form.product_id || "" : "",
      category_id: value === "category" ? form.category_id || "" : "",
      redirect_url: value === "custom_url" ? form.redirect_url || "" : "",
    });

  return (
    <>
      <fieldset className="form-section">
        <legend><span>1</span><b>Banner media</b><small>Use separate desktop and mobile crops for a consistent storefront</small></legend>
      <div className="row">
        <ImagePreviewField
          name="image"
          label="Desktop image"
          existingImage={item?.image}
          required={!item}
          allowExistingRemoval={false}
        />
        <ImagePreviewField
          name="mobile_image"
          label="Mobile image"
          existingImage={item?.mobile_image}
          required={false}
          allowExistingRemoval={false}
        />
      </div>
      </fieldset>

      <fieldset className="form-section">
      <legend><span>2</span><b>Content & preview</b><small>Customer-facing copy and call to action</small></legend>
      <label>
        Banner name
        <input
          value={form.name || ""}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </label>
      <label>
        Banner title
        <input
          value={form.title || ""}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
        />
      </label>
      <label>
        Banner subtitle
        <textarea
          value={form.subtitle || ""}
          onChange={(event) =>
            setForm({ ...form, subtitle: event.target.value })
          }
        />
      </label>

      <div className="banner-live-preview">
        <span>Live banner preview</span>
        <h3>{form.title || "Banner title"}</h3>
        <p>{form.subtitle || "Banner subtitle will appear here."}</p>
        <button type="button">{form.button_text || "Shop now"}</button>
      </div>
      </fieldset>

      <fieldset className="form-section">
      <legend><span>3</span><b>Destination</b><small>Choose where customers land after selecting the banner</small></legend>
      <div className="row">
        <label>
          Button text
          <input
            value={form.button_text || ""}
            onChange={(event) =>
              setForm({ ...form, button_text: event.target.value })
            }
          />
        </label>
        <label>
          Redirect type
          <select
            value={redirectType}
            onChange={(event) => setRedirectType(event.target.value)}
          >
            <option value="none">No redirect</option>
            <option value="product">Product</option>
            <option value="category">Category</option>
            <option value="custom_url">Custom URL</option>
          </select>
        </label>
      </div>

      {redirectType === "product" && (
        <>
          <label>
            Search products
            <input
              type="search"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search by product name"
            />
          </label>
          <label>
            Selected product
            <select
              value={form.product_id || ""}
              onChange={(event) =>
                setForm({ ...form, product_id: Number(event.target.value) })
              }
              required
            >
              <option value="">Select product</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {redirectType === "category" && (
        <label>
          Selected category
          <select
            value={form.category_id || ""}
            onChange={(event) =>
              setForm({ ...form, category_id: Number(event.target.value) })
            }
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {redirectType === "custom_url" && (
        <label>
          Custom URL
          <input
            value={form.redirect_url || ""}
            placeholder="/products or https://example.com"
            onChange={(event) =>
              setForm({ ...form, redirect_url: event.target.value })
            }
            required
          />
        </label>
      )}
      </fieldset>

      <fieldset className="form-section">
      <legend><span>4</span><b>Placement & schedule</b><small>Control position, ordering and active dates</small></legend>
      <div className="row">
        <label>
          Display position
          <select
            value={form.display_position || "home_hero"}
            onChange={(event) =>
              setForm({ ...form, display_position: event.target.value })
            }
          >
            <option value="home_hero">Home hero</option>
            <option value="home_middle">Home middle</option>
            <option value="category_top">Category top</option>
            <option value="product_top">Product top</option>
          </select>
        </label>
        <label>
          Display order
          <input
            type="number"
            min="0"
            step="1"
            value={form.sort_order ?? 0}
            onChange={(event) =>
              setForm({ ...form, sort_order: Number(event.target.value) })
            }
            required
          />
        </label>
      </div>
      <div className="row">
        <label>
          Start date
          <input
            type="datetime-local"
            value={dateTimeLocal(form.start_at)}
            onChange={(event) =>
              setForm({ ...form, start_at: event.target.value })
            }
          />
        </label>
        <label>
          End date
          <input
            type="datetime-local"
            value={dateTimeLocal(form.end_at)}
            onChange={(event) => setForm({ ...form, end_at: event.target.value })}
          />
        </label>
      </div>
      </fieldset>

      {[
        ["name", form.name || ""],
        ["title", form.title || ""],
        ["subtitle", form.subtitle || ""],
        ["button_text", form.button_text || "Shop now"],
        ["button_link", "/products"],
        ["redirect_type", redirectType],
        ["product_id", form.product_id || ""],
        ["category_id", form.category_id || ""],
        ["redirect_url", form.redirect_url || ""],
        ["display_position", form.display_position || "home_hero"],
        ["sort_order", form.sort_order ?? 0],
        ["start_at", form.start_at || ""],
        ["end_at", form.end_at || ""],
        ["status", form.status || "Active"],
      ].map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

function dateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
