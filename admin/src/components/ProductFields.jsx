import ImagePreviewField from "./ImagePreviewField";
import ProductGalleryManager from "./ProductGalleryManager";

export default function ProductFields({
  form,
  setForm,
  item,
  field,
  onNotice,
  categories = [],
}) {
  return (
    <>
      <ImagePreviewField
        name="main_image"
        label="Main product image"
        existingImage={form.main_image || item?.main_image}
        removeFieldName="remove_main_image"
      />
      {item && (
        <ProductGalleryManager
          productId={item.id}
          onNotice={onNotice}
          onPrimaryChanged={(mainImage) =>
            setForm({ ...form, main_image: mainImage })
          }
        />
      )}
      <ImagePreviewField
        name="gallery"
        label={item ? "Add gallery images" : "Product gallery images"}
        multiple
      />
      {field("name", "Product name")}
      {categories.length > 0 ? (
        <label>
          Category
          <select
            value={form.category_id || ""}
            onChange={(event) => {
              const categoryId = event.target.value
                ? Number(event.target.value)
                : "";
              const category = categories.find(
                (categoryItem) => categoryItem.id === categoryId,
              );
              setForm({
                ...form,
                category_id: categoryId,
                category: category?.name || "",
              });
            }}
            required
          >
            <option value="">Select category</option>
            {categories
              .filter((category) => category.status === "Active")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parent_name
                    ? `${category.parent_name} → ${category.name}`
                    : category.name}
                </option>
              ))}
          </select>
        </label>
      ) : (
        field("category", "Category")
      )}
      <div className="row">
        {field("price", "Price", "number", { min: "0", step: "0.01" })}
        {field("stock", "Stock", "number", { min: "0", step: "1" })}
      </div>
      {field("low_stock_threshold", "Low-stock warning level", "number", {
        min: "0",
        step: "1",
        required: false,
      })}
      <label>
        Description
        <textarea
          name="description"
          value={form.description || ""}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
        />
      </label>
      {[
        "name",
        "category",
        "category_id",
        "price",
        "stock",
        "low_stock_threshold",
      ].map((name) => (
        <input key={name} type="hidden" name={name} value={form[name] ?? ""} />
      ))}
      <input type="hidden" name="status" value={form.status || "Active"} />
    </>
  );
}
