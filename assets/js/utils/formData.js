/** Map form fields to API-ready snake_case payloads for backend integration */

export function mapShippingForm(formData) {
  return {
    first_name: formData.get("first_name") || formData.get("firstName"),
    last_name: formData.get("last_name") || formData.get("lastName"),
    email: formData.get("email"),
    line1: formData.get("line1") || formData.get("address"),
    city: formData.get("city"),
    postal_code: formData.get("postal_code") || formData.get("zip"),
    country_code: formData.get("country_code") || formData.get("country")
  };
}

export function mapRegisterForm(formData) {
  return {
    first_name: formData.get("first_name") || formData.get("firstName"),
    last_name: formData.get("last_name") || formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "buyer"
  };
}

export function mapPaymentForm(formData) {
  const method = formData.get("payment_method") || formData.get("pay") || "card";
  const card = (formData.get("card_number") || formData.get("card") || "").replace(/\s/g, "");
  return {
    payment_method: method,
    card_last4: card.length >= 4 ? card.slice(-4) : null,
    payment_intent_id: `pi_mock_${Date.now()}`
  };
}

/** Auction listing payload — backend should accept multipart field `image` */
export function mapAuctionSubmitForm(formData, imageMeta = {}) {
  return {
    title: formData.get("title"),
    brand: formData.get("brand"),
    description: formData.get("description"),
    starting_bid: Number(formData.get("startingBid")),
    reserve_price: Number(formData.get("reserve")),
    end_time: formData.get("endTime"),
    image_file_name: imageMeta.fileName || null,
    image_mime_type: imageMeta.mimeType || null,
    image_size_bytes: imageMeta.size || null,
    image_url: imageMeta.dataUrl || null
  };
}

export function formatShippingDisplay(shipping) {
  if (!shipping) return "";
  const fn = shipping.first_name || shipping.firstName || "";
  const ln = shipping.last_name || shipping.lastName || "";
  const line = shipping.line1 || shipping.address || "";
  const city = shipping.city || "";
  const zip = shipping.postal_code || shipping.zip || "";
  return `${fn} ${ln}, ${line}, ${city} ${zip}`.trim();
}
