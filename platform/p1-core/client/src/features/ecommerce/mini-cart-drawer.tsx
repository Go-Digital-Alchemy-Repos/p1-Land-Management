import { Link } from "wouter";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type CartItem, formatMoney, writeCart } from "@/features/ecommerce/cart-store";

interface MiniCartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
}

function lineMatches(a: CartItem, b: CartItem) {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
}

export function MiniCartDrawer({ open, onOpenChange, items }: MiniCartDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = (item: CartItem, nextQuantity: number) => {
    const normalizedQuantity = Math.max(1, Math.min(99, nextQuantity));
    writeCart(
      items.map((line) =>
        lineMatches(line, item) ? { ...line, quantity: normalizedQuantity } : line,
      ),
    );
  };

  const removeItem = (item: CartItem) => {
    writeCart(items.filter((line) => !lineMatches(line, item)));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="md" data-testid="sheet-mini-cart">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Cart
          </SheetTitle>
          <SheetDescription>
            {itemCount > 0
              ? `${itemCount} item${itemCount === 1 ? "" : "s"} ready for checkout.`
              : "Your cart is empty."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Add a product to start a checkout.
              </p>
              <Button asChild className="mt-5" onClick={() => onOpenChange(false)}>
                <Link href="/shop">Shop products</Link>
              </Button>
            </div>
          ) : (
            items.map((item) => {
              const lineKey = `${item.productId}:${item.variantId ?? "default"}`;
              return (
                <div key={lineKey} className="flex gap-3 border-b pb-4 last:border-b-0">
                  <Link href={`/products/${item.slug}`} onClick={() => onOpenChange(false)}>
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.slug}`}
                      className="line-clamp-2 text-sm font-medium hover:text-primary"
                      onClick={() => onOpenChange(false)}
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(item.unitPrice)}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex h-9 items-center rounded-md border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item, item.quantity - 1)}
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="min-w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item, item.quantity + 1)}
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatMoney(item.unitPrice * item.quantity)}
                  </p>
                </div>
              );
            })
          )}
        </SheetBody>

        <SheetFooter className="block space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatMoney(subtotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Taxes, shipping, and discounts are calculated at checkout.
          </p>
          {items.length > 0 ? (
            <Button asChild className="w-full" onClick={() => onOpenChange(false)}>
              <Link href="/checkout">Checkout</Link>
            </Button>
          ) : (
            <Button className="w-full" disabled>
              Checkout
            </Button>
          )}
          <Button asChild variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            <Link href="/cart">View cart</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
