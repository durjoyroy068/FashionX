/** Card number helpers — Luhn + Amex (15) / standard (13–16) support */

export function detectCardType(digits) {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(digits)) return "mastercard";
  return "unknown";
}

export function luhnCheck(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function getCardRules(type) {
  if (type === "amex") return { lengths: [15], cvvLength: 4, label: "American Express" };
  return { lengths: [13, 14, 15, 16], cvvLength: 3, label: "card" };
}

export function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "");
  const type = detectCardType(digits);

  if (type === "amex") {
    const d = digits.slice(0, 15);
    if (d.length <= 4) return d;
    if (d.length <= 10) return `${d.slice(0, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 10)} ${d.slice(10)}`;
  }

  const d = digits.slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function validateCardNumber(raw) {
  const digits = (raw || "").replace(/\s/g, "");
  if (!digits) return { valid: false, message: "Enter your card number" };

  const type = detectCardType(digits);
  const rules = getCardRules(type);

  if (!rules.lengths.includes(digits.length)) {
    const expected = type === "amex" ? "15-digit American Express" : "13–16 digit card";
    return { valid: false, message: `Enter a valid ${expected} number` };
  }
  if (!luhnCheck(digits)) {
    return { valid: false, message: "Enter a valid card number" };
  }
  return { valid: true, type, cvvLength: rules.cvvLength };
}

export function validateCvv(cvv, cardType) {
  const rules = getCardRules(cardType);
  const pattern = rules.cvvLength === 4 ? /^\d{4}$/ : /^\d{3,4}$/;
  if (!pattern.test(cvv || "")) {
    return {
      valid: false,
      message: rules.cvvLength === 4 ? "Enter the 4-digit Amex CID" : "Enter a valid CVV"
    };
  }
  return { valid: true };
}
