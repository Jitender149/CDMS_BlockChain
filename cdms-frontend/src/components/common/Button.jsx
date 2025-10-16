import React from "react";

export const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon: Icon,
  disabled = false,
  type = "button",
  className = "",
}) => {
  const baseClasses =
    "font-semibold rounded-lg transition flex items-center justify-center";

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${
        sizeClasses[size]
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5 mr-2" />}
      {children}
    </button>
  );
};
