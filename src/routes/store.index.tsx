import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { CartIcon } from "@/components/store/CartIcon";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ProductCard } from "@/components/store/ProductCard";
import { fetchProducts, getProductCategories } from "@/lib/store-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/store/")({
  head: () => ({
    meta: [
      { title: "Store — MakersFlow" },
      {
        name: "description",
        content: "Shop hands-on kits, illustrated workbooks, and Maker merch from MakersFlow.",
      },
      { property: "og:title", content: "Store — MakersFlow" },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const { user, loading } = useRequireAuth();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const productsQ = useQuery({
    queryKey: ["store", "products"],
    queryFn: fetchProducts,
  });

  const categories = useMemo(() => getProductCategories(productsQ.data ?? []), [productsQ.data]);

  const filtered = useMemo(() => {
    const list = productsQ.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      const matchCat = category === "All" || p.category === category;
      const matchQ =
        !q || p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [productsQ.data, category, search]);

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                <ShoppingBag className="h-3.5 w-3.5" />
                MakersFlow Store
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
                Kits, books & merch for makers
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Tools, kits and gear curated to pair with your courses — built for hands-on
                learning.
              </p>
            </div>
            <CartIcon />
          </header>

          {/* Search */}
          <div className="relative mb-5 max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-shadow focus:shadow-[var(--shadow-glow-primary)] focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Category tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active ? "text-primary-foreground" : "text-foreground hover:bg-secondary",
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="storeCatPill"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary-light shadow-[var(--shadow-glow-primary)]"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="relative">{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {productsQ.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-card">
                  <div className="aspect-[4/3] animate-pulse bg-secondary" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-4/5 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-2/5 animate-pulse rounded bg-secondary" />
                    <div className="mt-3 h-5 w-1/3 animate-pulse rounded bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-card p-12 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-secondary">
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                No products match your search
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different category or clear the search.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={category + search}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {filtered.map((p, i) => (
                  <ProductCard key={p.id} p={p} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
