import Link from "next/link";
import { clsx } from "clsx";

/**
 * Four variants, and the fourth is the point.
 *
 * `challenge` is not a colour swap on `primary`: it is wider, it sits on its
 * own row, and it is the only place in the product where a coral fill is
 * allowed. See the accent discipline note in styles/tokens.css.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "challenge";

type Common = {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = Common &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: never;
  };

type LinkProps = Common & {
  href: string;
  /** Set for links leaving the app; adds the usual rel hardening. */
  external?: boolean;
};

function classes(
  variant: ButtonVariant,
  size: "sm" | "md",
  fullWidth: boolean,
  className?: string,
) {
  return clsx(
    "hx-btn",
    `hx-btn--${variant}`,
    `hx-btn--${size}`,
    fullWidth && "hx-btn--full",
    className,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={classes(variant, size, fullWidth, className)}
      type={type}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className,
  children,
  href,
  external = false,
}: LinkProps) {
  const cn = classes(variant, size, fullWidth, className);

  if (external) {
    return (
      <a className={cn} href={href} rel="noreferrer noopener" target="_blank">
        {children}
      </a>
    );
  }

  return (
    <Link className={cn} href={href}>
      {children}
    </Link>
  );
}
