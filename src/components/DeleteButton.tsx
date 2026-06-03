"use client";

type Props = {
  action: () => void;
  label?: string;
  confirmMessage?: string;
};

export default function DeleteButton({
  action,
  label = "Delete",
  confirmMessage = "Delete this item? This cannot be undone.",
}: Props) {
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(confirmMessage)) e.preventDefault();
        }}
        className="text-sm text-red-600 hover:underline"
      >
        {label}
      </button>
    </form>
  );
}
