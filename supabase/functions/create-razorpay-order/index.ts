/**
 * create-razorpay-order — Supabase Edge Function
 *
 * Shared by the MakersFlow mobile app (React Native/Expo) and the web app.
 *
 * Security model
 * ──────────────
 * The client sends ONLY item IDs + quantities (and an optional shipping fee
 * flag). The function looks up the canonical price for each product/course
 * from the database and computes the total server-side. Any `amount` field
 * sent by the client is IGNORED to prevent price-manipulation attacks.
 *
 * Expected request body
 * ─────────────────────
 * {
 *   items: Array<{ id: string; qty: number; is_course?: boolean }>;
 *   include_shipping?: boolean;   // web passes true when shippingFee applies
 *   currency?: string;            // default "INR"
 *   receipt?: string;
 *   notes?: Record<string, string | number>;
 * }
 *
 * Response
 * ────────
 * Razorpay order object + key_id so the client can open the checkout widget.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SHIPPING_FEE = 49; // paise × 100 → ₹49
const FREE_SHIPPING_THRESHOLD = 999; // ₹999

Deno.serve(async (req) => {
  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = (await req.json()) as {
      items?: Array<{ id: string; qty: number; is_course?: boolean }>;
      include_shipping?: boolean;
      currency?: string;
      receipt?: string;
      notes?: Record<string, string | number>;
      // Legacy mobile field — accepted but amount is re-computed from DB
      amount?: number;
    };

    const lineItems = body.items ?? [];
    if (lineItems.length === 0) {
      return jsonError("items array is required and must not be empty", 400);
    }

    // ── Resolve prices from DB ──────────────────────────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const productIds = lineItems.filter((i) => !i.is_course).map((i) => i.id);
    const courseIds = lineItems.filter((i) => i.is_course).map((i) => i.id);

    const [productRes, courseRes] = await Promise.all([
      productIds.length > 0
        ? supabase.from("products").select("id, price").in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
      courseIds.length > 0
        ? supabase.from("courses").select("id, price").in("id", courseIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (productRes.error) throw new Error(`products lookup: ${productRes.error.message}`);
    if (courseRes.error) throw new Error(`courses lookup: ${courseRes.error.message}`);

    const priceMap = new Map<string, number>();
    for (const row of [...(productRes.data ?? []), ...(courseRes.data ?? [])]) {
      priceMap.set(row.id, row.price);
    }

    // Verify every requested item exists in the DB
    for (const item of lineItems) {
      if (!priceMap.has(item.id)) {
        return jsonError(`Item not found: ${item.id}`, 422);
      }
    }

    // ── Compute total (paise) ───────────────────────────────────────────────
    let subtotalRupees = 0;
    for (const item of lineItems) {
      subtotalRupees += (priceMap.get(item.id) ?? 0) * item.qty;
    }

    const shippingRupees =
      body.include_shipping && subtotalRupees < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;

    const totalPaise = Math.round((subtotalRupees + shippingRupees) * 100);

    if (totalPaise <= 0) {
      return jsonError("Computed order amount is zero or negative", 422);
    }

    // ── Create Razorpay order ───────────────────────────────────────────────
    const basicAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: totalPaise,
        currency: body.currency ?? "INR",
        receipt: body.receipt ?? `order_${Date.now()}`,
        notes: body.notes ?? {},
      }),
    });

    if (!rzpRes.ok) {
      const err = await rzpRes.text();
      throw new Error(`Razorpay error ${rzpRes.status}: ${err}`);
    }

    const order = await rzpRes.json();

    return new Response(JSON.stringify({ ...order, key_id: RAZORPAY_KEY_ID }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-razorpay-order]", msg);
    return jsonError(msg, 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
