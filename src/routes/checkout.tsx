import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import {
  StepIndicator,
  EmptyCart,
  CartRow,
  ShippingForm,
  PaymentPanel,
  OrderSummary,
  OrderConfirmation,
  STEPS,
  type ShippingAddress,
  type StepKey,
} from "@/components/checkout/CheckoutComponents";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourseDetail } from "@/lib/explore-data";
import { useCart, type CartItem } from "@/lib/cart";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): { course?: string } => ({
    course: typeof search.course === "string" ? search.course : undefined,
  }),
  head: () => ({ meta: [{ title: "Checkout — MakersFlow" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { course: courseParam } = Route.useSearch();
  const { items, subtotal, removeItem, setQty, clear, addItem } = useCart();

  const [step, setStep] = useState<StepKey>("cart");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [shipping, setShipping] = useState<ShippingAddress>({
    full_name: "",
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (user?.email && !shipping.email) setShipping((s) => ({ ...s, email: user.email ?? "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // If arriving via ?course=<id> (e.g. "Enroll Now" on a paid course),
  // fetch that course and add it to the cart if it isn't already there.
  useEffect(() => {
    if (!courseParam) return;
    let cancelled = false;
    const alreadyInCart = items.some((i) => i.is_course && i.course_id === courseParam);
    if (alreadyInCart) return;

    fetchCourseDetail(courseParam)
      .then((course) => {
        if (cancelled || !course) return;
        addItem({
          id: `course-${course.id}`,
          title: course.title,
          description: course.description,
          price: course.price ?? 0,
          original_price: course.original_price ?? null,
          category: course.category ?? null,
          subcategory: null,
          thumbnail_url: course.thumbnail_url ?? null,
          images: null,
          rating: course.rating ?? null,
          total_reviews: course.total_reviews ?? null,
          badge: null,
          features: null,
          in_stock: true,
          is_course: true,
          course_id: course.id,
        });
      })
      .catch(() => {
        /* fetch failure is non-fatal — user can browse store instead */
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseParam]);

  const shippingFee = useMemo(
    () => (subtotal >= 999 || items.length === 0 ? 0 : 49),
    [subtotal, items.length],
  );
  const total = subtotal + shippingFee;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const canContinueFromShipping = () => {
    const required: (keyof ShippingAddress)[] = [
      "full_name",
      "phone",
      "email",
      "address_line1",
      "city",
      "state",
      "pincode",
    ];
    return required.every((k) => shipping[k].trim().length > 0);
  };

  const advance = () => {
    if (step === "cart") {
      if (items.length === 0) {
        toast.error("Your cart is empty");
        return;
      }
      if (!user) {
        toast.error("Please sign in to continue");
        navigate({ to: "/login", search: { redirect: "/checkout" } });
        return;
      }
      setStep("shipping");
    } else if (step === "shipping") {
      if (!canContinueFromShipping()) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep("payment");
    }
  };

  const handlePayment = async () => {
    if (!user) return;
    setPaying(true);
    try {
      await runRazorpayCheckout({
        items,
        shipping,
        userEmail: shipping.email,
        userName: shipping.full_name,
        userPhone: shipping.phone,
        onSuccess: async (orderId) => {
          const orderRow = {
            user_id: user.id,
            total_amount: total,
            status: "paid",
            razorpay_order_id: orderId,
            items: items.map((i) => ({
              id: i.id,
              title: i.title,
              price: i.price,
              qty: i.qty,
              is_course: i.is_course,
              course_id: i.course_id,
            })),
            shipping_address: shipping,
          };
          const { data: inserted } = await supabase
            .from("orders")
            .insert(orderRow)
            .select("id")
            .maybeSingle();
          const courseEnrollments = items
            .filter((i) => i.is_course && i.course_id)
            .map((i) => ({ user_id: user.id, course_id: i.course_id! }));

          const dbCourseEnrollments = courseEnrollments.filter(
            (e) => !e.course_id.startsWith("demo-"),
          );
          const demoCourseEnrollments = courseEnrollments.filter((e) =>
            e.course_id.startsWith("demo-"),
          );

          if (demoCourseEnrollments.length > 0) {
            try {
              const key = `demo_enrollments_${user.id}`;
              const current = JSON.parse(localStorage.getItem(key) || "[]");
              for (const e of demoCourseEnrollments) {
                if (!current.includes(e.course_id)) {
                  current.push(e.course_id);
                }
              }
              localStorage.setItem(key, JSON.stringify(current));
            } catch (e) {
              console.warn("Could not save checkout demo enrollments:", e);
            }
          }

          if (dbCourseEnrollments.length > 0)
            await supabase
              .from("enrollments")
              .upsert(dbCourseEnrollments, { onConflict: "user_id,course_id" });
          setPlacedOrderId((inserted as { id?: string } | null)?.id ?? orderId);
          clear();
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (placedOrderId) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <OrderConfirmation orderId={placedOrderId} total={total} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
          <Link
            to="/store"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Continue shopping
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Checkout</h1>
          <StepIndicator stepIndex={stepIndex} />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,360px]">
            <div className="rounded-2xl bg-card p-5 md:p-7">
              <AnimatePresence mode="wait">
                {step === "cart" && (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    {items.length === 0 ? (
                      <EmptyCart />
                    ) : (
                      <div className="space-y-3">
                        {items.map((i) => (
                          <CartRow
                            key={i.id}
                            item={i}
                            onRemove={() => removeItem(i.id)}
                            onQty={(q) => setQty(i.id, q)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                {step === "shipping" && (
                  <motion.div
                    key="shipping"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ShippingForm value={shipping} onChange={setShipping} />
                  </motion.div>
                )}
                {step === "payment" && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <PaymentPanel onPay={handlePayment} paying={paying} total={total} />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-7 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (step === "shipping") setStep("cart");
                    else if (step === "payment") setStep("shipping");
                  }}
                  disabled={step === "cart"}
                  className="inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:invisible"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                {step !== "payment" && (
                  <button
                    onClick={advance}
                    disabled={step === "cart" && items.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-light px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow-primary)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <OrderSummary
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              total={total}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Razorpay helpers ─────────────────────────────────────────────────────── */

type RazorpayWindow = typeof window & {
  Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
};

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if ((window as RazorpayWindow).Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function runRazorpayCheckout(opts: {
  items: CartItem[];
  shipping: ShippingAddress;
  userEmail: string;
  userName: string;
  userPhone: string;
  onSuccess: (orderId: string) => Promise<void> | void;
}) {
  const ok = await loadRazorpayScript();
  if (!ok) throw new Error("Could not load Razorpay. Check your connection.");

  const { data: orderData, error: orderErr } = await supabase.functions.invoke(
    "create-razorpay-order",
    {
      body: {
        items: opts.items.map((i) => ({ id: i.id, qty: i.qty, is_course: i.is_course })),
        include_shipping: true,
        currency: "INR",
        receipt: `web_${Date.now()}`,
        notes: { source: "web", items: opts.items.length },
      },
    },
  );
  if (orderErr || !orderData)
    throw new Error(orderErr?.message ?? "Could not create payment order");

  const order = orderData as {
    id?: string;
    order_id?: string;
    key?: string;
    key_id?: string;
    amount?: number;
    currency?: string;
  };
  const razorpayOrderId = order.id ?? order.order_id;
  const keyId =
    order.key ?? order.key_id ?? (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined);
  if (!razorpayOrderId) throw new Error("Payment order missing id");
  if (!keyId) throw new Error("Missing Razorpay key");
  if (!order.amount) throw new Error("Payment order missing amount");

  await new Promise<void>((resolve, reject) => {
    const rzp = new (window as RazorpayWindow).Razorpay!({
      key: keyId,
      amount: order.amount,
      currency: order.currency ?? "INR",
      order_id: razorpayOrderId,
      name: "MakersFlow",
      description: `${opts.items.length} item(s)`,
      prefill: { name: opts.userName, email: opts.userEmail, contact: opts.userPhone },
      theme: { color: "#4F46E5" },
      handler: async (resp: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const { data: verify, error: verifyErr } = await supabase.functions.invoke(
            "verify-razorpay-payment",
            {
              body: {
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              },
            },
          );
          if (verifyErr) throw new Error(verifyErr.message);
          const v = verify as { verified?: boolean; success?: boolean } | null;
          if (v && (v.verified === false || v.success === false))
            throw new Error("Payment verification failed");
          await opts.onSuccess(resp.razorpay_order_id);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}
