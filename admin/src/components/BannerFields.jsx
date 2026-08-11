import ImagePreviewField from "./ImagePreviewField";

export default function BannerFields({ form, setForm, item }) {
  return (
    <>
      <ImagePreviewField
        name="image"
        label="Banner image"
        existingImage={item?.image}
        required={!item}
        allowExistingRemoval={false}
      />

      <label>
        Banner title
        <input
          value={form.title || ""}
          onChange={(event) =>
            setForm({ ...form, title: event.target.value })
          }
          required
        />
      </label>

      <label>
        Banner subtitle
        <textarea
          name="subtitle"
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
          Button link
          <input
            value={form.button_link || ""}
            onChange={(event) =>
              setForm({ ...form, button_link: event.target.value })
            }
          />
        </label>
      </div>
      <label>
        Sort order
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
      <input type="hidden" name="title" value={form.title || ""} />
      <input type="hidden" name="button_text" value={form.button_text || ""} />
      <input type="hidden" name="button_link" value={form.button_link || ""} />
      <input
        type="hidden"
        name="sort_order"
        value={form.sort_order ?? 0}
      />
      <input type="hidden" name="status" value={form.status || "Active"} />
    </>
  );
}
