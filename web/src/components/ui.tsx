// Primitif UI — dari replica/design/components.md (38 komponen).
// Semua memakai token (class Tailwind dari @theme), tanpa hex mentah.
// #01 Tombol, #02 Kolom Input, #08 Pagination, #18 Badge Status,
// #34 Toast, #35 Banner, #36 Status Kosong, #37 Skeleton,
// #04 Switch, #05 Pemilih Bahasa, #38 Modal.
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertTriangle, Info, Loader2, SearchX } from "lucide-react";

// --- #01 Tombol ---------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-dark",
  secondary: "border border-line bg-canvas text-ink hover:bg-surface-alt",
  ghost: "text-accent hover:bg-surface-alt",
  danger: "bg-danger text-on-accent hover:opacity-90",
  link: "text-accent underline-offset-2 hover:underline",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading = false, className = "", children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-transform focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ href, variant = "primary", size = "md", className = "", children }: ButtonLinkProps) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-accent ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}>
      {children}
    </Link>
  );
}

// --- #02 Kolom Input -----------------------------------------------------------
export function Field({ label, hint, error, children, id }: { label: string; hint?: string; error?: string; children: ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "h-10 w-full rounded-md border border-line-input bg-canvas px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-2 focus:outline-accent disabled:bg-surface disabled:text-muted";

export function TextInput({ error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input aria-invalid={error || undefined} className={`${inputBase} ${error ? "border-danger" : ""}`} {...rest} />;
}

export function TextArea({ error, ref, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean; ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} aria-invalid={error || undefined} rows={6} className={`w-full rounded-md border border-line-input bg-canvas px-3 py-2 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-2 focus:outline-accent ${error ? "border-danger" : ""}`} {...rest} />;
}

export function SelectInput({ error, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select aria-invalid={error || undefined} className={`${inputBase} ${error ? "border-danger" : ""}`} {...rest}>
      {children}
    </select>
  );
}

// --- #04 Switch -----------------------------------------------------------------
export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        id={id}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-accent ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-canvas shadow-sm transition-all ${checked ? "left-5" : "left-0.5"}`} />
      </button>
      <span id={`${id}-label`} className="text-sm text-ink">{label}</span>
    </span>
  );
}

// --- #18 Badge Status ------------------------------------------------------------
export type BadgeTone = "active" | "sold" | "disabled" | "review" | "rejected" | "draft" | "info" | "example";
const badgeTones: Record<BadgeTone, string> = {
  active: "bg-success-soft text-success",
  sold: "bg-surface text-muted",
  disabled: "bg-warning-soft text-warning",
  review: "bg-surface-alt text-accent-dark",
  rejected: "bg-danger-soft text-danger",
  draft: "bg-surface text-muted",
  info: "bg-surface-alt text-accent-dark",
  example: "bg-warning-soft text-warning",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    published: { tone: "active", label: "Terbit" },
    draft: { tone: "draft", label: "Draf" },
    review: { tone: "review", label: "Menunggu tinjauan" },
    returned: { tone: "rejected", label: "Dikembalikan" },
    unpublished: { tone: "sold", label: "Ditayangkan turun" },
    approved: { tone: "active", label: "Disetujui" },
    pending: { tone: "review", label: "Menunggu moderasi" },
    rejected: { tone: "rejected", label: "Ditolak" },
    open: { tone: "review", label: "Terbuka" },
    hidden: { tone: "sold", label: "Disembunyikan" },
    dismissed: { tone: "draft", label: "Ditolak" },
    reviewed: { tone: "active", label: "Sudah ditinjau" },
  };
  const m = map[status] ?? { tone: "draft" as BadgeTone, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

// --- #35 Banner Peringatan ---------------------------------------------------------
export function Banner({ tone = "info", children, onClose }: { tone?: "info" | "warning" | "error" | "success"; children: ReactNode; onClose?: () => void }) {
  const tones = {
    info: "bg-surface-alt text-ink",
    warning: "bg-warning-soft text-warning",
    error: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
  } as const;
  const role = tone === "error" || tone === "warning" ? "alert" : undefined;
  return (
    <div role={role} className={`flex items-start gap-2 rounded-md border p-3 text-sm font-medium ${tones[tone]}`}>
      {tone === "info" ? <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Tutup peringatan" className="rounded p-1 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-accent">
          ✕
        </button>
      )}
    </div>
  );
}

// --- #36 Status Kosong ---------------------------------------------------------------
export function EmptyState({ title, desc, action, titleAs = "h2" }: { title: string; desc: string; action?: ReactNode; titleAs?: "h1" | "h2" }) {
  const TitleTag = titleAs;
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-canvas px-4 py-12 text-center">
      <SearchX className="size-12 text-muted" aria-hidden="true" />
      <TitleTag className="text-lg font-semibold text-ink">{title}</TitleTag>
      <p className="max-w-md text-sm text-muted">{desc}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// --- #37 Skeleton ---------------------------------------------------------------------
export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-lg border border-line bg-canvas p-4">
      <div className="skeleton aspect-video w-full" />
      <div className="skeleton mt-3 h-5 w-3/4" />
      <div className="skeleton mt-2 h-4 w-1/2" />
    </div>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
    </div>
  );
}

// --- #08 Pagination ---------------------------------------------------------------------
export function Pagination({ page, totalPages, baseHref }: { page: number; totalPages: number; baseHref: string }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => `${baseHref}${baseHref.includes("?") ? "&" : "?"}page=${p}`;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className="flex h-10 items-center rounded-md border border-line bg-canvas px-3 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
          Sebelumnya
        </Link>
      ) : (
        <span aria-disabled="true" className="flex h-10 items-center rounded-md border border-line bg-canvas px-3 text-sm font-semibold text-muted opacity-50">
          Sebelumnya
        </span>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={`flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${p === page ? "bg-accent text-on-accent" : "border border-line bg-canvas text-ink hover:bg-surface"}`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} className="flex h-10 items-center rounded-md border border-line bg-canvas px-3 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
          Berikutnya
        </Link>
      ) : (
        <span aria-disabled="true" className="flex h-10 items-center rounded-md border border-line bg-canvas px-3 text-sm font-semibold text-muted opacity-50">
          Berikutnya
        </span>
      )}
    </nav>
  );
}

// --- #05 Pemilih Bahasa (ID/EN) ------------------------------------------------------------
export function LanguagePicker({ value, onChange }: { value: "id" | "en"; onChange: (v: "id" | "en") => void }) {
  return (
    <div role="group" aria-label="Pilih bahasa antarmuka" className="inline-flex rounded-md border border-line bg-canvas p-0.5">
      {(["id", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          aria-pressed={value === lang}
          onClick={() => onChange(lang)}
          className={`h-8 rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${value === lang ? "bg-surface-alt text-accent-dark" : "text-muted"}`}
        >
          {lang === "id" ? "ID" : "EN"}
        </button>
      ))}
    </div>
  );
}
