export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatusValue, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  OUT_FOR_DELIVERY: "Out For Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Ordered status flow for the tracking timeline. */
export const STATUS_STAGES: Record<OrderStatusValue, number> = {
  PENDING: 1,
  CONFIRMED: 2,
  PROCESSING: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  CANCELLED: 0,
};

export const isOrderStatus = (value: string): value is OrderStatusValue =>
  (ORDER_STATUSES as readonly string[]).includes(value);

