import ImagePreviewField from "./ImagePreviewField";
import ProductGalleryManager from "./ProductGalleryManager";
import VideoUploadField from "./VideoUploadField";

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
        <label>Short description<textarea name="short_description" value={form.short_description || ""} onChange={(event) => setForm({ ...form, short_description: event.target.value })} maxLength="500" placeholder="A brief product summary for API listings." /></label>
        <label>Description<textarea name="description" value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength="5000" placeholder="Explain the product, benefits and key details." /></label>
      </fieldset>

      <fieldset className="form-section">
        <legend><span>2</span><b>Pricing & inventory</b><small>Sell price, available stock and alert level</small></legend>
        <div className="row">{field("price", "Regular price", "number", { min: "0", step: "0.01" })}{field("sale_price", "Selling price", "number", { min: "0", step: "0.01", required: false })}</div>
        <div className="row">{field("stock", "Opening stock", "number", { min: "0", step: "1" })}{field("low_stock_threshold", "Low-stock warning level", "number", { min: "0", step: "1", required: false })}</div>
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
        <label>Future publish date<input type="datetime-local" value={toLocalDateTime(form.published_at)} onChange={(event) => setForm({ ...form, published_at: event.target.value })} /><small>Leave empty to publish immediately. Only one future product can be Active at a time; set the current one to Draft before activating another.</small></label>
      </fieldset>

      <fieldset className="form-section">
        <legend><span>3</span><b>Product media</b><small>JPG, PNG or WebP up to 5 MB per image</small></legend>
        <ImagePreviewField name="main_image" label="Main product image" existingImage={form.main_image || item?.main_image} removeFieldName="remove_main_image" />
        <ImagePreviewField name="future_image" label="Future product image" existingImage={form.future_image || item?.future_image} removeFieldName="remove_future_image" />
        <VideoUploadField existingVideo={form.video_url || item?.video_url} />
        {item && <ProductGalleryManager productId={item.id} onNotice={onNotice} onPrimaryChanged={(mainImage) => setForm({ ...form, main_image: mainImage })} />}
        <ImagePreviewField name="gallery" label={item ? "Add gallery images" : "Product gallery images"} multiple />
      </fieldset>

      {["name", "category", "category_id", "price", "sale_price", "stock", "low_stock_threshold", "published_at"].map((name) => <input key={name} type="hidden" name={name} value={form[name] ?? ""} />)}
      <input type="hidden" name="status" value={form.status || "Active"} />
      <input type="hidden" name="is_featured" value={isFeatured ? "true" : "false"} />
    </>
  );
}

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
