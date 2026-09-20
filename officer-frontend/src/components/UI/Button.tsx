import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "authorize" | "clear" | "hold" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: "py-1.5 px-3 text-xs rounded-lg gap-1.5",
    md: "py-2.5 px-4 text-sm rounded-xl gap-2",
    lg: "py-3.5 px-6 text-base rounded-xl gap-2.5",
  }[size];

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-ambigo-600 to-ambigo-500 hover:from-ambigo-500 hover:to-ambigo-400 text-white font-semibold shadow-lg shadow-ambigo-600/30",
    secondary:
      "bg-ambigo-800/80 hover:bg-ambigo-700/80 border border-ambigo-600/50 text-ambigo-200 font-medium",
    authorize:
      "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold shadow-lg shadow-emerald-600/30 border border-emerald-400/30",
    clear:
      "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30",
    hold:
      "bg-alert-amber/20 hover:bg-alert-amber/30 border border-alert-amber/50 text-alert-amber font-semibold",
    danger:
      "bg-alert-red/20 hover:bg-alert-red/30 border border-alert-red/40 text-alert-red font-semibold",
    ghost:
      "bg-transparent hover:bg-ambigo-800/50 text-ambigo-300 hover:text-white font-medium",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${sizeStyles} ${variantStyles} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
