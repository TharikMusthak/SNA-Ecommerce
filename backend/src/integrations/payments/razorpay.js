import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

function configured(){return Boolean(env.razorpay.keyId&&env.razorpay.keySecret);}
export async function createRazorpayOrder({amountMinor,currency,receipt}){
  if(!configured())throw Object.assign(new Error("Razorpay is not configured"),{status:503});
  const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString("base64")}`,"Content-Type":"application/json"},body:JSON.stringify({amount:amountMinor,currency,receipt})});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error("Payment provider rejected the request"),{status:502});return data;
}
function safeEqualHex(expected,actual){try{const a=Buffer.from(expected,"hex"),b=Buffer.from(String(actual),"hex");return a.length===b.length&&timingSafeEqual(a,b);}catch{return false;}}
export function verifyCheckoutSignature(orderId,paymentId,signature){const expected=createHmac("sha256",env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest("hex");return safeEqualHex(expected,signature);}
export function verifyWebhookSignature(rawBody,signature){if(!env.razorpay.webhookSecret)return false;const expected=createHmac("sha256",env.razorpay.webhookSecret).update(rawBody).digest("hex");return safeEqualHex(expected,signature);}
