import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { api } from "../api";

export default function ShippingSettings({ onNotice }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [pickupError, setPickupError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api("/v1/admin/shipping/settings");
      const loadedSettings = response.data || response;
      setSettings(loadedSettings);
      setPickupLocation(loadedSettings.pickupLocation || "");
      setPickupPincode(loadedSettings.pickupPincode || "");
      try {
        const locationsResponse = await api("/v1/admin/shipping/pickup-locations");
        setPickupLocations(locationsResponse.data || []);
        setPickupError("");
      } catch (pickupRequestError) {
        setPickupLocations([]);
        setPickupError(pickupRequestError.message);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await api("/v1/admin/shipping/settings", {
        method: "PUT",
        body: JSON.stringify({
          free_shipping_threshold: Number(form.get("free_shipping_threshold")),
          pincode_cache_minutes: Number(form.get("pincode_cache_minutes")),
          default_courier_strategy: form.get("default_courier_strategy"),
          allow_cod: form.get("allow_cod") === "on",
          require_serviceable_address: form.get("require_serviceable_address") === "on",
          provider_enabled: form.get("provider_enabled") === "on",
          pickup_location: form.get("pickup_location"),
          pickup_pincode: form.get("pickup_pincode"),
          default_weight_grams: Number(form.get("default_weight_grams")),
          default_length_cm: Number(form.get("default_length_cm")),
          default_width_cm: Number(form.get("default_width_cm")),
          default_height_cm: Number(form.get("default_height_cm")),
        }),
      });
      onNotice?.("Shipping settings updated");
      await load();
    } catch (requestError) {
      onNotice?.(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section><div className="section-heading"><div><h2>Shipping settings</h2><p>Provider and checkout configuration</p></div></div><div className="settings-skeleton skeleton-block" aria-label="Loading shipping settings" /></section>;
  if (error) return <section><div className="section-heading"><div><h2>Shipping settings</h2><p>Provider and checkout configuration</p></div></div><div className="panel settings-error" role="alert"><AlertCircle size={24} /><div><b>Settings could not be loaded</b><p>{error}</p></div><button className="secondary-button" onClick={load}><RefreshCw size={15} /> Retry</button></div></section>;

  return (
    <section>
      <div className="section-heading"><div><h2>Shipping settings</h2><p>Shiprocket provider, package defaults and checkout rules</p></div></div>
      <form className="settings-form" noValidate onSubmit={save} aria-busy={saving}>
        <fieldset className="form-section settings-section">
          <legend><span>1</span><b>Provider</b><small>Runtime status and pickup identity</small></legend>
          <div className={`configuration-status ${settings.shiprocketConfigured ? "configured" : "missing"}`}>{settings.shiprocketConfigured ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span><b>Shiprocket credentials</b><small>{settings.shiprocketConfigured ? "Configured securely in the environment" : "Not configured in the environment"}</small></span></div>
          <label className="toggle-row"><input name="provider_enabled" type="checkbox" defaultChecked={Boolean(settings.provider_enabled)} disabled={!settings.shiprocketConfigured} /><span><b>Enable Shiprocket</b><small>Use live provider rates and fulfilment actions.</small></span></label>
          <div className="row"><label>Pickup location<select name="pickup_location" value={pickupLocation} onChange={(event) => { const value = event.target.value; const selected = pickupLocations.find((location) => location.pickup_location === value); setPickupLocation(value); if (selected) setPickupPincode(selected.pin_code); }} required><option value="">Select Shiprocket pickup location</option>{pickupLocations.map((location) => <option key={location.id || location.pickup_location} value={location.pickup_location}>{location.pickup_location} — {location.city}, {location.state} ({location.pin_code})</option>)}</select>{pickupError && <small className="field-error">{pickupError}</small>}</label><label>Pickup pincode<input name="pickup_pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={pickupPincode} readOnly required /></label></div>
        </fieldset>

        <fieldset className="form-section settings-section">
          <legend><span>2</span><b>Default package</b><small>Fallback measurements when a product has no package data</small></legend>
          <div className="row"><label>Weight (grams)<input name="default_weight_grams" type="number" min="1" defaultValue={settings.defaultWeight} required /></label><label>Length (cm)<input name="default_length_cm" type="number" min="0.01" step="0.01" defaultValue={settings.defaultDimensions?.length} required /></label></div>
          <div className="row"><label>Width (cm)<input name="default_width_cm" type="number" min="0.01" step="0.01" defaultValue={settings.defaultDimensions?.width} required /></label><label>Height (cm)<input name="default_height_cm" type="number" min="0.01" step="0.01" defaultValue={settings.defaultDimensions?.height} required /></label></div>
        </fieldset>

        <fieldset className="form-section settings-section">
          <legend><span>3</span><b>Checkout rules</b><small>Rates, caching and serviceability enforcement</small></legend>
          <div className="row"><label>Free shipping threshold<input name="free_shipping_threshold" type="number" min="0" step="0.01" defaultValue={settings.free_shipping_threshold ?? 0} /></label><label>Pincode cache (minutes)<input name="pincode_cache_minutes" type="number" min="5" max="10080" defaultValue={settings.pincode_cache_minutes ?? 1440} /></label></div>
          <label>Courier strategy<select name="default_courier_strategy" defaultValue={settings.default_courier_strategy || "cheapest"}><option value="cheapest">Lowest shipping cost</option><option value="fastest">Fastest estimated delivery</option></select></label>
          <label className="toggle-row"><input name="allow_cod" type="checkbox" defaultChecked={Boolean(settings.allow_cod)} /><span><b>Allow cash on delivery</b><small>Shown only when the destination and courier support COD.</small></span></label>
          <label className="toggle-row"><input name="require_serviceable_address" type="checkbox" defaultChecked={Boolean(settings.require_serviceable_address)} /><span><b>Require a serviceable address</b><small>Block checkout when delivery cannot be confirmed.</small></span></label>
        </fieldset>

        <div className="settings-actions"><button className="primary-button" disabled={saving}>{saving ? "Saving changes…" : "Save shipping settings"}</button></div>
      </form>
    </section>
  );
}
