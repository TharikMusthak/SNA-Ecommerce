import ImagePreviewField from "./ImagePreviewField";
import ProductGalleryManager from "./ProductGalleryManager";

export default function ProductFields({ form, setForm, item, field, onNotice, categories = [] }) {
  const isFeatured =
    form.is_featured === true ||
    Number(form.is_featured) === 1 ||
    String(form.is_featured).toLowerCase() === "true";

  return (
    <>
      <fieldset className="form-section">
        <legend><span>1</span><b>Basic information</b><small>Name, category and customer-facing description</small></legend>
        {field("name", "Product name")}
        {categories.length > 0 ? (
          <label>Category<select value={form.category_id || ""} onChange={(event) => { const categoryId = event.target.value ? Number(event.target.value) : ""; const category = categories.find((categoryItem) => categoryItem.id === categoryId); setForm({ ...form, category_id: categoryId, category: category?.name || "" }); }} required><option value="">Select category</option>{categories.filter((category) => category.status === "Active").map((category) => <option key={category.id} value={category.id}>{category.parent_name ? `${category.parent_name} → ${category.name}` : category.name}</option>)}</select></label>
        ) : field("category", "Category")}
        <label>Description<textarea name="description" value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength="5000" placeholder="Explain the product, benefits and key details." /></label>
      </fieldset>

      <fieldset className="form-section">
        <legend><span>2</span><b>Pricing & inventory</b><small>Sell price, available stock and alert level</small></legend>
        <div className="row">{field("price", "Price", "number", { min: "0", step: "0.01" })}{field("stock", "Opening stock", "number", { min: "0", step: "1" })}</div>
        {field("low_stock_threshold", "Low-stock warning level", "number", { min: "0", step: "1", required: false })}
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) =>
              setForm({ ...form, is_featured: event.target.checked })
            }
          />
          <span>
            <b>Featured product</b>
            <small>Promote this product in the storefront featured-products section.</small>
          </span>
        </label>
      </fieldset>

      <fieldset className="form-section">
        <legend><span>3</span><b>Product media</b><small>JPG, PNG or WebP up to 5 MB per image</small></legend>
        <ImagePreviewField name="main_image" label="Main product image" existingImage={form.main_image || item?.main_image} removeFieldName="remove_main_image" />
        {item && <ProductGalleryManager productId={item.id} onNotice={onNotice} onPrimaryChanged={(mainImage) => setForm({ ...form, main_image: mainImage })} />}
        <ImagePreviewField name="gallery" label={item ? "Add gallery images" : "Product gallery images"} multiple />
      </fieldset>

      {["name", "category", "category_id", "price", "stock", "low_stock_threshold"].map((name) => <input key={name} type="hidden" name={name} value={form[name] ?? ""} />)}
      <input type="hidden" name="status" value={form.status || "Active"} />
      <input type="hidden" name="is_featured" value={isFeatured ? "true" : "false"} />
    </>
  );
}
