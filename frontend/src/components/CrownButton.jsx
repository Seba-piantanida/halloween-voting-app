import React from "react";
import "./CrownButton.css";
import goldCrown from "../../assets/Gold.png";
import silverCrown from "../../assets/Silver.png";
import bronzeCrown from "../../assets/Bronze.png";

export default function CrownButton({
  variant = "gold",
  onClick,
  active = false,
  assignedElsewhere = false,
  disabled = false,
  type = "button",
}) {
  let crownImage;

  if (variant === "silver") {
    crownImage = silverCrown;
  } else if (variant === "bronze") {
    crownImage = bronzeCrown;
  } else {
    crownImage = goldCrown;
  }

  return (
    <button
      className={`crown-button crown-button--${variant}${active ? " is-selected" : ""}${assignedElsewhere ? " is-assigned-elsewhere" : ""}`}
      aria-pressed={active}
      aria-label={`Assegna o rimuovi la corona ${variant}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <img src={crownImage} alt={`Corona ${variant}`} />
    </button>
  );
}
