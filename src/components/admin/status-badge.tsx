import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import type { OrderStatus, ProductStatus, ReviewStatus } from "@prisma/client";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "PAID" || status === "DELIVERED"
      ? "green"
      : status === "SHIPPED" || status === "FULFILLED"
        ? "sky"
        : status === "PENDING"
          ? "gold"
          : status === "CANCELLED" || status === "REFUNDED"
            ? "clay"
            : "neutral";
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const tone = status === "ACTIVE" ? "green" : status === "DRAFT" ? "gold" : "neutral";
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const tone = status === "APPROVED" ? "green" : status === "PENDING" ? "gold" : "clay";
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}
