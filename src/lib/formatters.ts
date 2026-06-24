export function formatUsd(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  return `${sign}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(absoluteValue)}`;
}

export function formatPercentFromBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${(value / 100).toFixed(2)}%`;
}

export function formatSignedUsd(value: number) {
  if (value === 0) {
    return formatUsd(0);
  }

  return `${value > 0 ? "+" : "-"}${formatUsd(Math.abs(value))}`;
}

export function formatSignedBps(value: number) {
  if (value === 0) {
    return "0 bps";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)} bps`;
}

export function formatIsoDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function truncateMiddle(value: string, visibleChars = 10) {
  if (value.length <= visibleChars * 2) {
    return value;
  }

  return `${value.slice(0, visibleChars)}...${value.slice(-visibleChars)}`;
}
